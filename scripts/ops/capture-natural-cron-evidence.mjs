import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUT = "docs/notifications/NATURAL_CRON_OBSERVATION_TEMPLATE.json";
const evidence = {
  status: "PENDING_NATURAL_CRON_OBSERVATION",
  instruction: "Run after a natural Cloudflare scheduled trigger and fill only run metadata, never payload or secrets.",
  requiredFields: ["scheduledTimestamp", "executionTimestamp", "jobType", "eventCount", "duplicateCount", "exceptionCount", "correlationId"],
  productionMutation: false,
  secretOutputAllowed: false
};

mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(evidence, null, 2) + "\n");
console.log(JSON.stringify({ written: OUT, status: evidence.status }));
