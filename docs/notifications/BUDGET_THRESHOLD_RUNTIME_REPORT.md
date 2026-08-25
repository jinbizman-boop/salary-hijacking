# Budget Threshold Runtime Report

BUDGET_THRESHOLD=PARTIAL_PRODUCER_RUNTIME_PENDING
BUDGET_THRESHOLD_DUPE_PREVIEW=PASS
CLIENT_NOTIFICATION_THRESHOLD_OVERRIDE=0_FOR_RULE_PREVIEW_CONTRACT

The staging notification rules preview evaluates budget threshold candidates server-side and does not accept client-supplied notification finality as authority. Full financial mutation -> notification producer runtime, including threshold crossing, re-entry, and duplicate suppression, was not proven in this closure.
