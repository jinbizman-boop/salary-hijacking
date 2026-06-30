-- database/migrations/0001_init_users.sql
-- 급여납치 사용자·인증·동의·기기·관리자 RBAC 기초 마이그레이션
-- 기준 DB: Neon PostgreSQL / PostgreSQL
-- 기준 시간대: Asia/Seoul
-- 설계 원칙:
--   1. 서버 권위 API를 통한 사용자 소유권 검증
--   2. 개인정보 최소 수집 및 원문 로그 금지
--   3. 푸시 토큰·IP·User-Agent는 원문이 아닌 해시/마스킹 기준
--   4. 광고·제휴 동의와 재무 원천 데이터 분리
--   5. 관리자 RBAC와 향후 감사로그 마이그레이션의 기반 제공
--   6. 모든 주요 row는 created_at / updated_at / soft revoke 또는 soft delete 기준 보유

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
SET LOCAL idle_in_transaction_session_timeout = '120s';
SET LOCAL timezone = 'Asia/Seoul';

-- -----------------------------------------------------------------------------
-- 공통 함수
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_updated_at()
IS '급여납치 공통 updated_at 자동 갱신 trigger 함수';

CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid
$$;

COMMENT ON FUNCTION public.current_app_user_id()
IS '서버 API가 SET LOCAL app.current_user_id로 주입한 현재 사용자 ID를 반환한다.';

CREATE OR REPLACE FUNCTION public.current_app_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('app.is_admin', true), '')::boolean, false)
$$;

COMMENT ON FUNCTION public.current_app_is_admin()
IS '서버 API가 RBAC 검증 후 SET LOCAL app.is_admin으로 주입한 관리자 컨텍스트를 반환한다.';

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.users (
  user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  email text,
  email_verified_at timestamptz,

  phone_number text,
  phone_number_hash text,
  phone_verified_at timestamptz,

  nickname text NOT NULL DEFAULT '급여납치러',
  status text NOT NULL DEFAULT 'ACTIVE',

  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  CONSTRAINT chk_users_email_format
    CHECK (
      email IS NULL
      OR email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
    ),

  CONSTRAINT chk_users_phone_hash_length
    CHECK (
      phone_number_hash IS NULL
      OR length(phone_number_hash) BETWEEN 32 AND 256
    ),

  CONSTRAINT chk_users_nickname_length
    CHECK (char_length(trim(nickname)) BETWEEN 1 AND 40),

  CONSTRAINT chk_users_status
    CHECK (status IN ('ACTIVE', 'SUSPENDED', 'WITHDRAWN', 'DELETED')),

  CONSTRAINT chk_users_deleted_status
    CHECK (
      deleted_at IS NULL
      OR status IN ('WITHDRAWN', 'DELETED')
    )
);

COMMENT ON TABLE public.users
IS '급여납치 사용자 계정의 기준 테이블. 급여·예산·지출·저축 등 모든 사용자 소유 데이터의 루트 엔티티다.';

COMMENT ON COLUMN public.users.user_id IS '사용자 PK. 모든 사용자 소유 데이터의 FK 기준.';
COMMENT ON COLUMN public.users.email IS '로그인/알림용 이메일. 공개 로그 출력 금지.';
COMMENT ON COLUMN public.users.phone_number IS '선택 전화번호. 원문 로그·이슈·PR 첨부 금지.';
COMMENT ON COLUMN public.users.phone_number_hash IS '전화번호 검색·중복 검사용 해시. 원문 대신 사용.';
COMMENT ON COLUMN public.users.nickname IS '앱 내부 표시 닉네임.';
COMMENT ON COLUMN public.users.status IS 'ACTIVE, SUSPENDED, WITHDRAWN, DELETED.';
COMMENT ON COLUMN public.users.deleted_at IS '탈퇴/삭제 시각. soft delete와 익명화 기준.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_active
  ON public.users ((lower(email)))
  WHERE email IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_status_created
  ON public.users (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_last_login
  ON public.users (last_login_at DESC)
  WHERE last_login_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_phone_hash
  ON public.users (phone_number_hash)
  WHERE phone_number_hash IS NOT NULL AND deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_users_set_updated_at ON public.users;
CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- auth_identities
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.auth_identities (
  identity_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,

  provider text NOT NULL,
  provider_user_key text NOT NULL,
  email text,

  linked_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_auth_provider
    CHECK (provider IN ('EMAIL', 'PASSWORD', 'GOOGLE', 'APPLE', 'KAKAO', 'NAVER')),

  CONSTRAINT chk_auth_provider_user_key_length
    CHECK (char_length(trim(provider_user_key)) BETWEEN 1 AND 512),

  CONSTRAINT chk_auth_email_format
    CHECK (
      email IS NULL
      OR email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
    ),

  CONSTRAINT chk_auth_revoked_after_linked
    CHECK (revoked_at IS NULL OR revoked_at >= linked_at)
);

COMMENT ON TABLE public.auth_identities
IS '사용자의 이메일/소셜 로그인 식별자 연결 테이블. provider_user_key는 인증 제공자 기준 식별자다.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_auth_provider_key
  ON public.auth_identities (provider, provider_user_key);

CREATE INDEX IF NOT EXISTS idx_auth_identities_user
  ON public.auth_identities (user_id, linked_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_identities_active_user
  ON public.auth_identities (user_id, provider)
  WHERE revoked_at IS NULL;

DROP TRIGGER IF EXISTS trg_auth_identities_set_updated_at ON public.auth_identities;
CREATE TRIGGER trg_auth_identities_set_updated_at
BEFORE UPDATE ON public.auth_identities
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- user_profiles
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_profiles (
  profile_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,

  display_name text NOT NULL,
  job_title text,
  profile_image_url text,
  bio text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_user_profiles_user UNIQUE (user_id),

  CONSTRAINT chk_user_profiles_display_name_length
    CHECK (char_length(trim(display_name)) BETWEEN 1 AND 60),

  CONSTRAINT chk_user_profiles_job_title_length
    CHECK (job_title IS NULL OR char_length(job_title) <= 80),

  CONSTRAINT chk_user_profiles_bio_length
    CHECK (bio IS NULL OR char_length(bio) <= 500),

  CONSTRAINT chk_user_profiles_image_url_length
    CHECK (profile_image_url IS NULL OR char_length(profile_image_url) <= 2048)
);

COMMENT ON TABLE public.user_profiles
IS '사용자 공개/앱 표시 프로필. 커뮤니티 익명 표시 시 직접 노출하지 않는다.';

CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name
  ON public.user_profiles (display_name);

DROP TRIGGER IF EXISTS trg_user_profiles_set_updated_at ON public.user_profiles;
CREATE TRIGGER trg_user_profiles_set_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- user_settings
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_settings (
  setting_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,

  push_enabled boolean NOT NULL DEFAULT true,
  budget_alert_enabled boolean NOT NULL DEFAULT true,
  fixed_payment_alert_enabled boolean NOT NULL DEFAULT true,
  growth_alert_enabled boolean NOT NULL DEFAULT true,
  community_alert_enabled boolean NOT NULL DEFAULT true,
  marketing_opt_in boolean NOT NULL DEFAULT false,

  timezone text NOT NULL DEFAULT 'Asia/Seoul',
  locale text NOT NULL DEFAULT 'ko-KR',
  currency_code char(3) NOT NULL DEFAULT 'KRW',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_user_settings_user UNIQUE (user_id),

  CONSTRAINT chk_user_settings_timezone
    CHECK (timezone = 'Asia/Seoul'),

  CONSTRAINT chk_user_settings_locale
    CHECK (locale IN ('ko-KR')),

  CONSTRAINT chk_user_settings_currency
    CHECK (currency_code = 'KRW')
);

COMMENT ON TABLE public.user_settings
IS '사용자 알림·마케팅·시간대·통화 설정. 급여납치 기준 시간대는 Asia/Seoul, 통화는 KRW다.';

DROP TRIGGER IF EXISTS trg_user_settings_set_updated_at ON public.user_settings;
CREATE TRIGGER trg_user_settings_set_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- user_consents
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_consents (
  consent_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,

  consent_type text NOT NULL,
  granted boolean NOT NULL,
  consent_version text NOT NULL DEFAULT 'v1',
  source text NOT NULL DEFAULT 'APP',
  ip_hash text,
  user_agent_hash text,

  granted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_user_consents_type
    CHECK (
      consent_type IN (
        'TERMS_OF_SERVICE',
        'PRIVACY_POLICY',
        'PUSH_NOTIFICATION',
        'MARKETING',
        'ANALYTICS',
        'ADS_PARTNER',
        'COMMUNITY_POLICY',
        'ADMIN_OPERATION_NOTICE'
      )
    ),

  CONSTRAINT chk_user_consents_source
    CHECK (source IN ('APP', 'ADMIN', 'WEB', 'MIGRATION', 'API')),

  CONSTRAINT chk_user_consents_version_length
    CHECK (char_length(trim(consent_version)) BETWEEN 1 AND 50),

  CONSTRAINT chk_user_consents_ip_hash_length
    CHECK (ip_hash IS NULL OR length(ip_hash) BETWEEN 32 AND 256),

  CONSTRAINT chk_user_consents_user_agent_hash_length
    CHECK (user_agent_hash IS NULL OR length(user_agent_hash) BETWEEN 32 AND 256),

  CONSTRAINT chk_user_consents_grant_revoke_time
    CHECK (
      (granted = true AND granted_at IS NOT NULL)
      OR (granted = false AND revoked_at IS NOT NULL)
    )
);

COMMENT ON TABLE public.user_consents
IS '약관, 개인정보, 푸시, 마케팅, 분석, 광고/제휴 동의 이력. 광고 데이터는 이 동의 이력을 기준으로만 처리한다.';

CREATE INDEX IF NOT EXISTS idx_user_consents_user_type_time
  ON public.user_consents (user_id, consent_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_consents_latest_granted
  ON public.user_consents (user_id, consent_type, granted, created_at DESC);

-- -----------------------------------------------------------------------------
-- user_devices
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_devices (
  device_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,

  platform text NOT NULL,
  push_token_hash text,
  device_fingerprint_hash text,
  app_version text,
  os_version text,
  status text NOT NULL DEFAULT 'ACTIVE',

  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,

  CONSTRAINT chk_user_devices_platform
    CHECK (platform IN ('IOS', 'ANDROID', 'WEB', 'ADMIN_WEB', 'UNKNOWN')),

  CONSTRAINT chk_user_devices_status
    CHECK (status IN ('ACTIVE', 'REVOKED', 'EXPIRED', 'BLOCKED')),

  CONSTRAINT chk_user_devices_push_token_hash_length
    CHECK (push_token_hash IS NULL OR length(push_token_hash) BETWEEN 32 AND 512),

  CONSTRAINT chk_user_devices_fingerprint_hash_length
    CHECK (device_fingerprint_hash IS NULL OR length(device_fingerprint_hash) BETWEEN 32 AND 512),

  CONSTRAINT chk_user_devices_app_version_length
    CHECK (app_version IS NULL OR char_length(app_version) <= 80),

  CONSTRAINT chk_user_devices_os_version_length
    CHECK (os_version IS NULL OR char_length(os_version) <= 120),

  CONSTRAINT chk_user_devices_revoked_status
    CHECK (
      revoked_at IS NULL
      OR status IN ('REVOKED', 'EXPIRED', 'BLOCKED')
    )
);

COMMENT ON TABLE public.user_devices
IS '사용자 기기 및 푸시 발송 대상. 푸시 토큰 원문은 저장하지 않고 hash 또는 안전 저장소 참조만 저장한다.';

CREATE INDEX IF NOT EXISTS idx_user_devices_user_status
  ON public.user_devices (user_id, status, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_devices_push_token_hash
  ON public.user_devices (push_token_hash)
  WHERE push_token_hash IS NOT NULL AND status = 'ACTIVE';

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_devices_fingerprint_active
  ON public.user_devices (user_id, device_fingerprint_hash)
  WHERE device_fingerprint_hash IS NOT NULL AND status = 'ACTIVE';

DROP TRIGGER IF EXISTS trg_user_devices_set_updated_at ON public.user_devices;
CREATE TRIGGER trg_user_devices_set_updated_at
BEFORE UPDATE ON public.user_devices
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- admin_roles
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.admin_roles (
  admin_role_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  role_key text NOT NULL,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'ACTIVE',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_admin_roles_role_key UNIQUE (role_key),

  CONSTRAINT chk_admin_roles_role_key
    CHECK (role_key ~ '^[a-z][a-z0-9_]{2,63}$'),

  CONSTRAINT chk_admin_roles_name_length
    CHECK (char_length(trim(name)) BETWEEN 1 AND 80),

  CONSTRAINT chk_admin_roles_status
    CHECK (status IN ('ACTIVE', 'DISABLED', 'DELETED'))
);

COMMENT ON TABLE public.admin_roles
IS '관리자 RBAC 역할 정의. admin_audit_logs, 운영 콘솔, 배포 승인 정책의 기반이다.';

DROP TRIGGER IF EXISTS trg_admin_roles_set_updated_at ON public.admin_roles;
CREATE TRIGGER trg_admin_roles_set_updated_at
BEFORE UPDATE ON public.admin_roles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- admin_role_members
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.admin_role_members (
  admin_role_member_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_role_id uuid NOT NULL REFERENCES public.admin_roles(admin_role_id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,

  status text NOT NULL DEFAULT 'ACTIVE',
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_admin_role_members_status
    CHECK (status IN ('ACTIVE', 'REVOKED', 'SUSPENDED')),

  CONSTRAINT chk_admin_role_members_revoked_status
    CHECK (
      revoked_at IS NULL
      OR status IN ('REVOKED', 'SUSPENDED')
    ),

  CONSTRAINT chk_admin_role_members_revoked_after_assigned
    CHECK (revoked_at IS NULL OR revoked_at >= assigned_at)
);

COMMENT ON TABLE public.admin_role_members
IS '관리자 역할 멤버십. 활성 역할 중복 부여를 방지하고 권한 해제 이력을 보존한다.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_role_members_active
  ON public.admin_role_members (admin_role_id, user_id)
  WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_admin_role_members_user_status
  ON public.admin_role_members (user_id, status, assigned_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_role_members_role_status
  ON public.admin_role_members (admin_role_id, status, assigned_at DESC);

DROP TRIGGER IF EXISTS trg_admin_role_members_set_updated_at ON public.admin_role_members;
CREATE TRIGGER trg_admin_role_members_set_updated_at
BEFORE UPDATE ON public.admin_role_members
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 기본 관리자 역할 Seed
-- 실제 운영 관리자 부여는 별도 보안 승인 절차와 admin_audit_logs 생성 후 수행한다.
-- -----------------------------------------------------------------------------

INSERT INTO public.admin_roles (role_key, name, description, status)
VALUES
  ('owner', '최고 운영자', '조직/보안/릴리즈 최상위 승인 권한', 'ACTIVE'),
  ('platform_admin', '플랫폼 관리자', 'CI/CD, 인프라, 배포, 환경변수 운영 권한', 'ACTIVE'),
  ('security_admin', '보안 관리자', '개인정보, 인증·인가, 취약점, 감사 정책 검토 권한', 'ACTIVE'),
  ('backend_admin', '백엔드 관리자', 'API, DB, 서버 권위 계산, scheduler 운영 권한', 'ACTIVE'),
  ('product_admin', '제품 관리자', '기획, 화면, QA, 공지, 운영 정책 관리 권한', 'ACTIVE'),
  ('support_admin', 'CS 운영자', '문의, 신고, 공지, 사용자 지원 운영 권한', 'ACTIVE'),
  ('ads_admin', '광고·제휴 운영자', '광고/제휴 캠페인 운영 및 동의 정책 확인 권한', 'ACTIVE')
ON CONFLICT (role_key) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- RLS / 접근통제
-- 서버 API는 요청별로 SET LOCAL app.current_user_id, app.is_admin을 주입해야 한다.
-- 클라이언트가 DB에 직접 접근하는 구조는 허용하지 않는다.
-- -----------------------------------------------------------------------------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_owner_select ON public.users;
CREATE POLICY users_owner_select
ON public.users
FOR SELECT
USING (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS users_owner_update ON public.users;
CREATE POLICY users_owner_update
ON public.users
FOR UPDATE
USING (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
)
WITH CHECK (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS auth_identities_owner_all ON public.auth_identities;
CREATE POLICY auth_identities_owner_all
ON public.auth_identities
FOR ALL
USING (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
)
WITH CHECK (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS user_profiles_owner_all ON public.user_profiles;
CREATE POLICY user_profiles_owner_all
ON public.user_profiles
FOR ALL
USING (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
)
WITH CHECK (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS user_settings_owner_all ON public.user_settings;
CREATE POLICY user_settings_owner_all
ON public.user_settings
FOR ALL
USING (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
)
WITH CHECK (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS user_consents_owner_all ON public.user_consents;
CREATE POLICY user_consents_owner_all
ON public.user_consents
FOR ALL
USING (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
)
WITH CHECK (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS user_devices_owner_all ON public.user_devices;
CREATE POLICY user_devices_owner_all
ON public.user_devices
FOR ALL
USING (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
)
WITH CHECK (
  user_id = public.current_app_user_id()
  OR public.current_app_is_admin()
);

DROP POLICY IF EXISTS admin_roles_admin_read ON public.admin_roles;
CREATE POLICY admin_roles_admin_read
ON public.admin_roles
FOR SELECT
USING (public.current_app_is_admin());

DROP POLICY IF EXISTS admin_role_members_admin_all ON public.admin_role_members;
CREATE POLICY admin_role_members_admin_all
ON public.admin_role_members
FOR ALL
USING (public.current_app_is_admin())
WITH CHECK (public.current_app_is_admin());

-- -----------------------------------------------------------------------------
-- 감사·보안·운영 코멘트
-- -----------------------------------------------------------------------------

COMMENT ON POLICY users_owner_select ON public.users
IS '본인 또는 관리자만 사용자 row를 조회할 수 있다.';

COMMENT ON POLICY users_owner_update ON public.users
IS '본인 또는 관리자만 사용자 row를 수정할 수 있다. 가입 insert는 서버 권위 API/마이그레이션 권한에서 수행한다.';

COMMENT ON POLICY user_consents_owner_all ON public.user_consents
IS '동의 이력은 사용자 본인 또는 관리자 권한에서만 접근한다. 광고·제휴 처리는 이 동의 이력을 기준으로 한다.';

COMMENT ON POLICY user_devices_owner_all ON public.user_devices
IS '푸시 기기 정보는 사용자 본인 또는 관리자 권한에서만 접근한다. push_token 원문 저장은 금지한다.';

COMMENT ON POLICY admin_role_members_admin_all ON public.admin_role_members
IS '관리자 역할 부여·해제는 RBAC 검증된 관리자 컨텍스트에서만 허용한다.';

COMMIT;
