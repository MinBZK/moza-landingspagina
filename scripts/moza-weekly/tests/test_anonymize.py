"""Tests voor anonymize: pseudoniemen en naam-/mention-redactie (privacy-kritisch)."""

from collections import OrderedDict

from anonymize import (
    _build_anonymized,
    _build_name_redactor,
    _build_pseudonym_map,
    _redact_message,
)


def _authors(*items):
    """items: tuples (username, display_name, is_bot)."""
    od = OrderedDict()
    for username, display, is_bot in items:
        od[username] = {"display_name": display, "is_bot": is_bot}
    return od


def test_pseudonym_map_orders_humans_and_bots():
    authors = _authors(
        ("alice", "Alice Ansems", False),
        ("weekbot", "Week Bot", True),
        ("bob", "Bob de Boer", False),
    )
    assert _build_pseudonym_map(authors) == {
        "alice": "person_1",
        "weekbot": "bot_1",
        "bob": "person_2",
    }


def test_redactor_replaces_full_name_and_long_firstname():
    name_re = _build_name_redactor(_authors(("ppuk", "Pietje Puk", False)))
    assert _redact_message("groet Pietje Puk", name_re) == "groet [collega]"
    assert _redact_message("hoi Pietje!", name_re) == "hoi [collega]!"


def test_redactor_skips_short_name_parts():
    # 'Ed' en 'Bos' zijn <4 letters → losse delen worden niet vervangen,
    # de volledige naam wel.
    name_re = _build_name_redactor(_authors(("ed", "Ed Puk", False)))
    assert _redact_message("cc Ed morgen", name_re) == "cc Ed morgen"
    assert _redact_message("cc Ed Puk morgen", name_re) == "cc [collega] morgen"


def test_redact_mentions_without_names():
    assert _redact_message("hoi @jan en @piet.puk", None) == "hoi [@collega] en [@collega]"


def test_github_attributie_wordt_geschrubd():
    # De handle in een GitHub-paginatitel staat niet in de auteur-set, en zou
    # zonder deze regel als naam in de LLM-input belanden.
    titel = "feat(demo): iets by jjansen · Pull Request #240 · MinBZK/moza-poc"
    assert _redact_message(titel, None) == (
        "feat(demo): iets by [collega] · Pull Request #240 · MinBZK/moza-poc"
    )


def test_gewoon_woord_by_blijft_staan():
    # Zonder de middot is het geen GitHub-attributie maar gewone tekst.
    assert _redact_message("dit is by design zo", None) == "dit is by design zo"


def test_extra_namen_worden_geschrubd():
    # Een teamlid dat zelf niets schreef, maar wel genoemd wordt.
    name_re = _build_name_redactor(_authors(("ppuk", "Pietje Puk", False)), ["Truus Bakker"])
    assert _redact_message("overleg met Truus Bakker", name_re) == "overleg met [collega]"
    assert _redact_message("Truus pakt dit op", name_re) == "[collega] pakt dit op"


def test_korte_extra_voornaam_wordt_wel_geschrubd():
    # De drempel van 4 letters geldt niet voor handmatig opgegeven namen: die
    # zijn een bewuste keuze, dus 'Luc' en 'Leo' moeten er ook uit.
    name_re = _build_name_redactor(_authors(), ["Luc", "Leo"])
    assert _redact_message("Luc en Leo stemmen af", name_re) == "[collega] en [collega] stemmen af"


def test_korte_extra_naam_raakt_geen_langere_woorden():
    name_re = _build_name_redactor(_authors(), ["Leo"])
    assert _redact_message("Leonardo bouwde het", name_re) == "Leonardo bouwde het"


def test_extra_namen_uit_bestand_buiten_de_repo(monkeypatch, tmp_path):
    from anonymize import _namen_uit_bestand

    bestand = tmp_path / "extra-namen.txt"
    bestand.write_text("# externen\nPietje\n\n  Klaas  \n", encoding="utf-8")
    monkeypatch.setenv("MOZA_WEEKLY_EXTRA_NAMES_FILE", str(bestand))
    assert _namen_uit_bestand() == ["Pietje", "Klaas"]


def test_zonder_bestand_geen_extra_namen(monkeypatch, tmp_path):
    from anonymize import _namen_uit_bestand

    monkeypatch.setenv("MOZA_WEEKLY_EXTRA_NAMES_FILE", str(tmp_path / "bestaat-niet.txt"))
    assert _namen_uit_bestand() == []


def test_zonder_token_geen_namen_uit_mattermost(monkeypatch):
    from anonymize import _namen_uit_mattermost

    monkeypatch.delenv("MATTERMOST_TOKEN", raising=False)
    assert _namen_uit_mattermost("https://voorbeeld.test") == []


def test_redactie_negeert_hoofdletters():
    name_re = _build_name_redactor(_authors(("m", "Klaas Jansen", False)))
    assert _redact_message("overleg met klaas", name_re) == "overleg met [collega]"


def test_redactie_pakt_de_bezitsvorm():
    name_re = _build_name_redactor(_authors(("m", "Klaas Jansen", False)))
    assert _redact_message("Klaas Jansens voorstel", name_re) == "[collega] voorstel"


def test_redactie_negeert_accenten():
    name_re = _build_name_redactor(_authors(), ["Renée Kuiper"])
    assert _redact_message("met Renee Kuiper gesproken", name_re) == "met [collega] gesproken"
    assert _redact_message("met Renée Kuiper gesproken", name_re) == "met [collega] gesproken"


def test_achternaam_naast_een_geschrubde_voornaam_gaat_mee():
    # "Truus Bakker" waarvan alleen de voornaam bekend is, leverde eerder
    # "[collega] Bakker" op: nog steeds herleidbaar, en het suggereert
    # ten onrechte dat er geanonimiseerd is.
    name_re = _build_name_redactor(_authors(), ["Truus"])
    assert _redact_message("met Truus Bakker (Logius)", name_re) == "met [collega] (Logius)"


def test_organisatie_na_een_tussenvoegsel_blijft_staan():
    # "[collega] van Logius" betekent 'een collega van Logius'; die
    # organisatienaam mag niet sneuvelen.
    name_re = _build_name_redactor(_authors(), ["Truus"])
    assert _redact_message("Truus van Logius belde", name_re) == "[collega] van Logius belde"


def test_zin_die_na_een_naam_begint_blijft_heel():
    name_re = _build_name_redactor(_authors(), ["Jan"])
    assert _redact_message("Bedankt Jan. Deze week...", name_re) == (
        "Bedankt [collega]. Deze week..."
    )


def test_non_author_name_is_not_redacted():
    # Gedocumenteerde beperking: namen buiten de auteur-set blijven staan (geen NER).
    name_re = _build_name_redactor(_authors(("ppuk", "Pietje Puk", False)))
    assert _redact_message("cc Klaas", name_re) == "cc Klaas"


def _sample_data():
    return {
        "meta": {"team": "moza"},
        "stats": {},
        "channels": [
            {
                "name": "check-in",
                "id": "c1",
                "url": "http://x",
                "threads": [
                    {
                        "root": {
                            "id": "p1",
                            "author": {"username": "ppuk", "display_name": "Pietje Puk"},
                            "timestamp": "2026-05-21T10:00:00+02:00",
                            "permalink": "http://pl/1",
                            "in_scope": True,
                            "bot": False,
                            "message": "Hoi @jan, groet Pietje Puk",
                        },
                        "replies": [
                            {
                                "id": "p2",
                                "author": {"username": "weekbot", "display_name": "Week Bot"},
                                "timestamp": "2026-05-21T11:00:00+02:00",
                                "permalink": "http://pl/2",
                                "in_scope": True,
                                "bot": True,
                                "message": "Automatisch bericht",
                            }
                        ],
                    }
                ],
            }
        ],
    }


def test_build_anonymized_pipeline():
    out = _build_anonymized(_sample_data())
    thread = out["channels"][0]["threads"][0]
    root, reply = thread["root"], thread["replies"][0]

    assert root["author"] == "person_1"
    assert root["message"] == "Hoi [@collega], groet [collega]"
    assert reply["author"] == "bot_1"
    assert reply["is_bot"] is True
    assert root["id"] == "p1"  # post-id blijft (permalink-traceerbaarheid)
    assert out["meta"]["anonymization"]["pseudonym_counts"] == {"humans": 1, "bots": 1}


def _sample_data_met_references():
    data = _sample_data()
    data["channels"][0]["threads"][0]["root"]["references"] = ["ref_1", "ref_2"]
    data["references"] = [
        {
            "id": "ref_1",
            "kind": "mattermost",
            "url": "http://pl/9",
            "status": "ok",
            "title": "Verslag van Truus Bakker",
            "channel": "gespreksverslagen",
            "posts": [
                {
                    "id": "p9",
                    "author": {"username": "tbakker", "display_name": "Truus Bakker"},
                    "timestamp": "2026-05-19T09:00:00+02:00",
                    "permalink": "http://pl/9",
                    "in_scope": False,
                    "bot": False,
                    "message": "Verslag, cc @jan",
                }
            ],
        },
        {
            "id": "ref_2",
            "kind": "web",
            "url": "https://example.org/nota",
            "status": "ok",
            "site": "example.org",
            "title": "Nota",
            "description": "Van Pietje Puk",
            "truncated": False,
            "text": "Pietje Puk schreef dit. Mail @jan voor vragen.",
        },
    ]
    return data


def test_reference_authors_krijgen_pseudoniem():
    out = _build_anonymized(_sample_data_met_references())
    ref = out["references"][0]
    assert ref["posts"][0]["author"] == "person_2"
    assert ref["posts"][0]["message"] == "Verslag, cc [@collega]"
    assert ref["title"] == "Verslag van [collega]"
    assert out["meta"]["anonymization"]["pseudonym_counts"]["humans"] == 2


def test_webtekst_wordt_geredigeerd():
    out = _build_anonymized(_sample_data_met_references())
    ref = out["references"][1]
    assert ref["text"] == "[collega] schreef dit. Mail [@collega] voor vragen."
    assert ref["description"] == "Van [collega]"
    assert ref["site"] == "example.org"


def test_post_behoudt_verwijzing_naar_ref_ids():
    out = _build_anonymized(_sample_data_met_references())
    assert out["channels"][0]["threads"][0]["root"]["references"] == ["ref_1", "ref_2"]


def test_referenties_zonder_inhoud_blijven_leeg():
    data = _sample_data()
    data["references"] = [
        {
            "id": "ref_1",
            "kind": "web",
            "url": "https://intranet.example/x",
            "status": "niet_publiek",
            "note": "Loginpagina - niet publiek",
            "truncated": False,
            "text": "",
        }
    ]
    ref = _build_anonymized(data)["references"][0]
    assert ref["status"] == "niet_publiek"
    assert ref["text"] == ""
