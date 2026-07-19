# Visual Diff Report

Generated: 2026-07-19 KST

## Current Evidence

- Canonical Stitch reference count: 17
- Current mobile UI evidence count: 33
- Responsive checks in latest capture summary: 120
- Widths in latest capture summary: 320, 360, 375, 390, 393, 412, 430, 768
- Horizontal overflow detected: 0
- Current evidence file: `release/evidence/mobile-ui/capture-summary.json`
- Comparison file: `release/evidence/mobile-ui/stitch-comparison.md`

## Coverage

| Area                          | Status  | Evidence                                                                     |
| ----------------------------- | ------- | ---------------------------------------------------------------------------- |
| 17 Stitch canonical screens   | PASS    | `release/evidence/mobile-ui/*.png`                                           |
| 33 mobile UI evidence screens | PASS    | `release/evidence/mobile-ui/01_splash.png` through `33_living_cost_form.png` |
| 10 modal inventory            | PARTIAL | Not yet exhaustively captured                                                |
| 8 common states               | PARTIAL | Shared components exist; visual matrix incomplete                            |
| 320-430 responsive matrix     | PASS    | `capture-summary.json`                                                       |
| 768 responsive matrix         | PASS    | `capture-summary.json`                                                       |
| Physical native rendering     | BLOCKED | No physical Android phone attached                                           |

## Known Intentional Differences

- Product-safe Korean copy can replace Stitch demo copy.
- Accessibility and ad-disclosure labels can add visible or assistive text.
- Runtime screens may render server/error/offline states not present in Stitch screenshots.
- External ad imagery is not fixed to production assets without rights verification.

## Next Required Visual Work

1. Add physical-device keyboard-open proof for Android.
2. Update this report with measured diff/SSIM values if a pixel comparator is introduced.
