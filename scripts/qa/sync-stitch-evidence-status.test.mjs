import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(
  new URL("./sync-stitch-evidence-status.mjs", import.meta.url),
  "utf8",
);

test("maps all Splash and Login Stitch variants to native evidence", () => {
  const requiredInstances = [
    "SCR-001-V001",
    "SCR-001-V002",
    "SCR-001-V003",
    "SCR-001-V004",
    "SCR-001-V005",
    "SCR-001-V006",
    "SCR-001-V007",
    "SCR-001-V008",
    "SCR-002-V001",
    "SCR-002-V002",
    "SCR-002-V003",
    "SCR-002-V004",
    "SCR-002-V005",
    "SCR-002-V006",
  ];

  for (const instanceCode of requiredInstances) {
    assert.match(source, new RegExp(`"${instanceCode}"`, "u"));
  }

  assert.match(source, /release\/evidence\/mobile-ui\/01_splash\.png/u);
  assert.match(source, /release\/evidence\/mobile-ui\/02_login\.png/u);
  assert.match(
    source,
    /release\/evidence\/mobile-ui\/46_login_credential_error\.png/u,
  );
  assert.match(
    source,
    /release\/evidence\/mobile-ui\/47_login_password_recovery\.png/u,
  );
  assert.match(
    source,
    /release\/evidence\/mobile-ui\/48_login_logout_complete\.png/u,
  );
  assert.match(source, /capture-auth-states-green-20260721\.log/u);
  assert.match(
    source,
    /capture-mobile-clean-fintech-20260721-auth-states\.log/u,
  );
});

test("maps expense form Stitch variants to native edit/refund/validation evidence", () => {
  const requiredInstances = [
    "SCR-006-V001",
    "SCR-006-V002",
    "SCR-006-V003",
    "SCR-006-V004",
    "SCR-006-V005",
    "SCR-006-V006",
    "SCR-006-V007",
    "SCR-006-V008",
    "SCR-006-V009",
    "SCR-006-V010",
    "SCR-006-V011",
    "SCR-006-V012",
    "SCR-006-V013",
    "SCR-006-V014",
  ];

  for (const instanceCode of requiredInstances) {
    assert.match(source, new RegExp(`"${instanceCode}"`, "u"));
  }

  assert.match(
    source,
    /release\/evidence\/mobile-ui\/49_expense_form_edit\.png/u,
  );
  assert.match(
    source,
    /release\/evidence\/mobile-ui\/50_expense_form_refund\.png/u,
  );
  assert.match(
    source,
    /release\/evidence\/mobile-ui\/51_expense_form_validation\.png/u,
  );
  assert.match(
    source,
    /release\/evidence\/mobile-ui\/52_expense_delete_blocked\.png/u,
  );
  assert.match(
    source,
    /release\/evidence\/mobile-ui\/53_expense_invalidate_reason\.png/u,
  );
  assert.match(source, /capture-expense-states-green-20260721\.log/u);
  assert.match(
    source,
    /capture-mobile-clean-fintech-20260721-expense-states\.log/u,
  );
});

test("maps community post-detail Stitch variants to native screen, modal, and sheet evidence", () => {
  const requiredInstances = [
    "SCR-018-V001",
    "SCR-018-V002",
    "SCR-018-V003",
    "SCR-018-V004",
    "SCR-018-V005",
    "SCR-018-V006",
    "SCR-018-V007",
    "SCR-018-V008",
    "SCR-018-V009",
    "SCR-018-V010",
    "SCR-018-V011",
    "SCR-018-V012",
    "SCR-018-V013",
    "SCR-018-V014",
    "SCR-018-V015",
  ];

  for (const instanceCode of requiredInstances) {
    assert.match(source, new RegExp(`"${instanceCode}"`, "u"));
  }

  assert.match(
    source,
    /release\/evidence\/mobile-ui\/54_community_post_offline\.png/u,
  );
  assert.match(
    source,
    /release\/evidence\/mobile-ui\/55_community_post_comment_restricted\.png/u,
  );
  assert.match(
    source,
    /release\/evidence\/mobile-ui\/56_community_post_own_menu\.png/u,
  );
  assert.match(
    source,
    /release\/evidence\/mobile-ui\/60_community_post_sensitive_warning\.png/u,
  );
  assert.match(
    source,
    /release\/evidence\/mobile-ui\/64_community_post_restricted\.png/u,
  );
  assert.match(source, /capture-community-detail-states-green-20260721\.log/u);
  assert.match(
    source,
    /capture-mobile-clean-fintech-20260721-community-detail\.log/u,
  );
});

test("maps community write Stitch variants to native form, modal, and restricted-state evidence", () => {
  const requiredInstances = [
    "SCR-019-V001",
    "SCR-019-V002",
    "SCR-019-V003",
    "SCR-019-V004",
    "SCR-019-V005",
    "SCR-019-V006",
    "SCR-019-V007",
    "SCR-019-V008",
    "SCR-019-V009",
  ];

  for (const instanceCode of requiredInstances) {
    assert.match(source, new RegExp(`"${instanceCode}"`, "u"));
  }

  assert.match(
    source,
    /release\/evidence\/mobile-ui\/65_community_write_attachments\.png/u,
  );
  assert.match(
    source,
    /release\/evidence\/mobile-ui\/66_community_write_sensitive_warning\.png/u,
  );
  assert.match(
    source,
    /release\/evidence\/mobile-ui\/69_community_write_draft_recovery\.png/u,
  );
  assert.match(
    source,
    /release\/evidence\/mobile-ui\/72_community_write_question_anonymous\.png/u,
  );
  assert.match(source, /capture-community-write-states-green-20260721\.log/u);
  assert.match(
    source,
    /capture-mobile-clean-fintech-20260721-community-write\.log/u,
  );
});

test("maps community comment and reaction Stitch variants to native evidence", () => {
  const requiredInstances = [
    "SCR-020-V001",
    "SCR-020-V002",
    "SCR-020-V003",
    "SCR-020-V004",
    "SCR-020-V005",
    "SCR-020-V006",
    "SCR-020-V007",
    "SCR-020-V008",
    "SCR-020-V009",
    "SCR-020-V010",
    "SCR-020-V011",
    "SCR-020-V012",
    "SCR-020-V013",
  ];

  for (const instanceCode of requiredInstances) {
    assert.match(source, new RegExp(`"${instanceCode}"`, "u"));
  }

  assert.match(
    source,
    /release\/evidence\/mobile-ui\/73_community_comments_load_error\.png/u,
  );
  assert.match(
    source,
    /release\/evidence\/mobile-ui\/74_community_comment_delete_confirm\.png/u,
  );
  assert.match(
    source,
    /release\/evidence\/mobile-ui\/77_community_replies_expanded\.png/u,
  );
  assert.match(
    source,
    /release\/evidence\/mobile-ui\/85_community_comment_thread_policy\.png/u,
  );
  assert.match(source, /capture-community-comment-states-green-20260721\.log/u);
  assert.match(
    source,
    /capture-mobile-clean-fintech-20260721-community-comments\.log/u,
  );
});

test("maps profile account Stitch variants to native account state evidence", () => {
  const requiredInstances = [
    "SCR-023-V001",
    "SCR-023-V002",
    "SCR-023-V003",
    "SCR-023-V004",
    "SCR-023-V005",
    "SCR-023-V006",
    "SCR-023-V007",
    "SCR-023-V008",
    "SCR-023-V009",
    "SCR-023-V010",
    "SCR-023-V011",
    "SCR-023-V012",
    "SCR-023-V013",
  ];

  for (const instanceCode of requiredInstances) {
    assert.match(source, new RegExp(`"${instanceCode}"`, "u"));
  }

  assert.match(
    source,
    /release\/evidence\/mobile-ui\/86_profile_account_restricted\.png/u,
  );
  assert.match(
    source,
    /release\/evidence\/mobile-ui\/89_profile_biometric_app_lock\.png/u,
  );
  assert.match(
    source,
    /release\/evidence\/mobile-ui\/96_profile_password_change\.png/u,
  );
  assert.match(
    source,
    /release\/evidence\/mobile-ui\/97_profile_account_settings_default\.png/u,
  );
  assert.match(source, /capture-profile-account-states-green-20260721\.log/u);
  assert.match(
    source,
    /capture-mobile-clean-fintech-20260721-profile-account\.log/u,
  );
});

test("updates the human-readable implementation matrix summary from synced CSV counts", () => {
  assert.match(source, /SCREEN_IMPLEMENTATION_MATRIX\.md/u);
  assert.match(source, /summaryPath/u);
  assert.match(source, /writeFileSync\(summaryPath/u);
  assert.match(source, /## Current Status/u);
});
