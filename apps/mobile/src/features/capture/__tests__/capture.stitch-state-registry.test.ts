import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  resolveCaptureKindForStitchState,
  resolveCaptureKindForStitchSlug,
} from "../stitch-state-registry";

function parseCsv(text: string): readonly Record<string, string>[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    if (char !== "\r") field += char;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const header = rows[0] ?? [];
  return rows
    .slice(1)
    .filter((values) => values.some(Boolean))
    .map((values) =>
      Object.fromEntries(header.map((name, index) => [name, values[index] ?? ""])),
    );
}

describe("Stitch 304 source state registry", () => {
  const catalog = parseCsv(
    readFileSync(
      join(
        process.cwd(),
        "..",
        "..",
        "docs",
        "design",
        "stitch",
        "2026-07-16",
        "stitch-screen-inventory.csv",
      ),
      "utf8",
    ),
  );

  it("maps every canonical Stitch state to a native React Native capture renderer", () => {
    const unresolved = catalog
      .map((row) => ({
        instanceCode: row.instance_code,
        primaryCode: row.primary_code,
        variantSlug: row.variant_slug,
        resolved: resolveCaptureKindForStitchState({
          primaryCode: row.primary_code ?? "",
          variantSlug: row.variant_slug ?? "",
        }),
      }))
      .filter((row) => row.resolved === null);

    expect(catalog).toHaveLength(304);
    expect(unresolved).toEqual([]);
  });

  it("keeps catalog slug aliases available to capture routes without using HTML or image-only fallbacks", () => {
    expect(resolveCaptureKindForStitchSlug("password-login")).toBe("login");
    expect(resolveCaptureKindForStitchSlug("salary-home-default")).toBe("salary");
    expect(resolveCaptureKindForStitchSlug("add-expense")).toBe(
      "expense-form-state",
    );
    expect(resolveCaptureKindForStitchSlug("compose-with-attachments")).toBe(
      "community-write-attachments",
    );
    expect(resolveCaptureKindForStitchSlug("app-initialization-error")).toBe(
      "common-error",
    );
  });
});
