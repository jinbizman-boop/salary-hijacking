-- 0022_notification_runtime_contract.sql
-- Phase 5 notification runtime closure: preference quiet-hours persistence,
-- notification event dedupe, and delivery retry terminal metadata.

BEGIN;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '180s';
SET LOCAL idle_in_transaction_session_timeout = '180s';
SET LOCAL timezone = 'Asia/Seoul';

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS notification_in_app_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_email_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_quiet_hours_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_quiet_hours_start time NOT NULL DEFAULT time '22:00',
  ADD COLUMN IF NOT EXISTS notification_quiet_hours_end time NOT NULL DEFAULT time '08:00';

ALTER TABLE public.user_settings
  DROP CONSTRAINT IF EXISTS chk_user_settings_notification_quiet_hours_start,
  ADD CONSTRAINT chk_user_settings_notification_quiet_hours_start
    CHECK (notification_quiet_hours_start >= time '00:00' AND notification_quiet_hours_start < time '24:00'),
  DROP CONSTRAINT IF EXISTS chk_user_settings_notification_quiet_hours_end,
  ADD CONSTRAINT chk_user_settings_notification_quiet_hours_end
    CHECK (notification_quiet_hours_end >= time '00:00' AND notification_quiet_hours_end < time '24:00');

COMMENT ON COLUMN public.user_settings.notification_in_app_enabled
IS 'Phase 5 canonical in-app notification preference. Stored per user; no shared/global preference leakage.';

COMMENT ON COLUMN public.user_settings.notification_email_enabled
IS 'Phase 5 canonical email notification channel preference. External email delivery remains a separate provider track.';

COMMENT ON COLUMN public.user_settings.notification_quiet_hours_enabled
IS 'Phase 5 user-timezone aware quiet-hours switch evaluated before push delivery.';

COMMENT ON COLUMN public.user_settings.notification_quiet_hours_start
IS 'Quiet-hours local start time in the user_settings.timezone business timezone.';

COMMENT ON COLUMN public.user_settings.notification_quiet_hours_end
IS 'Quiet-hours local end time in the user_settings.timezone business timezone.';

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS dedupe_key text,
  ADD COLUMN IF NOT EXISTS dedupe_request_hash char(64);

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS chk_notifications_dedupe_key_length,
  ADD CONSTRAINT chk_notifications_dedupe_key_length
    CHECK (dedupe_key IS NULL OR char_length(trim(dedupe_key)) BETWEEN 8 AND 220),
  DROP CONSTRAINT IF EXISTS chk_notifications_dedupe_request_hash,
  ADD CONSTRAINT chk_notifications_dedupe_request_hash
    CHECK (
      dedupe_request_hash IS NULL
      OR dedupe_request_hash ~ '^[0-9a-f]{64}$'
    );

CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_user_dedupe_active
  ON public.notifications (user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL AND status <> 'CANCELLED';

COMMENT ON COLUMN public.notifications.dedupe_key
IS 'Phase 5 notification event idempotency key, scoped by user_id. Examples: user+cycle+reminderType, user+budget+threshold+period.';

COMMENT ON COLUMN public.notifications.dedupe_request_hash
IS 'SHA-256 fingerprint of sanitized notification create request. Same dedupe key with different body is rejected without storing raw payloads.';

ALTER TABLE public.notification_deliveries
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS terminal_reason text;

ALTER TABLE public.notification_deliveries
  DROP CONSTRAINT IF EXISTS chk_notification_deliveries_idempotency_key_length,
  ADD CONSTRAINT chk_notification_deliveries_idempotency_key_length
    CHECK (idempotency_key IS NULL OR char_length(trim(idempotency_key)) BETWEEN 8 AND 220),
  DROP CONSTRAINT IF EXISTS chk_notification_deliveries_terminal_reason_length,
  ADD CONSTRAINT chk_notification_deliveries_terminal_reason_length
    CHECK (terminal_reason IS NULL OR char_length(terminal_reason) <= 160);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_deliveries_idempotency
  ON public.notification_deliveries (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_next_attempt
  ON public.notification_deliveries (status, next_attempt_at)
  WHERE status IN ('PENDING', 'ATTEMPTED', 'FAILED') AND next_attempt_at IS NOT NULL;

COMMENT ON COLUMN public.notification_deliveries.idempotency_key
IS 'Phase 5 delivery idempotency key used by retry/queue consumers to prevent duplicate provider sends.';

COMMENT ON COLUMN public.notification_deliveries.next_attempt_at
IS 'Next retry time for retryable delivery failures. Terminal failures must not be retried endlessly.';

COMMENT ON COLUMN public.notification_deliveries.terminal_reason
IS 'Terminal/DLQ-equivalent reason for poison, permanent provider failure, or max-attempt exhaustion.';

COMMIT;
