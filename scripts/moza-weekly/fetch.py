#!/usr/bin/env python3
"""Haal Mattermost-input op voor de MOZa Weekly en schrijf een YAML-bestand.

Usage:
    uv run --project scripts/moza-weekly scripts/moza-weekly/fetch.py
        [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--channel NAME ...]
        [--output PATH] [--no-bots] [--force]
        [--no-references | --no-external] [--verbose | --quiet]
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

# De scriptmap staat op sys.path, zodat de _-modules hiernaast importeerbaar zijn.
sys.path.insert(0, str(Path(__file__).parent))

import yaml  # noqa: E402

from _mattermost import (  # noqa: E402
    AuthError,
    ChannelNotFoundError,
    MattermostClient,
    MattermostError,
    RawPost,
    TeamNotFoundError,
)
from _model import (  # noqa: E402
    Attachment,
    Author,
    Channel,
    Period,
    Post,
    Reference,
    Report,
    Thread,
)
from _util import load_dotenv  # noqa: E402

from _references import (  # noqa: E402
    STATUS_GEEN_TOEGANG,
    STATUS_OK,
    DocsClient,
    ReferenceCollector,
    WebFetcher,
    docs_cookie_instructie,
)

GENERATOR = "moza-weekly fetch.py v0.2.0"
NL_TZ = ZoneInfo("Europe/Amsterdam")
DEFAULT_SERVER = "https://digilab.overheid.nl/chat"
DEFAULT_TEAM = "mijnoverheid-zakelijk"
DEFAULT_CHANNELS = "check-in,agenda,sprint-faq"
DEFAULT_DOCS_URL = "https://docs.rijksapp.nl"

# Exit-codes
EXIT_OK = 0
EXIT_CONFIG = 2
EXIT_AUTH = 3
EXIT_TEAM_NOT_FOUND = 4
EXIT_PARTIAL = 5
EXIT_NETWORK = 6
EXIT_OUTPUT_EXISTS = 7

log = logging.getLogger("moza-weekly.fetch")


# --------------------------------------------------------------------------- env / cli


def _parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(prog="moza-weekly-fetch", description=__doc__)
    p.add_argument(
        "--from",
        dest="date_from",
        help="YYYY-MM-DD (default: 6 dagen terug; periode van 7 dagen incl. vandaag)",
    )
    p.add_argument("--to", dest="date_to", help="YYYY-MM-DD (default: vandaag)")
    p.add_argument("--channel", action="append", default=None, dest="channels")
    p.add_argument("--output", type=Path, default=None)
    p.add_argument("--no-bots", action="store_true")
    p.add_argument(
        "--no-references",
        action="store_true",
        help="Volg geen verwijzingen naar andere Mattermost-berichten of webpagina's",
    )
    p.add_argument(
        "--no-external",
        action="store_true",
        help="Volg alleen Mattermost-verwijzingen, geen externe webpagina's",
    )
    p.add_argument("--force", action="store_true")
    g = p.add_mutually_exclusive_group()
    g.add_argument("--verbose", action="store_true")
    g.add_argument("--quiet", action="store_true")
    return p.parse_args(argv)


def _setup_logging(verbose: bool, quiet: bool) -> None:
    level = logging.DEBUG if verbose else logging.WARNING if quiet else logging.INFO
    logging.basicConfig(level=level, format="%(levelname)s %(message)s")


def _build_period(date_from: str | None, date_to: str | None) -> Period:
    today = datetime.now(NL_TZ).date()
    end_date = date.fromisoformat(date_to) if date_to else today
    start_date = (
        date.fromisoformat(date_from) if date_from else end_date - timedelta(days=6)
    )
    if start_date > end_date:
        raise ValueError(f"--from ({start_date}) ligt na --to ({end_date})")
    start = datetime.combine(start_date, time(0, 0, 0), tzinfo=NL_TZ)
    end = datetime.combine(end_date, time(23, 59, 59), tzinfo=NL_TZ)
    return Period(start=start, end=end)


def _channel_url(server: str, team: str, channel: str) -> str:
    return f"{server.rstrip('/')}/{team}/channels/{channel}"


def _permalink(server: str, team: str, post_id: str) -> str:
    return f"{server.rstrip('/')}/{team}/pl/{post_id}"


def _to_dt(ms: int) -> datetime:
    return datetime.fromtimestamp(ms / 1000, tz=NL_TZ)


# --------------------------------------------------------------------------- channel fetch


@dataclass
class _RawChannelData:
    """Tussenresultaat: alles wat we voor één kanaal van de API hebben getrokken."""

    channel_id: str
    posts_in_period: list[RawPost]
    threads_by_root: dict[str, list[RawPost]]  # root_id -> [root, *replies]


def _fetch_channel_raw(
    client: MattermostClient, team_id: str, channel: str, period: Period
) -> _RawChannelData:
    """Haal alle ruwe posts en threads op voor één kanaal."""
    channel_id = client.get_channel_id(team_id, channel)

    posts_in_period: list[RawPost] = []
    for raw in client.iter_posts_before(channel_id, period.start_ms):
        if raw.create_at > period.end_ms:
            continue
        if raw.create_at < period.start_ms:
            break
        if raw.delete_at > 0:
            continue
        if raw.type:
            continue
        posts_in_period.append(raw)

    in_period_root_ids = {p.id for p in posts_in_period if not p.root_id}
    external_root_ids = {
        p.root_id for p in posts_in_period if p.root_id and p.root_id not in in_period_root_ids
    }

    threads_by_root: dict[str, list[RawPost]] = {}
    for root_id in in_period_root_ids | external_root_ids:
        thread_posts = client.get_thread(root_id)
        if not thread_posts:
            continue
        thread_posts = [p for p in thread_posts if p.delete_at == 0 and not p.type]
        thread_posts.sort(key=lambda p: p.create_at)
        threads_by_root[root_id] = thread_posts

    standalone_roots = [p for p in posts_in_period if not p.root_id and p.id not in threads_by_root]
    for r in standalone_roots:
        threads_by_root[r.id] = [r]

    return _RawChannelData(
        channel_id=channel_id,
        posts_in_period=posts_in_period,
        threads_by_root=threads_by_root,
    )


def _build_thread(
    client: MattermostClient,
    raw_posts: list[RawPost],
    period: Period,
    server: str,
    team: str,
    no_bots: bool,
) -> Thread | None:
    """Bouw één Thread; bepaal in_scope en context_only. Zie README.md voor de scope-regels."""
    if not raw_posts:
        return None
    root_raw = raw_posts[0]
    reply_raws = raw_posts[1:]

    if no_bots:
        if _is_bot(root_raw) and not any(period.contains_ms(r.create_at) for r in reply_raws):
            return None

    root_in = period.contains_ms(root_raw.create_at)
    reply_in_period = [r for r in reply_raws if period.contains_ms(r.create_at)]

    if not root_in and not reply_in_period:
        return None

    root = _build_post(
        client, root_raw, period, server, team,
        force_context_only=not root_in and bool(reply_in_period),
    )
    replies = [_build_post(client, r, period, server, team) for r in reply_raws]
    if no_bots:
        replies = [r for r in replies if not r.bot]
    return Thread(root=root, replies=replies)


def _is_bot(raw: RawPost) -> bool:
    return bool(raw.props.get("from_bot") or raw.props.get("from_webhook"))


def _build_post(
    client: MattermostClient,
    raw: RawPost,
    period: Period,
    server: str,
    team: str,
    *,
    force_context_only: bool = False,
) -> Post:
    user = client.get_user(raw.user_id)
    attachments: list[Attachment] = []
    for fid in raw.file_ids:
        info = client.get_file_info(fid)
        if info is not None:
            attachments.append(Attachment(filename=info.name, size_bytes=info.size))
    return Post(
        id=raw.id,
        author=Author(username=user.username, display_name=user.display_name),
        timestamp=_to_dt(raw.create_at),
        permalink=_permalink(server, team, raw.id),
        in_scope=period.contains_ms(raw.create_at),
        edited=raw.edit_at > 0,
        bot=_is_bot(raw),
        attachments=attachments,
        message=raw.message,
        context_only=force_context_only,
    )


def _fetch_channel(
    client: MattermostClient,
    team_id: str,
    channel_name: str,
    period: Period,
    server: str,
    team: str,
    no_bots: bool,
) -> Channel:
    url = _channel_url(server, team, channel_name)
    try:
        raw_data = _fetch_channel_raw(client, team_id, channel_name, period)
    except ChannelNotFoundError as e:
        log.error("✗ %s: %s", channel_name, e)
        return Channel(name=channel_name, id="", url=url, error=str(e))

    threads: list[Thread] = []
    for raw_posts in raw_data.threads_by_root.values():
        thread = _build_thread(client, raw_posts, period, server, team, no_bots)
        if thread is not None:
            threads.append(thread)
    threads.sort(key=lambda t: t.root.timestamp)

    channel = Channel(name=channel_name, id=raw_data.channel_id, url=url, threads=threads)
    if not threads:
        channel.note = "Geen posts binnen periode."

    in_period_count = sum(
        1 for t in threads for p in [t.root, *t.replies] if p.in_scope
    )
    ext_root_count = sum(1 for t in threads if t.root.context_only)
    log.info(
        "✓ %s: %d posts in periode, %d threads%s",
        channel_name,
        in_period_count,
        len(threads),
        f" ({ext_root_count} external roots opgehaald)" if ext_root_count else "",
    )
    return channel


# --------------------------------------------------------------------------- references


def _collect_references(
    client: MattermostClient,
    channels: list[Channel],
    period: Period,
    server: str,
    team: str,
    follow_external: bool,
    docs_url: str,
    docs_session: str,
) -> list[Reference]:
    """Volg verwijzingen in alle opgehaalde berichten en log wat niet lukte."""
    known_post_ids = {
        p.id for ch in channels for th in ch.threads for p in (th.root, *th.replies)
    }
    fetcher = WebFetcher() if follow_external else None
    docs_client = DocsClient(docs_url, docs_session) if docs_session else None
    collector = ReferenceCollector(
        client=client,
        server=server,
        build_post=lambda raw: _build_post(client, raw, period, server, team),
        fetcher=fetcher,
        known_post_ids=known_post_ids,
        docs_client=docs_client,
        docs_url=docs_url,
    )
    try:
        for ch in channels:
            for th in ch.threads:
                for post in (th.root, *th.replies):
                    post.references = collector.collect_from(post.message)
    finally:
        if fetcher is not None:
            fetcher.close()
        if docs_client is not None:
            docs_client.close()

    references = collector.references
    mm = sum(1 for r in references if r.kind == "mattermost")
    web = sum(1 for r in references if r.kind == "web")
    docs = sum(1 for r in references if r.kind == "docs")
    log.info(
        "Verwijzingen: %d Mattermost-threads, %d webpagina's, %d Docs-verslagen",
        mm, web, docs,
    )
    if collector.skipped_external:
        log.info("%d externe links overgeslagen (--no-external)", collector.skipped_external)

    if collector.overgeslagen_docs:
        log.warning(
            docs_cookie_instructie(
                f"{collector.overgeslagen_docs} verwijzingen naar Docs overgeslagen: "
                "DOCS_SESSION ontbreekt.",
                docs_url,
            )
        )
    verlopen = [
        r for r in references if r.kind == "docs" and r.status == STATUS_GEEN_TOEGANG
    ]
    if verlopen:
        log.warning(
            docs_cookie_instructie(
                f"{len(verlopen)} Docs-verslagen niet opgehaald: de sessiecookie is "
                "verlopen of geeft geen toegang.",
                docs_url,
            )
        )

    # Bij een verlopen cookie is elke losse regel dezelfde mededeling; die staat
    # al in het blok hierboven.
    verzwegen = {r.url for r in verlopen}
    for ref in references:
        if ref.status != STATUS_OK and ref.url not in verzwegen:
            log.warning("⚠ %s (%s): %s", ref.url, ref.status, ref.note or "")
    if collector.pdf_urls:
        log.warning(
            "PDF-verwijzingen niet meegenomen; tekstextractie is bewust niet gebouwd. "
            "Kom hierop terug als dit vaker voorkomt:\n  %s",
            "\n  ".join(collector.pdf_urls),
        )
    return references


# --------------------------------------------------------------------------- yaml


def _str_representer(dumper: yaml.Dumper, data: str):
    """Serialiseer meerregelige strings als `|` block-scalar (leesbaarder in YAML)."""
    style = "|" if "\n" in data else None
    return dumper.represent_scalar("tag:yaml.org,2002:str", data, style=style)


yaml.add_representer(str, _str_representer)


def _write_yaml(report: Report, output: Path, force: bool) -> None:
    if output.exists() and not force:
        raise FileExistsError(
            f"Output bestaat al: {output} (gebruik --force om te overschrijven)"
        )
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8") as f:
        yaml.dump(
            report.to_dict(),
            f,
            allow_unicode=True,
            sort_keys=False,
            default_flow_style=False,
            width=100,
        )


# --------------------------------------------------------------------------- main


def main(argv: list[str] | None = None) -> int:
    load_dotenv(Path.cwd() / ".env")
    args = _parse_args(argv if argv is not None else sys.argv[1:])
    _setup_logging(args.verbose, args.quiet)

    token = os.environ.get("MATTERMOST_TOKEN", "").strip()
    if not token:
        log.error(
            "MATTERMOST_TOKEN ontbreekt. Zet hem in .env of via `op run --env-file=.env -- …`.\n"
            "Zie scripts/moza-weekly/README.md voor instructies."
        )
        return EXIT_CONFIG

    server = os.environ.get("MOZA_WEEKLY_SERVER_URL", DEFAULT_SERVER)
    team = os.environ.get("MOZA_WEEKLY_TEAM", DEFAULT_TEAM)

    channels: list[str]
    if args.channels:
        channels = args.channels
    else:
        raw = os.environ.get("MOZA_WEEKLY_CHANNELS", DEFAULT_CHANNELS)
        channels = [c.strip() for c in raw.split(",") if c.strip()]

    try:
        period = _build_period(args.date_from, args.date_to)
    except ValueError as e:
        log.error("%s", e)
        return EXIT_CONFIG

    output: Path = args.output or (
        Path("tmp/moza-weekly") / f"{period.end.date().isoformat()}.yaml"
    )
    if output.exists() and not args.force:
        log.error("Output bestaat al: %s (gebruik --force om te overschrijven)", output)
        return EXIT_OUTPUT_EXISTS

    log.info(
        "Periode: %s t/m %s (NL-tijd)",
        period.start.date().isoformat(),
        period.end.date().isoformat(),
    )
    log.info("Server: %s, Team: %s, Kanalen: %s", server, team, ", ".join(channels))

    exit_code = EXIT_OK
    fetched_channels: list[Channel] = []
    references: list[Reference] = []
    try:
        with MattermostClient(server, token) as client:
            try:
                team_id = client.get_team_id(team)
            except TeamNotFoundError as e:
                log.error("%s", e)
                return EXIT_TEAM_NOT_FOUND
            except AuthError as e:
                log.error("%s", e)
                return EXIT_AUTH


            for ch_name in channels:
                try:
                    ch = _fetch_channel(
                        client, team_id, ch_name, period, server, team, args.no_bots
                    )
                except AuthError as e:
                    log.error("✗ %s: %s", ch_name, e)
                    fetched_channels.append(
                        Channel(
                            name=ch_name,
                            id="",
                            url=_channel_url(server, team, ch_name),
                            error=str(e),
                        )
                    )
                    exit_code = EXIT_PARTIAL
                else:
                    if ch.error:
                        exit_code = EXIT_PARTIAL
                    fetched_channels.append(ch)

            if args.no_references:
                log.info("Verwijzingen worden niet gevolgd (--no-references)")
            else:
                references = _collect_references(
                    client,
                    fetched_channels,
                    period,
                    server,
                    team,
                    follow_external=not args.no_external,
                    docs_url=os.environ.get("MOZA_WEEKLY_DOCS_URL", DEFAULT_DOCS_URL),
                    docs_session=os.environ.get("DOCS_SESSION", "").strip(),
                )
    except MattermostError as e:
        log.error("Netwerk/server-fout: %s", e)
        return EXIT_NETWORK

    report = Report(
        generated_at=datetime.now(NL_TZ),
        generator=GENERATOR,
        period=period,
        server=server,
        team=team,
        channels=fetched_channels,
        references=references,
    )
    _write_yaml(report, output, force=args.force)

    stats = report.stats()
    log.info(
        "Schreef %s (%d posts in periode, %d auteurs)",
        output,
        stats["posts_in_period"],
        stats["unique_authors"],
    )
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
