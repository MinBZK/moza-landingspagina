# Documentatie

Raadpleeg bij twijfel altijd de officiële documentatie.

## Hugo

- **Documentatie**: https://gohugo.io/documentation/
- **Templates**: https://gohugo.io/templates/
- **Functies**: https://gohugo.io/functions/
- **Nieuwe template structuur**: https://gohugo.io/templates/new-templatesystem-overview/

Dit project gebruikt Hugo v0.162.1+ met de nieuwe template structuur.

## Reveal.js

- **Documentatie**: https://revealjs.com/
- **Markup**: https://revealjs.com/markup/
- **Configuratie**: https://revealjs.com/config/

Presentaties staan in `content/presentaties/` als HTML page bundles.

## Mermaid

- **Documentatie**: https://mermaid.js.org/intro/
- **Syntax**: https://mermaid.js.org/syntax/flowchart.html

Mermaid-diagrammen worden vooraf gerenderd als SVG (light + dark) door `scripts/render-mermaid.js` met Puppeteer. De render hook (`layouts/_markup/render-codeblock-mermaid.html`) toont de pre-gerenderde SVGs als `<img>`. Als de SVGs ontbreken, faalt de Hugo build.

Kleuren komen uit `assets/css/tokens.css` (via `scripts/render-mermaid.js`). Het font (RijksSans) wordt als base64 in de SVG ingebed.

Elk mermaid-blok heeft een `accTitle` nodig voor de bestandsnaam en toegankelijkheid.

## Aanpak

Bij Hugo of Reveal.js vragen:
1. Raadpleeg eerst de officiële documentatie via WebFetch
2. Controleer of de oplossing past bij de projectconventies
3. Test lokaal met `hugo server`
