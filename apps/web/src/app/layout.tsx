import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";
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

export const metadata: Metadata = {
  title: {
    default: "Bi’yük",
    template: "%s | Bi’yük",
  },
  description:
    "Bi’yük ile tasima taleplerini, tekliflerini, araclarini ve anlasilan nakliyelerini tek akista yonet.",
};

// Root layout tum route'lari provider, global font ve ortak navbar ile sarar.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-50 font-sans text-slate-950">
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
