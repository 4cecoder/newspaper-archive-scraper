import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scrape } from "../cli/scraper.ts";
import { buildUrls } from "../src/core/index.ts";

const LIVE = process.env.LIVE === "1";

describe("live scrape", () => {
  test(
    "downloads a full public issue and writes it to the expected folder layout",
    async () => {
      if (!LIVE) {
        console.log("skipping live test (run with LIVE=1)");
        return;
      }
      const outDir = await mkdtemp(join(tmpdir(), "vrs-out-"));
      const profileDir = join(tmpdir(), `vrs-profile-${Date.now()}`);
      try {
        const summary = await scrape({
          host: "dwso.revealdigital.org",
          startUrl: buildUrls().issue("MPD19210218-01"),
          outDir,
          profileDir,
          browser: "chromium",
          headless: true,
          delayMs: 150,
          limit: 0,
          onlyPublic: false,
          skipExisting: true,
        });

        expect(summary.downloaded).toBe(4);
        expect(summary.failed).toEqual([]);

        const dir = join(outDir, "Muncie Post-Democrat", "1921-Feb-18, Vol-01 Iss-06");
        const first = join(dir, "page01.pdf");
        const last = join(dir, "page04.pdf");
        const header = (await readFile(first)).subarray(0, 5).toString("latin1");
        expect(header).toBe("%PDF-");
        expect(await readFile(last)).toBeDefined();
      } finally {
        await rm(outDir, { recursive: true, force: true });
        await rm(profileDir, { recursive: true, force: true });
      }
    },
    120_000,
  );
});
