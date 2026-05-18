import type { Metadata } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://swiftdispatch.app"),
  title: {
    default: "SwiftDispatch | Emergency HVAC Dispatch Software",
    template: "%s | SwiftDispatch",
  },
  description:
    "SwiftDispatch helps HVAC teams dispatch faster, send quote approvals by SMS, and close jobs in real time.",
  applicationName: "SwiftDispatch",
  keywords: [
    "HVAC dispatch software",
    "field service management",
    "emergency dispatch",
    "SMS quote approval",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SwiftDispatch | Emergency HVAC Dispatch Software",
    description:
      "Dispatch, quote, and collect approvals in one workflow built for HVAC service teams.",
    url: "https://swiftdispatch.app",
    siteName: "SwiftDispatch",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SwiftDispatch | Emergency HVAC Dispatch Software",
    description:
      "Dispatch faster, keep technicians moving, and approve quotes by SMS with SwiftDispatch.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${interTight.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
