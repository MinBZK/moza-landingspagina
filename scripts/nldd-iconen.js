#!/usr/bin/env node

/**
 * Schrijft de site-iconen als SVG-bestanden uit de icoonregistry van het NLDD
 * Design System naar static/images/icons/, en kopieert favicon en touch-icon
 * uit het pakket. De partial icon.html en de CSS blijven op de bestandsnamen
 * werken.
 *
 * Bestanden die niet in ICONS staan (zoals de bestandstype-iconen waar NLDD
 * geen tegenhanger voor heeft) blijven ongemoeid.
 *
 * Gebruik: just nldd
 */

import { copyFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer";

const ROOT = resolve(import.meta.dirname, "..");
const OUTPUT_DIR = join(ROOT, "static", "images", "icons");

// Altijd dezelfde vlaggen, ook lokaal: zonder sandbox start Chromium in CI niet,
// en met de GPU uit rastert elke machine dezelfde PNG-bytes.
const PUPPETEER_ARGS = ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"];

// bestandsnaam -> NLDD-icoon (canonieke naam), plus de class die CSS of JS verwacht
const ICONS = {
  download: { name: "arrow-down-in-bucket" },
  "externe-link": { name: "square-arrow-right-top" },
  "file-type-md": { name: "markdown-rectangle" },
  info: { name: "info-circle" },
  lock: { name: "lock-closed" },
  menu: { name: "list", class: "menu-icon" },
  search: { name: "magnifier", class: "search-icon" },
  x: { name: "dismiss", class: "x-icon" },
  "chevron-down": { name: "chevron-down", class: "icon-expand" },
};

// Bestanden die het pakket kant-en-klaar meelevert
const FILES = {
  "touch-icon.png": join(ROOT, "static", "touch-icon.png"),
};

// Afronding zoals regelrecht.rijks.app: scheidt de tegel van de tabbladbalk
const FAVICON = { name: "centralized-structure", fill: 72, radius: 200 };
const FAVICON_TILE = 1024;
// Safari kent geen SVG-favicons, dus komt er een PNG naast voor Android en
// hoge pixeldichtheid.
const FAVICON_PNG = [192];
// Browsers vragen /favicon.ico ook op zonder link in de pagina; zonder bestand
// geeft dat een 404 en houdt Safari het tabblad leeg.
const FAVICON_ICO = [16, 32, 48];

async function loadRegistry() {
  const iconDir = dirname(fileURLToPath(import.meta.resolve("@nldd/design-system/icon")));
  const { iconRegistry } = await import(pathToFileURL(join(iconDir, "icon-registry.js")).href);
  return iconRegistry;
}

// De registry levert de iconen zonder eigen afmeting; zonder width en height
// klapt een SVG in een flexbox dicht en toont Safari geen favicon.
function toFile(svg, cls) {
  const attrs = `${cls ? `class="${cls}" ` : ""}width="24" height="24" `;
  return svg.replace(/^<svg /, `<svg ${attrs}`).replace(/>\n?/, ` aria-hidden="true" focusable="false">\n`).replace(/\n?<\/svg>\s*$/, "\n</svg>\n");
}

// De tekening zit niet altijd midden in zijn eigen viewBox, dus meten we het
// werkelijke inktvlak. Afgerond op één decimaal, zodat een andere
// Chromium-versie niet tot een ander bestand leidt.
async function inktvlak(svg) {
  const browser = await puppeteer.launch({ args: PUPPETEER_ARGS });
  try {
    const page = await browser.newPage();
    await page.setContent(`<body style="margin:0">${svg}</body>`);
    const box = await page.$eval("svg", (el) => {
      const { x, y, width, height } = el.querySelector("path, g, circle, rect").ownerSVGElement.getBBox();
      return { x, y, width, height };
    });
    return Object.fromEntries(Object.entries(box).map(([k, v]) => [k, Math.round(v * 10) / 10]));
  } finally {
    await browser.close();
  }
}

// Bouwt de favicon-tegel: het icoon geschaald tot het gevraagde deel van de
// tegel en gecentreerd op zijn inktvlak.
function toFavicon(svg, box, { fill = 72, radius = 0, tile = FAVICON_TILE } = {}) {
  const inner = svg
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .replace(/\s*fill="currentColor"/g, "")
    .trim();
  const scale = (tile * (fill / 100)) / Math.max(box.width, box.height);
  const x = tile / 2 - (box.x + box.width / 2) * scale;
  const y = tile / 2 - (box.y + box.height / 2) * scale;
  // Safari toont een SVG-favicon alleen met een expliciete breedte en hoogte
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tile}" height="${tile}" viewBox="0 0 ${tile} ${tile}">
\t<rect width="${tile}" height="${tile}" rx="${radius}" fill="#154273"/>
\t<g fill="#fff" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(4)})">
\t\t${inner.replace(/\n\s*/g, "\n\t\t")}
\t</g>
</svg>
`;
}

// Zet de favicon om naar PNG, in de opgegeven maten
async function toPng(svg, maten) {
  const bron = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  const browser = await puppeteer.launch({ args: PUPPETEER_ARGS });
  try {
    const page = await browser.newPage();
    const uit = {};
    for (const maat of maten) {
      await page.setViewport({ width: maat, height: maat });
      await page.setContent(`<body style="margin:0"><img src="${bron}" width="${maat}" height="${maat}"></body>`);
      uit[maat] = await page.screenshot({ type: "png", omitBackground: true });
    }
    return uit;
  } finally {
    await browser.close();
  }
}

// Een ICO is een indexbestand om complete afbeeldingen heen; PNG's erin worden
// sinds Vista overal begrepen en blijven veel kleiner dan bitmaps.
function toIco(pngs) {
  const maten = Object.keys(pngs)
    .map(Number)
    .sort((a, b) => a - b);
  const kop = Buffer.alloc(6);
  kop.writeUInt16LE(1, 2);
  kop.writeUInt16LE(maten.length, 4);
  let offset = kop.length + maten.length * 16;
  const index = maten.map((maat) => {
    const entry = Buffer.alloc(16);
    // Eén byte per zijde, waarin 0 voor 256 staat
    entry[0] = maat % 256;
    entry[1] = maat % 256;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(pngs[maat].length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += pngs[maat].length;
    return entry;
  });
  return Buffer.concat([kop, ...index, ...maten.map((maat) => pngs[maat])]);
}

// dist/ ligt drie mappen boven de icon-map; package.json zelf is niet geëxporteerd
function distDir() {
  return resolve(dirname(fileURLToPath(import.meta.resolve("@nldd/design-system/icon"))), "..", "..", "..");
}

// Pad -> inhoud, zodat de test kan vergelijken zonder te schrijven
async function generate() {
  const registry = await loadRegistry();
  const files = {};
  for (const [file, { name, class: cls }] of Object.entries(ICONS)) {
    const svg = registry.get(name);
    if (!svg) throw new Error(`NLDD-icoon "${name}" niet gevonden (voor ${file}.svg)`);
    files[join(OUTPUT_DIR, `${file}.svg`)] = toFile(svg, cls);
  }
  const mark = registry.get(FAVICON.name);
  if (!mark) throw new Error(`NLDD-icoon "${FAVICON.name}" niet gevonden (voor favicon.svg)`);
  files[join(ROOT, "static", "favicon.svg")] = toFavicon(mark, await inktvlak(mark), FAVICON);
  return files;
}

// Pad -> binaire inhoud; los van generate() omdat de bytes per Chromium-versie
// kunnen verschillen en de test ze daarom alleen op maat controleert.
async function generateRaster() {
  const svg = (await generate())[join(ROOT, "static", "favicon.svg")];
  const png = await toPng(svg, [...new Set([...FAVICON_PNG, ...FAVICON_ICO])]);
  const files = Object.fromEntries(FAVICON_PNG.map((maat) => [join(ROOT, "static", `favicon-${maat}x${maat}.png`), png[maat]]));
  files[join(ROOT, "static", "favicon.ico")] = toIco(Object.fromEntries(FAVICON_ICO.map((maat) => [maat, png[maat]])));
  return files;
}

// Pad -> bronbestand in het pakket, gekopieerd zoals het is
function copies() {
  return Object.fromEntries(Object.entries(FILES).map(([file, target]) => [target, join(distDir(), file)]));
}

export { ICONS, FAVICON_PNG, FAVICON_ICO, toFile, toFavicon, toIco, generate, generateRaster, copies };

const isCLI = process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.dirname, "nldd-iconen.js");

if (isCLI) {
  for (const [path, content] of Object.entries(await generate())) {
    writeFileSync(path, content);
    console.log(`  ${relative(ROOT, path)}`);
  }
  for (const [path, content] of Object.entries(await generateRaster())) {
    writeFileSync(path, content);
    console.log(`  ${relative(ROOT, path)}`);
  }
  for (const [target, source] of Object.entries(copies())) {
    copyFileSync(source, target);
    console.log(`  ${relative(ROOT, target)}`);
  }
}
