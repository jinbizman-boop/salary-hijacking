-- database/seeds/local.seed.sql
-- 급여납치 로컬 개발/QA 시드 데이터 최종본
-- 기준 DB: Neon PostgreSQL / PostgreSQL
-- 기준 시간대: Asia/Seoul
-- 기준 마이그레이션: 0001_init_users.sql ~ 0004_admin_audit_ads.sql
-- 목적:
--   1. 테스트 사용자, 관리자, 인증, 프로필, 동의, 기기 seed 제공
--   2. 급여 계획, 고정지출, 고정저축, 일일예산, 변동지출 seed 제공
--   3. 서버 권위 계산 trigger가 동작할 수 있는 실제 관계 데이터 제공
--   4. 알림, LV UP, 커뮤니티, 글쓰기, 신고, 첨부 seed 제공
--   5. 광고/제휴, 관리자 감사로그, 공지, 장애 대응 seed 제공
--   6. 재실행 시 중복 데이터가 누적되지 않도록 deterministic UUID와 conflict 정책 사용
--   7. 재무 원천 데이터와 광고/로그 데이터 분리 원칙 준수
--
-- 실행 전제:
--   - 로컬 또는 preview DB에서만 실행한다.
--   - 운영 DB에서 실행하면 안 된다.
--   - 0001~0004 마이그레이션 적용 후 실행한다.
--   - seed 실행 계정은 migration owner 또는 관리자 권한 컨텍스트를 가진다.

BEGIN;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '180s';
SET LOCAL idle_in_transaction_session_timeout = '180s';
SET LOCAL timezone = 'Asia/Seoul';
SET LOCAL app.current_user_id = '00000000-0000-4000-8000-000000000001';
SET LOCAL app.is_admin = 'true';
SET LOCAL app.request_id = 'local-seed-00000000-0000-4000-8000-000000000001';
SET LOCAL app.ip_hash = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
SET LOCAL app.user_agent_hash = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

-- -----------------------------------------------------------------------------
-- 선행 스키마 계약 검증
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE EXCEPTION 'local.seed.sql requires 0001_init_users.sql';
  END IF;

  IF to_regclass('public.payroll_plans') IS NULL THEN
    RAISE EXCEPTION 'local.seed.sql requires 0002_payroll_budget_expense.sql';
  END IF;

  IF to_regclass('public.notifications') IS NULL THEN
    RAISE EXCEPTION 'local.seed.sql requires 0003_growth_community_notifications.sql';
  END IF;

  IF to_regclass('public.ad_campaigns') IS NULL THEN
    RAISE EXCEPTION 'local.seed.sql requires 0004_admin_audit_ads.sql';
  END IF;

  IF to_regprocedure('public.current_app_user_id()') IS NULL THEN
    RAISE EXCEPTION 'local.seed.sql requires public.current_app_user_id()';
  END IF;

  IF to_regprocedure('public.current_app_is_admin()') IS NULL THEN
    RAISE EXCEPTION 'local.seed.sql requires public.current_app_is_admin()';
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 1. 사용자 / 관리자 / 인증 / 프로필 / 설정
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
    '00000000-0000-4000-8000-000000000001',
    'admin@salary-hijacking.local',
    now(),
    NULL,
    encode(digest('local-admin-phone', 'sha256'), 'hex'),
    now(),
    '급여납치 관리자',
    'ACTIVE',
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000101',
    'minji@salary-hijacking.local',
    now(),
    NULL,
    encode(digest('local-minji-phone', 'sha256'), 'hex'),
    now(),
    '월급수호자 민지',
    'ACTIVE',
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    'junho@salary-hijacking.local',
    now(),
    NULL,
    encode(digest('local-junho-phone', 'sha256'), 'hex'),
    now(),
    '예산러 준호',
    'ACTIVE',
    now()
  )
ON CONFLICT (user_id) DO UPDATE
SET
  email = EXCLUDED.email,
  email_verified_at = EXCLUDED.email_verified_at,
  phone_number = EXCLUDED.phone_number,
  phone_number_hash = EXCLUDED.phone_number_hash,
  phone_verified_at = EXCLUDED.phone_verified_at,
  nickname = EXCLUDED.nickname,
  status = EXCLUDED.status,
  last_login_at = EXCLUDED.last_login_at,
  updated_at = now()
WHERE
  public.users.email IS DISTINCT FROM EXCLUDED.email
  OR public.users.nickname IS DISTINCT FROM EXCLUDED.nickname
  OR public.users.status IS DISTINCT FROM EXCLUDED.status
  OR public.users.phone_number_hash IS DISTINCT FROM EXCLUDED.phone_number_hash;

INSERT INTO public.auth_identities (
  identity_id,
  user_id,
  provider,
  provider_user_key,
  email,
  linked_at
)
VALUES
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000001', 'EMAIL', 'local-admin@salary-hijacking.local', 'admin@salary-hijacking.local', now()),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000101', 'EMAIL', 'local-minji@salary-hijacking.local', 'minji@salary-hijacking.local', now()),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000102', 'EMAIL', 'local-junho@salary-hijacking.local', 'junho@salary-hijacking.local', now())
ON CONFLICT (provider, provider_user_key) DO UPDATE
SET
  user_id = EXCLUDED.user_id,
  email = EXCLUDED.email,
  revoked_at = NULL,
  updated_at = now()
WHERE
  public.auth_identities.user_id IS DISTINCT FROM EXCLUDED.user_id
  OR public.auth_identities.email IS DISTINCT FROM EXCLUDED.email
  OR public.auth_identities.revoked_at IS NOT NULL;

INSERT INTO public.user_profiles (
  profile_id,
  user_id,
  display_name,
  job_title,
  profile_image_url,
  bio
)
VALUES
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000001', '급여납치 관리자', 'Platform Admin', NULL, '로컬 관리자 계정입니다.'),
  ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000101', '민지', 'Product Designer', NULL, '월급을 받자마자 납치금액을 먼저 지키는 사용자입니다.'),
  ('00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000102', '준호', 'Backend Developer', NULL, '일일예산과 LV UP 루틴을 함께 관리하는 사용자입니다.')
ON CONFLICT (user_id) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  job_title = EXCLUDED.job_title,
  profile_image_url = EXCLUDED.profile_image_url,
  bio = EXCLUDED.bio,
  updated_at = now()
WHERE
  public.user_profiles.display_name IS DISTINCT FROM EXCLUDED.display_name
  OR public.user_profiles.job_title IS DISTINCT FROM EXCLUDED.job_title
  OR public.user_profiles.bio IS DISTINCT FROM EXCLUDED.bio;

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
  ('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000001', true, true, true, true, true, false, 'Asia/Seoul', 'ko-KR', 'KRW'),
  ('00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000101', true, true, true, true, true, true, 'Asia/Seoul', 'ko-KR', 'KRW'),
  ('00000000-0000-4000-8000-000000000403', '00000000-0000-4000-8000-000000000102', true, true, true, true, true, false, 'Asia/Seoul', 'ko-KR', 'KRW')
ON CONFLICT (user_id) DO UPDATE
SET
  push_enabled = EXCLUDED.push_enabled,
  budget_alert_enabled = EXCLUDED.budget_alert_enabled,
  fixed_payment_alert_enabled = EXCLUDED.fixed_payment_alert_enabled,
  growth_alert_enabled = EXCLUDED.growth_alert_enabled,
  community_alert_enabled = EXCLUDED.community_alert_enabled,
  marketing_opt_in = EXCLUDED.marketing_opt_in,
  updated_at = now()
WHERE
  public.user_settings.push_enabled IS DISTINCT FROM EXCLUDED.push_enabled
  OR public.user_settings.marketing_opt_in IS DISTINCT FROM EXCLUDED.marketing_opt_in;

-- -----------------------------------------------------------------------------
-- 2. 동의 / 기기 / 관리자 RBAC
-- -----------------------------------------------------------------------------

WITH seed_consents(user_id, consent_type, granted, consent_version, source, ip_hash, user_agent_hash, granted_at, revoked_at) AS (
  VALUES
    ('00000000-0000-4000-8000-000000000101'::uuid, 'TERMS_OF_SERVICE', true, 'local-v1', 'APP', encode(digest('minji-ip', 'sha256'), 'hex'), encode(digest('minji-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('00000000-0000-4000-8000-000000000101'::uuid, 'PRIVACY_POLICY', true, 'local-v1', 'APP', encode(digest('minji-ip', 'sha256'), 'hex'), encode(digest('minji-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('00000000-0000-4000-8000-000000000101'::uuid, 'PUSH_NOTIFICATION', true, 'local-v1', 'APP', encode(digest('minji-ip', 'sha256'), 'hex'), encode(digest('minji-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('00000000-0000-4000-8000-000000000101'::uuid, 'MARKETING', true, 'local-v1', 'APP', encode(digest('minji-ip', 'sha256'), 'hex'), encode(digest('minji-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('00000000-0000-4000-8000-000000000101'::uuid, 'ANALYTICS', true, 'local-v1', 'APP', encode(digest('minji-ip', 'sha256'), 'hex'), encode(digest('minji-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('00000000-0000-4000-8000-000000000101'::uuid, 'ADS_PARTNER', true, 'local-v1', 'APP', encode(digest('minji-ip', 'sha256'), 'hex'), encode(digest('minji-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('00000000-0000-4000-8000-000000000101'::uuid, 'COMMUNITY_POLICY', true, 'local-v1', 'APP', encode(digest('minji-ip', 'sha256'), 'hex'), encode(digest('minji-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('00000000-0000-4000-8000-000000000102'::uuid, 'TERMS_OF_SERVICE', true, 'local-v1', 'APP', encode(digest('junho-ip', 'sha256'), 'hex'), encode(digest('junho-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('00000000-0000-4000-8000-000000000102'::uuid, 'PRIVACY_POLICY', true, 'local-v1', 'APP', encode(digest('junho-ip', 'sha256'), 'hex'), encode(digest('junho-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('00000000-0000-4000-8000-000000000102'::uuid, 'PUSH_NOTIFICATION', true, 'local-v1', 'APP', encode(digest('junho-ip', 'sha256'), 'hex'), encode(digest('junho-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('00000000-0000-4000-8000-000000000102'::uuid, 'ANALYTICS', true, 'local-v1', 'APP', encode(digest('junho-ip', 'sha256'), 'hex'), encode(digest('junho-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('00000000-0000-4000-8000-000000000102'::uuid, 'COMMUNITY_POLICY', true, 'local-v1', 'APP', encode(digest('junho-ip', 'sha256'), 'hex'), encode(digest('junho-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('00000000-0000-4000-8000-000000000001'::uuid, 'ADMIN_OPERATION_NOTICE', true, 'local-v1', 'ADMIN', encode(digest('admin-ip', 'sha256'), 'hex'), encode(digest('admin-agent', 'sha256'), 'hex'), now(), NULL::timestamptz)
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
  user_id,
  consent_type,
  granted,
  consent_version,
  source,
  ip_hash,
  user_agent_hash,
  granted_at,
  revoked_at
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
  ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000101', 'IOS', encode(digest('minji-push-token', 'sha256'), 'hex'), encode(digest('minji-ios-device', 'sha256'), 'hex'), '1.0.0-local', 'iOS 18', 'ACTIVE', now()),
  ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000102', 'ANDROID', encode(digest('junho-push-token', 'sha256'), 'hex'), encode(digest('junho-android-device', 'sha256'), 'hex'), '1.0.0-local', 'Android 15', 'ACTIVE', now()),
  ('00000000-0000-4000-8000-000000000503', '00000000-0000-4000-8000-000000000001', 'ADMIN_WEB', NULL, encode(digest('admin-web-device', 'sha256'), 'hex'), 'admin-local', 'Chrome', 'ACTIVE', now())
ON CONFLICT (device_id) DO UPDATE
SET
  push_token_hash = EXCLUDED.push_token_hash,
  device_fingerprint_hash = EXCLUDED.device_fingerprint_hash,
  app_version = EXCLUDED.app_version,
  os_version = EXCLUDED.os_version,
  status = EXCLUDED.status,
  last_seen_at = EXCLUDED.last_seen_at,
  updated_at = now()
WHERE
  public.user_devices.status IS DISTINCT FROM EXCLUDED.status
  OR public.user_devices.push_token_hash IS DISTINCT FROM EXCLUDED.push_token_hash
  OR public.user_devices.device_fingerprint_hash IS DISTINCT FROM EXCLUDED.device_fingerprint_hash;

INSERT INTO public.admin_role_members (
  admin_role_member_id,
  admin_role_id,
  user_id,
  status,
  assigned_at,
  assigned_by
)
SELECT
  '00000000-0000-4000-8000-000000000601'::uuid,
  ar.admin_role_id,
  '00000000-0000-4000-8000-000000000001'::uuid,
  'ACTIVE',
  now(),
  '00000000-0000-4000-8000-000000000001'::uuid
FROM public.admin_roles ar
WHERE ar.role_key = 'owner'
  AND NOT EXISTS (
    SELECT 1
    FROM public.admin_role_members arm
    WHERE arm.admin_role_id = ar.admin_role_id
      AND arm.user_id = '00000000-0000-4000-8000-000000000001'::uuid
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
  ('00000000-0000-4000-8000-000000001001', '00000000-0000-4000-8000-000000000101', '2026-06', 25, 3200000, 900000, 'ACTIVE'),
  ('00000000-0000-4000-8000-000000001002', '00000000-0000-4000-8000-000000000102', '2026-06', 10, 4100000, 1200000, 'ACTIVE')
ON CONFLICT (user_id, year_month) WHERE status = 'ACTIVE' DO NOTHING;

WITH seed_fixed(fixed_expense_id, user_id, year_month, expense_day, category, name, amount, recurrence_type, status) AS (
  VALUES
    ('00000000-0000-4000-8000-000000001101'::uuid, '00000000-0000-4000-8000-000000000101'::uuid, '2026-06'::char(7), 1::smallint, 'RENT', '월세', 650000::bigint, 'MONTHLY', 'SCHEDULED'),
    ('00000000-0000-4000-8000-000000001102'::uuid, '00000000-0000-4000-8000-000000000101'::uuid, '2026-06'::char(7), 5::smallint, 'TELECOM', '휴대폰 요금', 69000::bigint, 'MONTHLY', 'PAID'),
    ('00000000-0000-4000-8000-000000001103'::uuid, '00000000-0000-4000-8000-000000000101'::uuid, '2026-06'::char(7), 15::smallint, 'SUBSCRIPTION', 'OTT 구독', 17000::bigint, 'MONTHLY', 'SCHEDULED'),
    ('00000000-0000-4000-8000-000000001104'::uuid, '00000000-0000-4000-8000-000000000102'::uuid, '2026-06'::char(7), 3::smallint, 'LOAN', '학자금 대출 상환', 280000::bigint, 'MONTHLY', 'SCHEDULED'),
    ('00000000-0000-4000-8000-000000001105'::uuid, '00000000-0000-4000-8000-000000000102'::uuid, '2026-06'::char(7), 7::smallint, 'INSURANCE', '실손 보험', 84000::bigint, 'MONTHLY', 'PAID')
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
ON CONFLICT (fixed_expense_id) DO NOTHING;

WITH seed_savings(savings_plan_id, user_id, year_month, saving_day, category, name, amount, recurrence_type, status) AS (
  VALUES
    ('00000000-0000-4000-8000-000000001201'::uuid, '00000000-0000-4000-8000-000000000101'::uuid, '2026-06'::char(7), 25::smallint, 'SAVINGS', '월급 선저축', 500000::bigint, 'MONTHLY', 'TRANSFERRED'),
    ('00000000-0000-4000-8000-000000001202'::uuid, '00000000-0000-4000-8000-000000000101'::uuid, '2026-06'::char(7), 25::smallint, 'EMERGENCY_FUND', '비상금 납치', 200000::bigint, 'MONTHLY', 'SCHEDULED'),
    ('00000000-0000-4000-8000-000000001203'::uuid, '00000000-0000-4000-8000-000000000102'::uuid, '2026-06'::char(7), 10::smallint, 'INVESTMENT', 'ETF 자동투자', 600000::bigint, 'MONTHLY', 'TRANSFERRED'),
    ('00000000-0000-4000-8000-000000001204'::uuid, '00000000-0000-4000-8000-000000000102'::uuid, '2026-06'::char(7), 10::smallint, 'PENSION', '연금저축', 300000::bigint, 'MONTHLY', 'SCHEDULED')
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
ON CONFLICT (savings_plan_id) DO NOTHING;

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
  ('00000000-0000-4000-8000-000000001301', '00000000-0000-4000-8000-000000000101', '2026-06-15', 35000, 0, 35000, 0, 'OPEN', now()),
  ('00000000-0000-4000-8000-000000001302', '00000000-0000-4000-8000-000000000101', '2026-06-16', 35000, 0, 35000, 0, 'OPEN', now()),
  ('00000000-0000-4000-8000-000000001303', '00000000-0000-4000-8000-000000000102', '2026-06-15', 45000, 0, 45000, 0, 'OPEN', now()),
  ('00000000-0000-4000-8000-000000001304', '00000000-0000-4000-8000-000000000102', '2026-06-16', 45000, 0, 45000, 0, 'OPEN', now())
ON CONFLICT (user_id, budget_date) DO NOTHING;

WITH seed_variable(variable_expense_id, user_id, budget_date, spent_at, category, merchant_name, memo, amount, idempotency_key) AS (
  VALUES
    ('00000000-0000-4000-8000-000000001401'::uuid, '00000000-0000-4000-8000-000000000101'::uuid, '2026-06-15'::date, '2026-06-15 08:30:00+09'::timestamptz, 'FOOD', '동네김밥', '아침 식사', 6500::bigint, 'local-seed-minji-20260615-food'),
    ('00000000-0000-4000-8000-000000001402'::uuid, '00000000-0000-4000-8000-000000000101'::uuid, '2026-06-15'::date, '2026-06-15 12:40:00+09'::timestamptz, 'CAFE', '급여납치 카페', '점심 커피', 4800::bigint, 'local-seed-minji-20260615-cafe'),
    ('00000000-0000-4000-8000-000000001403'::uuid, '00000000-0000-4000-8000-000000000101'::uuid, '2026-06-16'::date, '2026-06-16 19:10:00+09'::timestamptz, 'TRANSPORT', '지하철', '퇴근 교통비', 1550::bigint, 'local-seed-minji-20260616-transport'),
    ('00000000-0000-4000-8000-000000001404'::uuid, '00000000-0000-4000-8000-000000000102'::uuid, '2026-06-15'::date, '2026-06-15 13:20:00+09'::timestamptz, 'FOOD', '구내식당', '점심', 8500::bigint, 'local-seed-junho-20260615-food'),
    ('00000000-0000-4000-8000-000000001405'::uuid, '00000000-0000-4000-8000-000000000102'::uuid, '2026-06-16'::date, '2026-06-16 20:30:00+09'::timestamptz, 'CULTURE', '온라인 강의', '자기계발 강의', 22000::bigint, 'local-seed-junho-20260616-education')
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
ON CONFLICT (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. 알림 / 발송 이력
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
  ('00000000-0000-4000-8000-000000002001', '00000000-0000-4000-8000-000000000101', 'PAYDAY', '월급 납치 준비 완료', '이번 달 급여 계획과 선저축 목표를 확인하세요.', 'PLAN', '00000000-0000-4000-8000-000000001001', jsonb_build_object('yearMonth', '2026-06', 'source', 'local_seed'), 'READ', 2, '2026-06-15 09:00:00+09', '2026-06-15 09:00:10+09', '2026-06-15 09:05:00+09', '2026-12-31 23:59:59+09'),
  ('00000000-0000-4000-8000-000000002002', '00000000-0000-4000-8000-000000000101', 'BUDGET_REMAINING', '오늘 예산이 아직 남아 있어요', '오늘 남은 예산을 확인하고 납치금액을 지켜보세요.', 'DAILY_BUDGET', '00000000-0000-4000-8000-000000001302', jsonb_build_object('budgetDate', '2026-06-16', 'source', 'local_seed'), 'SENT', 4, '2026-06-16 08:00:00+09', '2026-06-16 08:00:05+09', NULL, '2026-12-31 23:59:59+09'),
  ('00000000-0000-4000-8000-000000002003', '00000000-0000-4000-8000-000000000102', 'GROWTH_TASK', '오늘의 LV UP 미션', '경제 뉴스 1개 읽기 미션을 완료하고 경험치를 획득하세요.', 'LEVEL_UP', NULL, jsonb_build_object('mission', 'NEWS', 'source', 'local_seed'), 'SENT', 5, '2026-06-16 07:30:00+09', '2026-06-16 07:30:05+09', NULL, '2026-12-31 23:59:59+09')
ON CONFLICT (notification_id) DO NOTHING;

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
  ('00000000-0000-4000-8000-000000002101', '00000000-0000-4000-8000-000000002001', '00000000-0000-4000-8000-000000000501', 'EXPO', 'PUSH', 'DELIVERED', 'local-expo-message-001', NULL, 1, '2026-06-15 09:00:09+09', '2026-06-15 09:00:12+09', NULL),
  ('00000000-0000-4000-8000-000000002102', '00000000-0000-4000-8000-000000002002', '00000000-0000-4000-8000-000000000501', 'EXPO', 'PUSH', 'DELIVERED', 'local-expo-message-002', NULL, 1, '2026-06-16 08:00:04+09', '2026-06-16 08:00:08+09', NULL),
  ('00000000-0000-4000-8000-000000002103', '00000000-0000-4000-8000-000000002003', '00000000-0000-4000-8000-000000000502', 'EXPO', 'PUSH', 'DELIVERED', 'local-expo-message-003', NULL, 1, '2026-06-16 07:30:04+09', '2026-06-16 07:30:08+09', NULL)
ON CONFLICT (delivery_id) DO NOTHING;

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
), seed_growth(user_id, type, completion_date, proof_text) AS (
  VALUES
    ('00000000-0000-4000-8000-000000000101'::uuid, 'READING', '2026-06-15'::date, '월급 관리 습관 관련 글을 읽고 선저축 우선순위를 정리했다.'),
    ('00000000-0000-4000-8000-000000000101'::uuid, 'HEALTH', '2026-06-16'::date, '퇴근 후 20분 홈트를 완료했다.'),
    ('00000000-0000-4000-8000-000000000102'::uuid, 'NEWS', '2026-06-15'::date, '경제 뉴스에서 금리 변화가 예산에 미치는 영향을 정리했다.'),
    ('00000000-0000-4000-8000-000000000102'::uuid, 'ENGLISH', '2026-06-16'::date, '급여와 예산 관련 영어 문장 5개를 학습했다.')
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
  CASE
    WHEN sg.user_id = '00000000-0000-4000-8000-000000000101'::uuid AND sg.type = 'READING' THEN '00000000-0000-4000-8000-000000002201'::uuid
    WHEN sg.user_id = '00000000-0000-4000-8000-000000000101'::uuid AND sg.type = 'HEALTH' THEN '00000000-0000-4000-8000-000000002202'::uuid
    WHEN sg.user_id = '00000000-0000-4000-8000-000000000102'::uuid AND sg.type = 'NEWS' THEN '00000000-0000-4000-8000-000000002203'::uuid
    ELSE '00000000-0000-4000-8000-000000002204'::uuid
  END,
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
ON CONFLICT (user_id, growth_task_id, completion_date) WHERE status = 'COMPLETED' DO NOTHING;

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
  ('00000000-0000-4000-8000-000000003001', '00000000-0000-4000-8000-000000000101', 'MONEY_TIP', '월급날 선저축을 먼저 빼니 지출이 줄었어요', '월급이 들어오자마자 고정저축과 비상금을 먼저 분리하니 일일예산을 지키기가 쉬워졌습니다.', false, false, false, 'PUBLISHED'),
  ('00000000-0000-4000-8000-000000003002', '00000000-0000-4000-8000-000000000102', 'QUESTION', '일일예산 초과 시 어떻게 관리하시나요?', '오늘 문화비가 예산을 넘었는데 다음날 예산을 줄이는 방식이 좋을까요?', true, true, false, 'PUBLISHED'),
  ('00000000-0000-4000-8000-000000003003', '00000000-0000-4000-8000-000000000101', 'LEVEL_UP_PROOF', '오늘의 독서 LV UP 인증', '경제 습관 관련 글을 읽고 소비 전 체크리스트를 만들었습니다.', false, false, false, 'PUBLISHED')
ON CONFLICT (post_id) DO NOTHING;

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
  ('00000000-0000-4000-8000-000000003101', '00000000-0000-4000-8000-000000003001', '00000000-0000-4000-8000-000000000102', NULL, '저도 선저축을 먼저 빼는 방식으로 바꿔봐야겠어요.', false, 'ACTIVE'),
  ('00000000-0000-4000-8000-000000003102', '00000000-0000-4000-8000-000000003002', '00000000-0000-4000-8000-000000000101', NULL, '초과분은 다음날 예산에서 바로 차감하기보다 주간 단위로 조정하는 것을 추천해요.', false, 'ACTIVE'),
  ('00000000-0000-4000-8000-000000003103', '00000000-0000-4000-8000-000000003002', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000003102', '주간 단위 조정으로 테스트해보겠습니다.', true, 'ACTIVE')
ON CONFLICT (comment_id) DO NOTHING;

INSERT INTO public.community_reactions (
  reaction_id,
  user_id,
  target_type,
  target_id,
  reaction_type
)
VALUES
  ('00000000-0000-4000-8000-000000003201', '00000000-0000-4000-8000-000000000102', 'POST', '00000000-0000-4000-8000-000000003001', 'LIKE'),
  ('00000000-0000-4000-8000-000000003202', '00000000-0000-4000-8000-000000000101', 'POST', '00000000-0000-4000-8000-000000003002', 'LIKE'),
  ('00000000-0000-4000-8000-000000003203', '00000000-0000-4000-8000-000000000101', 'COMMENT', '00000000-0000-4000-8000-000000003103', 'LIKE'),
  ('00000000-0000-4000-8000-000000003204', '00000000-0000-4000-8000-000000000102', 'POST', '00000000-0000-4000-8000-000000003003', 'BOOKMARK')
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
    '00000000-0000-4000-8000-000000003301',
    '00000000-0000-4000-8000-000000000101',
    'POST',
    '00000000-0000-4000-8000-000000003002',
    'OTHER',
    '로컬 QA용 신고 처리 샘플입니다.',
    'RESOLVED',
    '00000000-0000-4000-8000-000000000001',
    '정책 위반 없음으로 처리한 로컬 샘플입니다.',
    now()
  )
ON CONFLICT (report_id) DO NOTHING;

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
  ('00000000-0000-4000-8000-000000003401', 'COMMUNITY_POST', '00000000-0000-4000-8000-000000003003', 'https://assets.salary-hijacking.local/local/level-up-proof.webp', 'local/community/level-up-proof.webp', 'image/webp', 204800, repeat('a', 64), 'ACTIVE', '00000000-0000-4000-8000-000000000101')
ON CONFLICT (attachment_id) DO NOTHING;

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
  '00000000-0000-4000-8000-000000004001',
  'Salary Hijacking Local Partner',
  'INTERNAL',
  'ACTIVE',
  'local-partner@salary-hijacking.local',
  'privacy-local@salary-hijacking.local',
  'local-seed-partner',
  'KRW',
  true,
  false,
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  now(),
  now()
)
ON CONFLICT (contract_reference) WHERE contract_reference IS NOT NULL DO NOTHING;

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
  '00000000-0000-4000-8000-000000004101'::uuid,
  pa.partner_account_id,
  '로컬 LV UP 제휴 배너',
  'LEVEL_UP',
  'https://assets.salary-hijacking.local/local/lvup-banner.webp',
  'https://salary-hijacking.local/partners/local-lvup',
  '2026-01-01 00:00:00+09'::timestamptz,
  '2026-12-31 23:59:59+09'::timestamptz,
  'LIVE',
  10,
  'CONSENT_BASED',
  jsonb_build_object('context', 'level_up', 'segment', 'local_seed_non_financial'),
  'ADS_PARTNER',
  'LOW',
  'CPC',
  120,
  0,
  0,
  1000,
  50000,
  '로컬 QA용 광고 캠페인입니다. 재무 원천 데이터 타겟팅 없음.',
  '00000000-0000-4000-8000-000000000001'::uuid,
  '00000000-0000-4000-8000-000000000001'::uuid,
  '00000000-0000-4000-8000-000000000001'::uuid,
  '00000000-0000-4000-8000-000000000001'::uuid,
  now(),
  now()
FROM public.partner_accounts pa
WHERE pa.contract_reference = 'local-seed-partner'
ON CONFLICT (ad_campaign_id) DO NOTHING;

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
  ('00000000-0000-4000-8000-000000004201', '00000000-0000-4000-8000-000000004101', '00000000-0000-4000-8000-000000000101', 'LEVEL_UP', 'IMPRESSION', jsonb_build_object('ADS_PARTNER', true, 'version', 'local-v1'), jsonb_build_object('screen', 'LEVEL_UP', 'source', 'local_seed'), 'local-ad-event-impression-0001', encode(digest('minji-session-ad-1', 'sha256'), 'hex'), encode(digest('minji-device-ad-1', 'sha256'), 'hex'), '2026-06-16 10:00:00+09'),
  ('00000000-0000-4000-8000-000000004202', '00000000-0000-4000-8000-000000004101', '00000000-0000-4000-8000-000000000101', 'LEVEL_UP', 'CLICK', jsonb_build_object('ADS_PARTNER', true, 'version', 'local-v1'), jsonb_build_object('screen', 'LEVEL_UP', 'source', 'local_seed'), 'local-ad-event-click-0001', encode(digest('minji-session-ad-1', 'sha256'), 'hex'), encode(digest('minji-device-ad-1', 'sha256'), 'hex'), '2026-06-16 10:00:05+09')
ON CONFLICT (ad_campaign_id, event_type, request_id) WHERE request_id IS NOT NULL DO NOTHING;

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
  '00000000-0000-4000-8000-000000004301',
  '00000000-0000-4000-8000-000000000001',
  'ALL',
  '로컬 환경 공지',
  '이 공지는 로컬 seed 데이터로 생성된 샘플 공지입니다.',
  'PUBLISHED',
  true,
  now(),
  '2026-12-31 23:59:59+09'
)
ON CONFLICT (notice_id) DO NOTHING;

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
  '00000000-0000-4000-8000-000000004401',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'SEV4',
  '로컬 seed 검증용 운영 이벤트',
  '로컬 개발 환경에서 장애 대응 화면과 감사로그 검색을 검증하기 위한 샘플입니다.',
  'RESOLVED',
  'INFRA',
  '로컬 QA seed 데이터 생성',
  '영향 없음. 샘플 데이터로 확인 완료.',
  'rollback 불필요. 필요 시 local DB reset.',
  'https://salary-hijacking.local/postmortems/local-seed',
  'local-seed-v1',
  'local-seed-incident-0001',
  '2026-06-16 09:00:00+09',
  '2026-06-16 09:05:00+09',
  '2026-06-16 09:10:00+09',
  '2026-06-16 09:15:00+09'
)
ON CONFLICT (incident_id) DO NOTHING;

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
  '00000000-0000-4000-8000-000000004501',
  '00000000-0000-4000-8000-000000000001',
  jsonb_build_array(jsonb_build_object('role_key', 'owner', 'name', 'Owner')),
  'LOCAL_SEED_APPLIED',
  'SYSTEM',
  NULL,
  NULL,
  jsonb_build_object('seed', 'local.seed.sql', 'status', 'applied'),
  jsonb_build_object('schema', 'public', 'environment', 'local', 'containsFinancialRawData', false),
  'SYSTEM',
  'INFO',
  'local-seed-audit-0001',
  encode(digest('local-seed-ip', 'sha256'), 'hex'),
  encode(digest('local-seed-agent', 'sha256'), 'hex'),
  now()
)
ON CONFLICT (admin_audit_log_id) DO NOTHING;

COMMIT;
