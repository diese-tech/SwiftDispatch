import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SwiftDispatch",
  description: "Emergency HVAC dispatch and quoting",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
