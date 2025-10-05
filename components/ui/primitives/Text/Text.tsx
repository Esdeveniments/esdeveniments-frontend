import { useEffect } from "react";
import type { TextProps } from "types/ui";
import { cn } from "@components/utils/cn";
import { trackComponentUsage } from "@utils/analytics";
import { useComponentPerformance } from "@components/hooks/useComponentPerformance";

// Semantic HTML element types for typography
type SemanticElement =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "p"
  | "span"
  | "a"
  | "div";

export const getTextClasses = (props: {
  variant?: string;
  size?: string;
  color?: string;
}) => {
  const { variant = "body", size = "sm", color = "black" } = props;
  let classes = [];

  if (variant === "h1") classes.push("font-barlow", "text-heading-1");
  else if (variant === "h2") classes.push("font-barlow", "text-heading-2");
  else if (variant === "h3") classes.push("font-barlow", "text-heading-3");
  else if (variant === "body") classes.push("text-body-md");
  else if (variant === "body-lg") classes.push("text-body-lg");
  else if (variant === "body-sm") classes.push("text-body-sm");
  else if (variant === "caption") classes.push("text-caption");

  if (size === "xs") classes.push("text-caption");
  else if (size === "sm") classes.push("text-body-sm");
  else if (size === "base") classes.push("text-body-md");
  else if (size === "lg") classes.push("text-body-lg");

  if (color === "primary") classes.push("text-primary");
  else if (color === "black") classes.push("text-blackCorp");
  else if (color === "muted") classes.push("text-blackCorp/60");

  return classes.join(" ");
};

export const textVariants = getTextClasses;

export const Text = <T extends SemanticElement = "span">({
  as,
  variant,
  size,
  color,
  className,
  children,
  ...props
}: TextProps & { as?: T }) => {
  useComponentPerformance("Text");
  useEffect(() => {
    trackComponentUsage("Text", variant || undefined);
  }, [variant]);

  // Determine the HTML element to render
  const Component = (as || "span") as any;

  const variantClasses = getTextClasses({ variant, size, color });

  return (
    <Component
      className={cn(variantClasses || "text-body-md text-blackCorp", className)}
      {...props}
    >
      {children}
    </Component>
  );
};
