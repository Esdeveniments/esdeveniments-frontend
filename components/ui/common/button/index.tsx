import React from "react";

const BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border h-9 px-4 py-2";

const OUTLINE_ADDITIONAL =
  "has-[&>svg]:px-3 group border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50 font-medium transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md";

const NEUTRAL_ADDITIONAL =
  "has-[&>svg]:px-3 group border-blackCorp/60 text-blackCorp hover:bg-darkCorp/5 hover:border-blackCorp/50 font-medium transition-all duration-200 bg-whiteCorp backdrop-blur-sm shadow-sm hover:shadow-md";

const MUTED_ADDITIONAL =
  "has-[&>svg]:px-3 group border-bColor text-blackCorp/40 bg-whiteCorp cursor-not-allowed opacity-70 font-medium transition-all duration-200 backdrop-blur-sm shadow-sm hover:shadow-md";

export default function Button({
  children,
  className = "",
  variant = "neutral",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "neutral" | "primary" | "muted" | "outline" | "solid";
}) {
  let variantClass = "";

  switch (variant) {
    case "primary":
      variantClass = OUTLINE_ADDITIONAL;
      break;
    case "muted":
      variantClass = MUTED_ADDITIONAL;
      break;
    case "outline":
      variantClass = OUTLINE_ADDITIONAL;
      break;
    case "neutral":
    default:
      variantClass = NEUTRAL_ADDITIONAL;
  }

  return (
    <button className={`${BASE} ${variantClass} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}
