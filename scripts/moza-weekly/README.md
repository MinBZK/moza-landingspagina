# MOZa Weekly — Mattermost-input

Drie-staps Python-pipeline die input verzamelt voor de wekelijkse MOZa Weekly-publicatie.

1. **`fetch.py`** haalt berichten en threads op uit Mattermost-kanalen (default: `check-in`, `agenda`, `sprint-faq`), volgt de verwijzingen in die berichten (permalinks naar andere threads, publieke webpagina's) en schrijft een gestructureerd YAML-bestand.
2. **`anonymize.py`** schrijft een geanonimiseerde JSON-variant van die YAML — bedoeld als veilige LLM-input voor de MOZa Weekly skill.
3. **`render.py`** rendert het YAML-bestand naar een single-file HTML-rapport in de nldd-stijl (voor menselijke lezers).

| Output | Bestemming | Bevat namen / mentions? |
|---|---|---|
| `.yaml` | Editor (mens) | ✅ ja |
| `.html` | Lezer (mens) | ✅ ja |
| `.anonymized.json` | LLM / MOZa Weekly skill | ❌ pseudoniemen + mentions/namen geschrubd |

## Vereisten

- [uv](https://docs.astral.sh/uv/) — bewaakt automatisch de omgeving.
- Een Mattermost personal access token met leesrechten op de gewenste kanalen.

De dependencies staan in `pyproject.toml` in deze map, vastgezet in `uv.lock`. Je hoeft niets te installeren: `uv run --project scripts/moza-weekly …` maakt de omgeving aan en houdt hem bij. De `just`-commando's hieronder doen dat al voor je.

Dependabot bewaakt dit `pyproject.toml` via het `uv`-ecosysteem. Voeg een dependency daarom toe met `uv add --project scripts/moza-weekly <pakket>` en commit de bijgewerkte `uv.lock` mee, zodat de bewaking en de werkelijkheid gelijk blijven.

## Setup token

Genereer een **personal access token** in Mattermost:
**Account Settings → Security → Personal Access Tokens → Create New Token.**

Twee patterns om de token in te zetten — kies één:

### A. 1Password CLI

Sla de token op in 1Password (bv. item "MOZa Mattermost", veld `token`).

Kopieer `.env.example` naar `.env` en zet erin:
```
MATTERMOST_TOKEN=op://Private/MOZa Mattermost/token
```

Roep dan aan via `op run`:
```bash
op run --env-file=.env -- just moza-weekly
```

### B. Directe waarde in `.env`

Kopieer `.env.example` naar `.env` en zet erin:
```
MATTERMOST_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

`.env` staat in `.gitignore` — niet committen. Roep dan direct aan:
```bash
just moza-weekly
```

> **Tip:** `chmod 600 .env` voorkomt dat andere users op de machine het bestand lezen.

## Gebruik

### Eén commando: fetch + anonymize + render

```bash
just moza-weekly
```

Output landt in `tmp/moza-weekly/<vandaag>.yaml`, `.anonymized.json` én `.html`. Verkort schema:

| Default | Wat |
|---|---|
| Periode | Vandaag - 6 dagen t/m vandaag (7 kalenderdagen) |
| Kanalen | uit `MOZA_WEEKLY_CHANNELS` env (of CLI `--channel`) |
| Output | `tmp/moza-weekly/<einde-datum>.{yaml,html}` |

### Periode overschrijven

```bash
# Alleen --from; --to blijft default (vandaag)
just moza-weekly --from 2026-05-13

# Beide
just moza-weekly --from 2026-05-13 --to 2026-05-20
```

### Specifieke kanalen

```bash
just moza-weekly --channel check-in
just moza-weekly --channel check-in --channel agenda --channel werkdomein
```

### Bestaand outputbestand overschrijven

```bash
just moza-weekly --force
```

### Alleen HTML opnieuw renderen

Handig wanneer je in de YAML handmatig posts hebt geschrapt of geredigeerd:

```bash
just moza-weekly-render tmp/moza-weekly/2026-05-27.yaml
```

### Alleen geanonimiseerde JSON regenereren

Idem, wanneer je YAML hebt bijgewerkt en de JSON moet bijwerken:

```bash
just moza-weekly-anonymize tmp/moza-weekly/2026-05-27.yaml
```

### Bots uitsluiten

```bash
just moza-weekly --no-bots
```

### Verwijzingen niet volgen

```bash
just moza-weekly --no-external      # alleen Mattermost-verwijzingen volgen
just moza-weekly --no-references    # helemaal geen verwijzingen volgen
```

### Verbose / quiet

```bash
just moza-weekly --verbose   # toont elke HTTP-call en retry
just moza-weekly --quiet     # alleen errors
```

## Workflow voor een MOZa Weekly

1. **Verzamel**: `just moza-weekly` — drie bestanden ontstaan in `tmp/moza-weekly/`.
2. **Open YAML** in editor: `tmp/moza-weekly/<datum>.yaml`. Schrap posts die niet relevant zijn, herorden indien gewenst.
3. **Bekijk HTML**: `tmp/moza-weekly/<datum>.html` open in browser. Klik door tabs, controleer context-banners.
4. **Regenereer na YAML-edits**:
   ```bash
   just moza-weekly-render tmp/moza-weekly/<datum>.yaml
   just moza-weekly-anonymize tmp/moza-weekly/<datum>.yaml
   ```
5. **MOZa Weekly skill aanroepen** met `tmp/moza-weekly/<datum>.anonymized.json` als input. Geen namen of mentions in die file.
6. **Editor leest mee**: gebruik desgewenst het HTML-rapport of de volledige YAML om de gegenereerde concept-MOZa-Weekly te corrigeren.
7. **Schrijf MOZa Weekly markdown**: definitief opslaan in `content/weekly/<jaar>/<datum>.md`.

## Anonimisering

De `anonymized.json` wijkt op deze punten af van de YAML:

- **Authors** → vervangen door pseudoniemen `person_1`, `person_2`, ... (en `bot_1` voor bots). De mapping is stabiel binnen één run (dezelfde persoon krijgt dezelfde ID in zowel root als replies), maar verandert tussen runs.
- **`@mentions`** in message-bodies → `[@collega]`.
- **Bekende namen** → `[collega]`. De namenlijst komt uit drie bronnen: de auteurs van deze periode, **alle leden van het Mattermost-team** (die haalt `fetch.py` op en zet hij in `meta.redact_names`), en `MOZA_WEEKLY_EXTRA_NAMES` uit `.env` voor externe contactpersonen. Van een naam wordt zowel de volledige vorm als elk naamdeel van ≥ 4 letters vervangen; een handmatig opgegeven losse voornaam mag ook korter zijn, zodat "Luc" en "Leo" er ook uit gaan.
- **Bot-flag** blijft bewaard (`is_bot: true/false`).
- **Permalinks, timestamps, scope-flags, attachments** blijven onveranderd — die identificeren posts, niet personen.
- **Verwijzingen** gaan door dezelfde molen: auteurs van opgehaalde Mattermost-berichten krijgen een pseudoniem uit dezelfde mapping, en titel, description en opgehaalde webtekst worden op mentions en bekende namen geschrubd.

- **Een achternaam pal naast een geschrubde voornaam** gaat mee. Zonder die regel leverde "Truus Bakker" nog "[collega] Bakker" op: even herleidbaar als daarvoor, maar met de schijn van anonimiteit. Alleen een direct volgend hoofdletterwoord zonder leesteken ertussen, zodat "[collega] van Logius" blijft staan.

**Bewuste beperking**: een naam die in geen van de bronnen voorkomt blijft staan. Gebruik daarom `just moza-weekly-namencheck` om te zien wat er is blijven liggen.

Ter illustratie, gemeten over de periode 30 juli t/m 2 september 2026: zonder deze uitbreiding stonden er 62 losse voornamen in de berichten en 10 in de opgehaalde verwijzingen. De teamledenlijst bracht dat naar 42 en 5; met de externe namen erbij naar 0. Een onafhankelijke steekproef op woorden die na een aanloop als "gesproken met" staan, vond daarna nog één gemiste naam.

Wat we bewust **niet** schrubben: organisaties en teams (Logius, Maykin, Lovelace) en persona-namen uit gebruikersonderzoek, want die horen juist in de weekly thuis.

### Controleren wat er is blijven liggen

```bash
just moza-weekly-namencheck tmp/moza-weekly/<datum>.anonymized.json
```

Dit haalt eenmalig een Nederlands NER-model binnen (ruim 500 MB, in de aparte `ner`-groep, dus buiten de gewone pipeline en buiten CI) en rapporteert wie er ná anonimisering nog als persoon wordt herkend. Het **vervangt niets**; jij beslist wat er in het extra-namenbestand hoort.

Twee detectoren, omdat ze verschillende dingen missen:

- **Het NER-model** kijkt naar context, dus het weet dat "Jan" in een zin een naam is. Op onze eigen input wees het echter ook MOZa, Claude en Lovelace aan als personen; als automatische redactor zou het de tekst slopen. Vandaar dat het alleen rapporteert, met een filter op bekend jargon in `GEEN_PERSOON`.
- **Deelnemerslijstjes** in de vorm `Naam (Organisatie)` worden apart herkend. Juist daar faalt het NER-model: het mist een naam in een opsomming als "Pietje (ADR)" volledig, terwijl dat patroon glashelder is.

## Verwijzingen volgen

Berichten verwijzen regelmatig naar context die buiten de opgehaalde kanalen ligt: een gespreksverslag elders in Mattermost, of een externe pagina. `fetch.py` haalt die context erbij en zet hem in een top-level `references:`-blok. Posts verwijzen ernaar met `references: [ref_1, ref_3]`.

**Mattermost-permalinks** (`…/<team>/pl/<post-id>`) leveren het bericht plus de volledige thread op. Ontdubbeling gebeurt op thread-root: vijf links naar dezelfde thread geven één referentie. Een permalink naar een post die al in het rapport staat wordt overgeslagen: die inhoud hebben we al. Kanaallinks worden genegeerd.

**Externe links** worden anoniem opgehaald: geen token, geen cookies, eigen user-agent, 15 seconden timeout, maximaal 5 redirects en 2 MB. Omdat de URL's uit berichten van anderen komen, controleert het script vóór elk verzoek of de hostnaam naar een publiek internetadres wijst; `localhost`, private ranges en link-local adressen (zoals het cloud-metadata-endpoint) worden geweigerd. Redirects volgt het script zelf, zodat elke hop opnieuw langs die controle gaat. Van een publieke pagina bewaren we titel, meta-description en de hoofdtekst (`<main>`/`<article>`, anders `<body>`, met nav/header/footer/script/style eruit), afgekapt op 4.000 tekens. Ontdubbeling gebeurt op de genormaliseerde URL: fragment en trackingparameters (`utm_*`, `telem_*`) eraf.

Verwijzingen worden één niveau diep gevolgd: verwijzingen bínnen een opgehaalde thread of pagina volgen we niet.

**Van `github.com` bewaren we alleen titel en description** (`SAMENVATTING_HOSTS` in `_references.py`). Een PR- of issue-pagina levert duizenden tekens navigatie en diff-gepraat op, terwijl titel en `og:description` samen al zeggen waar het over gaat. In een proefrun over vijf weken was 75 van de 116 verwijzingen een GitHub-link; zonder deze regel bestond de LLM-input voor 80% uit opgehaalde pagina's in plaats van uit de berichten zelf.

De handle in zo'n GitHub-titel (`… by jjansen · Pull Request #240 …`) wordt in `anonymize.py` vervangen door `[collega]`. Die staat namelijk niet in de auteur-set, dus geen enkele naamregel vangt hem, en een weekly hoort geen namen te bevatten.

**Pagina's die hun inhoud met JavaScript laden** (zoals de Docs-applicatie op `docs.rijksapp.nl`) geven anoniem een lege shell terug. Die krijgen `niet_publiek` met die reden erbij, niet `fout`: er is niets stuk, de inhoud komt simpelweg niet zonder browser en meestal ook niet zonder inlog. Zulke verslagen moet je zelf openen.

| `status` | Betekenis | Inhoud opgeslagen? |
|---|---|---|
| `ok` | Opgehaald | ✅ |
| `niet_publiek` | 401/403, loginpad in de URL, of een wachtwoordveld op de pagina | ❌ alleen de URL |
| `geen_toegang` | Je token mag die Mattermost-thread niet lezen | ❌ |
| `niet_gevonden` | Post of thread bestaat niet (meer) | ❌ |
| `pdf_niet_ondersteund` | PDF, tekstextractie is bewust niet gebouwd | ❌ |
| `leeg` | Document zonder inhoud, meestal een overzichtsmap in Docs | ❌ |
| `geblokkeerd` | De URL wijst niet naar een publiek internetadres | ❌ |
| `overgeslagen` | Ander content-type dan HTML of platte tekst | ❌ |
| `fout` | Netwerkfout, HTTP-fout of geen leesbare tekst | ❌ |

Alles wat niet `ok` is, logt `fetch.py` als waarschuwing. PDF's krijgen een aparte melding met de volledige lijst URL's, zodat we kunnen heroverwegen of PDF-extractie de moeite waard wordt.

## Hoe threading werkt

Berichten in Mattermost kunnen in threads zitten. Het script hanteert deze regels (zie ook design-spec):

| Situatie | Wat we ophalen | Hoe het in YAML staat |
|---|---|---|
| Root **én** replies binnen periode | Alles | `in_scope: true` voor allemaal |
| Root binnen, sommige replies buiten | Alles | Late reply `in_scope: false`, root gewoon |
| Root **buiten** periode, reply binnen | Root + replies | Root `context_only: true` + `in_scope: false`; reply `in_scope: true` |

In het HTML-rapport wordt een buiten-periode root visueel gedimd met een banner "Buiten periode — context", zodat duidelijk is dat die niet hoort in de MOZa Weekly maar er staat voor context.

## Exit-codes

| Code | Betekenis |
|---|---|
| 0 | Volledig succes |
| 2 | Configuratie-fout (token mist, ongeldige args) |
| 3 | Auth-fout (401/403) |
| 4 | Team niet gevonden |
| 5 | Eén+ kanaal faalde, andere wel succesvol |
| 6 | Netwerk- of server-fout na retries |
| 7 | Output-bestand bestaat al, `--force` ontbreekt |
| 8 | YAML-input parse- of schema-fout (alleen `render.py`) |

## Troubleshooting

**`MATTERMOST_TOKEN ontbreekt`** — `.env` staat niet in cwd of token-regel mist. Run `cat .env` om te checken; let op trailing whitespace en quotes.

**`401 Unauthorized`** — token verlopen of ingetrokken. Vernieuw via Mattermost-UI.

**`403 Forbidden op …`** — je account heeft geen leesrechten op dat kanaal. Vraag toegang, of haal kanaal uit `MOZA_WEEKLY_CHANNELS`.

**`Team 'mijnoverheid-zakelijk' niet gevonden`** — andere team-slug? Check de URL in Mattermost (`/<team>/channels/...`).

**`Kanaal '...' niet gevonden`** — kanaal hernoemd of niet bestaand. Andere kanalen worden alsnog opgehaald — exit-code is 5.

**Verbose-mode toont URLs maar geen content** — `--verbose` log alleen paden, geen request-bodies of headers (vanwege token).

**HTML toont posts niet, alleen lege tab** — geen posts in periode voor dat kanaal? Check YAML; daar staat `note: "Geen posts binnen periode."` als het kanaal echt leeg was.

## Bestandslayout

```
scripts/moza-weekly/
├── fetch.py              # CLI-script, stap 1 (Mattermost → YAML)
├── anonymize.py          # CLI-script, stap 2 (YAML → anonymized JSON)
├── render.py             # CLI-script, stap 3 (YAML → HTML)
├── namencheck.py         # los hulpmiddel: welke namen bleven staan?
├── _mattermost.py        # API-client (intern)
├── _references.py        # verwijzingen volgen: permalinks + webpagina's (intern)
├── _model.py             # dataclasses (intern)
├── pyproject.toml        # dependencies (bewaakt door Dependabot)
├── uv.lock               # vastgezette versies
├── templates/
│   ├── report.html.j2    # hoofdtemplate
│   └── _rijkslogo.svg    # inline-include
└── README.md             # dit bestand

tmp/moza-weekly/          # gitignored output
└── <datum>.{yaml,anonymized.json,html}
```

## Verder

Het design-document staat in `status-rapportage/docs/superpowers/specs/2026-05-27-moza-weekly-mattermost-input-design.md`.

Tests komen in een vervolg-iteratie nadat schema en HTML-layout op echte data zijn gevalideerd.
