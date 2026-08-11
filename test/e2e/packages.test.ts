// Offline sanity checks for the built extension packages (no network).
// Verifies dist/chrome + dist/firefox manifests, icons, and zip integrity.
// Run: bun test test/e2e/packages.test.ts

import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { file } from "bun";

const ROOT = resolve(import.meta.dir, "../..");
const BROWSERS = ["chrome", "firefox"] as const;

describe("extension packages", () => {
  for (const b of BROWSERS) {
    const dir = join(ROOT, "dist", b);
    const zip = join(ROOT, "web", "public", "downloads", `${b}.zip`);

    test(`${b} manifest is valid MV3`, async () => {
      const m = JSON.parse(await file(join(dir, "manifest.json")).text());
      expect(m.manifest_version).toBe(3);
      expect(m.name).toContain("Reveal Digital");
      expect(m.permissions).toEqual(expect.arrayContaining(["downloads", "storage", "tabs"]));
      expect(m.host_permissions).toContain("*://*.revealdigital.org/*");
      expect(m.action.default_popup).toBe("popup.html");
      expect(m.content_scripts[0].js).toContain("content.js");
      expect(m.content_scripts[0].matches).toContain("*://*.revealdigital.org/*");

      if (b === "chrome") {
        expect(m.background.service_worker).toBe("background.js");
        expect(m.background.scripts).toBeUndefined();
      } else {
        expect(m.background.scripts).toContain("background.js");
        expect(m.browser_specific_settings.gecko.id).toMatch(/@/);
        expect(m.browser_specific_settings.gecko.strict_min_version).toMatch(/^\d+\./);
      }
    });

    test(`${b} icons + bundles exist`, () => {
      for (const s of [16, 32, 48, 128]) {
        expect(existsSync(join(dir, "icons", `icon${s}.png`))).toBe(true);
      }
      for (const f of ["content.js", "background.js", "popup.js", "popup.html", "popup.css"]) {
        expect(existsSync(join(dir, f))).toBe(true);
      }
    });

    test(`${b} zip is intact and contains manifest.json`, async () => {
      expect(existsSync(zip)).toBe(true);
      const p = Bun.spawnSync(["unzip", "-t", zip]);
      expect(p.exitCode).toBe(0);
      const listing = Bun.spawnSync(["unzip", "-l", zip]).stdout.toString();
      expect(listing).toContain("manifest.json");
    });
  }
});
