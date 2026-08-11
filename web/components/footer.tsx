import { NewspaperMark } from "@/components/icons";

const GITHUB_URL = "https://github.com/4cecoder/newspaper-archive-scraper";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-start">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold-400 text-ink-950">
              <NewspaperMark className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-base font-semibold text-cream-50">
                Reveal Digital Archive Downloader
              </p>
              <p className="mt-1 text-sm text-cream-400">
                A free, open source browser extension for newspaper researchers
                and local-history fans.
              </p>
            </div>
          </div>

          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cream-400">
              Open source
            </p>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm font-medium text-gold-300 underline-offset-4 transition-colors hover:text-gold-400 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-400"
            >
              View the code on GitHub
            </a>
          </div>
        </div>

        <div className="mt-10 border-t border-white/5 pt-6">
          <p className="text-xs text-cream-400">
            © {year} Reveal Digital Archive Downloader. Made for readers, by
            readers.
          </p>
        </div>
      </div>
    </footer>
  );
}
