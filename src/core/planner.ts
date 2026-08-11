import { buildPageFileName, issueFolderPath } from "./paths.ts";
import type { Issue, ParsedIssue } from "./types.ts";
import { parseIssueLabel } from "./veridian.ts";

export type Mode = "all" | "publication" | "issue";

/** An issue queued for download, with its destination folder. */
export interface IssuePlan {
  title: string;
  sp?: string;
  docId: string;
  label: string;
  parsed: ParsedIssue;
  locked: boolean;
  folderPath: string; // e.g. The Western American/1922-Oct-01, Vol-01 Iss-01
}

/** One page to download. */
export interface PageJob {
  pageId: string; // e.g. 1.1
  filePath: string; // e.g. The Western American/1922-Oct-01, Vol-01 Iss-01/page01.pdf
}

/** Build the download plan for one issue from its list entry. */
export function toIssuePlan(title: string, issue: Issue): IssuePlan {
  const parsed = parseIssueLabel(issue.label);
  return {
    title,
    docId: issue.docId,
    label: issue.label,
    parsed,
    locked: issue.locked,
    folderPath: issueFolderPath(title, parsed),
  };
}

/** Build a plan for a single issue opened directly (no publication list page). */
export function singleIssuePlan(
  title: string,
  docId: string,
  label: string,
  parsed: ParsedIssue,
): IssuePlan {
  return {
    title,
    docId,
    label,
    parsed,
    locked: false,
    folderPath: issueFolderPath(title, parsed),
  };
}

/** Turn the page ids of an issue ("1.1", "1.2", ...) into page download jobs. */
export function planPages(plan: IssuePlan, pageIds: string[]): PageJob[] {
  return pageIds.map((pageId, i) => ({
    pageId,
    filePath: `${plan.folderPath}/${buildPageFileName(i)}`,
  }));
}
