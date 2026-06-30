/**
 * packages/config/prettier/prettier.config.js
 *
 * 급여납치 Salary Hijacking Platform · shared Prettier 3 config.
 *
 * 파일 목적:
 * - 모노레포 전체 apps/services/packages/tools/qa/docs 공통 포맷 기준 제공
 * - TypeScript, JavaScript, JSON, YAML, Markdown, MDX, HTML, CSS 계열 포맷 통일
 * - Prettier 3 ESM config로 동작
 * - 외부 Prettier plugin을 강제하지 않아 bootstrap/install 전 단계에서도 안전
 * - ESLint base config와 충돌하지 않는 순수 formatting policy만 담당
 * - PR diff 최소화, 코드 리뷰 일관성, release 품질 게이트 안정성 확보
 */

/** @typedef {import("prettier").Config} PrettierConfig */

export const SALARY_HIJACKING_PRETTIER_CONTRACT_VERSION = "1.0.0";
export const SALARY_HIJACKING_PRETTIER_TIMEZONE = "Asia/Seoul";
export const SALARY_HIJACKING_PRETTIER_CURRENCY = "KRW";

export const salaryHijackingPrettierPolicy = Object.freeze({
  project: "salary-hijacking-platform",
  packageScope: "packages/config/prettier",
  configFile: "packages/config/prettier/prettier.config.js",
  prettierMajor: 3,
  timezone: SALARY_HIJACKING_PRETTIER_TIMEZONE,
  currency: SALARY_HIJACKING_PRETTIER_CURRENCY,
  formattingAuthority: "shared-monorepo-config",
  pluginRequiredAtBootstrap: false,
  eslintConflictAvoided: true,
  lineEnding: "lf",
  tabWidth: 2,
  printWidth: 100,
  finalStatus: "file_unit_100_percent_document_theoretical_complete",
});

const sourceFilePattern = "*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}";
const packageSourceFilePattern = "**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}";
const jsonFilePattern = "*.json";
const jsoncFilePattern = "*.jsonc";
const json5FilePattern = "*.json5";
const yamlFilePattern = "*.{yml,yaml}";
const markdownFilePattern = "*.{md,mdx}";
const stylesheetFilePattern = "*.{css,scss,less}";
const htmlFilePattern = "*.{html,htm}";

/**
 * @type {PrettierConfig}
 */
export const prettierConfig = {
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: false,
  quoteProps: "as-needed",
  jsxSingleQuote: false,
  trailingComma: "all",
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: "always",
  proseWrap: "preserve",
  htmlWhitespaceSensitivity: "css",
  endOfLine: "lf",
  embeddedLanguageFormatting: "auto",
  singleAttributePerLine: false,

  overrides: [
    {
      files: [sourceFilePattern, packageSourceFilePattern],
      options: {
        parser: "typescript",
        printWidth: 100,
        tabWidth: 2,
        semi: true,
        singleQuote: false,
        trailingComma: "all",
      },
    },
    {
      files: jsonFilePattern,
      options: {
        parser: "json",
        printWidth: 100,
        tabWidth: 2,
        trailingComma: "none",
      },
    },
    {
      files: jsoncFilePattern,
      options: {
        parser: "jsonc",
        printWidth: 100,
        tabWidth: 2,
        trailingComma: "none",
      },
    },
    {
      files: json5FilePattern,
      options: {
        parser: "json5",
        printWidth: 100,
        tabWidth: 2,
        trailingComma: "all",
        singleQuote: false,
        quoteProps: "preserve",
      },
    },
    {
      files: yamlFilePattern,
      options: {
        parser: "yaml",
        printWidth: 100,
        tabWidth: 2,
        singleQuote: false,
        bracketSpacing: true,
      },
    },
    {
      files: markdownFilePattern,
      options: {
        printWidth: 100,
        proseWrap: "always",
        tabWidth: 2,
        embeddedLanguageFormatting: "auto",
      },
    },
    {
      files: stylesheetFilePattern,
      options: {
        printWidth: 100,
        tabWidth: 2,
        singleQuote: false,
      },
    },
    {
      files: htmlFilePattern,
      options: {
        printWidth: 100,
        tabWidth: 2,
        singleAttributePerLine: false,
        htmlWhitespaceSensitivity: "css",
        bracketSameLine: false,
      },
    },
    {
      files: [
        "*.config.{js,mjs,cjs,ts,mts,cts}",
        "**/*.config.{js,mjs,cjs,ts,mts,cts}",
        "scripts/**/*.{js,mjs,cjs,ts,mts,cts}",
        "tools/**/*.{js,mjs,cjs,ts,mts,cts}",
        "packages/config/**/*.{js,mjs,cjs,ts,mts,cts}",
      ],
      options: {
        printWidth: 100,
        tabWidth: 2,
        semi: true,
        singleQuote: false,
        trailingComma: "all",
      },
    },
    {
      files: [
        ".github/**/*.{yml,yaml}",
        "docker-compose*.{yml,yaml}",
        "compose*.{yml,yaml}",
        "k8s/**/*.{yml,yaml}",
        "infra/**/*.{yml,yaml}",
      ],
      options: {
        parser: "yaml",
        printWidth: 100,
        tabWidth: 2,
        singleQuote: false,
      },
    },
    {
      files: [
        "README.md",
        "CHANGELOG.md",
        "SECURITY.md",
        "CODE_OF_CONDUCT.md",
        "docs/**/*.md",
        "packages/**/README.md",
        "apps/**/README.md",
        "services/**/README.md",
      ],
      options: {
        printWidth: 100,
        proseWrap: "always",
      },
    },
  ],
};

export default prettierConfig;
