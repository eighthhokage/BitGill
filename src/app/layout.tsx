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
  description: "A free Bitcoin invoice generator by HarvestBTC",
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

          <footer className="px-6 pb-6 pt-2">
            <div className="mx-auto w-full max-w-xl text-center text-xs text-gray-500 space-y-1">
              <div>USD estimate is informational.</div>
              <div>BitGill does not custody funds.</div>
              <div>
                <a
                  href="https://github.com/eighthhokage/BitGill"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  View source code on GitHub
                </a>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
