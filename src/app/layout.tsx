import type { Metadata, Viewport } from "next";
import { Public_Sans } from "next/font/google";
import "./globals.css";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rinsion",
  description: "Laundry operations platform for Ghana",
};

// viewportFit: 'cover' lets the page draw under the iOS home-indicator/notch
// area so env(safe-area-inset-*) reports real values instead of 0 — needed
// for the bottom tab bar to pad itself above the home indicator.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${publicSans.variable} font-sans antialiased bg-canvas text-warm-950`}>
        {children}
      </body>
    </html>
  );
}
