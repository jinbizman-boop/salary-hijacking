import fs from "node:fs";

const files = [
  "src/components/CommunityPostCard.tsx",
  "src/components/DailyBudgetCard.tsx",
  "src/components/ExpenseListItem.tsx",
  "src/components/NotificationRow.tsx",
  "src/components/SalaryStatusCard.tsx",
  "src/tokens/colors.ts",
  "src/tokens/spacing.ts",
  "src/tokens/typography.ts",
];

const bannedText = [
  "declare global",
  "namespace JSX",
  "dangerouslySetInnerHTML:",
];
const bannedPatterns = [
  /from\s+["']react["']/,
  /from\s+["']react\/jsx-runtime["']/,
];

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const textHits = bannedText.filter((term) => text.includes(term));
  const patternHits = bannedPatterns
    .filter((pattern) => pattern.test(text))
    .map(String);
  const hits = [...textHits, ...patternHits];

  if (hits.length > 0) {
    console.error(
      `${file} contains banned runtime/policy terms: ${hits.join(", ")}`,
    );
    process.exit(1);
  }
}
