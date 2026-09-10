import { readFileSync } from "node:fs";
import { join } from "node:path";

const mobileRoot = join(__dirname, "..", "..", "..", "..");

function source(relativePath: string): string {
  return readFileSync(join(mobileRoot, relativePath), "utf8");
}

describe("release startup performance marker contract", () => {
  const jsStartupMarkers = [
    "startup.p3.js_bundle_start",
    "startup.p4.root_module_evaluated",
    "startup.p5.auth_bootstrap_start",
    "startup.p6.secure_storage_read_complete",
    "startup.p7.session_validation_complete",
    "startup.p8.readiness_decision_complete",
    "startup.p9.destination_resolved",
    "startup.p10.route_component_mount_start",
    "startup.p11.route_first_commit",
    "startup.p12.splash_hide_requested",
    "startup.p13.splash_hide_completed",
    "startup.p14.route_interactive",
  ] as const;

  const nativeStartupMarkers = [
    "startup.n1.application_on_create_entry",
    "startup.n2.activity_on_create_entry",
    "startup.n3.activity_super_on_create_complete",
    "startup.n4.react_root_view_create_start",
    "startup.n5.native_first_frame_ready",
  ] as const;

  it("keeps canonical JS startup markers allowed by release perf logging", () => {
    const perfSource = source("src/shared/performance/release-perf.ts");

    for (const marker of jsStartupMarkers) {
      expect(perfSource).toContain(`"${marker}"`);
    }
  });

  it("emits canonical JS startup markers from the Android entry and root layout", () => {
    const entrySource = source("index.android.js");
    const rootLayoutSource = source("app/_layout.tsx");

    expect(entrySource).toContain("startup.p3.js_bundle_start");
    for (const marker of jsStartupMarkers.slice(1)) {
      expect(rootLayoutSource).toContain(marker);
    }
  });

  it("emits canonical Android Activity startup markers before JS handoff", () => {
    const mainActivitySource = source(
      "android/app/src/main/java/com/salaryhijacking/mobile/MainActivity.kt",
    );

    for (const marker of nativeStartupMarkers) {
      expect(mainActivitySource).toContain(marker);
    }
  });
});
