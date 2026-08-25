-- 0023_notification_timezone_archive_constraints.sql
-- Phase 5 notification runtime closure: align live constraints with the
-- notification preference timezone contract and read/archive lifecycle.

BEGIN;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '180s';
SET LOCAL idle_in_transaction_session_timeout = '180s';
SET LOCAL timezone = 'Asia/Seoul';

ALTER TABLE public.user_settings
  DROP CONSTRAINT IF EXISTS chk_user_settings_timezone,
  ADD CONSTRAINT chk_user_settings_timezone
    CHECK (
      timezone = ANY (
        ARRAY[
          'Asia/Seoul'::text,
          'UTC'::text,
          'America/New_York'::text,
          'Asia/Tokyo'::text
        ]
      )
    );

COMMENT ON CONSTRAINT chk_user_settings_timezone ON public.user_settings
IS 'Phase 5 supported notification quiet-hours timezone set. Default remains Asia/Seoul; broader IANA support requires a future policy decision.';

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS chk_notifications_read_status,
  ADD CONSTRAINT chk_notifications_read_status
    CHECK (read_at IS NULL OR status IN ('READ', 'CANCELLED'));

COMMENT ON CONSTRAINT chk_notifications_read_status ON public.notifications
IS 'Read timestamp may be retained when a previously read notification is archived/cancelled.';

COMMIT;
