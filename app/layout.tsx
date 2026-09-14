import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./pulse-ledger.css";

export const metadata: Metadata = {
  title: "JasimFlow — My ledger",
  description: "Your personal ledger for income, expenses and loans.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {capable:true,title:"JasimFlow",statusBarStyle:"default"},
};
export const viewport:Viewport={width:"device-width",initialScale:1,themeColor:"#0a0e16"};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head><link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials"/></head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
