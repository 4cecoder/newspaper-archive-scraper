export interface Publication {
  title: string;
  sp: string;
  locked: boolean;
}

export interface Issue {
  docId: string;
  label: string;
  locked: boolean;
}

export interface ParsedIssue {
  date: { year: number; month: number; day: number };
  volume: number | null;
  issue: number | null;
}
