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

const csv = (rows) =>
  [header, ...rows]
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
