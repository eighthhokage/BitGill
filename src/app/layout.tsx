import type { Metadata } from "next";
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
  title: "BitGill",
  description: "Free Bitcoin invoice generator by HarvestBTC.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="min-h-screen flex flex-col">
          <div className="flex-1">{children}</div>

          <footer className="py-6 px-6">
            <div className="mx-auto max-w-xl text-center text-xs text-gray-500 space-y-1">
              <div>USD estimate is informational.</div>
              <div>BitGill does not custody funds.</div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
