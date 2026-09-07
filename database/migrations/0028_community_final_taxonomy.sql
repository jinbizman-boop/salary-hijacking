-- database/migrations/0028_community_final_taxonomy.sql
-- Final Community taxonomy: FREE / LEVELUP / HOBBY.

BEGIN;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '180s';
SET LOCAL idle_in_transaction_session_timeout = '180s';
SET LOCAL timezone = 'Asia/Seoul';

DO $$
BEGIN
  IF to_regclass('public.community_posts') IS NULL THEN
    RAISE EXCEPTION '0028_community_final_taxonomy.sql requires public.community_posts';
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'community_posts'
      AND column_name = 'board_type'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM public.community_posts
      WHERE upper(trim(board_type)) NOT IN (
        'ALL',
        'FREE',
        'LEVEL_UP_PROOF',
        'LEVELUP',
        'LEVEL_CERTIFICATION',
        'HOBBY',
        'QUESTION',
        'MONEY_TIP',
        'NOTICE_DISCUSSION',
        'SALARY_TALK',
        'BUDGET_TIP',
        'EXPENSE_CUT',
        'SAVINGS_GOAL',
        'SIDE_HUSTLE',
        'GENERAL',
        'NOTICE',
        'EVENT',
        'FAQ'
      )
    ) THEN
      RAISE EXCEPTION 'Unknown legacy community_posts.board_type value requires manual classification before final taxonomy migration';
    END IF;

    ALTER TABLE public.community_posts
      DROP CONSTRAINT IF EXISTS chk_community_posts_board_type;

    UPDATE public.community_posts
    SET board_type = CASE
      WHEN upper(trim(board_type)) IN ('LEVEL_UP_PROOF', 'LEVELUP', 'LEVEL_CERTIFICATION') THEN 'LEVEL_UP_PROOF'
      WHEN upper(trim(board_type)) IN ('HOBBY') THEN 'HOBBY'
      ELSE 'FREE'
    END
    WHERE board_type <> CASE
      WHEN upper(trim(board_type)) IN ('LEVEL_UP_PROOF', 'LEVELUP', 'LEVEL_CERTIFICATION') THEN 'LEVEL_UP_PROOF'
      WHEN upper(trim(board_type)) IN ('HOBBY') THEN 'HOBBY'
      ELSE 'FREE'
    END;

    ALTER TABLE public.community_posts
      ADD CONSTRAINT chk_community_posts_board_type
      CHECK (board_type IN ('FREE', 'LEVEL_UP_PROOF', 'HOBBY'))
      NOT VALID;

    ALTER TABLE public.community_posts
      VALIDATE CONSTRAINT chk_community_posts_board_type;
  END IF;
END;
$$;

DO $$
DECLARE
  v_free_board_id uuid;
  v_level_board_id uuid;
  v_hobby_board_id uuid;
BEGIN
  IF to_regclass('public.community_boards') IS NOT NULL THEN
    INSERT INTO public.community_boards (
      board_id,
      slug,
      type,
      name_ko,
      description_ko,
      sort_order,
      is_active,
      is_system,
      allow_anonymous,
      allow_questions,
      allow_attachments,
      moderation_pre_required,
      metadata
    )
    VALUES
      (
        gen_random_uuid(),
        'free',
        'free',
        '자유 게시판',
        '직장인 일상, 소비 통제, 월급 루틴을 자유롭게 나누는 게시판',
        10,
        true,
        true,
        true,
        true,
        true,
        false,
        '{}'::jsonb
      ),
      (
        gen_random_uuid(),
        'level-up-proof',
        'level_up_proof',
        '레벨업 인증',
        '독서, 뉴스, 외국어, 건강 미션 완료를 인증하는 게시판',
        20,
        true,
        true,
        true,
        false,
        true,
        false,
        '{}'::jsonb
      ),
      (
        gen_random_uuid(),
        'hobby',
        'hobby',
        '취미 게시판',
        '퇴근 후 취미와 자기계발 경험을 공유하는 게시판',
        30,
        true,
        true,
        true,
        true,
        true,
        false,
        '{}'::jsonb
      )
    ON CONFLICT (slug) DO UPDATE
    SET
      type = excluded.type,
      name_ko = excluded.name_ko,
      description_ko = excluded.description_ko,
      sort_order = excluded.sort_order,
      is_active = true,
      is_system = true,
      updated_at = now();

    SELECT board_id INTO v_free_board_id
    FROM public.community_boards
    WHERE slug = 'free'
    LIMIT 1;

    SELECT board_id INTO v_level_board_id
    FROM public.community_boards
    WHERE slug = 'level-up-proof'
    LIMIT 1;

    SELECT board_id INTO v_hobby_board_id
    FROM public.community_boards
    WHERE slug = 'hobby'
    LIMIT 1;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'community_posts'
        AND column_name = 'board_id'
    ) THEN
      IF EXISTS (
        SELECT 1
        FROM public.community_posts p
        JOIN public.community_boards b ON b.board_id = p.board_id
        WHERE lower(trim(coalesce(b.type, b.slug, b.name_ko))) NOT IN (
          'free',
          'level_up_proof',
          'level-up-proof',
          'hobby',
          'salary_talk',
          'saving_tip',
          'consumption_control',
          'money_tip',
          'question',
          'notice_discussion',
          'all',
          'general',
          'notice',
          'event',
          'faq',
          '자유',
          '자유 게시판',
          '레벨업',
          '레벨업 인증',
          '취미',
          '취미 게시판'
        )
      ) THEN
        RAISE EXCEPTION 'Unknown legacy community board value requires manual classification before final taxonomy migration';
      END IF;

      UPDATE public.community_posts p
      SET board_id = CASE
        WHEN lower(trim(coalesce(b.type, b.slug, b.name_ko))) IN ('level_up_proof', 'level-up-proof', '레벨업', '레벨업 인증') THEN v_level_board_id
        WHEN lower(trim(coalesce(b.type, b.slug, b.name_ko))) IN ('hobby', '취미', '취미 게시판') THEN v_hobby_board_id
        ELSE v_free_board_id
      END
      FROM public.community_boards b
      WHERE b.board_id = p.board_id
        AND p.board_id <> CASE
          WHEN lower(trim(coalesce(b.type, b.slug, b.name_ko))) IN ('level_up_proof', 'level-up-proof', '레벨업', '레벨업 인증') THEN v_level_board_id
          WHEN lower(trim(coalesce(b.type, b.slug, b.name_ko))) IN ('hobby', '취미', '취미 게시판') THEN v_hobby_board_id
          ELSE v_free_board_id
        END;
    END IF;

    UPDATE public.community_boards
    SET is_active = false,
        updated_at = now()
    WHERE slug NOT IN ('free', 'level-up-proof', 'hobby')
      AND is_system = true;
  END IF;
END;
$$;

COMMIT;
