import { z } from "zod";

export const ANALYTICS_CONTRACT_VERSION = "1.0.0" as const;

export const AnalyticsEventNameSchema = z.enum([
  "screen_view",
  "signup_completed",
  "login_completed",
  "payroll_setup_completed",
  "plan_saved",
  "daily_budget_viewed",
  "expense_created",
  "saving_created",
  "mission_completed",
  "community_post_created",
  "ad_impression",
  "ad_click",
  "partner_inquiry_started",
  "partner_inquiry_submitted",
  "support_request_started",
  "support_request_submitted",
  "experiment_exposed",
  "data_quality_violation",
]);

export const AnalyticsSourceSchema = z.enum([
  "web",
  "mobile",
  "admin",
  "api",
  "scheduler",
  "notifications",
]);

export const AnalyticsIdentifierPolicySchema = z.enum([
  "anonymous_or_pseudonymous",
  "authenticated_pseudonymous",
  "aggregate_only",
]);

export const AnalyticsConsentClassSchema = z.enum([
  "essential_operational",
  "product_analytics",
  "advertising_or_personalized",
]);

const prohibitedParameterNames = new Set([
  "salary",
  "income",
  "expense_amount",
  "saving_amount",
  "budget_amount",
  "hijacked_amount",
  "hijack_amount",
  "debt",
  "email",
  "phone",
  "name",
  "access_token",
  "refresh_token",
  "push_token",
  "oauth_token",
  "comment_body",
  "post_body",
  "message",
  "free_text",
]);

const freeTextParameterNames = new Set([
  "comment",
  "comment_body",
  "post",
  "post_body",
  "message",
  "description",
  "memo",
  "note",
  "free_text",
]);

const tokenLikePattern =
  /(eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{8,}|sk-[A-Za-z0-9_-]{20,}|refresh[_-]?token|access[_-]?token|oauth[_-]?token)/i;
const emailLikePattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

const isAllowedParameterValue = (value: unknown): boolean => {
  if (value === null) return true;
  if (typeof value === "string") {
    if (value.length > 120) return false;
    if (tokenLikePattern.test(value)) return false;
    if (emailLikePattern.test(value)) return false;
    return true;
  }
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isInteger(value) && value >= 0 && value <= 100;
  return false;
};

const AnalyticsParametersSchema = z
  .record(z.string().regex(/^[a-z][a-z0-9_]{1,63}$/), z.unknown())
  .superRefine((parameters, ctx) => {
    for (const [name, value] of Object.entries(parameters)) {
      if (prohibitedParameterNames.has(name) || freeTextParameterNames.has(name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `analytics parameter is prohibited: ${name}`,
          path: [name],
        });
        continue;
      }

      if (!isAllowedParameterValue(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `analytics parameter value is not privacy-safe: ${name}`,
          path: [name],
        });
      }
    }
  });

export const AnalyticsEventSchema = z
  .object({
    eventId: z.string().trim().min(12).max(80).regex(/^[a-zA-Z0-9_-]+$/),
    eventName: AnalyticsEventNameSchema,
    eventVersion: z.number().int().min(1).max(99),
    occurredAt: z.string().datetime({ offset: true }),
    source: AnalyticsSourceSchema,
    identifierPolicy: AnalyticsIdentifierPolicySchema,
    consentClass: AnalyticsConsentClassSchema,
    parameters: AnalyticsParametersSchema.default({}),
  })
  .strict();

export const AnalyticsPrivacyParameterSchema = z
  .object({
    event: AnalyticsEventNameSchema,
    version: z.number().int().min(1).max(99),
    parameter: z.string().trim().min(2).max(64).regex(/^[a-z][a-z0-9_]*$/),
    classification: z.enum([
      "non_sensitive_operational",
      "aggregate",
      "bucketed_financial",
      "pii",
      "raw_financial",
      "token_or_secret",
      "free_text",
    ]),
    allowed: z.boolean(),
    reason: z.string().trim().min(8).max(260),
  })
  .strict()
  .superRefine((row, ctx) => {
    if (
      row.allowed &&
      ["pii", "raw_financial", "token_or_secret", "free_text"].includes(row.classification)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "prohibited analytics classification cannot be allowed",
        path: ["allowed"],
      });
    }
  });

export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;
export type AnalyticsPrivacyParameter = z.infer<
  typeof AnalyticsPrivacyParameterSchema
>;

export type AnalyticsBatchValidationIssue = Readonly<{
  code: "ANALYTICS_DUPLICATE_EVENT" | "ANALYTICS_INVALID_EVENT";
  eventId?: string;
  message: string;
}>;

export type AnalyticsBatchValidationResult = Readonly<{
  ok: boolean;
  eventCount: number;
  duplicateCount: number;
  issues: ReadonlyArray<AnalyticsBatchValidationIssue>;
}>;

export const createAnalyticsDedupeKey = (event: AnalyticsEvent): string =>
  `${event.eventId}:${event.eventName}:${event.eventVersion}`;

export const validateAnalyticsEventBatch = (
  events: ReadonlyArray<unknown>,
): AnalyticsBatchValidationResult => {
  const seen = new Set<string>();
  const issues: AnalyticsBatchValidationIssue[] = [];
  let duplicateCount = 0;

  for (const candidate of events) {
    const parsed = AnalyticsEventSchema.safeParse(candidate);
    if (!parsed.success) {
      issues.push({
        code: "ANALYTICS_INVALID_EVENT",
        message: parsed.error.issues.map((issue) => issue.message).join("; "),
      });
      continue;
    }

    const key = createAnalyticsDedupeKey(parsed.data);
    if (seen.has(key)) {
      duplicateCount += 1;
      issues.push({
        code: "ANALYTICS_DUPLICATE_EVENT",
        eventId: parsed.data.eventId,
        message: `duplicate analytics event identity: ${key}`,
      });
      continue;
    }
    seen.add(key);
  }

  return {
    ok: issues.length === 0,
    eventCount: events.length,
    duplicateCount,
    issues,
  };
};

export const AnalyticsSchemas = Object.freeze({
  event: AnalyticsEventSchema,
  eventName: AnalyticsEventNameSchema,
  source: AnalyticsSourceSchema,
  identifierPolicy: AnalyticsIdentifierPolicySchema,
  consentClass: AnalyticsConsentClassSchema,
  privacyParameter: AnalyticsPrivacyParameterSchema,
});
