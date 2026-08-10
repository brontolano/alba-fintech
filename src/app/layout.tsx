import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { BottomNav } from "@/components/BottomNav";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ALBA-FINTECH",
  description: "Sistem Keuangan Pesantren Al Basyariyyah",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0"
        />
      </head>
      <body className="min-h-full flex flex-col bg-gray-50 text-slate-900 pb-16">
        <Providers>
          <main className="flex-1 max-w-md w-full mx-auto bg-white shadow-sm relative">
            {children}
          </main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
