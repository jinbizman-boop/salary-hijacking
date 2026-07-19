# Visual Diff Report

Generated: 2026-07-19 KST

## Current Evidence

- Canonical Stitch reference count: 17
- Current mobile UI evidence count: 17
- Responsive checks in latest capture summary: 105
- Widths in latest capture summary: 320, 360, 375, 390, 393, 412, 430
- Horizontal overflow detected: 0
- Current evidence file: `release/evidence/mobile-ui/capture-summary.json`
- Comparison file: `release/evidence/mobile-ui/stitch-comparison.md`

## Coverage

| Area                        | Status  | Evidence                                          |
| --------------------------- | ------- | ------------------------------------------------- |
| 17 Stitch canonical screens | PASS    | `release/evidence/mobile-ui/*.png`                |
| 30 official product screens | PARTIAL | `docs/ui/SCREEN_CATALOG.csv`                      |
| 10 modal inventory          | PARTIAL | Not yet exhaustively captured                     |
| 8 common states             | PARTIAL | Shared components exist; visual matrix incomplete |
| 320-430 responsive matrix   | PASS    | `capture-summary.json`                            |
| 768 responsive matrix       | PARTIAL | Not in current capture summary                    |
| Physical native rendering   | BLOCKED | No physical Android phone attached                |

## Known Intentional Differences

- Product-safe Korean copy can replace Stitch demo copy.
- Accessibility and ad-disclosure labels can add visible or assistive text.
- Runtime screens may render server/error/offline states not present in Stitch screenshots.
- External ad imagery is not fixed to production assets without rights verification.

## Next Required Visual Work

1. Add capture targets for detail/profile/legal/support/common state screens not represented in the current 17 image evidence set.
2. Add 768px capture to satisfy the objective matrix.
3. Add a visual assertion for keyboard-open form state or produce device proof.
4. Update this report with measured diff/SSIM values if a pixel comparator is introduced.
