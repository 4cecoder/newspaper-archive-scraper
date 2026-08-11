import { CheckIcon, FileIcon, FolderIcon } from "@/components/icons";
import { SectionHeading } from "@/components/section-heading";

const steps = [
  {
    title: "Open the archive",
    body: "Go to the Reveal Digital archive you have access to and log in in that browser tab.",
  },
  {
    title: "Click the extension icon",
    body: "It lives in the toolbar at the top right of your browser. Pin it so it's always one click away.",
  },
  {
    title: "Pick what to download",
    body: "This issue, This newspaper, or Everything — the panel shows what each one means.",
  },
  {
    title: "Click Start",
    body: "That's it. Every page is saved as a PDF, and you can close the tab any time.",
  },
];

export function HowToUseSection() {
  return (
    <section id="how-to-use" className="scroll-mt-24 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="How to use"
          title="Download a whole newspaper in four steps"
          description="If you can use a browser, you can use this. There is nothing to configure."
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="relative rounded-2xl border border-white/10 bg-ink-800/60 p-6 transition-colors hover:border-gold-500/30 hover:bg-ink-800"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gold-400/10 font-display text-base font-bold text-gold-300">
                {index + 1}
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold text-cream-50">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-cream-400">
                {step.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-14 grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h3 className="font-display text-2xl font-semibold text-cream-50">
              What you end up with
            </h3>
            <p className="mt-4 text-base leading-relaxed text-cream-200">
              Every page becomes its own PDF, filed inside your browser&apos;s
              Downloads folder — one tidy folder per issue, named exactly the
              way the archive names it.
            </p>
            <ul className="mt-5 space-y-2.5">
              <li className="flex items-start gap-3 text-[15px] text-cream-200">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" />
                One folder per issue, e.g.{" "}
                <span className="font-mono text-sm text-cream-400">
                  1922-Oct-01, Vol-01 Iss-01
                </span>
              </li>
              <li className="flex items-start gap-3 text-[15px] text-cream-200">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" />
                One PDF per page, e.g.{" "}
                <span className="font-mono text-sm text-cream-400">
                  page01.pdf, page02.pdf…
                </span>
              </li>
              <li className="flex items-start gap-3 text-[15px] text-cream-200">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" />
                Already-saved pages are skipped, so re-running is always safe.
              </li>
            </ul>
          </div>

          {/* Mockup of the Downloads folder tree */}
          <div className="relative mx-auto w-full max-w-md">
            <div
              aria-hidden="true"
              className="absolute -inset-3 rounded-[1.75rem] bg-gradient-to-br from-gold-500/10 via-transparent to-transparent"
            />
            <div className="relative rounded-2xl border border-white/10 bg-ink-800/90 p-5 shadow-2xl shadow-black/40">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cream-400">
                Downloads
              </p>

              <div className="mt-4 space-y-1 font-mono text-[13px] leading-relaxed">
                <div className="flex items-center gap-2 text-cream-200">
                  <FolderIcon className="h-4 w-4 text-gold-400" />
                  The Western American
                </div>
                <div className="ml-5 border-l border-white/10 pl-4">
                  <div className="flex items-center gap-2 text-cream-200">
                    <FolderIcon className="h-4 w-4 text-gold-400" />
                    1922-Oct-01, Vol-01 Iss-01
                  </div>
                  <div className="ml-5 space-y-1 border-l border-white/10 pl-4 pt-1">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="flex items-center gap-2 text-cream-400">
                        <FileIcon className="h-3.5 w-3.5 text-cream-400" />
                        page0{n}.pdf
                        <CheckIcon className="ml-auto h-3.5 w-3.5 text-gold-300" />
                      </div>
                    ))}
                    <p className="pt-0.5 text-cream-400">… and 9 more pages</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
