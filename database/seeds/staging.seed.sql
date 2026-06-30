-- database/seeds/staging.seed.sql
-- 급여납치 Staging QA/시연용 시드 데이터 최종본
-- 기준 DB: Neon PostgreSQL / PostgreSQL
-- 기준 시간대: Asia/Seoul
-- 기준 마이그레이션: 0001_init_users.sql ~ 0004_admin_audit_ads.sql
--
-- 목적:
--   1. staging 환경에서 앱/관리자/API/E2E 검증에 필요한 최소-충분한 데이터 제공
--   2. 사용자, 인증, 프로필, 설정, 동의, 기기, 관리자 RBAC seed 제공
--   3. 급여계획, 고정지출, 고정저축, 일일예산, 변동지출 seed 제공
--   4. 서버 권위 계산 trigger와 snapshot 생성을 검증할 수 있는 관계 데이터 제공
--   5. 알림, LV UP, 커뮤니티, 댓글, 반응, 신고, 첨부 seed 제공
--   6. 광고/제휴, 광고 이벤트, 공지, 장애 대응, 관리자 감사로그 seed 제공
--   7. 재실행해도 중복 누적이 발생하지 않는 deterministic UUID/idempotency/upsert 정책 적용
--   8. 실제 개인정보·실제 재무 원천 데이터·토큰 원문·secret 원문 저장 금지
--
-- 운영 원칙:
--   - production DB에서 실행 금지
--   - staging/preview/e2e DB에서만 실행
--   - 0001~0004 마이그레이션 적용 후 실행
--   - seed 데이터는 실제 고객 데이터가 아닌 합성 데이터만 사용
--   - 광고/제휴 이벤트에는 급여액, 지출액, 저축액, 납치금액 원천 데이터를 저장하지 않음

BEGIN;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '180s';
SET LOCAL idle_in_transaction_session_timeout = '180s';
SET LOCAL timezone = 'Asia/Seoul';

SET LOCAL app.current_user_id = '10000000-0000-4000-8000-000000000001';
SET LOCAL app.is_admin = 'true';
SET LOCAL app.request_id = 'staging-seed-10000000-0000-4000-8000-000000000001';
SET LOCAL app.ip_hash = '1111111111111111111111111111111111111111111111111111111111111111';
SET LOCAL app.user_agent_hash = '2222222222222222222222222222222222222222222222222222222222222222';

-- -----------------------------------------------------------------------------
-- 0. 선행 스키마 계약 검증
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE EXCEPTION 'staging.seed.sql requires 0001_init_users.sql';
  END IF;

  IF to_regclass('public.payroll_plans') IS NULL THEN
    RAISE EXCEPTION 'staging.seed.sql requires 0002_payroll_budget_expense.sql';
  END IF;

  IF to_regclass('public.notifications') IS NULL THEN
    RAISE EXCEPTION 'staging.seed.sql requires 0003_growth_community_notifications.sql';
  END IF;

  IF to_regclass('public.ad_campaigns') IS NULL THEN
    RAISE EXCEPTION 'staging.seed.sql requires 0004_admin_audit_ads.sql';
  END IF;

  IF to_regprocedure('public.current_app_user_id()') IS NULL THEN
    RAISE EXCEPTION 'staging.seed.sql requires public.current_app_user_id()';
  END IF;

  IF to_regprocedure('public.current_app_is_admin()') IS NULL THEN
    RAISE EXCEPTION 'staging.seed.sql requires public.current_app_is_admin()';
  END IF;

  IF to_regprocedure('public.recalculate_payroll_plan(uuid,text)') IS NULL THEN
    RAISE EXCEPTION 'staging.seed.sql requires public.recalculate_payroll_plan(uuid,text)';
  END IF;

  IF to_regprocedure('public.recalculate_user_growth_stats(uuid)') IS NULL THEN
    RAISE EXCEPTION 'staging.seed.sql requires public.recalculate_user_growth_stats(uuid)';
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 1. 사용자 / 인증 / 프로필 / 설정
-- -----------------------------------------------------------------------------

INSERT INTO public.users (
  user_id,
  email,
  email_verified_at,
  phone_number,
  phone_number_hash,
  phone_verified_at,
  nickname,
  status,
  last_login_at
)
VALUES
  (
    '10000000-0000-4000-8000-000000000001',
    'staging.admin@example.invalid',
    now(),
    NULL,
    encode(digest('staging-admin-phone-hash-seed', 'sha256'), 'hex'),
    now(),
    'Staging 관리자',
    'ACTIVE',
    now()
  ),
  (
    '10000000-0000-4000-8000-000000000101',
    'staging.user.one@example.invalid',
    now(),
    NULL,
    encode(digest('staging-user-one-phone-hash-seed', 'sha256'), 'hex'),
    now(),
    '스테이징 월급수호자',
    'ACTIVE',
    now()
  ),
  (
    '10000000-0000-4000-8000-000000000102',
    'staging.user.two@example.invalid',
    now(),
    NULL,
    encode(digest('staging-user-two-phone-hash-seed', 'sha256'), 'hex'),
    now(),
    '스테이징 예산러',
    'ACTIVE',
    now()
  )
ON CONFLICT (user_id) DO UPDATE
SET
  email = EXCLUDED.email,
  email_verified_at = EXCLUDED.email_verified_at,
  phone_number = NULL,
  phone_number_hash = EXCLUDED.phone_number_hash,
  phone_verified_at = EXCLUDED.phone_verified_at,
  nickname = EXCLUDED.nickname,
  status = EXCLUDED.status,
  last_login_at = EXCLUDED.last_login_at,
  updated_at = now();

INSERT INTO public.auth_identities (
  identity_id,
  user_id,
  provider,
  provider_user_key,
  email,
  linked_at,
  revoked_at
)
VALUES
  (
    '10000000-0000-4000-8000-000000000201',
    '10000000-0000-4000-8000-000000000001',
    'EMAIL',
    'staging-admin@example.invalid',
    'staging.admin@example.invalid',
    now(),
    NULL
  ),
  (
    '10000000-0000-4000-8000-000000000202',
    '10000000-0000-4000-8000-000000000101',
    'EMAIL',
    'staging-user-one@example.invalid',
    'staging.user.one@example.invalid',
    now(),
    NULL
  ),
  (
    '10000000-0000-4000-8000-000000000203',
    '10000000-0000-4000-8000-000000000102',
    'EMAIL',
    'staging-user-two@example.invalid',
    'staging.user.two@example.invalid',
    now(),
    NULL
  )
ON CONFLICT (provider, provider_user_key) DO UPDATE
SET
  user_id = EXCLUDED.user_id,
  email = EXCLUDED.email,
  revoked_at = NULL,
  updated_at = now();

INSERT INTO public.user_profiles (
  profile_id,
  user_id,
  display_name,
  job_title,
  profile_image_url,
  bio
)
VALUES
  (
    '10000000-0000-4000-8000-000000000301',
    '10000000-0000-4000-8000-000000000001',
    'Staging Admin',
    'Platform QA Admin',
    NULL,
    '스테이징 관리자 합성 계정입니다.'
  ),
  (
    '10000000-0000-4000-8000-000000000302',
    '10000000-0000-4000-8000-000000000101',
    '월급수호자',
    'QA Persona A',
    NULL,
    '급여계획, 일일예산, 알림, 광고 동의 플로우 검증용 합성 사용자입니다.'
  ),
  (
    '10000000-0000-4000-8000-000000000303',
    '10000000-0000-4000-8000-000000000102',
    '예산러',
    'QA Persona B',
    NULL,
    '예산 초과, 커뮤니티, LV UP 검증용 합성 사용자입니다.'
  )
ON CONFLICT (user_id) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  job_title = EXCLUDED.job_title,
  profile_image_url = NULL,
  bio = EXCLUDED.bio,
  updated_at = now();

INSERT INTO public.user_settings (
  setting_id,
  user_id,
  push_enabled,
  budget_alert_enabled,
  fixed_payment_alert_enabled,
  growth_alert_enabled,
  community_alert_enabled,
  marketing_opt_in,
  timezone,
  locale,
  currency_code
)
VALUES
  (
    '10000000-0000-4000-8000-000000000401',
    '10000000-0000-4000-8000-000000000001',
    true,
    true,
    true,
    true,
    true,
    false,
    'Asia/Seoul',
    'ko-KR',
    'KRW'
  ),
  (
    '10000000-0000-4000-8000-000000000402',
    '10000000-0000-4000-8000-000000000101',
    true,
    true,
    true,
    true,
    true,
    true,
    'Asia/Seoul',
    'ko-KR',
    'KRW'
  ),
  (
    '10000000-0000-4000-8000-000000000403',
    '10000000-0000-4000-8000-000000000102',
    true,
    true,
    true,
    true,
    true,
    false,
    'Asia/Seoul',
    'ko-KR',
    'KRW'
  )
ON CONFLICT (user_id) DO UPDATE
SET
  push_enabled = EXCLUDED.push_enabled,
  budget_alert_enabled = EXCLUDED.budget_alert_enabled,
  fixed_payment_alert_enabled = EXCLUDED.fixed_payment_alert_enabled,
  growth_alert_enabled = EXCLUDED.growth_alert_enabled,
  community_alert_enabled = EXCLUDED.community_alert_enabled,
  marketing_opt_in = EXCLUDED.marketing_opt_in,
  timezone = EXCLUDED.timezone,
  locale = EXCLUDED.locale,
  currency_code = EXCLUDED.currency_code,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- 2. 동의 / 기기 / 관리자 RBAC
-- -----------------------------------------------------------------------------

WITH seed_consents (
  user_id,
  consent_type,
  granted,
  consent_version,
  source,
  ip_hash,
  user_agent_hash,
  granted_at,
  revoked_at
) AS (
  VALUES
    ('10000000-0000-4000-8000-000000000001'::uuid, 'TERMS_OF_SERVICE', true, 'staging-v1', 'ADMIN', encode(digest('staging-admin-ip', 'sha256'), 'hex'), encode(digest('staging-admin-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('10000000-0000-4000-8000-000000000001'::uuid, 'PRIVACY_POLICY', true, 'staging-v1', 'ADMIN', encode(digest('staging-admin-ip', 'sha256'), 'hex'), encode(digest('staging-admin-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),

    ('10000000-0000-4000-8000-000000000101'::uuid, 'TERMS_OF_SERVICE', true, 'staging-v1', 'APP', encode(digest('staging-user-one-ip', 'sha256'), 'hex'), encode(digest('staging-user-one-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('10000000-0000-4000-8000-000000000101'::uuid, 'PRIVACY_POLICY', true, 'staging-v1', 'APP', encode(digest('staging-user-one-ip', 'sha256'), 'hex'), encode(digest('staging-user-one-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('10000000-0000-4000-8000-000000000101'::uuid, 'PUSH_NOTIFICATION', true, 'staging-v1', 'APP', encode(digest('staging-user-one-ip', 'sha256'), 'hex'), encode(digest('staging-user-one-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('10000000-0000-4000-8000-000000000101'::uuid, 'MARKETING', true, 'staging-v1', 'APP', encode(digest('staging-user-one-ip', 'sha256'), 'hex'), encode(digest('staging-user-one-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('10000000-0000-4000-8000-000000000101'::uuid, 'ANALYTICS', true, 'staging-v1', 'APP', encode(digest('staging-user-one-ip', 'sha256'), 'hex'), encode(digest('staging-user-one-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('10000000-0000-4000-8000-000000000101'::uuid, 'ADS_PARTNER', true, 'staging-v1', 'APP', encode(digest('staging-user-one-ip', 'sha256'), 'hex'), encode(digest('staging-user-one-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('10000000-0000-4000-8000-000000000101'::uuid, 'COMMUNITY_POLICY', true, 'staging-v1', 'APP', encode(digest('staging-user-one-ip', 'sha256'), 'hex'), encode(digest('staging-user-one-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),

    ('10000000-0000-4000-8000-000000000102'::uuid, 'TERMS_OF_SERVICE', true, 'staging-v1', 'APP', encode(digest('staging-user-two-ip', 'sha256'), 'hex'), encode(digest('staging-user-two-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('10000000-0000-4000-8000-000000000102'::uuid, 'PRIVACY_POLICY', true, 'staging-v1', 'APP', encode(digest('staging-user-two-ip', 'sha256'), 'hex'), encode(digest('staging-user-two-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('10000000-0000-4000-8000-000000000102'::uuid, 'PUSH_NOTIFICATION', true, 'staging-v1', 'APP', encode(digest('staging-user-two-ip', 'sha256'), 'hex'), encode(digest('staging-user-two-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('10000000-0000-4000-8000-000000000102'::uuid, 'ANALYTICS', true, 'staging-v1', 'APP', encode(digest('staging-user-two-ip', 'sha256'), 'hex'), encode(digest('staging-user-two-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('10000000-0000-4000-8000-000000000102'::uuid, 'COMMUNITY_POLICY', true, 'staging-v1', 'APP', encode(digest('staging-user-two-ip', 'sha256'), 'hex'), encode(digest('staging-user-two-agent', 'sha256'), 'hex'), now(), NULL::timestamptz)
)
INSERT INTO public.user_consents (
  user_id,
  consent_type,
  granted,
  consent_version,
  source,
  ip_hash,
  user_agent_hash,
  granted_at,
  revoked_at
)
SELECT
  sc.user_id,
  sc.consent_type,
  sc.granted,
  sc.consent_version,
  sc.source,
  sc.ip_hash,
  sc.user_agent_hash,
  sc.granted_at,
  sc.revoked_at
FROM seed_consents sc
WHERE NOT EXISTS (
  SELECT 1
  FROM public.user_consents uc
  WHERE uc.user_id = sc.user_id
    AND uc.consent_type = sc.consent_type
    AND uc.consent_version = sc.consent_version
    AND uc.source = sc.source
    AND uc.granted = sc.granted
);

INSERT INTO public.user_devices (
  device_id,
  user_id,
  platform,
  push_token_hash,
  device_fingerprint_hash,
  app_version,
  os_version,
  status,
  last_seen_at
)
VALUES
  (
    '10000000-0000-4000-8000-000000000501',
    '10000000-0000-4000-8000-000000000101',
    'IOS',
    encode(digest('staging-user-one-push-token', 'sha256'), 'hex'),
    encode(digest('staging-user-one-ios-device', 'sha256'), 'hex'),
    '1.0.0-staging',
    'iOS 18',
    'ACTIVE',
    now()
  ),
  (
    '10000000-0000-4000-8000-000000000502',
    '10000000-0000-4000-8000-000000000102',
    'ANDROID',
    encode(digest('staging-user-two-push-token', 'sha256'), 'hex'),
    encode(digest('staging-user-two-android-device', 'sha256'), 'hex'),
    '1.0.0-staging',
    'Android 15',
    'ACTIVE',
    now()
  ),
  (
    '10000000-0000-4000-8000-000000000503',
    '10000000-0000-4000-8000-000000000001',
    'ADMIN_WEB',
    NULL,
    encode(digest('staging-admin-web-device', 'sha256'), 'hex'),
    'admin-staging',
    'Chrome',
    'ACTIVE',
    now()
  )
ON CONFLICT (device_id) DO UPDATE
SET
  push_token_hash = EXCLUDED.push_token_hash,
  device_fingerprint_hash = EXCLUDED.device_fingerprint_hash,
  app_version = EXCLUDED.app_version,
  os_version = EXCLUDED.os_version,
  status = EXCLUDED.status,
  last_seen_at = EXCLUDED.last_seen_at,
  updated_at = now();

INSERT INTO public.admin_role_members (
  admin_role_member_id,
  admin_role_id,
  user_id,
  status,
  assigned_at,
  assigned_by
)
SELECT
  '10000000-0000-4000-8000-000000000601'::uuid,
  ar.admin_role_id,
  '10000000-0000-4000-8000-000000000001'::uuid,
  'ACTIVE',
  now(),
  '10000000-0000-4000-8000-000000000001'::uuid
FROM public.admin_roles ar
WHERE ar.role_key = 'owner'
  AND NOT EXISTS (
    SELECT 1
    FROM public.admin_role_members arm
    WHERE arm.admin_role_id = ar.admin_role_id
      AND arm.user_id = '10000000-0000-4000-8000-000000000001'::uuid
      AND arm.status = 'ACTIVE'
  );

-- -----------------------------------------------------------------------------
-- 3. 급여계획 / 고정지출 / 고정저축 / 일일예산 / 변동지출
-- -----------------------------------------------------------------------------

INSERT INTO public.payroll_plans (
  payroll_plan_id,
  user_id,
  year_month,
  payday,
  expected_salary_amount,
  target_hijack_amount,
  status
)
VALUES
  (
    '10000000-0000-4000-8000-000000001001',
    '10000000-0000-4000-8000-000000000101',
    '2026-06',
    25,
    3300000,
    950000,
    'ACTIVE'
  ),
  (
    '10000000-0000-4000-8000-000000001002',
    '10000000-0000-4000-8000-000000000102',
    '2026-06',
    10,
    4200000,
    1250000,
    'ACTIVE'
  )
ON CONFLICT (user_id, year_month) WHERE status = 'ACTIVE'
DO UPDATE
SET
  payday = EXCLUDED.payday,
  expected_salary_amount = EXCLUDED.expected_salary_amount,
  target_hijack_amount = EXCLUDED.target_hijack_amount,
  updated_at = now();

WITH seed_fixed (
  fixed_expense_id,
  user_id,
  year_month,
  expense_day,
  category,
  name,
  amount,
  recurrence_type,
  status
) AS (
  VALUES
    ('10000000-0000-4000-8000-000000001101'::uuid, '10000000-0000-4000-8000-000000000101'::uuid, '2026-06'::char(7), 1::smallint, 'RENT', '스테이징 월세', 680000::bigint, 'MONTHLY', 'SCHEDULED'),
    ('10000000-0000-4000-8000-000000001102'::uuid, '10000000-0000-4000-8000-000000000101'::uuid, '2026-06'::char(7), 5::smallint, 'TELECOM', '스테이징 통신비', 65000::bigint, 'MONTHLY', 'PAID'),
    ('10000000-0000-4000-8000-000000001103'::uuid, '10000000-0000-4000-8000-000000000102'::uuid, '2026-06'::char(7), 3::smallint, 'LOAN', '스테이징 대출상환', 260000::bigint, 'MONTHLY', 'SCHEDULED'),
    ('10000000-0000-4000-8000-000000001104'::uuid, '10000000-0000-4000-8000-000000000102'::uuid, '2026-06'::char(7), 7::smallint, 'INSURANCE', '스테이징 보험료', 82000::bigint, 'MONTHLY', 'PAID')
)
INSERT INTO public.fixed_expenses (
  fixed_expense_id,
  user_id,
  payroll_plan_id,
  expense_day,
  category,
  name,
  amount,
  recurrence_type,
  status,
  paid_at
)
SELECT
  sf.fixed_expense_id,
  sf.user_id,
  pp.payroll_plan_id,
  sf.expense_day,
  sf.category,
  sf.name,
  sf.amount,
  sf.recurrence_type,
  sf.status,
  CASE WHEN sf.status = 'PAID' THEN now() ELSE NULL END
FROM seed_fixed sf
JOIN public.payroll_plans pp
  ON pp.user_id = sf.user_id
 AND pp.year_month = sf.year_month
 AND pp.status = 'ACTIVE'
ON CONFLICT (fixed_expense_id) DO UPDATE
SET
  expense_day = EXCLUDED.expense_day,
  category = EXCLUDED.category,
  name = EXCLUDED.name,
  amount = EXCLUDED.amount,
  recurrence_type = EXCLUDED.recurrence_type,
  status = EXCLUDED.status,
  paid_at = EXCLUDED.paid_at,
  updated_at = now();

WITH seed_savings (
  savings_plan_id,
  user_id,
  year_month,
  saving_day,
  category,
  name,
  amount,
  recurrence_type,
  status
) AS (
  VALUES
    ('10000000-0000-4000-8000-000000001201'::uuid, '10000000-0000-4000-8000-000000000101'::uuid, '2026-06'::char(7), 25::smallint, 'SAVINGS', '스테이징 선저축', 520000::bigint, 'MONTHLY', 'TRANSFERRED'),
    ('10000000-0000-4000-8000-000000001202'::uuid, '10000000-0000-4000-8000-000000000101'::uuid, '2026-06'::char(7), 25::smallint, 'EMERGENCY_FUND', '스테이징 비상금', 180000::bigint, 'MONTHLY', 'SCHEDULED'),
    ('10000000-0000-4000-8000-000000001203'::uuid, '10000000-0000-4000-8000-000000000102'::uuid, '2026-06'::char(7), 10::smallint, 'INVESTMENT', '스테이징 ETF', 650000::bigint, 'MONTHLY', 'TRANSFERRED'),
    ('10000000-0000-4000-8000-000000001204'::uuid, '10000000-0000-4000-8000-000000000102'::uuid, '2026-06'::char(7), 10::smallint, 'PENSION', '스테이징 연금저축', 280000::bigint, 'MONTHLY', 'SCHEDULED')
)
INSERT INTO public.savings_plans (
  savings_plan_id,
  user_id,
  payroll_plan_id,
  saving_day,
  category,
  name,
  amount,
  recurrence_type,
  status,
  transferred_at
)
SELECT
  ss.savings_plan_id,
  ss.user_id,
  pp.payroll_plan_id,
  ss.saving_day,
  ss.category,
  ss.name,
  ss.amount,
  ss.recurrence_type,
  ss.status,
  CASE WHEN ss.status = 'TRANSFERRED' THEN now() ELSE NULL END
FROM seed_savings ss
JOIN public.payroll_plans pp
  ON pp.user_id = ss.user_id
 AND pp.year_month = ss.year_month
 AND pp.status = 'ACTIVE'
ON CONFLICT (savings_plan_id) DO UPDATE
SET
  saving_day = EXCLUDED.saving_day,
  category = EXCLUDED.category,
  name = EXCLUDED.name,
  amount = EXCLUDED.amount,
  recurrence_type = EXCLUDED.recurrence_type,
  status = EXCLUDED.status,
  transferred_at = EXCLUDED.transferred_at,
  updated_at = now();

INSERT INTO public.daily_budgets (
  daily_budget_id,
  user_id,
  budget_date,
  daily_limit_amount,
  used_amount,
  remaining_amount,
  over_amount,
  status,
  calculated_at
)
VALUES
  ('10000000-0000-4000-8000-000000001301', '10000000-0000-4000-8000-000000000101', '2026-06-15', 36000, 0, 36000, 0, 'OPEN', now()),
  ('10000000-0000-4000-8000-000000001302', '10000000-0000-4000-8000-000000000101', '2026-06-16', 36000, 0, 36000, 0, 'OPEN', now()),
  ('10000000-0000-4000-8000-000000001303', '10000000-0000-4000-8000-000000000102', '2026-06-15', 46000, 0, 46000, 0, 'OPEN', now()),
  ('10000000-0000-4000-8000-000000001304', '10000000-0000-4000-8000-000000000102', '2026-06-16', 46000, 0, 46000, 0, 'OPEN', now())
ON CONFLICT (user_id, budget_date) DO UPDATE
SET
  daily_limit_amount = EXCLUDED.daily_limit_amount,
  used_amount = 0,
  remaining_amount = EXCLUDED.daily_limit_amount,
  over_amount = 0,
  status = 'OPEN',
  calculated_at = now(),
  updated_at = now();

WITH seed_variable (
  variable_expense_id,
  user_id,
  budget_date,
  spent_at,
  category,
  merchant_name,
  memo,
  amount,
  idempotency_key
) AS (
  VALUES
    ('10000000-0000-4000-8000-000000001401'::uuid, '10000000-0000-4000-8000-000000000101'::uuid, '2026-06-15'::date, '2026-06-15 08:30:00+09'::timestamptz, 'FOOD', '스테이징 식당 A', '아침 식사 QA', 7000::bigint, 'staging-seed-u1-20260615-food'),
    ('10000000-0000-4000-8000-000000001402'::uuid, '10000000-0000-4000-8000-000000000101'::uuid, '2026-06-15'::date, '2026-06-15 12:40:00+09'::timestamptz, 'CAFE', '스테이징 카페 A', '커피 QA', 4800::bigint, 'staging-seed-u1-20260615-cafe'),
    ('10000000-0000-4000-8000-000000001403'::uuid, '10000000-0000-4000-8000-000000000101'::uuid, '2026-06-16'::date, '2026-06-16 19:10:00+09'::timestamptz, 'TRANSPORT', '스테이징 교통', '교통비 QA', 1550::bigint, 'staging-seed-u1-20260616-transport'),
    ('10000000-0000-4000-8000-000000001404'::uuid, '10000000-0000-4000-8000-000000000102'::uuid, '2026-06-15'::date, '2026-06-15 13:20:00+09'::timestamptz, 'FOOD', '스테이징 식당 B', '점심 QA', 9000::bigint, 'staging-seed-u2-20260615-food'),
    ('10000000-0000-4000-8000-000000001405'::uuid, '10000000-0000-4000-8000-000000000102'::uuid, '2026-06-16'::date, '2026-06-16 20:30:00+09'::timestamptz, 'CULTURE', '스테이징 강의', '자기계발 QA', 24000::bigint, 'staging-seed-u2-20260616-education')
)
INSERT INTO public.variable_expenses (
  variable_expense_id,
  user_id,
  daily_budget_id,
  spent_at,
  category,
  merchant_name,
  memo,
  amount,
  status,
  idempotency_key
)
SELECT
  sv.variable_expense_id,
  sv.user_id,
  db.daily_budget_id,
  sv.spent_at,
  sv.category,
  sv.merchant_name,
  sv.memo,
  sv.amount,
  'ACTIVE',
  sv.idempotency_key
FROM seed_variable sv
JOIN public.daily_budgets db
  ON db.user_id = sv.user_id
 AND db.budget_date = sv.budget_date
ON CONFLICT (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL
DO UPDATE
SET
  daily_budget_id = EXCLUDED.daily_budget_id,
  spent_at = EXCLUDED.spent_at,
  category = EXCLUDED.category,
  merchant_name = EXCLUDED.merchant_name,
  memo = EXCLUDED.memo,
  amount = EXCLUDED.amount,
  status = 'ACTIVE',
  updated_at = now();

-- -----------------------------------------------------------------------------
-- 4. 알림 / 알림 발송 이력
-- -----------------------------------------------------------------------------

INSERT INTO public.notifications (
  notification_id,
  user_id,
  type,
  title,
  body,
  target_screen,
  target_id,
  payload,
  status,
  priority,
  scheduled_at,
  sent_at,
  read_at,
  expires_at
)
VALUES
  (
    '10000000-0000-4000-8000-000000002001',
    '10000000-0000-4000-8000-000000000101',
    'PAYDAY',
    '스테이징 월급 계획 확인',
    '이번 달 급여 계획과 선저축 목표를 확인하세요.',
    'PLAN',
    '10000000-0000-4000-8000-000000001001',
    jsonb_build_object('yearMonth', '2026-06', 'source', 'staging_seed'),
    'READ',
    2,
    '2026-06-15 09:00:00+09',
    '2026-06-15 09:00:10+09',
    '2026-06-15 09:05:00+09',
    '2026-12-31 23:59:59+09'
  ),
  (
    '10000000-0000-4000-8000-000000002002',
    '10000000-0000-4000-8000-000000000101',
    'BUDGET_REMAINING',
    '오늘 예산을 확인하세요',
    '오늘 남은 예산과 지출 흐름을 확인하세요.',
    'DAILY_BUDGET',
    '10000000-0000-4000-8000-000000001302',
    jsonb_build_object('budgetDate', '2026-06-16', 'source', 'staging_seed'),
    'SENT',
    4,
    '2026-06-16 08:00:00+09',
    '2026-06-16 08:00:05+09',
    NULL,
    '2026-12-31 23:59:59+09'
  ),
  (
    '10000000-0000-4000-8000-000000002003',
    '10000000-0000-4000-8000-000000000102',
    'GROWTH_TASK',
    '스테이징 LV UP 미션',
    '오늘의 자기계발 미션을 완료하고 경험치를 획득하세요.',
    'LEVEL_UP',
    NULL,
    jsonb_build_object('mission', 'NEWS', 'source', 'staging_seed'),
    'SENT',
    5,
    '2026-06-16 07:30:00+09',
    '2026-06-16 07:30:05+09',
    NULL,
    '2026-12-31 23:59:59+09'
  )
ON CONFLICT (notification_id) DO UPDATE
SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  payload = EXCLUDED.payload,
  status = EXCLUDED.status,
  priority = EXCLUDED.priority,
  scheduled_at = EXCLUDED.scheduled_at,
  sent_at = EXCLUDED.sent_at,
  read_at = EXCLUDED.read_at,
  expires_at = EXCLUDED.expires_at,
  updated_at = now();

INSERT INTO public.notification_deliveries (
  delivery_id,
  notification_id,
  device_id,
  provider,
  channel,
  status,
  provider_message_id,
  failure_reason,
  attempt_count,
  attempted_at,
  delivered_at,
  failed_at
)
VALUES
  (
    '10000000-0000-4000-8000-000000002101',
    '10000000-0000-4000-8000-000000002001',
    '10000000-0000-4000-8000-000000000501',
    'EXPO',
    'PUSH',
    'DELIVERED',
    'staging-expo-message-001',
    NULL,
    1,
    '2026-06-15 09:00:09+09',
    '2026-06-15 09:00:12+09',
    NULL
  ),
  (
    '10000000-0000-4000-8000-000000002102',
    '10000000-0000-4000-8000-000000002002',
    '10000000-0000-4000-8000-000000000501',
    'EXPO',
    'PUSH',
    'DELIVERED',
    'staging-expo-message-002',
    NULL,
    1,
    '2026-06-16 08:00:04+09',
    '2026-06-16 08:00:08+09',
    NULL
  ),
  (
    '10000000-0000-4000-8000-000000002103',
    '10000000-0000-4000-8000-000000002003',
    '10000000-0000-4000-8000-000000000502',
    'EXPO',
    'PUSH',
    'DELIVERED',
    'staging-expo-message-003',
    NULL,
    1,
    '2026-06-16 07:30:04+09',
    '2026-06-16 07:30:08+09',
    NULL
  )
ON CONFLICT (delivery_id) DO UPDATE
SET
  status = EXCLUDED.status,
  provider_message_id = EXCLUDED.provider_message_id,
  failure_reason = NULL,
  attempt_count = EXCLUDED.attempt_count,
  attempted_at = EXCLUDED.attempted_at,
  delivered_at = EXCLUDED.delivered_at,
  failed_at = NULL,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- 5. LV UP 완료 이력
-- -----------------------------------------------------------------------------

WITH task_pick AS (
  SELECT DISTINCT ON (type)
    growth_task_id,
    type,
    exp_reward
  FROM public.growth_tasks
  WHERE status = 'ACTIVE'
    AND type IN ('READING', 'NEWS', 'ENGLISH', 'HEALTH')
  ORDER BY type, active_from ASC
),
seed_growth (
  completion_id,
  user_id,
  type,
  completion_date,
  proof_text
) AS (
  VALUES
    (
      '10000000-0000-4000-8000-000000002201'::uuid,
      '10000000-0000-4000-8000-000000000101'::uuid,
      'READING',
      '2026-06-15'::date,
      '스테이징 독서 미션 완료: 소비 전 체크리스트를 정리했다.'
    ),
    (
      '10000000-0000-4000-8000-000000002202'::uuid,
      '10000000-0000-4000-8000-000000000101'::uuid,
      'HEALTH',
      '2026-06-16'::date,
      '스테이징 건강 미션 완료: 20분 홈트 루틴을 완료했다.'
    ),
    (
      '10000000-0000-4000-8000-000000002203'::uuid,
      '10000000-0000-4000-8000-000000000102'::uuid,
      'NEWS',
      '2026-06-15'::date,
      '스테이징 뉴스 미션 완료: 경제 뉴스 요약을 작성했다.'
    ),
    (
      '10000000-0000-4000-8000-000000002204'::uuid,
      '10000000-0000-4000-8000-000000000102'::uuid,
      'ENGLISH',
      '2026-06-16'::date,
      '스테이징 영어 미션 완료: 예산 관련 문장을 학습했다.'
    )
)
INSERT INTO public.growth_task_completions (
  completion_id,
  user_id,
  growth_task_id,
  completion_date,
  earned_exp,
  proof_text,
  status,
  completed_at
)
SELECT
  sg.completion_id,
  sg.user_id,
  tp.growth_task_id,
  sg.completion_date,
  tp.exp_reward,
  sg.proof_text,
  'COMPLETED',
  (sg.completion_date::text || ' 21:00:00+09')::timestamptz
FROM seed_growth sg
JOIN task_pick tp
  ON tp.type = sg.type
ON CONFLICT (user_id, growth_task_id, completion_date) WHERE status = 'COMPLETED'
DO UPDATE
SET
  earned_exp = EXCLUDED.earned_exp,
  proof_text = EXCLUDED.proof_text,
  status = 'COMPLETED',
  completed_at = EXCLUDED.completed_at,
  revoked_at = NULL,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- 6. 커뮤니티 / 댓글 / 반응 / 신고 / 첨부
-- -----------------------------------------------------------------------------

INSERT INTO public.community_posts (
  post_id,
  user_id,
  board_type,
  title,
  body,
  is_anonymous,
  is_question,
  is_pinned,
  status
)
VALUES
  (
    '10000000-0000-4000-8000-000000003001',
    '10000000-0000-4000-8000-000000000101',
    'MONEY_TIP',
    '스테이징 선저축 팁 공유',
    '월급이 들어오면 고정저축과 비상금을 먼저 분리하는 QA 시나리오입니다.',
    false,
    false,
    false,
    'PUBLISHED'
  ),
  (
    '10000000-0000-4000-8000-000000003002',
    '10000000-0000-4000-8000-000000000102',
    'QUESTION',
    '스테이징 일일예산 초과 질문',
    '일일예산 초과 상태를 화면과 API에서 검증하기 위한 질문 게시글입니다.',
    true,
    true,
    false,
    'PUBLISHED'
  ),
  (
    '10000000-0000-4000-8000-000000003003',
    '10000000-0000-4000-8000-000000000101',
    'LEVEL_UP_PROOF',
    '스테이징 LV UP 인증',
    '독서와 건강 루틴 완료를 검증하기 위한 인증 게시글입니다.',
    false,
    false,
    false,
    'PUBLISHED'
  )
ON CONFLICT (post_id) DO UPDATE
SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  is_anonymous = EXCLUDED.is_anonymous,
  is_question = EXCLUDED.is_question,
  is_pinned = EXCLUDED.is_pinned,
  status = EXCLUDED.status,
  deleted_at = NULL,
  updated_at = now();

INSERT INTO public.community_comments (
  comment_id,
  post_id,
  user_id,
  parent_comment_id,
  body,
  is_anonymous,
  status
)
VALUES
  (
    '10000000-0000-4000-8000-000000003101',
    '10000000-0000-4000-8000-000000003001',
    '10000000-0000-4000-8000-000000000102',
    NULL,
    '스테이징 댓글: 선저축 우선순위 검증에 좋습니다.',
    false,
    'ACTIVE'
  ),
  (
    '10000000-0000-4000-8000-000000003102',
    '10000000-0000-4000-8000-000000003002',
    '10000000-0000-4000-8000-000000000101',
    NULL,
    '스테이징 댓글: 주간 단위로 예산을 조정하는 시나리오를 추천합니다.',
    false,
    'ACTIVE'
  ),
  (
    '10000000-0000-4000-8000-000000003103',
    '10000000-0000-4000-8000-000000003002',
    '10000000-0000-4000-8000-000000000102',
    '10000000-0000-4000-8000-000000003102',
    '스테이징 대댓글: 주간 조정 방식으로 QA하겠습니다.',
    true,
    'ACTIVE'
  )
ON CONFLICT (comment_id) DO UPDATE
SET
  body = EXCLUDED.body,
  is_anonymous = EXCLUDED.is_anonymous,
  status = EXCLUDED.status,
  deleted_at = NULL,
  updated_at = now();

INSERT INTO public.community_reactions (
  reaction_id,
  user_id,
  target_type,
  target_id,
  reaction_type
)
VALUES
  ('10000000-0000-4000-8000-000000003201', '10000000-0000-4000-8000-000000000102', 'POST', '10000000-0000-4000-8000-000000003001', 'LIKE'),
  ('10000000-0000-4000-8000-000000003202', '10000000-0000-4000-8000-000000000101', 'POST', '10000000-0000-4000-8000-000000003002', 'LIKE'),
  ('10000000-0000-4000-8000-000000003203', '10000000-0000-4000-8000-000000000101', 'COMMENT', '10000000-0000-4000-8000-000000003103', 'LIKE'),
  ('10000000-0000-4000-8000-000000003204', '10000000-0000-4000-8000-000000000102', 'POST', '10000000-0000-4000-8000-000000003003', 'BOOKMARK')
ON CONFLICT (user_id, target_type, target_id, reaction_type) DO NOTHING;

INSERT INTO public.community_reports (
  report_id,
  reporter_user_id,
  target_type,
  target_id,
  reason_code,
  detail,
  status,
  resolved_by,
  resolution_note,
  resolved_at
)
VALUES
  (
    '10000000-0000-4000-8000-000000003301',
    '10000000-0000-4000-8000-000000000101',
    'POST',
    '10000000-0000-4000-8000-000000003002',
    'OTHER',
    '스테이징 신고 처리 QA 샘플입니다.',
    'RESOLVED',
    '10000000-0000-4000-8000-000000000001',
    '스테이징 정책 위반 없음으로 처리했습니다.',
    now()
  )
ON CONFLICT (report_id) DO UPDATE
SET
  detail = EXCLUDED.detail,
  status = EXCLUDED.status,
  resolved_by = EXCLUDED.resolved_by,
  resolution_note = EXCLUDED.resolution_note,
  resolved_at = EXCLUDED.resolved_at,
  updated_at = now();

INSERT INTO public.attachments (
  attachment_id,
  owner_type,
  owner_id,
  file_url,
  storage_key,
  mime_type,
  file_size,
  checksum_sha256,
  status,
  created_by
)
VALUES
  (
    '10000000-0000-4000-8000-000000003401',
    'COMMUNITY_POST',
    '10000000-0000-4000-8000-000000003003',
    'https://assets.example.invalid/staging/community/lv-up-proof.webp',
    'staging/community/lv-up-proof.webp',
    'image/webp',
    204800,
    repeat('c', 64),
    'ACTIVE',
    '10000000-0000-4000-8000-000000000101'
  )
ON CONFLICT (attachment_id) DO UPDATE
SET
  file_url = EXCLUDED.file_url,
  storage_key = EXCLUDED.storage_key,
  mime_type = EXCLUDED.mime_type,
  file_size = EXCLUDED.file_size,
  checksum_sha256 = EXCLUDED.checksum_sha256,
  status = EXCLUDED.status,
  deleted_at = NULL;

-- -----------------------------------------------------------------------------
-- 7. 광고/제휴 / 광고 이벤트 / 공지 / 장애 대응
-- -----------------------------------------------------------------------------

INSERT INTO public.partner_accounts (
  partner_account_id,
  name,
  business_type,
  status,
  contact_email,
  privacy_contact_email,
  contract_reference,
  settlement_currency,
  data_processing_terms_accepted,
  financial_data_use_allowed,
  created_by,
  updated_by,
  reviewed_by,
  reviewed_at,
  approved_at
)
VALUES (
  '10000000-0000-4000-8000-000000004001',
  'Salary Hijacking Staging Partner',
  'INTERNAL',
  'ACTIVE',
  'staging.partner@example.invalid',
  'privacy.staging.partner@example.invalid',
  'staging-seed-partner',
  'KRW',
  true,
  false,
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
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
  updated_by = EXCLUDED.updated_by,
  reviewed_by = EXCLUDED.reviewed_by,
  reviewed_at = COALESCE(public.partner_accounts.reviewed_at, EXCLUDED.reviewed_at),
  approved_at = COALESCE(public.partner_accounts.approved_at, EXCLUDED.approved_at),
  updated_at = now();

INSERT INTO public.ad_campaigns (
  ad_campaign_id,
  partner_account_id,
  name,
  placement,
  image_url,
  landing_url,
  start_at,
  end_at,
  status,
  priority,
  targeting_policy,
  targeting_payload,
  consent_requirement,
  risk_level,
  revenue_model,
  cost_per_click_krw,
  cost_per_conversion_krw,
  fixed_fee_krw,
  daily_impression_cap,
  total_impression_cap,
  review_note,
  created_by,
  updated_by,
  reviewed_by,
  approved_by,
  reviewed_at,
  approved_at
)
SELECT
  '10000000-0000-4000-8000-000000004101'::uuid,
  pa.partner_account_id,
  '스테이징 LV UP 제휴 배너',
  'LEVEL_UP',
  'https://assets.example.invalid/staging/ads/lv-up-banner.webp',
  'https://staging.example.invalid/partners/lv-up',
  '2026-01-01 00:00:00+09'::timestamptz,
  '2026-12-31 23:59:59+09'::timestamptz,
  'LIVE',
  10,
  'CONSENT_BASED',
  jsonb_build_object('context', 'level_up', 'segment', 'staging_non_sensitive_segment'),
  'ADS_PARTNER',
  'LOW',
  'CPC',
  120,
  0,
  0,
  1000,
  50000,
  '스테이징 QA용 광고 캠페인입니다. 재무 원천 데이터 타겟팅 없음.',
  '10000000-0000-4000-8000-000000000001'::uuid,
  '10000000-0000-4000-8000-000000000001'::uuid,
  '10000000-0000-4000-8000-000000000001'::uuid,
  '10000000-0000-4000-8000-000000000001'::uuid,
  now(),
  now()
FROM public.partner_accounts pa
WHERE pa.contract_reference = 'staging-seed-partner'
ON CONFLICT (ad_campaign_id) DO UPDATE
SET
  name = EXCLUDED.name,
  placement = EXCLUDED.placement,
  image_url = EXCLUDED.image_url,
  landing_url = EXCLUDED.landing_url,
  start_at = EXCLUDED.start_at,
  end_at = EXCLUDED.end_at,
  status = EXCLUDED.status,
  priority = EXCLUDED.priority,
  targeting_policy = EXCLUDED.targeting_policy,
  targeting_payload = EXCLUDED.targeting_payload,
  consent_requirement = EXCLUDED.consent_requirement,
  risk_level = EXCLUDED.risk_level,
  revenue_model = EXCLUDED.revenue_model,
  cost_per_click_krw = EXCLUDED.cost_per_click_krw,
  cost_per_conversion_krw = EXCLUDED.cost_per_conversion_krw,
  fixed_fee_krw = EXCLUDED.fixed_fee_krw,
  daily_impression_cap = EXCLUDED.daily_impression_cap,
  total_impression_cap = EXCLUDED.total_impression_cap,
  review_note = EXCLUDED.review_note,
  updated_by = EXCLUDED.updated_by,
  reviewed_by = EXCLUDED.reviewed_by,
  approved_by = EXCLUDED.approved_by,
  reviewed_at = COALESCE(public.ad_campaigns.reviewed_at, EXCLUDED.reviewed_at),
  approved_at = COALESCE(public.ad_campaigns.approved_at, EXCLUDED.approved_at),
  updated_at = now();

INSERT INTO public.ad_events (
  ad_event_id,
  ad_campaign_id,
  user_id,
  placement,
  event_type,
  consent_snapshot,
  event_context,
  request_id,
  session_hash,
  device_hash,
  occurred_at
)
VALUES
  (
    '10000000-0000-4000-8000-000000004201',
    '10000000-0000-4000-8000-000000004101',
    '10000000-0000-4000-8000-000000000101',
    'LEVEL_UP',
    'IMPRESSION',
    jsonb_build_object('ADS_PARTNER', true, 'version', 'staging-v1'),
    jsonb_build_object('screen', 'LEVEL_UP', 'source', 'staging_seed'),
    'staging-ad-event-impression-0001',
    encode(digest('staging-u1-session-ad-1', 'sha256'), 'hex'),
    encode(digest('staging-u1-device-ad-1', 'sha256'), 'hex'),
    '2026-06-16 10:00:00+09'
  ),
  (
    '10000000-0000-4000-8000-000000004202',
    '10000000-0000-4000-8000-000000004101',
    '10000000-0000-4000-8000-000000000101',
    'LEVEL_UP',
    'CLICK',
    jsonb_build_object('ADS_PARTNER', true, 'version', 'staging-v1'),
    jsonb_build_object('screen', 'LEVEL_UP', 'source', 'staging_seed'),
    'staging-ad-event-click-0001',
    encode(digest('staging-u1-session-ad-1', 'sha256'), 'hex'),
    encode(digest('staging-u1-device-ad-1', 'sha256'), 'hex'),
    '2026-06-16 10:00:05+09'
  )
ON CONFLICT (ad_campaign_id, event_type, request_id) WHERE request_id IS NOT NULL
DO NOTHING;

INSERT INTO public.notices (
  notice_id,
  author_user_id,
  audience,
  title,
  body,
  status,
  is_pinned,
  published_at,
  expires_at
)
VALUES (
  '10000000-0000-4000-8000-000000004301',
  '10000000-0000-4000-8000-000000000001',
  'ALL',
  '스테이징 환경 공지',
  '이 공지는 스테이징 seed 데이터로 생성된 샘플 공지입니다.',
  'PUBLISHED',
  true,
  now(),
  '2026-12-31 23:59:59+09'
)
ON CONFLICT (notice_id) DO UPDATE
SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  status = EXCLUDED.status,
  is_pinned = EXCLUDED.is_pinned,
  published_at = EXCLUDED.published_at,
  expires_at = EXCLUDED.expires_at,
  updated_at = now();

INSERT INTO public.operational_incidents (
  incident_id,
  owner_user_id,
  created_by,
  resolved_by,
  severity,
  title,
  summary,
  status,
  affected_area,
  root_cause,
  mitigation,
  rollback_plan,
  postmortem_url,
  related_release,
  request_id,
  detected_at,
  acknowledged_at,
  mitigated_at,
  resolved_at
)
VALUES (
  '10000000-0000-4000-8000-000000004401',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'SEV4',
  '스테이징 seed 검증용 운영 이벤트',
  '스테이징 환경에서 장애 대응 화면과 감사로그 검색을 검증하기 위한 합성 이벤트입니다.',
  'RESOLVED',
  'INFRA',
  '스테이징 QA seed 데이터 생성',
  '영향 없음. 합성 데이터로 확인 완료.',
  'rollback 불필요. 필요 시 staging DB reset.',
  'https://staging.example.invalid/postmortems/staging-seed',
  'staging-seed-v1',
  'staging-seed-incident-0001',
  '2026-06-16 09:00:00+09',
  '2026-06-16 09:05:00+09',
  '2026-06-16 09:10:00+09',
  '2026-06-16 09:15:00+09'
)
ON CONFLICT (incident_id) DO UPDATE
SET
  owner_user_id = EXCLUDED.owner_user_id,
  resolved_by = EXCLUDED.resolved_by,
  severity = EXCLUDED.severity,
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  status = EXCLUDED.status,
  affected_area = EXCLUDED.affected_area,
  root_cause = EXCLUDED.root_cause,
  mitigation = EXCLUDED.mitigation,
  rollback_plan = EXCLUDED.rollback_plan,
  postmortem_url = EXCLUDED.postmortem_url,
  related_release = EXCLUDED.related_release,
  request_id = EXCLUDED.request_id,
  acknowledged_at = EXCLUDED.acknowledged_at,
  mitigated_at = EXCLUDED.mitigated_at,
  resolved_at = EXCLUDED.resolved_at,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- 8. 관리자 감사로그 직접 샘플
-- -----------------------------------------------------------------------------

INSERT INTO public.admin_audit_logs (
  admin_audit_log_id,
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
  '10000000-0000-4000-8000-000000004501',
  '10000000-0000-4000-8000-000000000001',
  jsonb_build_array(jsonb_build_object('role_key', 'owner', 'name', 'Owner')),
  'STAGING_SEED_APPLIED',
  'SYSTEM',
  NULL,
  NULL,
  jsonb_build_object('seed', 'staging.seed.sql', 'status', 'applied'),
  jsonb_build_object('schema', 'public', 'environment', 'staging', 'containsSensitiveRawData', false),
  'SYSTEM',
  'INFO',
  'staging-seed-audit-0001',
  encode(digest('staging-seed-ip', 'sha256'), 'hex'),
  encode(digest('staging-seed-agent', 'sha256'), 'hex'),
  now()
)
ON CONFLICT (admin_audit_log_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 9. 서버 권위 재계산 보정
-- -----------------------------------------------------------------------------

SELECT public.recalculate_payroll_plan('10000000-0000-4000-8000-000000001001'::uuid, 'STAGING_SEED_FINAL_RECALCULATE');
SELECT public.recalculate_payroll_plan('10000000-0000-4000-8000-000000001002'::uuid, 'STAGING_SEED_FINAL_RECALCULATE');

SELECT public.recalculate_user_growth_stats('10000000-0000-4000-8000-000000000101'::uuid);
SELECT public.recalculate_user_growth_stats('10000000-0000-4000-8000-000000000102'::uuid);

COMMIT;
