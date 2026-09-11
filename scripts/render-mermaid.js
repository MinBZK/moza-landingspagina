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
import { createHash } from "node:crypto";
import puppeteer from "puppeteer";

const ROOT = resolve(import.meta.dirname, "..");
const CONTENT_DIR = join(ROOT, "content");
const RENDER_DIR = join(ROOT, "static", "images", "render");
const CACHE_DIR = join(ROOT, ".cache", "mermaid");
const FONTS_DIR = join(ROOT, "static", "fonts");

// ── Theme from design tokens ────────────────────────────────────────────────

const TOKENS_FILE = join(ROOT, "assets", "css", "tokens.css");

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
  const css = readFileSync(TOKENS_FILE, "utf-8");
  const vars = {};
  for (const [, name, value] of css.matchAll(/(--[\w-]+):\s*([^;]+)/g)) {
    vars[name] = value.trim();
  }
  return vars;
}

// Lost één niveau var()-referenties op. Alle tokens in tokens.css resolven
// direct naar een eindwaarde, dus diepere nesting is niet nodig.
function resolveVars(vars, value) {
  return value.replace(/var\((--[\w-]+)\)/g, (_, name) => vars[name] ?? name);
}

function lightDarkValues(vars, tokenName) {
  const raw = resolveVars(vars, vars[tokenName] ?? "");
  const m = raw.match(/light-dark\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/);
  return m ? [m[1].trim(), m[2].trim()] : [raw, raw];
}

function buildThemes() {
  const vars = parseTokens();
  const light = { darkMode: false };
  const dark = { darkMode: true };
  for (const [key, token] of Object.entries(TOKEN_MAP)) {
    const [l, d] = lightDarkValues(vars, token);
    light[key] = l;
    dark[key] = d;
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
  const index = variant === "dark" ? 1 : 0;
  return code.replace(/var\((--[\w-]+)\)/g, (match, name) => {
    if (!(name in vars)) {
      console.warn(`  ⚠ onbekend token ${name} in mermaid-blok`);
      return match;
    }
    return lightDarkValues(vars, name)[index];
  });
}

// ── Font embedding ───────────────────────────────────────────────────────────

const FONT_FILES = [
  { file: "RO-SansWebText-Regular.woff2", weight: "400" },
  { file: "RO-SansWebText-Bold.woff2", weight: "700" },
];

let fontCSS;
function getFontCSS() {
  if (fontCSS !== undefined) return fontCSS;
  fontCSS = FONT_FILES.map(({ file, weight }) => {
    const buf = readFileSync(join(FONTS_DIR, file));
    const b64 = buf.toString("base64");
    return `@font-face{font-family:"RO-Sans";src:url("data:font/woff2;base64,${b64}") format("woff2");font-weight:${weight};font-style:normal}`;
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
const TOKENS_HASH = computeHash(readFileSync(TOKENS_FILE, "utf-8")).slice(0, 8);

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

const PUPPETEER_ARGS = process.env.CI || process.getuid?.() === 0
  ? ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"]
  : [];

// Pad naar de mermaid IIFE (zet globalThis.mermaid)
const mermaidIIFEPath = join(ROOT, "node_modules", "mermaid", "dist", "mermaid.js");

// Laad icon packs lokaal uit node_modules (geen netwerk nodig)
function loadLocalIconPack(name) {
  const jsonPath = join(ROOT, "node_modules", name, "icons.json");
  try {
    return JSON.parse(readFileSync(jsonPath, "utf-8"));
  } catch (err) {
    console.warn(`  ⚠ Icon pack "${name}" niet gevonden: ${err.message}`);
    return {};
  }
}

async function renderDiagram(browser, definition, { backgroundColor, mermaidConfig, iconPacks = [] }) {
  const page = await browser.newPage();
  try {
    await page.setContent('<html><body><div id="container"></div></body></html>');

    // Font CSS injecteren VOOR Mermaid rendert, zodat tekstmeting het juiste font gebruikt
    await page.addStyleTag({ content: getFontCSS() });
    await page.addScriptTag({ path: mermaidIIFEPath });

    // Laad icon packs lokaal (geen netwerk nodig)
    const iconData = iconPacks.map((name) => ({
      prefix: name.split("/")[1],
      data: loadLocalIconPack(name),
    }));

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
        fontFamily: '"RO-Sans", Calibri, sans-serif',
      },
    },
    iconPacks: ["@iconify-json/tabler"],
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

export { slugify, extractMermaidBlocks, contentSubdir, parseTokens, buildThemes, resolveDiagramTokens, postProcessSVG, computeHash, TOKENS_HASH };

// ── CLI ──────────────────────────────────────────────────────────────────────

const isCLI = process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.dirname, "render-mermaid.js");

if (isCLI) {
  const isWatch = process.argv.includes("--watch");
  renderAll().then(async () => {
    if (isWatch) await startWatch();
  });
}
