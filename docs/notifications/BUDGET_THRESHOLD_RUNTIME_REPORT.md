# Budget Threshold Runtime Report

BUDGET_THRESHOLD=PASS
BUDGET_THRESHOLD_DUPLICATES=0
CLIENT_NOTIFICATION_THRESHOLD_OVERRIDE=0
BUDGET_WARNING_COUNT=1
BUDGET_EXCEEDED_COUNT=1

The staging financial mutation producer evaluates budget threshold notifications from server-derived budget impact, not client-supplied threshold fields. Synthetic staging evidence verified pre-threshold no-event behavior, warning/exceeded creation, replay dedupe, and client threshold override resistance.

Evidence: `docs/notifications/PRODUCER_RUNTIME_EVIDENCE.json`.
