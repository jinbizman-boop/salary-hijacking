import assert from "node:assert/strict";
import test from "node:test";

import baseConfig from "./base.js";

test("global ignores exclude local Android Gradle QA caches", () => {
  const globalIgnores = baseConfig.find(
    (config) => config?.name === "salary-hijacking/global-ignores",
  );

  assert.ok(globalIgnores, "global ignore config is required");
  assert.ok(
    globalIgnores.ignores.includes("**/.gradle-local-debug/**"),
    "Android QA Gradle cache must not be linted",
  );
  assert.ok(
    globalIgnores.ignores.includes("**/.gradle-local-debug-direct/**"),
    "Android direct QA Gradle cache must not be linted",
  );
});
