// Popup controller — renders download scope, progress, counts, and activity
// log for the Reveal Digital Archive Downloader.

const api: any = (globalThis as any).browser ?? (globalThis as any).chrome;
const IS_FIREFOX = typeof (globalThis as any).browser !== "undefined";
const DEFAULT_HOST = "dwso.revealdigital.org";

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;

interface RddState {
  status: "idle" | "running" | "paused" | "done" | "error";
  mode: "all" | "publication" | "issue";
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

let state: RddState | null = null;
let activeTab: { url?: string } | null = null;
let flashTimer: ReturnType<typeof setTimeout> | null = null;

// Derived from the active tab.
let tabHost = DEFAULT_HOST;
let tabSp: string | null = null;
let tabDocId: string | null = null;
let onArchiveSite = false;

// ---------------------------------------------------------------------------
// Browser messaging (Chrome callback style / Firefox promise style)
// ---------------------------------------------------------------------------

function send(msg: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (IS_FIREFOX) {
      api.runtime.sendMessage(msg).then(resolve, reject);
    } else {
      api.runtime.sendMessage(msg, (res: any) => {
        if (api.runtime?.lastError) reject(new Error(api.runtime.lastError.message));
        else resolve(res);
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

// ---------------------------------------------------------------------------
// Active tab detection
// ---------------------------------------------------------------------------

async function readActiveTab(): Promise<void> {
  try {
    const tabs = await tabsQuery({ active: true, currentWindow: true });
    activeTab = tabs && tabs.length > 0 ? tabs[0] : null;
  } catch {
    activeTab = null;
  }
  const url = activeTab?.url ?? "";
  onArchiveSite = /^https:\/\/[^/]*revealdigital\.org\//i.test(url) && /^https:/.test(url);
  tabHost = DEFAULT_HOST;
  tabSp = null;
  tabDocId = null;
  if (onArchiveSite) {
    try {
      tabHost = new URL(url).hostname || DEFAULT_HOST;
    } catch {
      tabHost = DEFAULT_HOST;
    }
    const sp = url.match(/[?&]sp=([A-Z0-9]+)/i);
    tabSp = sp ? sp[1] : null;
    const d = url.match(/[?&]d=([A-Z0-9-]+)/i);
    tabDocId = d ? d[1] : null;
  }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function setPill(status: RddState["status"] | undefined): void {
  const pill = $("status-pill");
  pill.className = "pill pill-" + (status ?? "idle");
  pill.textContent =
    status === "running"
      ? "Downloading…"
      : status === "paused"
        ? "Paused"
        : status === "done"
          ? "Finished"
          : status === "error"
            ? "Problem"
            : "Ready";
}

function primaryLabel(status: RddState["status"] | undefined): string {
  switch (status) {
    case "running":
      return "Pause";
    case "paused":
      return "Resume";
    case "done":
      return "Download again";
    case "error":
      return "Try again";
    default:
      return "Start download";
  }
}

function progressInfo(s: RddState | null): { pct: number; label: string } {
  if (!s || s.status === "idle" || s.status === "error") {
    return { pct: 0, label: s?.status === "error" && s.lastError ? s.lastError : "Ready to download" };
  }
  if (s.status === "done") return { pct: 100, label: "All issues downloaded" };
  const cur = s.current;
  if (!cur || !s.plan.issues) return { pct: 0, label: "Scanning the archive…" };
  const issueFrac = cur.totalPages > 0 ? cur.page / cur.totalPages : 0;
  const pct = Math.min(100, Math.round(((cur.index + issueFrac) / cur.total) * 100));
  const label = `Issue ${cur.index + 1} of ${cur.total}: page ${cur.page}/${cur.totalPages}`;
  return { pct, label };
}

function render(): void {
  const s = state;
  const status = s?.status ?? "idle";

  setPill(status);

  // Primary button
  const btnStart = $("btn-start");
  btnStart.textContent = primaryLabel(status);

  // Lock mode cards while a run is active
  const runningOrPaused = status === "running" || status === "paused";
  for (const el of document.querySelectorAll<HTMLElement>(".mode-card")) {
    const input = el.querySelector<HTMLInputElement>("input[type=radio]");
    if (!input) continue;
    if (runningOrPaused) {
      input.disabled = true;
      el.classList.add("mode-disabled");
    } else if (input.value !== "all") {
      input.disabled = !onArchiveSite || (input.value === "issue" && !tabDocId);
      el.classList.toggle("mode-disabled", input.disabled);
    } else {
      input.disabled = false;
      el.classList.remove("mode-disabled");
    }
  }

  // Hint text when the site-bound options are locked
  const hint = $("mode-hint");
  if (!runningOrPaused && !onArchiveSite) {
    hint.hidden = false;
    hint.textContent = "Open a Reveal Digital newspaper page to unlock these options.";
  } else if (!runningOrPaused && !tabDocId) {
    const spOrIssue = (document.querySelector("input[name=mode]:checked") as HTMLInputElement)?.value;
    hint.hidden = false;
    hint.textContent =
      spOrIssue === "issue"
        ? "Open a single issue page to use “This issue”."
        : "Open a single issue page to use “This issue”.";
  } else {
    hint.hidden = true;
  }

  // Progress
  const { pct, label } = progressInfo(s);
  ($("progress-fill") as HTMLElement).style.width = `${pct}%`;
  $("progress-pct").textContent = `${pct}%`;
  $("progress-label").textContent = label;
  const track = $("progress-track");
  track.setAttribute("aria-valuenow", String(pct));

  // Counts
  const c = s?.counts ?? { downloaded: 0, skipped: 0, blocked: 0, failed: 0 };
  $("count-downloaded").textContent = `${c.downloaded} saved`;
  $("count-skipped").textContent = `${c.skipped} already have`;
  $("count-blocked").textContent = `${c.blocked} login-only`;
  $("count-failed").textContent = `${c.failed} failed`;

  // Log
  const list = $("log-list");
  const lines = s?.log ?? [];
  while (list.firstChild) list.removeChild(list.firstChild);
  for (const line of lines.slice(-30)) {
    const li = document.createElement("li");
    li.textContent = line;
    list.appendChild(li);
  }
  list.scrollTop = list.scrollHeight;
}

function flash(msg: string): void {
  const el = $("flash");
  el.textContent = msg;
  el.hidden = false;
  if (flashTimer) clearTimeout(flashTimer);
  flashTimer = setTimeout(() => {
    el.hidden = true;
  }, 3500);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function currentMode(): "all" | "publication" | "issue" {
  const checked = document.querySelector<HTMLInputElement>("input[name=mode]:checked");
  const v = checked?.value;
  return v === "publication" || v === "issue" ? v : "all";
}

async function startOrToggle(): Promise<void> {
  if (state?.status === "running") {
    await send({ type: "pause" });
    return;
  }
  const mode = currentMode();
  if (mode === "publication" && !tabSp) {
    flash("Open a newspaper page in the archive first, then try again.");
    return;
  }
  if (mode === "issue" && !tabDocId) {
    flash("Open a single issue page in the archive first, then try again.");
    return;
  }
  const options = {
    mode,
    host: onArchiveSite ? tabHost : state?.host ?? DEFAULT_HOST,
    startUrl: activeTab?.url,
    docId: tabDocId ?? undefined,
    delayMs: 500,
    onlyPublic: ($("only-public") as HTMLInputElement).checked,
  };
  const r = await send({ type: "start", options });
  if (!r?.ok) flash(r?.error ?? "Couldn't start the download.");
}

async function openArchive(): Promise<void> {
  const r = await send({ type: "openArchive", host: state?.host ?? DEFAULT_HOST });
  if (!r?.ok) flash(r?.error ?? "Couldn't open the archive.");
}

async function startOver(): Promise<void> {
  await send({ type: "reset" });
}

async function poll(): Promise<void> {
  try {
    const r = await send({ type: "getState" });
    if (r?.ok) state = r.state;
  } catch {
    /* background temporarily unavailable — keep last render */
  }
  render();
}

// ---------------------------------------------------------------------------
// Wire up + boot
// ---------------------------------------------------------------------------

function wire(): void {
  $("btn-start").addEventListener("click", () => void startOrToggle());
  $("btn-open").addEventListener("click", () => void openArchive());
  $("btn-reset").addEventListener("click", () => void startOver());

  for (const card of document.querySelectorAll<HTMLElement>(".mode-card")) {
    card.addEventListener("click", () => {
      const input = card.querySelector<HTMLInputElement>("input[type=radio]");
      if (!input || input.disabled) return;
      input.checked = true;
      for (const c of document.querySelectorAll<HTMLElement>(".mode-card")) {
        c.classList.toggle("mode-selected", c === card);
      }
    });
  }

  void readActiveTab().then(() => {
    // Prefer the archive host from the active tab; else background state.
    if (onArchiveSite) {
      state = state ? { ...state, host: tabHost } : state;
    }
    render();
  });

  void poll();
  setInterval(() => void poll(), 300);
}

wire();
