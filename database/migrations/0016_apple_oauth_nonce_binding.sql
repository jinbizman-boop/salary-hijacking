-- PHASE 3 auth closure: Apple OAuth nonce binding.
-- Stores only a SHA-256 nonce hash; raw OAuth nonce values must remain client/runtime only.

ALTER TABLE public.auth_oauth_states
  ADD COLUMN IF NOT EXISTS nonce_hash text;

ALTER TABLE public.auth_oauth_states
  DROP CONSTRAINT IF EXISTS chk_auth_oauth_states_nonce_hash_length;

ALTER TABLE public.auth_oauth_states
  ADD CONSTRAINT chk_auth_oauth_states_nonce_hash_length
    CHECK (
      nonce_hash IS NULL
      OR char_length(trim(nonce_hash)) BETWEEN 32 AND 128
    );

COMMENT ON COLUMN public.auth_oauth_states.nonce_hash IS
  'Optional SHA-256 hash of Apple OAuth nonce. Raw nonce is never stored.';
