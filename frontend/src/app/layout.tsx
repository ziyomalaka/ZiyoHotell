import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const sans = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "ZiyoHotel — Yotoqxona tizimi",
  description: "ZiyoHotel yotoqxona boshqaruv tizimi",
  icons: { icon: "/ZiyoHotel-logo.png", apple: "/apple-touch-icon.png" },
  // Telefonda "Bosh ekranga qo‘shish" — alohida ilova kabi ochiladi.
  appleWebApp: { capable: true, title: "ZiyoHotel", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#071b33",
  // iPhone pastki chizig‘i ostida menyu qolmasin: env(safe-area-inset-*) ishlashi uchun.
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" className={`${sans.variable} h-full antialiased`}>
      <body className="min-h-full bg-background font-sans text-foreground">{children}</body>
    </html>
  );
}
