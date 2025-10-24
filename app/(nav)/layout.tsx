import type { ReactNode } from "react";

export default function NavLayout({ children }: { children: ReactNode }) {
  return <div className="container">{children}</div>;
}
