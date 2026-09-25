import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PR Risk Radar",
  description: "AI-powered pull request risk analysis",
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
