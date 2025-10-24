import "./globals.css";
import { ReactNode } from "react";
import { Inter } from "next/font/google";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"], weight: ["400", "700"], display: "swap" });

export const metadata: Metadata = {
  title: "Asteroid Shooter",
  description: "Canvas-based asteroid shooting game with keyboard controls.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} bg-black text-white overflow-hidden min-h-screen flex items-center justify-center`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
