// Manifest builder for the Reveal Digital Archive Downloader extension.
// Produces the correct MV3 manifest for Chrome (service worker) and
// Firefox (background scripts + browser_specific_settings).

export type Browser = "chrome" | "firefox";

export interface ExtensionManifest {
  manifest_version: 3;
  name: string;
  version: string;
  description: string;
  permissions: string[];
  host_permissions: string[];
  content_scripts: Array<Record<string, unknown>>;
  action: Record<string, unknown>;
  icons: Record<string, string>;
  background?: Record<string, unknown>;
  browser_specific_settings?: Record<string, unknown>;
}

const NAME = "Reveal Digital Archive Downloader";
const VERSION = "1.0.0";
const DESCRIPTION =
  "Bulk-downloads every PDF page of a Reveal Digital newspaper archive into tidy per-issue folders.";

const ICON_PATHS = { 16: "icons/icon16.png", 32: "icons/icon32.png", 48: "icons/icon48.png", 128: "icons/icon128.png" };

export function manifestFor(browser: Browser): ExtensionManifest {
  const manifest: ExtensionManifest = {
    manifest_version: 3,
    name: NAME,
    version: VERSION,
    description: DESCRIPTION,
    permissions: ["downloads", "storage", "tabs"],
    host_permissions: ["*://*.revealdigital.org/*"],
    content_scripts: [
      {
        matches: ["*://*.revealdigital.org/*"],
        js: ["content.js"],
        run_at: "document_idle",
      },
    ],
    action: {
      default_popup: "popup.html",
      default_title: "Reveal Digital Archive Downloader",
      default_icon: { 16: ICON_PATHS[16], 32: ICON_PATHS[32], 48: ICON_PATHS[48] },
    },
    icons: ICON_PATHS,
  };

  if (browser === "chrome") {
    manifest.background = { service_worker: "background.js" };
  } else {
    manifest.background = { scripts: ["background.js"] };
    manifest.browser_specific_settings = {
      gecko: {
        id: "reveal-digital-downloader@bytecats.dev",
        strict_min_version: "115.0",
      },
    };
  }

  return manifest;
}
