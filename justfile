# Image naam en tag op basis van git branch
image := "moza-site:" + `git branch --show-current`

[private]
default:
    @just --list

# Installeer dependencies (eenmalig)
setup:
    npm install

# Voer tests uit
test:
    npm test

# Render Mermaid-diagrammen als SVG
render-mermaid:
    npm run render-mermaid

# Start development server
up:
    npm run render-mermaid
    hugo server

# Watch mermaid-bestanden en herrender bij wijzigingen (apart terminal)
watch-mermaid:
    npm run render-mermaid -- --watch

# Bouw de site
build:
    npm run render-mermaid
    rm -rf public && hugo --minify --gc --logLevel warn
    npm run render-downloads

# Genereer alleen de downloadbestanden (.odt en .pdf), vereist een bestaande build
render-downloads:
    npm run render-downloads

# Controleer of het toegankelijkheidslabel bij de bron is gewijzigd
check-label:
    npm run check-label

# Draai alle controles op één build, oplopend in kosten
checks: build-check
    npm test
    npm run csp
    npm run a11y
    htmltest
    rm -rf tmp/public

# Controleer op broken links
links: build-check
    htmltest
    rm -rf tmp/public

# Toets toegankelijkheid (WCAG 2.1 AA) op de gebouwde site
a11y: build-check
    npm run a11y
    rm -rf tmp/public

# Controleer op constructies die de Content-Security-Policy blokkeert
csp: build-check
    npm run csp
    rm -rf tmp/public

# Toets de gegenereerde PDF's tegen PDF/UA (vereist: brew install verapdf)
pdfua: build-check
    npm run render-downloads -- tmp/public
    npm run pdfua -- tmp/public
    rm -rf tmp/public

# Bouw de site naar tmp/public, waarop links, a11y en csp draaien
[private]
build-check:
    npm run render-mermaid
    rm -rf tmp/public && hugo --minify --quiet --baseURL / --destination tmp/public

# Voer pre-commit checks uit
pre-commit:
    lefthook run pre-commit

# Verwijder gegenereerde bestanden
clean:
    rm -rf public static/images/render .cache tmp/public

# Haal Mattermost-input op voor MOZa Weekly, schrijf geanonimiseerde JSON voor
# LLM-input, en render HTML-rapport. Vereist MATTERMOST_TOKEN in env;
# zie scripts/moza-weekly/README.md.
moza-weekly *FLAGS:
    #!/usr/bin/env bash
    set -euo pipefail
    uv run --project scripts/moza-weekly scripts/moza-weekly/fetch.py {{FLAGS}}
    YAML=tmp/moza-weekly/$(date +%Y-%m-%d).yaml
    uv run --project scripts/moza-weekly scripts/moza-weekly/anonymize.py "$YAML"
    uv run --project scripts/moza-weekly scripts/moza-weekly/render.py "$YAML"

# Alleen HTML opnieuw renderen (na handmatige YAML-bewerking)
moza-weekly-render YAML:
    uv run --project scripts/moza-weekly scripts/moza-weekly/render.py {{YAML}}

# Alleen geanonimiseerde JSON regenereren (na handmatige YAML-bewerking)
moza-weekly-anonymize YAML:
    uv run --project scripts/moza-weekly scripts/moza-weekly/anonymize.py {{YAML}}

# Zoek namen die de anonimisering heeft gemist. Rapporteert alleen; haalt
# eenmalig een NER-model van ruim 500 MB binnen.
moza-weekly-namencheck JSON:
    uv run --project scripts/moza-weekly --group ner \
        scripts/moza-weekly/namencheck.py {{JSON}}

# Draai de unit-tests van de moza-weekly-scripts
moza-weekly-test:
    uv run --project scripts/moza-weekly pytest scripts/moza-weekly/tests/ -q

# Bouw container image
cbuild:
    podman build -t {{image}} -f container/Containerfile .

# Start container op localhost:8080
crun:
    podman run --rm --replace --name moza-site -p 8080:8080 {{image}}

# Stop container
cstop:
    podman stop moza-site
    podman rm moza-site

# Verwijder container image en build cache
cclean:
    podman rm -f moza-site || true
    podman rmi {{image}} || true
    podman system prune -f
