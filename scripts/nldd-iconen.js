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

const ROOT = resolve(import.meta.dirname, "..");
const OUTPUT_DIR = join(ROOT, "static", "images", "icons");

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

// Bestanden die het pakket kant-en-klaar meelevert: het rijkswapen op lintblauw
const FILES = {
  "favicon.svg": join(ROOT, "static", "favicon.svg"),
  "touch-icon.png": join(ROOT, "static", "touch-icon.png"),
};

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
  return files;
}

// Pad -> bronbestand in het pakket, gekopieerd zoals het is
function copies() {
  return Object.fromEntries(Object.entries(FILES).map(([file, target]) => [target, join(distDir(), file)]));
}

export { ICONS, toFile, generate, copies };

const isCLI = process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.dirname, "nldd-iconen.js");

if (isCLI) {
  for (const [path, content] of Object.entries(await generate())) {
    writeFileSync(path, content);
    console.log(`  ${relative(ROOT, path)}`);
  }
  for (const [target, source] of Object.entries(copies())) {
    copyFileSync(source, target);
    console.log(`  ${relative(ROOT, target)}`);
  }
}
