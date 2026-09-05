export type ReleasePerfMarkerName =
  | "bootstrap.transition.visible"
  | "route.login.interactive"
  | "route.home.shell_interactive"
  | "interaction.login.submit.press"
  | "interaction.bottom_tab.press"
  | "interaction.quick_expense.press"
  | "interaction.plan_save.press";

type ReleasePerfFields = Readonly<Record<string, string | number | boolean>>;
const SAFE_FIELD_KEY = /^[a-z][a-z0-9_]{0,31}$/u;
const SAFE_FIELD_VALUE = /^[a-z0-9_.:/-]{0,80}$/iu;
const SENSITIVE_FIELD_KEY_PATTERN =
  /(?:email|password|token|secret|authorization|cookie|session|salary|payroll|income|expense|saving|amount|user|device|fcm|push)/iu;

export function markReleasePerf(
  marker: ReleasePerfMarkerName,
  fields: ReleasePerfFields = {},
): void {
  const logger = globalThis.console?.info;
  if (typeof logger !== "function") return;
  const timestampMs = Math.round(Date.now());
  const safeFields = Object.entries(fields)
    .filter(([key, value]) => {
      if (!SAFE_FIELD_KEY.test(key)) return false;
      if (SENSITIVE_FIELD_KEY_PATTERN.test(key)) return false;
      return SAFE_FIELD_VALUE.test(String(value));
    })
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(" ");
  logger(
    `[SH_RELEASE_PERF] marker=${marker} t=${timestampMs}${
      safeFields ? ` ${safeFields}` : ""
    }`,
  );
}

export function markReleaseInteractionPerf(
  marker: ReleasePerfMarkerName,
  event?: unknown,
): void {
  const nativeEvent =
    event !== null &&
    typeof event === "object" &&
    "nativeEvent" in event &&
    event.nativeEvent !== null &&
    typeof event.nativeEvent === "object"
      ? event.nativeEvent
      : null;
  const rawTimestamp =
    nativeEvent !== null && "timestamp" in nativeEvent
      ? Number(nativeEvent.timestamp)
      : Number.NaN;
  const nowEpochMs = Date.now();
  const nowMonotonicMs =
    typeof globalThis.performance?.now === "function"
      ? globalThis.performance.now()
      : null;
  const latencyMs =
    Number.isFinite(rawTimestamp) && rawTimestamp > 1_000_000_000_000
      ? nowEpochMs - rawTimestamp
      : Number.isFinite(rawTimestamp) &&
          nowMonotonicMs !== null &&
          Number.isFinite(nowMonotonicMs)
        ? nowMonotonicMs - rawTimestamp
        : null;
  const safeLatency =
    latencyMs !== null && Number.isFinite(latencyMs)
      ? Math.min(10_000, Math.max(0, Math.round(latencyMs)))
      : null;
  markReleasePerf(
    marker,
    safeLatency === null ? {} : { feedback_ms: safeLatency },
  );
}
