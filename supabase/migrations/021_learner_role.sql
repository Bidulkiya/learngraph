-- 자기주도 학습자(learner) 역할 추가.
-- 대학생, 직장인, 자격증 준비생 등이 스쿨/클래스 없이 혼자서
-- PDF 업로드 → 스킬트리 생성 → 퀴즈 풀기까지 하는 독학용 역할.

-- profiles.role CHECK 제약 교체 (기존 데이터 영향 없음)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('teacher', 'student', 'admin', 'parent', 'learner'));
