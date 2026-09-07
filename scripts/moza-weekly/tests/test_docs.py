"""Tests voor het ophalen van Docs-verslagen via de API."""

import pytest

from _references import (
    STATUS_GEEN_TOEGANG,
    STATUS_LEEG,
    STATUS_NIET_PUBLIEK,
    STATUS_OK,
    DocsResult,
    ReferenceCollector,
    parse_docs_uuid,
)

DOCS = "https://docs.rijksapp.nl"
UUID = "8e032c52-8bcc-4133-b883-b3e3302e5372"


# --------------------------------------------------------------------------- parse_docs_uuid


def test_parse_docs_uuid_herkent_documentlink():
    assert parse_docs_uuid(f"{DOCS}/docs/{UUID}/", DOCS) == UUID


def test_parse_docs_uuid_zonder_afsluitende_slash():
    assert parse_docs_uuid(f"{DOCS}/docs/{UUID}", DOCS) == UUID


def test_parse_docs_uuid_negeert_andere_host():
    assert parse_docs_uuid(f"https://elders.example/docs/{UUID}/", DOCS) is None


def test_parse_docs_uuid_negeert_ander_pad():
    assert parse_docs_uuid(f"{DOCS}/iets-anders/{UUID}/", DOCS) is None


def test_parse_docs_uuid_negeert_niet_uuid():
    assert parse_docs_uuid(f"{DOCS}/docs/geen-uuid/", DOCS) is None


def test_parse_docs_uuid_zonder_geconfigureerde_host():
    assert parse_docs_uuid(f"{DOCS}/docs/{UUID}/", "") is None


# --------------------------------------------------------------------------- collector


class _FakeDocsClient:
    def __init__(self, resultaten):
        self._resultaten = resultaten
        self.calls = []

    def fetch(self, uuid):
        self.calls.append(uuid)
        return self._resultaten[uuid]


class _FakeMattermost:
    def get_post(self, post_id):  # pragma: no cover - niet gebruikt in deze tests
        raise AssertionError("Mattermost mag hier niet aangeroepen worden")


def _collector(docs_client=None, fetcher=None):
    return ReferenceCollector(
        client=_FakeMattermost(),
        server="https://digilab.overheid.nl/chat",
        build_post=lambda raw: raw,
        fetcher=fetcher,
        docs_client=docs_client,
        docs_url=DOCS,
    )


def test_collector_haalt_verslag_op_via_docs_api():
    client = _FakeDocsClient(
        {UUID: DocsResult(status=STATUS_OK, title="Verslag stuurgroep", text="# Verslag\n\nAfspraken.")}
    )
    c = _collector(docs_client=client)
    ids = c.collect_from(f"zie {DOCS}/docs/{UUID}/")
    assert ids == ["ref_1"]
    ref = c.references[0]
    assert ref.kind == "docs"
    assert ref.status == STATUS_OK
    assert ref.title == "Verslag stuurgroep"
    assert "Afspraken." in ref.text
    assert client.calls == [UUID]


def test_collector_dedupliceert_hetzelfde_verslag():
    client = _FakeDocsClient(
        {UUID: DocsResult(status=STATUS_OK, title="Verslag", text="inhoud")}
    )
    c = _collector(docs_client=client)
    c.collect_from(f"{DOCS}/docs/{UUID}/")
    c.collect_from(f"nogmaals {DOCS}/docs/{UUID}")
    assert len(c.references) == 1
    assert client.calls == [UUID]


def test_leeg_document_krijgt_een_eigen_status():
    # Overzichtsmappen als "Analyses" hebben geen inhoud. Dat is geen storing,
    # dus dat moet je in het rapport kunnen zien.
    client = _FakeDocsClient({UUID: DocsResult(status=STATUS_OK, title="Analyses", text="")})
    c = _collector(docs_client=client)
    c.collect_from(f"{DOCS}/docs/{UUID}/")
    ref = c.references[0]
    assert ref.status == STATUS_LEEG
    assert ref.title == "Analyses"
    assert ref.text == ""


def test_document_met_alleen_witruimte_telt_als_leeg():
    client = _FakeDocsClient({UUID: DocsResult(status=STATUS_OK, title="Map", text="   \n\n  ")})
    c = _collector(docs_client=client)
    c.collect_from(f"{DOCS}/docs/{UUID}/")
    assert c.references[0].status == STATUS_LEEG


def test_collector_meldt_verlopen_sessie():
    client = _FakeDocsClient(
        {UUID: DocsResult(status=STATUS_GEEN_TOEGANG, error="HTTP 401 — sessiecookie ontbreekt of is verlopen")}
    )
    c = _collector(docs_client=client)
    c.collect_from(f"{DOCS}/docs/{UUID}/")
    ref = c.references[0]
    assert ref.status == STATUS_GEEN_TOEGANG
    assert ref.text == ""
    assert "verlopen" in ref.note


def test_lange_verslagen_komen_volledig_binnen():
    # Anders dan bij een webpagina kappen we een verslag niet af: de conclusies
    # en acties staan juist onderaan.
    lang = ("woord " * 5000).strip()
    client = _FakeDocsClient({UUID: DocsResult(status=STATUS_OK, title="Lang", text=lang)})
    c = _collector(docs_client=client)
    c.collect_from(f"{DOCS}/docs/{UUID}/")
    ref = c.references[0]
    assert ref.truncated is False
    assert ref.text == lang


def test_zonder_docs_client_valt_het_terug_op_de_webfetcher():
    # Geen cookie geconfigureerd: dan moet de gewone webroute het overnemen,
    # die op een lege JavaScript-shell uitkomt.
    from _references import WebResult

    class _Fetcher:
        def __init__(self):
            self.calls = []

        def fetch(self, url):
            self.calls.append(url)
            return WebResult(
                status=STATUS_NIET_PUBLIEK,
                final_url=url,
                title="",
                description="",
                text="",
                truncated=False,
                content_type="text/html",
                error="Pagina laadt haar inhoud met JavaScript",
            )

    fetcher = _Fetcher()
    c = _collector(docs_client=None, fetcher=fetcher)
    c.collect_from(f"{DOCS}/docs/{UUID}/")
    assert len(fetcher.calls) == 1
    assert c.references[0].status == STATUS_NIET_PUBLIEK
    assert c.references[0].kind == "web"


def test_overgeslagen_docs_worden_geteld():
    # Zonder cookie moet de caller kunnen melden wát er is blijven liggen.
    from _references import WebResult

    class _Fetcher:
        def fetch(self, url):
            return WebResult(
                status=STATUS_NIET_PUBLIEK, final_url=url, title="", description="",
                text="", truncated=False, content_type="text/html",
            )

    c = _collector(docs_client=None, fetcher=_Fetcher())
    c.collect_from(f"{DOCS}/docs/{UUID}/ en {DOCS}/docs/{'a' * 8}-1111-2222-3333-444444444444/")
    assert c.overgeslagen_docs == 2


def test_instructie_noemt_de_cookie_en_het_bestand():
    from _references import docs_cookie_instructie

    tekst = docs_cookie_instructie("Cookie verlopen.")
    assert "docs_sessionid" in tekst
    assert "DOCS_SESSION" in tekst
    assert "12 uur" in tekst


def test_docs_uuid_niet_gevolgd_als_docs_url_leeg_is():
    from _references import WebResult

    class _Fetcher:
        def fetch(self, url):
            return WebResult(
                status=STATUS_OK, final_url=url, title="t", description="",
                text="x", truncated=False, content_type="text/html",
            )

    c = ReferenceCollector(
        client=_FakeMattermost(),
        server="https://digilab.overheid.nl/chat",
        build_post=lambda raw: raw,
        fetcher=_Fetcher(),
        docs_client=_FakeDocsClient({}),
        docs_url="",
    )
    c.collect_from(f"{DOCS}/docs/{UUID}/")
    assert c.references[0].kind == "web"


@pytest.mark.parametrize("status", [STATUS_OK, STATUS_GEEN_TOEGANG])
def test_docs_referentie_krijgt_de_bron_als_site(status):
    client = _FakeDocsClient({UUID: DocsResult(status=status, title="t", text="x")})
    c = _collector(docs_client=client)
    c.collect_from(f"{DOCS}/docs/{UUID}/")
    assert c.references[0].site == "docs.rijksapp.nl"
