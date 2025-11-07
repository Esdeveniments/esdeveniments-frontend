import { defineConfig } from "eslint/config";
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
    allConfig: js.configs.all
});

export default defineConfig([{
    extends: [
        ...compat.extends("eslint:recommended"),
        ...next,
        ...nextCoreWebVitals
    ],

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
}, {
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
}, {
    files: ["**/*.ts", "**/*.tsx"],

    rules: {
        "no-undef": "off",
        "no-unused-vars": "off", // TypeScript handles this
    },
}, {
    files: [
        "components/**/*.{ts,tsx,js,jsx}",
        "app/**/*.{ts,tsx,js,jsx}",
        "**/store.ts",
        "utils/**/*.{ts,tsx,js,jsx}",
    ],

    rules: {
        "no-restricted-syntax": ["error", {
            selector: "TSTypeAliasDeclaration",
            message: "Do not declare types outside of the /types directory. Centralize all type aliases in /types.",
        }, {
            selector: "TSInterfaceDeclaration",
            message: "Do not declare interfaces outside of the /types directory. Centralize all interfaces in /types.",
        }],
    },
}, {
    files: ["types/**/*.ts"],

    rules: {
        "@typescript-eslint/no-unused-vars": "error",

        "no-restricted-syntax": ["error", {
            selector: "TSInterfaceDeclaration[declaration.name='NavigationItem']:not(:first-of-type)",
            message: "NavigationItem interface is already defined. Use the canonical version in types/common.ts.",
        }, {
            selector: "TSInterfaceDeclaration[declaration.name='SocialLinks']:not(:first-of-type)",
            message: "SocialLinks interface is already defined. Use the canonical version in types/common.ts.",
        }, {
            selector: "TSInterfaceDeclaration[declaration.name='EventProps']:not(:first-of-type)",
            message: "EventProps interface is already defined. Use the canonical version in types/common.ts.",
        }, {
            selector: "TSInterfaceDeclaration[declaration.name='CitySummaryResponseDTO']:not(:first-of-type)",
            message: "CitySummaryResponseDTO interface is already defined. Use the canonical version in types/api/city.ts.",
        }],
    },
}]);