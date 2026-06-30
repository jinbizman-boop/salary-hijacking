/**
 * packages/config/eslint/base.js
 *
 * 급여납치 Salary Hijacking Platform · shared ESLint 9 flat config.
 *
 * 파일 목적:
 * - 모노레포 전체 apps/services/packages/tools/qa 공통 ESLint 9 flat config 제공
 * - Node, Browser, React/Next/Expo, Workers, scripts, tools, tests 환경을 공통 처리
 * - TypeScript parser/plugin이 설치된 환경에서는 TS/TSX까지 자동 확장
 * - parser/plugin이 아직 없는 초기 bootstrap 환경에서도 config import 자체는 깨지지 않게 설계
 * - Prettier 충돌 규칙을 마지막에 비활성화
 * - 급여납치 보안 계약 위반 패턴을 lint 단계에서 차단
 * - raw PII/token/secret/raw financial source data/ad-financial join true flag 차단
 * - console.log/debug/trace, debugger, eval, unsafe optional chaining 등 상용 배포 차단 규칙 적용
 */

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const optionalRequire = (specifier) => {
  try {
    return require(specifier);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error.code === "MODULE_NOT_FOUND" ||
        error.code === "ERR_MODULE_NOT_FOUND")
    ) {
      return null;
    }

    throw error;
  }
};

const unwrapDefault = (moduleValue) =>
  moduleValue && typeof moduleValue === "object" && "default" in moduleValue
    ? moduleValue.default
    : moduleValue;

const eslintConfigPrettier = unwrapDefault(
  optionalRequire("eslint-config-prettier"),
) ?? { rules: {} };

const typescriptParser = unwrapDefault(
  optionalRequire("@typescript-eslint/parser"),
);

const typescriptPlugin = unwrapDefault(
  optionalRequire("@typescript-eslint/eslint-plugin"),
);

export const SALARY_HIJACKING_ESLINT_CONTRACT_VERSION = "1.0.0";
export const SALARY_HIJACKING_ESLINT_TIMEZONE = "Asia/Seoul";
export const SALARY_HIJACKING_ESLINT_CURRENCY = "KRW";

const readonlyGlobals = (...names) =>
  Object.fromEntries(names.map((name) => [name, "readonly"]));

const writableGlobals = (...names) =>
  Object.fromEntries(names.map((name) => [name, "writable"]));

const nodeGlobals = readonlyGlobals(
  "AbortController",
  "AbortSignal",
  "Buffer",
  "FormData",
  "URL",
  "URLSearchParams",
  "WebSocket",
  "atob",
  "btoa",
  "clearImmediate",
  "clearInterval",
  "clearTimeout",
  "console",
  "crypto",
  "fetch",
  "global",
  "globalThis",
  "performance",
  "process",
  "queueMicrotask",
  "setImmediate",
  "setInterval",
  "setTimeout",
  "structuredClone",
);

const browserGlobals = readonlyGlobals(
  "AbortController",
  "AbortSignal",
  "Blob",
  "CustomEvent",
  "Event",
  "File",
  "FileReader",
  "FormData",
  "Headers",
  "IntersectionObserver",
  "MutationObserver",
  "Navigator",
  "Request",
  "Response",
  "URL",
  "URLSearchParams",
  "WebSocket",
  "Window",
  "atob",
  "btoa",
  "clearInterval",
  "clearTimeout",
  "console",
  "crypto",
  "document",
  "fetch",
  "globalThis",
  "localStorage",
  "location",
  "navigator",
  "performance",
  "queueMicrotask",
  "requestAnimationFrame",
  "sessionStorage",
  "setInterval",
  "setTimeout",
  "window",
);

const testGlobals = {
  ...readonlyGlobals(
    "afterAll",
    "afterEach",
    "beforeAll",
    "beforeEach",
    "describe",
    "expect",
    "it",
    "test",
    "vi",
    "vitest",
  ),
  ...writableGlobals("jest"),
};

const commonLanguageOptions = {
  ecmaVersion: "latest",
  sourceType: "module",
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
};

const commonRules = {
  "array-callback-return": "error",
  "block-scoped-var": "error",
  camelcase: "off",
  curly: ["error", "all"],
  eqeqeq: ["error", "always", { null: "ignore" }],
  "guard-for-in": "error",
  "logical-assignment-operators": [
    "error",
    "always",
    { enforceForIfStatements: true },
  ],
  "no-alert": "error",
  "no-array-constructor": "error",
  "no-async-promise-executor": "error",
  "no-await-in-loop": "off",
  "no-bitwise": "off",
  "no-caller": "error",
  "no-case-declarations": "error",
  "no-class-assign": "error",
  "no-compare-neg-zero": "error",
  "no-cond-assign": ["error", "always"],
  "no-const-assign": "error",
  "no-constant-binary-expression": "error",
  "no-constant-condition": ["error", { checkLoops: false }],
  "no-constructor-return": "error",
  "no-control-regex": "error",
  "no-debugger": "error",
  "no-delete-var": "error",
  "no-dupe-args": "error",
  "no-dupe-class-members": "error",
  "no-dupe-else-if": "error",
  "no-dupe-keys": "error",
  "no-duplicate-case": "error",
  "no-duplicate-imports": ["error", { includeExports: true }],
  "no-empty": ["error", { allowEmptyCatch: false }],
  "no-empty-character-class": "error",
  "no-empty-pattern": "error",
  "no-eval": "error",
  "no-ex-assign": "error",
  "no-extend-native": "error",
  "no-extra-bind": "error",
  "no-extra-boolean-cast": "error",
  "no-extra-label": "error",
  "no-fallthrough": "error",
  "no-func-assign": "error",
  "no-global-assign": "error",
  "no-implied-eval": "error",
  "no-import-assign": "error",
  "no-invalid-regexp": "error",
  "no-irregular-whitespace": "error",
  "no-iterator": "error",
  "no-label-var": "error",
  "no-labels": ["error", { allowLoop: false, allowSwitch: false }],
  "no-lone-blocks": "error",
  "no-loss-of-precision": "error",
  "no-misleading-character-class": "error",
  "no-multi-assign": "error",
  "no-new": "error",
  "no-new-func": "error",
  "no-new-native-nonconstructor": "error",
  "no-new-wrappers": "error",
  "no-obj-calls": "error",
  "no-octal": "error",
  "no-param-reassign": ["error", { props: false }],
  "no-promise-executor-return": "error",
  "no-proto": "error",
  "no-redeclare": ["error", { builtinGlobals: true }],
  "no-regex-spaces": "error",
  "no-restricted-globals": [
    "error",
    { name: "event", message: "Use an explicit event parameter instead." },
    { name: "fdescribe", message: "Focused tests must not be committed." },
    { name: "fit", message: "Focused tests must not be committed." },
  ],
  "no-restricted-syntax": [
    "error",
    {
      selector:
        "CallExpression[callee.object.name='console'][callee.property.name=/^(log|debug|trace)$/]",
      message:
        "Do not commit console.log/debug/trace. Use structured logging with redaction, or console.warn/error only for local scripts.",
    },
    {
      selector:
        "Property[key.name=/^(rawPiiIncluded|rawSecretIncluded|rawTokenIncluded|adsFinancialJoinAllowed)$/][value.value=true]",
      message:
        "급여납치 보안 계약 위반: raw PII/secret/token/ad-financial join true flags are forbidden.",
    },
    {
      selector:
        "Property[key.name=/^rawFinancialSourceDataIncluded/][value.value=true]",
      message:
        "급여납치 보안 계약 위반: raw financial source data must never be exposed in auth/community/ads/log payloads.",
    },
  ],
  "no-self-assign": ["error", { props: true }],
  "no-self-compare": "error",
  "no-sequences": "error",
  "no-shadow-restricted-names": "error",
  "no-sparse-arrays": "error",
  "no-template-curly-in-string": "error",
  "no-this-before-super": "error",
  "no-throw-literal": "error",
  "no-undef": "error",
  "no-unexpected-multiline": "error",
  "no-unmodified-loop-condition": "error",
  "no-unneeded-ternary": "error",
  "no-unreachable": "error",
  "no-unreachable-loop": "error",
  "no-unsafe-finally": "error",
  "no-unsafe-negation": "error",
  "no-unsafe-optional-chaining": [
    "error",
    { disallowArithmeticOperators: true },
  ],
  "no-unused-expressions": [
    "error",
    { allowShortCircuit: true, allowTernary: true },
  ],
  "no-unused-labels": "error",
  "no-useless-backreference": "error",
  "no-useless-call": "error",
  "no-useless-catch": "error",
  "no-useless-computed-key": "error",
  "no-useless-concat": "error",
  "no-useless-constructor": "error",
  "no-useless-escape": "error",
  "no-useless-rename": "error",
  "no-var": "error",
  "no-with": "error",
  "object-shorthand": ["error", "always"],
  "one-var": ["error", "never"],
  "operator-assignment": ["error", "always"],
  "prefer-arrow-callback": ["error", { allowNamedFunctions: false }],
  "prefer-const": ["error", { destructuring: "all" }],
  "prefer-exponentiation-operator": "error",
  "prefer-numeric-literals": "error",
  "prefer-object-has-own": "error",
  "prefer-promise-reject-errors": "error",
  "prefer-regex-literals": ["error", { disallowRedundantWrapping: true }],
  "prefer-rest-params": "error",
  "prefer-spread": "error",
  "prefer-template": "error",
  radix: ["error", "always"],
  "require-atomic-updates": "error",
  "require-await": "off",
  "sort-imports": "off",
  "use-isnan": "error",
  "valid-typeof": ["error", { requireStringLiterals: true }],
};

const typescriptRules = typescriptPlugin
  ? {
      "no-array-constructor": "off",
      "no-dupe-class-members": "off",
      "no-redeclare": "off",
      "no-unused-expressions": "off",
      "no-unused-vars": "off",
      "no-useless-constructor": "off",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-check": false,
          "ts-expect-error": "allow-with-description",
          "ts-ignore": true,
          "ts-nocheck": true,
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          disallowTypeAnnotations: false,
          fixStyle: "inline-type-imports",
          prefer: "type-imports",
        },
      ],
      "@typescript-eslint/no-array-constructor": "error",
      "@typescript-eslint/no-dupe-class-members": "error",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-inferrable-types": "off",
      "@typescript-eslint/no-misused-new": "error",
      "@typescript-eslint/no-namespace": "error",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-redeclare": ["error", { builtinGlobals: true }],
      "@typescript-eslint/no-require-imports": "error",
      "@typescript-eslint/no-unused-expressions": [
        "error",
        {
          allowShortCircuit: true,
          allowTaggedTemplates: true,
          allowTernary: true,
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-useless-constructor": "error",
    }
  : {};

export const salaryHijackingPolicy = Object.freeze({
  currency: SALARY_HIJACKING_ESLINT_CURRENCY,
  timezone: SALARY_HIJACKING_ESLINT_TIMEZONE,
  serverAuthorityRequired: true,
  rawFinancialDataInAuthPayloadAllowed: false,
  rawFinancialDataInCommunityPayloadAllowed: false,
  rawFinancialDataInAdsEventAllowed: false,
  rawFinancialDataInLogsAllowed: false,
  rawTokenInResponseAllowed: false,
  rawSecretInResponseAllowed: false,
  rawPiiInLogsAllowed: false,
  clientFinalPayrollCalculationAllowed: false,
});

const baseConfig = [
  {
    name: "salary-hijacking/global-ignores",
    ignores: [
      "**/.expo/**",
      "**/.next/**",
      "**/.nuxt/**",
      "**/.open-next/**",
      "**/.output/**",
      "**/.turbo/**",
      "**/.vercel/**",
      "**/.wrangler/**",
      "**/android/**",
      "**/build/**",
      "**/coverage/**",
      "**/dist/**",
      "**/ios/**",
      "**/node_modules/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/tmp/**",
      "**/vendor/**",
      "**/*.d.ts",
      "**/*.generated.*",
      "**/*.min.*",
      "**/pnpm-lock.yaml",
    ],
  },
  {
    name: "salary-hijacking/javascript-esm",
    files: ["**/*.{js,mjs,jsx}"],
    languageOptions: {
      ...commonLanguageOptions,
      globals: {
        ...browserGlobals,
        ...nodeGlobals,
      },
    },
    rules: commonRules,
  },
  {
    name: "salary-hijacking/javascript-commonjs",
    files: ["**/*.cjs"],
    languageOptions: {
      ...commonLanguageOptions,
      sourceType: "commonjs",
      globals: {
        ...nodeGlobals,
        ...readonlyGlobals(
          "__dirname",
          "__filename",
          "exports",
          "module",
          "require",
        ),
      },
    },
    rules: {
      ...commonRules,
      "no-undef": "off",
    },
  },
  ...(typescriptParser && typescriptPlugin
    ? [
        {
          name: "salary-hijacking/typescript",
          files: ["**/*.{ts,tsx,mts,cts}"],
          languageOptions: {
            ...commonLanguageOptions,
            parser: typescriptParser,
            parserOptions: {
              ...commonLanguageOptions.parserOptions,
              projectService: true,
              tsconfigRootDir: process.cwd(),
              warnOnUnsupportedTypeScriptVersion: false,
            },
            globals: {
              ...browserGlobals,
              ...nodeGlobals,
            },
          },
          plugins: {
            "@typescript-eslint": typescriptPlugin,
          },
          rules: {
            ...commonRules,
            ...typescriptRules,
          },
        },
      ]
    : []),
  {
    name: "salary-hijacking/tests",
    files: [
      "**/*.{spec,test}.{js,jsx,ts,tsx,mjs,cjs}",
      "**/__tests__/**/*.{js,jsx,ts,tsx,mjs,cjs}",
      "qa/**/*.{js,jsx,ts,tsx,mjs,cjs}",
    ],
    languageOptions: {
      globals: testGlobals,
    },
    rules: {
      "no-console": "off",
      "no-restricted-syntax": "off",
      "require-await": "off",
    },
  },
  {
    name: "salary-hijacking/scripts-and-config",
    files: [
      "*.config.{js,mjs,cjs,ts}",
      "**/*.config.{js,mjs,cjs,ts}",
      "scripts/**/*.{js,mjs,cjs,ts}",
      "tools/**/*.{js,mjs,cjs,ts}",
      "packages/config/**/*.{js,mjs,cjs,ts}",
    ],
    rules: {
      "no-console": "off",
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Property[key.name=/^(rawPiiIncluded|rawSecretIncluded|rawTokenIncluded|adsFinancialJoinAllowed)$/][value.value=true]",
          message:
            "급여납치 보안 계약 위반: raw PII/secret/token/ad-financial join true flags are forbidden.",
        },
        {
          selector:
            "Property[key.name=/^rawFinancialSourceDataIncluded/][value.value=true]",
          message:
            "급여납치 보안 계약 위반: raw financial source data must never be exposed.",
        },
      ],
    },
  },
  {
    name: "salary-hijacking/prettier-compatibility",
    rules: eslintConfigPrettier.rules ?? {},
  },
];

const forbiddenSecuritySyntaxRestrictions = [
  {
    selector:
      "Property[key.name=/^(rawPiiIncluded|rawSecretIncluded|rawTokenIncluded|adsFinancialJoinAllowed)$/][value.value=true]",
    message:
      "급여납치 보안 계약 위반: raw PII/secret/token/ad-financial join true flags are forbidden.",
  },
  {
    selector:
      "Property[key.value=/^(rawPiiIncluded|rawSecretIncluded|rawTokenIncluded|adsFinancialJoinAllowed)$/][value.value=true]",
    message:
      "급여납치 보안 계약 위반: raw PII/secret/token/ad-financial join true flags are forbidden.",
  },
  {
    selector:
      "Property[key.name=/^rawFinancialSourceDataIncluded/][value.value=true]",
    message:
      "급여납치 보안 계약 위반: raw financial source data must never be exposed.",
  },
  {
    selector:
      "Property[key.value=/^rawFinancialSourceDataIncluded/][value.value=true]",
    message:
      "급여납치 보안 계약 위반: raw financial source data must never be exposed.",
  },
  {
    selector:
      "Property[key.name=/^(rawPiiIncluded|rawSecretIncluded|rawTokenIncluded|adsFinancialJoinAllowed)$/][value.type='CallExpression'][value.callee.object.name='z'][value.callee.property.name='literal'] > Literal[value=true]",
    message:
      "급여납치 보안 계약 위반: z.literal(true) must not be used for raw PII/secret/token/ad-financial join flags.",
  },
  {
    selector:
      "Property[key.value=/^(rawPiiIncluded|rawSecretIncluded|rawTokenIncluded|adsFinancialJoinAllowed)$/][value.type='CallExpression'][value.callee.object.name='z'][value.callee.property.name='literal'] > Literal[value=true]",
    message:
      "급여납치 보안 계약 위반: z.literal(true) must not be used for raw PII/secret/token/ad-financial join flags.",
  },
  {
    selector:
      "Property[key.name=/^rawFinancialSourceDataIncluded/][value.type='CallExpression'][value.callee.object.name='z'][value.callee.property.name='literal'] > Literal[value=true]",
    message:
      "급여납치 보안 계약 위반: raw financial source data must never be exposed by z.literal(true).",
  },
  {
    selector:
      "Property[key.value=/^rawFinancialSourceDataIncluded/][value.type='CallExpression'][value.callee.object.name='z'][value.callee.property.name='literal'] > Literal[value=true]",
    message:
      "급여납치 보안 계약 위반: raw financial source data must never be exposed by z.literal(true).",
  },
];

const mergeNoRestrictedSyntax = (currentRule) => {
  if (currentRule === "off") {
    return currentRule;
  }

  const severity = Array.isArray(currentRule) ? currentRule[0] : "error";
  const currentRestrictions = Array.isArray(currentRule)
    ? currentRule.slice(1)
    : [];
  const uniqueRestrictions = [
    ...currentRestrictions,
    ...forbiddenSecuritySyntaxRestrictions,
  ].filter(
    (restriction, index, restrictions) =>
      restrictions.findIndex(
        (candidate) =>
          JSON.stringify(candidate) === JSON.stringify(restriction),
      ) === index,
  );

  return [severity, ...uniqueRestrictions];
};

const securityRuleConfigNames = new Set([
  "salary-hijacking/javascript-esm",
  "salary-hijacking/javascript-commonjs",
  "salary-hijacking/typescript",
  "salary-hijacking/scripts-and-config",
]);

const finalizedBaseConfig = baseConfig.map((config) => {
  if (!config || typeof config !== "object" || !("rules" in config)) {
    return config;
  }

  const rules = { ...(config.rules ?? {}) };

  if (config.name === "salary-hijacking/typescript") {
    rules["no-undef"] = "off";
  }

  if (securityRuleConfigNames.has(config.name)) {
    rules["no-restricted-syntax"] = mergeNoRestrictedSyntax(
      rules["no-restricted-syntax"],
    );
  }

  return {
    ...config,
    rules,
  };
});

export { finalizedBaseConfig as baseConfig };
export default finalizedBaseConfig;
