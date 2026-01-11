import type { Metadata, Viewport } from "next";
import "./globals.css";
import PasswordProtection from "@/components/PasswordProtection";

export const metadata: Metadata = {
  title: "Budget Tracker",
  description: "Track your expenses in real-time",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Budget",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-CA">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="antialiased safe-area-inset min-h-screen">
        <PasswordProtection>{children}</PasswordProtection>
      </body>
    </html>
  );
}
