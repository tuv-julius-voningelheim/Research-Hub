import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";
import { HubProvider } from "@/lib/store";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Insight Hub — TÜV SÜD UX Research",
  description:
    "UX Research Insight Hub: Second-Brain-Exporte hochladen, programmatisch auswerten und als geteilte Erkenntnisse aufbereiten.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body className={`${sans.variable} antialiased`}>
        <HubProvider>
          <LayoutShell>{children}</LayoutShell>
        </HubProvider>
      </body>
    </html>
  );
}
