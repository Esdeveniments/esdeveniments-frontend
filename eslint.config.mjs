import next from "eslint-config-next";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  // Spread converted ESLintRC configs from FlatCompat
  ...compat.extends("eslint:recommended"),
  // Spread Next.js configs (they're already flat config compatible)
  ...next,
  ...nextCoreWebVitals,
  // Base configuration
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
      },
    },

    rules: {
      "no-undef": "error",
      "no-debugger": "error",
      "react/react-in-jsx-scope": "off",
    },
  },
  {
    files: ["public/sw.js", "public/sw-template.js"],

    languageOptions: {
      globals: {
        ...globals.serviceworker,
        workbox: "readonly",
        importScripts: "readonly",
        caches: "readonly",
        self: "readonly",
      },
    },

    rules: {
      "no-undef": "off",
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],

    rules: {
      "no-undef": "off",
      "no-unused-vars": "off", // TypeScript handles this
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: [
      "components/**/*.{ts,tsx,js,jsx}",
      "app/**/*.{ts,tsx,js,jsx}",
      "**/store.ts",
      "utils/**/*.{ts,tsx,js,jsx}",
    ],
    ignores: [
      "types/**/*.ts",
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
    ignores: [
      "types/common.ts",
      "types/api/city.ts",
    ],
    rules: {
      "@typescript-eslint/no-unused-vars": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSInterfaceDeclaration[id.name='NavigationItem']",
          message:
            "NavigationItem interface is already defined. Use the canonical version in types/common.ts.",
        },
        {
          selector: "TSInterfaceDeclaration[id.name='SocialLinks']",
          message:
            "SocialLinks interface is already defined. Use the canonical version in types/common.ts.",
        },
        {
          selector: "TSInterfaceDeclaration[id.name='EventProps']",
          message:
            "EventProps interface is already defined. Use the canonical version in types/common.ts.",
        },
        {
          selector: "TSInterfaceDeclaration[id.name='CitySummaryResponseDTO']",
          message:
            "CitySummaryResponseDTO interface is already defined. Use the canonical version in types/api/city.ts.",
        },
      ],
    },
  },
  // Disable anonymous default export warning for this config file
  {
    files: ["eslint.config.mjs"],
    rules: {
      "import/no-anonymous-default-export": "off",
    },
  },
];
