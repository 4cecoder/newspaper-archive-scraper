import type { ParsedIssue } from "./types.ts";

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** YYYY-MMM-DD, e.g. 1922-Oct-01. */
export function formatDate(date: { year: number; month: number; day: number }): string {
  const yyyy = String(date.year).padStart(4, "0");
  const mmm = date.month >= 1 && date.month <= 12 ? MONTH_SHORT[date.month - 1] : "???";
  const dd = String(date.day).padStart(2, "0");
  return `${yyyy}-${mmm}-${dd}`;
}

/** "1922-Oct-01, Vol-01 Iss-01" (or just the date when vol/issue are missing). */
export function buildFolderName(parsed: ParsedIssue): string {
  const date = formatDate(parsed.date);
  if (parsed.volume != null && parsed.issue != null) {
    return `${date}, Vol-${String(parsed.volume).padStart(2, "0")} Iss-${String(parsed.issue).padStart(2, "0")}`;
  }
  return date;
}

export function buildPageFileName(pageIndex: number): string {
  return `page${String(pageIndex + 1).padStart(2, "0")}.pdf`;
}

/** Folder path like "The Western American/1922-Oct-01, Vol-01 Iss-01". */
export function issueFolderPath(title: string, parsed: ParsedIssue): string {
  return `${sanitizeFilename(title)}/${buildFolderName(parsed)}`;
}

/** Relative path like "The Western American/1922-Oct-01, Vol-01 Iss-01/page01.pdf". */
export function buildRelativePath(title: string, parsed: ParsedIssue, pageIndex: number): string {
  return `${issueFolderPath(title, parsed)}/${buildPageFileName(pageIndex)}`;
}

/** Replace characters that are illegal in Windows/Unix paths; keep existing hyphens intact. */
export function sanitizeFilename(name: string): string {
  const HYPHEN = "\uE000";
  const SEP = "\uE001";
  const cleaned = name
    .replace(/-/g, HYPHEN)
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, SEP)
    .replace(/\uE001+/g, " - ")
    .replace(/\uE000/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^[\s-]+|[\s-]+$/g, "")
    .trim();
  return cleaned || "Untitled";
}
