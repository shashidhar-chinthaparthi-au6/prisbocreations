import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ConditionalStoreShell } from "@/components/storefront/ConditionalStoreShell";
import { getAssistantEnabledCached } from "@/lib/services/storefrontSettingsService";
import { WhatsAppFab } from "@/components/WhatsAppFab";
import { AnalyticsScripts } from "@/components/analytics/AnalyticsScripts";

const display = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-display",
  display: "swap",
  preload: true,
});

const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
  preload: true,
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Prisbo Creations",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#c47a2b",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let assistantEnabled = true;
  try {
    assistantEnabled = await getAssistantEnabledCached();
  } catch {
    assistantEnabled = true;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://prisbocreations.com";
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Prisbo Creations",
    url: siteUrl,
    logo: `${siteUrl.replace(/\/$/, "")}/favicon.svg`,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["English", "Telugu", "Hindi"],
    },
    sameAs: [
      process.env.NEXT_PUBLIC_INSTAGRAM_URL,
    ].filter(Boolean),
  };

  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
        />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <Providers>
          <ConditionalStoreShell assistantEnabled={assistantEnabled}>{children}</ConditionalStoreShell>
          <WhatsAppFab />
          <AnalyticsScripts />
        </Providers>
      </body>
    </html>
  );
}
