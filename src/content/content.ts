// Content script injected on *.revealdigital.org.
//
// This script is the SESSION-COOKIE GATEWAY: the background service worker
// must never fetch archive URLs directly. All archive HTTP goes through this
// page context so the user's logged-in session (cookies) is used for every
// request, including PDF probes.

const api: any = (globalThis as any).browser ?? (globalThis as any).chrome;

api.runtime.onMessage.addListener(
  (msg: any, _sender: unknown, sendResponse: (res: unknown) => void) => {
    if (!msg || typeof msg !== "object" || typeof msg.type !== "string") return;
    switch (msg.type) {
      case "ping":
        sendResponse({ ok: true });
        return;
      case "fetch": {
        handleFetch(String(msg.url)).then(
          (res) => sendResponse(res),
          () => sendResponse({ ok: false, status: 0 }),
        );
        return true; // async response
      }
      case "probe": {
        handleProbe(String(msg.url)).then(
          (res) => sendResponse(res),
          () => sendResponse({ status: 0, contentType: "", pdf: false }),
        );
        return true; // async response
      }
    }
    return undefined;
  },
);

/** Full-page fetch with the user's cookies. Text is only returned on 2xx. */
async function handleFetch(url: string): Promise<{ ok: boolean; status: number; text?: string }> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) return { ok: false, status: res.status };
  const text = await res.text();
  return { ok: true, status: res.status, text };
}

/** Range probe for the first two bytes of a PDF URL. */
async function handleProbe(url: string): Promise<{ status: number; contentType: string; pdf: boolean }> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { Range: "bytes=0-1" },
  });
  const buf = await res.arrayBuffer();
  const head = new Uint8Array(buf, 0, Math.min(2, buf.byteLength));
  let sig = "";
  for (let i = 0; i < head.length; i++) sig += String.fromCharCode(head[i]);
  const ct = (res.headers.get("content-type") ?? "").toLowerCase();
  return {
    status: res.status,
    contentType: ct,
    pdf: sig === "%P" || ct.includes("application/pdf"),
  };
}

// Warm the MV3 service worker shortly after load so it is discoverable
// (and testable) without requiring any user interaction first.
setTimeout(() => {
  try {
    const p: any = api.runtime.sendMessage({ type: "wake" });
    if (p && typeof p.catch === "function") p.catch(() => {});
  } catch {
    /* background not reachable yet — fine */
  }
}, 250);
