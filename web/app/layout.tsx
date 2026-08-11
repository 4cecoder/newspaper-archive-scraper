import type { Metadata, Viewport } from "next";
import { Geist, Playfair_Display } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://4cecoder.github.io/newspaper-archive-scraper";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Reveal Digital Archive Downloader — Download whole newspapers as PDFs",
  description:
    "A free browser extension that downloads every page of a Reveal Digital (Veridian) newspaper archive as PDFs — one tidy folder per issue, straight into your Downloads folder.",
  applicationName: "Reveal Digital Archive Downloader",
  keywords: [
    "Reveal Digital",
    "newspaper archive",
    "download newspapers",
    "PDF",
    "browser extension",
  ],
  openGraph: {
    title: "Reveal Digital Archive Downloader",
    description:
      "Save hours of clicking. Download every page of a Reveal Digital newspaper archive as PDFs with one click.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1626",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${playfairDisplay.variable} antialiased`}
    >
      <body className="min-h-screen bg-ink-900 text-cream-50">
        {children}
      </body>
    </html>
  );
}
