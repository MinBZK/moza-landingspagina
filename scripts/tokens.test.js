import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseTokens, resolveToken } from "./render-mermaid.js";

const ROOT = join(import.meta.dirname, "..");

// Tokenbestanden die naar NLDD-primitives verwijzen. Een hernoemde primitive
// (bijvoorbeeld na een upgrade van @nldd/design-system) valt anders stil terug
// op niets: de browser negeert de declaratie en de kleur verdwijnt.
const TOKEN_FILES = ["assets/css/tokens.css", "assets/css/rapportages.css", "assets/css/rapportage-nav.css"];
const PRIMITIVES_FILE = "assets/css/nldd-primitives.css";

function definedNames(css) {
  return new Set([...css.matchAll(/(--[\w-]+):/g)].map((m) => m[1]));
}

function referencedNames(css) {
  return [...css.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]);
}

const primitives = definedNames(readFileSync(join(ROOT, PRIMITIVES_FILE), "utf-8"));

describe("tokens verwijzen naar bestaande primitives", () => {
  for (const file of TOKEN_FILES) {
    it(file, () => {
      const css = readFileSync(join(ROOT, file), "utf-8");
      const local = definedNames(css);
      const missing = referencedNames(css).filter((name) => name.startsWith("--primitives-") && !primitives.has(name) && !local.has(name));
      assert.deepEqual([...new Set(missing)], [], `onbekende primitives in ${file}`);
    });
  }
});

describe("kleurtokens van de site resolven naar een kleur", () => {
  const vars = parseTokens();
  const colorTokens = Object.keys(vars).filter((name) => name.startsWith("--color-"));

  it("er zijn kleurtokens", () => {
    assert.ok(colorTokens.length > 5, "verwacht kleurtokens in tokens.css");
  });

  for (const name of colorTokens) {
    it(name, () => {
      for (const variant of ["light", "dark"]) {
        const value = resolveToken(vars, name, variant);
        assert.doesNotMatch(value, /var\(/, `${name} (${variant}) bevat nog een var(): ${value}`);
        assert.ok(value.length > 0, `${name} (${variant}) is leeg`);
      }
    });
  }
});
