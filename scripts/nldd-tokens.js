#!/usr/bin/env node

/**
 * Genereert assets/css/nldd-primitives.css uit het NLDD Design System.
 *
 * Neemt de kleurschalen over die de site gebruikt en voegt een eigen
 * neutral-schaal toe: dezelfde lichtheid en tint als NLDD's coolgray,
 * maar met meer verzadiging aan de donkere kant, zodat de donkere
 * achtergrond blauw blijft in plaats van grijs.
 *
 * Gebruik: just nldd
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(import.meta.dirname, "..");
// De schalen staan in colors.generated.css, naast het geëxporteerde variables.css
const VARIABLES = fileURLToPath(import.meta.resolve("@nldd/design-system/styles/variables"));
const PALETTES = join(dirname(VARIABLES), "colors.generated.css");
const OUTPUT = join(ROOT, "assets", "css", "nldd-primitives.css");

// Schalen die één op één worden overgenomen
const SCALES = ["coolgray", "lintblauw", "oranje", "groen", "rood", "violet", "donkergeel"];

// Functionele aliassen, zelfde koppeling als in NLDD's variables.css
const ALIASES = { accent: "lintblauw", success: "groen", warning: "oranje", critical: "rood", mark: "donkergeel" };

// Neutral: coolgray met minimaal deze chroma zodra de lichtheid onder
// de grens zit. Boven de grens blijft coolgray ongewijzigd, zodat
// papierwit en lichte tekst neutraal blijven.
const NEUTRAL_BASE = "coolgray";
const NEUTRAL_MIN_CHROMA = 0.042;
const NEUTRAL_LIGHTNESS_LIMIT = 0.56;

function parsePalettes(css) {
  const scales = {};
  const re = /--primitives-color-([a-z]+)-(\d+):\s*([^;]+);/g;
  for (const [, scale, step, value] of css.matchAll(re)) {
    (scales[scale] ??= {})[Number(step)] = value.trim();
  }
  return scales;
}

// Exacte huisstijlkleuren (niet themagevoelig), zoals NLDD ze meelevert
function parseReferences(css) {
  const refs = {};
  const re = /--primitives-color-reference-([a-z]+):\s*([^;]+);/g;
  for (const [, name, value] of css.matchAll(re)) {
    if (SCALES.includes(name)) refs[name] = value.trim();
  }
  return refs;
}

function boostChroma(value) {
  return value.replace(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g, (m, l, c, h) => {
    const L = Number(l);
    const C = Number(c);
    if (L > NEUTRAL_LIGHTNESS_LIMIT || C === 0 || C >= NEUTRAL_MIN_CHROMA) return m;
    return `oklch(${l} ${NEUTRAL_MIN_CHROMA.toFixed(3)} ${h})`;
  });
}

function buildCSS(scales, references = {}) {
  const lines = [
    "/* Gegenereerd door scripts/nldd-tokens.js uit @nldd/design-system.",
    "   Niet handmatig bewerken: draai `just nldd`. */",
    "",
    ":root {",
    "  /* exacte huisstijlkleuren, niet themagevoelig */",
  ];
  for (const [name, value] of Object.entries(references)) {
    lines.push(`  --primitives-color-reference-${name}: ${value};`);
  }
  lines.push("");
  for (const scale of SCALES) {
    const steps = scales[scale];
    if (!steps) throw new Error(`Schaal "${scale}" niet gevonden in ${PALETTES}`);
    lines.push(`  /* ${scale} */`);
    for (const step of Object.keys(steps).map(Number).sort((a, b) => a - b)) {
      lines.push(`  --primitives-color-${scale}-${step}: ${steps[step]};`);
    }
    lines.push("");
  }
  lines.push(`  /* neutral: ${NEUTRAL_BASE} met chroma >= ${NEUTRAL_MIN_CHROMA} onder lichtheid ${NEUTRAL_LIGHTNESS_LIMIT} */`);
  const base = scales[NEUTRAL_BASE];
  for (const step of Object.keys(base).map(Number).sort((a, b) => a - b)) {
    lines.push(`  --primitives-color-neutral-${step}: ${boostChroma(base[step])};`);
  }
  lines.push("");
  lines.push("  /* functionele aliassen zoals in NLDD */");
  for (const [alias, scale] of Object.entries(ALIASES)) {
    for (const step of Object.keys(scales[scale]).map(Number).sort((a, b) => a - b)) {
      lines.push(`  --primitives-color-${alias}-${step}: var(--primitives-color-${scale}-${step});`);
    }
  }
  lines.push("}", "");
  return lines.join("\n");
}

// Pad -> inhoud, zodat de test kan vergelijken zonder te schrijven
function generate() {
  const variables = readFileSync(VARIABLES, "utf-8");
  const scales = parsePalettes(readFileSync(PALETTES, "utf-8"));
  return { [OUTPUT]: buildCSS(scales, parseReferences(variables)) };
}

export { parsePalettes, parseReferences, boostChroma, buildCSS, generate };

const isCLI = process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.dirname, "nldd-tokens.js");

if (isCLI) {
  for (const [path, content] of Object.entries(generate())) {
    writeFileSync(path, content);
    console.log(`Geschreven: ${path}`);
  }
}
