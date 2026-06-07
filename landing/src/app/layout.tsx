import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SourceForge — AI Agent Orchestration",
  description:
    "Forge software with coordinated AI coding agents. Wave execution, handoff verification, knowledge compounding. ~10 MB desktop app.",
  keywords: ["AI agent", "orchestration", "coding agent", "tauri", "developer tools"],
  openGraph: {
    title: "SourceForge",
    description: "AI Agent Orchestration Platform",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="min-h-screen bg-surface-950 text-surface-200 antialiased">
        {children}
      </body>
    </html>
  );
}
