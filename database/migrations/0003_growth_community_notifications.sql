-- database/migrations/0003_growth_community_notifications.sql
-- 급여납치 알림·LV UP·커뮤니티·글쓰기·신고·첨부 최종 마이그레이션
-- 기준 DB: Neon PostgreSQL / PostgreSQL
-- 기준 시간대: Asia/Seoul
-- 선행 마이그레이션:
--   0001_init_users.sql
--   0002_payroll_budget_expense.sql
-- 설계 원칙:
--   1. 알림은 본문과 기기별 발송 이력을 분리한다.
--   2. 푸시 토큰 원문은 저장하지 않고 user_devices.push_token_hash만 참조한다.
--   3. LV UP은 독서·뉴스·영어·건강 미션 완료 이력과 사용자 성장 통계를 분리한다.
--   4. 커뮤니티는 게시글·댓글·반응·신고·첨부를 분리하고 익명/질문/모더레이션 상태를 지원한다.
--   5. 게시글/댓글 삭제는 원칙적으로 soft delete와 본문 마스킹을 우선한다.
--   6. 신고·첨부·모더레이션 데이터는 관리자 RBAC와 감사로그 연계를 전제로 한다.
--   7. 모든 사용자 소유 데이터는 user_id 기반 RLS와 서버 API 소유권 검증을 전제로 한다.
--   8. 재무 원천 데이터는 커뮤니티/알림 본문/첨부/로그에 원문 저장하지 않는다.

BEGIN;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '180s';
SET LOCAL idle_in_transaction_session_timeout = '180s';
SET LOCAL timezone = 'Asia/Seoul';

-- -----------------------------------------------------------------------------
-- 선행 마이그레이션 계약 검증
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE EXCEPTION '0003_growth_community_notifications.sql requires public.users from 0001_init_users.sql';
  END IF;

  IF to_regclass('public.user_devices') IS NULL THEN
    RAISE EXCEPTION '0003_growth_community_notifications.sql requires public.user_devices from 0001_init_users.sql';
  END IF;

  IF to_regprocedure('public.set_updated_at()') IS NULL THEN
    RAISE EXCEPTION '0003_growth_community_notifications.sql requires public.set_updated_at() from 0001_init_users.sql';
  END IF;

  IF to_regprocedure('public.current_app_user_id()') IS NULL THEN
    RAISE EXCEPTION '0003_growth_community_notifications.sql requires public.current_app_user_id() from 0001_init_users.sql';
  END IF;

  IF to_regprocedure('public.current_app_is_admin()') IS NULL THEN
    RAISE EXCEPTION '0003_growth_community_notifications.sql requires public.current_app_is_admin() from 0001_init_users.sql';
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- notifications
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.notifications (
  notification_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,

  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,

  target_screen text,
  target_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,

  status text NOT NULL DEFAULT 'SCHEDULED',
  priority smallint NOT NULL DEFAULT 5,

  scheduled_at timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  cancelled_at timestamptz,
  expires_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_notifications_type
    CHECK (
      type IN (
        'PAYDAY',
        'FIXED_PAYMENT_DUE',
        'SAVINGS_DUE',
        'BUDGET_OVER',
        'BUDGET_REMAINING',
        'HIJACK_GOAL',
        'GROWTH_TASK',
        'GROWTH_LEVEL_UP',
        'COMMUNITY_COMMENT',
        'COMMUNITY_REACTION',
        'COMMUNITY_REPORT_RESULT',
        'NOTICE',
        'SECURITY',
        'SYSTEM'
      )
    ),

  CONSTRAINT chk_notifications_title_length
    CHECK (char_length(trim(title)) BETWEEN 1 AND 120),

  CONSTRAINT chk_notifications_body_length
    CHECK (char_length(trim(body)) BETWEEN 1 AND 1000),

  CONSTRAINT chk_notifications_target_screen
    CHECK (
      target_screen IS NULL
      OR target_screen IN (
        'HOME',
        'PLAN',
        'DAILY_BUDGET',
        'FIXED_EXPENSE',
        'SAVINGS',
        'VARIABLE_EXPENSE',
        'NOTIFICATIONS',
        'LEVEL_UP',
        'COMMUNITY',
        'POST_DETAIL',
        'WRITE',
        'MY_PAGE',
        'NOTICE_DETAIL',
        'SECURITY_CENTER'
      )
    ),

  CONSTRAINT chk_notifications_status
    CHECK (status IN ('SCHEDULED', 'SENT', 'READ', 'FAILED', 'CANCELLED', 'EXPIRED')),

  CONSTRAINT chk_notifications_priority
    CHECK (priority BETWEEN 1 AND 9),

  CONSTRAINT chk_notifications_sent_status
    CHECK (sent_at IS NULL OR status IN ('SENT', 'READ')),

  CONSTRAINT chk_notifications_read_status
    CHECK (read_at IS NULL OR status = 'READ'),

  CONSTRAINT chk_notifications_cancelled_status
    CHECK (cancelled_at IS NULL OR status = 'CANCELLED'),

  CONSTRAINT chk_notifications_expire_after_create
    CHECK (expires_at IS NULL OR expires_at >= created_at)
);

COMMENT ON TABLE public.notifications
IS '사용자 인앱/푸시 알림 본문. 결제 예정, 예산 초과, 목표 달성, LV UP, 커뮤니티 반응, 공지, 보안 알림을 포함한다.';

COMMENT ON COLUMN public.notifications.payload
IS '알림 부가 데이터. 급여·지출·저축·토큰·이메일·전화번호 원문 저장 금지.';

CREATE INDEX IF NOT EXISTS idx_notifications_user_status
  ON public.notifications (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created
  ON public.notifications (user_id, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_schedule
  ON public.notifications (status, scheduled_at ASC)
  WHERE status = 'SCHEDULED';

CREATE INDEX IF NOT EXISTS idx_notifications_expire
  ON public.notifications (expires_at ASC)
  WHERE expires_at IS NOT NULL AND status IN ('SCHEDULED', 'SENT');

DROP TRIGGER IF EXISTS trg_notifications_set_updated_at ON public.notifications;
CREATE TRIGGER trg_notifications_set_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- notification_deliveries
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  delivery_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(notification_id) ON DELETE CASCADE,
  device_id uuid REFERENCES public.user_devices(device_id) ON DELETE SET NULL,

  provider text NOT NULL DEFAULT 'EXPO',
  channel text NOT NULL DEFAULT 'PUSH',
  status text NOT NULL DEFAULT 'PENDING',
  provider_message_id text,
  failure_reason text,
  attempt_count integer NOT NULL DEFAULT 0,

  attempted_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_notification_deliveries_provider
    CHECK (provider IN ('EXPO', 'FCM', 'APNS', 'IN_APP', 'EMAIL', 'MOCK')),

  CONSTRAINT chk_notification_deliveries_channel
    CHECK (channel IN ('PUSH', 'IN_APP', 'EMAIL')),

  CONSTRAINT chk_notification_deliveries_status
    CHECK (status IN ('PENDING', 'ATTEMPTED', 'DELIVERED', 'FAILED', 'SKIPPED')),

  CONSTRAINT chk_notification_deliveries_attempt_count
    CHECK (attempt_count >= 0),

  CONSTRAINT chk_notification_deliveries_delivered_status
    CHECK (delivered_at IS NULL OR status = 'DELIVERED'),

  CONSTRAINT chk_notification_deliveries_failed_status
    CHECK (failed_at IS NULL OR status = 'FAILED'),

  CONSTRAINT chk_notification_deliveries_failure_length
    CHECK (failure_reason IS NULL OR char_length(failure_reason) <= 500)
);

COMMENT ON TABLE public.notification_deliveries
IS '알림의 기기/채널별 발송 이력. 실패 재시도, provider 응답 추적, 푸시 원문 토큰 비저장 원칙을 따른다.';

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_notification
  ON public.notification_deliveries (notification_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status
  ON public.notification_deliveries (status, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_device
  ON public.notification_deliveries (device_id, created_at DESC)
  WHERE device_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_notification_deliveries_set_updated_at ON public.notification_deliveries;
CREATE TRIGGER trg_notification_deliveries_set_updated_at
BEFORE UPDATE ON public.notification_deliveries
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- growth_tasks
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.growth_tasks (
  growth_task_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  type text NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  content_url text,
  exp_reward integer NOT NULL DEFAULT 0,

  active_from timestamptz NOT NULL DEFAULT now(),
  active_to timestamptz,
  status text NOT NULL DEFAULT 'ACTIVE',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_growth_tasks_type
    CHECK (type IN ('READING', 'NEWS', 'ENGLISH', 'HEALTH', 'QUIZ', 'ROUTINE')),

  CONSTRAINT chk_growth_tasks_category_length
    CHECK (char_length(trim(category)) BETWEEN 1 AND 80),

  CONSTRAINT chk_growth_tasks_title_length
    CHECK (char_length(trim(title)) BETWEEN 1 AND 160),

  CONSTRAINT chk_growth_tasks_description_length
    CHECK (char_length(trim(description)) BETWEEN 1 AND 2000),

  CONSTRAINT chk_growth_tasks_content_url_length
    CHECK (content_url IS NULL OR char_length(content_url) <= 2048),

  CONSTRAINT chk_growth_tasks_exp_reward
    CHECK (exp_reward >= 0 AND exp_reward <= 10000),

  CONSTRAINT chk_growth_tasks_active_period
    CHECK (active_to IS NULL OR active_to > active_from),

  CONSTRAINT chk_growth_tasks_status
    CHECK (status IN ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'))
);

COMMENT ON TABLE public.growth_tasks
IS 'LV UP 독서·뉴스·영어·건강·퀴즈·루틴 미션. 운영자가 생성하고 사용자가 완료한다.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_growth_tasks_type_title_active_from
  ON public.growth_tasks (type, title, active_from);

CREATE INDEX IF NOT EXISTS idx_growth_tasks_active
  ON public.growth_tasks (type, status, active_from, active_to);

CREATE INDEX IF NOT EXISTS idx_growth_tasks_category_status
  ON public.growth_tasks (category, status, active_from DESC);

DROP TRIGGER IF EXISTS trg_growth_tasks_set_updated_at ON public.growth_tasks;
CREATE TRIGGER trg_growth_tasks_set_updated_at
BEFORE UPDATE ON public.growth_tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- growth_task_completions
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.growth_task_completions (
  completion_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  growth_task_id uuid NOT NULL REFERENCES public.growth_tasks(growth_task_id) ON DELETE RESTRICT,

  completion_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Seoul')::date),
  earned_exp integer NOT NULL DEFAULT 0,
  proof_text text,
  status text NOT NULL DEFAULT 'COMPLETED',

  completed_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_growth_task_completions_exp
    CHECK (earned_exp >= 0 AND earned_exp <= 10000),

  CONSTRAINT chk_growth_task_completions_proof_length
    CHECK (proof_text IS NULL OR char_length(proof_text) <= 1000),

  CONSTRAINT chk_growth_task_completions_status
    CHECK (status IN ('COMPLETED', 'REVOKED', 'DELETED')),

  CONSTRAINT chk_growth_task_completions_revoked_status
    CHECK (revoked_at IS NULL OR status IN ('REVOKED', 'DELETED'))
);

COMMENT ON TABLE public.growth_task_completions
IS '사용자의 LV UP 미션 완료 이력. 완료 경험치와 증빙 메모를 저장하고 user_growth_stats를 서버 권위로 재계산한다.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_growth_completion_daily
  ON public.growth_task_completions (user_id, growth_task_id, completion_date)
  WHERE status = 'COMPLETED';

CREATE INDEX IF NOT EXISTS idx_growth_completion_user_date
  ON public.growth_task_completions (user_id, completion_date DESC);

CREATE INDEX IF NOT EXISTS idx_growth_completion_task_status
  ON public.growth_task_completions (growth_task_id, status, completed_at DESC);

DROP TRIGGER IF EXISTS trg_growth_task_completions_set_updated_at ON public.growth_task_completions;
CREATE TRIGGER trg_growth_task_completions_set_updated_at
BEFORE UPDATE ON public.growth_task_completions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- user_growth_stats
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_growth_stats (
  growth_stat_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,

  level integer NOT NULL DEFAULT 1,
  current_exp integer NOT NULL DEFAULT 0,
  total_exp integer NOT NULL DEFAULT 0,

  reading_score integer NOT NULL DEFAULT 0,
  news_score integer NOT NULL DEFAULT 0,
  english_score integer NOT NULL DEFAULT 0,
  health_score integer NOT NULL DEFAULT 0,
  quiz_score integer NOT NULL DEFAULT 0,
  routine_score integer NOT NULL DEFAULT 0,

  last_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_user_growth_stats_user UNIQUE (user_id),

  CONSTRAINT chk_user_growth_stats_non_negative
    CHECK (
      level >= 1
      AND current_exp >= 0
      AND total_exp >= 0
      AND reading_score >= 0
      AND news_score >= 0
      AND english_score >= 0
      AND health_score >= 0
      AND quiz_score >= 0
      AND routine_score >= 0
    )
);

COMMENT ON TABLE public.user_growth_stats
IS '사용자별 LV UP 레벨, 누적 경험치, 독서·뉴스·영어·건강·퀴즈·루틴 점수. 완료 이력에서 서버 권위로 재계산한다.';

CREATE INDEX IF NOT EXISTS idx_user_growth_stats_level_exp
  ON public.user_growth_stats (level DESC, total_exp DESC);

DROP TRIGGER IF EXISTS trg_user_growth_stats_set_updated_at ON public.user_growth_stats;
CREATE TRIGGER trg_user_growth_stats_set_updated_at
BEFORE UPDATE ON public.user_growth_stats
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- community_posts
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.community_posts (
  post_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,

  board_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,

  is_anonymous boolean NOT NULL DEFAULT false,
  is_question boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,

  view_count integer NOT NULL DEFAULT 0,
  like_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  share_count integer NOT NULL DEFAULT 0,
  report_count integer NOT NULL DEFAULT 0,

  status text NOT NULL DEFAULT 'PUBLISHED',
  moderation_reason text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  CONSTRAINT chk_community_posts_board_type
    CHECK (board_type IN ('ALL', 'FREE', 'LEVEL_UP_PROOF', 'HOBBY', 'QUESTION', 'MONEY_TIP', 'NOTICE_DISCUSSION')),

  CONSTRAINT chk_community_posts_title_length
    CHECK (char_length(trim(title)) BETWEEN 1 AND 120),

  CONSTRAINT chk_community_posts_body_length
    CHECK (char_length(trim(body)) BETWEEN 1 AND 10000),

  CONSTRAINT chk_community_posts_counts_non_negative
    CHECK (
      view_count >= 0
      AND like_count >= 0
      AND comment_count >= 0
      AND share_count >= 0
      AND report_count >= 0
    ),

  CONSTRAINT chk_community_posts_status
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'HIDDEN', 'LOCKED', 'DELETED')),

  CONSTRAINT chk_community_posts_deleted_status
    CHECK (deleted_at IS NULL OR status = 'DELETED'),

  CONSTRAINT chk_community_posts_moderation_reason_length
    CHECK (moderation_reason IS NULL OR char_length(moderation_reason) <= 1000)
);

COMMENT ON TABLE public.community_posts
IS '커뮤니티 게시글. 익명글, 질문글, 인기글, 모더레이션 상태, 좋아요/댓글/공유/신고 카운트를 관리한다.';

COMMENT ON COLUMN public.community_posts.is_anonymous
IS '익명글 여부. 화면 응답에서는 작성자 표시명을 제거해야 한다.';

CREATE INDEX IF NOT EXISTS idx_posts_board_status_created
  ON public.community_posts (board_type, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_popular
  ON public.community_posts (status, like_count DESC, comment_count DESC, view_count DESC);

CREATE INDEX IF NOT EXISTS idx_posts_user_created
  ON public.community_posts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_status_report
  ON public.community_posts (status, report_count DESC, updated_at DESC);

DROP TRIGGER IF EXISTS trg_community_posts_set_updated_at ON public.community_posts;
CREATE TRIGGER trg_community_posts_set_updated_at
BEFORE UPDATE ON public.community_posts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- community_comments
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.community_comments (
  comment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(post_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES public.community_comments(comment_id) ON DELETE CASCADE,

  body text NOT NULL,
  is_anonymous boolean NOT NULL DEFAULT false,

  like_count integer NOT NULL DEFAULT 0,
  report_count integer NOT NULL DEFAULT 0,

  status text NOT NULL DEFAULT 'ACTIVE',
  moderation_reason text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  CONSTRAINT chk_community_comments_body_length
    CHECK (char_length(trim(body)) BETWEEN 1 AND 5000),

  CONSTRAINT chk_community_comments_counts_non_negative
    CHECK (like_count >= 0 AND report_count >= 0),

  CONSTRAINT chk_community_comments_status
    CHECK (status IN ('ACTIVE', 'HIDDEN', 'DELETED')),

  CONSTRAINT chk_community_comments_deleted_status
    CHECK (deleted_at IS NULL OR status = 'DELETED'),

  CONSTRAINT chk_community_comments_moderation_reason_length
    CHECK (moderation_reason IS NULL OR char_length(moderation_reason) <= 1000)
);

COMMENT ON TABLE public.community_comments
IS '커뮤니티 댓글/대댓글. 대댓글은 parent_comment_id self reference로 처리하고, 삭제는 soft delete와 본문 마스킹을 우선한다.';

CREATE INDEX IF NOT EXISTS idx_comments_post_created
  ON public.community_comments (post_id, status, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_comments_user_created
  ON public.community_comments (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_parent
  ON public.community_comments (parent_comment_id, created_at ASC)
  WHERE parent_comment_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_community_comments_set_updated_at ON public.community_comments;
CREATE TRIGGER trg_community_comments_set_updated_at
BEFORE UPDATE ON public.community_comments
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- community_reactions
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.community_reactions (
  reaction_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,

  target_type text NOT NULL,
  target_id uuid NOT NULL,
  reaction_type text NOT NULL DEFAULT 'LIKE',

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_community_reactions_target_type
    CHECK (target_type IN ('POST', 'COMMENT')),

  CONSTRAINT chk_community_reactions_reaction_type
    CHECK (reaction_type IN ('LIKE', 'BOOKMARK', 'SHARE'))
);

COMMENT ON TABLE public.community_reactions
IS '게시글/댓글 좋아요, 북마크, 공유 반응. target_type + target_id 논리 FK를 사용하고 trigger로 대상 존재를 검증한다.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_reaction_unique
  ON public.community_reactions (user_id, target_type, target_id, reaction_type);

CREATE INDEX IF NOT EXISTS idx_reactions_target
  ON public.community_reactions (target_type, target_id, reaction_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reactions_user_created
  ON public.community_reactions (user_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- community_reports
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.community_reports (
  report_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,

  target_type text NOT NULL,
  target_id uuid NOT NULL,

  reason_code text NOT NULL,
  detail text,
  status text NOT NULL DEFAULT 'OPEN',

  resolved_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  resolution_note text,
  resolved_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_community_reports_target_type
    CHECK (target_type IN ('POST', 'COMMENT')),

  CONSTRAINT chk_community_reports_reason_code
    CHECK (
      reason_code IN (
        'SPAM',
        'ABUSE',
        'HARASSMENT',
        'MISINFORMATION',
        'FINANCIAL_RISK',
        'PRIVACY_LEAK',
        'ILLEGAL',
        'OTHER'
      )
    ),

  CONSTRAINT chk_community_reports_detail_length
    CHECK (detail IS NULL OR char_length(detail) <= 2000),

  CONSTRAINT chk_community_reports_status
    CHECK (status IN ('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED', 'DUPLICATED')),

  CONSTRAINT chk_community_reports_resolution_length
    CHECK (resolution_note IS NULL OR char_length(resolution_note) <= 2000),

  CONSTRAINT chk_community_reports_resolved_status
    CHECK (
      resolved_at IS NULL
      OR status IN ('RESOLVED', 'REJECTED', 'DUPLICATED')
    )
);

COMMENT ON TABLE public.community_reports
IS '커뮤니티 신고. 월급, 부업, 투자, 건강 주제의 오정보·개인정보 노출·금융 위험 신고를 운영자가 처리한다.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_reporter_target_open
  ON public.community_reports (reporter_user_id, target_type, target_id)
  WHERE status IN ('OPEN', 'IN_REVIEW');

CREATE INDEX IF NOT EXISTS idx_reports_status
  ON public.community_reports (status, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_reports_target
  ON public.community_reports (target_type, target_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_reporter
  ON public.community_reports (reporter_user_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_community_reports_set_updated_at ON public.community_reports;
CREATE TRIGGER trg_community_reports_set_updated_at
BEFORE UPDATE ON public.community_reports
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- attachments
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.attachments (
  attachment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  owner_type text NOT NULL,
  owner_id uuid NOT NULL,

  file_url text NOT NULL,
  storage_key text,
  mime_type text NOT NULL,
  file_size bigint NOT NULL,
  checksum_sha256 text,
  status text NOT NULL DEFAULT 'ACTIVE',

  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  CONSTRAINT chk_attachments_owner_type
    CHECK (owner_type IN ('COMMUNITY_POST', 'COMMUNITY_COMMENT')),

  CONSTRAINT chk_attachments_file_url_length
    CHECK (char_length(trim(file_url)) BETWEEN 1 AND 2048),

  CONSTRAINT chk_attachments_storage_key_length
    CHECK (storage_key IS NULL OR char_length(storage_key) <= 1024),

  CONSTRAINT chk_attachments_mime_type
    CHECK (
      mime_type IN (
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'application/pdf'
      )
    ),

  CONSTRAINT chk_attachments_file_size
    CHECK (file_size > 0 AND file_size <= 10485760),

  CONSTRAINT chk_attachments_checksum
    CHECK (checksum_sha256 IS NULL OR checksum_sha256 ~ '^[a-f0-9]{64}$'),

  CONSTRAINT chk_attachments_status
    CHECK (status IN ('ACTIVE', 'HIDDEN', 'DELETED', 'QUARANTINED')),

  CONSTRAINT chk_attachments_deleted_status
    CHECK (deleted_at IS NULL OR status = 'DELETED')
);

COMMENT ON TABLE public.attachments
IS '커뮤니티 게시글/댓글 첨부. 실제 파일은 R2 등 object storage에 저장하고 DB에는 URL/키/해시/상태만 저장한다.';

CREATE INDEX IF NOT EXISTS idx_attachments_owner
  ON public.attachments (owner_type, owner_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_attachments_created_by
  ON public.attachments (created_by, created_at DESC)
  WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_attachments_status
  ON public.attachments (status, created_at DESC);

-- -----------------------------------------------------------------------------
-- 도메인 무결성 함수
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ensure_notification_delivery_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_user_id uuid;
  v_device_user_id uuid;
BEGIN
  SELECT n.user_id
    INTO v_notification_user_id
  FROM public.notifications n
  WHERE n.notification_id = NEW.notification_id;

  IF v_notification_user_id IS NULL THEN
    RAISE EXCEPTION 'notification_id % does not exist', NEW.notification_id;
  END IF;

  IF NEW.device_id IS NOT NULL THEN
    SELECT ud.user_id
      INTO v_device_user_id
    FROM public.user_devices ud
    WHERE ud.device_id = NEW.device_id;

    IF v_device_user_id IS NULL THEN
      RAISE EXCEPTION 'device_id % does not exist', NEW.device_id;
    END IF;

    IF v_device_user_id <> v_notification_user_id THEN
      RAISE EXCEPTION 'notification user_id % does not match device owner %', v_notification_user_id, v_device_user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_growth_completion_reward()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_exp integer;
  v_task_status text;
BEGIN
  SELECT gt.exp_reward, gt.status
    INTO v_task_exp, v_task_status
  FROM public.growth_tasks gt
  WHERE gt.growth_task_id = NEW.growth_task_id;

  IF v_task_exp IS NULL THEN
    RAISE EXCEPTION 'growth_task_id % does not exist', NEW.growth_task_id;
  END IF;

  IF v_task_status <> 'ACTIVE' AND NEW.status = 'COMPLETED' THEN
    RAISE EXCEPTION 'growth_task_id % is not ACTIVE', NEW.growth_task_id;
  END IF;

  IF NEW.earned_exp = 0 THEN
    NEW.earned_exp := v_task_exp;
  END IF;

  IF NEW.earned_exp > v_task_exp THEN
    RAISE EXCEPTION 'earned_exp % cannot exceed task exp_reward %', NEW.earned_exp, v_task_exp;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_comment_parent_same_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_post_id uuid;
BEGIN
  IF NEW.parent_comment_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT cc.post_id
    INTO v_parent_post_id
  FROM public.community_comments cc
  WHERE cc.comment_id = NEW.parent_comment_id;

  IF v_parent_post_id IS NULL THEN
    RAISE EXCEPTION 'parent_comment_id % does not exist', NEW.parent_comment_id;
  END IF;

  IF v_parent_post_id <> NEW.post_id THEN
    RAISE EXCEPTION 'parent_comment_id % belongs to different post', NEW.parent_comment_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_community_target_exists(
  p_target_type text,
  p_target_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  IF p_target_type = 'POST' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.community_posts p
      WHERE p.post_id = p_target_id
    )
    INTO v_exists;

    RETURN v_exists;
  END IF;

  IF p_target_type = 'COMMENT' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.community_comments c
      WHERE c.comment_id = p_target_id
    )
    INTO v_exists;

    RETURN v_exists;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_reaction_target_exists()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.ensure_community_target_exists(NEW.target_type, NEW.target_id) THEN
    RAISE EXCEPTION 'reaction target %.% does not exist', NEW.target_type, NEW.target_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_report_target_exists()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.ensure_community_target_exists(NEW.target_type, NEW.target_id) THEN
    RAISE EXCEPTION 'report target %.% does not exist', NEW.target_type, NEW.target_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_attachment_owner_exists()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  IF NEW.owner_type = 'COMMUNITY_POST' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.community_posts p
      WHERE p.post_id = NEW.owner_id
    )
    INTO v_exists;
  ELSIF NEW.owner_type = 'COMMUNITY_COMMENT' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.community_comments c
      WHERE c.comment_id = NEW.owner_id
    )
    INTO v_exists;
  ELSE
    v_exists := false;
  END IF;

  IF NOT v_exists THEN
    RAISE EXCEPTION 'attachment owner %.% does not exist', NEW.owner_type, NEW.owner_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notification_deliveries_ensure_owner ON public.notification_deliveries;
CREATE TRIGGER trg_notification_deliveries_ensure_owner
BEFORE INSERT OR UPDATE OF notification_id, device_id ON public.notification_deliveries
FOR EACH ROW
EXECUTE FUNCTION public.ensure_notification_delivery_owner();

DROP TRIGGER IF EXISTS trg_growth_completion_reward ON public.growth_task_completions;
CREATE TRIGGER trg_growth_completion_reward
BEFORE INSERT OR UPDATE OF growth_task_id, earned_exp, status ON public.growth_task_completions
FOR EACH ROW
EXECUTE FUNCTION public.ensure_growth_completion_reward();

DROP TRIGGER IF EXISTS trg_comments_parent_same_post ON public.community_comments;
CREATE TRIGGER trg_comments_parent_same_post
BEFORE INSERT OR UPDATE OF post_id, parent_comment_id ON public.community_comments
FOR EACH ROW
EXECUTE FUNCTION public.ensure_comment_parent_same_post();

DROP TRIGGER IF EXISTS trg_reactions_target_exists ON public.community_reactions;
CREATE TRIGGER trg_reactions_target_exists
BEFORE INSERT OR UPDATE OF target_type, target_id ON public.community_reactions
FOR EACH ROW
EXECUTE FUNCTION public.ensure_reaction_target_exists();

DROP TRIGGER IF EXISTS trg_reports_target_exists ON public.community_reports;
CREATE TRIGGER trg_reports_target_exists
BEFORE INSERT OR UPDATE OF target_type, target_id ON public.community_reports
FOR EACH ROW
EXECUTE FUNCTION public.ensure_report_target_exists();

DROP TRIGGER IF EXISTS trg_attachments_owner_exists ON public.attachments;
CREATE TRIGGER trg_attachments_owner_exists
BEFORE INSERT OR UPDATE OF owner_type, owner_id ON public.attachments
FOR EACH ROW
EXECUTE FUNCTION public.ensure_attachment_owner_exists();

-- -----------------------------------------------------------------------------
-- 서버 권위 집계/카운트 함수
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.recalculate_user_growth_stats(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_exp integer;
  v_reading integer;
  v_news integer;
  v_english integer;
  v_health integer;
  v_quiz integer;
  v_routine integer;
  v_last_completed_at timestamptz;
BEGIN
  SELECT
    COALESCE(SUM(c.earned_exp), 0)::integer,
    COALESCE(SUM(c.earned_exp) FILTER (WHERE t.type = 'READING'), 0)::integer,
    COALESCE(SUM(c.earned_exp) FILTER (WHERE t.type = 'NEWS'), 0)::integer,
    COALESCE(SUM(c.earned_exp) FILTER (WHERE t.type = 'ENGLISH'), 0)::integer,
    COALESCE(SUM(c.earned_exp) FILTER (WHERE t.type = 'HEALTH'), 0)::integer,
    COALESCE(SUM(c.earned_exp) FILTER (WHERE t.type = 'QUIZ'), 0)::integer,
    COALESCE(SUM(c.earned_exp) FILTER (WHERE t.type = 'ROUTINE'), 0)::integer,
    MAX(c.completed_at)
  INTO
    v_total_exp,
    v_reading,
    v_news,
    v_english,
    v_health,
    v_quiz,
    v_routine,
    v_last_completed_at
  FROM public.growth_task_completions c
  JOIN public.growth_tasks t
    ON t.growth_task_id = c.growth_task_id
  WHERE c.user_id = p_user_id
    AND c.status = 'COMPLETED';

  INSERT INTO public.user_growth_stats (
    user_id,
    level,
    current_exp,
    total_exp,
    reading_score,
    news_score,
    english_score,
    health_score,
    quiz_score,
    routine_score,
    last_completed_at
  )
  VALUES (
    p_user_id,
    GREATEST((v_total_exp / 100) + 1, 1),
    v_total_exp % 100,
    v_total_exp,
    v_reading,
    v_news,
    v_english,
    v_health,
    v_quiz,
    v_routine,
    v_last_completed_at
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    level = EXCLUDED.level,
    current_exp = EXCLUDED.current_exp,
    total_exp = EXCLUDED.total_exp,
    reading_score = EXCLUDED.reading_score,
    news_score = EXCLUDED.news_score,
    english_score = EXCLUDED.english_score,
    health_score = EXCLUDED.health_score,
    quiz_score = EXCLUDED.quiz_score,
    routine_score = EXCLUDED.routine_score,
    last_completed_at = EXCLUDED.last_completed_at,
    updated_at = now();
END;
$$;

COMMENT ON FUNCTION public.recalculate_user_growth_stats(uuid)
IS 'growth_task_completions 완료 이력을 기준으로 사용자 LV UP 통계를 서버 권위로 재계산한다.';

CREATE OR REPLACE FUNCTION public.trg_recalculate_user_growth_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_user_growth_stats(OLD.user_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    PERFORM public.recalculate_user_growth_stats(OLD.user_id);
    PERFORM public.recalculate_user_growth_stats(NEW.user_id);
    RETURN NEW;
  END IF;

  PERFORM public.recalculate_user_growth_stats(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_growth_completion_recalculate_stats ON public.growth_task_completions;
CREATE TRIGGER trg_growth_completion_recalculate_stats
AFTER INSERT OR UPDATE OR DELETE ON public.growth_task_completions
FOR EACH ROW
EXECUTE FUNCTION public.trg_recalculate_user_growth_stats();

CREATE OR REPLACE FUNCTION public.recalculate_community_post_counts(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comment_count integer;
  v_like_count integer;
  v_share_count integer;
  v_report_count integer;
BEGIN
  SELECT COALESCE(COUNT(*), 0)::integer
    INTO v_comment_count
  FROM public.community_comments c
  WHERE c.post_id = p_post_id
    AND c.status = 'ACTIVE';

  SELECT COALESCE(COUNT(*), 0)::integer
    INTO v_like_count
  FROM public.community_reactions r
  WHERE r.target_type = 'POST'
    AND r.target_id = p_post_id
    AND r.reaction_type = 'LIKE';

  SELECT COALESCE(COUNT(*), 0)::integer
    INTO v_share_count
  FROM public.community_reactions r
  WHERE r.target_type = 'POST'
    AND r.target_id = p_post_id
    AND r.reaction_type = 'SHARE';

  SELECT COALESCE(COUNT(*), 0)::integer
    INTO v_report_count
  FROM public.community_reports cr
  WHERE cr.target_type = 'POST'
    AND cr.target_id = p_post_id
    AND cr.status IN ('OPEN', 'IN_REVIEW', 'RESOLVED');

  UPDATE public.community_posts p
  SET
    comment_count = v_comment_count,
    like_count = v_like_count,
    share_count = v_share_count,
    report_count = v_report_count,
    updated_at = now()
  WHERE p.post_id = p_post_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_community_comment_counts(p_comment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_like_count integer;
  v_report_count integer;
BEGIN
  SELECT COALESCE(COUNT(*), 0)::integer
    INTO v_like_count
  FROM public.community_reactions r
  WHERE r.target_type = 'COMMENT'
    AND r.target_id = p_comment_id
    AND r.reaction_type = 'LIKE';

  SELECT COALESCE(COUNT(*), 0)::integer
    INTO v_report_count
  FROM public.community_reports cr
  WHERE cr.target_type = 'COMMENT'
    AND cr.target_id = p_comment_id
    AND cr.status IN ('OPEN', 'IN_REVIEW', 'RESOLVED');

  UPDATE public.community_comments c
  SET
    like_count = v_like_count,
    report_count = v_report_count,
    updated_at = now()
  WHERE c.comment_id = p_comment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_comments_recalculate_post_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_community_post_counts(OLD.post_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.post_id IS DISTINCT FROM NEW.post_id THEN
    PERFORM public.recalculate_community_post_counts(OLD.post_id);
    PERFORM public.recalculate_community_post_counts(NEW.post_id);
    RETURN NEW;
  END IF;

  PERFORM public.recalculate_community_post_counts(NEW.post_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_reactions_recalculate_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'POST' THEN
      PERFORM public.recalculate_community_post_counts(OLD.target_id);
    ELSE
      PERFORM public.recalculate_community_comment_counts(OLD.target_id);
    END IF;

    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE'
     AND (
       OLD.target_type IS DISTINCT FROM NEW.target_type
       OR OLD.target_id IS DISTINCT FROM NEW.target_id
       OR OLD.reaction_type IS DISTINCT FROM NEW.reaction_type
     ) THEN
    IF OLD.target_type = 'POST' THEN
      PERFORM public.recalculate_community_post_counts(OLD.target_id);
    ELSE
      PERFORM public.recalculate_community_comment_counts(OLD.target_id);
    END IF;
  END IF;

  IF NEW.target_type = 'POST' THEN
    PERFORM public.recalculate_community_post_counts(NEW.target_id);
  ELSE
    PERFORM public.recalculate_community_comment_counts(NEW.target_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_reports_recalculate_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'POST' THEN
      PERFORM public.recalculate_community_post_counts(OLD.target_id);
    ELSE
      PERFORM public.recalculate_community_comment_counts(OLD.target_id);
    END IF;

    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE'
     AND (
       OLD.target_type IS DISTINCT FROM NEW.target_type
       OR OLD.target_id IS DISTINCT FROM NEW.target_id
       OR OLD.status IS DISTINCT FROM NEW.status
     ) THEN
    IF OLD.target_type = 'POST' THEN
      PERFORM public.recalculate_community_post_counts(OLD.target_id);
    ELSE
      PERFORM public.recalculate_community_comment_counts(OLD.target_id);
    END IF;
  END IF;

  IF NEW.target_type = 'POST' THEN
    PERFORM public.recalculate_community_post_counts(NEW.target_id);
  ELSE
    PERFORM public.recalculate_community_comment_counts(NEW.target_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comments_recalculate_post_counts ON public.community_comments;
CREATE TRIGGER trg_comments_recalculate_post_counts
AFTER INSERT OR UPDATE OR DELETE ON public.community_comments
FOR EACH ROW
EXECUTE FUNCTION public.trg_comments_recalculate_post_counts();

DROP TRIGGER IF EXISTS trg_reactions_recalculate_counts ON public.community_reactions;
CREATE TRIGGER trg_reactions_recalculate_counts
AFTER INSERT OR UPDATE OR DELETE ON public.community_reactions
FOR EACH ROW
EXECUTE FUNCTION public.trg_reactions_recalculate_counts();

DROP TRIGGER IF EXISTS trg_reports_recalculate_counts ON public.community_reports;
CREATE TRIGGER trg_reports_recalculate_counts
AFTER INSERT OR UPDATE OR DELETE ON public.community_reports
FOR EACH ROW
EXECUTE FUNCTION public.trg_reports_recalculate_counts();

-- -----------------------------------------------------------------------------
-- 커뮤니티 조회/첨부 접근 함수
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_read_community_post(p_post_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_allowed boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.community_posts p
    WHERE p.post_id = p_post_id
      AND (
        p.status IN ('PUBLISHED', 'LOCKED')
        OR p.user_id = public.current_app_user_id()
        OR public.current_app_is_admin()
      )
  )
  INTO v_allowed;

  RETURN COALESCE(v_allowed, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.can_read_community_comment(p_comment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_allowed boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.community_comments c
    WHERE c.comment_id = p_comment_id
      AND (
        (c.status = 'ACTIVE' AND public.can_read_community_post(c.post_id))
        OR c.user_id = public.current_app_user_id()
        OR public.current_app_is_admin()
      )
  )
  INTO v_allowed;

  RETURN COALESCE(v_allowed, false);
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
  IF p_status NOT IN ('ACTIVE', 'HIDDEN') AND NOT public.current_app_is_admin() THEN
    RETURN false;
  END IF;

  IF p_owner_type = 'COMMUNITY_POST' THEN
    RETURN public.can_read_community_post(p_owner_id);
  END IF;

  IF p_owner_type = 'COMMUNITY_COMMENT' THEN
    RETURN public.can_read_community_comment(p_owner_id);
  END IF;

  RETURN false;
END;
$$;

-- -----------------------------------------------------------------------------
-- RLS / 접근통제
-- -----------------------------------------------------------------------------

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_growth_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_owner_select ON public.notifications;
CREATE POLICY notifications_owner_select
ON public.notifications
FOR SELECT
USING (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS notifications_owner_insert ON public.notifications;
CREATE POLICY notifications_owner_insert
ON public.notifications
FOR INSERT
WITH CHECK (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS notifications_owner_update ON public.notifications;
CREATE POLICY notifications_owner_update
ON public.notifications
FOR UPDATE
USING (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
)
WITH CHECK (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS notification_deliveries_owner_select ON public.notification_deliveries;
CREATE POLICY notification_deliveries_owner_select
ON public.notification_deliveries
FOR SELECT
USING (
  public.current_app_is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.notifications n
    WHERE n.notification_id = notification_deliveries.notification_id
      AND n.user_id = public.current_app_user_id()
  )
);

DROP POLICY IF EXISTS notification_deliveries_admin_all ON public.notification_deliveries;
CREATE POLICY notification_deliveries_admin_all
ON public.notification_deliveries
FOR ALL
USING (public.current_app_is_admin())
WITH CHECK (public.current_app_is_admin());

DROP POLICY IF EXISTS growth_tasks_read_active ON public.growth_tasks;
CREATE POLICY growth_tasks_read_active
ON public.growth_tasks
FOR SELECT
USING (
  status = 'ACTIVE'
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS growth_tasks_admin_all ON public.growth_tasks;
CREATE POLICY growth_tasks_admin_all
ON public.growth_tasks
FOR ALL
USING (public.current_app_is_admin())
WITH CHECK (public.current_app_is_admin());

DROP POLICY IF EXISTS growth_completions_owner_all ON public.growth_task_completions;
CREATE POLICY growth_completions_owner_all
ON public.growth_task_completions
FOR ALL
USING (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
)
WITH CHECK (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS user_growth_stats_owner_select ON public.user_growth_stats;
CREATE POLICY user_growth_stats_owner_select
ON public.user_growth_stats
FOR SELECT
USING (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS user_growth_stats_admin_all ON public.user_growth_stats;
CREATE POLICY user_growth_stats_admin_all
ON public.user_growth_stats
FOR ALL
USING (public.current_app_is_admin())
WITH CHECK (public.current_app_is_admin());

DROP POLICY IF EXISTS posts_read_public ON public.community_posts;
CREATE POLICY posts_read_public
ON public.community_posts
FOR SELECT
USING (
  status IN ('PUBLISHED', 'LOCKED')
  OR user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS posts_owner_insert ON public.community_posts;
CREATE POLICY posts_owner_insert
ON public.community_posts
FOR INSERT
WITH CHECK (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS posts_owner_update ON public.community_posts;
CREATE POLICY posts_owner_update
ON public.community_posts
FOR UPDATE
USING (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
)
WITH CHECK (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS posts_owner_delete ON public.community_posts;
CREATE POLICY posts_owner_delete
ON public.community_posts
FOR DELETE
USING (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS comments_read_public ON public.community_comments;
CREATE POLICY comments_read_public
ON public.community_comments
FOR SELECT
USING (
  (status = 'ACTIVE' AND public.can_read_community_post(post_id))
  OR user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS comments_owner_insert ON public.community_comments;
CREATE POLICY comments_owner_insert
ON public.community_comments
FOR INSERT
WITH CHECK (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS comments_owner_update ON public.community_comments;
CREATE POLICY comments_owner_update
ON public.community_comments
FOR UPDATE
USING (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
)
WITH CHECK (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS comments_owner_delete ON public.community_comments;
CREATE POLICY comments_owner_delete
ON public.community_comments
FOR DELETE
USING (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS reactions_read_public ON public.community_reactions;
CREATE POLICY reactions_read_public
ON public.community_reactions
FOR SELECT
USING (
  (target_type = 'POST' AND public.can_read_community_post(target_id))
  OR (target_type = 'COMMENT' AND public.can_read_community_comment(target_id))
  OR user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS reactions_owner_all ON public.community_reactions;
CREATE POLICY reactions_owner_all
ON public.community_reactions
FOR ALL
USING (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
)
WITH CHECK (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS reports_owner_select ON public.community_reports;
CREATE POLICY reports_owner_select
ON public.community_reports
FOR SELECT
USING (
  reporter_user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS reports_owner_insert ON public.community_reports;
CREATE POLICY reports_owner_insert
ON public.community_reports
FOR INSERT
WITH CHECK (
  reporter_user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS reports_admin_update ON public.community_reports;
CREATE POLICY reports_admin_update
ON public.community_reports
FOR UPDATE
USING (public.current_app_is_admin())
WITH CHECK (public.current_app_is_admin());

DROP POLICY IF EXISTS attachments_read_by_owner_target ON public.attachments;
CREATE POLICY attachments_read_by_owner_target
ON public.attachments
FOR SELECT
USING (
  public.can_read_attachment(owner_type, owner_id, status)
  OR created_by = public.current_app_user_id()
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS attachments_owner_insert ON public.attachments;
CREATE POLICY attachments_owner_insert
ON public.attachments
FOR INSERT
WITH CHECK (
  created_by = public.current_app_user_id()
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS attachments_owner_update ON public.attachments;
CREATE POLICY attachments_owner_update
ON public.attachments
FOR UPDATE
USING (
  created_by = public.current_app_user_id()
  OR public.current_app_is_admin()
)
WITH CHECK (
  created_by = public.current_app_user_id()
  OR public.current_app_is_admin()
);

-- -----------------------------------------------------------------------------
-- 초기 LV UP Seed
-- 재실행 안정성 보장:
--   1. active_from에 now()를 사용하지 않는다.
--   2. seed_key 성격의 고정 active_from을 사용한다.
--   3. 이미 동일 type + title의 기본 미션이 존재하면 중복 삽입하지 않는다.
--   4. 기존 운영 데이터가 있더라도 마이그레이션 재실행 시 동일 기본 미션이 추가로 늘어나지 않는다.
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  v_seed_active_from constant timestamptz := '2026-01-01 00:00:00+09'::timestamptz;
BEGIN
  INSERT INTO public.growth_tasks (
    type,
    category,
    title,
    description,
    exp_reward,
    active_from,
    status
  )
  SELECT
    seed.type,
    seed.category,
    seed.title,
    seed.description,
    seed.exp_reward,
    v_seed_active_from,
    'ACTIVE'
  FROM (
    VALUES
      (
        'READING',
        '독서',
        '오늘의 독서 10분',
        '독서 콘텐츠를 읽고 오늘의 자기관리 루틴을 완료한다.',
        20
      ),
      (
        'NEWS',
        '뉴스',
        '경제 뉴스 1개 읽기',
        '경제·산업·사회·기술 뉴스 중 하나를 읽고 인사이트를 정리한다.',
        20
      ),
      (
        'ENGLISH',
        '영어',
        '오늘의 영어 문장 학습',
        'Listening, Speaking, Reading, Writing 중 하나를 선택해 학습한다.',
        20
      ),
      (
        'HEALTH',
        '건강',
        '오늘의 홈트 루틴',
        '신체·영양·회복·정신 중 하나의 건강 루틴을 완료한다.',
        20
      )
  ) AS seed(type, category, title, description, exp_reward)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.growth_tasks gt
    WHERE gt.type = seed.type
      AND gt.title = seed.title
      AND gt.category = seed.category
      AND gt.status IN ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED')
  );
END;
$$;

COMMIT;
