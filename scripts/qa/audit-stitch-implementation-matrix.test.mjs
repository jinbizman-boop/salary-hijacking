import assert from "node:assert/strict";
import test from "node:test";

import {
  auditStitchImplementationMatrix,
  parseCsv,
} from "./audit-stitch-implementation-matrix.mjs";

const header = [
  "source_folder",
  "instance_code",
  "primary_code",
  "screen_name_ko",
  "variant_slug",
  "state_code",
  "artifact_type",
  "route_or_overlay",
  "target_component",
  "recommended_component_path",
  "implementation_action",
  "code_html",
  "reference_png",
  "implementation_file",
  "unit_test",
  "e2e_test",
  "visual_test",
  "status",
  "notes",
];

const truthHeader = [
  "requirement_id",
  "source_document",
  "source_location",
  "priority",
  "domain",
  "screen_code",
  "stitch_instance_code",
  "route_or_overlay",
  "user_role",
  "state",
  "acceptance_criteria",
  "implementation_file",
  "API_endpoint",
  "DB_table_or_migration",
  "unit_test",
  "integration_test",
  "E2E_test",
  "visual_reference",
  "visual_test",
  "accessibility_test",
  "staging_evidence",
  "Android_evidence",
  "status",
  "blocker",
  "evidence_path",
  "commit_sha",
];

const csv = (rows) =>
  [header, ...rows]
    .map((csvRow) =>
      csvRow
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");

const truthCsv = (rows) =>
  [truthHeader, ...rows]
    .map((csvRow) =>
      csvRow
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");

const row = ({
  instanceCode,
  primaryCode,
  name,
  artifactType = "screen",
  status = "PASS",
  notes = "EVIDENCE_SYNCED:ok",
}) => [
  `classified/${instanceCode}__sample`,
  instanceCode,
  primaryCode,
  name,
  "sample",
  "DEFAULT",
  artifactType,
  "/sample",
  "SampleScreen",
  "features/sample/SampleScreen.tsx",
  "IMPLEMENT_AS_SCREEN_VARIANT",
  `classified/${instanceCode}__sample/code.html`,
  `classified/${instanceCode}__sample/screen.png`,
  "apps/mobile/src/features/sample/SampleScreen.tsx",
  "artifacts/qa/sample.log",
  "artifacts/qa/sample-e2e.log",
  "release/evidence/mobile-ui/sample.png",
  status,
  notes,
];

const truthRow = ({
  requirementId,
  instanceCode,
  primaryCode,
  route = "/sample",
  acceptance = "screen must be implemented as native production route/state/overlay without WebView or PNG background; action=IMPLEMENT_AS_SCREEN_VARIANT",
  status = "UNVERIFIED",
  visualReference,
}) => [
  requirementId,
  "stitch_salary_hijacking_design_system_classified.zip",
  `${instanceCode}__sample`,
  "P1",
  "Mobile",
  primaryCode,
  instanceCode,
  route,
  "user",
  "DEFAULT",
  acceptance,
  "features/sample/SampleScreen.tsx",
  "",
  "",
  "",
  "",
  "",
  visualReference ?? `zip:${instanceCode}__sample/screen.png`,
  "",
  "",
  "",
  "",
  status,
  "",
  "artifacts/qa/stitch-classified-catalog-summary-20260724.json",
  "b".repeat(40),
];

test("parses quoted CSV while preserving Korean screen names", () => {
  const parsed = parseCsv(
    csv([
      row({
        instanceCode: "SCR-001-V001",
        primaryCode: "SCR-001",
        name: "스플래시",
      }),
    ]),
  );

  assert.equal(parsed.rows[0].screen_name_ko, "스플래시");
});

test("passes when the matrix covers catalog rows plus synthetic SCR-029", () => {
  const catalog = {
    screens: [
      {
        instance_code: "SCR-001-V001",
        primary_code: "SCR-001",
        artifact_type: "screen",
        png_status: "OK",
      },
      {
        instance_code: "SCR-005-V002",
        primary_code: "SCR-005",
        artifact_type: "screen",
        png_status: "CORRUPT",
      },
    ],
  };
  const result = auditStitchImplementationMatrix({
    catalog,
    matrixCsv: csv([
      row({
        instanceCode: "SCR-001-V001",
        primaryCode: "SCR-001",
        name: "스플래시",
      }),
      row({
        instanceCode: "SCR-005-V002",
        primaryCode: "SCR-005",
        name: "급여 홈",
        notes:
          "SCREEN_PNG_CORRUPT;HTML_PRIMARY_REFERENCE_REQUIRED;EVIDENCE_SYNCED:ok",
      }),
      row({
        instanceCode: "SCR-029-V001",
        primaryCode: "SCR-029",
        name: "알림 설정",
      }),
    ]),
  });

  assert.equal(result.ok, true);
  assert.equal(result.sourceCatalogItems, 2);
  assert.equal(result.syntheticRows, 1);
  assert.equal(result.totalRows, 3);
  assert.deepEqual(result.missingCatalogInstanceCodes, []);
  assert.deepEqual(result.mojibakeRows, []);
  assert.deepEqual(result.corruptPngRowsMissingHtmlPrimaryReference, []);
});

test("fails when catalog rows are missing or Korean names are mojibake", () => {
  const result = auditStitchImplementationMatrix({
    catalog: {
      screens: [
        {
          instance_code: "SCR-017-V001",
          primary_code: "SCR-017",
          artifact_type: "screen",
          png_status: "OK",
        },
        {
          instance_code: "SCR-017-V002",
          primary_code: "SCR-017",
          artifact_type: "screen",
          png_status: "OK",
        },
      ],
    },
    matrixCsv: csv([
      row({
        instanceCode: "SCR-017-V001",
        primaryCode: "SCR-017",
        name: "而ㅻ??덊떚",
      }),
    ]),
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.missingCatalogInstanceCodes, ["SCR-017-V002"]);
  assert.deepEqual(result.mojibakeRows, ["SCR-017-V001"]);
});

test("reads the audit truth matrix schema with stitch_instance_code", () => {
  const catalog = {
    screens: [
      {
        instance_code: "SCR-001-V001",
        primary_code: "SCR-001",
        artifact_type: "screen",
        png_status: "OK",
      },
      {
        instance_code: "SCR-007-V001",
        primary_code: "SCR-007",
        artifact_type: "modal",
        png_status: "OK",
      },
    ],
  };

  const result = auditStitchImplementationMatrix({
    catalog,
    matrixCsv: truthCsv([
      truthRow({
        requirementId: "STITCH-001",
        instanceCode: "SCR-001-V001",
        primaryCode: "SCR-001",
      }),
      truthRow({
        requirementId: "STITCH-002",
        instanceCode: "SCR-007-V001",
        primaryCode: "SCR-007",
        acceptance:
          "modal must be implemented as native production route/state/overlay without WebView or PNG background; action=EXTRACT_AS_REUSABLE_DIALOG",
      }),
      [
        "D-001",
        "goal-objective.md",
        "audit defect register",
        "P1",
        "Auth",
        "",
        "",
        "",
        "user",
        "",
        "Non-Stitch defect row",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "RESOLVED",
        "",
        "artifacts/qa/proof.log",
        "c".repeat(40),
      ],
    ]),
  });

  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.equal(result.sourceCatalogItems, 2);
  assert.equal(result.totalRows, 3);
  assert.deepEqual(result.missingCatalogInstanceCodes, []);
  assert.equal(result.artifactTypeCounts.screen, 1);
  assert.equal(result.artifactTypeCounts.modal, 1);
});

test("fails truth matrix rows whose implementation files do not exist", () => {
  const catalog = {
    screens: [
      {
        instance_code: "SCR-001-V001",
        primary_code: "SCR-001",
        artifact_type: "screen",
        png_status: "OK",
      },
    ],
  };

  const result = auditStitchImplementationMatrix({
    catalog,
    matrixCsv: truthCsv([
      truthRow({
        requirementId: "STITCH-001",
        instanceCode: "SCR-001-V001",
        primaryCode: "SCR-001",
      }).with(11, "features/missing/screens/NopeScreen.tsx"),
    ]),
    rootDir: "/repo",
    checkImplementationFiles: true,
  });

  assert.equal(result.ok, false);
  assert.equal(result.missingImplementationFiles.length, 1);
  assert.equal(result.missingImplementationFiles[0].instance_code, "SCR-001-V001");
  assert.equal(
    result.missingImplementationFiles[0].implementation_file,
    "features/missing/screens/NopeScreen.tsx",
  );
  assert.match(
    result.missingImplementationFiles[0].resolved_path.replaceAll("\\", "/"),
    /apps\/mobile\/src\/features\/missing\/screens\/NopeScreen\.tsx$/u,
  );
});
