// Live end-to-end test: load the built Chrome extension into a real browser,
// download one issue from the live Reveal Digital archive, and assert the PDFs
// landed (as reported by the extension state + the network probes).
//
// Requires: E2E=1  (hits the live archive site). Run: bun run test:e2e

import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium, type BrowserContext } from "playwright";
import { buildUrls } from "../../src/core/index.ts";

const E2E = process.env.E2E === "1";
const ROOT = resolve(import.meta.dir, "../..");
const EXT_PATH = join(ROOT, "dist", "chrome");
const MANIFEST = join(EXT_PATH, "manifest.json");

const HOST = "dwso.revealdigital.org";
const DOC_ID = "MPD19210218-01"; // Muncie Post-Democrat, 18 February 1921 (4 pages)
const ISSUE_URL = buildUrls().issue(DOC_ID);

async function ensureBuilt(): Promise<void> {
  if (existsSync(MANIFEST)) return;
  const p = Bun.spawnSync(["bun", "run", "build"], { cwd: ROOT, stdout: "inherit", stderr: "inherit" });
  if (p.exitCode !== 0) throw new Error("extension build failed — cannot run E2E");
}

async function waitForServiceWorker(context: BrowserContext): Promise<string> {
  for (let i = 0; i < 80; i++) {
    for (const sw of context.serviceWorkers()) {
      const url = sw.url();
      if (url.startsWith("chrome-extension://")) return new URL(url).host;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("extension service worker never started");
}

describe("chrome extension (live e2e)", () => {
  test("downloads a whole issue as PDFs", async () => {
    if (!E2E) {
      console.log("Skipping live E2E — run with E2E=1");
      return;
    }
    await ensureBuilt();

    const profile = await mkdtemp(join(tmpdir(), "rdd-e2e-"));
    const context = await chromium.launchPersistentContext(profile, {
      headless: false,
      args: [`--disable-extensions-except=${EXT_PATH}`, `--load-extension=${EXT_PATH}`],
    });

    try {
      const archive = await context.newPage();
      const pdfProbes: string[] = [];
      archive.on("response", (r) => {
        const ct = r.headers()["content-type"] ?? "";
        if (ct.includes("application/pdf") && r.url().includes("staticpdf")) pdfProbes.push(r.url());
      });

      // Open the archive issue — the content script wakes the background worker.
      await archive.goto(ISSUE_URL, { waitUntil: "domcontentloaded" });
      const extId = await waitForServiceWorker(context);

      const popup = await context.newPage();
      await popup.goto(`chrome-extension://${extId}/popup.html`);

      await popup.evaluate(
        async (opts) => {
          const api = (globalThis as any).browser ?? (globalThis as any).chrome;
          const res = await api.runtime.sendMessage({ type: "start", options: opts });
          if (!res?.ok) throw new Error(res?.error ?? "start message failed");
        },
        { mode: "issue", host: HOST, docId: DOC_ID, delayMs: 150 },
      );

      let state: any;
      const deadline = Date.now() + 150_000;
      while (Date.now() < deadline) {
        state = await popup.evaluate(async () => {
          const api = (globalThis as any).browser ?? (globalThis as any).chrome;
          const res = await api.runtime.sendMessage({ type: "getState" });
          return res?.state;
        });
        if (state && ["done", "error", "paused"].includes(state.status)) break;
        await new Promise((r) => setTimeout(r, 1500));
      }

      console.log("E2E final state:", JSON.stringify(state, null, 2));
      expect(state).toBeDefined();
      expect(state.status).toBe("done");
      expect(state.counts.downloaded).toBe(4);
      expect(state.counts.blocked).toBe(0);
      expect(state.counts.failed).toBe(0);
      expect(state.completedIssues.length).toBe(1);
      expect(state.completedIssues[0]).toContain("Muncie Post-Democrat");
      expect(pdfProbes.length).toBe(4);
    } finally {
      await context.close();
      await rm(profile, { recursive: true, force: true });
    }
  }, 180_000);
});
