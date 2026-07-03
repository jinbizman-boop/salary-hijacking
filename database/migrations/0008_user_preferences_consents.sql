-- Salary Hijacking mobile preference and consent persistence hardening.
-- Extends the existing user_settings/user_consents base tables for the Expo MY
-- settings and consent screens without allowing financial targeting consent.

BEGIN;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
SET LOCAL idle_in_transaction_session_timeout = '120s';
SET LOCAL timezone = 'Asia/Seoul';

DO $$
BEGIN
  IF to_regclass('public.user_settings') IS NULL THEN
    RAISE EXCEPTION '0008_user_preferences_consents.sql requires public.user_settings from 0001_init_users.sql';
  END IF;

  IF to_regclass('public.user_consents') IS NULL THEN
    RAISE EXCEPTION '0008_user_preferences_consents.sql requires public.user_consents from 0001_init_users.sql';
  END IF;
END;
$$;

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN IF NOT EXISTS week_starts_on_monday boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_amounts_in_community boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dashboard_compact_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payday_reminder_days_before integer NOT NULL DEFAULT 3;

ALTER TABLE public.user_settings
  DROP CONSTRAINT IF EXISTS chk_user_settings_theme,
  ADD CONSTRAINT chk_user_settings_theme
    CHECK (theme IN ('SYSTEM', 'LIGHT', 'DARK'));

ALTER TABLE public.user_settings
  DROP CONSTRAINT IF EXISTS chk_user_settings_payday_reminder_days,
  ADD CONSTRAINT chk_user_settings_payday_reminder_days
    CHECK (payday_reminder_days_before BETWEEN 0 AND 14);

ALTER TABLE public.user_consents
  DROP CONSTRAINT IF EXISTS chk_user_consents_type;

ALTER TABLE public.user_consents
  ADD CONSTRAINT chk_user_consents_type
    CHECK (
      consent_type IN (
        'TERMS_OF_SERVICE',
        'PRIVACY_POLICY',
        'PUSH_NOTIFICATION',
        'MARKETING',
        'ANALYTICS',
        'ADS_PARTNER',
        'CONTENT_RECOMMENDATION',
        'COMMUNITY_POLICY',
        'ADMIN_OPERATION_NOTICE'
      )
    );

COMMENT ON COLUMN public.user_settings.show_amounts_in_community
IS 'If true, the UI may show user-entered amounts in the user-owned community compose surface only. Ads, analytics, and partner payloads still cannot receive raw financial amounts.';

COMMENT ON COLUMN public.user_settings.payday_reminder_days_before
IS 'Mobile payday reminder lead time in days. Stored as an integer and bounded to 0..14.';

COMMENT ON CONSTRAINT chk_user_consents_type ON public.user_consents
IS 'Includes content recommendation consent while keeping financial targeting consent out of the user consent enum.';

COMMIT;
