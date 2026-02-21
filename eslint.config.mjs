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
  // Warn about raw fetch() usage - prefer fetchWithHmac or safeFetch
  // Raw fetch lacks timeout, response validation, and error handling
  // This is a WARNING to flag new code for review - many existing uses are legitimate
  // (internal API routes, SWR fetchers, API route handlers)
  {
    files: [
      "app/**/*.ts",
      "app/**/*.tsx",
      "lib/**/*.ts",
      "components/**/*.ts",
      "components/**/*.tsx",
    ],
    ignores: [
      "lib/api/fetch-wrapper.ts", // The wrapper itself
      "lib/db/turso.ts", // Raw fetch to Turso HTTP API (our DB client)
      "utils/safe-fetch.ts", // The safe-fetch utility
      "test/**/*", // Tests can mock fetch
      "app/api/**/*", // API routes are the endpoints themselves
      "lib/api/*.ts", // Internal API client calls (same-origin, Next.js handles)
      "components/hooks/use*.ts", // SWR fetchers (same-origin)
    ],
    rules: {
      "no-restricted-globals": [
        "warn",
        {
          name: "fetch",
          message:
            "Review: prefer fetchWithHmac (internal API) or safeFetch (external webhooks) for timeout & error handling. Ignore if calling same-origin internal routes.",
        },
      ],
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
  // CRITICAL: Prevent fetch cache explosion in external API wrappers
  // Adding `next: { revalidate }` to fetchWithHmac enables unbounded S3+DynamoDB cache
  // See: Jan 20, 2026 incident - 146K cache entries per build, 1.46M S3 objects
  {
    files: ["lib/api/*-external.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Property[key.name='next'] > ObjectExpression > Property[key.name='revalidate']",
          message:
            "⚠️ COST ALERT: Do NOT use `next: { revalidate }` in external wrappers! This enables unbounded fetch cache (146K entries per build, $300+ cost spike on Jan 20, 2026). External wrappers must use default no-store. Handle caching via Cache-Control headers in internal API routes instead.",
        },
      ],
    },
  },
  // Warn about using next/link directly - prefer next-intl's Link for locale handling
  // Allowed exceptions: primitives (have manual locale handling), types, tests, external-only links
  {
    files: ["components/**/*.tsx", "app/**/*.tsx"],
    ignores: [
      "components/ui/primitives/**", // Have manual locale handling
      "components/ui/common/social/**", // External links only
      "components/ui/common/staticShareButtons/**", // External share URLs only
      "test/**/*", // Test mocks
    ],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          paths: [
            {
              name: "next/link",
              message:
                "Prefer importing Link from '@i18n/routing' for automatic locale handling. Use next/link only for external URLs or in primitives with manual locale handling.",
            },
          ],
        },
      ],
    },
  },
];
