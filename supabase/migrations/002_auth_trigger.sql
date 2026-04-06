-- ========================================
-- profiles 자동 생성 트리거
-- ========================================
-- 방법 2 선택: Database Trigger
-- 이유: 클라이언트 측 insert보다 안정적.
--   1) RLS 정책에 영향받지 않음 (SECURITY DEFINER)
--   2) signUp 직후 네트워크 실패로 insert 누락 방지
--   3) auth.users 생성과 트랜잭션적으로 동작

-- auth.users → profiles 자동 삽입 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 등록
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- profiles INSERT 정책 추가 (트리거가 SECURITY DEFINER라 불필요하지만 안전장치)
CREATE POLICY "Allow insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 교사가 학생 진도를 조회할 수 있도록 프로필 SELECT 정책 추가
CREATE POLICY "Teachers can view student profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'teacher'
    )
  );

-- 운영자는 전체 프로필 접근
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
