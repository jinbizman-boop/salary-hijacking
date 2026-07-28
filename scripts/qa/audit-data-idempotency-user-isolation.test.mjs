import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { auditDataIdempotencyUserIsolation } from "./audit-data-idempotency-user-isolation.mjs";

function tempRepo(files) {
  const root = mkdtempSync(join(tmpdir(), "salary-idempotency-audit-"));
  for (const [file, text] of Object.entries(files)) {
    const absolutePath = join(root, file);
    mkdirSync(join(absolutePath, ".."), { recursive: true });
    writeFileSync(absolutePath, text);
  }
  return root;
}

test("passes when required user-scoped idempotency and isolation patterns exist", () => {
  const root = tempRepo({
    "a.ts": "where user_id = $1::uuid and idempotency_key = $2 on conflict (user_id, idempotency_key)",
  });

  const result = auditDataIdempotencyUserIsolation({
    root,
    checks: [
      {
        id: "sample",
        file: "a.ts",
        mustContain: [
          "where user_id = $1::uuid",
          "and idempotency_key = $2",
          "on conflict (user_id, idempotency_key)",
        ],
      },
    ],
  });

  assert.equal(result.ok, true);
  assert.equal(result.failedChecks, 0);
});

test("fails when idempotency is not scoped to a user", () => {
  const root = tempRepo({
    "a.ts": "where idempotency_key = $1 on conflict (idempotency_key)",
  });

  const result = auditDataIdempotencyUserIsolation({
    root,
    checks: [
      {
        id: "sample",
        file: "a.ts",
        mustContain: [
          "where user_id = $1::uuid",
          "and idempotency_key = $2",
          "on conflict (user_id, idempotency_key)",
        ],
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.equal(result.failedChecks, 1);
  assert.deepEqual(result.failures[0].missing, [
    "where user_id = $1::uuid",
    "and idempotency_key = $2",
    "on conflict (user_id, idempotency_key)",
  ]);
});

test("fails when an audited source file is missing", () => {
  const root = tempRepo({});

  const result = auditDataIdempotencyUserIsolation({
    root,
    checks: [
      {
        id: "sample",
        file: "missing.ts",
        mustContain: ["where user_id = $1::uuid"],
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.equal(result.failures[0].reason, "missing-file");
});
