import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

function hasPandoc() {
  try {
    execFileSync("pandoc", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// Integratietest: bouwt een minimale "gebouwde" pagina + manifest en controleert
// dat render-downloads er zowel een .odt (pandoc) als .pdf (Chromium) van maakt.
test(
  "render-downloads genereert .odt en .pdf uit het manifest",
  { skip: hasPandoc() ? false : "pandoc niet beschikbaar" },
  () => {
    const root = mkdtempSync(join(tmpdir(), "moza-downloads-"));
    try {
      const pageDir = join(root, "documenten", "test");
      mkdirSync(pageDir, { recursive: true });

      writeFileSync(
        join(pageDir, "index.html"),
        "<!doctype html><html lang=nl><head><meta charset=utf-8><title>Test</title></head>" +
          "<body><main><article><h1>Testdocument</h1><p>Hallo wereld.</p></article></main></body></html>"
      );
      writeFileSync(
        join(pageDir, "index.pandoc.md"),
        "---\ntitle: Testdocument\n---\n\n# Testdocument\n\nHallo wereld.\n"
      );
      writeFileSync(
        join(root, "download.json"),
        JSON.stringify([
          { relPermalink: "/documenten/test/", name: "test", title: "Testdocument" },
        ])
      );

      execFileSync("node", [join(import.meta.dirname, "render-downloads.js"), root], {
        stdio: "pipe",
      });

      assert.ok(existsSync(join(pageDir, "test.odt")), "test.odt moet bestaan");
      assert.ok(existsSync(join(pageDir, "test.pdf")), "test.pdf moet bestaan");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
);
