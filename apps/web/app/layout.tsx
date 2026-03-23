import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StartupLenz — Live Cost Modeling",
  description: "Vertical-specific startup cost modeling with live data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
