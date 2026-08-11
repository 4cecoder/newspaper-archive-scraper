import { NewspaperMark } from "@/components/icons";

const navLinks = [
  { href: "#download", label: "Download" },
  { href: "#install", label: "Install" },
  { href: "#how-to-use", label: "How to use" },
  { href: "#faq", label: "FAQ" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-ink-900/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a
          href="#top"
          className="flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-400"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gold-400 text-ink-950">
            <NewspaperMark className="h-5 w-5" />
          </span>
          <span className="font-display text-base font-semibold leading-tight text-cream-50">
            Reveal Digital{" "}
            <span className="text-gold-400">Archive Downloader</span>
          </span>
        </a>

        <nav className="hidden items-center gap-7 text-sm text-cream-200 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-gold-300 after:transition-[width] after:duration-300 after:ease-out hover:text-gold-300 hover:after:w-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-400"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <a
          href="#download"
          className="inline-flex items-center gap-1.5 rounded-lg bg-gold-400 px-3.5 py-2 text-sm font-semibold text-ink-950 transition hover:bg-gold-300 active:translate-y-px active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400 sm:px-4"
        >
          Get the extension
        </a>
      </div>
    </header>
  );
}
