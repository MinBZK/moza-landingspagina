#!/usr/bin/env node

/**
 * Genereer downloadbestanden (.odt en .pdf) voor pagina's met `downloads: true`.
 *
 * Draait NA de Hugo-build op de outputmap (standaard `public`). Leest het
 * manifest `downloads.json` (door Hugo gegenereerd) en maakt per pagina:
 *   - <naam>.odt  via pandoc, uit de door Hugo gegenereerde index.md
 *   - <naam>.pdf  via Puppeteer, door de gebouwde HTML-pagina af te drukken
 *
 * De PDF gebruikt de echte sitestijl: een tijdelijke webserver serveert de
 * outputmap, zodat de root-relatieve CSS/JS/fonts laden. De afdrukstijl
 * (@media print in components/print.css) verbergt de site-omgeving.
 *
 * Gebruik:
 *   node scripts/render-downloads.js [outputmap]   # standaard: public
 */

import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, delimiter } from "node:path";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer";
import { startServer } from "../lib/static-server.js";
import { setPdfMetadata } from "./pdf-metadata.js";

const OUTPUT_DIR = resolve(process.cwd(), process.argv[2] || "public");
const MANIFEST = join(OUTPUT_DIR, "download.json");
// Pandoc-stijlsjabloon: Verdana 10pt, passende koppen, opgemaakte note. Zie
// README.md in deze map voor hoe dit bestand is afgeleid van pandocs default.
const REFERENCE_ODT = join(import.meta.dirname, "reference.odt");
// Bronbestand van het logo. Hugo kopieert dit naar public/images, maar we lezen
// de bron zodat het ook werkt zonder volledige build.
const LOGO_SVG = join(
  import.meta.dirname, "..", "..", "static", "images", "logo-rijksoverheid.svg"
);

// In CI of als root (container) heeft Chromium deze vlaggen nodig.
const PUPPETEER_ARGS =
  process.env.CI || process.getuid?.() === 0
    ? ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"]
    : [];

// ── Generatie ────────────────────────────────────────────────────────────────

function checkPandoc() {
  try {
    execFileSync("pandoc", ["--version"], { stdio: "ignore" });
  } catch {
    throw new Error(
      "pandoc is niet gevonden. Installeer pandoc (bv. `brew install pandoc` of `apk add pandoc`)."
    );
  }
}

// Documenttitel (H1) + bron-URL en beschrijving uit de front matter van de
// gegenereerde index.md — voor onzichtbare documenteigenschappen in ODF en PDF.
function parseDocMeta(mdFile) {
  const raw = readFileSync(mdFile, "utf-8");
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
  const fm = fmMatch ? fmMatch[1] : "";
  const field = (key) => {
    const m = fm.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, "m"));
    return m ? m[1].trim() : "";
  };
  const titleMatch = raw.match(/^#\s+(.+?)\s*$/m);
  return {
    title: titleMatch ? titleMatch[1].trim() : "",
    url: field("url"),
    description: field("description"),
  };
}

function setOdtMetadata(odtOut, meta) {
  if (!meta.title) return;
  const esc = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let xml = execFileSync("unzip", ["-p", odtOut, "meta.xml"]).toString("utf-8");
  const title = `<dc:title>${esc(meta.title)}</dc:title>`;
  if (/<dc:title>\s*<\/dc:title>/.test(xml)) {
    xml = xml.replace(/<dc:title>\s*<\/dc:title>/, title);
  } else if (xml.includes("</office:meta>") && !xml.includes("<dc:title")) {
    xml = xml.replace("</office:meta>", `${title}</office:meta>`);
  } else {
    return;
  }
  const tmp = mkdtempSync(join(tmpdir(), "odt-meta-"));
  try {
    writeFileSync(join(tmp, "meta.xml"), xml);
    execFileSync("zip", ["-q", odtOut, "meta.xml"], {
      cwd: tmp,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function flattenOdtQuotations(odtOut) {
  let xml = execFileSync("unzip", ["-p", odtOut, "content.xml"]).toString("utf-8");
  let changed = false;
  xml = xml.replace(
    /<style:style\b[^>]*style:parent-style-name="Quotations"[^>]*>[\s\S]*?<\/style:style>/g,
    (block) => {
      const fixed = block
        .replace(/fo:margin-left="[^"]*"/g, 'fo:margin-left="0in"')
        .replace(/fo:text-indent="[^"]*"/g, 'fo:text-indent="0in"');
      if (fixed !== block) changed = true;
      return fixed;
    }
  );
  if (!changed) return;
  const tmp = mkdtempSync(join(tmpdir(), "odt-quote-"));
  try {
    writeFileSync(join(tmp, "content.xml"), xml);
    execFileSync("zip", ["-q", odtOut, "content.xml"], {
      cwd: tmp,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function renderOdt(mdFile, odtOut, pageDir, meta) {
  const args = [mdFile, "--metadata", "lang=nl", "--resource-path", `${pageDir}${delimiter}${OUTPUT_DIR}`];
  if (existsSync(REFERENCE_ODT)) args.push("--reference-doc", REFERENCE_ODT);
  args.push("-o", odtOut);
  execFileSync("pandoc", args, { stdio: ["pipe", "pipe", "pipe"] });
  flattenOdtQuotations(odtOut);
  setOdtMetadata(odtOut, meta);
}

let logoDataUri;
function rijksoverheidLogoDataUri() {
  if (!logoDataUri) {
    const svg = readFileSync(LOGO_SVG);
    logoDataUri = `data:image/svg+xml;base64,${svg.toString("base64")}`;
  }
  return logoDataUri;
}

async function renderPdf(page, baseUrl, relPermalink, pdfOut, meta) {
  await page.emulateMediaFeatures([
    { name: "prefers-color-scheme", value: "light" },
  ]);
  await page.goto(baseUrl + relPermalink, { waitUntil: "networkidle0" });

  // Verberg het losse print-logo (dat is voor browser-printen, Ctrl/Cmd-P); deze
  // PDF heeft al een doorlopende logo-header via Puppeteer.
  await page.evaluate(() => document.documentElement.classList.add("pdf-export"));

  const headerTemplate = `
    <div style="width:100%; margin:-6mm 0 6mm 0; text-align:center;">
      <img src="${rijksoverheidLogoDataUri()}" style="height:23mm; width:auto;" alt="" />
    </div>`;
  // Alleen het paginanummer, gecentreerd onderaan (consistent met de ODF).
  const footerTemplate = `
    <div style="width:100%; margin:0; font-size:10pt; text-align:center; color:#1a1a1a;">
      <span class="pageNumber"></span>
    </div>`;

  // Chrome neemt de documenttitel over als PDF-titel. Die moet gezet zijn vóór
  // het afdrukken; achteraf de PDF openen en herschrijven kost de tagging.
  await page.evaluate((t) => {
    if (t) document.title = t;
  }, meta.title);

  await page.pdf({
    path: pdfOut,
    format: "A4",
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate,
    footerTemplate,
    margin: { top: "30mm", bottom: "20mm", left: "18mm", right: "18mm" },
  });

  setPdfMetadata(pdfOut, {
    title: meta.title,
    description: meta.description,
    url: meta.url,
    creator: "MijnOverheid Zakelijk",
  });
}

async function main() {
  if (!existsSync(MANIFEST)) {
    console.log(`Geen ${MANIFEST} gevonden — niets te genereren.`);
    return;
  }

  const entries = JSON.parse(readFileSync(MANIFEST, "utf-8"));
  if (!Array.isArray(entries) || entries.length === 0) {
    console.log("Geen pagina's met downloads — niets te genereren.");
    return;
  }

  checkPandoc();

  const server = await startServer(OUTPUT_DIR);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  const browser = await puppeteer.launch({ args: PUPPETEER_ARGS });

  try {
    const page = await browser.newPage();
    for (const { relPermalink, name } of entries) {
      const pageDir = join(OUTPUT_DIR, relPermalink);
      const mdFile = join(pageDir, "index.md");
      if (!existsSync(mdFile)) {
        console.warn(`  ⚠ ${relPermalink}: index.md ontbreekt, overgeslagen`);
        continue;
      }
      const odtOut = join(pageDir, `${name}.odt`);
      const pdfOut = join(pageDir, `${name}.pdf`);

      const docMeta = parseDocMeta(mdFile);
      renderOdt(mdFile, odtOut, pageDir, docMeta);
      console.log(`  ✓ ${relPermalink}${name}.odt`);

      await renderPdf(page, baseUrl, relPermalink, pdfOut, docMeta);
      console.log(`  ✓ ${relPermalink}${name}.pdf`);
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`Downloads gegenereerd voor ${entries.length} pagina('s).`);
}

main().catch((err) => {
  console.error("Fout bij genereren downloads:", err.message);
  process.exit(1);
});
