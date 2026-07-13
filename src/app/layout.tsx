import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import ConflictBanner from "@/components/ConflictBanner";
import Sidebar from "@/components/Sidebar";
import { HubProvider } from "@/lib/store";

const sans = Archivo({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
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
          <ConflictBanner />
          <Sidebar />
          <main className="ml-60 min-h-screen px-8 py-8">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </HubProvider>
      </body>
    </html>
  );
}
