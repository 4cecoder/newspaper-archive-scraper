import { SiteHeader } from "@/components/site-header";
import { Hero } from "@/components/hero";
import { DownloadSection } from "@/components/download-section";
import { InstallSection } from "@/components/install-section";
import { HowToUseSection } from "@/components/how-to-use-section";
import { FaqSection } from "@/components/faq-section";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <div id="top" className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <DownloadSection />
        <InstallSection />
        <HowToUseSection />
        <FaqSection />
      </main>
      <Footer />
    </div>
  );
}
