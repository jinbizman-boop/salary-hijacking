#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");
const fail = (message) => {
  console.error(`PHASE_5_VALIDATOR=FAIL ${message}`);
  process.exitCode = 1;
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const completionPath = "docs/notifications/PHASE_5_NOTIFICATIONS_COMPLETION.json";
const matrixPath = "docs/notifications/NOTIFICATION_EVENT_MATRIX.csv";
const notificationsWranglerPath = "services/notifications/wrangler.toml";
const apiWranglerPath = "services/api/wrangler.toml";
const notificationsEntrypointPath = "services/notifications/src/phase5-entrypoint.ts";
const apiEntrypointPath = "services/api/src/phase5-entrypoint.ts";
const migrationPath = "database/migrations/0021_notification_invalid_token_cleanup.sql";

const completion = JSON.parse(read(completionPath));
const matrix = read(matrixPath);
const notificationsWrangler = read(notificationsWranglerPath);
const apiWrangler = read(apiWranglerPath);
const notificationsEntrypoint = read(notificationsEntrypointPath);
const apiEntrypoint = read(apiEntrypointPath);
const migration = read(migrationPath);

assert(completion.schemaVersion === 1, "completion schemaVersion must be 1");
assert(completion.phase === 5, "completion phase must be 5");
assert(
  ["PASS", "PARTIAL", "FAIL", "EXTERNAL_BLOCKER"].includes(completion.status),
  "completion status is invalid",
);
assert(completion.projectCompletion100 === false, "project completion must remain false in Phase 5");
assert(completion.commercialLaunchReady === false, "commercial launch readiness must remain false in Phase 5");

const expectedRequirements = Array.from({ length: 10 }, (_, index) =>
  `NOTI-${String(index + 1).padStart(3, "0")}`,
);
for (const requirement of expectedRequirements) {
  assert(completion.requirementScope.includes(requirement), `${requirement} missing from completion scope`);
  assert(
    matrix.split(/\r?\n/).some((line) => line.startsWith(`${requirement},`)),
    `${requirement} missing from notification matrix`,
  );
}
assert(
  matrix.split(/\r?\n/).filter((line) => /^NOTI-\d{3},/.test(line)).length === 10,
  "notification matrix must contain exactly 10 NOTI rows",
);

for (const [environment, queue] of [
  ["development", "salary-hijacking-dev-operations"],
  ["staging", "salary-hijacking-staging-operations"],
  ["production", "salary-hijacking-production-operations"],
]) {
  assert(
    notificationsWrangler.includes(`queue = "${queue}"`),
    `${environment} notifications producer is not mapped to ${queue}`,
  );
  assert(apiWrangler.includes(`queue = "${queue}"`), `${environment} API consumer is not mapped to ${queue}`);
}
assert(
  !/salary-hijacking-(?:dev|staging|production)-notifications-operations/.test(notificationsWrangler),
  "obsolete notifications-operations queue topology remains",
);

assert(
  notificationsWrangler.includes('main = "src/phase5-entrypoint.ts"'),
  "notifications Wrangler is not using the Phase 5 entrypoint",
);
assert(
  apiWrangler.includes('main = "src/phase5-entrypoint.ts"'),
  "API Wrangler is not using the Phase 5 entrypoint",
);
assert(
  notificationsEntrypoint.includes("NOTIFICATION_QUEUE_SCHEMA_VERSION"),
  "notifications Phase 5 envelope validation is missing",
);
assert(
  apiEntrypoint.includes("PHASE5_PUSH_CLEANUP_SCHEMA_VERSION_INVALID"),
  "API cleanup strict envelope validation is missing",
);
assert(
  apiEntrypoint.includes("public.revoke_invalid_push_token_hash"),
  "API cleanup DB function invocation is missing",
);
assert(
  migration.includes("SECURITY DEFINER") &&
    migration.includes("REVOKE ALL ON FUNCTION public.revoke_invalid_push_token_hash") &&
    migration.includes("push_token_hash = v_hash"),
  "migration 0021 hash-only least-privilege cleanup contract is incomplete",
);

const runtimeEvidence = Object.values(completion.runtimeEvidence ?? {});
const allRuntimeEvidence = runtimeEvidence.length > 0 && runtimeEvidence.every((value) => value === true);
if (completion.status === "PASS") {
  assert(allRuntimeEvidence, "Phase 5 cannot be PASS while mandatory runtime evidence is false");
  assert(completion.phase6EntryReadiness === "READY", "Phase 6 must be READY only after Phase 5 PASS");
  assert(completion.defects?.["D-016"] === "PASS", "D-016 must be PASS for Phase 5 PASS");
} else {
  assert(
    completion.phase6EntryReadiness !== "READY",
    "Phase 6 must not be READY while Phase 5 is not PASS",
  );
}

if (!process.exitCode) {
  console.log(
    JSON.stringify(
      {
        PHASE_5_VALIDATOR: "PASS",
        PHASE_5_STATUS: completion.status,
        NOTI_ROWS: 10,
        ALL_RUNTIME_EVIDENCE: allRuntimeEvidence,
        PHASE_6_ENTRY_READINESS: completion.phase6EntryReadiness,
        D_016: completion.defects?.["D-016"],
      },
      null,
      2,
    ),
  );
}
