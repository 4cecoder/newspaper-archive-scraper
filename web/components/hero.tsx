import { CheckIcon, NewspaperMark } from "@/components/icons";

const benefits = [
  "Every page, saved as a PDF — one click per issue, nothing to copy or paste.",
  "Tidy folders — each issue lands in its own folder, named like the archive's own labels.",
  "Resume any time — stopped mid-run? Just run it again; it picks up where it left off.",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Soft gold glow behind the hero */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70rem_35rem_at_50%_-5%,rgba(217,182,74,0.10),transparent_65%)]"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8 lg:pb-28 lg:pt-24">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-400/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">
            A free browser extension
          </p>

          <h1 className="mt-6 font-display text-4xl font-bold leading-[1.08] text-cream-50 sm:text-5xl lg:text-[3.4rem]">
            Save hours of clicking — download whole newspapers with one click.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-cream-200">
            Reveal Digital Archive Downloader turns every page of a Reveal
            Digital newspaper archive into PDFs — neatly filed by issue,
            straight into your Downloads folder.
          </p>

          <ul className="mt-8 space-y-3.5">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gold-400/15 text-gold-300">
                  <CheckIcon className="h-3 w-3" />
                </span>
                <span className="text-[15px] leading-relaxed text-cream-200">
                  {benefit}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href="#download"
              className="inline-flex items-center gap-2 rounded-lg bg-gold-400 px-6 py-3 text-base font-semibold text-ink-950 shadow-lg shadow-gold-500/20 transition-colors hover:bg-gold-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300"
            >
              Get the extension
            </a>
            <a
              href="#install"
              className="inline-flex items-center gap-2 rounded-lg border border-cream-200/25 px-6 py-3 text-base font-medium text-cream-50 transition-colors hover:border-gold-400/50 hover:text-gold-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
            >
              See how to install
            </a>
          </div>

          <p className="mt-6 text-sm text-cream-400">
            Free &amp; open source · Works on Chrome and Firefox
          </p>
        </div>

        {/* Mockup of the extension popup */}
        <div className="relative mx-auto w-full max-w-sm">
          <div
            aria-hidden="true"
            className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-gold-500/15 via-transparent to-transparent"
          />
          <div className="relative rounded-2xl border border-white/10 bg-ink-800/90 p-5 shadow-2xl shadow-black/40 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 pb-3">
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-gold-400/60" />
            </div>

            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-gold-400 text-ink-950">
                <NewspaperMark className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-cream-50">
                  Reveal Digital Archive Downloader
                </p>
                <p className="text-xs text-cream-400">Ready to go</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/5 bg-ink-900/70 px-4 py-3">
              <p className="font-display text-sm font-semibold text-cream-50">
                The Western American
              </p>
              <p className="mt-0.5 text-xs text-cream-400">
                1922-Oct-01, Vol-01 Iss-01
              </p>
            </div>

            <div className="mt-3 space-y-1.5">
              {[
                { label: "This issue", detail: "24 pages" },
                { label: "This newspaper", detail: "340 issues" },
                { label: "Everything", detail: "12 newspapers" },
              ].map((option, index) => (
                <div
                  key={option.label}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm ${
                    index === 0
                      ? "border border-gold-500/30 bg-gold-400/10"
                      : "border border-white/5 bg-ink-900/50"
                  }`}
                >
                  <span className="flex items-center gap-2.5 text-cream-200">
                    <span
                      className={`grid h-3.5 w-3.5 place-items-center rounded-full border ${
                        index === 0
                          ? "border-gold-400"
                          : "border-cream-200/30"
                      }`}
                    >
                      {index === 0 ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />
                      ) : null}
                    </span>
                    {option.label}
                  </span>
                  <span className="font-mono text-xs text-cream-400">
                    {option.detail}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gold-400 px-4 py-2.5 text-sm font-semibold text-ink-950">
              Start download
            </div>

            <p className="mt-3 text-center text-xs text-cream-400">
              Saves to Downloads · one tidy folder per issue
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
