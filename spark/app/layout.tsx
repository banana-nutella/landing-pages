import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spark: catch the moment, do one tiny thing",
  description: "Turn a moment of inspiration into one tiny action, and get a gentle nudge so it sticks.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#fff7ed" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
