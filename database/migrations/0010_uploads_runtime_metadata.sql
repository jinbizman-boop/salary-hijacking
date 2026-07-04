-- database/migrations/0010_uploads_runtime_metadata.sql
-- Runtime upload metadata persistence for the mobile/API upload surface.
-- Keeps file bodies in R2/object storage while DB rows store only metadata,
-- ownership, scan state, checksum, and privacy-safe API lookup information.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
SET LOCAL idle_in_transaction_session_timeout = '120s';
SET LOCAL timezone = 'Asia/Seoul';

DO $$
BEGIN
  IF to_regclass('public.attachments') IS NULL THEN
    RAISE EXCEPTION '0010_uploads_runtime_metadata.sql requires public.attachments from 0003_growth_community_notifications.sql';
  END IF;
END;
$$;

ALTER TABLE public.attachments
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS upload_purpose text NOT NULL DEFAULT 'COMMUNITY_ATTACHMENT',
  ADD COLUMN IF NOT EXISTS upload_visibility text NOT NULL DEFAULT 'AUTHENTICATED',
  ADD COLUMN IF NOT EXISTS scan_status text NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS scan_reason text,
  ADD COLUMN IF NOT EXISTS scan_engine text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS computed_checksum_sha256 text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.attachments
  DROP CONSTRAINT IF EXISTS chk_attachments_owner_type,
  DROP CONSTRAINT IF EXISTS chk_attachments_mime_type,
  DROP CONSTRAINT IF EXISTS chk_attachments_file_size,
  DROP CONSTRAINT IF EXISTS chk_attachments_status,
  DROP CONSTRAINT IF EXISTS chk_attachments_deleted_status;

ALTER TABLE public.attachments
  ADD CONSTRAINT chk_attachments_owner_type
    CHECK (
      owner_type IN (
        'USER',
        'VARIABLE_EXPENSE',
        'COMMUNITY_POST',
        'COMMUNITY_COMMENT',
        'GROWTH_TASK',
        'NOTICE',
        'AD_CAMPAIGN',
        'SUPPORT_TICKET'
      )
    ),
  ADD CONSTRAINT chk_attachments_mime_type
    CHECK (
      mime_type IN (
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'application/pdf',
        'text/plain'
      )
    ),
  ADD CONSTRAINT chk_attachments_file_size
    CHECK (file_size > 0 AND file_size <= 20971520),
  ADD CONSTRAINT chk_attachments_status
    CHECK (
      status IN (
        'PREPARED',
        'UPLOADING',
        'UPLOADED',
        'SCANNING',
        'AVAILABLE',
        'ACTIVE',
        'HIDDEN',
        'DELETED',
        'QUARANTINED'
      )
    ),
  ADD CONSTRAINT chk_attachments_deleted_status
    CHECK (deleted_at IS NULL OR status = 'DELETED'),
  ADD CONSTRAINT chk_attachments_upload_purpose
    CHECK (
      upload_purpose IN (
        'PROFILE_IMAGE',
        'VARIABLE_EXPENSE_RECEIPT',
        'COMMUNITY_ATTACHMENT',
        'GROWTH_PROOF',
        'NOTICE_ATTACHMENT',
        'AD_CREATIVE',
        'SUPPORT_ATTACHMENT'
      )
    ),
  ADD CONSTRAINT chk_attachments_upload_visibility
    CHECK (upload_visibility IN ('PRIVATE', 'AUTHENTICATED', 'PUBLIC_READ')),
  ADD CONSTRAINT chk_attachments_scan_status
    CHECK (scan_status IN ('PENDING', 'PASSED', 'FAILED', 'SKIPPED')),
  ADD CONSTRAINT chk_attachments_file_name_length
    CHECK (file_name IS NULL OR char_length(trim(file_name)) BETWEEN 1 AND 255),
  ADD CONSTRAINT chk_attachments_computed_checksum
    CHECK (
      computed_checksum_sha256 IS NULL
      OR computed_checksum_sha256 ~ '^[a-f0-9]{64}$'
    );

CREATE UNIQUE INDEX IF NOT EXISTS uq_attachments_created_by_idempotency
  ON public.attachments (created_by, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_attachments_created_purpose_status
  ON public.attachments (created_by, upload_purpose, status, created_at DESC);

DROP TRIGGER IF EXISTS trg_attachments_set_updated_at ON public.attachments;
CREATE TRIGGER trg_attachments_set_updated_at
BEFORE UPDATE ON public.attachments
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.ensure_attachment_owner_exists()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  IF NEW.owner_type = 'USER' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.users u WHERE u.user_id = NEW.owner_id
    ) INTO v_exists;
  ELSIF NEW.owner_type = 'VARIABLE_EXPENSE' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.variable_expenses v
      WHERE v.variable_expense_id = NEW.owner_id
    ) INTO v_exists;
  ELSIF NEW.owner_type = 'COMMUNITY_POST' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.community_posts p WHERE p.post_id = NEW.owner_id
    ) INTO v_exists;
  ELSIF NEW.owner_type = 'COMMUNITY_COMMENT' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.community_comments c WHERE c.comment_id = NEW.owner_id
    ) INTO v_exists;
  ELSIF NEW.owner_type = 'GROWTH_TASK' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.growth_tasks g WHERE g.growth_task_id = NEW.owner_id
    ) INTO v_exists;
  ELSIF NEW.owner_type = 'NOTICE' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.notices n WHERE n.notice_id = NEW.owner_id
    ) INTO v_exists;
  ELSIF NEW.owner_type = 'AD_CAMPAIGN' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.ad_campaigns a WHERE a.campaign_id = NEW.owner_id
    ) INTO v_exists;
  ELSIF NEW.owner_type = 'SUPPORT_TICKET' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_support_tickets t WHERE t.ticket_id = NEW.owner_id
    ) INTO v_exists;
  ELSE
    v_exists := false;
  END IF;

  IF NOT v_exists THEN
    RAISE EXCEPTION 'attachment owner %.% does not exist', NEW.owner_type, NEW.owner_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_read_attachment(
  p_owner_type text,
  p_owner_id uuid,
  p_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN ('ACTIVE', 'HIDDEN', 'AVAILABLE') AND NOT public.current_app_is_admin() THEN
    RETURN false;
  END IF;

  IF p_owner_type = 'USER' THEN
    RETURN p_owner_id = public.current_app_user_id();
  END IF;

  IF p_owner_type = 'COMMUNITY_POST' THEN
    RETURN public.can_read_community_post(p_owner_id);
  END IF;

  IF p_owner_type = 'COMMUNITY_COMMENT' THEN
    RETURN public.can_read_community_comment(p_owner_id);
  END IF;

  RETURN public.current_app_is_admin();
END;
$$;

COMMIT;
