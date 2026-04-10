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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen font-sans antialiased" suppressHydrationWarning>
        <Providers>
          <SiteHeader />
          <main className="min-h-[60vh] w-full px-4 py-8 sm:px-6 lg:px-8">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
