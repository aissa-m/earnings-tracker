import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Earnings Tracker",
  description: "Simple tracker for labeling and reviewing earnings.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
