import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { BREEDTE, HOOGTE, OUTPUT } from "./social-card.js";

const ROOT = resolve(import.meta.dirname, "..");

// Een JPEG is een reeks segmenten; de maat staat in de SOF-kop, die als enige
// niet op een vaste plek ligt omdat er variabele segmenten voor kunnen staan
function jpegMaat(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) throw new Error("geen geldige JPEG");
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  throw new Error("geen SOF-segment gevonden");
}

describe(relative(ROOT, OUTPUT), () => {
  it("heeft de maat die de platforms verwachten", () => {
    assert.deepEqual(jpegMaat(readFileSync(OUTPUT)), [BREEDTE, HOOGTE]);
  });
});
