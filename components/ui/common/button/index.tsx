const VARIANTS: Record<string, string> = {
  neutral: "btn-neutral",
  primary: "btn-primary",
  outline: "btn-outline",
  muted: "btn-muted",
  solid: "btn-primary",
  category: "btn-category",
};

export default function Button({
  children,
  className = "",
  variant = "neutral",
  hasIcon = false,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?:
    | "neutral"
    | "primary"
    | "muted"
    | "outline"
    | "solid"
    | "category";
  hasIcon?: boolean;
}) {
  const variantClass = VARIANTS[variant] ?? VARIANTS.neutral;
  const iconPadding = hasIcon ? "pl-3" : "";

  return (
    <button
      className={`${variantClass} ${iconPadding} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
