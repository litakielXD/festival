import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Festival Quatsch",
  description: "Group based planning for festival days, notes and live timelines."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">{children}</body>
    </html>
  );
}
