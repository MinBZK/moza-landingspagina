# MijnOverheid Zakelijk Site

Hugo static site (v0.162.1) | Nederlands | Rijkshuisstijl

## Structuur

```
content/               # Markdown content
content/presentaties/  # Reveal.js (HTML page bundles)
layouts/               # Go templates
layouts/_partials/     # Partials (underscore prefix)
layouts/_shortcodes/   # Shortcodes
assets/css/            # CSS, tokens in tokens.css
assets/vendor/         # Vendored JS (Fuse.js, Reveal.js)
scripts/               # Build scripts (render-mermaid.js)
static/images/render/  # Pre-gerenderde Mermaid SVGs (gegenereerd, in .gitignore)
hugo.yaml              # Configuratie
justfile               # Commands: just up, just build, just checks
```

## Commando's

```bash
just setup              # Node dependencies installeren (eenmalig, voor Mermaid rendering)
just up                 # Render SVGs + dev server
just build              # Render SVGs + build
just test               # Tests uitvoeren
just render-mermaid     # Alleen SVGs renderen
just watch-mermaid      # SVGs herrenderen bij wijzigingen (aparte terminal)
just checks             # Alle controles op één build (tests, csp, a11y, links)
just links              # Alleen de linkcontrole
just a11y               # Toegankelijkheidstoets (WCAG 2.1 AA) op de gebouwde site
just csp                # Controleer op door de CSP geblokkeerde constructies
just clean              # Verwijder gegenereerde bestanden
just pre-commit         # Pre-commit checks
```

## Mermaid-diagrammen

Diagrammen in Markdown worden vooraf gerenderd als SVG (light + dark) door `scripts/render-mermaid.js`. De render hook (`layouts/_markup/render-codeblock-mermaid.html`) toont de pre-gerenderde SVGs als `<img>`. Als de SVGs ontbreken, faalt de Hugo build.

Elk mermaid-blok moet een `accTitle` hebben voor de bestandsnaam en toegankelijkheid. Zonder `accTitle` wordt een fallback `diagram-N` gebruikt.

Ook `accDescr` is verplicht: die vult het `alt`-attribuut. Zonder `accDescr` krijgt het diagram een lege alt-tekst en faalt `just a11y`.

Kleuren in een diagram (bijvoorbeeld in `classDef`) nooit hardcoden: gebruik `var(--token)` uit `tokens.css`, zoals `color:var(--color-text)`. Het renderscript vult per variant de light- of dark-waarde in.

## Kleuren

Kleurtokens in `assets/css/tokens.css` verwijzen naar NLDD-primitives in het gegenereerde `assets/css/nldd-primitives.css` (`just nldd-tokens`, opnieuw draaien na een upgrade van `@nldd/design-system`). Lees het commentaar bovenin `tokens.css` voordat je een token toevoegt. De iconen in `static/images/icons/` komen uit dezelfde bron via `just nldd-iconen` (mapping in `scripts/nldd-iconen.js`); in diagrammen gebruik je `nldd:<naam>`.

## Skills

Workflow: `/check`, `/new-weekly`, `/new-presentatie`
Review: `/content-review`, `/a11y-review`, `/seo-check`
Hulp: `/hugo`

## Rules

Zie `.claude/rules/` voor:
- `taal-en-stijl.md` - Nederlands, B1, Rijkshuisstijl
- `code-conventies.md` - Hugo templates, CSS, content
- `documentatie.md` - Hugo en Reveal.js docs
- `git.md` - Commit conventies
- `browser-testing.md` - Playwright MCP voor browser tests
