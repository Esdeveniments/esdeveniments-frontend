import type { ButtonProps } from "types/common";

const VARIANTS: Record<string, string> = {
  neutral: "btn-neutral",
  primary: "btn-primary",
  outline: "btn-outline",
  muted: "btn-muted",
  solid: "btn-primary",
  category: "btn-category",
  ghost: "btn-ghost",
};

const Button = ({
  children,
  className = "",
  variant = "neutral",
  hasIcon = false,
  ref,
  ...rest
}: ButtonProps) => {
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
};

export default Button;
