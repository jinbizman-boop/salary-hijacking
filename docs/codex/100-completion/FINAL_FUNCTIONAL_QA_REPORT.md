# Final Functional QA Report

This is an in-progress report, not a 100% completion claim.

## Verified In Automation

- Salary home Korean launch copy is covered by regression tests.
- Planned/completed daily budget labels are covered by regression tests.
- Variable expense add/save/remount persistence is covered by regression tests.
- Plan daily living amount, monthly total, add flow, and salary-home sync are covered by regression tests.
- Notifications screen is covered as an independent stack without bottom tab labels and with deep-link callback.
- Full mobile Jest suite passes after adding these tests.
- API tests pass.
- DB validation passes.
- Admin tests pass.
- Cloudflare Workers dry-run passes.

## Still Not Verified

- Current-HEAD physical Android cold start.
- Current-HEAD logcat fatal exception absence.
- Real native keyboard avoidance with Samsung keyboard.
- Current-HEAD APK install and app relaunch persistence.
- Production/staging live DB smoke with real credentials remains approval/secret-gated.
