import { PlusIcon } from "@/components/icons";
import { SectionHeading } from "@/components/section-heading";

const faqs = [
  {
    question: "Do I need to be logged in?",
    answer:
      "Yes. Open the archive in your browser and log in first — the extension works with the account you already have. No password is ever stored.",
  },
  {
    question: "Why do some issues say “login required”?",
    answer:
      "Those pages are locked behind the archive’s subscription. The extension skips them and carries on with the rest — everything else downloads normally.",
  },
  {
    question: "I closed my browser halfway through. Do I start over?",
    answer:
      "No. Just run it again — it checks what’s already saved and skips it, so it picks up right where it left off.",
  },
  {
    question: "Where do the files go?",
    answer:
      "Your browser’s Downloads folder. You get one tidy folder per issue, named like the archive’s own labels, and inside it every page as page01.pdf, page02.pdf, and so on.",
  },
  {
    question: "Is this really free?",
    answer:
      "Yes — the extension is free and open source. You can read the code, and even build it yourself, on GitHub.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-24 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="FAQ"
          title="Questions? Good — here are the answers"
          description="The short version of everything people usually ask about."
        />

        <div className="mx-auto mt-12 max-w-2xl space-y-3">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-xl border border-white/10 bg-ink-800/60 transition-colors open:border-gold-500/30 open:bg-ink-800"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gold-400 [&::-webkit-details-marker]:hidden">
                <span className="text-[15px] font-semibold text-cream-50">
                  {faq.question}
                </span>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-gold-500/40 bg-gold-400/10 text-gold-300 transition-transform group-open:rotate-45">
                  <PlusIcon className="h-3.5 w-3.5" />
                </span>
              </summary>
              <p className="px-5 pb-5 text-sm leading-relaxed text-cream-400">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
