import { ChromeLogo, FirefoxLogo } from "@/components/icons";
import { SectionHeading } from "@/components/section-heading";

type Step = {
  instruction: string;
  hint?: string;
};

const chromeSteps: Step[] = [
  { instruction: "Unzip the downloaded file.", hint: "Double-click chrome.zip — your computer opens it into a folder." },
  { instruction: 'Open chrome://extensions in your Chrome browser.', hint: "Type it into the address bar and press Enter." },
  { instruction: 'Turn on "Developer mode" — the switch at the top right.' },
  { instruction: 'Click "Load unpacked".' },
  { instruction: "Select the unzipped folder (the one that contains manifest.json)." },
];

const firefoxSteps: Step[] = [
  { instruction: "Unzip the downloaded file." },
  { instruction: "Open about:debugging in your Firefox browser.", hint: "Type it into the address bar and press Enter." },
  { instruction: 'Click "This Firefox".' },
  { instruction: 'Click "Load Temporary Add-on".' },
  { instruction: "Select the manifest.json file inside the unzipped folder." },
];

function StepsCard({
  badge,
  browserName,
  note,
  steps,
}: {
  badge: React.ReactNode;
  browserName: string;
  note: string;
  steps: Step[];
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-ink-800/60 p-6 sm:p-8">
      <div className="flex items-center gap-4">
        {badge}
        <div>
          <h3 className="font-display text-xl font-semibold text-cream-50">
            Install in {browserName}
          </h3>
          <p className="mt-0.5 text-sm text-cream-400">{note}</p>
        </div>
      </div>

      <ol className="mt-7 space-y-0">
        {steps.map((step, index) => (
          <li key={step.instruction} className="relative flex gap-4 pb-6 last:pb-0">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-gold-500/40 bg-gold-400/10 text-xs font-semibold text-gold-300">
              {index + 1}
            </span>
            <div className="pt-0.5">
              <p className="text-sm font-medium leading-relaxed text-cream-200">
                {step.instruction}
              </p>
              {step.hint ? (
                <p className="mt-1 text-sm leading-relaxed text-cream-400">
                  {step.hint}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function InstallSection() {
  return (
    <section id="install" className="scroll-mt-24 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Install"
          title="How to install"
          description="No code, no special software — just your browser and about a minute of your time."
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <StepsCard
            badge={
              <span className="grid h-14 w-14 place-items-center rounded-xl border border-white/10 bg-white/5">
                <ChromeLogo className="h-8 w-8" />
              </span>
            }
            browserName="Chrome"
            note="Also works in Edge, Brave, and Opera."
            steps={chromeSteps}
          />
          <StepsCard
            badge={
              <span className="grid h-14 w-14 place-items-center rounded-xl border border-white/10 bg-white/5">
                <FirefoxLogo className="h-8 w-8" />
              </span>
            }
            browserName="Firefox"
            note="Loaded as a temporary add-on."
            steps={firefoxSteps}
          />
        </div>

        <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-gold-500/25 bg-gold-400/10 px-5 py-4">
          <p className="text-sm leading-relaxed text-cream-200">
            <span className="font-semibold text-gold-300">A note for Firefox users:</span>{" "}
            Firefox removes temporary add-ons when it closes. After a browser
            restart, simply open about:debugging again and re-select the same
            manifest.json file — it takes about 20 seconds.
          </p>
        </div>
      </div>
    </section>
  );
}
