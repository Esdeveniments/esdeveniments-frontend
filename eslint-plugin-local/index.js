module.exports = {
  rules: {
    "no-hardcoded-colors": {
      create(context) {
        return {
          Literal(node) {
            if (typeof node.value === "string") {
              const hardcodedColors = /text-gray-|bg-gray-|border-gray-/;
              if (hardcodedColors.test(node.value)) {
                context.report({
                  node,
                  message:
                    "⚠️ Use design tokens instead of hardcoded gray colors",
                });
              }
            }
          },
        };
      },
    },
    "no-hardcoded-hex-colors": {
      create(context) {
        return {
          Literal(node) {
            if (typeof node.value === "string") {
              // Match hex colors that aren't design tokens
              const hexColorRegex = /#[0-9a-fA-F]{3,8}/g;
              if (hexColorRegex.test(node.value)) {
                // Skip if it's a design token comment or in allowed contexts
                const sourceCode = context.getSourceCode();
                const comments = sourceCode.getAllComments();
                const isInComment = comments.some(
                  (comment) =>
                    comment.range[0] <= node.range[0] &&
                    comment.range[1] >= node.range[1],
                );

                if (
                  !isInComment &&
                  !node.value.includes("design-token") &&
                  !node.value.includes("brand-color")
                ) {
                  context.report({
                    node,
                    message:
                      "🚫 Use design system color tokens instead of hardcoded hex colors. Use tokens like 'primary', 'secondary', 'blackCorp', etc.",
                  });
                }
              }
            }
          },
        };
      },
    },
    "no-hardcoded-spacing": {
      create(context) {
        return {
          Literal(node) {
            if (typeof node.value === "string") {
              // Match Tailwind spacing classes
              const spacingRegex =
                /\b(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr)-(\d+|auto)\b/;
              if (spacingRegex.test(node.value)) {
                context.report({
                  node,
                  message:
                    "📏 Use design system spacing tokens instead of hardcoded spacing classes. Use tokens like 'component-md', 'page-x', 'gap-lg', etc.",
                });
              }

              // Match space utilities
              const spaceRegex = /\bspace-(x|y)-\d+\b/;
              if (spaceRegex.test(node.value)) {
                context.report({
                  node,
                  message:
                    "📏 Use design system gap tokens instead of space utilities. Use 'gap-md', 'gap-lg', etc.",
                });
              }
            }
          },
        };
      },
    },
    "no-hardcoded-typography": {
      create(context) {
        return {
          Literal(node) {
            if (typeof node.value === "string") {
              // Match hardcoded font sizes
              const fontSizeRegex =
                /\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)\b/;
              if (fontSizeRegex.test(node.value)) {
                context.report({
                  node,
                  message:
                    '📝 Use design system typography tokens instead of hardcoded font sizes. Use <Text variant="h1"> component.',
                });
              }

              // Match hardcoded font weights
              const fontWeightRegex =
                /\bfont-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)\b/;
              if (fontWeightRegex.test(node.value)) {
                context.report({
                  node,
                  message:
                    "📝 Use design system typography tokens instead of hardcoded font weights. Use <Text> component variants.",
                });
              }

              // Match hardcoded line heights
              const lineHeightRegex =
                /\bleading-(none|tight|snug|normal|relaxed|loose|\d+)\b/;
              if (lineHeightRegex.test(node.value)) {
                context.report({
                  node,
                  message:
                    "📝 Use design system typography tokens instead of hardcoded line heights. Use <Text> component variants.",
                });
              }
            }
          },
        };
      },
    },
    "no-raw-html-elements": {
      create(context) {
        return {
          JSXOpeningElement(node) {
            const tagName = node.name.name;

            // Flag raw heading elements
            if (tagName && /^h[1-6]$/.test(tagName)) {
              context.report({
                node,
                message:
                  '🧩 Use <Text> component instead of raw heading elements. Example: <Text variant="h1">Heading</Text>',
              });
            }

            // Flag raw paragraph elements with text classes
            if (tagName === "p") {
              const classNameAttr = node.attributes.find(
                (attr) => attr.name && attr.name.name === "className",
              );
              if (
                classNameAttr &&
                classNameAttr.value &&
                classNameAttr.value.value
              ) {
                if (classNameAttr.value.value.includes("text-")) {
                  context.report({
                    node,
                    message:
                      '🧩 Use <Text> component instead of <p> with text classes. Example: <Text variant="body">Content</Text>',
                  });
                }
              }
            }

            // Flag raw span elements with text classes
            if (tagName === "span") {
              const classNameAttr = node.attributes.find(
                (attr) => attr.name && attr.name.name === "className",
              );
              if (
                classNameAttr &&
                classNameAttr.value &&
                classNameAttr.value.value
              ) {
                if (classNameAttr.value.value.includes("text-")) {
                  context.report({
                    node,
                    message:
                      '🧩 Use <Text> component instead of <span> with text classes. Example: <Text variant="caption">Content</Text>',
                  });
                }
              }
            }
          },
        };
      },
    },
    "require-design-token-imports": {
      create(context) {
        let hasDesignTokenImport = false;
        let hasTailwindClasses = false;

        return {
          ImportDeclaration(node) {
            // Check if importing from design system
            if (
              node.source.value.includes("@components/ui") ||
              node.source.value.includes("@styles") ||
              node.source.value.includes("@types/ui")
            ) {
              hasDesignTokenImport = true;
            }
          },

          Literal(node) {
            if (typeof node.value === "string") {
              // Check for Tailwind utility classes
              if (
                /\b(class|className)="[^"]*(text-|bg-|border-|p-|m-|space-)/.test(
                  node.value,
                )
              ) {
                hasTailwindClasses = true;
              }
            }
          },

          "Program:exit"() {
            if (hasTailwindClasses && !hasDesignTokenImport) {
              context.report({
                node: context.getSourceCode().ast,
                message:
                  "🔗 Files using Tailwind classes should import design system components. Consider using <Text>, <Card>, or other design system components.",
              });
            }
          },
        };
      },
    },
  },
};
