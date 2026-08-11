import { describe, expect, test } from "bun:test";
import {
  buildFolderName,
  buildPageFileName,
  buildRelativePath,
  buildUrls,
  extractIssueMetadata,
  extractPageIds,
  extractPublicationTitle,
  extractTitleFromIssueHeader,
  parseIssueLabel,
  parseIssues,
  parsePublications,
  sanitizeFilename,
} from "../src/core/index.ts";

const cl1Fixture = `
<a id="A"></a><h2>A</h2>
  <ul class="publicationbrowserlist doublecolumn">
<li><a  class="uhialockedlink" href="/?a=cl&amp;cl=CL1&amp;sp=BECCDIJJ&amp;ai=1&amp;e=-------en-20--1--txt-txIN---------------1">American Citizen</a></li> <li><a  class="uhialockedlink" href="/?a=cl&amp;cl=CL1&amp;sp=BEDEBCBJ&amp;ai=1&amp;e=-------en-20--1--txt-txIN---------------1">American Forum</a></li>

<li><a   href="/?a=cl&amp;cl=CL1&amp;sp=TBA&amp;ai=1&amp;e=-------en-20--1--txt-txIN---------------1">The Broad Ax</a></li>
</ul>

  <a id="W"></a><h2>W</h2>
  <ul class="publicationbrowserlist doublecolumn">
<li><a  class="uhialockedlink" href="/?a=cl&amp;cl=CL1&amp;sp=TWA&amp;ai=1&amp;e=-------en-20--1--txt-txIN---------------1">The Western American</a></li> <li><a  class="uhialockedlink" href="/?a=cl&amp;cl=CL1&amp;sp=WOL&amp;ai=1&amp;e=-------en-20--1--txt-txIN---------------1">Western Outlook</a></li>
</ul>
`;

const issueListFixture = `
<ul id="publicationdocumentslist">
<li><a  href="/?a=d&amp;d=MPD19210218-01&amp;e=-------en-20--1--txt-txIN---------------1"> 18 February 1921, Volume 1, Issue 6</a></li>
<li><a  href="/?a=d&amp;d=MPD19210225-01&amp;e=-------en-20--1--txt-txIN---------------1"> 25 February 1921, Volume 1, Issue 7</a></li>
<li><a  href="/?a=d&amp;d=MPD19220106-01&amp;e=-------en-20--1--txt-txIN---------------1"> 6 January 1922, Volume 2, Issue 1</a></li>
<li><a  href="/?a=d&amp;d=MPD19261104-01&amp;e=-------en-20--1--txt-txIN---------------1"> 4 November 1926, Volume 6, Issue 41</a></li>
</ul>
`;

const lockedIssueListFixture = `
<ul id="publicationdocumentslist">
<li><a  href="/?a=d&amp;d=TWA19221130-01&amp;e=-------en-20--1--txt-txIN---------------1"> 30 November 1922, Volume 1, Issue 17</a><img src="/images/kk.gif" style="height: 16px; width: 16px" title="Locked" /></li>
<li><a  href="/?a=d&amp;d=TWA19221228-01&amp;e=-------en-20--1--txt-txIN---------------1"> 28 December 1922, Volume 1, Issue 21</a><img src="/images/kk.gif" style="height: 16px; width: 16px" title="Locked" /></li>
</ul>
`;

const viewerFixture = `
<div id="oseadinitialviewerdata" data-osead-config-json='{ "collectionMode": true }' data-viewer-data-base-json='
{
  "blankTile": "/web/images/blank.gif",
  "documentOID": "TWA19221130-01",
  "imageserverPageTileImageRequestBase": "/?a=is&amp;type=pagetileimage",
  "pageImageSizes": { "1.1":{"w":4849,"h":6225},"1.2":{"w":4870,"h":6214},"1.3":{"w":4983,"h":6284},"1.4":{"w":4882,"h":6227} },
  "pageTitles": { "1.1":"&lt;h2&gt;Page 1&lt;/h2&gt;", "1.2":"&lt;h2&gt;Page 2&lt;/h2&gt;" }
}
'></div>
`;

describe("parsePublications", () => {
  test("extracts title, sp code and locked flag", () => {
    const pubs = parsePublications(cl1Fixture);
    expect(pubs).toHaveLength(5);
    expect(pubs).toContainEqual({ title: "The Broad Ax", sp: "TBA", locked: false });
    expect(pubs).toContainEqual({ title: "The Western American", sp: "TWA", locked: true });
    expect(pubs).toContainEqual({ title: "American Citizen", sp: "BECCDIJJ", locked: true });
  });
});

describe("parseIssues", () => {
  test("extracts docId and label from issue list", () => {
    const issues = parseIssues(issueListFixture);
    expect(issues).toHaveLength(4);
    expect(issues[0]).toEqual({ docId: "MPD19210218-01", label: "18 February 1921, Volume 1, Issue 6", locked: false });
    expect(issues[2]).toEqual({ docId: "MPD19220106-01", label: "6 January 1922, Volume 2, Issue 1", locked: false });
  });

  test("flags issues with a lock icon", () => {
    const issues = parseIssues(lockedIssueListFixture);
    expect(issues).toHaveLength(2);
    expect(issues[0]).toEqual({ docId: "TWA19221130-01", label: "30 November 1922, Volume 1, Issue 17", locked: true });
  });
});

describe("parseIssueLabel", () => {
  test("parses date, volume and issue", () => {
    expect(parseIssueLabel("18 February 1921, Volume 1, Issue 6")).toEqual({
      date: { year: 1921, month: 2, day: 18 },
      volume: 1,
      issue: 6,
    });
  });

  test("supports Number as a synonym for Issue", () => {
    expect(parseIssueLabel("1 June 1924, Volume 4, Number 3")).toEqual({
      date: { year: 1924, month: 6, day: 1 },
      volume: 4,
      issue: 3,
    });
  });

  test("handles labels without volume/issue", () => {
    expect(parseIssueLabel("1 June 1924")).toEqual({
      date: { year: 1924, month: 6, day: 1 },
      volume: null,
      issue: null,
    });
  });
});

describe("extractPageIds", () => {
  test("reads page ids from the embedded viewer json", () => {
    expect(extractPageIds(viewerFixture)).toEqual(["1.1", "1.2", "1.3", "1.4"]);
  });
});

describe("extractPublicationTitle", () => {
  test("reads the title from a publication metadata block", () => {
    const html = `<div><b>Title:</b> The Western American</div><div><b>Series:</b> Anti-Klan Newspaper</div>`;
    expect(extractPublicationTitle(html)).toBe("The Western American");
  });
});

describe("extractTitleFromIssueHeader", () => {
  test("reads the newspaper name from the issue header", () => {
    const html = `<div id="documentdisplayheader" class="commonedging"><h2>The Western American, Volume 1, Issue 17, 30 November 1922</h2></div>`;
    expect(extractTitleFromIssueHeader(html)).toBe("The Western American");
  });
});

describe("extractIssueMetadata", () => {
  test("reads date, volume and number from the metadata table", () => {
    const html = `
      <div class="divtable metadatadisplay">
        <div><div class="label">Date</div><div class="content">18 February 1921</div></div>
        <div><div class="label">Volume</div><div class="content">1</div></div>
        <div><div class="label">Number</div><div class="content">6</div></div>
        <div><div class="label">Pages</div><div class="content">4</div></div>
      </div>`;
    expect(extractIssueMetadata(html)).toEqual({
      date: "18 February 1921",
      volume: 1,
      issue: 6,
    });
  });
});

describe("path builders", () => {
  test("builds the issue folder name exactly as requested", () => {
    expect(buildFolderName({ date: { year: 1922, month: 10, day: 1 }, volume: 1, issue: 1 })).toBe(
      "1922-Oct-01, Vol-01 Iss-01",
    );
  });

  test("folder name falls back to the date when vol/issue are missing", () => {
    expect(buildFolderName({ date: { year: 1922, month: 10, day: 1 }, volume: null, issue: null })).toBe(
      "1922-Oct-01",
    );
  });

  test("zero pads page numbers", () => {
    expect(buildPageFileName(0)).toBe("page01.pdf");
    expect(buildPageFileName(8)).toBe("page09.pdf");
    expect(buildPageFileName(26)).toBe("page27.pdf");
  });

  test("builds the full relative path", () => {
    expect(
      buildRelativePath(
        "The Western American: A Magazine of Good Citizenship",
        { date: { year: 1922, month: 10, day: 1 }, volume: 1, issue: 1 },
        0,
      ),
    ).toBe("The Western American - A Magazine of Good Citizenship/1922-Oct-01, Vol-01 Iss-01/page01.pdf");
  });
});

describe("sanitizeFilename", () => {
  test("replaces characters that are illegal on Windows", () => {
    expect(sanitizeFilename(`a:b*c?"<d>e|f\\g`)).toBe("a - b - c - d - e - f - g");
  });
});

describe("buildUrls", () => {
  test("builds the collection, publication, issue and pdf urls", () => {
    const urls = buildUrls("dwso.revealdigital.org");
    expect(urls.collection("CL1")).toBe(
      "https://dwso.revealdigital.org/?a=cl&cl=CL1&e=-------en-20--1--txt-txIN---------------1",
    );
    expect(urls.publication("TWA")).toContain("sp=TWA");
    expect(urls.issue("MPD19210218-01")).toContain("d=MPD19210218-01");
    expect(urls.pagePdf("MPD19210218-01", "1.1")).toBe(
      "https://dwso.revealdigital.org/?a=is&oid=MPD19210218-01.1.1&type=staticpdf&e=-------en-20--1--txt-txIN---------------1",
    );
  });
});
