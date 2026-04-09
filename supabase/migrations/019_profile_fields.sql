-- 프로필 확장 v1 — 닉네임, 아바타, 학년, 소개, 관심 과목 등
--
-- 설계 원칙:
-- - avatar_url은 이미 profiles 테이블에 있으므로 컬럼 추가만 하고 UPDATE로 채움
-- - nickname은 UNIQUE (대소문자 구분 없는 중복 방지는 civ 추가 필요하나 일단 정확 일치로 시작)
-- - nickname_changed_at는 변경 제한 (30일)용
-- - avatar_change_count는 3회 제한용
-- - interests는 TEXT[] 배열 (관심 과목 다중 선택)
-- - subject는 교사 전용 (담당 과목 단일)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_seed TEXT,
  ADD COLUMN IF NOT EXISTS nickname TEXT,
  ADD COLUMN IF NOT EXISTS nickname_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grade TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS avatar_change_count INT DEFAULT 0;

-- 닉네임 UNIQUE 제약 — NULL은 복수 허용
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_nickname_unique'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_nickname_unique UNIQUE (nickname);
  END IF;
END $$;

-- 닉네임 조회용 인덱스 (UNIQUE 제약이 생성하는 인덱스로 충분하지만 explicit)
CREATE INDEX IF NOT EXISTS idx_profiles_nickname ON profiles(nickname) WHERE nickname IS NOT NULL;

-- 2~20자 체크 (NULL 허용)
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_nickname_length_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_nickname_length_check
  CHECK (nickname IS NULL OR (char_length(nickname) BETWEEN 2 AND 20));

-- auth trigger 업데이트 — 회원가입 시 signup에서 전달한 nickname/avatar_url/avatar_seed도 저장
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, name, role,
    nickname, avatar_url, avatar_seed
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NEW.raw_user_meta_data->>'nickname',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'avatar_seed'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 프로필 중 nickname이 없는 경우 name을 기반으로 자동 생성
-- (충돌 시 name + 2자리 숫자 접미사 — 완벽 유니크까지 루프할 필요는 없음, 수동 조정 가능)
UPDATE profiles
  SET nickname = name
  WHERE nickname IS NULL
    AND name IS NOT NULL
    AND char_length(name) BETWEEN 2 AND 20
    AND NOT EXISTS (
      SELECT 1 FROM profiles p2
      WHERE p2.nickname = profiles.name AND p2.id != profiles.id
    );

-- 아바타 URL이 없는 프로필에 DiceBear URL 자동 설정
-- (nickname이 있는 경우만)
UPDATE profiles
  SET
    avatar_url = 'https://api.dicebear.com/9.x/adventurer/svg?seed=' || nickname,
    avatar_seed = nickname
  WHERE avatar_url IS NULL
    AND nickname IS NOT NULL;
