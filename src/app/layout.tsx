import type { Metadata } from "next";
import { Bricolage_Grotesque, Public_Sans, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

// Warm, neighborly, cartographic identity:
//   display — Bricolage Grotesque (characterful, humanist)
//   body/UI — Public Sans (the US civic typeface — plain, trustworthy)
//   data    — Spline Sans Mono (dates, application codes, coordinates)
const display = Bricolage_Grotesque({
  variable: "--ff-display",
  subsets: ["latin"],
  display: "swap",
});

const body = Public_Sans({
  variable: "--ff-body",
  subsets: ["latin"],
  display: "swap",
});

const mono = Spline_Sans_Mono({
  variable: "--ff-mono",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://arounded.kamalacreated.com";
const DESCRIPTION =
  "A free, transparent map of what surrounds the places you care about — data centers, facilities, power, air quality and wildfire smoke — and the local decisions that change them.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Arounded — See what's moving in around you",
    template: "%s · Arounded",
  },
  description: DESCRIPTION,
  openGraph: {
    title: "Arounded — See what's moving in around you",
    description: DESCRIPTION,
    siteName: "Arounded",
    url: SITE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Arounded — See what's moving in around you",
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
