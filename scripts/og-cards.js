#!/usr/bin/env node

/**
 * Genereert per pagina de afbeelding die Facebook, LinkedIn, Mastodon en X
 * tonen bij een gedeelde link.
 *
 * Draait NA de Hugo-build op de outputmap (standaard `public`). Leest het
 * manifest og.json (layouts/home.og.json) en schrijft elke kaart op het pad
 * dat daarin staat, hetzelfde pad dat head.html in de meta-tags zet.
 *
 * Gebruik:
 *   node scripts/og-cards.js [outputmap]   # standaard: public
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import puppeteer from "puppeteer";
import { PUPPETEER_ARGS } from "./lib/puppeteer-args.js";

const ROOT = resolve(import.meta.dirname, "..");
const OUTPUT_DIR = resolve(process.cwd(), process.argv[2] || "public");
const MANIFEST = join(OUTPUT_DIR, "og.json");

// De maat die alle platforms als voorkeur noemen (1,91:1)
const BREEDTE = 1200;
const HOOGTE = 630;
// Met een foto op de kaart is JPEG een factor zes kleiner dan PNG
const KWALITEIT = 88;
// De titel krimpt tot hij binnen de voetbalk past
const KORPS_MAX = 60;
const KORPS_MIN = 34;
const VOET_MAX = 300;

function tokenKleur(naam) {
  const css = readFileSync(join(ROOT, "assets", "css", "tokens.css"), "utf-8");
  const m = css.match(new RegExp(`${naam}:\\s*([^;]+);`));
  if (!m) throw new Error(`${naam} niet gevonden in tokens.css`);
  return m[1].trim();
}

function fontCSS() {
  const b64 = readFileSync(join(ROOT, "static", "fonts", "RijksSansWeb-Regular.woff2")).toString("base64");
  return `@font-face{font-family:"RijksSans";src:url("data:font/woff2;base64,${b64}") format("woff2-variations");font-weight:200 800}`;
}

// Dezelfde foto als de hero van de homepage, zodat een gedeelde link toont wat
// de bezoeker daarna ziet
function heroFoto() {
  const front = readFileSync(join(ROOT, "content", "_index.md"), "utf-8");
  const m = front.match(/^hero:\n(?:\s+.*\n)*?\s+image:\s*(.+)$/m);
  if (!m) throw new Error("hero.image niet gevonden in content/_index.md");
  const pad = join(ROOT, "assets", m[1].trim());
  const type = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" }[extname(pad)];
  if (!type) throw new Error(`Onbekend beeldformaat voor ${m[1].trim()}`);
  return `data:${type};base64,${readFileSync(pad).toString("base64")}`;
}

function html(lint, logo, foto) {
  return `<style>
${fontCSS()}
* { margin: 0; box-sizing: border-box; }
body {
  width: ${BREEDTE}px; height: ${HOOGTE}px; position: relative;
  font-family: "RijksSans", system-ui, sans-serif; text-align: center;
}
.foto { position: absolute; inset: 0; }
/* De hero is een panorama van 4:1; uit het midden gesneden valt het onderwerp
   buiten beeld, dus de uitsnede schuift naar rechts */
.foto img { width: 100%; height: 100%; object-fit: cover; object-position: 62% center; display: block; }
/* Het rijkslint hoort aan de bovenrand op de middenas */
.lint { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 118px; }
.lint svg { width: 100%; height: auto; display: block; }
.voet {
  position: absolute; left: 0; right: 0; bottom: 0;
  padding: 40px 64px 44px; background: ${lint}; color: #fff;
}
h1 { font-size: ${KORPS_MAX}px; font-weight: 700; line-height: 1.05; letter-spacing: -0.01em; text-wrap: balance; }
.voet p { margin-top: 14px; font-size: 38px; font-weight: 500; line-height: 1.25; }
</style>
<div class="foto"><img src="${foto}" alt=""></div>
<div class="lint">${logo}</div>
<div class="voet"><h1></h1><p></p></div>`;
}

async function render() {
  if (!existsSync(MANIFEST)) throw new Error(`${MANIFEST} ontbreekt. Draai eerst de Hugo-build.`);
  const paginas = JSON.parse(readFileSync(MANIFEST, "utf-8"));
  const logo = readFileSync(join(ROOT, "static", "images", "logo-rijksoverheid.svg"), "utf-8");
  const lint = tokenKleur("--color-rijks-blauw").startsWith("var(") ? "#154273" : tokenKleur("--color-rijks-blauw");

  const browser = await puppeteer.launch({ args: PUPPETEER_ARGS });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: BREEDTE, height: HOOGTE });
    // De pagina wordt één keer opgebouwd; per kaart verandert alleen de tekst.
    // De foto en het lettertype zitten als base64 in de opmaak.
    await page.setContent(html(lint, logo, heroFoto()));
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => img.decode()));
    });

    for (const { pad, titel, onderregel } of paginas) {
      await page.evaluate(
        (titel, onderregel, max, min, voetMax) => {
          const h1 = document.querySelector("h1");
          h1.textContent = titel;
          document.querySelector(".voet p").textContent = onderregel;
          const voet = document.querySelector(".voet");
          for (let korps = max; korps >= min; korps -= 2) {
            h1.style.fontSize = `${korps}px`;
            if (voet.offsetHeight <= voetMax) break;
          }
        },
        titel,
        onderregel,
        KORPS_MAX,
        KORPS_MIN,
        VOET_MAX,
      );
      const bestand = join(OUTPUT_DIR, pad);
      mkdirSync(dirname(bestand), { recursive: true });
      writeFileSync(bestand, await page.screenshot({ type: "jpeg", quality: KWALITEIT }));
    }
    return paginas.length;
  } finally {
    await browser.close();
  }
}

const aantal = await render();
console.log(`Geschreven: ${aantal} deelafbeeldingen in ${OUTPUT_DIR}`);
