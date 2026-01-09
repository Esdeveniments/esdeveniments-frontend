import next from "eslint-config-next";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import reactHooks from "eslint-plugin-react-hooks";
import eslintReact from "@eslint-react/eslint-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: [
      ".sst/**",
      ".sst/**/*",
      ".sst",
      ".sst.*",
      "*.sst",
      "**/.sst/**",
      ".open-next/**",
      ".open-next/**/*",
      ".next/**",
      ".next/**/*",
      "sst-env.d.ts",
    ],
  },
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
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "no-undef": "error",
      "no-debugger": "error",
      "react/react-in-jsx-scope": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "error",
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
      "lib/**/*.{ts,tsx,js,jsx}",
    ],
    ignores: ["types/**/*.ts"],

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
    ignores: ["types/common.ts", "types/api/city.ts"],
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
  // @eslint-react: comprehensive React best practices and performance rules
  {
    files: ["**/*.tsx", "**/*.jsx"],
    ...eslintReact.configs.recommended,
    rules: {
      ...eslintReact.configs.recommended.rules,
      // Relax some rules that may be too strict or don't fit Next.js patterns
      "@eslint-react/prefer-destructuring-assignment": "off",
      // Common Next.js hydration pattern (setIsMounted, setIsHydrated, etc.)
      "@eslint-react/hooks-extra/no-direct-set-state-in-use-effect": "off",
      // React 19 migration - can address gradually
      "@eslint-react/no-context-provider": "off",
      "@eslint-react/no-use-context": "off",
      "@eslint-react/no-forward-ref": "off",
    },
  },
  // Disable hook naming rules in test mocks (they need to match real hook names)
  {
    files: ["test/**/*.tsx", "test/**/*.ts"],
    rules: {
      "@eslint-react/no-unnecessary-use-prefix": "off",
    },
  },
  // CRITICAL: Prevent searchParams in listing pages to avoid $300+ DynamoDB cost spikes
  // Reading searchParams makes pages dynamic, causing OpenNext/SST to create millions of cache entries
  // See: Dec 28, 2025 incident - 200M DynamoDB writes = $307 cost
  {
    files: ["app/\\[place\\]/**/*.tsx", "app/\\[place\\]/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Identifier[name='searchParams']",
          message:
            "⚠️ COST ALERT: Do NOT use searchParams in app/[place]/* pages! This makes pages dynamic and causes OpenNext to create millions of DynamoDB cache entries ($300+ cost spike on Dec 28, 2025). Handle query params in middleware (proxy.ts) or client-side (SWR) instead.",
        },
      ],
    },
  },
];
