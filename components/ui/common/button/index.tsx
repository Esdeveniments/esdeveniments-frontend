import { forwardRef } from "react";

const VARIANTS: Record<string, string> = {
  neutral: "btn-neutral",
  primary: "btn-primary",
  outline: "btn-outline",
  muted: "btn-muted",
  solid: "btn-primary",
  category: "btn-category",
  ghost: "btn-ghost",
};

const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?:
    | "neutral"
    | "primary"
    | "muted"
    | "outline"
    | "solid"
    | "category"
    | "ghost";
    hasIcon?: boolean;
  }
>(({ children, className = "", variant = "neutral", hasIcon = false, ...rest }, ref) => {
  const variantClass = VARIANTS[variant] ?? VARIANTS.neutral;
  const iconPadding = hasIcon ? "pl-3" : "";

  return (
    <button
      ref={ref}
      className={`${variantClass} ${iconPadding} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
});

Button.displayName = "Button";

export default Button;
