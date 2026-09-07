#!/usr/bin/env python3
"""Zoek namen die de anonimisering heeft gemist.

Rapporteert alleen; vervangt niets. Automatisch redigeren kan niet, want het
NER-model wijst ook MOZa, Claude en Lovelace als personen aan.

Usage:
    just moza-weekly-namencheck tmp/moza-weekly/<datum>.anonymized.json
"""

from __future__ import annotations

import argparse
import collections
import json
import logging
import os
import re
import sys
from pathlib import Path

# De scriptmap staat op sys.path, zodat de _-modules hiernaast importeerbaar zijn.
sys.path.insert(0, str(Path(__file__).parent))

from _util import load_dotenv  # noqa: E402

MODEL = "nl_core_news_lg"
EXIT_OK = 0
EXIT_CONFIG = 2

log = logging.getLogger("moza-weekly.namencheck")

# Eigen jargon, teams en tools die het model stelselmatig voor personen aanziet.
GEEN_PERSOON = {
    "moza", "claude", "lovelace", "turing", "lamarr", "dependabot", "digilab",
    "logius", "notify", "notifynl", "mattermost", "github", "docs", "kibana",
    "grafana", "wiremock", "podman", "java", "python", "obis", "maykin",
    "roxit", "rotaform", "accdescr", "milestone", "review", "bugs", "teamdag",
    "profielservice", "profiel-service", "notificatiedienst", "berichtenbox",
    "mijnberichten", "statusinformatie", "datalaag", "storingsknoppen",
    "mocking", "dashboards", "voorderest",
}


def _parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(prog="moza-weekly-namencheck", description=__doc__)
    p.add_argument("input", type=Path, help="Pad naar de anonymized.json")
    p.add_argument(
        "--alles",
        action="store_true",
        help="Toon ook de kandidaten die als bekend jargon zijn gefilterd",
    )
    return p.parse_args(argv)


def _is_kandidaat(tekst: str, alles: bool) -> bool:
    """Filter wat overduidelijk geen persoonsnaam is."""
    if alles:
        return True
    schoon = tekst.strip().strip("[]()·|")
    if not schoon or len(schoon) < 3:
        return False
    if schoon.lower() in GEEN_PERSOON:
        return False
    # Losse markdown- en URL-brokken die het model als naam opvat.
    if any(teken in schoon for teken in "/(){}<>|"):
        return False
    if not re.match(r"^[A-Z]", schoon):
        return False
    return True


# "Pietje (ADR)": deelnemerslijstjes zetten de organisatie achter de naam. Juist
# op zulke opsommingen faalt het model, terwijl het patroon trefzeker is.
_NAAM_MET_ORGANISATIE_RE = re.compile(r"\b([A-Z][\w'’-]+(?: [A-Z][\w'’-]+)?) \(([A-Za-z]{2,10})\)")


def _teksten(data: dict) -> list[str]:
    stukken = [
        p["message"]
        for ch in data.get("channels", [])
        for th in ch.get("threads", [])
        for p in [th["root"], *th.get("replies", [])]
    ]
    stukken += [
        (r.get("text") or "") + "\n" + (r.get("title") or "")
        for r in data.get("references", [])
    ]
    return [s for s in stukken if s and s.strip()]


def main(argv: list[str] | None = None) -> int:
    load_dotenv(Path.cwd() / ".env")
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    args = _parse_args(argv if argv is not None else sys.argv[1:])

    try:
        import spacy
    except ImportError:
        log.error(
            "spaCy ontbreekt. Draai dit via 'just moza-weekly-namencheck', dat de "
            "ner-groep meeneemt."
        )
        return EXIT_CONFIG

    if not args.input.exists():
        log.error("Bestaat niet: %s", args.input)
        return EXIT_CONFIG

    try:
        nlp = spacy.load(MODEL)
    except OSError:
        log.error("Model %s ontbreekt. Draai via 'just moza-weekly-namencheck'.", MODEL)
        return EXIT_CONFIG

    data = json.loads(args.input.read_text(encoding="utf-8"))
    teksten = _teksten(data)

    gevonden: collections.Counter[str] = collections.Counter()
    for doc in nlp.pipe(teksten, batch_size=8):
        for ent in doc.ents:
            if ent.label_ == "PERSON" and _is_kandidaat(ent.text, args.alles):
                gevonden[ent.text.strip()] += 1

    uit_lijstjes: collections.Counter[str] = collections.Counter()
    for tekst in teksten:
        for match in _NAAM_MET_ORGANISATIE_RE.finditer(tekst):
            naam = match.group(1)
            if _is_kandidaat(naam, args.alles) and naam not in gevonden:
                uit_lijstjes[f"{naam} ({match.group(2)})"] += 1

    if not gevonden and not uit_lijstjes:
        print("Geen kandidaat-namen gevonden.")
        return EXIT_OK

    bestand = os.environ.get(
        "MOZA_WEEKLY_EXTRA_NAMES_FILE", "~/.config/moza-weekly/extra-namen.txt"
    )
    if gevonden:
        print(f"Uit het NER-model, {len(gevonden)} kandidaten:\n")
        for naam, aantal in gevonden.most_common():
            print(f"  {aantal:>3}  {naam}")
    if uit_lijstjes:
        print(f"\nUit deelnemerslijstjes 'Naam (Organisatie)', {len(uit_lijstjes)} kandidaten:\n")
        for naam, aantal in uit_lijstjes.most_common():
            print(f"  {aantal:>3}  {naam}")
    print(
        f"\nIs het echt een naam? Zet hem in {bestand} en draai anonymize.py opnieuw.\n"
        "Staat er jargon tussen dat hier vaker opduikt, vul dan GEEN_PERSOON aan "
        "in namencheck.py."
    )
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
