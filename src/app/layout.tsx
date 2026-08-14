import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/lib/auth/provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://nexus-suite-tau.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Nexus Suite — Modular Enterprise PM",
    template: "%s | Nexus Suite",
  },
  description:
    "All-in-one modular enterprise project management platform. Tasks, room booking, reporting, and more — toggle only the modules you need. Free and open-source under AGPL-3.0.",
  keywords: [
    "Nexus Suite",
    "project management",
    "modular",
    "task management",
    "room booking",
    "enterprise",
    "open source ERP",
    "self-hosted PM",
  ],
  authors: [{ name: "Nexus Suite" }],
  creator: "Nexus Suite",
  publisher: "Nexus Suite",
  icons: {
    icon: "/logo.svg",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Nexus Suite",
    title: "Nexus Suite — Modular Enterprise PM",
    description:
      "All-in-one modular enterprise project management platform. Tasks, room booking, reporting, and more — toggle only the modules you need. Free and open-source under AGPL-3.0.",
    images: [
      {
        url: "/social-preview.png",
        width: 1200,
        height: 630,
        alt: "Nexus Suite — All-in-one modular enterprise PM + ERP suite",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexus Suite — Modular Enterprise PM",
    description:
      "All-in-one modular enterprise project management platform. Tasks, room booking, reporting, and more — toggle only the modules you need.",
    images: ["/social-preview.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Nexus Suite",
      url: siteUrl,
      logo: `${siteUrl}/logo.svg`,
      description:
        "All-in-one modular enterprise project management platform — tasks, room booking, reporting, and more. Free and open-source under AGPL-3.0.",
    },
    {
      "@type": "SoftwareApplication",
      name: "Nexus Suite",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: siteUrl,
      description:
        "Modular enterprise PM + ERP suite. Toggle only the modules you need. Self-hostable and open-source under AGPL-3.0.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      license: "https://www.gnu.org/licenses/agpl-3.0.html",
    },
    {
      "@type": "WebSite",
      name: "Nexus Suite",
      url: siteUrl,
      description:
        "All-in-one modular enterprise project management platform. Free and open-source under AGPL-3.0.",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd),
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster />
            <SonnerToaster richColors position="bottom-right" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
