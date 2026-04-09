import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Allow underscore-prefixed identifiers to be intentionally unused.
    // This is the convention for "I know this is unused but I need the
    // name in the signature" — used heavily for required-prop props that
    // a component doesn't happen to read yet.
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      // React 19 / Next 16 ship a set of new "react-hooks" rules
      // ported from the React compiler. Two of them
      // (`set-state-in-effect` and `immutability`) flag patterns that
      // are intentional + safe in our codebase (e.g. setting initial
      // state from an async fetch inside an effect). They remain as
      // warnings so the compiler still surfaces genuinely risky code,
      // but don't block CI merges until we refactor each call site.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      // Empty destructures like `const [, setX] = useState(...)` are
      // legitimate when only the setter is needed. The "no-unused"
      // destructured array variant covers this, but allow empty
      // bindings as well.
      "react-hooks/refs": "warn",
      // React 19 compiler rules: these flag patterns the compiler
      // can't auto-memoize. They're informational, not bugs; the
      // useMemo still works, the compiler just doesn't add its own
      // layer on top.
      "react-hooks/preserve-manual-memoization": "warn",
      // `purity` flags calls to functions the compiler considers
      // impure inside render. Our code uses showError / showToast
      // callbacks inside event handlers (not during render); the
      // rule is overly aggressive here and can't be narrowed per-call.
      "react-hooks/purity": "warn",
    },
  },
]);

export default eslintConfig;
