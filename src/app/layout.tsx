import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const display = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
});

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Prisbo Creations — Personalized Gifts & Print",
    template: "%s · Prisbo Creations",
  },
  description:
    "Premium personalized paper goods, acrylic keepsakes, stationery, home decor, and apparel — crafted for celebrations and brands.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body
        className="font-sans antialiased"
        suppressHydrationWarning
      >
        <Providers>
          <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
            <SiteHeader />
            <main
              id="site-main-scroll"
              className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-[#f1f3f6] px-[max(1rem,env(safe-area-inset-left))] py-6 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-7 lg:px-8"
            >
              {children}
            </main>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
