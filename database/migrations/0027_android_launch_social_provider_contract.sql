-- 0027_android_launch_social_provider_contract.sql
-- Android commercial launch: restrict active auth provider contract to
-- password/email, Kakao, Naver, and Google. Historical unsupported provider
-- rows are not deleted automatically; the migration fails before changing
-- constraints if any are present so operators can decide a reviewed cleanup.

BEGIN;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '180s';
SET LOCAL idle_in_transaction_session_timeout = '180s';
SET LOCAL timezone = 'Asia/Seoul';

DO $$
DECLARE
  v_identity_count integer;
  v_oauth_state_count integer;
BEGIN
  SELECT count(*) INTO v_identity_count
  FROM public.auth_identities
  WHERE provider NOT IN ('EMAIL', 'PASSWORD', 'GOOGLE', 'KAKAO', 'NAVER');

  IF v_identity_count > 0 THEN
    RAISE EXCEPTION
      '0027_android_launch_social_provider_contract blocked: unsupported auth identity provider rows exist: %',
      v_identity_count;
  END IF;

  SELECT count(*) INTO v_oauth_state_count
  FROM public.auth_oauth_states
  WHERE provider NOT IN ('GOOGLE', 'KAKAO', 'NAVER');

  IF v_oauth_state_count > 0 THEN
    RAISE EXCEPTION
      '0027_android_launch_social_provider_contract blocked: unsupported oauth state provider rows exist: %',
      v_oauth_state_count;
  END IF;
END;
$$;

ALTER TABLE public.auth_identities
  DROP CONSTRAINT IF EXISTS chk_auth_provider,
  ADD CONSTRAINT chk_auth_provider
    CHECK (provider IN ('EMAIL', 'PASSWORD', 'GOOGLE', 'KAKAO', 'NAVER'));

ALTER TABLE public.auth_oauth_states
  DROP CONSTRAINT IF EXISTS chk_auth_oauth_states_provider,
  ADD CONSTRAINT chk_auth_oauth_states_provider
    CHECK (provider IN ('GOOGLE', 'KAKAO', 'NAVER'));

COMMENT ON CONSTRAINT chk_auth_provider ON public.auth_identities
IS 'Android launch auth providers: EMAIL/PASSWORD plus Kakao, Naver, and Google only for the current commercial Android release.';

COMMENT ON CONSTRAINT chk_auth_oauth_states_provider ON public.auth_oauth_states
IS 'Android launch OAuth state providers: Kakao, Naver, and Google only.';

COMMIT;
