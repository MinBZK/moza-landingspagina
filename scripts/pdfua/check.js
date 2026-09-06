/**
 * Toetst de gegenereerde PDF's tegen PDF/UA (ISO 14289-1) met veraPDF.
 *
 * Gebruik:
 *   node scripts/pdfua/check.js [map]      # standaard: tmp/public
 */
import { execFileSync } from "node:child_process";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const map = process.argv[2] || "tmp/public";

function zoekPdfs(dir) {
  const gevonden = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const pad = join(dir, entry.name);
    if (entry.isDirectory()) gevonden.push(...zoekPdfs(pad));
    else if (entry.name.endsWith(".pdf")) gevonden.push(pad);
  }
  return gevonden;
}

const pdfs = existsSync(map) ? zoekPdfs(map) : [];
if (!pdfs.length) {
  console.error(`Geen PDF's gevonden in ${map}. Draai eerst de downloadstap.`);
  process.exit(1);
}

let rapport;
try {
  rapport = execFileSync("verapdf", ["--format", "mrr", "--flavour", "ua1", ...pdfs], {
    encoding: "utf-8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  });
} catch (err) {
  if (err.code === "ENOENT") {
    console.error("veraPDF niet gevonden. Installeren met: brew install verapdf");
    process.exit(1);
  }
  // veraPDF sluit met een foutcode zodra één bestand zakt; de uitvoer klopt wel.
  rapport = err.stdout ?? "";
  if (!rapport) throw err;
}

const perRegel = new Map();
const regel = /<rule [^>]*clause="([\d.]+)" testNumber="(\d+)" status="failed" failedChecks="(\d+)"/g;
for (const m of rapport.matchAll(regel)) {
  const sleutel = `${m[1]}-${m[2]}`;
  perRegel.set(sleutel, (perRegel.get(sleutel) || 0) + Number(m[3]));
}

const gezakt = [...rapport.matchAll(/<validationReport[^>]*isCompliant="false"[\s\S]*?<\/job>/g)].length;

console.log(`PDF/UA-toets op ${pdfs.length} PDF('s).`);
if (!perRegel.size) {
  console.log("Alle bestanden voldoen aan PDF/UA deel 1.");
  process.exit(0);
}

console.error(`\n${gezakt || "Een of meer"} bestand(en) voldoen niet:`);
for (const [sleutel, aantal] of [...perRegel].sort((a, b) => b[1] - a[1])) {
  console.error(`  ${sleutel}: ${aantal} melding(en)`);
}
console.error(
  "\nDe PDF's claimen PDF/UA in hun metadata, dus een melding is een echte fout.\n" +
    "Draai `verapdf --format mrr --flavour ua1 <bestand>` voor de details."
);
process.exit(1);
