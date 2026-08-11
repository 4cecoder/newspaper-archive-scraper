// Parsers for the Veridian / Reveal Digital HTML structure.
// These functions are pure: they take raw HTML strings and return structured data.
// They are shared by the browser extension, the CLI scraper, and the tests.

import type { Issue, ParsedIssue, Publication } from "./types.ts";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Parse the title collection page (?a=cl&cl=CL1) into a list of publications. */
export function parsePublications(html: string): Publication[] {
  const out: Publication[] = [];
  const ulRe = /<ul[^>]*class="publicationbrowserlist[^"]*"[^>]*>([\s\S]*?)<\/ul>/gi;
  const linkRe = /<a\s+([^>]*?)href="[^"]*sp=([A-Z0-9]+)&amp;ai=1[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const ulMatch of html.matchAll(ulRe)) {
    for (const m of ulMatch[1].matchAll(linkRe)) {
      const attrs = m[1];
      out.push({
        title: decodeHtml(m[3]).trim(),
        sp: m[2],
        locked: /uhialockedlink/.test(attrs),
      });
    }
  }
  return out;
}

/** Parse a publication page (?a=cl&cl=CL1&sp=XXX&ai=1) into its list of issues. */
export function parseIssues(html: string): Issue[] {
  const out: Issue[] = [];
  const ulRe = /<ul[^>]*id="publicationdocumentslist"[^>]*>([\s\S]*?)<\/ul>/i;
  const linkRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  const ulMatch = html.match(ulRe);
  if (!ulMatch) return out;
  for (const liMatch of ulMatch[1].matchAll(linkRe)) {
    const li = liMatch[1];
    const a = li.match(/<a\s+[^>]*href="[^"]*a=d&amp;d=([A-Z0-9-]+)&amp;e=[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
    if (!a) continue;
    out.push({
      docId: a[1],
      label: decodeHtml(a[2]).trim(),
      locked: /title="Locked"/i.test(li) || /uhialockedlink/.test(li),
    });
  }
  return out;
}

/** Parse an issue label like "18 February 1921, Volume 1, Issue 6". */
export function parseIssueLabel(label: string): ParsedIssue {
  const dateMatch = label.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  let date: ParsedIssue["date"] = { year: 0, month: 0, day: 0 };
  if (dateMatch) {
    const month = MONTHS.findIndex(
      (m) => m.toLowerCase().startsWith(dateMatch[2].toLowerCase().slice(0, 3)),
    );
    date = {
      year: Number(dateMatch[3]),
      month: month >= 0 ? month + 1 : 0,
      day: Number(dateMatch[1]),
    };
  }
  const vol = label.match(/Volume\s+(\d+)/i);
  const iss = label.match(/Issue\s+(\d+)|Number\s+(\d+)/i);
  return {
    date,
    volume: vol ? Number(vol[1]) : null,
    issue: iss ? Number(iss[1] ?? iss[2]) : null,
  };
}

/** Read the page ids ("1.1", "1.2", ...) from an issue page's embedded viewer JSON. */
export function extractPageIds(html: string): string[] {
  const idx = html.indexOf("pageImageSizes");
  if (idx === -1) return [];
  let i = html.indexOf(":", idx) + 1;
  while (i < html.length && /\s/.test(html[i])) i++;
  if (html[i] !== "{") return [];
  const start = i;
  let depth = 0;
  for (; i < html.length; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}") {
      depth--;
      if (depth === 0) break;
    }
  }
  if (depth !== 0) return [];
  try {
    const obj = JSON.parse(decodeHtml(html.slice(start, i + 1))) as Record<string, unknown>;
    return Object.keys(obj);
  } catch {
    return [];
  }
}

/** Publication title from the metadata block on a publication page. */
export function extractPublicationTitle(html: string): string | null {
  const m = html.match(/<b>Title:<\/b>\s*([^<]*)/i);
  return m ? decodeHtml(m[1]).trim() : null;
}

/** Newspaper name from an issue page's <h2>, e.g. "Muncie Post-Democrat, Volume 1...". */
export function extractTitleFromIssueHeader(html: string): string | null {
  const m = html.match(/<div id="documentdisplayheader"[^>]*><h2>([^<]+)<\/h2>/);
  if (!m) return null;
  return m[1].split(",")[0]?.trim() ?? null;
}

export interface IssueMetadata {
  date?: string;
  volume?: number | null;
  issue?: number | null;
}

/** Date / Volume / Number from the issue page metadata table. */
export function extractIssueMetadata(html: string): IssueMetadata {
  const meta: IssueMetadata = {};
  const rowRe = /class="label">([^<]+)<\/div><div class="content">([^<]*)<\/div>/g;
  for (const m of html.matchAll(rowRe)) {
    const label = m[1].trim().toLowerCase();
    const value = m[2].trim();
    if (label === "date") meta.date = value;
    else if (label === "volume") meta.volume = value ? Number(value) : null;
    else if (label === "number") meta.issue = value ? Number(value) : null;
  }
  return meta;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
