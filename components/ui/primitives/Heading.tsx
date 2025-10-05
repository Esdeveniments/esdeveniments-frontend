import { Text } from "@components/ui/primitives/Text";

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3;
}

export function Heading({
  level = 1,
  className,
  children,
  ...props
}: HeadingProps) {
  const variant = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
  const as = level === 1 ? "h1" : level === 2 ? "h2" : "h3";

  // Omit color from props to avoid conflict with Text's color variant
  const { color: _, ...textProps } = props;

  return (
    <Text as={as} variant={variant} className={className} {...textProps}>
      {children}
    </Text>
  );
}
