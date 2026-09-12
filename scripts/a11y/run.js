#!/usr/bin/env node

/**
 * Toets de gebouwde site op WCAG 2.1 AA met pa11y-ci.
 *
 * Draait NA de Hugo-build op de outputmap (standaard `tmp/public`). Serveert
 * die map over HTTP, genereert een pa11y-configuratie met alle routes uit de
 * build, en draait pa11y-ci met twee onafhankelijke engines: HTML_CodeSniffer
 * en axe-core. Ze vinden deels verschillende dingen, vandaar allebei.
 *
 * Een geautomatiseerde toets dekt ongeveer een derde van de WCAG-eisen. Deze
 * gate bewaakt regressies; hij vervangt geen WCAG-EM-onderzoek.
 *
 * Gebruik:
 *   node scripts/a11y/run.js [outputmap]
 */

import { writeFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { spawn } from "node:child_process";
import { collectRoutes } from "./routes.js";
import { startServer } from "../lib/static-server.js";
import { PUPPETEER_ARGS as CHROME_ARGS } from "../lib/puppeteer-args.js";

const OUTPUT_DIR = resolve(process.cwd(), process.argv[2] || join("tmp", "public"));
const CONFIG_FILE = join(dirname(OUTPUT_DIR), "pa11yci.json");


function buildConfig(baseUrl, routes) {
  return {
    defaults: {
      standard: "WCAG2AA",
      runners: ["htmlcs", "axe"],
      // Bevindingen die axe niet zeker weet ("incomplete") mogen de build niet
      // laten falen; ze horen thuis in de handmatige toets.
      levelCapWhenNeedsReview: "warning",
      timeout: 60000,
      concurrency: 4,
      // Een eigen browsercontext per pagina faalt op puppeteer 25 met
      // "Target.closeTarget: No target with given id found".
      useIncognitoBrowserContext: false,
      chromeLaunchConfig: { args: CHROME_ARGS },
    },
    urls: routes.map((route) => `${baseUrl}${route}`),
  };
}

async function main() {
  if (!existsSync(OUTPUT_DIR)) {
    console.error(`Outputmap ${OUTPUT_DIR} bestaat niet. Bouw de site eerst.`);
    process.exit(1);
  }

  const routes = collectRoutes(OUTPUT_DIR);
  if (routes.length === 0) {
    console.error(`Geen routes gevonden in ${OUTPUT_DIR}.`);
    process.exit(1);
  }

  const server = await startServer(OUTPUT_DIR);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  // Zonder deze controle loopt een stille serverfout uit op 80 timeouts.
  const probe = await fetch(`${baseUrl}${routes[0]}`).catch(() => null);
  if (!probe?.ok) {
    server.close();
    console.error(`Webserver op ${baseUrl} antwoordt niet; toets afgebroken.`);
    process.exit(1);
  }

  writeFileSync(CONFIG_FILE, JSON.stringify(buildConfig(baseUrl, routes), null, 2));
  console.log(`Toegankelijkheidstoets op ${routes.length} pagina('s)...`);

  // Niet spawnSync: de webserver draait in dit proces en zou achter een
  // blokkerende aanroep geen enkele request beantwoorden.
  const status = await new Promise((resolve) => {
    const child = spawn("npx", ["pa11y-ci", "--config", CONFIG_FILE], { stdio: "inherit" });
    child.on("close", (code) => resolve(code ?? 1));
  });

  server.close();
  process.exit(status);
}

main().catch((err) => {
  console.error("Fout bij toegankelijkheidstoets:", err.message);
  process.exit(1);
});
