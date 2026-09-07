"""Dataclasses voor MOZa Weekly input + serialisatie naar YAML-dicts."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


def _drop_falsy(d: dict[str, Any]) -> dict[str, Any]:
    """Verwijder keys met waarde None; behoudt False, 0, "", []."""
    return {k: v for k, v in d.items() if v is not None}


@dataclass(frozen=True)
class Period:
    start: datetime  # tz-aware, Europe/Amsterdam
    end: datetime    # tz-aware, Europe/Amsterdam

    @property
    def start_ms(self) -> int:
        return int(self.start.timestamp() * 1000)

    @property
    def end_ms(self) -> int:
        return int(self.end.timestamp() * 1000)

    def contains_ms(self, ts_ms: int) -> bool:
        return self.start_ms <= ts_ms <= self.end_ms


@dataclass(frozen=True)
class Author:
    username: str
    display_name: str

    def to_dict(self) -> dict[str, Any]:
        return {"username": self.username, "display_name": self.display_name}


@dataclass(frozen=True)
class Attachment:
    filename: str
    size_bytes: int

    def to_dict(self) -> dict[str, Any]:
        return {"filename": self.filename, "size_bytes": self.size_bytes}


@dataclass
class Post:
    id: str
    author: Author
    timestamp: datetime  # tz-aware
    permalink: str
    in_scope: bool
    edited: bool
    bot: bool
    attachments: list[Attachment] = field(default_factory=list)
    message: str = ""
    context_only: bool = False  # True alleen voor root buiten periode met reply binnen periode
    references: list[str] = field(default_factory=list)  # ref-id's uit Report.references

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {
            "id": self.id,
            "author": self.author.to_dict(),
            "timestamp": self.timestamp.isoformat(),
            "permalink": self.permalink,
            "in_scope": self.in_scope,
        }
        if self.context_only:
            d["context_only"] = True
        d.update(
            {
                "edited": self.edited,
                "bot": self.bot,
                "attachments": [a.to_dict() for a in self.attachments],
                "message": self.message,
            }
        )
        if self.references:
            d["references"] = list(self.references)
        return d


@dataclass
class Reference:
    """Context buiten de opgehaalde kanalen: een Mattermost-thread waarnaar verwezen
    wordt, of een publieke webpagina. Statuswaarden staan in _references.py."""

    id: str
    kind: str  # "mattermost" | "web" | "docs"
    url: str
    status: str
    title: str | None = None
    site: str | None = None
    description: str | None = None
    content_type: str | None = None
    channel: str | None = None
    note: str | None = None
    text: str = ""
    truncated: bool = False
    posts: list[Post] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = _drop_falsy(
            {
                "id": self.id,
                "kind": self.kind,
                "url": self.url,
                "status": self.status,
                "title": self.title,
                "site": self.site,
                "description": self.description,
                "content_type": self.content_type,
                "channel": self.channel,
                "note": self.note,
            }
        )
        if self.kind == "mattermost":
            d["posts"] = [p.to_dict() for p in self.posts]
        else:
            d["truncated"] = self.truncated
            d["text"] = self.text
        return d


@dataclass
class Thread:
    root: Post
    replies: list[Post] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "root": self.root.to_dict(),
            "replies": [r.to_dict() for r in self.replies],
        }


@dataclass
class Channel:
    name: str
    id: str
    url: str
    threads: list[Thread] = field(default_factory=list)
    error: str | None = None
    note: str | None = None

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {
            "name": self.name,
            "id": self.id,
            "url": self.url,
            "threads": [t.to_dict() for t in self.threads],
        }
        if self.error:
            d["error"] = self.error
        if self.note:
            d["note"] = self.note
        return d


@dataclass
class Report:
    generated_at: datetime
    generator: str
    period: Period
    server: str
    team: str
    channels: list[Channel]
    references: list[Reference] = field(default_factory=list)

    def stats(self) -> dict[str, int]:
        posts_in_period = 0
        posts_context = 0
        threads_in_period = 0
        unique_authors: set[str] = set()
        for ch in self.channels:
            for th in ch.threads:
                threads_in_period += 1
                if th.root.in_scope:
                    posts_in_period += 1
                    unique_authors.add(th.root.author.username)
                elif th.root.context_only:
                    posts_context += 1
                for r in th.replies:
                    if r.in_scope:
                        posts_in_period += 1
                        unique_authors.add(r.author.username)
                    else:
                        posts_context += 1
        return {
            "channels": len(self.channels),
            "posts_in_period": posts_in_period,
            "threads_in_period": threads_in_period,
            "posts_out_of_period_for_context": posts_context,
            "unique_authors": len(unique_authors),
            "references_mattermost": sum(1 for r in self.references if r.kind == "mattermost"),
            "references_web": sum(1 for r in self.references if r.kind == "web"),
            "references_zonder_inhoud": sum(1 for r in self.references if r.status != "ok"),
        }

    def to_dict(self) -> dict[str, Any]:
        return {
            "meta": {
                "generated_at": self.generated_at.isoformat(),
                "generator": self.generator,
                "period": {
                    "from": self.period.start.isoformat(),
                    "to": self.period.end.isoformat(),
                },
                "server": self.server,
                "team": self.team,
            },
            "stats": self.stats(),
            "channels": [c.to_dict() for c in self.channels],
            "references": [r.to_dict() for r in self.references],
        }
