"""Verwijzingen in berichten volgen: Mattermost-permalinks en publieke webpagina's.

Berichten in de check-in verwijzen regelmatig naar een gespreksverslag elders in
Mattermost of naar een externe pagina. Deze module haalt die context erbij, zodat
de MOZa Weekly niet alleen de verwijzing maar ook de inhoud kan meenemen.
"""

from __future__ import annotations

import ipaddress
import logging
import re
import socket
from dataclasses import dataclass
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import httpx
from bs4 import BeautifulSoup

from _mattermost import AuthError, MattermostError
from _model import Reference

log = logging.getLogger("moza-weekly.references")

# Statuswaarden van een Reference.
STATUS_OK = "ok"
STATUS_NIET_PUBLIEK = "niet_publiek"
STATUS_GEEN_TOEGANG = "geen_toegang"
STATUS_NIET_GEVONDEN = "niet_gevonden"
STATUS_FOUT = "fout"
STATUS_PDF = "pdf_niet_ondersteund"
STATUS_OVERGESLAGEN = "overgeslagen"
STATUS_GEBLOKKEERD = "geblokkeerd"
STATUS_LEEG = "leeg"

USER_AGENT = "moza-weekly-fetch/0.2 (+https://mijnoverheid-zakelijk.nl; interne weekly-samenvatting)"


def docs_cookie_instructie(reden: str, docs_url: str = "https://docs.rijksapp.nl") -> str:
    """Uitleg bij een ontbrekende of verlopen Docs-cookie."""
    return (
        f"{reden}\n"
        f"  Zo haal je een nieuwe op:\n"
        f"    1. Open {docs_url} in je browser en log in.\n"
        f"    2. Developer tools openen (Cmd+Option+I op macOS).\n"
        f"    3. Tabblad Application (Chrome) of Storage (Firefox)\n"
        f"       -> Cookies -> {docs_url}\n"
        f"    4. Kopieer de waarde van de cookie 'docs_sessionid'.\n"
        f"    5. Zet die in .env als: DOCS_SESSION=<waarde>\n"
        f"  De cookie is ongeveer 12 uur geldig, dus dit komt vaker langs."
    )


# Hosts waarvan we alleen titel en description bewaren. Een PR- of issue-pagina
# levert duizenden tekens navigatie en diff-gepraat op, terwijl de titel en de
# og:description samen al zeggen waar het over gaat.
SAMENVATTING_HOSTS = frozenset({"github.com"})
MAX_CHARS = 4000
MAX_BYTES = 2 * 1024 * 1024
MAX_REDIRECTS = 5
DEFAULT_TIMEOUT = 15.0

# --------------------------------------------------------------------------- URL-extractie

# Kale URL tot aan whitespace of een teken dat in markdown/HTML de URL afbakent.
# `[` en `]` horen daarbij: zonder dat slurpt `[https://x](https://x)` de `](` mee.
_URL_RE = re.compile(r"https?://[^\s<>\"'`\\\[\]]+", re.I)
_TRAILING_PUNCT = ".,;:!?*_~"

# Trackingparameters die dezelfde pagina anders laten lijken.
_TRACKING_PREFIXES = ("utm_", "telem_")
_TRACKING_KEYS = {"fbclid", "gclid", "mc_cid", "mc_eid", "ref", "src"}

# Mattermost-permalink: /<team>/pl/<26-teken post-id>.
_PERMALINK_RE = re.compile(r"^/[^/]+/pl/([a-z0-9]{26})$", re.I)

# Docs-documentlink: /docs/<uuid>/.
_DOCS_PATH_RE = re.compile(
    r"^/docs/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/?$", re.I
)

_LOGIN_PATH_RE = re.compile(
    r"/(log-?in|log-?on|sign-?in|sign-?on|auth|authorize|authenticate|sso|oauth2?|saml|adfs)(/|$)",
    re.I,
)
_PASSWORD_INPUT_RE = re.compile(r"<input[^>]*type\s*=\s*[\"']?password", re.I)

_BOILERPLATE_TAGS = (
    "script", "style", "noscript", "template", "svg",
    "nav", "header", "footer", "aside", "form", "iframe",
)


def _trim_url(url: str) -> str:
    """Haal afsluitende leestekens en ongebalanceerde haakjes van een URL af."""
    while url:
        if url[-1] in _TRAILING_PUNCT:
            url = url[:-1]
            continue
        if url[-1] == ")" and url.count("(") < url.count(")"):
            url = url[:-1]
            continue
        break
    return url


def extract_urls(message: str) -> list[str]:
    """Alle http(s)-URL's uit een bericht, ontdubbeld met behoud van volgorde."""
    if not message:
        return []
    found = (_trim_url(m.group(0)) for m in _URL_RE.finditer(message))
    return list(dict.fromkeys(u for u in found if u))


def normalize_url(url: str) -> str:
    """Sleutel voor ontdubbeling: host lowercase, fragment en tracking eraf."""
    parts = urlsplit(url)
    path = parts.path or "/"
    if len(path) > 1:
        path = path.rstrip("/") or "/"
    query = [
        (k, v)
        for k, v in parse_qsl(parts.query, keep_blank_values=True)
        if not k.lower().startswith(_TRACKING_PREFIXES) and k.lower() not in _TRACKING_KEYS
    ]
    return urlunsplit(
        (parts.scheme.lower(), parts.netloc.lower(), path, urlencode(query), "")
    )


def parse_permalink(url: str, server: str) -> str | None:
    """Post-id als de URL een Mattermost-permalink op deze server is, anders None."""
    target, base = urlsplit(url), urlsplit(server.rstrip("/"))
    if target.scheme.lower() != base.scheme.lower():
        return None
    if target.netloc.lower() != base.netloc.lower():
        return None
    base_path = base.path.rstrip("/")
    if base_path and not target.path.startswith(base_path + "/"):
        return None
    match = _PERMALINK_RE.match(target.path[len(base_path):])
    return match.group(1) if match else None


def parse_docs_uuid(url: str, docs_url: str) -> str | None:
    """Document-uuid als de URL naar een document in de Docs-applicatie wijst."""
    if not docs_url:
        return None
    target, base = urlsplit(url), urlsplit(docs_url.rstrip("/"))
    if target.scheme.lower() != base.scheme.lower():
        return None
    if target.netloc.lower() != base.netloc.lower():
        return None
    match = _DOCS_PATH_RE.match(target.path)
    return match.group(1) if match else None


# --------------------------------------------------------------------------- HTML


@dataclass(frozen=True)
class ReadablePage:
    title: str
    description: str
    text: str
    truncated: bool


def is_login_page(final_url: str, html: str) -> bool:
    """Herken een afgeschermde pagina: loginpad in de URL of een wachtwoordveld."""
    if _LOGIN_PATH_RE.search(urlsplit(final_url).path):
        return True
    return bool(_PASSWORD_INPUT_RE.search(html or ""))


def _collapse_whitespace(text: str) -> str:
    lines = (re.sub(r"[ \t ]+", " ", line).strip() for line in text.splitlines())
    return "\n".join(line for line in lines if line)


def extract_readable(html: str, max_chars: int = MAX_CHARS) -> ReadablePage:
    """Titel, meta-description en hoofdtekst uit een HTML-pagina."""
    soup = BeautifulSoup(html, "html.parser")

    title = soup.title.get_text(strip=True) if soup.title else ""
    description = ""
    for attrs in ({"name": "description"}, {"property": "og:description"}):
        tag = soup.find("meta", attrs=attrs)
        if tag and tag.get("content"):
            description = tag["content"].strip()
            break

    for tag in soup(list(_BOILERPLATE_TAGS)):
        tag.decompose()

    root = soup.find("main") or soup.find("article") or soup.body or soup
    text = _collapse_whitespace(root.get_text(separator="\n"))
    truncated = len(text) > max_chars
    if truncated:
        text = text[:max_chars].rstrip()
    return ReadablePage(title=title, description=description, text=text, truncated=truncated)


# --------------------------------------------------------------------------- adrescontrole


class UnsafeUrlError(Exception):
    """De URL wijst niet naar een publiek internetadres."""


def assert_public_url(url: str) -> None:
    """Blokkeer alles wat niet naar een publiek internetadres wijst.

    De URL's komen uit berichten van anderen. Zonder deze controle kan een link
    naar bijvoorbeeld http://localhost:8080 of een metadata-endpoint het script
    iets uit het lokale netwerk laten ophalen en in het rapport zetten.

    Let op: tussen deze controle en het verzoek doet httpx zijn eigen DNS-lookup.
    Een domein dat bewust wisselende adressen teruggeeft (DNS-rebinding) glipt er
    dus doorheen; daarvoor zou het IP vastgepind moeten worden.
    """
    parts = urlsplit(url)
    scheme = parts.scheme.lower()
    if scheme not in ("http", "https"):
        raise UnsafeUrlError(f"Schema {scheme or '?'} wordt niet opgehaald")
    host = parts.hostname
    if not host:
        raise UnsafeUrlError("URL zonder hostnaam")
    try:
        infos = socket.getaddrinfo(host, None, type=socket.SOCK_STREAM)
    except socket.gaierror as e:
        raise UnsafeUrlError(f"Hostnaam {host} niet gevonden ({e})") from None
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if not ip.is_global:
            raise UnsafeUrlError(f"{host} wijst naar een niet-publiek adres ({ip})")


# --------------------------------------------------------------------------- web fetch


@dataclass(frozen=True)
class WebResult:
    status: str
    final_url: str
    title: str
    description: str
    text: str
    truncated: bool
    content_type: str
    error: str = ""


def host_matcht(url: str, hosts) -> bool:
    """True als de host van de URL in `hosts` staat, of er een subdomein van is."""
    host = (urlsplit(url).hostname or "").lower()
    return any(host == h or host.endswith("." + h) for h in hosts)


def lijkt_javascript_shell(html: str) -> bool:
    """Geen leesbare tekst maar wel scripts: de pagina rendert clientside en
    geeft anoniem dus een lege shell. Geen fout aan onze kant."""
    return "<script" in html.lower()


def _decode_body(body: bytes, charset: str | None) -> str:
    """Decodeer de body; een pagina die een onbekende charset opgeeft is niet fataal."""
    if charset:
        try:
            return body.decode(charset, errors="replace")
        except LookupError:
            log.debug("Onbekende charset %r, val terug op utf-8", charset)
    return body.decode("utf-8", errors="replace")


class WebFetcher:
    """Haalt externe pagina's anoniem op: geen token, geen cookies uit Mattermost."""

    def __init__(
        self,
        *,
        timeout: float = DEFAULT_TIMEOUT,
        max_chars: int = MAX_CHARS,
        max_bytes: int = MAX_BYTES,
        summary_hosts=SAMENVATTING_HOSTS,
    ) -> None:
        self._max_chars = max_chars
        self._max_bytes = max_bytes
        self._summary_hosts = summary_hosts
        # Redirects volgen we zelf, zodat elke hop opnieuw langs assert_public_url gaat.
        self._client = httpx.Client(
            timeout=timeout,
            follow_redirects=False,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
                "Accept-Language": "nl,en;q=0.8",
            },
        )

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> WebFetcher:
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    def fetch(self, url: str) -> WebResult:
        log.debug("Externe pagina ophalen: %s", url)
        try:
            return self._fetch(url)
        except UnsafeUrlError as e:
            return _web_error(url, STATUS_GEBLOKKEERD, str(e))
        except (httpx.HTTPError, UnicodeError, ValueError) as e:
            # Vangnet: één stukke pagina mag de hele run niet slopen.
            return _web_error(url, STATUS_FOUT, f"{type(e).__name__}: {e}")

    def _fetch(self, url: str) -> WebResult:
        current = url
        for _ in range(MAX_REDIRECTS + 1):
            result = self._fetch_once(current)
            if isinstance(result, WebResult):
                return result
            current = result  # redirect-doel
        return _web_error(current, STATUS_FOUT, f"Meer dan {MAX_REDIRECTS} redirects")

    def _fetch_once(self, url: str) -> WebResult | str:
        """Eén hop. Geeft een WebResult terug, of de URL van de volgende redirect."""
        assert_public_url(url)
        with self._client.stream("GET", url) as response:
            final_url = str(response.url)
            content_type = response.headers.get("content-type", "").split(";")[0].strip().lower()

            if response.is_redirect:
                location = response.headers.get("location", "").strip()
                if not location:
                    return _web_error(final_url, STATUS_FOUT, "Redirect zonder Location-header")
                return str(response.url.join(location))
            if response.status_code in (401, 403):
                return _web_error(final_url, STATUS_NIET_PUBLIEK, f"HTTP {response.status_code}", content_type)
            if response.status_code >= 400:
                return _web_error(final_url, STATUS_FOUT, f"HTTP {response.status_code}", content_type)
            if content_type == "application/pdf" or urlsplit(final_url).path.lower().endswith(".pdf"):
                return _web_error(final_url, STATUS_PDF, "PDF: tekstextractie niet gebouwd", content_type or "application/pdf")
            if content_type and content_type not in ("text/html", "application/xhtml+xml", "text/plain"):
                return _web_error(final_url, STATUS_OVERGESLAGEN, f"Content-type {content_type}", content_type)

            body = bytearray()
            for chunk in response.iter_bytes():
                body += chunk
                if len(body) >= self._max_bytes:
                    break
            html = _decode_body(bytes(body), response.charset_encoding)

        if is_login_page(final_url, html):
            return _web_error(final_url, STATUS_NIET_PUBLIEK, "Loginpagina, niet publiek", content_type)

        page = extract_readable(html, self._max_chars)

        if host_matcht(final_url, self._summary_hosts):
            return WebResult(
                status=STATUS_OK,
                final_url=final_url,
                title=page.title,
                description=page.description,
                text="",
                truncated=False,
                content_type=content_type or "text/html",
                error="Alleen titel en samenvatting bewaard",
            )
        if not page.text:
            if lijkt_javascript_shell(html):
                return _web_error(
                    final_url,
                    STATUS_NIET_PUBLIEK,
                    "Pagina laadt haar inhoud met JavaScript; anoniem opvragen geeft een lege shell",
                    content_type,
                )
            return _web_error(final_url, STATUS_FOUT, "Geen leesbare tekst gevonden", content_type)
        return WebResult(
            status=STATUS_OK,
            final_url=final_url,
            title=page.title,
            description=page.description,
            text=page.text,
            truncated=page.truncated,
            content_type=content_type or "text/html",
        )


def _web_error(url: str, status: str, error: str, content_type: str = "") -> WebResult:
    return WebResult(
        status=status,
        final_url=url,
        title="",
        description="",
        text="",
        truncated=False,
        content_type=content_type,
        error=error,
    )


# --------------------------------------------------------------------------- docs


@dataclass(frozen=True)
class DocsResult:
    status: str
    title: str = ""
    text: str = ""
    error: str = ""


class DocsClient:
    """Haalt verslagen uit Docs op als Markdown.

    Docs kent geen personal access token; authenticatie gaat met dezelfde
    sessiecookie die de frontend gebruikt. Die is twaalf uur geldig, dus een
    401 betekent hier bijna altijd 'verlopen' en niet 'geen rechten'.
    """

    def __init__(self, base_url: str, session_cookie: str, *, timeout: float = DEFAULT_TIMEOUT) -> None:
        self._base = base_url.rstrip("/")
        self._client = httpx.Client(
            timeout=timeout,
            follow_redirects=False,
            headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
            cookies={"docs_sessionid": session_cookie},
        )

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> DocsClient:
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    def fetch(self, uuid: str) -> DocsResult:
        path = f"/api/v1.0/documents/{uuid}/formatted-content/"
        log.debug("Docs-verslag ophalen: %s", uuid)
        try:
            response = self._client.get(f"{self._base}{path}", params={"content_format": "markdown"})
        except httpx.HTTPError as e:
            return DocsResult(status=STATUS_FOUT, error=f"{type(e).__name__}: {e}")

        if response.status_code in (401, 403):
            return DocsResult(
                status=STATUS_GEEN_TOEGANG,
                error=f"HTTP {response.status_code}: sessiecookie ontbreekt of is verlopen",
            )
        if response.status_code == 404:
            return DocsResult(status=STATUS_NIET_GEVONDEN, error="Document niet gevonden")
        if response.status_code >= 400:
            return DocsResult(status=STATUS_FOUT, error=f"HTTP {response.status_code}")

        try:
            data = response.json()
        except ValueError:
            return DocsResult(status=STATUS_FOUT, error="Antwoord is geen JSON")
        return DocsResult(
            status=STATUS_OK,
            title=(data.get("title") or "").strip(),
            text=(data.get("content") or "").strip(),
        )


# --------------------------------------------------------------------------- collector


def _first_line(message: str, limit: int = 80) -> str:
    for line in message.splitlines():
        line = line.strip()
        if line:
            return line[:limit] + ("…" if len(line) > limit else "")
    return ""


class ReferenceCollector:
    """Verzamelt verwijzingen uit berichten en ontdubbelt ze over het hele rapport.

    Mattermost-verwijzingen worden ontdubbeld op thread-root: vijf permalinks naar
    posts in dezelfde thread leveren één referentie op.
    """

    def __init__(
        self,
        *,
        client,
        server: str,
        build_post,
        fetcher: WebFetcher | None = None,
        known_post_ids=frozenset(),
        docs_client=None,
        docs_url: str = "",
    ) -> None:
        self._client = client
        self._server = server
        self._build_post = build_post
        self._fetcher = fetcher
        self._docs_client = docs_client
        self._docs_url = docs_url
        self._known: set[str] = set(known_post_ids)
        self._refs: list[Reference] = []
        self._by_url: dict[str, Reference | None] = {}
        self._by_root: dict[str, Reference] = {}
        self.pdf_urls: list[str] = []
        self.skipped_external = 0
        self.overgeslagen_docs = 0

    @property
    def references(self) -> list[Reference]:
        return list(self._refs)

    def collect_from(self, message: str) -> list[str]:
        """Los alle verwijzingen in een bericht op; geeft de ref-id's terug."""
        ids: list[str] = []
        for url in extract_urls(message):
            ref = self._resolve(url)
            if ref is not None and ref.id not in ids:
                ids.append(ref.id)
        return ids

    def _resolve(self, url: str) -> Reference | None:
        key = normalize_url(url)
        if key in self._by_url:
            return self._by_url[key]
        post_id = parse_permalink(url, self._server)
        docs_uuid = parse_docs_uuid(url, self._docs_url)
        if docs_uuid and self._docs_client is None:
            # Tellen zodat de caller kan melden wat er is blijven liggen.
            self.overgeslagen_docs += 1
            docs_uuid = None
        # Web: de genormaliseerde URL ophalen, zodat we opvragen wat we ontdubbelen.
        if post_id:
            ref = self._resolve_mattermost(url, post_id)
        elif docs_uuid:
            ref = self._resolve_docs(url, docs_uuid)
        else:
            ref = self._resolve_web(key)
        self._by_url[key] = ref
        return ref

    def _add(self, ref: Reference) -> Reference:
        ref.id = f"ref_{len(self._refs) + 1}"
        self._refs.append(ref)
        return ref

    # ------------------------------------------------------------------ mattermost

    def _resolve_mattermost(self, url: str, post_id: str) -> Reference | None:
        if post_id in self._known:
            return None
        try:
            raw = self._client.get_post(post_id)
        except AuthError as e:
            return self._add(_mm_ref(url, STATUS_GEEN_TOEGANG, str(e)))
        except MattermostError as e:
            status = STATUS_NIET_GEVONDEN if "404" in str(e) else STATUS_FOUT
            return self._add(_mm_ref(url, status, str(e)))

        root_id = raw.root_id or raw.id
        if root_id in self._by_root:
            return self._by_root[root_id]
        if root_id in self._known:
            return None

        try:
            thread = self._client.get_thread(root_id)
            channel = self._client.get_channel_name(raw.channel_id)
        except AuthError as e:
            return self._add(_mm_ref(url, STATUS_GEEN_TOEGANG, str(e)))
        except MattermostError as e:
            return self._add(_mm_ref(url, STATUS_FOUT, str(e)))

        thread = [p for p in thread if p.delete_at == 0 and not p.type]
        thread.sort(key=lambda p: p.create_at)
        if not thread:
            return self._add(_mm_ref(url, STATUS_NIET_GEVONDEN, "Thread leeg of verwijderd"))

        ref = self._add(
            Reference(
                id="",
                kind="mattermost",
                url=url,
                status=STATUS_OK,
                title=_first_line(thread[0].message),
                channel=channel,
                posts=[self._build_post(p) for p in thread],
            )
        )
        self._by_root[root_id] = ref
        return ref

    # ------------------------------------------------------------------------ docs

    def _resolve_docs(self, url: str, uuid: str) -> Reference | None:
        """Een verslag komt volledig binnen: anders dan bij een webpagina staan
        de conclusies en acties juist onderaan, en die wil je niet afkappen."""
        result = self._docs_client.fetch(uuid)
        tekst = result.text.strip() if result.status == STATUS_OK else ""
        # Een overzichtsmap in Docs is een document zonder inhoud. Dat is geen
        # storing, dus geef het een eigen status in plaats van een lege 'ok'.
        status = STATUS_LEEG if result.status == STATUS_OK and not tekst else result.status
        note = result.error or None
        if status == STATUS_LEEG:
            note = "Document zonder inhoud, waarschijnlijk een overzichtsmap"
        return self._add(
            Reference(
                id="",
                kind="docs",
                url=url,
                status=status,
                title=result.title or None,
                site=urlsplit(url).netloc or None,
                text=tekst,
                truncated=False,
                note=note,
            )
        )

    # ------------------------------------------------------------------------- web

    def _resolve_web(self, url: str) -> Reference | None:
        if self._fetcher is None:
            self.skipped_external += 1
            return None
        result = self._fetcher.fetch(url)
        if result.status == STATUS_PDF:
            self.pdf_urls.append(url)
        is_ok = result.status == STATUS_OK
        return self._add(
            Reference(
                id="",
                kind="web",
                url=url,
                status=result.status,
                title=result.title or None,
                site=urlsplit(result.final_url or url).netloc or None,
                description=result.description or None,
                content_type=result.content_type or None,
                text=result.text if is_ok else "",
                truncated=result.truncated if is_ok else False,
                note=result.error or None,
            )
        )


def _mm_ref(url: str, status: str, note: str) -> Reference:
    return Reference(id="", kind="mattermost", url=url, status=status, note=note)
