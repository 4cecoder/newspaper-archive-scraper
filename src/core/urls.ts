export const STATE = "-------en-20--1--txt-txIN---------------1";

export interface Urls {
  collection: (cl?: string) => string;
  publication: (sp: string, cl?: string) => string;
  issue: (docId: string) => string;
  pagePdf: (docId: string, pageId: string) => string;
  home: () => string;
}

export function buildUrls(host = "dwso.revealdigital.org"): Urls {
  const base = `https://${host}/?`;
  return {
    collection: (cl = "CL1") => `${base}a=cl&cl=${cl}&e=${STATE}`,
    publication: (sp: string, cl = "CL1") => `${base}a=cl&cl=${cl}&sp=${sp}&ai=1&e=${STATE}`,
    issue: (docId: string) => `${base}a=d&d=${docId}&e=${STATE}`,
    pagePdf: (docId: string, pageId: string) =>
      `${base}a=is&oid=${docId}.${pageId}&type=staticpdf&e=${STATE}`,
    home: () => `https://${host}/`,
  };
}
