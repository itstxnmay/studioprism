import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prism — Redefining Digital Luxury",
  description:
    "Experience the future of premium digital craftsmanship. A showcase of 3D scroll animation with crystalline precision.",
  keywords: ["3D", "animation", "scroll", "diamond", "premium", "luxury"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
