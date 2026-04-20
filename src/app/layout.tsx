import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ConditionalStoreShell } from "@/components/storefront/ConditionalStoreShell";

const display = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-display",
});

const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Prisbo Creations — Crafted for your story",
    template: "%s · Prisbo Creations",
  },
  description:
    "Personalised gifts and keepsakes, made in-studio in India — paper, acrylic, stationery, décor, and apparel.",
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
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <Providers>
          <ConditionalStoreShell>{children}</ConditionalStoreShell>
        </Providers>
      </body>
    </html>
  );
}
