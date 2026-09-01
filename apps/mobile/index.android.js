import "react-native-gesture-handler";
const salaryHijackingStartupMono =
  typeof globalThis.performance?.now === "function"
    ? Math.round(globalThis.performance.now())
    : null;
globalThis.console?.info?.(
  `[SH_RELEASE_PERF] marker=startup.p3.js_bundle_start t=${Math.round(
    Date.now(),
  )}${
    salaryHijackingStartupMono === null
      ? ""
      : ` mono_ms=${salaryHijackingStartupMono}`
  } route=bootstrap`,
);
import "expo-router/entry";
