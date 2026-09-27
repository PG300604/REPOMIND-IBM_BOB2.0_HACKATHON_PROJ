import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RepoMind",
  description: "Autonomous AI-Powered Codebase Intelligence & Autonomous PR Reviewer",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
