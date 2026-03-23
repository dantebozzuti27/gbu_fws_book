import type { Metadata, Viewport } from "next";
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
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sportsbook",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#09090b",
};

const navItems = [
  { href: "/", label: "Lines", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
  { href: "/matchups", label: "Matchups", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { href: "/playoffs", label: "Playoffs", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { href: "/championship", label: "Title", icon: "M5 3l3.057-3L12 3.5 15.943 0 19 3l-2 7h-2.5l1 10H8.5l1-10H7L5 3z" },
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
        <header className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-lg">
          <div className="px-4 h-12 flex items-center">
            <Link href="/" className="text-base font-bold tracking-tight">
              <span className="text-emerald-400">GBU</span> Book
            </Link>
          </div>
        </header>

        <main className="flex-1 pb-[var(--bottom-nav-height)]">{children}</main>

        <nav className="fixed bottom-0 inset-x-0 z-50 bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-800/60">
          <div className="flex items-stretch h-14 max-w-lg mx-auto" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 text-zinc-500 active:text-emerald-400 transition-colors min-h-[44px]"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        <footer className="hidden lg:block border-t border-zinc-800/50 py-4">
          <div className="max-w-7xl mx-auto px-8">
            <p className="text-center text-xs text-zinc-600">
              For entertainment purposes only. Not real betting.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
