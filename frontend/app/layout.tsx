import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Providers } from "@/components/Providers";
import { UmamiAnalytics } from "@/components/UmamiAnalytics";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PriceLens — estimation prix immobilier en France",
  description:
    "Estimation indicative de prix immobilier en France (DVF+, DPE). PriceLens.",
  icons: {
    icon: [{ url: "/icon.png?v=5", type: "image/png" }],
    apple: [{ url: "/icon.png?v=5", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full text-foreground">
        <UmamiAnalytics />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
