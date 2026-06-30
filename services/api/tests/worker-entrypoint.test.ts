import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const currentDir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(currentDir, "../src/index.ts"), "utf8");

describe("Cloudflare Worker entrypoint export contract", () => {
  it("keeps runtime metadata internal so wrangler sees only the default worker export", () => {
    expect(source).not.toMatch(
      /^\s*export\s+(?:const|let|var|async\s+function|function|class|interface|type)\s+/m,
    );
    expect(source).not.toMatch(/^\s*export\s*\{/m);
    expect(source).toMatch(/export\s+default\s+worker\s*;/);
  });
});
