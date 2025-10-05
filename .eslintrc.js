module.exports = {
  plugins: ["local"],
  extends: [
    "eslint:recommended",
    "next",
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:storybook/recommended",
  ],
  rules: {
    "no-unused-vars": "warn",
    "no-undef": "error",
    "no-debugger": "error",
    "local/no-hardcoded-colors": "warn",
    "local/no-hardcoded-hex-colors": "error",
    "local/no-hardcoded-spacing": "warn",
    "local/no-hardcoded-typography": "warn",
    "local/no-raw-html-elements": "warn",
    "local/require-design-token-imports": "warn",
    "react/react-in-jsx-scope": "off",
    "no-restricted-syntax": [
      "warn",
      {
        selector: "Literal[value=/text-gray-/]",
        message: "Use design tokens instead of hardcoded gray text colors",
      },
      {
        selector: "Literal[value=/bg-gray-/]",
        message:
          "Use design tokens instead of hardcoded gray background colors",
      },
      {
        selector: "Literal[value=/border-gray-/]",
        message: "Use design tokens instead of hardcoded gray border colors",
      },
    ],
  },
  env: {
    es6: true,
    browser: true,
    node: true,
    jest: true,
  },
  overrides: [
    {
      files: ["public/sw.js", "public/sw-template.js"],
      env: {
        serviceworker: true,
      },
      globals: {
        workbox: "readonly",
        importScripts: "readonly",
        caches: "readonly",
        self: "readonly",
      },
      rules: {
        "no-undef": "off",
      },
    },
    {
      files: ["*.ts", "*.tsx"],
      rules: {
        "no-undef": "off",
      },
    },
    {
      files: [
        "components/**/*.{ts,tsx,js,jsx}",
        "app/**/*.{ts,tsx,js,jsx}",
        "store.ts",
        "utils/**/*.{ts,tsx,js,jsx}",
      ],
      rules: {
        "no-restricted-syntax": [
          "error",
          {
            selector: "TSTypeAliasDeclaration",
            message:
              "Do not declare types outside of the /types directory. Centralize all type aliases in /types.",
          },
          {
            selector: "TSInterfaceDeclaration",
            message:
              "Do not declare interfaces outside of the /types directory. Centralize all interfaces in /types.",
          },
        ],
      },
    },
    {
      files: ["types/**/*.ts"],
      rules: {
        "@typescript-eslint/no-unused-vars": "error",
        "no-restricted-syntax": [
          "error",
          {
            selector:
              "TSInterfaceDeclaration[declaration.name='NavigationItem']:not(:first-of-type)",
            message:
              "NavigationItem interface is already defined. Use the canonical version in types/common.ts.",
          },
          {
            selector:
              "TSInterfaceDeclaration[declaration.name='SocialLinks']:not(:first-of-type)",
            message:
              "SocialLinks interface is already defined. Use the canonical version in types/common.ts.",
          },
          {
            selector:
              "TSInterfaceDeclaration[declaration.name='EventProps']:not(:first-of-type)",
            message:
              "EventProps interface is already defined. Use the canonical version in types/common.ts.",
          },
          {
            selector:
              "TSInterfaceDeclaration[declaration.name='CitySummaryResponseDTO']:not(:first-of-type)",
            message:
              "CitySummaryResponseDTO interface is already defined. Use the canonical version in types/api/city.ts.",
          },
        ],
      },
    },
  ],
};
