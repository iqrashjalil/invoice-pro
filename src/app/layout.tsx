import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Invoice Pro",
  description: "Invoice Pro - Invoice management system",
  authors: [{ name: "Iqrash Jalil" }],
  icons: {
    // Use a local icon so it loads in development and production.
    // The `public` folder contains `logo.png` which can be used as the favicon.
    // For best compatibility add a `/favicon.ico` to public as well.
    icon: "/logo.png",
  },
  openGraph: {
    title: "Invoice Pro",
    description: "Invoice Pro - Invoice management system",
    url: "https://chat.z.ai",
    siteName: "Invoice Pro",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Invoice Pro",
    description: "Invoice Pro - Invoice management system",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
