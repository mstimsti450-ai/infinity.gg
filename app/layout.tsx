import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://infinity-gg-zeta.vercel.app"),

  title: "Infinity Network - Valorant Topluluk Platformu",

  description:
    "Valorant nişangahlarını keşfet, Rank Tahmin oyna, Kliplerini paylaş ve Infinity Network topluluğuna katıl.",

  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },

  openGraph: {
    type: "website",
    url: "https://infinity-gg-zeta.vercel.app",
    siteName: "Infinity Network",
    locale: "tr_TR",

    title: "Infinity Network",
    description:
      "Valorant nişangahlarını keşfet, Rank Tahmin oyna ve topluluğa katıl.",

    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Infinity Network",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Infinity Network",
    description:
      "Valorant nişangahlarını keşfet, Rank Tahmin oyna ve topluluğa katıl.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="tr"
      className={`${inter.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}