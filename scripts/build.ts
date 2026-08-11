// Build pipeline for the Reveal Digital Archive Downloader extension.
//
//   bun run scripts/build.ts            # build both browsers + zips
//   bun run scripts/build.ts --extension-only   # reserved flag; builds the same
//
// For each browser (chrome, firefox):
//   - wipes dist/<browser>, creates dist/<browser>/icons
//   - Bun.build(content.ts, background.ts, popup.ts) as classic IIFE scripts
//   - copies popup.html + popup.css
//   - writes manifest.json (manifestFor(browser))
//   - generates the four icon PNGs
// Then ZIPs dist/chrome -> web/public/downloads/chrome.zip and
// dist/firefox -> web/public/downloads/firefox.zip with a pure-bun writer
// (node:zlib deflateRawSync + hand-written CRC32 + ZIP structures).

import { build } from "bun";
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { deflateRawSync } from "node:zlib";
import { join, relative } from "node:path";
import { manifestFor, type Browser } from "./manifest.ts";
import { writeIcons } from "./icons.ts";

const SCRIPT_DIR = import.meta.dir;
const PROJECT = join(SCRIPT_DIR, "..");
const DIST = join(PROJECT, "dist");
const DOWNLOADS = join(PROJECT, "web", "public", "downloads");

const BROWSERS: Browser[] = ["chrome", "firefox"];

// ---------------------------------------------------------------------------
// Pure-bun ZIP writer (no external zip binary)
// ---------------------------------------------------------------------------

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u16le(out: Uint8Array, off: number, v: number): void {
  out[off] = v & 0xff;
  out[off + 1] = (v >>> 8) & 0xff;
}

function u32le(out: Uint8Array, off: number, v: number): void {
  out[off] = v & 0xff;
  out[off + 1] = (v >>> 8) & 0xff;
  out[off + 2] = (v >>> 16) & 0xff;
  out[off + 3] = (v >>> 24) & 0xff;
}

function concat(parts: Uint8Array[]): Uint8Array {
  let n = 0;
  for (const p of parts) n += p.length;
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

const DOS_EPOCH_TIME = 0; // mod time/date: 0 (1980-01-01 00:00)
const FLAG_UTF8 = 0x0800;
const METHOD_DEFLATE = 8;

function localHeader(name: Uint8Array, comp: Uint8Array, usize: number, crc: number): Uint8Array {
  const out = new Uint8Array(30 + name.length);
  u32le(out, 0, 0x04034b50);
  u16le(out, 4, 20); // version needed
  u16le(out, 6, FLAG_UTF8);
  u16le(out, 8, METHOD_DEFLATE);
  u16le(out, 10, DOS_EPOCH_TIME);
  u16le(out, 12, DOS_EPOCH_TIME);
  u32le(out, 14, crc);
  u32le(out, 18, comp.length);
  u32le(out, 22, usize);
  u16le(out, 26, name.length);
  u16le(out, 28, 0); // extra length
  out.set(name, 30);
  return out;
}

function centralHeader(
  name: Uint8Array,
  comp: Uint8Array,
  usize: number,
  crc: number,
  localOffset: number,
): Uint8Array {
  const out = new Uint8Array(46 + name.length);
  u32le(out, 0, 0x02014b50);
  u16le(out, 4, 0x0014); // version made by
  u16le(out, 6, 20); // version needed
  u16le(out, 8, FLAG_UTF8);
  u16le(out, 10, METHOD_DEFLATE);
  u16le(out, 12, DOS_EPOCH_TIME);
  u16le(out, 14, DOS_EPOCH_TIME);
  u32le(out, 16, crc);
  u32le(out, 20, comp.length);
  u32le(out, 24, usize);
  u16le(out, 28, name.length);
  u16le(out, 30, 0); // extra
  u16le(out, 32, 0); // comment
  u16le(out, 34, 0); // disk start
  u16le(out, 36, 0); // internal attrs
  u32le(out, 38, 0); // external attrs
  u32le(out, 42, localOffset);
  out.set(name, 46);
  return out;
}

function eocd(entryCount: number, cdSize: number, cdOffset: number): Uint8Array {
  const out = new Uint8Array(22);
  u32le(out, 0, 0x06054b50);
  u16le(out, 4, 0); // disk number
  u16le(out, 6, 0); // disk with central dir
  u16le(out, 8, entryCount);
  u16le(out, 10, entryCount);
  u32le(out, 12, cdSize);
  u32le(out, 16, cdOffset);
  u16le(out, 20, 0); // comment length
  return out;
}

export function writeZip(entries: ZipEntry[]): Uint8Array {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = new TextEncoder().encode(entry.name);
    // ZIP method 8 uses RAW DEFLATE (RFC1951), not the zlib wrapper.
    const comp = deflateRawSync(entry.data, { level: 9 });
    const crc = crc32(entry.data);
    const local = localHeader(name, comp, entry.data.length, crc);
    locals.push(local, comp);
    centrals.push(centralHeader(name, comp, entry.data.length, crc, offset));
    offset += local.length + comp.length;
  }

  const cdSize = centrals.reduce((n, b) => n + b.length, 0);
  return concat([...locals, ...centrals, eocd(entries.length, cdSize, offset)]);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(p);
    }
  };
  walk(dir);
  return out.sort();
}

function dirBytes(dir: string): number {
  return collectFiles(dir).reduce((n, f) => n + statSync(f).size, 0);
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

async function buildBrowser(browser: Browser): Promise<void> {
  const outdir = join(DIST, browser);
  rmSync(outdir, { recursive: true, force: true });
  mkdirSync(join(outdir, "icons"), { recursive: true });

  const result = await build({
    entrypoints: [
      join(PROJECT, "src", "content", "content.ts"),
      join(PROJECT, "src", "background", "background.ts"),
      join(PROJECT, "src", "popup", "popup.ts"),
    ],
    outdir,
    target: "browser",
    format: "iife",
    minify: false,
    sourcemap: "none",
    // Flat output: content.js, background.js, popup.js at the outdir root
    // (the manifest references them without directory prefixes).
    naming: "[name].[ext]",
  });

  if (!result.success) {
    console.error(`\nBuild failed for ${browser}:`);
    for (const log of result.logs) console.error(`  ${log}`);
    process.exit(1);
  }

  copyFileSync(join(PROJECT, "src", "popup", "popup.html"), join(outdir, "popup.html"));
  copyFileSync(join(PROJECT, "src", "popup", "popup.css"), join(outdir, "popup.css"));
  writeFileSync(join(outdir, "manifest.json"), JSON.stringify(manifestFor(browser), null, 2));
  writeIcons(join(outdir, "icons"));
}

async function main(): Promise<void> {
  const extensionOnly = process.argv.includes("--extension-only");
  // The flag is reserved: both browsers are always built.

  for (const browser of BROWSERS) {
    await buildBrowser(browser);
    console.log(`built dist/${browser}/ (${dirBytes(join(DIST, browser))} bytes)`);
  }

  mkdirSync(DOWNLOADS, { recursive: true });
  const zipSizes: Record<string, number> = {};
  for (const browser of BROWSERS) {
    const dir = join(DIST, browser);
    const files = collectFiles(dir);
    const entries: ZipEntry[] = files.map((f) => ({
      name: `${browser}/${relative(dir, f)}`,
      data: readFileSync(f),
    }));
    const zip = writeZip(entries);
    const out = join(DOWNLOADS, `${browser}.zip`);
    writeFileSync(out, zip);
    zipSizes[`${browser}.zip`] = zip.length;
  }

  // Summary
  console.log("\nSummary");
  for (const browser of BROWSERS) {
    const m = JSON.parse(readFileSync(join(DIST, browser, "manifest.json"), "utf8"));
    const iconCount = collectFiles(join(DIST, browser, "icons")).length;
    console.log(`  dist/${browser}/  manifest v${m.manifest_version} · ${iconCount} icons · background: ${JSON.stringify(m.background)}`);
    console.log(`    -> web/public/downloads/${browser}.zip  (${zipSizes[`${browser}.zip`]} bytes)`);
  }
  if (extensionOnly) console.log("  (--extension-only passed; both browsers were built — flag is reserved)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
