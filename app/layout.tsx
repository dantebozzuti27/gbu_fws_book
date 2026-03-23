import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "Fantasy Sportsbook",
  description: "Fantasy baseball betting odds dashboard",
};

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/matchups", label: "Matchups" },
  { href: "/playoffs", label: "Playoffs" },
  { href: "/championship", label: "Championship" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-14 items-center justify-between">
              <Link
                href="/"
                className="text-lg font-bold tracking-tight text-zinc-100"
              >
                <span className="text-emerald-400">Fantasy</span> Sportsbook
              </Link>
              <div className="flex items-center gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-100 rounded-md hover:bg-zinc-800/50 transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </nav>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-zinc-800/50 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-xs text-zinc-600">
              For entertainment purposes only. Not real betting.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
