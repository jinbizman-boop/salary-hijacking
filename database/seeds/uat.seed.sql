-- database/seeds/uat.seed.sql
-- 급여납치 UAT(User Acceptance Test) 인수검증용 시드 데이터 최종본
-- 기준 DB: Neon PostgreSQL / PostgreSQL
-- 기준 시간대: Asia/Seoul
-- 기준 마이그레이션: 0001_init_users.sql ~ 0004_admin_audit_ads.sql
--
-- 목적:
--   1. UAT 환경에서 사용자 승인 테스트에 필요한 합성 데이터 제공
--   2. 급여 홈, 급여계획, 일일예산, 고정지출, 고정저축, 변동지출 인수검증 지원
--   3. 알림, LV UP, 커뮤니티, 글쓰기, 댓글, 반응, 신고, 첨부 인수검증 지원
--   4. 광고/제휴, 공지, 운영 장애, 관리자 감사로그 인수검증 지원
--   5. 서버 권위 계산 trigger와 최종 재계산 함수를 통해 금액 정합성 검증
--   6. deterministic UUID, stable idempotency_key, ON CONFLICT, WHERE NOT EXISTS로 재실행 안전성 보장
--   7. 실제 개인정보, 실제 금융정보, 토큰 원문, secret 원문, 광고용 재무 원천 데이터 저장 금지
--
-- 실행 전제:
--   - production DB에서 실행 금지
--   - UAT / preview / acceptance-test DB에서만 실행
--   - 0001_init_users.sql ~ 0004_admin_audit_ads.sql 적용 후 실행
--   - seed 데이터는 실제 고객 데이터가 아닌 합성 데이터만 사용
--   - 광고/제휴 데이터는 급여액·지출액·저축액·납치금액 원천 데이터와 직접 결합하지 않음

BEGIN;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '180s';
SET LOCAL idle_in_transaction_session_timeout = '180s';
SET LOCAL timezone = 'Asia/Seoul';

SET LOCAL app.current_user_id = '20000000-0000-4000-8000-000000000001';
SET LOCAL app.is_admin = 'true';
SET LOCAL app.request_id = 'uat-seed-20000000-0000-4000-8000-000000000001';
SET LOCAL app.ip_hash = '3333333333333333333333333333333333333333333333333333333333333333';
SET LOCAL app.user_agent_hash = '4444444444444444444444444444444444444444444444444444444444444444';

-- -----------------------------------------------------------------------------
-- 0. 선행 스키마 계약 검증
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE EXCEPTION 'uat.seed.sql requires 0001_init_users.sql';
  END IF;

  IF to_regclass('public.user_consents') IS NULL THEN
    RAISE EXCEPTION 'uat.seed.sql requires public.user_consents';
  END IF;

  IF to_regclass('public.admin_role_members') IS NULL THEN
    RAISE EXCEPTION 'uat.seed.sql requires public.admin_role_members';
  END IF;

  IF to_regclass('public.payroll_plans') IS NULL THEN
    RAISE EXCEPTION 'uat.seed.sql requires 0002_payroll_budget_expense.sql';
  END IF;

  IF to_regclass('public.variable_expenses') IS NULL THEN
    RAISE EXCEPTION 'uat.seed.sql requires public.variable_expenses';
  END IF;

  IF to_regclass('public.notifications') IS NULL THEN
    RAISE EXCEPTION 'uat.seed.sql requires 0003_growth_community_notifications.sql';
  END IF;

  IF to_regclass('public.community_posts') IS NULL THEN
    RAISE EXCEPTION 'uat.seed.sql requires public.community_posts';
  END IF;

  IF to_regclass('public.ad_campaigns') IS NULL THEN
    RAISE EXCEPTION 'uat.seed.sql requires 0004_admin_audit_ads.sql';
  END IF;

  IF to_regprocedure('public.current_app_user_id()') IS NULL THEN
    RAISE EXCEPTION 'uat.seed.sql requires public.current_app_user_id()';
  END IF;

  IF to_regprocedure('public.current_app_is_admin()') IS NULL THEN
    RAISE EXCEPTION 'uat.seed.sql requires public.current_app_is_admin()';
  END IF;

  IF to_regprocedure('public.recalculate_payroll_plan(uuid,text)') IS NULL THEN
    RAISE EXCEPTION 'uat.seed.sql requires public.recalculate_payroll_plan(uuid,text)';
  END IF;

  IF to_regprocedure('public.recalculate_user_growth_stats(uuid)') IS NULL THEN
    RAISE EXCEPTION 'uat.seed.sql requires public.recalculate_user_growth_stats(uuid)';
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 1. UAT 사용자 / 인증 / 프로필 / 설정
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
    '20000000-0000-4000-8000-000000000001',
    'uat.admin@example.invalid',
    now(),
    NULL,
    encode(digest('uat-admin-phone-hash-seed', 'sha256'), 'hex'),
    now(),
    'UAT 관리자',
    'ACTIVE',
    now()
  ),
  (
    '20000000-0000-4000-8000-000000000101',
    'uat.salary.guardian@example.invalid',
    now(),
    NULL,
    encode(digest('uat-user-salary-guardian-phone-hash-seed', 'sha256'), 'hex'),
    now(),
    'UAT 월급수호자',
    'ACTIVE',
    now()
  ),
  (
    '20000000-0000-4000-8000-000000000102',
    'uat.budget.over@example.invalid',
    now(),
    NULL,
    encode(digest('uat-user-budget-over-phone-hash-seed', 'sha256'), 'hex'),
    now(),
    'UAT 예산초과러',
    'ACTIVE',
    now()
  ),
  (
    '20000000-0000-4000-8000-000000000103',
    'uat.community.writer@example.invalid',
    now(),
    NULL,
    encode(digest('uat-user-community-writer-phone-hash-seed', 'sha256'), 'hex'),
    now(),
    'UAT 커뮤니티러',
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
  ('20000000-0000-4000-8000-000000000201', '20000000-0000-4000-8000-000000000001', 'EMAIL', 'uat-admin@example.invalid', 'uat.admin@example.invalid', now(), NULL),
  ('20000000-0000-4000-8000-000000000202', '20000000-0000-4000-8000-000000000101', 'EMAIL', 'uat-salary-guardian@example.invalid', 'uat.salary.guardian@example.invalid', now(), NULL),
  ('20000000-0000-4000-8000-000000000203', '20000000-0000-4000-8000-000000000102', 'EMAIL', 'uat-budget-over@example.invalid', 'uat.budget.over@example.invalid', now(), NULL),
  ('20000000-0000-4000-8000-000000000204', '20000000-0000-4000-8000-000000000103', 'EMAIL', 'uat-community-writer@example.invalid', 'uat.community.writer@example.invalid', now(), NULL)
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
    '20000000-0000-4000-8000-000000000301',
    '20000000-0000-4000-8000-000000000001',
    'UAT Admin',
    'Acceptance Test Admin',
    NULL,
    'UAT 관리자 합성 계정입니다.'
  ),
  (
    '20000000-0000-4000-8000-000000000302',
    '20000000-0000-4000-8000-000000000101',
    '월급수호자',
    'UAT Persona - Happy Path',
    NULL,
    '급여계획, 선저축, 정상 일일예산 플로우 인수검증용 합성 사용자입니다.'
  ),
  (
    '20000000-0000-4000-8000-000000000303',
    '20000000-0000-4000-8000-000000000102',
    '예산초과러',
    'UAT Persona - Over Budget',
    NULL,
    '예산 초과, 알림, 재계산, 관리자 확인 플로우 인수검증용 합성 사용자입니다.'
  ),
  (
    '20000000-0000-4000-8000-000000000304',
    '20000000-0000-4000-8000-000000000103',
    '커뮤니티러',
    'UAT Persona - Community',
    NULL,
    '글쓰기, 댓글, 반응, 신고, 첨부, LV UP 인수검증용 합성 사용자입니다.'
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
  ('20000000-0000-4000-8000-000000000401', '20000000-0000-4000-8000-000000000001', true, true, true, true, true, false, 'Asia/Seoul', 'ko-KR', 'KRW'),
  ('20000000-0000-4000-8000-000000000402', '20000000-0000-4000-8000-000000000101', true, true, true, true, true, true, 'Asia/Seoul', 'ko-KR', 'KRW'),
  ('20000000-0000-4000-8000-000000000403', '20000000-0000-4000-8000-000000000102', true, true, true, true, true, false, 'Asia/Seoul', 'ko-KR', 'KRW'),
  ('20000000-0000-4000-8000-000000000404', '20000000-0000-4000-8000-000000000103', true, true, true, true, true, true, 'Asia/Seoul', 'ko-KR', 'KRW')
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
    ('20000000-0000-4000-8000-000000000001'::uuid, 'TERMS_OF_SERVICE', true, 'uat-v1', 'ADMIN', encode(digest('uat-admin-ip', 'sha256'), 'hex'), encode(digest('uat-admin-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('20000000-0000-4000-8000-000000000001'::uuid, 'PRIVACY_POLICY', true, 'uat-v1', 'ADMIN', encode(digest('uat-admin-ip', 'sha256'), 'hex'), encode(digest('uat-admin-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),

    ('20000000-0000-4000-8000-000000000101'::uuid, 'TERMS_OF_SERVICE', true, 'uat-v1', 'APP', encode(digest('uat-u1-ip', 'sha256'), 'hex'), encode(digest('uat-u1-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('20000000-0000-4000-8000-000000000101'::uuid, 'PRIVACY_POLICY', true, 'uat-v1', 'APP', encode(digest('uat-u1-ip', 'sha256'), 'hex'), encode(digest('uat-u1-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('20000000-0000-4000-8000-000000000101'::uuid, 'PUSH_NOTIFICATION', true, 'uat-v1', 'APP', encode(digest('uat-u1-ip', 'sha256'), 'hex'), encode(digest('uat-u1-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('20000000-0000-4000-8000-000000000101'::uuid, 'MARKETING', true, 'uat-v1', 'APP', encode(digest('uat-u1-ip', 'sha256'), 'hex'), encode(digest('uat-u1-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('20000000-0000-4000-8000-000000000101'::uuid, 'ANALYTICS', true, 'uat-v1', 'APP', encode(digest('uat-u1-ip', 'sha256'), 'hex'), encode(digest('uat-u1-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('20000000-0000-4000-8000-000000000101'::uuid, 'ADS_PARTNER', true, 'uat-v1', 'APP', encode(digest('uat-u1-ip', 'sha256'), 'hex'), encode(digest('uat-u1-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('20000000-0000-4000-8000-000000000101'::uuid, 'COMMUNITY_POLICY', true, 'uat-v1', 'APP', encode(digest('uat-u1-ip', 'sha256'), 'hex'), encode(digest('uat-u1-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),

    ('20000000-0000-4000-8000-000000000102'::uuid, 'TERMS_OF_SERVICE', true, 'uat-v1', 'APP', encode(digest('uat-u2-ip', 'sha256'), 'hex'), encode(digest('uat-u2-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('20000000-0000-4000-8000-000000000102'::uuid, 'PRIVACY_POLICY', true, 'uat-v1', 'APP', encode(digest('uat-u2-ip', 'sha256'), 'hex'), encode(digest('uat-u2-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('20000000-0000-4000-8000-000000000102'::uuid, 'PUSH_NOTIFICATION', true, 'uat-v1', 'APP', encode(digest('uat-u2-ip', 'sha256'), 'hex'), encode(digest('uat-u2-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('20000000-0000-4000-8000-000000000102'::uuid, 'ANALYTICS', true, 'uat-v1', 'APP', encode(digest('uat-u2-ip', 'sha256'), 'hex'), encode(digest('uat-u2-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('20000000-0000-4000-8000-000000000102'::uuid, 'COMMUNITY_POLICY', true, 'uat-v1', 'APP', encode(digest('uat-u2-ip', 'sha256'), 'hex'), encode(digest('uat-u2-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),

    ('20000000-0000-4000-8000-000000000103'::uuid, 'TERMS_OF_SERVICE', true, 'uat-v1', 'APP', encode(digest('uat-u3-ip', 'sha256'), 'hex'), encode(digest('uat-u3-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('20000000-0000-4000-8000-000000000103'::uuid, 'PRIVACY_POLICY', true, 'uat-v1', 'APP', encode(digest('uat-u3-ip', 'sha256'), 'hex'), encode(digest('uat-u3-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('20000000-0000-4000-8000-000000000103'::uuid, 'PUSH_NOTIFICATION', true, 'uat-v1', 'APP', encode(digest('uat-u3-ip', 'sha256'), 'hex'), encode(digest('uat-u3-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('20000000-0000-4000-8000-000000000103'::uuid, 'MARKETING', true, 'uat-v1', 'APP', encode(digest('uat-u3-ip', 'sha256'), 'hex'), encode(digest('uat-u3-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('20000000-0000-4000-8000-000000000103'::uuid, 'ANALYTICS', true, 'uat-v1', 'APP', encode(digest('uat-u3-ip', 'sha256'), 'hex'), encode(digest('uat-u3-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('20000000-0000-4000-8000-000000000103'::uuid, 'ADS_PARTNER', true, 'uat-v1', 'APP', encode(digest('uat-u3-ip', 'sha256'), 'hex'), encode(digest('uat-u3-agent', 'sha256'), 'hex'), now(), NULL::timestamptz),
    ('20000000-0000-4000-8000-000000000103'::uuid, 'COMMUNITY_POLICY', true, 'uat-v1', 'APP', encode(digest('uat-u3-ip', 'sha256'), 'hex'), encode(digest('uat-u3-agent', 'sha256'), 'hex'), now(), NULL::timestamptz)
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
  ('20000000-0000-4000-8000-000000000501', '20000000-0000-4000-8000-000000000101', 'IOS', encode(digest('uat-u1-push-token', 'sha256'), 'hex'), encode(digest('uat-u1-ios-device', 'sha256'), 'hex'), '1.0.0-uat', 'iOS 18', 'ACTIVE', now()),
  ('20000000-0000-4000-8000-000000000502', '20000000-0000-4000-8000-000000000102', 'ANDROID', encode(digest('uat-u2-push-token', 'sha256'), 'hex'), encode(digest('uat-u2-android-device', 'sha256'), 'hex'), '1.0.0-uat', 'Android 15', 'ACTIVE', now()),
  ('20000000-0000-4000-8000-000000000503', '20000000-0000-4000-8000-000000000103', 'IOS', encode(digest('uat-u3-push-token', 'sha256'), 'hex'), encode(digest('uat-u3-ios-device', 'sha256'), 'hex'), '1.0.0-uat', 'iOS 18', 'ACTIVE', now()),
  ('20000000-0000-4000-8000-000000000504', '20000000-0000-4000-8000-000000000001', 'ADMIN_WEB', NULL, encode(digest('uat-admin-web-device', 'sha256'), 'hex'), 'admin-uat', 'Chrome', 'ACTIVE', now())
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
  '20000000-0000-4000-8000-000000000601'::uuid,
  ar.admin_role_id,
  '20000000-0000-4000-8000-000000000001'::uuid,
  'ACTIVE',
  now(),
  '20000000-0000-4000-8000-000000000001'::uuid
FROM public.admin_roles ar
WHERE ar.role_key = 'owner'
  AND NOT EXISTS (
    SELECT 1
    FROM public.admin_role_members arm
    WHERE arm.admin_role_id = ar.admin_role_id
      AND arm.user_id = '20000000-0000-4000-8000-000000000001'::uuid
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
  ('20000000-0000-4000-8000-000000001001', '20000000-0000-4000-8000-000000000101', '2026-06', 25, 3600000, 1100000, 'ACTIVE'),
  ('20000000-0000-4000-8000-000000001002', '20000000-0000-4000-8000-000000000102', '2026-06', 10, 3900000, 900000, 'ACTIVE'),
  ('20000000-0000-4000-8000-000000001003', '20000000-0000-4000-8000-000000000103', '2026-06', 20, 3000000, 700000, 'ACTIVE')
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
    ('20000000-0000-4000-8000-000000001101'::uuid, '20000000-0000-4000-8000-000000000101'::uuid, '2026-06'::char(7), 1::smallint, 'RENT', 'UAT 월세', 700000::bigint, 'MONTHLY', 'SCHEDULED'),
    ('20000000-0000-4000-8000-000000001102'::uuid, '20000000-0000-4000-8000-000000000101'::uuid, '2026-06'::char(7), 5::smallint, 'TELECOM', 'UAT 통신비', 62000::bigint, 'MONTHLY', 'PAID'),
    ('20000000-0000-4000-8000-000000001103'::uuid, '20000000-0000-4000-8000-000000000101'::uuid, '2026-06'::char(7), 12::smallint, 'SUBSCRIPTION', 'UAT 구독료', 19000::bigint, 'MONTHLY', 'SCHEDULED'),

    ('20000000-0000-4000-8000-000000001104'::uuid, '20000000-0000-4000-8000-000000000102'::uuid, '2026-06'::char(7), 3::smallint, 'LOAN', 'UAT 대출상환', 320000::bigint, 'MONTHLY', 'SCHEDULED'),
    ('20000000-0000-4000-8000-000000001105'::uuid, '20000000-0000-4000-8000-000000000102'::uuid, '2026-06'::char(7), 7::smallint, 'INSURANCE', 'UAT 보험료', 88000::bigint, 'MONTHLY', 'PAID'),

    ('20000000-0000-4000-8000-000000001106'::uuid, '20000000-0000-4000-8000-000000000103'::uuid, '2026-06'::char(7), 2::smallint, 'RENT', 'UAT 쉐어하우스', 480000::bigint, 'MONTHLY', 'SCHEDULED'),
    ('20000000-0000-4000-8000-000000001107'::uuid, '20000000-0000-4000-8000-000000000103'::uuid, '2026-06'::char(7), 8::smallint, 'TELECOM', 'UAT 통신비', 55000::bigint, 'MONTHLY', 'SCHEDULED')
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
    ('20000000-0000-4000-8000-000000001201'::uuid, '20000000-0000-4000-8000-000000000101'::uuid, '2026-06'::char(7), 25::smallint, 'SAVINGS', 'UAT 선저축', 650000::bigint, 'MONTHLY', 'TRANSFERRED'),
    ('20000000-0000-4000-8000-000000001202'::uuid, '20000000-0000-4000-8000-000000000101'::uuid, '2026-06'::char(7), 25::smallint, 'EMERGENCY_FUND', 'UAT 비상금', 250000::bigint, 'MONTHLY', 'SCHEDULED'),

    ('20000000-0000-4000-8000-000000001203'::uuid, '20000000-0000-4000-8000-000000000102'::uuid, '2026-06'::char(7), 10::smallint, 'INVESTMENT', 'UAT ETF', 400000::bigint, 'MONTHLY', 'TRANSFERRED'),
    ('20000000-0000-4000-8000-000000001204'::uuid, '20000000-0000-4000-8000-000000000102'::uuid, '2026-06'::char(7), 10::smallint, 'PENSION', 'UAT 연금저축', 250000::bigint, 'MONTHLY', 'SCHEDULED'),

    ('20000000-0000-4000-8000-000000001205'::uuid, '20000000-0000-4000-8000-000000000103'::uuid, '2026-06'::char(7), 20::smallint, 'SAVINGS', 'UAT 커뮤니티러 적금', 300000::bigint, 'MONTHLY', 'TRANSFERRED')
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
  ('20000000-0000-4000-8000-000000001301', '20000000-0000-4000-8000-000000000101', '2026-06-15', 40000, 0, 40000, 0, 'OPEN', now()),
  ('20000000-0000-4000-8000-000000001302', '20000000-0000-4000-8000-000000000101', '2026-06-16', 40000, 0, 40000, 0, 'OPEN', now()),

  ('20000000-0000-4000-8000-000000001303', '20000000-0000-4000-8000-000000000102', '2026-06-15', 30000, 0, 30000, 0, 'OPEN', now()),
  ('20000000-0000-4000-8000-000000001304', '20000000-0000-4000-8000-000000000102', '2026-06-16', 30000, 0, 30000, 0, 'OPEN', now()),

  ('20000000-0000-4000-8000-000000001305', '20000000-0000-4000-8000-000000000103', '2026-06-15', 35000, 0, 35000, 0, 'OPEN', now()),
  ('20000000-0000-4000-8000-000000001306', '20000000-0000-4000-8000-000000000103', '2026-06-16', 35000, 0, 35000, 0, 'OPEN', now())
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
    ('20000000-0000-4000-8000-000000001401'::uuid, '20000000-0000-4000-8000-000000000101'::uuid, '2026-06-15'::date, '2026-06-15 08:30:00+09'::timestamptz, 'FOOD', 'UAT 식당 A', '정상 예산 식사', 8000::bigint, 'uat-seed-u1-20260615-food'),
    ('20000000-0000-4000-8000-000000001402'::uuid, '20000000-0000-4000-8000-000000000101'::uuid, '2026-06-15'::date, '2026-06-15 12:40:00+09'::timestamptz, 'CAFE', 'UAT 카페 A', '정상 예산 커피', 5200::bigint, 'uat-seed-u1-20260615-cafe'),
    ('20000000-0000-4000-8000-000000001403'::uuid, '20000000-0000-4000-8000-000000000101'::uuid, '2026-06-16'::date, '2026-06-16 19:10:00+09'::timestamptz, 'TRANSPORT', 'UAT 교통', '교통비', 1550::bigint, 'uat-seed-u1-20260616-transport'),

    ('20000000-0000-4000-8000-000000001404'::uuid, '20000000-0000-4000-8000-000000000102'::uuid, '2026-06-15'::date, '2026-06-15 12:20:00+09'::timestamptz, 'FOOD', 'UAT 식당 B', '예산 초과 전 점심', 18000::bigint, 'uat-seed-u2-20260615-food'),
    ('20000000-0000-4000-8000-000000001405'::uuid, '20000000-0000-4000-8000-000000000102'::uuid, '2026-06-15'::date, '2026-06-15 20:30:00+09'::timestamptz, 'CULTURE', 'UAT 강의', '예산 초과 검증용 자기계발비', 25000::bigint, 'uat-seed-u2-20260615-over'),
    ('20000000-0000-4000-8000-000000001406'::uuid, '20000000-0000-4000-8000-000000000102'::uuid, '2026-06-16'::date, '2026-06-16 13:20:00+09'::timestamptz, 'FOOD', 'UAT 식당 C', '예산 회복 시나리오', 9000::bigint, 'uat-seed-u2-20260616-food'),

    ('20000000-0000-4000-8000-000000001407'::uuid, '20000000-0000-4000-8000-000000000103'::uuid, '2026-06-15'::date, '2026-06-15 09:10:00+09'::timestamptz, 'EDUCATION', 'UAT 서점', 'LV UP 독서 자료', 15000::bigint, 'uat-seed-u3-20260615-book'),
    ('20000000-0000-4000-8000-000000001408'::uuid, '20000000-0000-4000-8000-000000000103'::uuid, '2026-06-16'::date, '2026-06-16 18:30:00+09'::timestamptz, 'FOOD', 'UAT 식당 D', '커뮤니티 인증 후 식사', 12000::bigint, 'uat-seed-u3-20260616-food')
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
  (
    '20000000-0000-4000-8000-000000002001',
    '20000000-0000-4000-8000-000000000101',
    'PAYDAY',
    'UAT 월급 계획 확인',
    '월급 수령 후 선저축과 납치금액 목표를 확인하세요.',
    'PLAN',
    '20000000-0000-4000-8000-000000001001',
    jsonb_build_object('yearMonth', '2026-06', 'scenario', 'happy_path', 'source', 'uat_seed'),
    'READ',
    2,
    '2026-06-15 09:00:00+09',
    '2026-06-15 09:00:10+09',
    '2026-06-15 09:05:00+09',
    '2026-12-31 23:59:59+09'
  ),
  (
    '20000000-0000-4000-8000-000000002002',
    '20000000-0000-4000-8000-000000000102',
    'BUDGET_OVER',
    'UAT 일일예산 초과',
    '오늘 예산을 초과했습니다. 남은 지출 계획을 조정하세요.',
    'DAILY_BUDGET',
    '20000000-0000-4000-8000-000000001303',
    jsonb_build_object('budgetDate', '2026-06-15', 'scenario', 'over_budget', 'source', 'uat_seed'),
    'SENT',
    1,
    '2026-06-15 21:00:00+09',
    '2026-06-15 21:00:05+09',
    NULL,
    '2026-12-31 23:59:59+09'
  ),
  (
    '20000000-0000-4000-8000-000000002003',
    '20000000-0000-4000-8000-000000000103',
    'GROWTH_TASK',
    'UAT LV UP 미션',
    '오늘의 독서/뉴스/영어/건강 미션을 완료하고 경험치를 획득하세요.',
    'LEVEL_UP',
    NULL,
    jsonb_build_object('mission', 'READING', 'scenario', 'growth', 'source', 'uat_seed'),
    'SENT',
    5,
    '2026-06-16 07:30:00+09',
    '2026-06-16 07:30:05+09',
    NULL,
    '2026-12-31 23:59:59+09'
  ),
  (
    '20000000-0000-4000-8000-000000002004',
    '20000000-0000-4000-8000-000000000103',
    'COMMUNITY_COMMENT',
    'UAT 댓글 알림',
    '내 글에 새로운 댓글이 달렸습니다.',
    'POST_DETAIL',
    '20000000-0000-4000-8000-000000003003',
    jsonb_build_object('postId', '20000000-0000-4000-8000-000000003003', 'source', 'uat_seed'),
    'SCHEDULED',
    4,
    '2026-06-16 22:00:00+09',
    NULL,
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
  ('20000000-0000-4000-8000-000000002101', '20000000-0000-4000-8000-000000002001', '20000000-0000-4000-8000-000000000501', 'EXPO', 'PUSH', 'DELIVERED', 'uat-expo-message-001', NULL, 1, '2026-06-15 09:00:09+09', '2026-06-15 09:00:12+09', NULL),
  ('20000000-0000-4000-8000-000000002102', '20000000-0000-4000-8000-000000002002', '20000000-0000-4000-8000-000000000502', 'EXPO', 'PUSH', 'DELIVERED', 'uat-expo-message-002', NULL, 1, '2026-06-15 21:00:04+09', '2026-06-15 21:00:08+09', NULL),
  ('20000000-0000-4000-8000-000000002103', '20000000-0000-4000-8000-000000002003', '20000000-0000-4000-8000-000000000503', 'EXPO', 'PUSH', 'DELIVERED', 'uat-expo-message-003', NULL, 1, '2026-06-16 07:30:04+09', '2026-06-16 07:30:08+09', NULL)
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
    ('20000000-0000-4000-8000-000000002201'::uuid, '20000000-0000-4000-8000-000000000101'::uuid, 'READING', '2026-06-15'::date, 'UAT 독서 미션 완료: 급여관리 습관 체크리스트를 작성했다.'),
    ('20000000-0000-4000-8000-000000002202'::uuid, '20000000-0000-4000-8000-000000000102'::uuid, 'NEWS', '2026-06-15'::date, 'UAT 뉴스 미션 완료: 경제 뉴스 요약 후 예산 초과 원인을 정리했다.'),
    ('20000000-0000-4000-8000-000000002203'::uuid, '20000000-0000-4000-8000-000000000103'::uuid, 'ENGLISH', '2026-06-16'::date, 'UAT 영어 미션 완료: 예산과 저축 관련 문장을 학습했다.'),
    ('20000000-0000-4000-8000-000000002204'::uuid, '20000000-0000-4000-8000-000000000103'::uuid, 'HEALTH', '2026-06-16'::date, 'UAT 건강 미션 완료: 퇴근 후 20분 루틴을 완료했다.')
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
    '20000000-0000-4000-8000-000000003001',
    '20000000-0000-4000-8000-000000000101',
    'MONEY_TIP',
    'UAT 선저축 성공 시나리오',
    '월급이 들어오면 선저축과 비상금을 먼저 분리하는 UAT 검증 게시글입니다.',
    false,
    false,
    false,
    'PUBLISHED'
  ),
  (
    '20000000-0000-4000-8000-000000003002',
    '20000000-0000-4000-8000-000000000102',
    'QUESTION',
    'UAT 예산 초과 후 조정 질문',
    '예산 초과 후 다음날 예산을 어떻게 조정할지 검증하기 위한 질문 게시글입니다.',
    true,
    true,
    false,
    'PUBLISHED'
  ),
  (
    '20000000-0000-4000-8000-000000003003',
    '20000000-0000-4000-8000-000000000103',
    'LEVEL_UP_PROOF',
    'UAT LV UP 인증 게시글',
    '독서, 영어, 건강 루틴 완료 후 인증 플로우를 검증합니다.',
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
    '20000000-0000-4000-8000-000000003101',
    '20000000-0000-4000-8000-000000003001',
    '20000000-0000-4000-8000-000000000102',
    NULL,
    'UAT 댓글: 선저축 우선순위가 명확해서 좋습니다.',
    false,
    'ACTIVE'
  ),
  (
    '20000000-0000-4000-8000-000000003102',
    '20000000-0000-4000-8000-000000003002',
    '20000000-0000-4000-8000-000000000101',
    NULL,
    'UAT 댓글: 예산 초과분은 주간 단위로 조정하는 흐름을 추천합니다.',
    false,
    'ACTIVE'
  ),
  (
    '20000000-0000-4000-8000-000000003103',
    '20000000-0000-4000-8000-000000003003',
    '20000000-0000-4000-8000-000000000101',
    NULL,
    'UAT 댓글: 인증 게시글과 LV UP 통계가 잘 연결되는지 확인하겠습니다.',
    false,
    'ACTIVE'
  ),
  (
    '20000000-0000-4000-8000-000000003104',
    '20000000-0000-4000-8000-000000003002',
    '20000000-0000-4000-8000-000000000102',
    '20000000-0000-4000-8000-000000003102',
    'UAT 대댓글: 주간 단위 조정으로 테스트하겠습니다.',
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
  ('20000000-0000-4000-8000-000000003201', '20000000-0000-4000-8000-000000000102', 'POST', '20000000-0000-4000-8000-000000003001', 'LIKE'),
  ('20000000-0000-4000-8000-000000003202', '20000000-0000-4000-8000-000000000101', 'POST', '20000000-0000-4000-8000-000000003002', 'LIKE'),
  ('20000000-0000-4000-8000-000000003203', '20000000-0000-4000-8000-000000000103', 'POST', '20000000-0000-4000-8000-000000003001', 'BOOKMARK'),
  ('20000000-0000-4000-8000-000000003204', '20000000-0000-4000-8000-000000000101', 'COMMENT', '20000000-0000-4000-8000-000000003104', 'LIKE'),
  ('20000000-0000-4000-8000-000000003205', '20000000-0000-4000-8000-000000000102', 'POST', '20000000-0000-4000-8000-000000003003', 'SHARE')
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
    '20000000-0000-4000-8000-000000003301',
    '20000000-0000-4000-8000-000000000101',
    'POST',
    '20000000-0000-4000-8000-000000003002',
    'OTHER',
    'UAT 신고 처리 검증용 합성 신고입니다.',
    'RESOLVED',
    '20000000-0000-4000-8000-000000000001',
    'UAT 정책 위반 없음으로 처리했습니다.',
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
    '20000000-0000-4000-8000-000000003401',
    'COMMUNITY_POST',
    '20000000-0000-4000-8000-000000003003',
    'https://assets.example.invalid/uat/community/lv-up-proof.webp',
    'uat/community/lv-up-proof.webp',
    'image/webp',
    204800,
    repeat('d', 64),
    'ACTIVE',
    '20000000-0000-4000-8000-000000000103'
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
  '20000000-0000-4000-8000-000000004001',
  'Salary Hijacking UAT Partner',
  'INTERNAL',
  'ACTIVE',
  'uat.partner@example.invalid',
  'privacy.uat.partner@example.invalid',
  'uat-seed-partner',
  'KRW',
  true,
  false,
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
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
  '20000000-0000-4000-8000-000000004101'::uuid,
  pa.partner_account_id,
  'UAT LV UP 제휴 배너',
  'LEVEL_UP',
  'https://assets.example.invalid/uat/ads/lv-up-banner.webp',
  'https://uat.example.invalid/partners/lv-up',
  '2026-01-01 00:00:00+09'::timestamptz,
  '2026-12-31 23:59:59+09'::timestamptz,
  'LIVE',
  10,
  'CONSENT_BASED',
  jsonb_build_object('context', 'level_up', 'segment', 'uat_acceptance_non_financial_segment'),
  'ADS_PARTNER',
  'LOW',
  'CPC',
  120,
  0,
  0,
  1000,
  50000,
  'UAT 광고 캠페인입니다. 재무 원천 데이터 타겟팅 없음.',
  '20000000-0000-4000-8000-000000000001'::uuid,
  '20000000-0000-4000-8000-000000000001'::uuid,
  '20000000-0000-4000-8000-000000000001'::uuid,
  '20000000-0000-4000-8000-000000000001'::uuid,
  now(),
  now()
FROM public.partner_accounts pa
WHERE pa.contract_reference = 'uat-seed-partner'
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
    '20000000-0000-4000-8000-000000004201',
    '20000000-0000-4000-8000-000000004101',
    '20000000-0000-4000-8000-000000000101',
    'LEVEL_UP',
    'IMPRESSION',
    jsonb_build_object('ADS_PARTNER', true, 'version', 'uat-v1'),
    jsonb_build_object('screen', 'LEVEL_UP', 'source', 'uat_seed'),
    'uat-ad-event-impression-0001',
    encode(digest('uat-u1-session-ad-1', 'sha256'), 'hex'),
    encode(digest('uat-u1-device-ad-1', 'sha256'), 'hex'),
    '2026-06-16 10:00:00+09'
  ),
  (
    '20000000-0000-4000-8000-000000004202',
    '20000000-0000-4000-8000-000000004101',
    '20000000-0000-4000-8000-000000000101',
    'LEVEL_UP',
    'CLICK',
    jsonb_build_object('ADS_PARTNER', true, 'version', 'uat-v1'),
    jsonb_build_object('screen', 'LEVEL_UP', 'source', 'uat_seed'),
    'uat-ad-event-click-0001',
    encode(digest('uat-u1-session-ad-1', 'sha256'), 'hex'),
    encode(digest('uat-u1-device-ad-1', 'sha256'), 'hex'),
    '2026-06-16 10:00:05+09'
  ),
  (
    '20000000-0000-4000-8000-000000004203',
    '20000000-0000-4000-8000-000000004101',
    '20000000-0000-4000-8000-000000000103',
    'LEVEL_UP',
    'IMPRESSION',
    jsonb_build_object('ADS_PARTNER', true, 'version', 'uat-v1'),
    jsonb_build_object('screen', 'LEVEL_UP', 'source', 'uat_seed'),
    'uat-ad-event-impression-0002',
    encode(digest('uat-u3-session-ad-1', 'sha256'), 'hex'),
    encode(digest('uat-u3-device-ad-1', 'sha256'), 'hex'),
    '2026-06-16 11:00:00+09'
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
  '20000000-0000-4000-8000-000000004301',
  '20000000-0000-4000-8000-000000000001',
  'ALL',
  'UAT 인수검증 환경 공지',
  '이 공지는 UAT seed 데이터로 생성된 인수검증용 샘플 공지입니다.',
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
  '20000000-0000-4000-8000-000000004401',
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'SEV4',
  'UAT seed 검증용 운영 이벤트',
  'UAT 환경에서 장애 대응 화면과 감사로그 검색을 검증하기 위한 합성 이벤트입니다.',
  'RESOLVED',
  'INFRA',
  'UAT seed 데이터 생성',
  '영향 없음. 합성 데이터로 확인 완료.',
  'rollback 불필요. 필요 시 UAT DB reset.',
  'https://uat.example.invalid/postmortems/uat-seed',
  'uat-seed-v1',
  'uat-seed-incident-0001',
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
  '20000000-0000-4000-8000-000000004501',
  '20000000-0000-4000-8000-000000000001',
  jsonb_build_array(jsonb_build_object('role_key', 'owner', 'name', 'Owner')),
  'UAT_SEED_APPLIED',
  'SYSTEM',
  NULL,
  NULL,
  jsonb_build_object('seed', 'uat.seed.sql', 'status', 'applied'),
  jsonb_build_object('schema', 'public', 'environment', 'uat', 'containsSensitiveRawData', false),
  'SYSTEM',
  'INFO',
  'uat-seed-audit-0001',
  encode(digest('uat-seed-ip', 'sha256'), 'hex'),
  encode(digest('uat-seed-agent', 'sha256'), 'hex'),
  now()
)
ON CONFLICT (admin_audit_log_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 9. 서버 권위 재계산 보정
-- -----------------------------------------------------------------------------

SELECT public.recalculate_payroll_plan('20000000-0000-4000-8000-000000001001'::uuid, 'UAT_SEED_FINAL_RECALCULATE');
SELECT public.recalculate_payroll_plan('20000000-0000-4000-8000-000000001002'::uuid, 'UAT_SEED_FINAL_RECALCULATE');
SELECT public.recalculate_payroll_plan('20000000-0000-4000-8000-000000001003'::uuid, 'UAT_SEED_FINAL_RECALCULATE');

SELECT public.recalculate_user_growth_stats('20000000-0000-4000-8000-000000000101'::uuid);
SELECT public.recalculate_user_growth_stats('20000000-0000-4000-8000-000000000102'::uuid);
SELECT public.recalculate_user_growth_stats('20000000-0000-4000-8000-000000000103'::uuid);

COMMIT;
