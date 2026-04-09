-- 주간 학습 계획 요일별 미션 추적
-- AI 학습 코치가 생성한 주간 계획의 각 요일별 노드 배정과
-- 학생의 완료 여부를 저장. 퀴즈 정답 시 자동으로 completed 처리된다.

CREATE TABLE IF NOT EXISTS weekly_plan_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  day text NOT NULL CHECK (day IN ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun')),
  node_id uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, week_start, day, node_id)
);

-- 조회 성능용 인덱스
-- (주 단위로 학생별 미션을 가져오는 쿼리가 가장 빈번함)
CREATE INDEX IF NOT EXISTS idx_wpm_student_week
  ON weekly_plan_missions(student_id, week_start);
CREATE INDEX IF NOT EXISTS idx_wpm_week
  ON weekly_plan_missions(week_start);

-- weekly_plans에 보너스 지급 여부 플래그 추가
-- 월~금 전부 완료 시 +100 XP를 한 주에 한 번만 지급하기 위함
ALTER TABLE weekly_plans
  ADD COLUMN IF NOT EXISTS bonus_awarded boolean NOT NULL DEFAULT false;

-- RLS: 본인 것만 조회/수정
ALTER TABLE weekly_plan_missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Student can read own plan missions" ON weekly_plan_missions;
CREATE POLICY "Student can read own plan missions" ON weekly_plan_missions
  FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Student can modify own plan missions" ON weekly_plan_missions;
CREATE POLICY "Student can modify own plan missions" ON weekly_plan_missions
  FOR ALL USING (auth.uid() = student_id);
