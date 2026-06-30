import fs from "node:fs";
import path from "node:path";

const files = ["date", "money", "pagination", "strings"];

const args = new Set(process.argv.slice(2));
const runBarrels = args.size === 0 || args.has("--barrels");
const runTsconfig = args.size === 0 || args.has("--tsconfig");

const writeFile = (filePath, content) => {
  fs.writeFileSync(filePath, content, "utf8");
};

const assertSourcesExist = () => {
  const required = files.map((name) => path.join("src", `${name}.ts`));
  const missing = required.filter((filePath) => !fs.existsSync(filePath));

  if (missing.length > 0) {
    console.error(`Missing utils source files: ${missing.join(", ")}`);
    process.exit(1);
  }
};

if (runBarrels) {
  fs.mkdirSync("src", { recursive: true });
  assertSourcesExist();

  writeFile(
    "src/index.ts",
    `${files.map((name) => `export * from "./${name}";`).join("\n")}\n`,
  );
}

if (runTsconfig) {
  writeFile(
    "tsconfig.utils.json",
    `${JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          module: "ESNext",
          moduleResolution: "Bundler",
          strict: true,
          exactOptionalPropertyTypes: true,
          noUncheckedIndexedAccess: true,
          noImplicitOverride: true,
          noPropertyAccessFromIndexSignature: false,
          noUncheckedSideEffectImports: true,
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
        include: ["src/**/*.ts"],
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
        /"include": \[\n\s+"src\/\*\*\/\*\.ts"\n\s+\]/,
        '"include": ["src/**/*.ts"]',
      )
      .replace(
        /"exclude": \[\n\s+"dist",\n\s+"node_modules",\n\s+"coverage"\n\s+\]/,
        '"exclude": ["dist", "node_modules", "coverage"]',
      )}\n`,
  );
}
