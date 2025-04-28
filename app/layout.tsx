import "../styles/globals.css";
import type { ReactNode } from "react";
import GoogleScripts from "./GoogleScripts";
import { BaseLayout } from "@components/ui/layout";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ca">
      <body>
        <GoogleScripts />
        <BaseLayout>{children}</BaseLayout>
      </body>
    </html>
  );
}
