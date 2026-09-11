import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { slugify, extractMermaidBlocks, contentSubdir, parseTokens, buildThemes, resolveDiagramTokens, postProcessSVG, computeHash, TOKENS_HASH } from "./render-mermaid.js";

const ROOT = join(import.meta.dirname, "..");

// ── slugify ─────────────────────────────────────────────────────────────────

describe("slugify", () => {
  it("eenvoudige tekst", () => {
    assert.equal(slugify("Klantreis ondernemer"), "klantreis-ondernemer");
  });

  it("speciale tekens worden gestript", () => {
    assert.equal(slugify("N:M-model Profielservice"), "nm-model-profielservice");
  });

  it("meerdere spaties worden één hyphen", () => {
    assert.equal(slugify("woord   woord"), "woord-woord");
  });

  it("leading en trailing hyphens worden gestript", () => {
    assert.equal(slugify("-start en eind-"), "start-en-eind");
  });

  it("opeenvolgende hyphens worden samengevoegd", () => {
    assert.equal(slugify("a---b"), "a-b");
  });

  it("hoofdletters worden lowercase", () => {
    assert.equal(slugify("ABC DEF"), "abc-def");
  });

  it("cijfers blijven behouden", () => {
    assert.equal(slugify("stap 1 van 3"), "stap-1-van-3");
  });

  it("lege string", () => {
    assert.equal(slugify(""), "");
  });

  it("alleen speciale tekens", () => {
    assert.equal(slugify(":::"), "");
  });
});

// ── extractMermaidBlocks ────────────────────────────────────────────────────

describe("extractMermaidBlocks", () => {
  const tmpDir = join(import.meta.dirname, "..", ".cache", "test-tmp");

  after(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeTmpMd(name, content) {
    mkdirSync(tmpDir, { recursive: true });
    const path = join(tmpDir, name);
    writeFileSync(path, content);
    return path;
  }

  it("vindt mermaid blokken met accTitle en accDescr", () => {
    const path = writeTmpMd("test1.md", [
      "# Titel",
      "",
      "```mermaid",
      "graph LR",
      "  accTitle: Mijn diagram",
      "  accDescr: Beschrijving van het diagram.",
      "  A --> B",
      "```",
      "",
    ].join("\n"));

    const blocks = extractMermaidBlocks(path);
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].slug, "mijn-diagram");
    assert.equal(blocks[0].title, "Mijn diagram");
    assert.equal(blocks[0].description, "Beschrijving van het diagram.");
    assert.equal(blocks[0].sourceFile, path);
    assert.ok(blocks[0].subdir, "verwacht een subdir");
  });

  it("fallback slug bij ontbrekende accTitle", () => {
    const path = writeTmpMd("test2.md", [
      "```mermaid",
      "graph LR",
      "  A --> B",
      "```",
    ].join("\n"));

    const blocks = extractMermaidBlocks(path);
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].slug, "diagram-1");
  });

  it("dubbele accTitle krijgt suffix", () => {
    const path = writeTmpMd("test3.md", [
      "```mermaid",
      "graph LR",
      "  accTitle: Zelfde titel",
      "  A --> B",
      "```",
      "",
      "```mermaid",
      "graph LR",
      "  accTitle: Zelfde titel",
      "  C --> D",
      "```",
    ].join("\n"));

    const blocks = extractMermaidBlocks(path);
    assert.equal(blocks.length, 2);
    assert.equal(blocks[0].slug, "zelfde-titel");
    assert.equal(blocks[1].slug, "zelfde-titel-2");
  });

  it("multiline accDescr", () => {
    const path = writeTmpMd("test4.md", [
      "```mermaid",
      "graph LR",
      "  accTitle: Test",
      "  accDescr {",
      "    Eerste regel.",
      "    Tweede regel.",
      "  }",
      "  A --> B",
      "```",
    ].join("\n"));

    const blocks = extractMermaidBlocks(path);
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].description, "Eerste regel. Tweede regel.");
  });

  it("meerdere blokken in één bestand", () => {
    const path = writeTmpMd("test5.md", [
      "```mermaid",
      "graph LR",
      "  accTitle: Eerste",
      "  A --> B",
      "```",
      "",
      "Tekst ertussen",
      "",
      "```mermaid",
      "graph LR",
      "  accTitle: Tweede",
      "  C --> D",
      "```",
    ].join("\n"));

    const blocks = extractMermaidBlocks(path);
    assert.equal(blocks.length, 2);
    assert.equal(blocks[0].slug, "eerste");
    assert.equal(blocks[1].slug, "tweede");
  });

  it("geen mermaid blokken", () => {
    const path = writeTmpMd("test6.md", "# Gewone pagina\n\nGeen diagrammen hier.\n");
    const blocks = extractMermaidBlocks(path);
    assert.equal(blocks.length, 0);
  });
});

// ── contentSubdir ───────────────────────────────────────────────────────────

describe("contentSubdir", () => {
  it("los bestand → dir + basename als subdir", () => {
    // content/onderwerpen/profielservice.md → onderwerpen/profielservice
    const result = contentSubdir(join(ROOT, "content", "onderwerpen", "profielservice.md"));
    assert.equal(result, join("onderwerpen", "profielservice"));
  });

  it("index.md → alleen de directory", () => {
    // content/onderwerpen/profielservice/index.md → onderwerpen/profielservice
    const result = contentSubdir(join(ROOT, "content", "onderwerpen", "profielservice", "index.md"));
    assert.equal(result, join("onderwerpen", "profielservice"));
  });

  it("_index.md → alleen de directory", () => {
    // content/onderwerpen/_index.md → onderwerpen
    const result = contentSubdir(join(ROOT, "content", "onderwerpen", "_index.md"));
    assert.equal(result, "onderwerpen");
  });
});

// ── parseTokens & buildThemes ───────────────────────────────────────────────

describe("parseTokens", () => {
  it("parseert CSS variabelen uit tokens.css", () => {
    const vars = parseTokens();
    assert.ok(vars["--color-primary"], "verwacht --color-primary");
    assert.ok(vars["--color-bg-muted"], "verwacht --color-bg-muted");
    assert.ok(vars["--color-text"], "verwacht --color-text");
  });
});

describe("buildThemes", () => {
  it("genereert light en dark thema", () => {
    const themes = buildThemes();
    assert.equal(themes.light.darkMode, false);
    assert.equal(themes.dark.darkMode, true);
    assert.ok(themes.light.primaryColor, "verwacht light primaryColor");
    assert.ok(themes.dark.primaryColor, "verwacht dark primaryColor");
    assert.notEqual(themes.light.primaryColor, themes.dark.primaryColor, "light en dark kleuren moeten verschillen");
  });

  it("alle thema-waarden resolven naar hex-kleuren", () => {
    const themes = buildThemes();
    const hexRe = /^#[0-9a-fA-F]{3,8}$/;
    for (const variant of ["light", "dark"]) {
      for (const [key, val] of Object.entries(themes[variant])) {
        if (key === "darkMode") continue;
        assert.match(val, hexRe, `${variant}.${key} = "${val}" is geen hex-kleur`);
      }
    }
  });

  it("TOKENS_HASH is 8 tekens hex", () => {
    assert.equal(TOKENS_HASH.length, 8);
    assert.match(TOKENS_HASH, /^[a-f0-9]{8}$/);
  });
});

// ── resolveDiagramTokens ────────────────────────────────────────────────────

describe("resolveDiagramTokens", () => {
  const code = "classDef bron stroke:var(--color-primary),color:var(--color-text);";

  it("vervangt tokens door de light-waarde", () => {
    assert.equal(
      resolveDiagramTokens(code, "light"),
      "classDef bron stroke:#154273,color:#0f172a;",
    );
  });

  it("vervangt tokens door de dark-waarde", () => {
    assert.equal(
      resolveDiagramTokens(code, "dark"),
      "classDef bron stroke:#80d5fc,color:#e2e8f0;",
    );
  });

  it("token zonder light-dark krijgt in beide varianten dezelfde waarde", () => {
    const oranje = "classDef x stroke:var(--color-rijks-oranje);";
    assert.equal(resolveDiagramTokens(oranje, "light"), "classDef x stroke:#e17000;");
    assert.equal(resolveDiagramTokens(oranje, "dark"), "classDef x stroke:#e17000;");
  });

  it("onbekend token blijft ongewijzigd", () => {
    const onbekend = "classDef x stroke:var(--bestaat-niet);";
    assert.equal(resolveDiagramTokens(onbekend, "light"), onbekend);
  });

  it("code zonder tokens blijft ongewijzigd", () => {
    const plain = "graph LR\n  A --> B";
    assert.equal(resolveDiagramTokens(plain, "dark"), plain);
  });
});

// ── postProcessSVG ──────────────────────────────────────────────────────────

describe("postProcessSVG", () => {
  it("vervangt width 100% met pixel waarde uit viewBox", () => {
    const input = '<svg viewBox="0 0 500 300" width="100%"></svg>';
    const result = postProcessSVG(Buffer.from(input));
    assert.ok(result.includes('width="500"'));
    assert.ok(!result.includes('width="100%"'));
  });

  it("embed fonts in bestaande style tag", () => {
    const input = '<svg viewBox="0 0 100 100"><style>.cls{}</style></svg>';
    const result = postProcessSVG(Buffer.from(input));
    assert.ok(result.includes("RO-Sans"));
    assert.ok(result.includes("@font-face"));
  });

  it("voegt style tag toe als die ontbreekt", () => {
    const input = '<svg viewBox="0 0 100 100"><rect/></svg>';
    const result = postProcessSVG(Buffer.from(input));
    assert.ok(result.includes("<style>"));
    assert.ok(result.includes("RO-Sans"));
  });

  it("vervangt inline style met rect voor achtergrondkleur", () => {
    const input = '<svg viewBox="0 0 500 300" style="max-width: 100%; background-color: #f3f3f3"><g></g></svg>';
    const result = postProcessSVG(Buffer.from(input));
    assert.ok(result.includes('rx="8"'), "verwacht afgeronde hoeken");
    assert.ok(result.includes('fill="#f3f3f3"'), "verwacht achtergrondkleur als fill");
    assert.ok(!result.includes('style="'), "inline style moet verwijderd zijn");
  });
});

// ── computeHash ─────────────────────────────────────────────────────────────

describe("computeHash", () => {
  it("geeft consistente hash voor dezelfde input", () => {
    const h1 = computeHash("test:light:v1");
    const h2 = computeHash("test:light:v1");
    assert.equal(h1, h2);
  });

  it("geeft andere hash voor andere input", () => {
    const h1 = computeHash("test:light:v1");
    const h2 = computeHash("test:dark:v1");
    assert.notEqual(h1, h2);
  });

  it("hash is 16 tekens hex", () => {
    const h = computeHash("test");
    assert.equal(h.length, 16);
    assert.match(h, /^[a-f0-9]{16}$/);
  });
});
