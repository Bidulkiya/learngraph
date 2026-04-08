-- ========================================
-- Phase 10: 6개 고급 기능 통합 마이그레이션
-- 1) 학습 스타일 진단
-- 2) 노력 기반 도움 (기존 hint_used 컬럼 재사용)
-- 3) 학부모 역할 + parent_student_links
-- 4) 주간 브리핑 캐시
-- 5) 플래시카드
-- 6) 학습 성취 인증서
-- ========================================

-- 1. 학습 스타일 (profiles에 컬럼 추가)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS learning_style TEXT;
COMMENT ON COLUMN profiles.learning_style IS '학생 학습 스타일 진단 결과: visual | textual | practical | null(미진단)';

-- 2. 역할에 parent 추가 (기존 CHECK constraint 교체)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('teacher', 'student', 'admin', 'parent'));

-- 3. 학부모-학생 연결
CREATE TABLE IF NOT EXISTS parent_student_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_links_parent ON parent_student_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_links_student ON parent_student_links(student_id);

-- 학부모 초대 코드 (학생이 자기 대시보드에서 생성)
CREATE TABLE IF NOT EXISTS parent_invite_codes (
  code TEXT PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_invite_student ON parent_invite_codes(student_id);

ALTER TABLE parent_student_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_invite_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parents see own links" ON parent_student_links;
CREATE POLICY "Parents see own links" ON parent_student_links
  FOR SELECT USING (auth.uid() = parent_id OR auth.uid() = student_id);

DROP POLICY IF EXISTS "Students manage own invite codes" ON parent_invite_codes;
CREATE POLICY "Students manage own invite codes" ON parent_invite_codes
  FOR ALL USING (auth.uid() = student_id);

-- 4. 주간 브리핑 캐시
CREATE TABLE IF NOT EXISTS weekly_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  summary TEXT,
  highlights JSONB,
  concerns JSONB,
  action_items JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_briefings_class_week ON weekly_briefings(class_id, week_start DESC);

ALTER TABLE weekly_briefings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Class members view briefings" ON weekly_briefings;
CREATE POLICY "Class members view briefings" ON weekly_briefings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM classes c WHERE c.id = weekly_briefings.class_id AND c.teacher_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM class_enrollments ce
      WHERE ce.class_id = weekly_briefings.class_id
        AND ce.student_id = auth.uid()
        AND ce.status = 'approved'
    )
  );

-- 5. 플래시카드
CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  card_index INT NOT NULL DEFAULT 0,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flashcards_node ON flashcards(node_id, card_index);

-- 플래시카드 복습 결과 (알겠어요/다시볼게요)
CREATE TABLE IF NOT EXISTS flashcard_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  flashcard_id UUID REFERENCES flashcards(id) ON DELETE CASCADE,
  result TEXT NOT NULL CHECK (result IN ('known', 'unknown')),
  reviewed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_student ON flashcard_reviews(student_id, reviewed_at DESC);

ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view flashcards" ON flashcards;
CREATE POLICY "Anyone can view flashcards" ON flashcards FOR SELECT USING (true);

DROP POLICY IF EXISTS "Students manage own reviews" ON flashcard_reviews;
CREATE POLICY "Students manage own reviews" ON flashcard_reviews
  FOR ALL USING (auth.uid() = student_id);

-- 6. 학습 성취 인증서
CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  skill_tree_id UUID REFERENCES skill_trees(id) ON DELETE CASCADE,
  tree_title TEXT NOT NULL,
  node_count INT NOT NULL,
  avg_score INT NOT NULL,
  teacher_name TEXT,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, skill_tree_id)
);

CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates(student_id, issued_at DESC);

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students see own certificates" ON certificates;
CREATE POLICY "Students see own certificates" ON certificates
  FOR SELECT USING (auth.uid() = student_id);

COMMENT ON TABLE parent_student_links IS '학부모-학생 연결 매핑';
COMMENT ON TABLE weekly_briefings IS '주간 AI 학습 브리핑 캐시 (같은 주 재호출 시 DB에서 반환)';
COMMENT ON TABLE flashcards IS '노드 완료 시 AI가 자동 생성하는 플래시카드 (카드 앞/뒤)';
COMMENT ON TABLE flashcard_reviews IS '학생의 플래시카드 복습 결과 (알겠어요/다시볼게요)';
COMMENT ON TABLE certificates IS '스킬트리 100% 완료 시 발급되는 수료 인증서 메타데이터';
