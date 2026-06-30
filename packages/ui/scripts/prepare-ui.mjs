import fs from "node:fs";
import path from "node:path";

const components = [
  "CommunityPostCard",
  "DailyBudgetCard",
  "ExpenseListItem",
  "NotificationRow",
  "SalaryStatusCard",
];
const tokens = ["colors", "spacing", "typography"];

const args = new Set(process.argv.slice(2));
const runBarrels = args.size === 0 || args.has("--barrels");
const runTsconfig = args.size === 0 || args.has("--tsconfig");

const writeFile = (filePath, content) => {
  fs.writeFileSync(filePath, content, "utf8");
};

const assertSourcesExist = () => {
  const required = [
    ...components.map((name) => path.join("src", "components", `${name}.tsx`)),
    ...tokens.map((name) => path.join("src", "tokens", `${name}.ts`)),
  ];
  const missing = required.filter((filePath) => !fs.existsSync(filePath));

  if (missing.length > 0) {
    console.error(`Missing UI source files: ${missing.join(", ")}`);
    process.exit(1);
  }
};

if (runBarrels) {
  fs.mkdirSync("src/components", { recursive: true });
  fs.mkdirSync("src/tokens", { recursive: true });

  writeFile(
    "src/components/index.ts",
    `${components.map((name) => `export * from "./${name}";`).join("\n")}\n`,
  );

  writeFile(
    "src/tokens/index.ts",
    [
      'export * as colorTokens from "./colors";',
      'export * as spacingTokens from "./spacing";',
      'export * as typographyTokens from "./typography";',
      "",
      "export {",
      "  colors,",
      "  getColorsCompletenessReport,",
      "  assertColorsCompleteness,",
      "  COLORS_COMPLETENESS_REPORT,",
      '} from "./colors";',
      "export {",
      "  spacing,",
      "  getSpacingCompletenessReport,",
      "  assertSpacingCompleteness,",
      "  SPACING_COMPLETENESS_REPORT,",
      '} from "./spacing";',
      "export {",
      "  typography,",
      "  getTypographyCompletenessReport,",
      "  assertTypographyCompleteness,",
      "  TYPOGRAPHY_COMPLETENESS_REPORT,",
      '} from "./typography";',
      "",
    ].join("\n"),
  );

  writeFile(
    "src/index.ts",
    ['export * from "./components";', 'export * from "./tokens";', ""].join(
      "\n",
    ),
  );

  assertSourcesExist();
}

if (runTsconfig) {
  writeFile(
    "tsconfig.ui.json",
    `${JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          module: "ESNext",
          moduleResolution: "Bundler",
          jsx: "react-jsx",
          strict: true,
          exactOptionalPropertyTypes: true,
          noUncheckedIndexedAccess: true,
          skipLibCheck: true,
          isolatedModules: true,
          verbatimModuleSyntax: true,
          declaration: true,
          declarationMap: true,
          sourceMap: true,
          rootDir: "src",
          outDir: "dist",
          noEmitOnError: true,
        },
        include: ["src/**/*.ts", "src/**/*.tsx"],
        exclude: ["dist", "node_modules", "coverage"],
      },
      null,
      2,
    )
      .replace(
        /"lib": \[\n\s+"ES2022",\n\s+"DOM",\n\s+"DOM.Iterable"\n\s+\]/,
        '"lib": ["ES2022", "DOM", "DOM.Iterable"]',
      )
      .replace(
        /"include": \[\n\s+"src\/\*\*\/\*\.ts",\n\s+"src\/\*\*\/\*\.tsx"\n\s+\]/,
        '"include": ["src/**/*.ts", "src/**/*.tsx"]',
      )
      .replace(
        /"exclude": \[\n\s+"dist",\n\s+"node_modules",\n\s+"coverage"\n\s+\]/,
        '"exclude": ["dist", "node_modules", "coverage"]',
      )}\n`,
  );
}
