-- ========================================
-- Phase 10-fix: 학생 주간 학습 계획 캐싱
-- 같은 주(월~일) 동안 같은 계획 유지
-- ========================================

CREATE TABLE IF NOT EXISTS weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  plan JSONB NOT NULL,
  motivation TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_plans_student_week
  ON weekly_plans(student_id, week_start DESC);

ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students view own plans" ON weekly_plans;
CREATE POLICY "Students view own plans" ON weekly_plans
  FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students manage own plans" ON weekly_plans;
CREATE POLICY "Students manage own plans" ON weekly_plans
  FOR ALL USING (auth.uid() = student_id);

COMMENT ON TABLE weekly_plans IS '학생 주간 학습 계획 캐시 (같은 주 재호출 시 DB에서 반환)';
