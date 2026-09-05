-- database/migrations/0024_notification_archive_terminal_constraints.sql
-- Phase 5 notification runtime closure: allow user archive/delete lifecycle
-- transitions for notifications that were already sent or delivered.

BEGIN;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '180s';
SET LOCAL idle_in_transaction_session_timeout = '180s';
SET LOCAL timezone = 'Asia/Seoul';

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS read_status text NOT NULL DEFAULT 'UNREAD',
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

UPDATE public.notifications
SET read_status = CASE
  WHEN status = 'READ' OR read_at IS NOT NULL THEN 'READ'
  ELSE 'UNREAD'
END
WHERE read_status = 'UNREAD'
  AND (status = 'READ' OR read_at IS NOT NULL);

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS chk_notifications_status,
  ADD CONSTRAINT chk_notifications_status
    CHECK (
      status IN (
        'SCHEDULED',
        'SENT',
        'DELIVERED',
        'READ',
        'FAILED',
        'CANCELLED',
        'EXPIRED',
        'DELETED'
      )
    ),
  DROP CONSTRAINT IF EXISTS chk_notifications_sent_status,
  DROP CONSTRAINT IF EXISTS notifications_sent_status_consistency,
  ADD CONSTRAINT notifications_sent_status_consistency
    CHECK (
      sent_at IS NULL
      OR status IN ('SENT', 'DELIVERED', 'READ', 'CANCELLED', 'DELETED')
    ),
  DROP CONSTRAINT IF EXISTS chk_notifications_delivery_status,
  DROP CONSTRAINT IF EXISTS notifications_delivered_status_consistency,
  ADD CONSTRAINT notifications_delivered_status_consistency
    CHECK (
      delivered_at IS NULL
      OR status IN ('DELIVERED', 'READ', 'CANCELLED', 'DELETED')
    ),
  DROP CONSTRAINT IF EXISTS chk_notifications_read_status,
  DROP CONSTRAINT IF EXISTS notifications_read_status_consistency,
  ADD CONSTRAINT notifications_read_status_consistency
    CHECK (
      read_at IS NULL
      OR (
        read_status = 'READ'
        AND status IN ('READ', 'DELIVERED', 'SENT', 'CANCELLED')
      )
      OR (read_status = 'DELETED' AND status = 'DELETED')
    );

COMMENT ON CONSTRAINT notifications_sent_status_consistency ON public.notifications
IS 'A sent notification may later be read, archived/cancelled, or deleted without erasing delivery lineage.';

COMMENT ON CONSTRAINT notifications_delivered_status_consistency ON public.notifications
IS 'A delivered notification may later be read, archived/cancelled, or deleted without erasing delivery lineage.';

COMMENT ON CONSTRAINT notifications_read_status_consistency ON public.notifications
IS 'A read notification may be archived/cancelled while preserving read_at; deleted notifications use read_status=DELETED.';

COMMIT;
