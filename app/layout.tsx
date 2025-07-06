import "../styles/globals.css";
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import GoogleScripts from "./GoogleScripts";
import { BaseLayout } from "@components/ui/layout";
import WebsiteSchema from "@components/partials/WebsiteSchema";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const barlow = Inter({ subsets: ["latin"], variable: "--font-barlow" });

export const metadata: Metadata = {
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ca" className={inter.variable + " " + barlow.variable}>
      <body>
        <GoogleScripts />
        <WebsiteSchema />
        <BaseLayout>{children}</BaseLayout>
      </body>
    </html>
  );
}
