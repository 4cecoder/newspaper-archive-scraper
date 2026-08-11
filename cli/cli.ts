import { openLoginWindow, scrape, type BrowserName } from "./scraper.ts";
import { buildUrls } from "../src/core/index.ts";

interface CliOptions {
  command: "scrape" | "login";
  url?: string;
  outDir: string;
  profileDir: string;
  browser: BrowserName;
  channel?: "chrome";
  headless: boolean;
  delayMs: number;
  limit: number;
  onlyPublic: boolean;
  skipExisting: boolean;
  host: string;
}

const HELP = `
Newspaper archive (Veridian / Reveal Digital) PDF scraper.

  bun run login [options]          Open a browser so you can log in once.
  bun run scrape [options]         Download every page PDF of every issue.

Options:
  --url <url>          Starting point:
                         - title collection (default)
                         - a specific newspaper:  --url ".../?a=cl&cl=CL1&sp=TWA&ai=1"
                         - a specific issue:      --url ".../?a=d&d=MPD19210218-01"
  --out <dir>          Where to save PDFs (default: ./downloads)
  --profile <dir>      Browser profile holding your login (default: ./browser-profile)
  --browser <name>     chromium | firefox (default: chromium)
  --chrome             Use your installed Google Chrome instead of the bundled browser
  --headless           Run without a visible window (use after logging in once)
  --delay <ms>         Wait between requests (default: 600)
  --limit <n>          Stop after n issues (default: 0 = all)
  --only-public        Skip newspapers that require a login
  --no-skip-existing   Re-download pages even if already on disk

Examples:
  bun run login --browser firefox
  bun run scrape --url "https://dwso.revealdigital.org/?a=cl&cl=CL1&sp=TWA&ai=1" --limit 3
  bun run scrape --out "C:\\newspapers" --browser chromium --headless

Downloads land in folders like:
  ./downloads/The Western American/1922-Oct-01, Vol-01 Iss-01/page01.pdf
`;

function fail(msg: string): never {
  console.error(`error: ${msg}`);
  console.error(HELP);
  process.exit(1);
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    command: argv[0] === "login" ? "login" : "scrape",
    outDir: "downloads",
    profileDir: "browser-profile",
    browser: "chromium",
    headless: false,
    delayMs: 600,
    limit: 0,
    onlyPublic: false,
    skipExisting: true,
    host: "dwso.revealdigital.org",
  };

  const args = argv[0] === "login" || argv[0] === "scrape" ? argv.slice(1) : argv;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const next = () => args[++i];
    switch (a) {
      case "--help":
      case "-h":
        console.log(HELP);
        process.exit(0);
      case "--url":
        opts.url = next();
        break;
      case "--out":
        opts.outDir = next();
        break;
      case "--profile":
        opts.profileDir = next();
        break;
      case "--browser": {
        const b = next();
        if (b !== "chromium" && b !== "firefox") fail(`unknown browser "${b}"`);
        opts.browser = b;
        break;
      }
      case "--chrome":
        opts.channel = "chrome";
        break;
      case "--headless":
        opts.headless = true;
        break;
      case "--delay":
        opts.delayMs = Number(next());
        break;
      case "--limit":
        opts.limit = Number(next());
        break;
      case "--only-public":
        opts.onlyPublic = true;
        break;
      case "--no-skip-existing":
        opts.skipExisting = false;
        break;
      case "--host":
        opts.host = next();
        break;
      default:
        fail(`unknown argument "${a}"`);
    }
  }
  if (opts.command === "scrape" && !opts.url) {
    opts.url = buildUrls(opts.host).collection("CL1");
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.command === "login") {
    await openLoginWindow(opts.profileDir, opts.browser, opts.channel);
    return;
  }
  const summary = await scrape({
    host: opts.host,
    startUrl: opts.url!,
    outDir: opts.outDir,
    profileDir: opts.profileDir,
    browser: opts.browser,
    channel: opts.channel,
    headless: opts.headless,
    delayMs: opts.delayMs,
    limit: opts.limit,
    onlyPublic: opts.onlyPublic,
    skipExisting: opts.skipExisting,
  });
  if (summary.failed.length > 0 || summary.locked > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
