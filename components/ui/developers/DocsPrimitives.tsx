import type { DocsCodeBlockProps, DocsLinkProps } from "types/props";

export function DocsCodeBlock({ code }: DocsCodeBlockProps) {
  return (
    <pre className="bg-muted text-foreground rounded-card p-4 overflow-x-auto body-small font-mono">
      <code>{code}</code>
    </pre>
  );
}

// Plain <a>: the targets are API files (JSON, text) or external sites, not
// localized pages, so the i18n Link would add a wrong locale prefix.
export function DocsLink({ href, children }: DocsLinkProps) {
  return (
    <a
      href={href}
      className="text-primary hover:underline decoration-2 underline-offset-4 break-all"
    >
      {children}
    </a>
  );
}
