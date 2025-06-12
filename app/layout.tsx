import "../styles/globals.css";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import GoogleScripts from "./GoogleScripts";
import { BaseLayout } from "@components/ui/layout";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const barlow = Inter({ subsets: ["latin"], variable: "--font-barlow" });

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ca" className={inter.variable + " " + barlow.variable}>
      <body>
        <GoogleScripts />
        <BaseLayout>{children}</BaseLayout>
      </body>
    </html>
  );
}
