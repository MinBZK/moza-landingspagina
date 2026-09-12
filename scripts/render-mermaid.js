#!/usr/bin/env node

/**
 * Pre-render Mermaid diagrams as SVGs (light + dark) with embedded fonts.
 *
 * Usage:
 *   node scripts/render-mermaid.js           # render all
 *   node scripts/render-mermaid.js --watch   # watch for changes
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, watch, utimesSync } from "node:fs";
import { join, resolve, relative, dirname, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import puppeteer from "puppeteer";
import { PUPPETEER_ARGS } from "./lib/puppeteer-args.js";

const ROOT = resolve(import.meta.dirname, "..");
const CONTENT_DIR = join(ROOT, "content");
const RENDER_DIR = join(ROOT, "static", "images", "render");
const CACHE_DIR = join(ROOT, ".cache", "mermaid");
const FONTS_DIR = join(ROOT, "static", "fonts");

// ── Theme from design tokens ────────────────────────────────────────────────

// Volgorde is de cascade: latere bestanden overschrijven eerdere.
const TOKEN_FILES = [
  join(ROOT, "assets", "css", "nldd-primitives.css"),
  join(ROOT, "assets", "css", "tokens.css"),
];

const TOKEN_MAP = {
  primaryColor: "--color-bg-info",
  primaryTextColor: "--color-text",
  primaryBorderColor: "--color-primary",
  lineColor: "--color-primary",
  secondaryColor: "--color-bg-muted",
  tertiaryColor: "--color-bg-light",
  edgeLabelBackground: "--color-bg-muted",
};

function parseTokens() {
  const vars = {};
  for (const file of TOKEN_FILES) {
    const css = readFileSync(file, "utf-8");
    for (const [, name, value] of css.matchAll(/(--[\w-]+):\s*([^;]+)/g)) {
      vars[name] = value.trim();
    }
  }
  return vars;
}

// Splitst de argumenten van een functie-aanroep op komma's buiten haakjes.
function splitArgs(text) {
  const args = [];
  let depth = 0;
  let current = "";
  for (const ch of text) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      args.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  args.push(current.trim());
  return args;
}

// Vindt de inhoud tussen de haakjes van `fn(` op positie `start`.
function matchCall(text, fn, start = 0) {
  const open = text.indexOf(`${fn}(`, start);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open + fn.length; i < text.length; i++) {
    if (text[i] === "(") depth++;
    if (text[i] === ")" && --depth === 0) {
      return { start: open, end: i + 1, inner: text.slice(open + fn.length + 1, i) };
    }
  }
  return null;
}

// oklch → sRGB hex (CSS Color 4). Waarden buiten gamut worden geknipt.
function oklchToHex(l, c, h) {
  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  return "#" + lin.map((v) => {
    const clamped = Math.min(1, Math.max(0, v));
    const srgb = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
    return Math.round(srgb * 255).toString(16).padStart(2, "0");
  }).join("");
}

// Rekent een tokenwaarde uit voor één variant: var() recursief invullen,
// light-dark() kiezen en oklch() naar hex omzetten.
function resolveValue(vars, value, variant, seen = new Set()) {
  let out = value;
  let call;
  let from = 0;
  while ((call = matchCall(out, "var", from))) {
    const name = splitArgs(call.inner)[0];
    if (seen.has(name) || !(name in vars)) {
      // Onbekend of circulair: laten staan en verder zoeken na deze aanroep
      from = call.end;
      continue;
    }
    const nested = resolveValue(vars, vars[name], variant, new Set([...seen, name]));
    out = out.slice(0, call.start) + nested + out.slice(call.end);
    from = call.start + nested.length;
  }
  while ((call = matchCall(out, "light-dark"))) {
    const [light, dark] = splitArgs(call.inner);
    out = out.slice(0, call.start) + (variant === "dark" ? dark : light) + out.slice(call.end);
  }
  while ((call = matchCall(out, "oklch"))) {
    const [l, c, h] = call.inner.trim().split(/\s+/).map(Number);
    out = out.slice(0, call.start) + oklchToHex(l, c, h) + out.slice(call.end);
  }
  return out;
}

function resolveToken(vars, name, variant) {
  return resolveValue(vars, vars[name] ?? "", variant);
}

function buildThemes() {
  const vars = parseTokens();
  const light = { darkMode: false };
  const dark = { darkMode: true };
  for (const [key, token] of Object.entries(TOKEN_MAP)) {
    light[key] = resolveToken(vars, token, "light");
    dark[key] = resolveToken(vars, token, "dark");
  }
  return { light, dark };
}

const THEMES = buildThemes();

// Vervangt var(--token) in de diagramcode (bijv. in classDef) door de
// light- of dark-waarde, zodat kleuren in content het thema volgen.
// Mermaid zet classDef-kleuren als inline !important-stijlen, dus dit
// moet vóór het renderen gebeuren.
function resolveDiagramTokens(code, variant) {
  const vars = parseTokens();
  return code.replace(/var\((--[\w-]+)\)/g, (match, name) => {
    if (!(name in vars)) {
      console.warn(`  ⚠ onbekend token ${name} in mermaid-blok`);
      return match;
    }
    return resolveToken(vars, name, variant);
  });
}

// ── Font embedding ───────────────────────────────────────────────────────────

// Variabel font: één bestand dekt alle gewichten
const FONT_FILES = [
  { file: "RijksSansWeb-Regular.woff2", weight: "200 800" },
];

let fontCSS;
function getFontCSS() {
  if (fontCSS !== undefined) return fontCSS;
  fontCSS = FONT_FILES.map(({ file, weight }) => {
    const buf = readFileSync(join(FONTS_DIR, file));
    const b64 = buf.toString("base64");
    return `@font-face{font-family:"RijksSans";src:url("data:font/woff2;base64,${b64}") format("woff2-variations");font-weight:${weight};font-style:normal}`;
  }).join("\n");
  return fontCSS;
}

// ── Slugify (moet exact matchen met Hugo render hook) ────────────────────────
// Stappen: lowercase, spaties→hyphens, alleen [a-z0-9-] behouden,
// opeenvolgende hyphens samenvoegen, leading/trailing hyphens strippen.
// Hugo render hook doet hetzelfde: lower | replaceRE "\\s+" "-" | replaceRE "[^a-z0-9-]" ""

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Scan content files for mermaid blocks ────────────────────────────────────

function findMarkdownFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findMarkdownFiles(full));
    } else if (entry.name.endsWith(".md")) {
      files.push(full);
    }
  }
  return files;
}

function contentSubdir(filePath) {
  const rel = relative(CONTENT_DIR, filePath);
  const dir = dirname(rel);
  const base = basename(rel, ".md");
  if (base === "index" || base === "_index") return dir;
  return join(dir, base);
}

function extractMermaidBlocks(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const subdir = contentSubdir(filePath);
  const blocks = [];
  const slugCount = {};
  let blockNum = 0;
  const regex = /^```mermaid\s*\n([\s\S]*?)^```/gm;
  let match;
  while ((match = regex.exec(content)) !== null) {
    blockNum++;
    const code = match[1];
    const titleMatch = code.match(/accTitle:\s*(.+)/);
    const multiDescr = code.match(/accDescr\s*\{([^}]*)\}/s);
    const singleDescr = code.match(/accDescr:\s*(.+)/);
    const descrMatch = multiDescr
      ? { 1: multiDescr[1].trim().replace(/\s*\n\s*/g, " ") }
      : singleDescr;
    let slug;
    if (titleMatch) {
      slug = slugify(titleMatch[1].trim());
      slugCount[slug] = (slugCount[slug] || 0) + 1;
      if (slugCount[slug] > 1) {
        console.warn(`  ⚠ ${relative(ROOT, filePath)}: dubbele accTitle "${slug}"`);
        slug = `${slug}-${slugCount[slug]}`;
      }
    } else {
      slug = `diagram-${blockNum}`;
      console.warn(`  ⚠ ${relative(ROOT, filePath)}: mermaid-blok ${blockNum} zonder accTitle, gebruikt "${slug}"`);
    }
    blocks.push({
      code,
      title: titleMatch ? titleMatch[1].trim() : "",
      description: descrMatch ? descrMatch[1].trim() : "",
      slug,
      subdir,
      sourceFile: filePath,
    });
  }
  return blocks;
}

// ── Hash-based caching ───────────────────────────────────────────────────────

function computeHash(code) {
  return createHash("sha256").update(code).digest("hex").slice(0, 16);
}

// Token-hash zodat SVGs opnieuw worden gerenderd als kleuren wijzigen
// Ook de fontnamen tellen mee, zodat een fontwissel de SVGs herrendert
const TOKENS_HASH = computeHash(
  TOKEN_FILES.map((f) => readFileSync(f, "utf-8")).join("\n") + FONT_FILES.map((f) => f.file).join(","),
).slice(0, 8);

function hashPath(svgPath) {
  return join(CACHE_DIR, relative(RENDER_DIR, svgPath) + ".hash");
}

function isUpToDate(svgPath, hash) {
  const hp = hashPath(svgPath);
  if (!existsSync(svgPath) || !existsSync(hp)) return false;
  return readFileSync(hp, "utf-8").trim() === hash;
}

function writeHash(svgPath, hash) {
  const hp = hashPath(svgPath);
  mkdirSync(dirname(hp), { recursive: true });
  writeFileSync(hp, hash);
}

// ── Mermaid rendering met font-injectie ──────────────────────────────────────

// Pad naar de mermaid IIFE (zet globalThis.mermaid)
const mermaidIIFEPath = join(ROOT, "node_modules", "mermaid", "dist", "mermaid.js");

// NLDD-iconen als Iconify-pack. De registry is een Map van naam naar SVG-string
// (viewBox 0 0 24 24, fill="currentColor"); Iconify wil alleen de inhoud van de <svg>.
async function loadNlddIconPack() {
  const iconDir = dirname(fileURLToPath(import.meta.resolve("@nldd/design-system/icon")));
  const { iconRegistry } = await import(pathToFileURL(join(iconDir, "icon-registry.js")).href);
  const { aliases } = await import(pathToFileURL(join(iconDir, "icon-aliases.js")).href);
  const icons = {};
  for (const [name, svg] of iconRegistry) {
    icons[name] = { body: svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "").trim() };
  }
  const aliasEntries = Object.fromEntries(Object.entries(aliases).map(([alias, parent]) => [alias, { parent }]));
  return { prefix: "nldd", data: { prefix: "nldd", icons, aliases: aliasEntries, width: 24, height: 24 } };
}

const ICON_PACKS = [await loadNlddIconPack()];

async function renderDiagram(browser, definition, { backgroundColor, mermaidConfig, iconPacks = ICON_PACKS }) {
  const page = await browser.newPage();
  try {
    await page.setContent('<html><body><div id="container"></div></body></html>');

    // Font CSS injecteren VOOR Mermaid rendert, zodat tekstmeting het juiste font gebruikt
    await page.addStyleTag({ content: getFontCSS() });
    await page.addScriptTag({ path: mermaidIIFEPath });

    const iconData = iconPacks;

    await page.$eval("#container", async (container, definition, mermaidConfig, bg, iconData) => {
      await Promise.all(Array.from(document.fonts, (font) => font.load()));
      const { mermaid } = globalThis;
      mermaid.registerIconPacks(
        iconData.map(({ prefix, data }) => ({
          name: prefix,
          loader: () => data,
        }))
      );
      mermaid.initialize({ startOnLoad: false, ...mermaidConfig });
      const { svg: svgText } = await mermaid.render("my-svg", definition, container);
      container.innerHTML = svgText;
      const svg = container.querySelector("svg");
      if (svg) svg.style.backgroundColor = bg;
    }, definition, mermaidConfig, backgroundColor, iconData);

    const svgXML = await page.$eval("svg", (svg) => {
      return new XMLSerializer().serializeToString(svg);
    });
    return new TextEncoder().encode(svgXML);
  } finally {
    await page.close();
  }
}

// ── SVG post-processing ─────────────────────────────────────────────────────
// Werkt op de root <svg> die Mermaid genereert. Mermaid's output begint altijd
// met één <svg> element, dus de regexes matchen betrouwbaar het root element.

function postProcessSVG(svgData) {
  let svg = Buffer.from(svgData).toString("utf-8");

  const vbMatch = svg.match(/viewBox="([\d.-]+)\s+([\d.-]+)\s+([\d.]+)\s+([\d.]+)"/);
  const [, vbX, vbY, vbW, vbH] = vbMatch || [];

  // Replace width="100%" with actual pixel width from viewBox
  if (vbW) {
    svg = svg.replace('width="100%"', `width="${Math.ceil(parseFloat(vbW))}"`);
  }

  // Strip inline style on root <svg> (max-width, background-color)
  // and re-add only background-color as a <rect> fill for clean SVG output
  const bgMatch = svg.match(/style="[^"]*background-color:\s*([^;"]+)/);
  svg = svg.replace(/(<svg[^>]*?) style="[^"]*"/, "$1");
  if (bgMatch && vbMatch) {
    svg = svg.replace(
      /(<svg[^>]*>)/,
      `$1<rect x="${vbX}" y="${vbY}" width="${vbW}" height="${vbH}" rx="8" ry="8" fill="${bgMatch[1].trim()}"/>`
    );
  }

  // Embed fonts
  const fonts = getFontCSS();
  if (svg.includes("<style>")) {
    svg = svg.replace("<style>", `<style>${fonts}\n`);
  } else {
    svg = svg.replace(/(<svg[^>]*>)/, `$1<style>${fonts}</style>`);
  }

  return svg;
}

function renderOptions(variant) {
  return {
    backgroundColor: THEMES[variant].secondaryColor,
    mermaidConfig: {
      theme: "base",
      themeCSS: ".flowchartTitleText { font-weight: bold; font-size: 1.4em; }",
      themeVariables: {
        ...THEMES[variant],
        fontFamily: '"RijksSans", Calibri, sans-serif',
      },
    },
  };
}

// ── Main render ──────────────────────────────────────────────────────────────

async function renderAll() {
  mkdirSync(RENDER_DIR, { recursive: true });

  const mdFiles = findMarkdownFiles(CONTENT_DIR);
  const blocks = mdFiles.flatMap(extractMermaidBlocks);

  if (blocks.length === 0) {
    console.log("Geen mermaid-blokken gevonden.");
    return;
  }

  console.log(`${blocks.length} mermaid-blok(ken) gevonden.`);

  // Collect work
  const work = [];
  for (const block of blocks) {
    const svgDir = join(RENDER_DIR, block.subdir);
    mkdirSync(svgDir, { recursive: true });
    for (const variant of ["light", "dark"]) {
      const svgName = `${block.slug}-${variant}.svg`;
      const svgPath = join(svgDir, svgName);
      const hash = computeHash(`${block.code}:${variant}:${TOKENS_HASH}`);
      if (isUpToDate(svgPath, hash)) {
        console.log(`  ✓ ${relative(ROOT, svgPath)} (cached)`);
        continue;
      }
      work.push({ block, variant, svgPath, svgName, hash });
    }
  }

  if (work.length === 0) {
    console.log("Alle SVGs zijn up-to-date.");
    return;
  }

  // Launch browser once for all renders
  const browser = await puppeteer.launch({ args: PUPPETEER_ARGS });
  try {
    for (const { block, variant, svgPath, hash } of work) {
      console.log(`  → ${relative(ROOT, svgPath)}`);
      const data = await renderDiagram(browser, resolveDiagramTokens(block.code, variant), renderOptions(variant));
      const svg = postProcessSVG(data);
      writeFileSync(svgPath, svg);
      writeHash(svgPath, hash);
    }
  } finally {
    await browser.close();
  }

  // Touch bronbestanden zodat Hugo's live-reload herbouwt met nieuwe SVGs
  const touchedFiles = new Set(work.map((w) => w.block.sourceFile));
  const now = new Date();
  for (const file of touchedFiles) {
    utimesSync(file, now, now);
    console.log(`  ↻ ${relative(ROOT, file)} (touch)`);
  }

  console.log("Klaar.");
}

// ── Render enkel bestand ─────────────────────────────────────────────────────

async function renderFile(filePath, browser) {
  const blocks = extractMermaidBlocks(filePath);
  if (blocks.length === 0) return;

  const work = [];
  for (const block of blocks) {
    const svgDir = join(RENDER_DIR, block.subdir);
    mkdirSync(svgDir, { recursive: true });
    for (const variant of ["light", "dark"]) {
      const svgPath = join(svgDir, `${block.slug}-${variant}.svg`);
      const hash = computeHash(`${block.code}:${variant}:${TOKENS_HASH}`);
      if (isUpToDate(svgPath, hash)) continue;
      work.push({ block, variant, svgPath, hash });
    }
  }

  if (work.length === 0) return;

  const ownBrowser = !browser;
  if (ownBrowser) browser = await puppeteer.launch({ args: PUPPETEER_ARGS });
  try {
    for (const { block, variant, svgPath, hash } of work) {
      console.log(`  → ${relative(ROOT, svgPath)}`);
      const data = await renderDiagram(browser, resolveDiagramTokens(block.code, variant), renderOptions(variant));
      writeFileSync(svgPath, postProcessSVG(data));
      writeHash(svgPath, hash);
    }
  } finally {
    if (ownBrowser) await browser.close();
  }

  const now = new Date();
  utimesSync(filePath, now, now);
  console.log(`  ↻ ${relative(ROOT, filePath)} (touch)`);
}

// ── Watch mode ───────────────────────────────────────────────────────────────

async function startWatch() {
  console.log("Watching content/ voor wijzigingen...");
  const browser = await puppeteer.launch({ args: PUPPETEER_ARGS });
  let debounce;
  let rendering = false;
  const pending = new Set();

  async function processQueue() {
    if (rendering) return;
    rendering = true;
    try {
      while (pending.size > 0) {
        const files = [...pending];
        pending.clear();
        for (const filePath of files) {
          await renderFile(filePath, browser);
        }
      }
    } catch (err) {
      console.error(err);
    }
    rendering = false;
  }

  watch(CONTENT_DIR, { recursive: true }, (_, filename) => {
    if (!filename || !filename.endsWith(".md")) return;
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      const filePath = join(CONTENT_DIR, filename);
      if (!existsSync(filePath)) return;
      console.log(`\nWijziging gedetecteerd: ${filename}`);
      pending.add(filePath);
      processQueue();
    }, 300);
  });

  process.on("SIGINT", async () => {
    await browser.close();
    process.exit(0);
  });
}

// ── Exports (voor tests) ─────────────────────────────────────────────────────

export { slugify, extractMermaidBlocks, contentSubdir, parseTokens, resolveToken, oklchToHex, buildThemes, resolveDiagramTokens, postProcessSVG, computeHash, TOKENS_HASH };

// ── CLI ──────────────────────────────────────────────────────────────────────

const isCLI = process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.dirname, "render-mermaid.js");

if (isCLI) {
  const isWatch = process.argv.includes("--watch");
  renderAll().then(async () => {
    if (isWatch) await startWatch();
  });
}
