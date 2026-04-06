-- ========================================
-- FIX: profiles RLS 무한재귀 수정
-- ========================================
-- 원인: "Teachers can view student profiles"와 "Admins can view all profiles" 정책이
--   profiles 테이블 안에서 profiles를 다시 SELECT하여 무한재귀 발생.
--   → auth.jwt()로 JWT 메타데이터에서 직접 role을 확인하도록 변경.

-- 기존 자기참조 정책 삭제
DROP POLICY IF EXISTS "Teachers can view student profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- JWT 메타데이터 기반으로 재생성 (profiles 테이블을 다시 쿼리하지 않음)
CREATE POLICY "Teachers can view all profiles" ON profiles
  FOR SELECT USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'teacher'
  );

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );
