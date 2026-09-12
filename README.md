# MijnOverheid Zakelijk Site

In deze repository beheren we de website en content van [mijnoverheidzakelijk.nl](https://mijnoverheidzakelijk.nl).
De site wordt gegenereerd met [Hugo](https://gohugo.io/).

## Lokaal ontwikkelen

### Vereisten 

Installeer Hugo, just, Node.js en uv:

```bash
# macOS
brew install hugo just node uv
```

Of volg de installatie-instructies voor [Hugo](https://gohugo.io/installation/), [just](https://just.systems/man/en/), [Node.js](https://nodejs.org/) en [uv](https://docs.astral.sh/uv/). `uv` is nodig voor de Python-scripts die Mattermost-input voor de Weekly ophalen.

Installeer daarna de Node dependencies (eenmalig):

```bash
npm install
```

### Development server starten

```bash
just up
```

Dit rendert eerst de Mermaid-diagrammen als SVG en start daarna de Hugo development server. De site is dan beschikbaar op [http://localhost:1313/](http://localhost:1313/) (of de host zoals vermeld in de terminal).

Wil je dat diagrammen automatisch opnieuw worden gemaakt bij wijzigingen? Start dan in een aparte terminal:

```bash
just watch-mermaid
```

## Content toevoegen

### Weekly

Voeg een nieuwe weekly toe met:

```bash
hugo new content weekly/2026/2026-01-01.md
```

Of door een bestand in de juiste `content > weekly > jjjj` map te plaatsen.

Voor het ophalen van Mattermost-input als basis voor een Weekly, zie [`scripts/moza-weekly/README.md`](scripts/moza-weekly/README.md).

### Presentatie

Presentaties gebruiken [Reveal.js](https://revealjs.com/) en wijken daarmee af van de overige pagina's.

Maak een nieuwe presentatie:

```bash
hugo new content presentaties/moza-pulse-x
```

#### Slide syntax

Elke slide is een `<section>` element:

```html
<section>
  <h2>Slide titel</h2>
  <p>Inhoud van de slide</p>
</section>
```

Geneste sections maken verticale slides (navigeer met pijltje omlaag). Zie [Reveal.js](https://revealjs.com/) voor meer informatie.

### Diagrammen

Gebruik een `mermaid` codeblock in Markdown voor diagrammen. Voeg altijd een `accTitle` en `accDescr` toe voor toegankelijkheid en als bestandsnaam voor de pre-gerenderde SVG:

````markdown
```mermaid
graph LR
    accTitle: Mijn diagram
    accDescr: Beschrijving van het diagram voor screenreaders.
    A[Start] --> B[Einde]
```
````

Diagrammen worden vooraf gerenderd als SVG (light + dark variant) door `scripts/render-mermaid.js`. De kleuren volgen automatisch het lichte of donkere thema via design tokens. Eigen kleuren in een diagram (bijvoorbeeld in `classDef`) schrijf je daarom als `var(--color-text)` in plaats van een hexcode; het renderscript vult per variant de juiste waarde in. Als de SVGs ontbreken, faalt de Hugo build met een foutmelding.

Render de SVGs opnieuw na het wijzigen van een diagram:

```bash
just render-mermaid
```

Zie [Mermaid](https://mermaid.js.org/) voor de volledige syntax.

### Kleuren

Kleuren, iconen, de favicon en het touch-icon komen uit het [NLDD Design System](https://github.com/MinBZK/storybook), uit het npm-pakket `@nldd/design-system`. De gegenereerde bestanden staan in git; na een upgrade van het pakket schrijf je ze opnieuw weg:

```bash
just nldd
```

`npm test` bewaakt dat die bestanden bij het geïnstalleerde pakket passen. De bestandstype-iconen voor ODT en PDF blijven handgemaakt, NLDD heeft die niet.

## Code kwaliteit

We gebruiken [Lefthook](https://github.com/evilmartians/lefthook) voor pre-commit checks. Dit controleert automatisch of de site correct bouwt en of er geen broken links zijn.

### Installatie

```bash
# macOS
brew install lefthook htmltest

# Activeer hooks in dit project
lefthook install
```

### Handmatig uitvoeren

```bash
just pre-commit
```

Of direct met Lefthook:

```bash
lefthook run pre-commit
```

## Bouwen

### Lokaal bouwen

```bash
just build
```

Dit rendert eerst de Mermaid-diagrammen als SVG en bouwt daarna de site met Hugo.

De gegenereerde site staat in de `public/` directory.

### Container bouwen

Voor development (image wordt getagd met branch naam):

```bash
just cbuild   # Bouw container
just crun     # Start op localhost:8080
just cstop    # Stop container
just cclean   # Verwijder image en cache
```

Voor productie met specifieke baseURL:

```bash
podman build --build-arg BASE_URL=https://mijnoverheidzakelijk.nl -t moza-site .
podman run -p 8080:8080 moza-site
```

De site is dan beschikbaar op [http://localhost:8080/](http://localhost:8080/).

## Projectstructuur

```
.
├── archetypes/          # Archetype templates voor nieuwe content
├── assets/              # CSS, JavaScript en image bestanden (worden o.a. geminimaliseerd door Hugo)
├── content/             # Markdown en HTML content
│   ├── onderwerpen/     # Onderwerpen pagina's
│   ├── presentaties/    # Reveal.js presentaties
│   └── weekly/          # Weekly updates
├── layouts/             # Templates voor pagina's en componenten
│   ├── _partials/       # Herbruikbare template onderdelen
│   └── _shortcodes/     # Shortcodes, ofwel componenten, voor in content
├── scripts/             # Build scripts (Mermaid SVG rendering)
├── static/              # Statische bestanden (worden 1-op-1 gekopieerd)
├── .claude/             # Claude Code configuratie
├── .github/             # GitHub Actions workflows
├── hugo.yaml            # Hugo configuratie
├── justfile             # Command runner (just up, just build, etc.)
└── README.md            # Deze documentatie
```

## Credits

- Kleuren, font en iconen: [NLDD Design System](https://github.com/MinBZK/storybook) (EUPL-1.2 licentie)
- Font: RijksSans is auteursrechtelijk beschermd door de Staat der Nederlanden en valt niet onder de licentie van deze repository. Het is uitsluitend bestemd voor publicaties van de Rijksoverheid of voor werk in opdracht van de Rijksoverheid; zie de [gebruiksvoorwaarden typografie](https://www.rijkshuisstijl.nl/basiselementen/typografie/gebruiksvoorwaarden-typografie). RijksSans komt uit het NLDD-pakket, zie daar [NOTICES.md](https://github.com/MinBZK/storybook/blob/main/NOTICES.md).
- Diagrammen: [Mermaid](https://mermaid.js.org/) (MIT licentie)
- Zoeken: [Fuse.js](https://www.fusejs.io/) (Apache 2.0 licentie)
