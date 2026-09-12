#!/usr/bin/env node

/**
 * Toets de bedienbaarheid van Reveal.js-presentaties.
 *
 * pa11y bereikt hier alleen de zichtbare slide en axe kan het contrast niet
 * berekenen, maar het gedrag is wél te meten: navigeren met het toetsenbord,
 * de aankondiging van een slidewissel, en of de focus de presentatie weer
 * verlaat. Wat overblijft voor handwerk is of dat ook prettig klinkt.
 *
 * Gebruik:
 *   node scripts/a11y/presentaties.js [outputmap]
 */

import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import puppeteer from "puppeteer";
import { collectRoutes } from "./routes.js";
import { startServer } from "../lib/static-server.js";
import { PUPPETEER_ARGS } from "../lib/puppeteer-args.js";

const OUTPUT_DIR = resolve(process.cwd(), process.argv[2] || join("tmp", "public"));
const MAX_TABS = 20;

function presentatieRoutes(root) {
  return collectRoutes(root).filter((route) => {
    if (!route.endsWith("/")) return false;
    const file = join(root, route, "index.html");
    return existsSync(file) && readFileSync(file, "utf-8").includes('class="reveal"');
  });
}

async function toets(page, baseUrl, route) {
  const findings = [];
  await page.goto(baseUrl + route, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => window.Reveal?.isReady?.(), { timeout: 15000 });

  const knop = await page.$(".close-button");
  if (!knop) {
    findings.push("geen sluitknop gevonden");
  } else {
    const tabIndex = await knop.evaluate((b) => b.tabIndex);
    // De naam uit de toegankelijkheidsboom, niet uit het attribuut: zo telt
    // ook de terugval op tekstinhoud mee zoals de browser die berekent.
    const naam = (await page.accessibility.snapshot({ root: knop }))?.name ?? "";
    if (tabIndex < 0) findings.push("sluitknop is niet met het toetsenbord bereikbaar");
    // Een icoon als ✕ levert wel een naam op, maar geen die iets zegt.
    else if (!/\p{L}/u.test(naam)) {
      findings.push(`sluitknop heeft geen tekstuele naam (nu: "${naam}")`);
    }
  }

  const lees = () =>
    page.evaluate(() => document.querySelector("[aria-live]")?.textContent.trim() ?? null);
  const voor = await lees();
  if (voor === null) findings.push("geen live region; een slidewissel wordt niet aangekondigd");

  const slideVoor = await page.evaluate(() => window.Reveal.getState());
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(
    (s) => JSON.stringify(window.Reveal.getState()) !== JSON.stringify(s),
    { timeout: 5000 },
    slideVoor
  ).catch(() => findings.push("pijltje rechts wisselt niet van slide"));

  // Reveal werkt de live region net ná de state-wissel bij, dus erop wachten.
  if (voor !== null) {
    await page
      .waitForFunction(
        (t) => document.querySelector("[aria-live]")?.textContent.trim() !== t,
        { timeout: 5000 },
        voor
      )
      .catch(() => findings.push("live region verandert niet bij een slidewissel"));
  }

  // Blijft de focus in de presentatie hangen?
  const gezien = [];
  for (let i = 0; i < MAX_TABS; i++) {
    await page.keyboard.press("Tab");
    gezien.push(await page.evaluate(() => document.activeElement?.tagName ?? "geen"));
  }
  if (!gezien.includes("BODY")) {
    findings.push(`focus verlaat de presentatie niet binnen ${MAX_TABS} tabs`);
  }

  return findings;
}

async function main() {
  if (!existsSync(OUTPUT_DIR)) {
    console.error(`Outputmap ${OUTPUT_DIR} bestaat niet. Bouw de site eerst.`);
    process.exit(1);
  }

  const routes = presentatieRoutes(OUTPUT_DIR);
  if (routes.length === 0) {
    console.log("Geen presentaties gevonden.");
    return;
  }

  const server = await startServer(OUTPUT_DIR);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const browser = await puppeteer.launch({ args: PUPPETEER_ARGS });
  let total = 0;

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 900 });

    for (const route of routes) {
      const findings = await toets(page, baseUrl, route);
      if (findings.length === 0) continue;
      console.error(`\n${route}`);
      for (const f of findings) console.error(`  ✗ ${f}`);
      total += findings.length;
    }
  } finally {
    await browser.close();
    server.close();
  }

  if (total > 0) {
    console.error(`\n${total} bevinding(en) in ${routes.length} presentatie(s).`);
    process.exit(1);
  }

  console.log(`Bedienbaarheid in orde in ${routes.length} presentatie(s).`);
}

main().catch((err) => {
  console.error("Fout bij toetsen van presentaties:", err.message);
  process.exit(1);
});
