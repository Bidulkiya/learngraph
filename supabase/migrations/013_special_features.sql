-- ========================================
-- Phase 9: 5개 특색 기능
-- 1) 학습 감정 추적 리포트
-- 2) 적응형 복습 (간격/점수 컬럼 추가)
-- ========================================

-- 1. emotion_reports — 학생 감정 분석 결과 캐싱
CREATE TABLE IF NOT EXISTS emotion_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  skill_tree_id UUID REFERENCES skill_trees(id) ON DELETE CASCADE,
  mood TEXT NOT NULL,
  mood_score INT,
  insights TEXT,
  recommendation TEXT,
  node_emotions JSONB,
  report_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, skill_tree_id, report_date)
);

CREATE INDEX IF NOT EXISTS idx_emotion_reports_student ON emotion_reports(student_id, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_emotion_reports_tree ON emotion_reports(skill_tree_id, report_date DESC);

ALTER TABLE emotion_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Student views own emotion" ON emotion_reports;
CREATE POLICY "Student views own emotion" ON emotion_reports
  FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "System inserts emotion" ON emotion_reports;
CREATE POLICY "System inserts emotion" ON emotion_reports
  FOR ALL USING (auth.uid() = student_id);

-- 2. review_reminders — 적응형 간격 + 점수 컬럼 추가
ALTER TABLE review_reminders ADD COLUMN IF NOT EXISTS interval_days INT DEFAULT 1;
ALTER TABLE review_reminders ADD COLUMN IF NOT EXISTS review_score FLOAT;

COMMENT ON COLUMN review_reminders.interval_days IS '이 복습이 사용한 간격(일). 다음 간격 계산 시 prevInterval로 사용.';
COMMENT ON COLUMN review_reminders.review_score IS '복습 퀴즈 결과 점수(0-100). 다음 간격 자동 조정에 사용.';

COMMENT ON TABLE emotion_reports IS '학생 학습 감정 분석 결과 (Claude AI). 같은 날 재호출 시 캐시된 결과 반환.';
