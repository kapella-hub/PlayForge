import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["public/sw.js"],
    languageOptions: {
      globals: {
        self: "readonly",
        caches: "readonly",
        fetch: "readonly",
        Response: "readonly",
        URL: "readonly",
      },
    },
  },
  {
    // The offline fallback page must use a plain <a>, not next/link: a client-side
    // Link navigation is classified "bypass" by the service worker (not mode: "navigate"),
    // so it would skip the navigation-network-first handler exactly when offline.
    files: ["src/app/offline/page.tsx"],
    rules: { "@next/next/no-html-link-for-pages": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
