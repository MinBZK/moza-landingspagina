#!/usr/bin/env node

/**
 * Genereert static/social-card.jpg: de afbeelding die Facebook, LinkedIn,
 * Mastodon en X tonen bij een gedeelde link. Titel en tagline komen uit
 * hugo.yaml, de foto is de hero van de homepage, kleuren komen uit de tokens
 * en het lettertype uit static/fonts.
 *
 * Gebruik: just social-card
 */

import { readFileSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import puppeteer from "puppeteer";
import { PUPPETEER_ARGS } from "./lib/puppeteer-args.js";

const ROOT = resolve(import.meta.dirname, "..");
const OUTPUT = join(ROOT, "static", "social-card.jpg");

// De maat die alle platforms als voorkeur noemen (1,91:1)
const BREEDTE = 1200;
const HOOGTE = 630;
// Met een foto op de kaart is JPEG een factor zes kleiner dan PNG
const KWALITEIT = 88;

function siteGegevens() {
  const yaml = readFileSync(join(ROOT, "hugo.yaml"), "utf-8");
  const veld = (naam, regex) => {
    const m = yaml.match(regex);
    if (!m) throw new Error(`${naam} niet gevonden in hugo.yaml`);
    return m[1].trim();
  };
  return {
    titel: veld("title", /^title:\s*(.+)$/m),
    tagline: veld("tagline", /^\s{2}tagline:\s*(.+)$/m),
  };
}

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

function html({ titel, tagline }, lint, logo, foto) {
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
h1 { font-size: 60px; font-weight: 700; line-height: 1.05; letter-spacing: -0.01em; }
.voet p { margin-top: 14px; font-size: 38px; font-weight: 500; line-height: 1.25; }
</style>
<div class="foto"><img src="${foto}" alt=""></div>
<div class="lint">${logo}</div>
<div class="voet"><h1>${titel}</h1><p>${tagline}</p></div>`;
}

async function render() {
  const gegevens = siteGegevens();
  const logo = readFileSync(join(ROOT, "static", "images", "logo-rijksoverheid.svg"), "utf-8");
  const lint = tokenKleur("--color-rijks-blauw").startsWith("var(") ? "#154273" : tokenKleur("--color-rijks-blauw");

  const browser = await puppeteer.launch({ args: PUPPETEER_ARGS });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: BREEDTE, height: HOOGTE });
    await page.setContent(html(gegevens, lint, logo, heroFoto()));
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => img.decode()));
    });
    return await page.screenshot({ type: "jpeg", quality: KWALITEIT });
  } finally {
    await browser.close();
  }
}

export { BREEDTE, HOOGTE, OUTPUT, render };

const isCLI = process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.dirname, "social-card.js");

if (isCLI) {
  writeFileSync(OUTPUT, await render());
  console.log(`Geschreven: ${OUTPUT}`);
}
