#!/usr/bin/env python3
"""Schrijf een geanonimiseerde JSON-versie van de fetch.py YAML-output.

De geanonimiseerde JSON is bedoeld als input voor een LLM (MOZa Weekly skill).
Authors krijgen per-run stabiele pseudoniemen (person_1, person_2, ... voor
mensen; bot_1, bot_2, ... voor bots). @mentions in message-bodies worden
vervangen door `[@collega]`. Bekende collega-namen (full name én voornaam ≥4
letters) worden in message-bodies vervangen door `[collega]`.

Beperking: namen in message-bodies die NIET in de auteur-set zitten worden
NIET geschrubd. Voor v0.1 is dit een bewuste tradeoff (geen NER). Plain-text
namen kunnen dus alsnog in de JSON staan.

Usage:
    uv run --project scripts/moza-weekly scripts/moza-weekly/anonymize.py <input.yaml> [--output PATH]
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
from collections import OrderedDict
from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

# De scriptmap staat op sys.path, zodat de _-modules hiernaast importeerbaar zijn.
sys.path.insert(0, str(Path(__file__).parent))

from _mattermost import MattermostClient, MattermostError  # noqa: E402
from _util import MENTION_RE, load_dotenv, load_yaml  # noqa: E402

NL_TZ = ZoneInfo("Europe/Amsterdam")
EXIT_OK = 0
EXIT_YAML = 8

log = logging.getLogger("moza-weekly.anonymize")

_MIN_FIRSTNAME_LEN = 4  # voornamen <4 letters skippen (zoals "Ed", "Tim") om vals-positieven te voorkomen


def _parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(prog="moza-weekly-anonymize", description=__doc__)
    p.add_argument("input", type=Path, help="Pad naar YAML-input van fetch.py")
    p.add_argument("--output", type=Path, default=None)
    p.add_argument("--verbose", action="store_true")
    return p.parse_args(argv)


def _collect_authors(
    channels: list[dict[str, Any]], references: list[dict[str, Any]] | None = None
) -> "OrderedDict[str, dict[str, Any]]":
    """Verzamel alle unieke auteurs in volgorde van voorkomen. Key = username.

    Ook de auteurs van berichten uit gevolgde verwijzingen tellen mee: zonder dat
    zouden zij zonder pseudoniem in de LLM-input belanden.
    """
    authors: OrderedDict[str, dict[str, Any]] = OrderedDict()

    def _add(post: dict[str, Any]) -> None:
        a = post.get("author", {})
        username = a.get("username", "")
        if username and username not in authors:
            authors[username] = {
                "display_name": a.get("display_name", username),
                "is_bot": bool(post.get("bot", False)),
            }

    for ch in channels:
        for th in ch.get("threads", []):
            for post in [th["root"], *th.get("replies", [])]:
                _add(post)
    for ref in references or []:
        for post in ref.get("posts", []):
            _add(post)
    return authors


def _build_pseudonym_map(
    authors: "OrderedDict[str, dict[str, Any]]",
) -> dict[str, str]:
    person_n = 0
    bot_n = 0
    out: dict[str, str] = {}
    for username, info in authors.items():
        if info["is_bot"]:
            bot_n += 1
            out[username] = f"bot_{bot_n}"
        else:
            person_n += 1
            out[username] = f"person_{person_n}"
    return out


# Klinkers met en zonder accent moeten elkaar matchen: "Renée" en "Renee"
# horen allebei geschrubd te worden, en in chat wordt het door elkaar gebruikt.
_ACCENTEN = {
    "a": "aàáâäã", "e": "eèéêë", "i": "iìíîï", "o": "oòóôöõ",
    "u": "uùúûü", "y": "yÿý", "c": "cç", "n": "nñ",
}
_OMGEKEERD = {v: basis for basis, varianten in _ACCENTEN.items() for v in varianten}


def _naam_patroon(naam: str) -> str:
    """Regexfragment voor een naam, waarbij accenten en hun kale vorm matchen."""
    delen = []
    for teken in naam:
        basis = _OMGEKEERD.get(teken.lower())
        if basis:
            delen.append(f"[{_ACCENTEN[basis]}]")
        else:
            delen.append(re.escape(teken))
    return "".join(delen)


def _build_name_redactor(
    authors: "OrderedDict[str, dict[str, Any]]",
    extra_names: "list[str] | None" = None,
) -> "re.Pattern[str] | None":
    """Bouw een regex die alle bekende namen matched. Langere matches eerst zodat
    `Pietje Puk` matcht vóór `Pietje` of `Puk`.

    Toegevoegd worden:
    - de volledige display_name (`Pietje Puk`)
    - elk afzonderlijk naamdeel van >= 4 letters (voornaam, achternaam, behalve
      Nederlandse tussenvoegsels als 'de', 'van', 'der').
    """
    fragments: list[str] = []
    namen = [info["display_name"].strip() for info in authors.values()]
    namen += [n.strip() for n in (extra_names or [])]
    for display in namen:
        if not display:
            continue
        fragments.append(_naam_patroon(display))
        for part in display.split():
            if len(part) >= _MIN_FIRSTNAME_LEN:
                fragments.append(_naam_patroon(part))
    # Een handmatig opgegeven losse naam is een bewuste keuze, dus die nemen we
    # ook op als hij korter is dan de drempel (denk aan "Luc" of "Leo").
    for naam in extra_names or []:
        naam = naam.strip()
        if naam and len(naam.split()) == 1:
            fragments.append(_naam_patroon(naam))
    if not fragments:
        return None
    fragments = sorted(set(fragments), key=len, reverse=True)
    # Bezitsvorm meepakken ("Jans voorstel"), en hoofdletters negeren omdat
    # namen in chat net zo vaak zonder hoofdletter worden geschreven.
    pattern = r"\b(?:" + "|".join(fragments) + r")(?:['’]?s)?\b"
    return re.compile(pattern, re.IGNORECASE)


# GitHub zet de auteur in de paginatitel: "… by jjansen · Pull Request #240 …".
# Die handle staat niet in de auteur-set, dus geen enkele naamregel vangt hem.
_GITHUB_ATTRIBUTIE_RE = re.compile(r"\bby\s+[\w][\w.-]{2,}\s+·")


# "Truus Bakker" werd anders "[collega] Bakker": nog steeds herleidbaar.
# Alleen een direct volgend hoofdletterwoord zonder leesteken ertussen, zodat
# "[collega] van Logius" en "[collega]. Deze week" heel blijven.
_ACHTERNAAM_RE = re.compile(r"(\[collega\]) +([A-Z][\w'’-]+)")


def _redact_message(message: str, name_re: "re.Pattern[str] | None") -> str:
    if not message:
        return message
    redacted = MENTION_RE.sub("[@collega]", message)
    redacted = _GITHUB_ATTRIBUTIE_RE.sub("by [collega] ·", redacted)
    if name_re is not None:
        redacted = name_re.sub("[collega]", redacted)
        redacted = _ACHTERNAAM_RE.sub(r"\1", redacted)
    return redacted


def _anonymize_post(
    post: dict[str, Any],
    pseudonyms: dict[str, str],
    name_re: "re.Pattern[str] | None",
) -> dict[str, Any]:
    author = post.get("author", {})
    username = author.get("username", "")
    return {
        "id": post["id"],
        "author": pseudonyms.get(username, "unknown"),
        "is_bot": bool(post.get("bot", False)),
        "timestamp": post["timestamp"],
        "permalink": post["permalink"],
        "in_scope": post.get("in_scope", True),
        "context_only": post.get("context_only", False),
        "edited": post.get("edited", False),
        "attachments": post.get("attachments", []),
        "message": _redact_message(post.get("message", ""), name_re),
        "references": post.get("references", []),
    }


def _anonymize_channels(
    channels: list[dict[str, Any]],
    pseudonyms: dict[str, str],
    name_re: "re.Pattern[str] | None",
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for ch in channels:
        anon_ch: dict[str, Any] = {
            "name": ch["name"],
            "id": ch.get("id", ""),
            "url": ch["url"],
            "threads": [],
        }
        if "error" in ch:
            anon_ch["error"] = ch["error"]
        if "note" in ch:
            anon_ch["note"] = ch["note"]
        for th in ch.get("threads", []):
            anon_ch["threads"].append(
                {
                    "root": _anonymize_post(th["root"], pseudonyms, name_re),
                    "replies": [
                        _anonymize_post(r, pseudonyms, name_re)
                        for r in th.get("replies", [])
                    ],
                }
            )
        out.append(anon_ch)
    return out


def _anonymize_references(
    references: list[dict[str, Any]],
    pseudonyms: dict[str, str],
    name_re: "re.Pattern[str] | None",
) -> list[dict[str, Any]]:
    """Redigeer verwijzingen: berichten via _anonymize_post, vrije tekst via de naam-regex."""
    out: list[dict[str, Any]] = []
    for ref in references:
        anon: dict[str, Any] = {
            k: ref[k] for k in ("id", "kind", "url", "status") if k in ref
        }
        for key in ("site", "content_type", "channel", "note", "truncated"):
            if key in ref:
                anon[key] = ref[key]
        for key in ("title", "description", "text"):
            if key in ref:
                anon[key] = _redact_message(ref[key], name_re)
        if "posts" in ref:
            anon["posts"] = [
                _anonymize_post(p, pseudonyms, name_re) for p in ref["posts"]
            ]
        out.append(anon)
    return out


def _namen_uit_mattermost(server: str) -> list[str]:
    """Namen van iedereen op de Mattermost-server, live opgehaald.

    Bewust niet opgeslagen: een namenlijst op schijf is zelf een lek.
    """
    token = os.environ.get("MATTERMOST_TOKEN", "").strip()
    if not token:
        log.warning("Geen MATTERMOST_TOKEN: naamredactie beperkt zich tot de auteurs")
        return []
    try:
        with MattermostClient(server, token) as client:
            namen = [u.display_name for u in client.iter_people()]
    except MattermostError as e:
        log.warning("Namen ophalen faalde (%s); redactie beperkt zich tot de auteurs", e)
        return []
    log.info("Naamredactie: %d personen van de Mattermost-server", len(namen))
    return namen


def _namen_uit_bestand() -> list[str]:
    """Extra namen van mensen die niet op de Mattermost-server zitten.

    Staat buiten de repo, standaard ~/.config/moza-weekly/extra-namen.txt, één
    naam per regel. Regels die met # beginnen zijn commentaar.
    """
    pad = Path(
        os.environ.get("MOZA_WEEKLY_EXTRA_NAMES_FILE", "~/.config/moza-weekly/extra-namen.txt")
    ).expanduser()
    if not pad.exists():
        return []
    namen = [
        regel.strip()
        for regel in pad.read_text(encoding="utf-8").splitlines()
        if regel.strip() and not regel.strip().startswith("#")
    ]
    log.info("Naamredactie: %d extra namen uit %s", len(namen), pad)
    return namen


def _extra_names(data: dict[str, Any], server: str = "") -> list[str]:
    """Alle namen om te schrubben bovenop de auteurs uit de YAML zelf."""
    bron = server or data.get("meta", {}).get("server", "")
    return _namen_uit_mattermost(bron) + _namen_uit_bestand()


def _build_anonymized(data: dict[str, Any]) -> dict[str, Any]:
    channels = data.get("channels", [])
    references = data.get("references", []) or []
    authors = _collect_authors(channels, references)
    pseudonyms = _build_pseudonym_map(authors)
    extra_names = _extra_names(data)
    name_re = _build_name_redactor(authors, extra_names)

    humans = sum(1 for info in authors.values() if not info["is_bot"])
    bots = sum(1 for info in authors.values() if info["is_bot"])

    meta = dict(data.get("meta", {}))
    meta["anonymized_at"] = datetime.now(NL_TZ).isoformat()
    meta["anonymization"] = {
        "strategy": "per-run pseudoniemen (person_N / bot_N), @mention-strip, bekende-naam-strip in bodies",
        "limitations": (
            "Namen die NIET voorkomen in de author-set worden NIET geschrubd. "
            "Voornamen korter dan 4 letters worden niet gesubstitueerd om "
            "vals-positieven te voorkomen. Dit geldt ook voor de tekst van "
            "gevolgde verwijzingen: namen op een externe pagina die niet in de "
            "author-set zitten blijven staan."
        ),
        "pseudonym_counts": {"humans": humans, "bots": bots},
    }

    stats = dict(data.get("stats", {}))
    stats["anonymized_humans"] = humans
    stats["anonymized_bots"] = bots

    return {
        "meta": meta,
        "stats": stats,
        "channels": _anonymize_channels(channels, pseudonyms, name_re),
        "references": _anonymize_references(references, pseudonyms, name_re),
    }


def main(argv: list[str] | None = None) -> int:
    load_dotenv(Path.cwd() / ".env")
    args = _parse_args(argv if argv is not None else sys.argv[1:])
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s %(message)s",
    )

    try:
        data = load_yaml(args.input)
    except (FileNotFoundError, ValueError) as e:
        log.error("%s", e)
        return EXIT_YAML

    anonymized = _build_anonymized(data)

    output: Path = args.output or args.input.with_suffix(".anonymized.json")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(anonymized, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    counts = anonymized["meta"]["anonymization"]["pseudonym_counts"]
    log.info(
        "Schreef %s (%d mensen → person_*, %d bots → bot_*)",
        output,
        counts["humans"],
        counts["bots"],
    )
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
