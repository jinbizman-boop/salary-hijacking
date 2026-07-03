-- Salary Hijacking profile persistence fields.
-- These columns support the mobile My Page/Profile editing flow while keeping
-- raw contact and financial data out of profile API responses.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS avatar_attachment_id text,
  ADD COLUMN IF NOT EXISTS birth_year integer,
  ADD COLUMN IF NOT EXISTS occupation_category text;

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS chk_user_profiles_avatar_attachment_id_length,
  ADD CONSTRAINT chk_user_profiles_avatar_attachment_id_length
    CHECK (
      avatar_attachment_id IS NULL
      OR char_length(trim(avatar_attachment_id)) BETWEEN 1 AND 160
    );

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS chk_user_profiles_birth_year_range,
  ADD CONSTRAINT chk_user_profiles_birth_year_range
    CHECK (birth_year IS NULL OR birth_year BETWEEN 1900 AND 2100);

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS chk_user_profiles_occupation_category_length,
  ADD CONSTRAINT chk_user_profiles_occupation_category_length
    CHECK (
      occupation_category IS NULL
      OR char_length(trim(occupation_category)) BETWEEN 1 AND 80
    );

COMMENT ON COLUMN public.user_profiles.avatar_attachment_id
IS 'Mobile profile avatar upload attachment reference; never an auth token or raw file payload.';

COMMENT ON COLUMN public.user_profiles.birth_year
IS 'Optional birth year for profile personalization; stored as an integer year only.';

COMMENT ON COLUMN public.user_profiles.occupation_category
IS 'Optional coarse occupation category for profile display and contextual UX only.';
