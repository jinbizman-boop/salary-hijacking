import assert from "node:assert/strict";
import test from "node:test";

import {
  assertNoSensitiveEvidence,
  buildEvidence,
} from "./collect-staging-authenticated-persistence-proof.mjs";

const passingCheck = Object.freeze({
  mutation: { ok: true, status: 201 },
  readback: { ok: true, status: 200 },
  ownership: { ok: true, status: 404 },
});

const passingDb = Object.freeze({
  rowCount: 1,
  recordHash:
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
});

test("builds no-secret authenticated persistence evidence", () => {
  const evidence = buildEvidence({
    sourceSha: "1acc455e8bc823eb6ba5839d28b7848d8f66d4e8",
    subjectHash: "synthetic-hash",
    checks: {
      payroll: passingCheck,
      budget: passingCheck,
      expense: passingCheck,
      saving: passingCheck,
    },
    dbChecks: {
      payroll: passingDb,
      budget: passingDb,
      expense: passingDb,
      saving: passingDb,
    },
    cleanup: { deletedUserRows: 1, residualSyntheticUsers: 0 },
  });

  assert.equal(evidence.status, "PASS");
  assert.equal(evidence.containsSecretValues, false);
  assert.equal(evidence.containsRawPersonalData, false);
  assert.equal(evidence.containsRawFinancialData, false);
  assert.equal(evidence.domains.payroll.result, "PASS");
  assertNoSensitiveEvidence(evidence);
});

test("rejects raw secret, token, PII, and financial evidence", () => {
  assert.throws(
    () =>
      assertNoSensitiveEvidence({
        containsSecretValues: false,
        note: "postgresql://user:password@example.neon.tech/neondb",
      }),
    /raw secret/i,
  );
  assert.throws(
    () =>
      assertNoSensitiveEvidence({
        containsRawPersonalData: false,
        email: "synthetic@example.test",
      }),
    /raw secret/i,
  );
  assert.throws(
    () =>
      assertNoSensitiveEvidence({
        containsRawFinancialData: false,
        payrollAmountMinor: 123,
      }),
    /raw secret/i,
  );
});
