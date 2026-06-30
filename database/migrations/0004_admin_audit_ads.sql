-- database/migrations/0004_admin_audit_ads.sql
-- 급여납치 관리자 운영·감사로그·광고/제휴·공지·장애 대응 최종 마이그레이션
-- 기준 DB: Neon PostgreSQL / PostgreSQL
-- 기준 시간대: Asia/Seoul
-- 선행 마이그레이션:
--   0001_init_users.sql
--   0002_payroll_budget_expense.sql
--   0003_growth_community_notifications.sql
--
-- 설계 원칙:
--   1. 관리자 권한 변경, 광고/제휴 변경, 공지, 장애 대응은 감사로그로 추적한다.
--   2. 광고/제휴 데이터는 급여·대출·저축·지출·납치금액 원천 데이터와 직접 결합하지 않는다.
--   3. 광고 이벤트는 노출/클릭/전환 로그를 저장하되 재무 원천 데이터, 토큰, 이메일, 전화번호 원문을 저장하지 않는다.
--   4. 관리자 감사로그에는 민감정보 원문을 저장하지 않고, request_id, ip_hash, user_agent_hash 등 추적 가능한 비식별 값만 저장한다.
--   5. 공지와 장애 대응은 운영 상태, 배포/롤백, 관리자 책임자를 추적할 수 있어야 한다.
--   6. 모든 관리자 변경은 RBAC와 current_app_is_admin() 컨텍스트를 전제로 한다.
--   7. 일반 사용자는 공개 공지만 조회할 수 있고, 관리자 운영 데이터는 관리자만 조회·변경한다.

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
    RAISE EXCEPTION '0004_admin_audit_ads.sql requires public.users from 0001_init_users.sql';
  END IF;

  IF to_regclass('public.user_consents') IS NULL THEN
    RAISE EXCEPTION '0004_admin_audit_ads.sql requires public.user_consents from 0001_init_users.sql';
  END IF;

  IF to_regclass('public.admin_roles') IS NULL THEN
    RAISE EXCEPTION '0004_admin_audit_ads.sql requires public.admin_roles from 0001_init_users.sql';
  END IF;

  IF to_regclass('public.admin_role_members') IS NULL THEN
    RAISE EXCEPTION '0004_admin_audit_ads.sql requires public.admin_role_members from 0001_init_users.sql';
  END IF;

  IF to_regprocedure('public.set_updated_at()') IS NULL THEN
    RAISE EXCEPTION '0004_admin_audit_ads.sql requires public.set_updated_at() from 0001_init_users.sql';
  END IF;

  IF to_regprocedure('public.current_app_user_id()') IS NULL THEN
    RAISE EXCEPTION '0004_admin_audit_ads.sql requires public.current_app_user_id() from 0001_init_users.sql';
  END IF;

  IF to_regprocedure('public.current_app_is_admin()') IS NULL THEN
    RAISE EXCEPTION '0004_admin_audit_ads.sql requires public.current_app_is_admin() from 0001_init_users.sql';
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 공통 보안/감사 함수
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_app_request_id()
RETURNS text
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  v_request_id text;
BEGIN
  v_request_id := NULLIF(current_setting('app.request_id', true), '');

  IF v_request_id IS NULL THEN
    RETURN 'system-' || gen_random_uuid()::text;
  END IF;

  RETURN v_request_id;
END;
$$;

COMMENT ON FUNCTION public.current_app_request_id()
IS '서버 API가 SET LOCAL app.request_id로 주입한 request_id를 반환한다. 없으면 system UUID를 생성한다.';

CREATE OR REPLACE FUNCTION public.current_app_ip_hash()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.ip_hash', true), '')
$$;

COMMENT ON FUNCTION public.current_app_ip_hash()
IS '서버 API가 주입한 IP 해시. IP 원문은 DB에 저장하지 않는다.';

CREATE OR REPLACE FUNCTION public.current_app_user_agent_hash()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.user_agent_hash', true), '')
$$;

COMMENT ON FUNCTION public.current_app_user_agent_hash()
IS '서버 API가 주입한 User-Agent 해시. User-Agent 원문은 DB에 저장하지 않는다.';

CREATE OR REPLACE FUNCTION public.jsonb_has_forbidden_ad_or_audit_keys(p_data jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_text text;
BEGIN
  IF p_data IS NULL OR p_data = 'null'::jsonb THEN
    RETURN false;
  END IF;

  v_text := lower(p_data::text);

  RETURN v_text ~ (
    'expected_salary_amount|salary_amount|payroll_plan_id|fixed_expense_id|' ||
    'savings_plan_id|variable_expense_id|daily_budget_id|loan|credit_card_number|' ||
    'account_number|resident_registration_number|access_token|refresh_token|' ||
    'push_token|database_url|api_key|secret_key|private_key|password|' ||
    '급여액|대출|계좌|카드번호|주민등록|저축액|지출액|소비내역|납치금액|토큰|비밀번호'
  );
END;
$$;

COMMENT ON FUNCTION public.jsonb_has_forbidden_ad_or_audit_keys(jsonb)
IS '광고 이벤트/감사로그 JSONB에 저장하면 안 되는 재무 원천 데이터·토큰·secret 키워드를 탐지한다.';

CREATE OR REPLACE FUNCTION public.redact_audit_jsonb(p_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_data IS NULL OR p_data = 'null'::jsonb THEN
    RETURN NULL;
  END IF;

  RETURN p_data
    - ARRAY[
      'email',
      'phone_number',
      'phone_number_hash',
      'contact_email',
      'privacy_contact_email',
      'ip',
      'ip_address',
      'user_agent',
      'access_token',
      'refresh_token',
      'push_token',
      'database_url',
      'api_key',
      'secret_key',
      'private_key',
      'password'
    ];
END;
$$;

COMMENT ON FUNCTION public.redact_audit_jsonb(jsonb)
IS '감사로그 저장 전 이메일, 전화번호, 토큰, secret, 원문 IP/User-Agent 등 민감 키를 제거한다.';

CREATE OR REPLACE FUNCTION public.user_has_active_admin_role(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_role_members arm
    JOIN public.admin_roles ar
      ON ar.admin_role_id = arm.admin_role_id
    WHERE arm.user_id = p_user_id
      AND arm.status = 'ACTIVE'
      AND ar.status = 'ACTIVE'
  )
$$;

COMMENT ON FUNCTION public.user_has_active_admin_role(uuid)
IS '사용자가 활성 관리자 역할을 보유하는지 확인한다.';

-- -----------------------------------------------------------------------------
-- partner_accounts
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.partner_accounts (
  partner_account_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name text NOT NULL,
  business_type text NOT NULL,
  status text NOT NULL DEFAULT 'REVIEW',

  contact_email text,
  privacy_contact_email text,
  contract_reference text,
  settlement_currency char(3) NOT NULL DEFAULT 'KRW',

  data_processing_terms_accepted boolean NOT NULL DEFAULT false,
  financial_data_use_allowed boolean NOT NULL DEFAULT false,

  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,

  reviewed_at timestamptz,
  approved_at timestamptz,
  suspended_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_partner_accounts_name_length
    CHECK (char_length(trim(name)) BETWEEN 1 AND 160),

  CONSTRAINT chk_partner_accounts_business_type
    CHECK (
      business_type IN (
        'ADS_NETWORK',
        'AFFILIATE',
        'BRAND',
        'CONTENT_PARTNER',
        'INTERNAL',
        'OTHER'
      )
    ),

  CONSTRAINT chk_partner_accounts_status
    CHECK (status IN ('REVIEW', 'ACTIVE', 'SUSPENDED', 'REJECTED', 'ARCHIVED')),

  CONSTRAINT chk_partner_accounts_email_format
    CHECK (
      contact_email IS NULL
      OR contact_email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
    ),

  CONSTRAINT chk_partner_accounts_privacy_email_format
    CHECK (
      privacy_contact_email IS NULL
      OR privacy_contact_email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
    ),

  CONSTRAINT chk_partner_accounts_contract_reference_length
    CHECK (contract_reference IS NULL OR char_length(contract_reference) <= 200),

  CONSTRAINT chk_partner_accounts_currency
    CHECK (settlement_currency = 'KRW'),

  CONSTRAINT chk_partner_accounts_financial_data_use_forbidden
    CHECK (financial_data_use_allowed = false),

  CONSTRAINT chk_partner_accounts_approved_status
    CHECK (approved_at IS NULL OR status = 'ACTIVE'),

  CONSTRAINT chk_partner_accounts_suspended_status
    CHECK (suspended_at IS NULL OR status = 'SUSPENDED')
);

COMMENT ON TABLE public.partner_accounts
IS '광고·제휴 파트너 계정. 재무 원천 데이터 사용은 금지되며, 데이터 처리 약관과 검수 상태를 추적한다.';

COMMENT ON COLUMN public.partner_accounts.financial_data_use_allowed
IS '항상 false여야 한다. 급여·대출·저축·지출·납치금액 원천 데이터 기반 타겟팅을 금지한다.';

CREATE INDEX IF NOT EXISTS idx_partner_accounts_status_created
  ON public.partner_accounts (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_accounts_business_status
  ON public.partner_accounts (business_type, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_accounts_contract_reference
  ON public.partner_accounts (contract_reference)
  WHERE contract_reference IS NOT NULL;

DROP TRIGGER IF EXISTS trg_partner_accounts_set_updated_at ON public.partner_accounts;
CREATE TRIGGER trg_partner_accounts_set_updated_at
BEFORE UPDATE ON public.partner_accounts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- ad_campaigns
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ad_campaigns (
  ad_campaign_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_account_id uuid NOT NULL REFERENCES public.partner_accounts(partner_account_id) ON DELETE RESTRICT,

  name text NOT NULL,
  placement text NOT NULL,
  image_url text,
  landing_url text NOT NULL,

  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,

  status text NOT NULL DEFAULT 'DRAFT',
  priority integer NOT NULL DEFAULT 100,

  targeting_policy text NOT NULL DEFAULT 'CONTEXTUAL_ONLY',
  targeting_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  consent_requirement text NOT NULL DEFAULT 'NONE',
  risk_level text NOT NULL DEFAULT 'LOW',

  revenue_model text NOT NULL DEFAULT 'NONE',
  cost_per_click_krw bigint NOT NULL DEFAULT 0,
  cost_per_conversion_krw bigint NOT NULL DEFAULT 0,
  fixed_fee_krw bigint NOT NULL DEFAULT 0,

  daily_impression_cap integer,
  total_impression_cap integer,

  review_note text,
  rejection_reason text,

  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  approved_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,

  reviewed_at timestamptz,
  approved_at timestamptz,
  paused_at timestamptz,
  emergency_stopped_at timestamptz,
  archived_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_ad_campaigns_name_length
    CHECK (char_length(trim(name)) BETWEEN 1 AND 180),

  CONSTRAINT chk_ad_campaigns_placement
    CHECK (
      placement IN (
        'HOME_TOP',
        'DAILY_BUDGET',
        'LEVEL_UP',
        'COMMUNITY',
        'MY_PAGE',
        'ADMIN_NOTICE',
        'NOTICE_DETAIL'
      )
    ),

  CONSTRAINT chk_ad_campaigns_image_url_length
    CHECK (image_url IS NULL OR char_length(image_url) <= 2048),

  CONSTRAINT chk_ad_campaigns_landing_url_length
    CHECK (char_length(landing_url) BETWEEN 1 AND 2048),

  CONSTRAINT chk_ad_campaigns_landing_url_https
    CHECK (landing_url ~* '^https://'),

  CONSTRAINT chk_ad_campaigns_period
    CHECK (start_at < end_at),

  CONSTRAINT chk_ad_campaigns_status
    CHECK (
      status IN (
        'DRAFT',
        'REVIEW',
        'SCHEDULED',
        'LIVE',
        'PAUSED',
        'EXPIRED',
        'REJECTED',
        'ARCHIVED',
        'EMERGENCY_STOPPED'
      )
    ),

  CONSTRAINT chk_ad_campaigns_priority
    CHECK (priority BETWEEN 1 AND 9999),

  CONSTRAINT chk_ad_campaigns_targeting_policy
    CHECK (
      targeting_policy IN (
        'CONTEXTUAL_ONLY',
        'CONSENT_BASED',
        'INTERNAL_NOTICE',
        'NON_PERSONALIZED',
        'AGGREGATED_SEGMENT'
      )
    ),

  CONSTRAINT chk_ad_campaigns_no_financial_targeting_payload
    CHECK (public.jsonb_has_forbidden_ad_or_audit_keys(targeting_payload) = false),

  CONSTRAINT chk_ad_campaigns_consent_requirement
    CHECK (consent_requirement IN ('NONE', 'MARKETING', 'ADS_PARTNER', 'ANALYTICS')),

  CONSTRAINT chk_ad_campaigns_risk_level
    CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),

  CONSTRAINT chk_ad_campaigns_revenue_model
    CHECK (revenue_model IN ('NONE', 'CPC', 'CPA', 'CPM', 'FIXED_FEE', 'INTERNAL')),

  CONSTRAINT chk_ad_campaigns_revenue_amounts
    CHECK (
      cost_per_click_krw >= 0
      AND cost_per_conversion_krw >= 0
      AND fixed_fee_krw >= 0
    ),

  CONSTRAINT chk_ad_campaigns_impression_caps
    CHECK (
      (daily_impression_cap IS NULL OR daily_impression_cap > 0)
      AND (total_impression_cap IS NULL OR total_impression_cap > 0)
    ),

  CONSTRAINT chk_ad_campaigns_review_note_length
    CHECK (review_note IS NULL OR char_length(review_note) <= 3000),

  CONSTRAINT chk_ad_campaigns_rejection_reason_length
    CHECK (rejection_reason IS NULL OR char_length(rejection_reason) <= 2000),

  CONSTRAINT chk_ad_campaigns_approved_status
    CHECK (approved_at IS NULL OR status IN ('SCHEDULED', 'LIVE', 'PAUSED', 'EXPIRED')),

  CONSTRAINT chk_ad_campaigns_paused_status
    CHECK (paused_at IS NULL OR status = 'PAUSED'),

  CONSTRAINT chk_ad_campaigns_emergency_status
    CHECK (emergency_stopped_at IS NULL OR status = 'EMERGENCY_STOPPED'),

  CONSTRAINT chk_ad_campaigns_archived_status
    CHECK (archived_at IS NULL OR status = 'ARCHIVED')
);

COMMENT ON TABLE public.ad_campaigns
IS '광고·제휴 배너/캠페인. 문맥 기반 또는 동의 기반 노출만 허용하며 재무 원천 데이터 타겟팅은 금지한다.';

COMMENT ON COLUMN public.ad_campaigns.targeting_payload
IS '타겟팅 보조 데이터. 급여액, 지출액, 저축액, 납치금액, 대출 정보, 토큰, 이메일, 전화번호 원문 저장 금지.';

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_active
  ON public.ad_campaigns (placement, status, start_at, end_at, priority);

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_partner_status
  ON public.ad_campaigns (partner_account_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_review
  ON public.ad_campaigns (status, risk_level, updated_at DESC)
  WHERE status IN ('DRAFT', 'REVIEW', 'REJECTED');

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_schedule
  ON public.ad_campaigns (status, start_at, end_at)
  WHERE status IN ('SCHEDULED', 'LIVE');

DROP TRIGGER IF EXISTS trg_ad_campaigns_set_updated_at ON public.ad_campaigns;
CREATE TRIGGER trg_ad_campaigns_set_updated_at
BEFORE UPDATE ON public.ad_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- ad_events
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ad_events (
  ad_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_campaign_id uuid NOT NULL REFERENCES public.ad_campaigns(ad_campaign_id) ON DELETE RESTRICT,

  user_id uuid REFERENCES public.users(user_id) ON DELETE SET NULL,

  placement text NOT NULL,
  event_type text NOT NULL,

  consent_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  event_context jsonb NOT NULL DEFAULT '{}'::jsonb,

  request_id text,
  session_hash text,
  device_hash text,

  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_ad_events_placement
    CHECK (
      placement IN (
        'HOME_TOP',
        'DAILY_BUDGET',
        'LEVEL_UP',
        'COMMUNITY',
        'MY_PAGE',
        'ADMIN_NOTICE',
        'NOTICE_DETAIL'
      )
    ),

  CONSTRAINT chk_ad_events_type
    CHECK (event_type IN ('IMPRESSION', 'CLICK', 'CONVERSION')),

  CONSTRAINT chk_ad_events_no_financial_consent_snapshot
    CHECK (public.jsonb_has_forbidden_ad_or_audit_keys(consent_snapshot) = false),

  CONSTRAINT chk_ad_events_no_financial_event_context
    CHECK (public.jsonb_has_forbidden_ad_or_audit_keys(event_context) = false),

  CONSTRAINT chk_ad_events_request_id_length
    CHECK (request_id IS NULL OR char_length(request_id) BETWEEN 8 AND 160),

  CONSTRAINT chk_ad_events_session_hash_length
    CHECK (session_hash IS NULL OR length(session_hash) BETWEEN 32 AND 256),

  CONSTRAINT chk_ad_events_device_hash_length
    CHECK (device_hash IS NULL OR length(device_hash) BETWEEN 32 AND 256)
);

COMMENT ON TABLE public.ad_events
IS '광고 노출·클릭·전환 이벤트. user_id는 선택적이며, 탈퇴/삭제 시 NULL 처리 가능해야 한다. 재무 원천 데이터 저장 금지.';

COMMENT ON COLUMN public.ad_events.consent_snapshot
IS '이벤트 발생 시점의 동의 상태 스냅샷. 원문 개인정보 및 재무 원천 데이터 저장 금지.';

COMMENT ON COLUMN public.ad_events.event_context
IS '화면 지면, UI 버전, 비식별 집계 컨텍스트만 저장한다. 급여·소비·저축 원천 데이터 저장 금지.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_ad_events_request_once
  ON public.ad_events (ad_campaign_id, event_type, request_id)
  WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ad_events_campaign
  ON public.ad_events (ad_campaign_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_ad_events_type_time
  ON public.ad_events (event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_ad_events_user_time
  ON public.ad_events (user_id, occurred_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ad_events_placement_time
  ON public.ad_events (placement, occurred_at DESC);

-- -----------------------------------------------------------------------------
-- admin_audit_logs
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  admin_audit_log_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  actor_user_id uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  actor_role_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,

  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,

  before_data jsonb,
  after_data jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  result text NOT NULL DEFAULT 'SUCCESS',
  severity text NOT NULL DEFAULT 'INFO',

  request_id text NOT NULL,
  ip_hash text,
  user_agent_hash text,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_admin_audit_action_length
    CHECK (char_length(trim(action)) BETWEEN 1 AND 180),

  CONSTRAINT chk_admin_audit_target_type
    CHECK (
      target_type IN (
        'USER',
        'ADMIN_ROLE',
        'ADMIN_ROLE_MEMBER',
        'PARTNER_ACCOUNT',
        'AD_CAMPAIGN',
        'AD_EVENT',
        'NOTICE',
        'OPERATIONAL_INCIDENT',
        'COMMUNITY_POST',
        'COMMUNITY_COMMENT',
        'COMMUNITY_REPORT',
        'ATTACHMENT',
        'SYSTEM',
        'DEPLOYMENT',
        'SECURITY_POLICY'
      )
    ),

  CONSTRAINT chk_admin_audit_no_sensitive_before
    CHECK (public.jsonb_has_forbidden_ad_or_audit_keys(before_data) = false),

  CONSTRAINT chk_admin_audit_no_sensitive_after
    CHECK (public.jsonb_has_forbidden_ad_or_audit_keys(after_data) = false),

  CONSTRAINT chk_admin_audit_no_sensitive_metadata
    CHECK (public.jsonb_has_forbidden_ad_or_audit_keys(metadata) = false),

  CONSTRAINT chk_admin_audit_result
    CHECK (result IN ('SUCCESS', 'FAILURE', 'DENIED', 'ROLLBACK', 'SYSTEM')),

  CONSTRAINT chk_admin_audit_severity
    CHECK (severity IN ('INFO', 'NOTICE', 'WARNING', 'CRITICAL')),

  CONSTRAINT chk_admin_audit_request_id_length
    CHECK (char_length(trim(request_id)) BETWEEN 8 AND 160),

  CONSTRAINT chk_admin_audit_ip_hash_length
    CHECK (ip_hash IS NULL OR length(ip_hash) BETWEEN 32 AND 256),

  CONSTRAINT chk_admin_audit_user_agent_hash_length
    CHECK (user_agent_hash IS NULL OR length(user_agent_hash) BETWEEN 32 AND 256)
);

COMMENT ON TABLE public.admin_audit_logs
IS '관리자 운영 감사로그. 권한 변경, 광고/제휴, 공지, 장애 대응, 보안 정책 변경을 장기 보존한다. 민감정보 원문 저장 금지.';

COMMENT ON COLUMN public.admin_audit_logs.before_data
IS '변경 전 데이터. redaction 후 저장하며 급여·지출·저축·납치금액·토큰·이메일·전화번호 원문 저장 금지.';

COMMENT ON COLUMN public.admin_audit_logs.after_data
IS '변경 후 데이터. redaction 후 저장하며 민감정보 원문 저장 금지.';

CREATE INDEX IF NOT EXISTS idx_admin_audit_target
  ON public.admin_audit_logs (target_type, target_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_actor
  ON public.admin_audit_logs (actor_user_id, created_at DESC)
  WHERE actor_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_audit_action_time
  ON public.admin_audit_logs (action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_severity_time
  ON public.admin_audit_logs (severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_request_id
  ON public.admin_audit_logs (request_id);

-- -----------------------------------------------------------------------------
-- notices
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.notices (
  notice_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  author_user_id uuid REFERENCES public.users(user_id) ON DELETE SET NULL,

  audience text NOT NULL DEFAULT 'ALL',
  title text NOT NULL,
  body text NOT NULL,

  status text NOT NULL DEFAULT 'DRAFT',
  is_pinned boolean NOT NULL DEFAULT false,

  published_at timestamptz,
  scheduled_at timestamptz,
  expires_at timestamptz,
  archived_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_notices_audience
    CHECK (audience IN ('ALL', 'USERS', 'ADMINS', 'MARKETING_OPT_IN', 'SECURITY_ONLY')),

  CONSTRAINT chk_notices_title_length
    CHECK (char_length(trim(title)) BETWEEN 1 AND 160),

  CONSTRAINT chk_notices_body_length
    CHECK (char_length(trim(body)) BETWEEN 1 AND 20000),

  CONSTRAINT chk_notices_status
    CHECK (status IN ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'HIDDEN', 'ARCHIVED')),

  CONSTRAINT chk_notices_published_status
    CHECK (published_at IS NULL OR status IN ('PUBLISHED', 'HIDDEN', 'ARCHIVED')),

  CONSTRAINT chk_notices_scheduled_status
    CHECK (scheduled_at IS NULL OR status = 'SCHEDULED'),

  CONSTRAINT chk_notices_expires_after_publish_or_create
    CHECK (
      expires_at IS NULL
      OR expires_at > COALESCE(published_at, scheduled_at, created_at)
    ),

  CONSTRAINT chk_notices_archived_status
    CHECK (archived_at IS NULL OR status = 'ARCHIVED')
);

COMMENT ON TABLE public.notices
IS '서비스 공지. 전체 사용자, 관리자, 보안 공지, 마케팅 동의자 대상 공지를 운영한다.';

CREATE INDEX IF NOT EXISTS idx_notices_status_published
  ON public.notices (status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_notices_audience_status
  ON public.notices (audience, status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_notices_pinned
  ON public.notices (is_pinned DESC, published_at DESC)
  WHERE status = 'PUBLISHED';

DROP TRIGGER IF EXISTS trg_notices_set_updated_at ON public.notices;
CREATE TRIGGER trg_notices_set_updated_at
BEFORE UPDATE ON public.notices
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- operational_incidents
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.operational_incidents (
  incident_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  owner_user_id uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  resolved_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,

  severity text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN',

  affected_area text NOT NULL,
  root_cause text,
  mitigation text,
  rollback_plan text,
  postmortem_url text,
  related_release text,
  request_id text,

  detected_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  mitigated_at timestamptz,
  resolved_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_incidents_severity
    CHECK (severity IN ('SEV1', 'SEV2', 'SEV3', 'SEV4')),

  CONSTRAINT chk_incidents_title_length
    CHECK (char_length(trim(title)) BETWEEN 1 AND 180),

  CONSTRAINT chk_incidents_summary_length
    CHECK (char_length(trim(summary)) BETWEEN 1 AND 5000),

  CONSTRAINT chk_incidents_status
    CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'MITIGATED', 'RESOLVED', 'CANCELLED')),

  CONSTRAINT chk_incidents_affected_area
    CHECK (
      affected_area IN (
        'AUTH',
        'PAYROLL',
        'BUDGET',
        'EXPENSE',
        'SAVINGS',
        'NOTIFICATION',
        'LEVEL_UP',
        'COMMUNITY',
        'ADS_PARTNER',
        'ADMIN',
        'API',
        'DB',
        'INFRA',
        'SECURITY',
        'RELEASE',
        'UNKNOWN'
      )
    ),

  CONSTRAINT chk_incidents_root_cause_length
    CHECK (root_cause IS NULL OR char_length(root_cause) <= 5000),

  CONSTRAINT chk_incidents_mitigation_length
    CHECK (mitigation IS NULL OR char_length(mitigation) <= 5000),

  CONSTRAINT chk_incidents_rollback_plan_length
    CHECK (rollback_plan IS NULL OR char_length(rollback_plan) <= 5000),

  CONSTRAINT chk_incidents_postmortem_url_length
    CHECK (postmortem_url IS NULL OR char_length(postmortem_url) <= 2048),

  CONSTRAINT chk_incidents_related_release_length
    CHECK (related_release IS NULL OR char_length(related_release) <= 160),

  CONSTRAINT chk_incidents_timeline_order
    CHECK (
      (acknowledged_at IS NULL OR acknowledged_at >= detected_at)
      AND (mitigated_at IS NULL OR mitigated_at >= detected_at)
      AND (resolved_at IS NULL OR resolved_at >= detected_at)
    ),

  CONSTRAINT chk_incidents_resolved_status
    CHECK (resolved_at IS NULL OR status IN ('RESOLVED', 'CANCELLED'))
);

COMMENT ON TABLE public.operational_incidents
IS '운영 장애/보안/배포 사고 대응 이력. 탐지, 완화, 롤백, 해결, 사후 분석을 장기 보존한다.';

CREATE INDEX IF NOT EXISTS idx_incidents_status_severity
  ON public.operational_incidents (status, severity, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_incidents_area_status
  ON public.operational_incidents (affected_area, status, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_incidents_owner
  ON public.operational_incidents (owner_user_id, status, detected_at DESC)
  WHERE owner_user_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_operational_incidents_set_updated_at ON public.operational_incidents;
CREATE TRIGGER trg_operational_incidents_set_updated_at
BEFORE UPDATE ON public.operational_incidents
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 광고·제휴 도메인 무결성 함수
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ensure_partner_account_operable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_status text;
  v_terms_accepted boolean;
  v_financial_data_use_allowed boolean;
BEGIN
  SELECT
    pa.status,
    pa.data_processing_terms_accepted,
    pa.financial_data_use_allowed
  INTO
    v_partner_status,
    v_terms_accepted,
    v_financial_data_use_allowed
  FROM public.partner_accounts pa
  WHERE pa.partner_account_id = NEW.partner_account_id;

  IF v_partner_status IS NULL THEN
    RAISE EXCEPTION 'partner_account_id % does not exist', NEW.partner_account_id;
  END IF;

  IF NEW.status IN ('SCHEDULED', 'LIVE') THEN
    IF v_partner_status <> 'ACTIVE' THEN
      RAISE EXCEPTION 'partner_account_id % must be ACTIVE before campaign can be scheduled/live', NEW.partner_account_id;
    END IF;

    IF v_terms_accepted IS NOT TRUE THEN
      RAISE EXCEPTION 'partner_account_id % must accept data processing terms', NEW.partner_account_id;
    END IF;

    IF v_financial_data_use_allowed IS TRUE THEN
      RAISE EXCEPTION 'financial data based targeting is forbidden';
    END IF;

    IF NEW.risk_level = 'HIGH' AND NEW.reviewed_at IS NULL THEN
      RAISE EXCEPTION 'HIGH risk campaign requires reviewed_at';
    END IF;

    IF NEW.consent_requirement IN ('MARKETING', 'ADS_PARTNER', 'ANALYTICS') AND NEW.targeting_policy = 'CONTEXTUAL_ONLY' THEN
      RAISE EXCEPTION 'consent based campaign must not use CONTEXTUAL_ONLY targeting_policy';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.ensure_partner_account_operable()
IS '광고 캠페인 예약/노출 전 파트너 상태, 약관, 금융 원천 데이터 사용 금지, 고위험 검수를 검증한다.';

DROP TRIGGER IF EXISTS trg_ad_campaigns_partner_operable ON public.ad_campaigns;
CREATE TRIGGER trg_ad_campaigns_partner_operable
BEFORE INSERT OR UPDATE OF partner_account_id, status, risk_level, reviewed_at, consent_requirement, targeting_policy
ON public.ad_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.ensure_partner_account_operable();

CREATE OR REPLACE FUNCTION public.ensure_ad_event_policy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign record;
  v_has_ads_consent boolean;
  v_has_marketing_consent boolean;
  v_has_analytics_consent boolean;
BEGIN
  SELECT
    ac.ad_campaign_id,
    ac.status,
    ac.placement,
    ac.start_at,
    ac.end_at,
    ac.consent_requirement
  INTO v_campaign
  FROM public.ad_campaigns ac
  WHERE ac.ad_campaign_id = NEW.ad_campaign_id;

  IF v_campaign.ad_campaign_id IS NULL THEN
    RAISE EXCEPTION 'ad_campaign_id % does not exist', NEW.ad_campaign_id;
  END IF;

  IF NEW.placement <> v_campaign.placement THEN
    RAISE EXCEPTION 'ad_event placement % does not match campaign placement %', NEW.placement, v_campaign.placement;
  END IF;

  IF v_campaign.status <> 'LIVE' AND NOT public.current_app_is_admin() THEN
    RAISE EXCEPTION 'ad campaign % is not LIVE', NEW.ad_campaign_id;
  END IF;

  IF NEW.occurred_at < v_campaign.start_at OR NEW.occurred_at > v_campaign.end_at THEN
    RAISE EXCEPTION 'ad event occurred_at % is outside campaign period', NEW.occurred_at;
  END IF;

  IF NEW.user_id IS NOT NULL
     AND NOT public.current_app_is_admin()
     AND NEW.user_id <> public.current_app_user_id() THEN
    RAISE EXCEPTION 'ad event user_id % does not match current app user', NEW.user_id;
  END IF;

  IF NEW.user_id IS NOT NULL AND v_campaign.consent_requirement <> 'NONE' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.user_consents uc
      WHERE uc.user_id = NEW.user_id
        AND uc.consent_type = 'ADS_PARTNER'
        AND uc.granted = true
        AND uc.revoked_at IS NULL
    )
    INTO v_has_ads_consent;

    SELECT EXISTS (
      SELECT 1
      FROM public.user_consents uc
      WHERE uc.user_id = NEW.user_id
        AND uc.consent_type = 'MARKETING'
        AND uc.granted = true
        AND uc.revoked_at IS NULL
    )
    INTO v_has_marketing_consent;

    SELECT EXISTS (
      SELECT 1
      FROM public.user_consents uc
      WHERE uc.user_id = NEW.user_id
        AND uc.consent_type = 'ANALYTICS'
        AND uc.granted = true
        AND uc.revoked_at IS NULL
    )
    INTO v_has_analytics_consent;

    IF v_campaign.consent_requirement = 'ADS_PARTNER' AND v_has_ads_consent IS NOT TRUE THEN
      RAISE EXCEPTION 'ADS_PARTNER consent is required for this ad event';
    END IF;

    IF v_campaign.consent_requirement = 'MARKETING' AND v_has_marketing_consent IS NOT TRUE THEN
      RAISE EXCEPTION 'MARKETING consent is required for this ad event';
    END IF;

    IF v_campaign.consent_requirement = 'ANALYTICS' AND v_has_analytics_consent IS NOT TRUE THEN
      RAISE EXCEPTION 'ANALYTICS consent is required for this ad event';
    END IF;
  END IF;

  IF public.jsonb_has_forbidden_ad_or_audit_keys(NEW.consent_snapshot) THEN
    RAISE EXCEPTION 'ad_events.consent_snapshot contains forbidden sensitive or financial keys';
  END IF;

  IF public.jsonb_has_forbidden_ad_or_audit_keys(NEW.event_context) THEN
    RAISE EXCEPTION 'ad_events.event_context contains forbidden sensitive or financial keys';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.ensure_ad_event_policy()
IS '광고 이벤트 발생 시 캠페인 상태/기간/지면/동의/재무 원천 데이터 분리 정책을 검증한다.';

DROP TRIGGER IF EXISTS trg_ad_events_policy ON public.ad_events;
CREATE TRIGGER trg_ad_events_policy
BEFORE INSERT OR UPDATE OF ad_campaign_id, user_id, placement, event_type, consent_snapshot, event_context, occurred_at
ON public.ad_events
FOR EACH ROW
EXECUTE FUNCTION public.ensure_ad_event_policy();

-- -----------------------------------------------------------------------------
-- 관리자 감사로그 함수
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_admin_role_snapshot(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'role_key', ar.role_key,
        'name', ar.name
      )
      ORDER BY ar.role_key
    ),
    '[]'::jsonb
  )
  FROM public.admin_role_members arm
  JOIN public.admin_roles ar
    ON ar.admin_role_id = arm.admin_role_id
  WHERE arm.user_id = p_user_id
    AND arm.status = 'ACTIVE'
    AND ar.status = 'ACTIVE'
$$;

COMMENT ON FUNCTION public.get_admin_role_snapshot(uuid)
IS '감사로그 기록 시점의 활성 관리자 역할 스냅샷을 생성한다.';

CREATE OR REPLACE FUNCTION public.write_admin_audit_log(
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_before_data jsonb DEFAULT NULL,
  p_after_data jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_result text DEFAULT 'SUCCESS',
  p_severity text DEFAULT 'INFO'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_user_id uuid;
  v_log_id uuid;
  v_before jsonb;
  v_after jsonb;
  v_metadata jsonb;
BEGIN
  v_actor_user_id := public.current_app_user_id();

  v_before := public.redact_audit_jsonb(p_before_data);
  v_after := public.redact_audit_jsonb(p_after_data);
  v_metadata := public.redact_audit_jsonb(COALESCE(p_metadata, '{}'::jsonb));

  IF public.jsonb_has_forbidden_ad_or_audit_keys(v_before) THEN
    RAISE EXCEPTION 'before_data contains forbidden sensitive or financial keys';
  END IF;

  IF public.jsonb_has_forbidden_ad_or_audit_keys(v_after) THEN
    RAISE EXCEPTION 'after_data contains forbidden sensitive or financial keys';
  END IF;

  IF public.jsonb_has_forbidden_ad_or_audit_keys(v_metadata) THEN
    RAISE EXCEPTION 'metadata contains forbidden sensitive or financial keys';
  END IF;

  INSERT INTO public.admin_audit_logs (
    actor_user_id,
    actor_role_snapshot,
    action,
    target_type,
    target_id,
    before_data,
    after_data,
    metadata,
    result,
    severity,
    request_id,
    ip_hash,
    user_agent_hash,
    created_at
  )
  VALUES (
    v_actor_user_id,
    CASE
      WHEN v_actor_user_id IS NULL THEN '[]'::jsonb
      ELSE public.get_admin_role_snapshot(v_actor_user_id)
    END,
    p_action,
    p_target_type,
    p_target_id,
    v_before,
    v_after,
    COALESCE(v_metadata, '{}'::jsonb),
    p_result,
    p_severity,
    public.current_app_request_id(),
    public.current_app_ip_hash(),
    public.current_app_user_agent_hash(),
    now()
  )
  RETURNING admin_audit_log_id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION public.write_admin_audit_log(text, text, uuid, jsonb, jsonb, jsonb, text, text)
IS '관리자 감사로그를 민감정보 제거 후 기록한다. 광고/운영/공지/장애 대응 변경 trigger에서 사용한다.';

CREATE OR REPLACE FUNCTION public.capture_admin_operational_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_target_type text;
  v_target_id uuid;
  v_before jsonb;
  v_after jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF TG_TABLE_NAME = 'partner_accounts' THEN
      v_target_type := 'PARTNER_ACCOUNT';
      v_target_id := OLD.partner_account_id;
    ELSIF TG_TABLE_NAME = 'ad_campaigns' THEN
      v_target_type := 'AD_CAMPAIGN';
      v_target_id := OLD.ad_campaign_id;
    ELSIF TG_TABLE_NAME = 'notices' THEN
      v_target_type := 'NOTICE';
      v_target_id := OLD.notice_id;
    ELSIF TG_TABLE_NAME = 'operational_incidents' THEN
      v_target_type := 'OPERATIONAL_INCIDENT';
      v_target_id := OLD.incident_id;
    ELSE
      v_target_type := 'SYSTEM';
      v_target_id := NULL;
    END IF;

    v_before := to_jsonb(OLD);
    v_after := NULL;
  ELSE
    IF TG_TABLE_NAME = 'partner_accounts' THEN
      v_target_type := 'PARTNER_ACCOUNT';
      v_target_id := NEW.partner_account_id;
    ELSIF TG_TABLE_NAME = 'ad_campaigns' THEN
      v_target_type := 'AD_CAMPAIGN';
      v_target_id := NEW.ad_campaign_id;
    ELSIF TG_TABLE_NAME = 'notices' THEN
      v_target_type := 'NOTICE';
      v_target_id := NEW.notice_id;
    ELSIF TG_TABLE_NAME = 'operational_incidents' THEN
      v_target_type := 'OPERATIONAL_INCIDENT';
      v_target_id := NEW.incident_id;
    ELSE
      v_target_type := 'SYSTEM';
      v_target_id := NULL;
    END IF;

    IF TG_OP = 'INSERT' THEN
      v_before := NULL;
      v_after := to_jsonb(NEW);
    ELSE
      v_before := to_jsonb(OLD);
      v_after := to_jsonb(NEW);
    END IF;
  END IF;

  v_action := upper(TG_TABLE_NAME || '_' || TG_OP);

  PERFORM public.write_admin_audit_log(
    v_action,
    v_target_type,
    v_target_id,
    v_before,
    v_after,
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'schema', TG_TABLE_SCHEMA
    ),
    'SUCCESS',
    CASE
      WHEN TG_TABLE_NAME = 'operational_incidents' THEN 'WARNING'
      WHEN TG_TABLE_NAME = 'ad_campaigns' THEN 'NOTICE'
      ELSE 'INFO'
    END
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.capture_admin_operational_audit()
IS '관리자 운영 변경 감사로그를 INSERT/UPDATE/DELETE별 OLD/NEW 접근 규칙에 맞게 안전하게 기록한다.';

DROP TRIGGER IF EXISTS trg_partner_accounts_audit ON public.partner_accounts;
CREATE TRIGGER trg_partner_accounts_audit
AFTER INSERT OR UPDATE OR DELETE ON public.partner_accounts
FOR EACH ROW
EXECUTE FUNCTION public.capture_admin_operational_audit();

DROP TRIGGER IF EXISTS trg_ad_campaigns_audit ON public.ad_campaigns;
CREATE TRIGGER trg_ad_campaigns_audit
AFTER INSERT OR UPDATE OR DELETE ON public.ad_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.capture_admin_operational_audit();

DROP TRIGGER IF EXISTS trg_notices_audit ON public.notices;
CREATE TRIGGER trg_notices_audit
AFTER INSERT OR UPDATE OR DELETE ON public.notices
FOR EACH ROW
EXECUTE FUNCTION public.capture_admin_operational_audit();

DROP TRIGGER IF EXISTS trg_operational_incidents_audit ON public.operational_incidents;
CREATE TRIGGER trg_operational_incidents_audit
AFTER INSERT OR UPDATE OR DELETE ON public.operational_incidents
FOR EACH ROW
EXECUTE FUNCTION public.capture_admin_operational_audit();

-- -----------------------------------------------------------------------------
-- 광고/운영 지표 View
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.admin_ad_campaign_metrics
WITH (security_barrier = true)
AS
SELECT
  ac.ad_campaign_id,
  ac.partner_account_id,
  pa.name AS partner_name,
  ac.name AS campaign_name,
  ac.placement,
  ac.status,
  ac.risk_level,
  ac.priority,
  ac.start_at,
  ac.end_at,
  COUNT(ae.ad_event_id) FILTER (WHERE ae.event_type = 'IMPRESSION')::bigint AS impressions,
  COUNT(ae.ad_event_id) FILTER (WHERE ae.event_type = 'CLICK')::bigint AS clicks,
  COUNT(ae.ad_event_id) FILTER (WHERE ae.event_type = 'CONVERSION')::bigint AS conversions,
  CASE
    WHEN COUNT(ae.ad_event_id) FILTER (WHERE ae.event_type = 'IMPRESSION') = 0 THEN 0::numeric
    ELSE ROUND(
      (
        COUNT(ae.ad_event_id) FILTER (WHERE ae.event_type = 'CLICK')::numeric
        /
        COUNT(ae.ad_event_id) FILTER (WHERE ae.event_type = 'IMPRESSION')::numeric
      ) * 100,
      4
    )
  END AS ctr_percent,
  (
    COUNT(ae.ad_event_id) FILTER (WHERE ae.event_type = 'CLICK')::bigint * ac.cost_per_click_krw
    +
    COUNT(ae.ad_event_id) FILTER (WHERE ae.event_type = 'CONVERSION')::bigint * ac.cost_per_conversion_krw
    +
    ac.fixed_fee_krw
  )::bigint AS estimated_revenue_krw
FROM public.ad_campaigns ac
JOIN public.partner_accounts pa
  ON pa.partner_account_id = ac.partner_account_id
LEFT JOIN public.ad_events ae
  ON ae.ad_campaign_id = ac.ad_campaign_id
GROUP BY
  ac.ad_campaign_id,
  ac.partner_account_id,
  pa.name,
  ac.name,
  ac.placement,
  ac.status,
  ac.risk_level,
  ac.priority,
  ac.start_at,
  ac.end_at,
  ac.cost_per_click_krw,
  ac.cost_per_conversion_krw,
  ac.fixed_fee_krw;

COMMENT ON VIEW public.admin_ad_campaign_metrics
IS '관리자 콘솔 광고 캠페인 성과 집계 View. 노출/클릭/전환/CTR/예상매출을 캠페인 단위로 제공한다.';

-- -----------------------------------------------------------------------------
-- RLS / 접근통제
-- -----------------------------------------------------------------------------

ALTER TABLE public.partner_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partner_accounts_admin_all ON public.partner_accounts;
CREATE POLICY partner_accounts_admin_all
ON public.partner_accounts
FOR ALL
USING (public.current_app_is_admin())
WITH CHECK (public.current_app_is_admin());

DROP POLICY IF EXISTS ad_campaigns_admin_all ON public.ad_campaigns;
CREATE POLICY ad_campaigns_admin_all
ON public.ad_campaigns
FOR ALL
USING (public.current_app_is_admin())
WITH CHECK (public.current_app_is_admin());

DROP POLICY IF EXISTS ad_campaigns_active_read ON public.ad_campaigns;
CREATE POLICY ad_campaigns_active_read
ON public.ad_campaigns
FOR SELECT
USING (
  status = 'LIVE'
  AND start_at <= now()
  AND end_at >= now()
);

DROP POLICY IF EXISTS ad_events_owner_select ON public.ad_events;
CREATE POLICY ad_events_owner_select
ON public.ad_events
FOR SELECT
USING (
  public.current_app_is_admin()
  OR user_id = public.current_app_user_id()
);

DROP POLICY IF EXISTS ad_events_owner_insert ON public.ad_events;
CREATE POLICY ad_events_owner_insert
ON public.ad_events
FOR INSERT
WITH CHECK (
  public.current_app_is_admin()
  OR user_id = public.current_app_user_id()
  OR user_id IS NULL
);

DROP POLICY IF EXISTS ad_events_admin_all ON public.ad_events;
CREATE POLICY ad_events_admin_all
ON public.ad_events
FOR ALL
USING (public.current_app_is_admin())
WITH CHECK (public.current_app_is_admin());

DROP POLICY IF EXISTS admin_audit_logs_admin_select ON public.admin_audit_logs;
CREATE POLICY admin_audit_logs_admin_select
ON public.admin_audit_logs
FOR SELECT
USING (public.current_app_is_admin());

DROP POLICY IF EXISTS admin_audit_logs_admin_insert ON public.admin_audit_logs;
CREATE POLICY admin_audit_logs_admin_insert
ON public.admin_audit_logs
FOR INSERT
WITH CHECK (public.current_app_is_admin());

DROP POLICY IF EXISTS notices_public_read ON public.notices;
CREATE POLICY notices_public_read
ON public.notices
FOR SELECT
USING (
  status = 'PUBLISHED'
  AND (published_at IS NULL OR published_at <= now())
  AND (expires_at IS NULL OR expires_at > now())
  AND audience IN ('ALL', 'USERS', 'MARKETING_OPT_IN', 'SECURITY_ONLY')
);

DROP POLICY IF EXISTS notices_admin_all ON public.notices;
CREATE POLICY notices_admin_all
ON public.notices
FOR ALL
USING (public.current_app_is_admin())
WITH CHECK (public.current_app_is_admin());

DROP POLICY IF EXISTS incidents_admin_all ON public.operational_incidents;
CREATE POLICY incidents_admin_all
ON public.operational_incidents
FOR ALL
USING (public.current_app_is_admin())
WITH CHECK (public.current_app_is_admin());

COMMENT ON POLICY partner_accounts_admin_all ON public.partner_accounts
IS '광고·제휴 파트너 계정은 관리자만 조회·변경한다.';

COMMENT ON POLICY ad_campaigns_active_read ON public.ad_campaigns
IS '일반 앱 서버 컨텍스트는 현재 노출 가능한 LIVE 캠페인만 조회할 수 있다.';

COMMENT ON POLICY ad_events_owner_insert ON public.ad_events
IS '광고 이벤트는 본인 이벤트 또는 익명 이벤트만 삽입 가능하며, 관리자 서버 컨텍스트는 전체 삽입 가능하다.';

COMMENT ON POLICY admin_audit_logs_admin_select ON public.admin_audit_logs
IS '감사로그는 관리자만 조회한다. 일반 사용자 직접 조회 금지.';

COMMENT ON POLICY notices_public_read ON public.notices
IS '발행된 공지만 일반 사용자가 조회할 수 있다. 관리자 공지는 관리자 정책으로만 조회한다.';

-- -----------------------------------------------------------------------------
-- 기본 내부 파트너 Seed
-- 재실행 안정성 보장:
--   1. contract_reference partial unique index를 기준으로 중복을 방지한다.
--   2. 재실행 시 내부 파트너 계정을 중복 삽입하지 않고 운영 기준값만 갱신한다.
--   3. 감사 trigger는 seed 변경도 system audit으로 남긴다.
-- -----------------------------------------------------------------------------

INSERT INTO public.partner_accounts (
  name,
  business_type,
  status,
  contact_email,
  privacy_contact_email,
  contract_reference,
  settlement_currency,
  data_processing_terms_accepted,
  financial_data_use_allowed,
  reviewed_at,
  approved_at
)
VALUES (
  'Salary Hijacking Internal Ops',
  'INTERNAL',
  'ACTIVE',
  'ops@salary-hijacking.internal',
  'privacy@salary-hijacking.internal',
  'internal-ops',
  'KRW',
  true,
  false,
  now(),
  now()
)
ON CONFLICT (contract_reference) WHERE contract_reference IS NOT NULL
DO UPDATE
SET
  name = EXCLUDED.name,
  business_type = EXCLUDED.business_type,
  status = EXCLUDED.status,
  contact_email = EXCLUDED.contact_email,
  privacy_contact_email = EXCLUDED.privacy_contact_email,
  settlement_currency = EXCLUDED.settlement_currency,
  data_processing_terms_accepted = EXCLUDED.data_processing_terms_accepted,
  financial_data_use_allowed = false,
  reviewed_at = COALESCE(public.partner_accounts.reviewed_at, EXCLUDED.reviewed_at),
  approved_at = COALESCE(public.partner_accounts.approved_at, EXCLUDED.approved_at),
  updated_at = now();

COMMIT;
