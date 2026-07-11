-- database/migrations/0012_growth_content_items.sql
-- LV UP curated content definitions and per-user content progress.

BEGIN;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '180s';
SET LOCAL idle_in_transaction_session_timeout = '180s';
SET LOCAL timezone = 'Asia/Seoul';

DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE EXCEPTION '0012_growth_content_items.sql requires public.users';
  END IF;

  IF to_regclass('public.user_growth_stats') IS NULL THEN
    RAISE EXCEPTION '0012_growth_content_items.sql requires public.user_growth_stats';
  END IF;

  IF to_regprocedure('public.set_updated_at()') IS NULL THEN
    RAISE EXCEPTION '0012_growth_content_items.sql requires public.set_updated_at()';
  END IF;

  IF to_regprocedure('public.current_app_user_id()') IS NULL THEN
    RAISE EXCEPTION '0012_growth_content_items.sql requires public.current_app_user_id()';
  END IF;

  IF to_regprocedure('public.current_app_is_admin()') IS NULL THEN
    RAISE EXCEPTION '0012_growth_content_items.sql requires public.current_app_is_admin()';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.growth_content_items (
  content_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL,
  title text NOT NULL,
  subtitle text,
  category text NOT NULL DEFAULT 'OTHER',
  difficulty text NOT NULL DEFAULT 'NORMAL',
  estimated_minutes integer NOT NULL DEFAULT 5,
  topics text[] NOT NULL DEFAULT ARRAY[]::text[],
  summary text NOT NULL,
  mission_prompt text NOT NULL,
  record_question text NOT NULL,
  source_title text NOT NULL,
  source_author text,
  source_name text,
  source_url text NOT NULL,
  license_type text NOT NULL,
  safety_level text NOT NULL DEFAULT 'GENERAL',
  viewpoint_tag text,
  exp_reward integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'DRAFT',
  review_required boolean NOT NULL DEFAULT true,
  full_text_stored boolean NOT NULL DEFAULT false,
  ad_targeting_separated boolean NOT NULL DEFAULT true,
  recommendation_uses_sensitive_financial_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_growth_content_items_type
    CHECK (content_type IN ('READING', 'NEWS', 'ENGLISH', 'HEALTH')),
  CONSTRAINT chk_growth_content_items_difficulty
    CHECK (difficulty IN ('EASY', 'NORMAL', 'HARD', 'EXTREME')),
  CONSTRAINT chk_growth_content_items_minutes
    CHECK (estimated_minutes BETWEEN 1 AND 240),
  CONSTRAINT chk_growth_content_items_summary_length
    CHECK (char_length(trim(summary)) BETWEEN 20 AND 900),
  CONSTRAINT chk_growth_content_items_source_url
    CHECK (source_url ~ '^https://[^[:space:]]+$'),
  CONSTRAINT chk_growth_content_items_exp
    CHECK (exp_reward >= 0),
  CONSTRAINT chk_growth_content_items_status
    CHECK (status IN ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED')),
  CONSTRAINT chk_growth_content_items_publish_ready
    CHECK (
      status <> 'PUBLISHED'
      OR (
        published_at IS NOT NULL
        AND full_text_stored = false
        AND ad_targeting_separated = true
        AND recommendation_uses_sensitive_financial_data = false
      )
    ),
  CONSTRAINT chk_growth_content_items_viewpoint
    CHECK (
      viewpoint_tag IS NULL
      OR viewpoint_tag IN (
        'FACT_BRIEF',
        'MARKET_BUSINESS',
        'LABOR_WELFARE',
        'POLICY_CENTER',
        'TECH_INDUSTRY'
      )
    )
);

COMMENT ON TABLE public.growth_content_items
IS 'Server-authoritative LV UP curated content definitions. Full book/article text is forbidden.';

CREATE INDEX IF NOT EXISTS idx_growth_content_items_published_type
  ON public.growth_content_items (content_type, published_at DESC, created_at DESC)
  WHERE status = 'PUBLISHED';

DROP TRIGGER IF EXISTS trg_growth_content_items_set_updated_at ON public.growth_content_items;
CREATE TRIGGER trg_growth_content_items_set_updated_at
BEFORE UPDATE ON public.growth_content_items
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.user_level_content_progress (
  progress_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  content_id uuid NOT NULL REFERENCES public.growth_content_items(content_id) ON DELETE RESTRICT,
  completion_date date NOT NULL,
  record_text text NOT NULL,
  earned_exp integer NOT NULL DEFAULT 0,
  idempotency_key text,
  status text NOT NULL DEFAULT 'COMPLETED',
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_user_level_content_progress_record
    CHECK (char_length(trim(record_text)) BETWEEN 1 AND 2000),
  CONSTRAINT chk_user_level_content_progress_exp
    CHECK (earned_exp >= 0),
  CONSTRAINT chk_user_level_content_progress_status
    CHECK (status IN ('COMPLETED', 'REVOKED'))
);

COMMENT ON TABLE public.user_level_content_progress
IS 'Per-user LV UP content completion records. XP is awarded by the server from published content metadata.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_level_content_progress_user_content_date_completed
  ON public.user_level_content_progress (user_id, content_id, completion_date)
  WHERE status = 'COMPLETED';

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_level_content_progress_user_idempotency
  ON public.user_level_content_progress (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_level_content_progress_user_completed
  ON public.user_level_content_progress (user_id, completed_at DESC);

DROP TRIGGER IF EXISTS trg_user_level_content_progress_set_updated_at ON public.user_level_content_progress;
CREATE TRIGGER trg_user_level_content_progress_set_updated_at
BEFORE UPDATE ON public.user_level_content_progress
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.growth_content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_level_content_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS growth_content_items_published_select ON public.growth_content_items;
CREATE POLICY growth_content_items_published_select
ON public.growth_content_items
FOR SELECT
USING (status = 'PUBLISHED' OR public.current_app_is_admin());

DROP POLICY IF EXISTS growth_content_items_admin_all ON public.growth_content_items;
CREATE POLICY growth_content_items_admin_all
ON public.growth_content_items
FOR ALL
USING (public.current_app_is_admin())
WITH CHECK (public.current_app_is_admin());

DROP POLICY IF EXISTS user_level_content_progress_owner_select ON public.user_level_content_progress;
CREATE POLICY user_level_content_progress_owner_select
ON public.user_level_content_progress
FOR SELECT
USING (user_id = public.current_app_user_id());

DROP POLICY IF EXISTS user_level_content_progress_owner_insert ON public.user_level_content_progress;
CREATE POLICY user_level_content_progress_owner_insert
ON public.user_level_content_progress
FOR INSERT
WITH CHECK (user_id = public.current_app_user_id());

DROP POLICY IF EXISTS user_level_content_progress_admin_all ON public.user_level_content_progress;
CREATE POLICY user_level_content_progress_admin_all
ON public.user_level_content_progress
FOR ALL
USING (public.current_app_is_admin())
WITH CHECK (public.current_app_is_admin());

COMMIT;
