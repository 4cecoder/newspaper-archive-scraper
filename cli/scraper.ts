import { chromium, firefox } from "playwright";
import type { BrowserContext } from "playwright";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  buildRelativePath,
  buildUrls,
  extractIssueMetadata,
  extractPageIds,
  extractPublicationTitle,
  extractTitleFromIssueHeader,
  parseIssueLabel,
  parseIssues,
  parsePublications,
  type Issue,
  type ParsedIssue,
  type Publication,
} from "../src/core/index.ts";

export type BrowserName = "chromium" | "firefox";

export interface ScrapeOptions {
  host: string;
  startUrl: string;
  outDir: string;
  profileDir: string;
  browser: BrowserName;
  channel?: "chrome";
  headless: boolean;
  delayMs: number;
  limit: number;
  onlyPublic: boolean;
  skipExisting: boolean;
}

export interface ScrapeSummary {
  downloaded: number;
  skipped: number;
  locked: number;
  failed: Array<{ target: string; reason: string }>;
}

interface WorkUnit {
  title: string;
  docId: string;
  parsed: ParsedIssue;
  locked: boolean;
  pages: string[] | null;
}

function log(msg: string) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

async function sleep(ms: number) {
  if (ms <= 0) return;
  await new Promise((r) => setTimeout(r, ms));
}

async function launchContext(
  profileDir: string,
  browser: BrowserName,
  channel: ScrapeOptions["channel"],
  headless: boolean,
): Promise<BrowserContext> {
  const opts = { headless, viewport: null };
  if (browser === "firefox") {
    return firefox.launchPersistentContext(profileDir, opts);
  }
  return chromium.launchPersistentContext(profileDir, channel ? { ...opts, channel } : opts);
}

async function fetchHtml(ctx: BrowserContext, url: string): Promise<string> {
  const resp = await ctx.request.get(url, { timeout: 120_000 });
  const text = await resp.text();
  if (!resp.ok()) {
    throw new Error(`HTTP ${resp.status()} fetching ${url}`);
  }
  return text;
}

async function collectWork(opts: ScrapeOptions, ctx: BrowserContext): Promise<WorkUnit[]> {
  const urls = buildUrls(opts.host);
  const units: WorkUnit[] = [];
  let count = 0;

  const singleIssue = opts.startUrl.match(/[?&]d=([A-Z0-9-]+)/);
  if (singleIssue) {
    const docId = singleIssue[1];
    const html = await fetchHtml(ctx, opts.startUrl);
    const title = extractTitleFromIssueHeader(html) ?? opts.host;
    const meta = extractIssueMetadata(html);
    const parsed: ParsedIssue = {
      date: parseIssueLabel(meta.date ?? "").date,
      volume: meta.volume ?? null,
      issue: meta.issue ?? null,
    };
    units.push({ title, docId, parsed, locked: false, pages: extractPageIds(html) });
    return units;
  }

  const singlePub = opts.startUrl.match(/[?&]sp=([A-Z0-9]+)/);
  if (singlePub) {
    const sp = singlePub[1];
    const html = await fetchHtml(ctx, urls.publication(sp));
    const title = extractPublicationTitle(html) ?? sp;
    for (const issue of parseIssues(html)) {
      if (opts.limit && count >= opts.limit) break;
      units.push(toUnit(title, issue));
      count++;
    }
    return units;
  }

  const collectionHtml = await fetchHtml(ctx, opts.startUrl);
  let pubs = parsePublications(collectionHtml);
  if (opts.onlyPublic) {
    pubs = pubs.filter((p) => !p.locked);
    log(`Only scraping public titles (${pubs.length} of ${parsePublications(collectionHtml).length} shown).`);
  }
  log(`Found ${pubs.length} publication(s).`);
  for (const pub of pubs) {
    if (opts.limit && count >= opts.limit) break;
    const html = await fetchHtml(ctx, urls.publication(pub.sp));
    const title = extractPublicationTitle(html) ?? pub.title;
    const issues = parseIssues(html);
    log(`  ${title}: ${issues.length} issue(s)`);
    for (const issue of issues) {
      if (opts.limit && count >= opts.limit) break;
      units.push(toUnit(title, issue));
      count++;
    }
    await sleep(opts.delayMs);
  }
  return units;
}

function toUnit(title: string, issue: Issue): WorkUnit {
  return {
    title,
    docId: issue.docId,
    parsed: parseIssueLabel(issue.label),
    locked: issue.locked,
    pages: null,
  };
}

async function fetchPages(ctx: BrowserContext, unit: WorkUnit): Promise<string[]> {
  const html = await fetchHtml(ctx, buildUrls().issue(unit.docId));
  const pages = extractPageIds(html);
  if (pages.length === 0) {
    throw new Error(`no pages found for ${unit.docId} (is the title login-protected and the session expired?)`);
  }
  return pages;
}

async function downloadPage(
  ctx: BrowserContext,
  unit: WorkUnit,
  pageId: string,
  pageIndex: number,
  opts: ScrapeOptions,
  summary: ScrapeSummary,
) {
  const rel = buildRelativePath(unit.title, unit.parsed, pageIndex);
  const abs = join(opts.outDir, rel);
  if (opts.skipExisting && existsSync(abs)) {
    summary.skipped++;
    return;
  }
  const url = buildUrls().pagePdf(unit.docId, pageId);
  const resp = await ctx.request.get(url, { timeout: 180_000 });
  const body = Buffer.from(await resp.body());
  if (body.length >= 5 && body.subarray(0, 5).toString("latin1") === "%PDF-") {
    await mkdir(join(opts.outDir, rel.split("/").slice(0, -1).join("/")), { recursive: true });
    await writeFile(abs, body);
    summary.downloaded++;
  } else {
    const ct = resp.headers()["content-type"] ?? "";
    if (ct.includes("text/html")) {
      summary.locked++;
      log(`    page ${pageId} blocked (login required) -> ${rel}`);
    } else {
      summary.failed.push({ target: rel, reason: `HTTP ${resp.status()} (${ct})` });
    }
  }
}

export async function scrape(opts: ScrapeOptions): Promise<ScrapeSummary> {
  const summary: ScrapeSummary = { downloaded: 0, skipped: 0, locked: 0, failed: [] };
  log(`Browser: ${opts.browser}${opts.channel ? ` (${opts.channel})` : ""}, headless: ${opts.headless}`);
  log(`Profile: ${opts.profileDir}`);
  log(`Output:  ${opts.outDir}`);
  log(`Start:   ${opts.startUrl}`);

  const ctx = await launchContext(opts.profileDir, opts.browser, opts.channel, opts.headless);
  try {
    const units = await collectWork(opts, ctx);
    log(`Collected ${units.length} issue(s). Starting download.`);
    for (const [i, unit] of units.entries()) {
      const folder = buildRelativePath(unit.title, unit.parsed, 0).split("/").slice(0, -1).join("/");
      log(`[${i + 1}/${units.length}] ${folder}`);
      let pages: string[];
      try {
        pages = unit.pages ?? (await fetchPages(ctx, unit));
      } catch (err) {
        log(`    error: ${(err as Error).message}`);
        summary.failed.push({ target: folder, reason: (err as Error).message });
        continue;
      }
      for (let p = 0; p < pages.length; p++) {
        try {
          await downloadPage(ctx, unit, pages[p], p, opts, summary);
        } catch (err) {
          summary.failed.push({ target: `${folder}/page${p + 1}`, reason: (err as Error).message });
        }
        await sleep(opts.delayMs);
      }
    }
  } finally {
    await ctx.close().catch(() => {});
  }

  log(`Done. downloaded=${summary.downloaded} skipped=${summary.skipped} locked=${summary.locked} failed=${summary.failed.length}`);
  for (const f of summary.failed) log(`  failed: ${f.target} (${f.reason})`);
  return summary;
}

export async function openLoginWindow(profileDir: string, browser: BrowserName, channel?: "chrome") {
  log(`Opening a browser window. Log in to the archive, then close the window.`);
  const ctx = await launchContext(profileDir, browser, channel, false);
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.goto(`https://dwso.revealdigital.org/`);
  await new Promise<void>((resolve) => {
    const t = setInterval(() => {
      if (!ctx.browser()?.isConnected()) {
        clearInterval(t);
        resolve();
      }
    }, 500);
  });
  log("Browser closed.");
}
