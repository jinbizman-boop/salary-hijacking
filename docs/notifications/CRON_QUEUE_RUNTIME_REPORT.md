# Cron and Queue Runtime Report

CRON_CONFIG=PASS
QUEUE_RUNTIME=PASS_INTERNAL_DEPLOYED
QUEUE_RETRY=PASS_INTERNAL
QUEUE_TERMINAL_DLQ=PASS_INTERNAL
POISON_MESSAGE_HANDLING=PASS
CRON_NATURAL_EXECUTION=EXTERNAL_TIME_WINDOW_BLOCKER

Staging deployments:
- API worker deployed to staging custom domain.
- Notifications worker deployed with retry and operations queue consumers.
- Scheduler worker deployed with `0 23 * * *` staging cron and notification queue producer binding.

Natural scheduled execution was not observed in the available execution window, so it is not marked PASS.
