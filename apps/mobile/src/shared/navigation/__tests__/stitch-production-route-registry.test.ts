import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  STITCH_NATIVE_PRODUCTION_SURFACE,
  resolveProductionStitchState,
} from "../stitch-production-route-registry";

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

describe("Stitch production route registry", () => {
  const repoRoot = join(process.cwd(), "..", "..");
  const catalog = parseCsv(
    readFileSync(
      join(
        repoRoot,
        "docs",
        "design",
        "stitch",
        "2026-07-16",
        "stitch-screen-inventory.csv",
      ),
      "utf8",
    ),
  );

  it("maps every canonical Stitch state to a production Expo route and native source file", () => {
    const unresolved = catalog
      .map((row) => ({
        instanceCode: row.instance_code,
        result: resolveProductionStitchState({
          artifactType: row.artifact_type ?? "",
          primaryCode: row.primary_code ?? "",
          routeOrOverlay: row.route_or_overlay ?? "",
          stateCode: row.state_code ?? "",
          variantSlug: row.variant_slug ?? "",
        }),
      }))
      .filter(({ result }) => result === null);

    const resolved = catalog
      .map((row) =>
        resolveProductionStitchState({
          artifactType: row.artifact_type ?? "",
          primaryCode: row.primary_code ?? "",
          routeOrOverlay: row.route_or_overlay ?? "",
          stateCode: row.state_code ?? "",
          variantSlug: row.variant_slug ?? "",
        }),
      )
      .filter((value): value is NonNullable<typeof value> => value !== null);

    const captureRoutes = resolved.filter((item) =>
      item.productionRoute.includes("/capture"),
    );
    const missingRouteFiles = resolved.filter(
      (item) => !existsSync(join(repoRoot, item.routeFile)),
    );
    const missingImplementationFiles = resolved.filter(
      (item) => !existsSync(join(repoRoot, item.implementationFile)),
    );

    expect(catalog).toHaveLength(304);
    expect(unresolved).toEqual([]);
    expect(captureRoutes).toEqual([]);
    expect(missingRouteFiles).toEqual([]);
    expect(missingImplementationFiles).toEqual([]);
    expect(
      resolved.every(
        (item) => item.acceptanceStage === STITCH_NATIVE_PRODUCTION_SURFACE,
      ),
    ).toBe(true);
  });

  it("normalizes historical Stitch paths onto actual Expo Router production paths", () => {
    expect(
      resolveProductionStitchState({
        artifactType: "screen",
        primaryCode: "SCR-013",
        routeOrOverlay: "/lv-up/reading",
        stateCode: "DEFAULT",
        variantSlug: "reading-home",
      })?.productionRoute,
    ).toBe("/level/reading");
    expect(
      resolveProductionStitchState({
        artifactType: "screen",
        primaryCode: "SCR-018",
        routeOrOverlay: "/community/posts/:postId",
        stateCode: "DEFAULT",
        variantSlug: "post-detail-with-comments",
      })?.routeFile,
    ).toBe("apps/mobile/app/community/[postId].tsx");
    expect(
      resolveProductionStitchState({
        artifactType: "screen",
        primaryCode: "SCR-028",
        routeOrOverlay: "/terms",
        stateCode: "CONSENT",
        variantSlug: "terms-consent",
      })?.productionRoute,
    ).toBe("/(auth)/signup");
  });
});
