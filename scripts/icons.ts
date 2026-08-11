// Pure-bun PNG icon generator.
//
// No external image libraries: PNG encoding is done by hand with node:zlib
// (deflateSync) plus a hand-written CRC32 and PNG chunk writer
// (signature, IHDR 8-bit RGBA, IDAT, IEND).
//
// The icon is a rounded-square deep-navy tile with a cream "headline bar"
// and a gold accent underneath — drawn per-pixel with simple SDF math.

import { deflateSync } from "node:zlib";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// CRC32 (standard reflected polynomial 0xEDB88320)
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

// ---------------------------------------------------------------------------
// PNG encoding
// ---------------------------------------------------------------------------

function u32be(out: Uint8Array, off: number, v: number): void {
  out[off] = (v >>> 24) & 0xff;
  out[off + 1] = (v >>> 16) & 0xff;
  out[off + 2] = (v >>> 8) & 0xff;
  out[off + 3] = v & 0xff;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  u32be(out, 0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  u32be(out, 8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
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

/** Encode an RGBA pixel buffer as an 8-bit RGBA PNG. */
export function encodePng(width: number, height: number, rgba: Uint8Array): Uint8Array {
  const raw = new Uint8Array((width * 4 + 1) * height);
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0; // filter: none
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), o);
    o += width * 4;
  }
  const idat = deflateSync(raw, { level: 9 });

  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = new Uint8Array(13);
  u32be(ihdr, 0, width);
  u32be(ihdr, 4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: truecolor + alpha
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", new Uint8Array(0))]);
}

// ---------------------------------------------------------------------------
// Icon drawing (per-pixel SDF math)
// ---------------------------------------------------------------------------

const NAVY_TOP = [12, 24, 44];
const NAVY_BOTTOM = [22, 42, 74];
const CREAM = [243, 233, 208];
const GOLD = [201, 162, 39];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function mix(a: number[], b: number[], t: number): number[] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Signed distance to a rounded rectangle centered on the tile. */
function roundedRectSdf(px: number, py: number, size: number, radius: number): number {
  const cx = Math.abs(px - size / 2) - (size / 2 - radius);
  const cy = Math.abs(py - size / 2) - (size / 2 - radius);
  const ax = Math.max(cx, 0);
  const ay = Math.max(cy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(cx, cy), 0) - radius;
}

/**
 * Signed distance to an axis-aligned box (negative inside, 0 on the edge).
 * Coverage via clamp(0.5 - d) then yields a 1px anti-aliased edge.
 */
function boxSdf(px: number, py: number, x0: number, y0: number, x1: number, y1: number): number {
  return Math.max(x0 - px, px - x1, y0 - py, py - y1);
}

export function renderIcon(size: number): Uint8Array {
  const px = new Uint8Array(size * size * 4);
  const radius = size / 5;
  const w = size;
  const h = size;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const fxp = x + 0.5;
      const fyp = y + 0.5;

      // Rounded-square tile with a soft edge.
      const cov = clamp01(0.5 - roundedRectSdf(fxp, fyp, size, radius));
      if (cov <= 0) continue;

      // Deep-navy vertical gradient background.
      let col = mix(NAVY_TOP, NAVY_BOTTOM, y / Math.max(h - 1, 1));

      // Cream "headline bar".
      const dBar = boxSdf(fxp, fyp, w * 0.2, h * 0.38, w * 0.8, h * 0.52);
      const aBar = clamp01(0.5 - dBar);
      col = mix(col, CREAM, aBar);

      // Gold accent rule beneath the headline.
      const dGold = boxSdf(fxp, fyp, w * 0.2, h * 0.6, w * 0.8, h * 0.66);
      const aGold = clamp01(0.5 - dGold);
      col = mix(col, GOLD, aGold);

      px[i] = Math.round(col[0]);
      px[i + 1] = Math.round(col[1]);
      px[i + 2] = Math.round(col[2]);
      px[i + 3] = Math.round(cov * 255);
    }
  }

  return encodePng(size, size, px);
}

export const ICON_SIZES = [16, 32, 48, 128];

/** Write icon16/32/48/128.png into dir; returns the written paths. */
export function writeIcons(dir: string): string[] {
  mkdirSync(dir, { recursive: true });
  const paths: string[] = [];
  for (const size of ICON_SIZES) {
    const out = join(dir, `icon${size}.png`);
    writeFileSync(out, renderIcon(size));
    paths.push(out);
  }
  return paths;
}

// Standalone: `bun run scripts/icons.ts` writes icons into dist/icons.
if (import.meta.main) {
  const dir = join(import.meta.dir, "..", "dist", "icons");
  const paths = writeIcons(dir);
  for (const p of paths) console.log(`wrote ${p} (${statSync(p).size} bytes)`);
}
