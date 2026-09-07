"""Mattermost API v4 client - HTTP-laag zonder domeinlogica."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Any

import httpx
from tenacity import (
    before_sleep_log,
    retry,
    retry_if_exception_type,
    retry_if_result,
    stop_after_attempt,
    wait_exponential,
)

log = logging.getLogger("moza-weekly.mattermost")


class MattermostError(Exception):
    pass


class AuthError(MattermostError):
    pass


class TeamNotFoundError(MattermostError):
    pass


class ChannelNotFoundError(MattermostError):
    pass


@dataclass(frozen=True)
class RawPost:
    id: str
    user_id: str
    root_id: str
    channel_id: str
    create_at: int
    edit_at: int
    delete_at: int
    message: str
    type: str
    props: dict[str, Any]
    file_ids: list[str]


@dataclass(frozen=True)
class RawUser:
    id: str
    username: str
    first_name: str
    last_name: str

    @property
    def display_name(self) -> str:
        full = f"{self.first_name} {self.last_name}".strip()
        return full or self.username


@dataclass(frozen=True)
class RawFileInfo:
    id: str
    name: str
    size: int


def _strip_auth(message: str) -> str:
    return re.sub(r"Authorization:\s*Bearer\s+\S+", "Authorization: Bearer [REDACTED]", message)


def _is_retriable_status(response: httpx.Response | None) -> bool:
    if response is None:
        return False
    return response.status_code in {429, 502, 503, 504}


class MattermostClient:
    def __init__(self, server_url: str, token: str, timeout: float = 30.0) -> None:
        self._base = server_url.rstrip("/") + "/api/v4"
        self._client = httpx.Client(
            timeout=timeout,
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            },
        )
        self._user_cache: dict[str, RawUser] = {}
        self._file_cache: dict[str, RawFileInfo] = {}
        self._channel_name_cache: dict[str, str] = {}

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> MattermostClient:
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    @retry(
        retry=(
            retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError))
            | retry_if_result(_is_retriable_status)
        ),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        stop=stop_after_attempt(4),
        before_sleep=before_sleep_log(log, logging.WARNING),
        reraise=True,
    )
    def _request(self, method: str, path: str, **params: Any) -> httpx.Response:
        url = f"{self._base}{path}"
        log.debug("HTTP %s %s", method, path)
        try:
            return self._client.request(method, url, **params)
        except httpx.HTTPError as e:
            raise MattermostError(_strip_auth(str(e))) from None

    def _get_json(self, path: str, **params: Any) -> Any:
        resp = self._request("GET", path, params=params)
        if resp.status_code == 401:
            raise AuthError("401 Unauthorized — token ongeldig of verlopen")
        if resp.status_code == 403:
            raise AuthError(f"403 Forbidden op {path} — token mist rechten")
        if resp.status_code == 404:
            raise MattermostError(f"404 Not Found: {path}")
        if resp.status_code >= 400:
            raise MattermostError(f"{resp.status_code} op {path}: {resp.text[:200]}")
        return resp.json()

    def get_team_id(self, team_name: str) -> str:
        try:
            data = self._get_json(f"/teams/name/{team_name}")
        except MattermostError as e:
            if "404" in str(e):
                raise TeamNotFoundError(f"Team '{team_name}' niet gevonden") from None
            raise
        return data["id"]

    def get_channel_id(self, team_id: str, channel_name: str) -> str:
        try:
            data = self._get_json(f"/teams/{team_id}/channels/name/{channel_name}")
        except MattermostError as e:
            if "404" in str(e):
                raise ChannelNotFoundError(
                    f"Kanaal '{channel_name}' niet gevonden in team"
                ) from None
            raise
        return data["id"]

    def iter_posts_before(
        self,
        channel_id: str,
        oldest_create_at_ms: int,
        per_page: int = 200,
    ):
        """Yield RawPost-objects in descending create_at-volgorde tot we
        voorbij oldest_create_at_ms zijn. Stopt zodra een pagina alleen oudere
        posts bevat — caller filtert finaal op exacte periode."""
        before: str | None = None
        while True:
            params: dict[str, Any] = {"per_page": per_page}
            if before is not None:
                params["before"] = before
            data = self._get_json(f"/channels/{channel_id}/posts", **params)
            order: list[str] = data.get("order", [])
            posts_map: dict[str, dict[str, Any]] = data.get("posts", {})
            if not order:
                return
            page_posts = [self._parse_post(posts_map[pid]) for pid in order]
            page_posts.sort(key=lambda p: p.create_at, reverse=True)
            oldest_in_page = page_posts[-1].create_at
            for p in page_posts:
                yield p
            if oldest_in_page <= oldest_create_at_ms or len(order) < per_page:
                return
            before = page_posts[-1].id

    def get_thread(self, root_id: str) -> list[RawPost]:
        try:
            data = self._get_json(f"/posts/{root_id}/thread")
        except MattermostError as e:
            if "404" in str(e):
                log.warning("Thread %s niet gevonden — skip", root_id)
                return []
            raise
        order: list[str] = data.get("order", [])
        posts_map: dict[str, dict[str, Any]] = data.get("posts", {})
        return [self._parse_post(posts_map[pid]) for pid in order if pid in posts_map]

    def iter_people(self, per_page: int = 200):
        """Alle échte personen op de server, voor de naamredactie.

        Ruimer dan ons eigen team: collega's bij Logius en andere partijen zitten
        op dezelfde server, en juist die worden in verslagen bij hun voornaam
        genoemd. Bots en serviceaccounts vallen af, want die heten "GitHub" of
        "Boards" en zouden gewone woorden uit de tekst slopen.
        """
        page = 0
        while True:
            data = self._get_json("/users", per_page=per_page, page=page)
            if not data:
                return
            for u in data:
                if u.get("is_bot"):
                    continue
                voor = (u.get("first_name") or "").strip()
                achter = (u.get("last_name") or "").strip()
                if not voor or not achter:
                    continue
                yield RawUser(
                    id=u.get("id", ""),
                    username=u.get("username", ""),
                    first_name=voor,
                    last_name=achter,
                )
            if len(data) < per_page:
                return
            page += 1

    def get_post(self, post_id: str) -> RawPost:
        return self._parse_post(self._get_json(f"/posts/{post_id}"))

    def get_channel_name(self, channel_id: str) -> str:
        """Kanaalnaam voor een channel_id; bij een fout het id zelf (nooit fataal)."""
        if channel_id in self._channel_name_cache:
            return self._channel_name_cache[channel_id]
        try:
            data = self._get_json(f"/channels/{channel_id}")
            name = data.get("name") or channel_id
        except MattermostError as e:
            log.warning("Kanaal-lookup faalde voor %s (%s), fallback op id", channel_id, e)
            name = channel_id
        self._channel_name_cache[channel_id] = name
        return name

    def get_user(self, user_id: str) -> RawUser:
        if user_id in self._user_cache:
            return self._user_cache[user_id]
        try:
            data = self._get_json(f"/users/{user_id}")
            user = RawUser(
                id=data["id"],
                username=data.get("username", user_id),
                first_name=data.get("first_name", ""),
                last_name=data.get("last_name", ""),
            )
        except MattermostError as e:
            log.warning("User-lookup faalde voor %s (%s) — fallback op id", user_id, e)
            user = RawUser(id=user_id, username=user_id, first_name="", last_name="")
        self._user_cache[user_id] = user
        return user

    def get_file_info(self, file_id: str) -> RawFileInfo | None:
        if file_id in self._file_cache:
            return self._file_cache[file_id]
        try:
            data = self._get_json(f"/files/{file_id}/info")
        except MattermostError as e:
            log.warning("File-info-lookup faalde voor %s (%s) — skip", file_id, e)
            return None
        info = RawFileInfo(
            id=data["id"],
            name=data.get("name", file_id),
            size=int(data.get("size", 0)),
        )
        self._file_cache[file_id] = info
        return info

    @staticmethod
    def _parse_post(raw: dict[str, Any]) -> RawPost:
        return RawPost(
            id=raw["id"],
            user_id=raw.get("user_id", ""),
            root_id=raw.get("root_id", "") or "",
            channel_id=raw.get("channel_id", ""),
            create_at=int(raw.get("create_at", 0)),
            edit_at=int(raw.get("edit_at", 0)),
            delete_at=int(raw.get("delete_at", 0)),
            message=raw.get("message", ""),
            type=raw.get("type", "") or "",
            props=raw.get("props", {}) or {},
            file_ids=list(raw.get("file_ids", []) or []),
        )
