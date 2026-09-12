import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { generate as generateTokens } from "./nldd-tokens.js";
import { generate as generateIconen, generateRaster, copies, FAVICON_ICO } from "./nldd-iconen.js";

const ROOT = resolve(import.meta.dirname, "..");
const kort = (path) => relative(ROOT, path);
// Breedte en hoogte staan in de IHDR-chunk van een PNG, op vaste posities
const pngMaat = (buf) => [buf.readUInt32BE(16), buf.readUInt32BE(20)];
// De maten in een ICO staan als losse bytes in de index, 0 voor 256
const icoMaten = (buf) => Array.from({ length: buf.readUInt16LE(4) }, (_, i) => buf[6 + i * 16] || 256);

const tekstbestanden = { ...generateTokens(), ...(await generateIconen()) };
const rasterbestanden = await generateRaster();

// Bewaakt dat de gegenereerde bestanden in git gelijk zijn aan wat het
// geïnstalleerde @nldd/design-system oplevert. Faalt dus ook na een upgrade
// van het pakket waarbij de generatoren niet opnieuw zijn gedraaid.
describe("gegenereerde NLDD-bestanden zijn bijgewerkt", () => {
  for (const [path, verwacht] of Object.entries(tekstbestanden)) {
    it(kort(path), () => {
      assert.equal(readFileSync(path, "utf-8"), verwacht, `${kort(path)} is verouderd, draai \`just nldd\``);
    });
  }

  for (const [target, source] of Object.entries(copies())) {
    it(kort(target), () => {
      assert.deepEqual(readFileSync(target), readFileSync(source), `${kort(target)} is verouderd, draai \`just nldd\``);
    });
  }

  // De rasterbytes kunnen per Chromium-versie verschillen, dus alleen de maten
  for (const [path, verwacht] of Object.entries(rasterbestanden)) {
    const ico = path.endsWith(".ico");
    const maten = (buf) => (ico ? icoMaten(buf) : pngMaat(buf));
    it(kort(path), () => {
      const verwachteMaten = ico ? [...FAVICON_ICO].sort((a, b) => a - b) : pngMaat(verwacht);
      assert.deepEqual(maten(readFileSync(path)), verwachteMaten, `${kort(path)} ontbreekt of heeft de verkeerde maat, draai \`just nldd\``);
      assert.deepEqual(maten(verwacht), verwachteMaten);
    });
  }
});
