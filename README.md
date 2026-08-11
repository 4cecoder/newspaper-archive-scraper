# Reveal Digital Archive Downloader

Bulk-download every page of a **Reveal Digital (Veridian) newspaper archive** as PDFs —
in Chrome or Firefox, straight from the browser toolbar. One click starts the run,
and every issue lands in your Downloads folder as a tidy folder:

```
The Western American/
  1922-Oct-01, Vol-01 Iss-01/
    page01.pdf
    page02.pdf
    ...
```

No command line required for end users. This repository contains everything a
developer needs to build, test, and publish the project:

| Piece | Path | Audience |
| --- | --- | --- |
| **Browser extension** (Chrome + Firefox) | `src/{content,background,popup}` | end users |
| **Delivery site** (download + install guide) | `web/` (Next.js, static export → GitHub Pages) | end users |
| **Shared core logic** (parsers, paths, planning) | `src/core/` | shared by all |
| **CLI scraper** (headless bulk download) | `cli/` | developers |
| **Tests** | `test/` | developers |
| **Build pipeline** | `scripts/` | developers |

## Prerequisites

- [Bun](https://bun.sh) 1.1+ (everything here is bun — no npm/yarn)
- Playwright browsers for the CLI/E2E: `bunx playwright install chromium`

## Quick start

```bash
bun install

# Build both extensions → dist/chrome, dist/firefox + web/public/downloads/*.zip
bun run build

# Unit + offline package tests (no network)
bun test

# Live E2E: loads the built Chrome extension and downloads a real issue (network)
E2E=1 bun test test/e2e/chrome.test.ts
```

## Development

### Extension

```bash
bun run build           # → dist/chrome/ + dist/firefox/
```

Load in a browser:

- **Chrome:** `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select `dist/chrome/`
- **Firefox:** `about:debugging` → **This Firefox** → **Load Temporary Add-on** → select `dist/firefox/manifest.json`

The content script is the session-cookie gateway: all archive HTTP (including PDF
probes) flows through the page context so the user's logged-in session is always
used. The background worker orchestrates enumeration → probing → `chrome.downloads`,
writes progress to `chrome.storage.local` (`rdd:v1`), and supports pause + resume
(skip already-completed issues).

### Delivery site

```bash
bun run web             # dev server
bun run web:build       # static export → web/out/
bun run web:preview     # serve the export locally
```

### CLI (developer bulk runs)

```bash
bun run login           # opens a real browser to sign in (session saved locally)
bun run scrape          # downloads every page of every publication
```

## How the download naming works

Issue labels like `18 February 1921, Volume 1, Issue 6` become
`Muncie Post-Democrat/1921-Feb-18, Vol-01 Iss-06/pageNN.pdf`. Folder/page naming
lives in `src/core/paths.ts`, parsing in `src/core/veridian.ts` — the exact same
code runs in the extension, the CLI, and the tests.

## Publishing

GitHub Actions keeps the repo honest and serves the delivery site:

- `.github/workflows/ci.yml` — install, build both extensions, run unit/package tests, build the site
- `.github/workflows/pages.yml` — deploys `web/out/` to GitHub Pages at `https://<user>.github.io/newspaper-archive-scraper/`

The download zips live in `web/public/downloads/` and ship with the site, so the
customer always gets the current build from the landing page.

## Repository layout

```
src/core/       pure shared logic (types, urls, parsers, paths, planner)
src/content/    content script (session-cookie gateway)
src/background/ service worker / background orchestrator
src/popup/      toolbar popup UI
cli/            headless Playwright CLI (reuses src/core)
scripts/        bun build pipeline (bundles, manifests, icons, zips)
test/           unit + offline package tests + live Chrome E2E
web/            customer-facing Next.js site (static export)
```

## License

MIT — see [LICENSE](LICENSE).
