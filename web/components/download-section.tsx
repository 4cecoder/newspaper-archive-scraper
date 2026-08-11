import { browserDownloads } from "@/lib/downloads";
import { ChromeLogo, DownloadIcon, FirefoxLogo } from "@/components/icons";
import { SectionHeading } from "@/components/section-heading";

const GITHUB_URL = "https://github.com/4cecoder/newspaper-archive-scraper";

function BrowserBadge({ id }: { id: "chrome" | "firefox" }) {
  if (id === "chrome") {
    return (
      <span className="grid h-14 w-14 place-items-center rounded-xl border border-white/10 bg-white/5">
        <ChromeLogo className="h-8 w-8" />
      </span>
    );
  }
  return (
    <span className="grid h-14 w-14 place-items-center rounded-xl border border-white/10 bg-white/5">
      <FirefoxLogo className="h-8 w-8" />
    </span>
  );
}

export function DownloadSection() {
  return (
    <section id="download" className="scroll-mt-24 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Download"
          title="Get the extension"
          description="Free and open source. Installs in about a minute, and works with the account you already have on the archive."
        />

        <div className="mx-auto mt-12 grid max-w-3xl gap-5 sm:grid-cols-2">
          {browserDownloads.map((download) => (
            <article
              key={download.id}
              className="flex flex-col rounded-2xl border border-white/10 bg-ink-800/60 p-6 transition-colors hover:border-gold-500/30 hover:bg-ink-800"
            >
              <div className="flex items-start gap-4">
                <BrowserBadge id={download.id} />
                <div>
                  <h3 className="font-display text-xl font-semibold text-cream-50">
                    {download.name}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-cream-400">
                    {download.description}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-1 items-end">
                {download.available ? (
                  <a
                    href={download.href}
                    download
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gold-400 px-4 py-3 text-sm font-semibold text-ink-950 transition-colors hover:bg-gold-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300"
                  >
                    <DownloadIcon className="h-4 w-4" />
                    Download for {download.name === "Google Chrome" ? "Chrome" : "Firefox"}
                  </a>
                ) : (
                  <span
                    aria-disabled="true"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-cream-200/25 px-4 py-3 text-sm font-medium text-cream-400"
                  >
                    Coming soon — the build isn&apos;t packaged yet
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-cream-400">
          The extension is free and open source.{" "}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-gold-300 underline-offset-4 transition-colors hover:text-gold-400 hover:underline"
          >
            View the code on GitHub
          </a>
          .
        </p>
      </div>
    </section>
  );
}
