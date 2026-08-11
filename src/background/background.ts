// Background service worker (Chrome MV3) / background script (Firefox).
//
// Orchestrates the bulk download. All archive HTTP goes through the content
// script (see src/content/content.ts) so the user's logged-in session cookies
// are used; this script never calls fetch() for archive URLs directly.

import {
  buildUrls,
  parsePublications,
  parseIssues,
  extractPublicationTitle,
  extractTitleFromIssueHeader,
  extractIssueMetadata,
  extractPageIds,
  parseIssueLabel,
  toIssuePlan,
  singleIssuePlan,
  planPages,
} from "../core/index.ts";
import type { Mode, IssuePlan } from "../core/index.ts";

const api: any = (globalThis as any).browser ?? (globalThis as any).chrome;
const IS_FIREFOX = typeof (globalThis as any).browser !== "undefined";

const STATE_KEY = "rdd:v1";
const DEFAULT_HOST = "dwso.revealdigital.org";
const ENUMERATION_DELAY_MS = 150;
const LOG_CAP = 60;
const KEEPALIVE_MS = 20_000;
const DOWNLOAD_TIMEOUT_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface RddState {
  status: "idle" | "running" | "paused" | "done" | "error";
  mode: Mode;
  host: string;
  startedAt: number;
  finishedAt?: number;
  counts: { downloaded: number; skipped: number; blocked: number; failed: number };
  plan: { issues: number };
  current?: { index: number; total: number; label: string; page: number; totalPages: number };
  completedIssues: string[];
  blockedIssues: string[];
  log: string[];
  lastError?: string;
}

function freshState(): RddState {
  return {
    status: "idle",
    mode: "all",
    host: DEFAULT_HOST,
    startedAt: 0,
    counts: { downloaded: 0, skipped: 0, blocked: 0, failed: 0 },
    plan: { issues: 0 },
    completedIssues: [],
    blockedIssues: [],
    log: [],
  };
}

let state: RddState = freshState();
let pauseRequested = false;
let runId = 0;
let keepAliveTimer: ReturnType<typeof setInterval> | null = null;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Promisified browser APIs (Chrome callback style / Firefox promise style)
// ---------------------------------------------------------------------------

function storageGet(): Promise<RddState> {
  return new Promise((resolve, reject) => {
    if (IS_FIREFOX) {
      api.storage.local
        .get(STATE_KEY)
        .then((r: any) => resolve(r?.[STATE_KEY] ?? freshState()), reject);
    } else {
      api.storage.local.get(STATE_KEY, (r: any) => {
        if (api.runtime?.lastError) reject(new Error(api.runtime.lastError.message));
        else resolve(r?.[STATE_KEY] ?? freshState());
      });
    }
  });
}

function storageSet(s: RddState): Promise<void> {
  return new Promise((resolve, reject) => {
    if (IS_FIREFOX) {
      api.storage.local.set({ [STATE_KEY]: s }).then(() => resolve(), reject);
    } else {
      api.storage.local.set({ [STATE_KEY]: s }, () => {
        if (api.runtime?.lastError) reject(new Error(api.runtime.lastError.message));
        else resolve();
      });
    }
  });
}

function tabsQuery(info: any): Promise<any[]> {
  return new Promise((resolve, reject) => {
    if (IS_FIREFOX) {
      api.tabs.query(info).then(resolve, reject);
    } else {
      api.tabs.query(info, (tabs: any[]) => {
        if (api.runtime?.lastError) reject(new Error(api.runtime.lastError.message));
        else resolve(tabs);
      });
    }
  });
}

function tabsGet(tabId: number): Promise<any> {
  return new Promise((resolve, reject) => {
    if (IS_FIREFOX) {
      api.tabs.get(tabId).then(resolve, reject);
    } else {
      api.tabs.get(tabId, (tab: any) => {
        if (api.runtime?.lastError) reject(new Error(api.runtime.lastError.message));
        else resolve(tab);
      });
    }
  });
}

function tabsCreate(info: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (IS_FIREFOX) {
      api.tabs.create(info).then(resolve, reject);
    } else {
      api.tabs.create(info, (tab: any) => {
        if (api.runtime?.lastError) reject(new Error(api.runtime.lastError.message));
        else resolve(tab);
      });
    }
  });
}

function tabsUpdate(tabId: number, info: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (IS_FIREFOX) {
      api.tabs.update(tabId, info).then(resolve, reject);
    } else {
      api.tabs.update(tabId, info, (tab: any) => {
        if (api.runtime?.lastError) reject(new Error(api.runtime.lastError.message));
        else resolve(tab);
      });
    }
  });
}

function tabsSendMessage(tabId: number, msg: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (IS_FIREFOX) {
      api.tabs.sendMessage(tabId, msg).then(resolve, reject);
    } else {
      api.tabs.sendMessage(tabId, msg, (res: any) => {
        if (api.runtime?.lastError) reject(new Error(api.runtime.lastError.message));
        else resolve(res);
      });
    }
  });
}

function downloadsDownload(opts: any): Promise<number> {
  return new Promise((resolve, reject) => {
    if (IS_FIREFOX) {
      api.downloads.download(opts).then(resolve, reject);
    } else {
      api.downloads.download(opts, (id: number) => {
        if (api.runtime?.lastError) reject(new Error(api.runtime.lastError.message));
        else resolve(id);
      });
    }
  });
}

// ---------------------------------------------------------------------------
// State persistence + logging
// ---------------------------------------------------------------------------

let saving = false;
let saveQueued = false;

/** Persist current state (coalescing concurrent writes). */
function saveState(): Promise<void> {
  return new Promise((resolve) => {
    const write = () => {
      saving = true;
      storageSet(state).then(
        () => {
          saving = false;
          if (saveQueued) {
            saveQueued = false;
            write();
          }
          resolve();
        },
        () => {
          // Persistence failure shouldn't kill the run.
          saving = false;
          saveQueued = false;
          resolve();
        },
      );
    };
    if (saving) {
      saveQueued = true;
      resolve();
      return;
    }
    write();
  });
}

function log(line: string) {
  const t = new Date();
  const hh = String(t.getHours()).padStart(2, "0");
  const mm = String(t.getMinutes()).padStart(2, "0");
  const ss = String(t.getSeconds()).padStart(2, "0");
  state.log.push(`[${hh}:${mm}:${ss}] ${line}`);
  if (state.log.length > LOG_CAP) state.log = state.log.slice(-LOG_CAP);
}

function keepAliveOn() {
  keepAliveOff();
  keepAliveTimer = setInterval(() => {
    try {
      // Any cheap API call resets the MV3 service worker idle timer.
      const p: any = api.storage.local.get(STATE_KEY);
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch {
      /* ignore */
    }
  }, KEEPALIVE_MS);
}

function keepAliveOff() {
  if (keepAliveTimer != null) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

// ---------------------------------------------------------------------------
// Archive tab plumbing
// ---------------------------------------------------------------------------

/** Find or create an archive tab, activate it, and wait for it to load. */
async function ensureArchiveTab(host: string, wait = true): Promise<number> {
  const tabs = await tabsQuery({ url: "*://*.revealdigital.org/*" });
  let tab = tabs.find((t) => t && t.id != null && /revealdigital\.org/.test(t.url ?? ""));
  if (!tab) {
    tab = await tabsCreate({ url: `https://${host}/` });
  } else if (tab.id != null) {
    try {
      await tabsUpdate(tab.id, { active: true });
    } catch {
      /* tab may have closed between query and update */
    }
  }
  if (tab?.id == null) throw new Error("Couldn't open the Reveal Digital archive.");
  if (wait) {
    for (let i = 0; i < 40; i++) {
      try {
        const t = await tabsGet(tab.id);
        if (t && t.status === "complete") break;
      } catch {
        /* tab gone — retry below will surface it */
      }
      await sleep(250);
    }
  }
  return tab.id;
}

/** Send a message to the content script, retrying while it loads/injects. */
async function withContent(tabId: number, msg: any): Promise<any> {
  let lastErr: unknown = null;
  for (let i = 0; i < 30; i++) {
    try {
      return await tabsSendMessage(tabId, msg);
    } catch (e) {
      lastErr = e;
      await sleep(250);
    }
  }
  throw new Error(
    "Couldn't reach the archive page. Make sure a Reveal Digital tab is open and you're logged in.",
  );
}

/** Fetch an archive URL through the content script (session cookies). */
async function fetchViaContent(tabId: number, url: string): Promise<string> {
  const res = await withContent(tabId, { type: "fetch", url });
  if (!res || !res.ok) {
    const status = res?.status ?? 0;
    throw new Error(
      status
        ? `The archive returned HTTP ${status} (login may be required).`
        : `Couldn't load an archive page (${url}).`,
    );
  }
  return res.text as string;
}

/** Probe a PDF URL through the content script. */
async function probeViaContent(
  tabId: number,
  url: string,
): Promise<{ status: number; contentType: string; pdf: boolean }> {
  const res = await withContent(tabId, { type: "probe", url });
  return {
    status: res?.status ?? 0,
    contentType: res?.contentType ?? "",
    pdf: Boolean(res?.pdf),
  };
}

// ---------------------------------------------------------------------------
// Downloads
// ---------------------------------------------------------------------------

/**
 * Download one PDF with the browser's own network stack (so the user's
 * cookies are used). Resolves when the download completes, rejects on
 * interruption, timeout, or API error.
 */
function downloadOnce(url: string, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const pending = new Set<number>();
    let settled = false;

    const onChange = (delta: any) => {
      if (!delta || !delta.id || !pending.has(delta.id)) return;
      const cur = delta.state && delta.state.current;
      if (cur === "complete") {
        settled = true;
        clearTimeout(timer);
        api.downloads.onChanged.removeListener(onChange);
        resolve();
      } else if (cur === "interrupted") {
        settled = true;
        clearTimeout(timer);
        api.downloads.onChanged.removeListener(onChange);
        reject(new Error("Download was interrupted."));
      }
    };

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        api.downloads.onChanged.removeListener(onChange);
        reject(new Error("Timed out waiting for the download to finish."));
      }
    }, DOWNLOAD_TIMEOUT_MS);

    api.downloads.onChanged.addListener(onChange);

    downloadsDownload({
      url,
      filename,
      conflictAction: "overwrite",
      saveAs: false,
    }).then(
      (id: number) => {
        pending.add(id);
      },
      (e: any) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          api.downloads.onChanged.removeListener(onChange);
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      },
    );
  });
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

interface StartOptions {
  mode?: string;
  host?: string;
  startUrl?: string;
  docId?: string;
  delayMs?: number;
  onlyPublic?: boolean;
}

function parseDocIdFromUrl(url: string): string | null {
  const m = url.match(/[?&]d=([A-Z0-9-]+)/i);
  return m ? m[1] : null;
}

async function runScrape(
  id: number,
  mode: Mode,
  host: string,
  startUrl: string | undefined,
  docId: string | undefined,
  delayMs: number,
  onlyPublic: boolean,
): Promise<void> {
  try {
    const urls = buildUrls(host);
    const tabId = await ensureArchiveTab(host);
    await withContent(tabId, { type: "ping" });

    // --- 1. Enumerate the issue plan -------------------------------------
    const plans: IssuePlan[] = [];
    if (mode === "all") {
      log("Scanning the full archive…");
      const html = await fetchViaContent(tabId, urls.collection());
      const pubs = parsePublications(html);
      log(`Found ${pubs.length} newspaper${pubs.length === 1 ? "" : "s"}`);
      for (const pub of pubs) {
        if (id !== runId || pauseRequested) return;
        if (onlyPublic && pub.locked) {
          log(`Skipping login-only newspaper: ${pub.title}`);
          continue;
        }
        await sleep(ENUMERATION_DELAY_MS);
        const pubHtml = await fetchViaContent(tabId, urls.publication(pub.sp));
        const title = extractPublicationTitle(pubHtml) ?? pub.title;
        const issues = parseIssues(pubHtml);
        for (const issue of issues) {
          if (onlyPublic && issue.locked) continue;
          plans.push(toIssuePlan(title, issue));
        }
        log(`${title}: ${issues.length} issue${issues.length === 1 ? "" : "s"}`);
        await saveState();
      }
    } else if (mode === "publication") {
      const spMatch = (startUrl ?? "").match(/[?&]sp=([A-Z0-9]+)/i);
      const sp = spMatch ? spMatch[1] : null;
      if (!sp) throw new Error("Couldn't find the newspaper code in the page URL — open a newspaper page first.");
      const pubHtml = await fetchViaContent(tabId, urls.publication(sp));
      const title = extractPublicationTitle(pubHtml) ?? sp;
      const issues = parseIssues(pubHtml);
      for (const issue of issues) {
        if (onlyPublic && issue.locked) continue;
        plans.push(toIssuePlan(title, issue));
      }
      log(`${title}: ${issues.length} issue${issues.length === 1 ? "" : "s"}`);
    } else {
      // mode "issue"
      const d = (docId as string | undefined) ?? parseDocIdFromUrl(startUrl ?? "") ?? undefined;
      if (!d) throw new Error("Couldn't find the issue code in the page URL — open an issue page first.");
      const issueHtml = await fetchViaContent(tabId, urls.issue(d));
      const title = extractTitleFromIssueHeader(issueHtml) ?? host;
      const meta = extractIssueMetadata(issueHtml);
      const label = meta.date ?? d;
      const parsed = {
        date: parseIssueLabel(meta.date ?? "").date,
        volume: meta.volume ?? null,
        issue: meta.issue ?? null,
      };
      plans.push(singleIssuePlan(title, d, label, parsed));
    }

    if (id !== runId) return;
    state.plan.issues = plans.length;
    log(`Queued ${plans.length} issue${plans.length === 1 ? "" : "s"}`);
    await saveState();

    // --- 2. Download each issue ------------------------------------------
    for (let i = 0; i < plans.length; i++) {
      if (id !== runId) return;
      if (pauseRequested) return finishAs("paused");

      const plan = plans[i];
      if (state.completedIssues.includes(plan.folderPath)) {
        state.counts.skipped++;
        log(`Already downloaded: ${plan.folderPath}`);
        await saveState();
        continue;
      }
      if (state.blockedIssues.includes(plan.folderPath)) continue;
      if (plan.locked && onlyPublic) continue;

      log(`Starting: ${plan.folderPath}`);
      state.current = { index: i, total: plans.length, label: plan.label, page: 0, totalPages: 0 };
      await saveState();

      const issueHtml = await fetchViaContent(tabId, urls.issue(plan.docId));
      const pageIds = extractPageIds(issueHtml);
      if (pageIds.length === 0) {
        log(`No pages found for ${plan.folderPath} — skipping`);
        continue;
      }
      const jobs = planPages(plan, pageIds);
      if (state.current) state.current.totalPages = jobs.length;
      await saveState();

      let blockedAny = false;
      for (let p = 0; p < jobs.length; p++) {
        if (id !== runId) return;
        if (pauseRequested) return finishAs("paused");

        const job = jobs[p];
        if (state.current) state.current.page = p + 1;

        const pdfUrl = urls.pagePdf(plan.docId, job.pageId);
        const probe = await probeViaContent(tabId, pdfUrl);
        if (!probe.pdf) {
          state.counts.blocked++;
          blockedAny = true;
          if (!state.blockedIssues.includes(plan.folderPath)) {
            state.blockedIssues.push(plan.folderPath);
            log(`Login required: ${plan.folderPath}`);
          }
          await saveState();
          continue;
        }

        try {
          await downloadOnce(pdfUrl, job.filePath);
          state.counts.downloaded++;
          await saveState();
        } catch (e) {
          state.counts.failed++;
          log(`Couldn't save ${job.filePath}: ${e instanceof Error ? e.message : String(e)}`);
          await saveState();
        }

        if (p < jobs.length - 1) await sleep(delayMs);
      }

      if (!blockedAny && !pauseRequested && id === runId && state.status === "running") {
        if (!state.completedIssues.includes(plan.folderPath)) state.completedIssues.push(plan.folderPath);
        log(`Done: ${plan.folderPath}`);
        await saveState();
      }
    }

    if (id !== runId) return;
    if (pauseRequested) return finishAs("paused");

    state.status = "done";
    state.finishedAt = Date.now();
    log("All done!");
    await saveState();
    keepAliveOff();
  } catch (e) {
    if (id !== runId) return;
    state.status = "error";
    state.lastError = e instanceof Error ? e.message : String(e);
    state.finishedAt = Date.now();
    log(`Error: ${state.lastError}`);
    await saveState();
    keepAliveOff();
  }
}

function finishAs(status: "paused") {
  state.status = status;
  state.finishedAt = Date.now();
  log("Paused — ready to resume.");
  return saveState().then(() => keepAliveOff());
}

// ---------------------------------------------------------------------------
// Message handlers
// ---------------------------------------------------------------------------

async function handleStart(options: StartOptions | undefined): Promise<{ ok: boolean }> {
  if (state.status === "running") {
    throw new Error("A download is already running.");
  }
  const mode: Mode =
    options?.mode === "publication" || options?.mode === "issue" ? options.mode : "all";
  const host = (options?.host ?? "").trim() || DEFAULT_HOST;
  const delayMs =
    typeof options?.delayMs === "number" && options.delayMs >= 0 ? options.delayMs : 500;

  runId++;
  const id = runId;
  pauseRequested = false;

  state = {
    ...freshState(),
    status: "running",
    mode,
    host,
    startedAt: Date.now(),
    completedIssues: state.completedIssues, // resume support
    blockedIssues: state.blockedIssues,
    log: state.log.slice(-40), // keep a bit of history
  };
  await saveState();
  keepAliveOn();

  // Fire and forget — the popup polls state for progress.
  runScrape(id, mode, host, options?.startUrl, options?.docId, delayMs, Boolean(options?.onlyPublic));
  return { ok: true };
}

function handleReset() {
  pauseRequested = true; // stop any in-flight run cleanly
  state.completedIssues = [];
  state.blockedIssues = [];
  state.status = "idle";
  state.finishedAt = Date.now();
  state.lastError = undefined;
  log("Started over.");
  return saveState().then(
    () => ({ ok: true }),
    () => ({ ok: true }),
  );
}

async function handleOpenArchive(host?: string): Promise<boolean> {
  const h = (host ?? "").trim() || state.host || DEFAULT_HOST;
  await ensureArchiveTab(h, false);
  return true;
}

api.runtime.onMessage.addListener(
  (msg: any, _sender: unknown, sendResponse: (res: any) => void) => {
    if (!msg || typeof msg !== "object" || typeof msg.type !== "string") return;
    switch (msg.type) {
      case "wake":
        sendResponse({ ok: true });
        return;
      case "getState":
        sendResponse({ ok: true, state });
        return;
      case "pause":
        pauseRequested = true;
        sendResponse({ ok: true });
        return;
      case "reset": {
        handleReset().then(
          () => sendResponse({ ok: true }),
          () => sendResponse({ ok: true }),
        );
        return true; // async response
      }
      case "openArchive": {
        handleOpenArchive(msg.host).then(
          () => sendResponse({ ok: true }),
          (e: any) => sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }),
        );
        return true; // async response
      }
      case "start": {
        handleStart(msg.options).then(
          (r) => sendResponse(r),
          (e: any) => sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }),
        );
        return true; // async response
      }
    }
    return undefined;
  },
);

// Restore persisted state on startup so the popup always shows the truth.
storageGet().then(
  (s) => {
    state = s;
  },
  () => {
    /* first run — keep fresh state */
  },
);
