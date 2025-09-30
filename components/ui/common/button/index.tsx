import React from "react";

const BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm h-9 px-4 py-2 disabled:pointer-events-none disabled:opacity-50 outline-none";

const FOCUS =
  "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/50";

const ARIA_INVALID =
  "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40";

const VARIANTS: Record<string, string> = {
  neutral:
    "border border-blackCorp/60 text-blackCorp hover:bg-darkCorp/5 hover:border-blackCorp/50 font-medium bg-whiteCorp transition-shadow shadow-sm",
  primary:
    "border border-transparent bg-primary-600 text-white hover:bg-primary-700 font-medium shadow-sm",
  outline:
    "border border-primary/30 text-primary hover:bg-primary/5 bg-white/80 font-medium transition-shadow",
  muted:
    "border border-bColor text-blackCorp/40 bg-whiteCorp cursor-not-allowed opacity-70 font-medium",
  solid: "bg-primary-600 text-white border border-transparent font-medium",
};

export default function Button({
  children,
  className = "",
  variant = "neutral",
  hasIcon = false,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "neutral" | "primary" | "muted" | "outline" | "solid";
  hasIcon?: boolean;
}) {
  const variantClass = VARIANTS[variant] ?? VARIANTS.neutral;
  const iconPadding = hasIcon ? "pl-3" : "";

  return (
    <button
      className={`${BASE} ${FOCUS} ${ARIA_INVALID} ${variantClass} ${iconPadding} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
