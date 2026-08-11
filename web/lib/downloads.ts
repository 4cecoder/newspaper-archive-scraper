import { existsSync } from "node:fs";
import path from "node:path";
import { withBasePath } from "@/lib/base-path";

export type BrowserDownload = {
  id: "chrome" | "firefox";
  /** Display name of the browser. */
  name: string;
  /** One-line description shown on the download card. */
  description: string;
  /** File name inside `public/downloads/`. */
  file: string;
  /** Full URL for the download button (basePath-aware). */
  href: string;
  /**
   * True when the zip is present in `public/downloads/` at build time.
   * The extension zips are produced by a separate build script, so the site
   * must render fine without them and only enable buttons when they exist.
   */
  available: boolean;
};

function isBundled(file: string): boolean {
  // Static export renders at build time, so this is evaluated once per build.
  return existsSync(
    path.join(process.cwd(), "public", "downloads", file),
  );
}

export const browserDownloads: BrowserDownload[] = [
  {
    id: "chrome",
    name: "Google Chrome",
    description:
      "Also works in Edge, Brave, Opera, and other Chromium-based browsers.",
    file: "chrome.zip",
    href: withBasePath("/downloads/chrome.zip"),
    available: isBundled("chrome.zip"),
  },
  {
    id: "firefox",
    name: "Mozilla Firefox",
    description:
      "Load it as a temporary add-on — the five steps are just below.",
    file: "firefox.zip",
    href: withBasePath("/downloads/firefox.zip"),
    available: isBundled("firefox.zip"),
  },
];
