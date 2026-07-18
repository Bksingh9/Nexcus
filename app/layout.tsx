import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexcus - Product Feedback Platform",
  description:
    "A privacy-first survey and experience-management MVP with builder, analytics, integrations, and launch workflow.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
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
