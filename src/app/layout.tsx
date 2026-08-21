import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
