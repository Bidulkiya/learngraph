-- ========================================
-- 020: 전체 정합성 점검 후 수정
-- ========================================
-- 마이그레이션 001~019의 전수 점검에서 발견된 문제를 일괄 수정한다.
--
-- 수정 항목:
-- [CRITICAL] emotion_reports.generated_at 컬럼 누락
-- [CRITICAL] tutor_conversations RLS 정책 없음
-- [CRITICAL] classes, class_students, subjects RLS 미활성화
-- [WARNING]  주요 테이블 인덱스 누락
-- [WARNING]  기존 마이그레이션의 DROP POLICY IF EXISTS 미선행 (여기서 재정의)

-- ============================================
-- 1. emotion_reports.generated_at 컬럼 추가
-- ============================================
-- emotion.ts에서 .select('..., generated_at')로 조회하지만
-- 013_special_features.sql의 CREATE TABLE에 이 컬럼이 빠져있음.
-- created_at과 동일한 의미이므로 DEFAULT now()로 추가.
ALTER TABLE emotion_reports
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ DEFAULT now();

-- 기존 행의 generated_at을 created_at으로 채움 (NULL 방지)
UPDATE emotion_reports
  SET generated_at = created_at
  WHERE generated_at IS NULL;

-- ============================================
-- 2. tutor_conversations RLS 정책 추가
-- ============================================
-- 001_initial.sql에서 ENABLE ROW LEVEL SECURITY는 했으나
-- CREATE POLICY가 하나도 없어 authenticated 사용자도 읽기/쓰기 불가.

DROP POLICY IF EXISTS "Students can manage own conversations" ON tutor_conversations;
CREATE POLICY "Students can manage own conversations" ON tutor_conversations
  FOR ALL USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Teachers can view conversations" ON tutor_conversations;
CREATE POLICY "Teachers can view conversations" ON tutor_conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM skill_trees st
      WHERE st.id = tutor_conversations.skill_tree_id
        AND st.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all conversations" ON tutor_conversations;
CREATE POLICY "Admins can view all conversations" ON tutor_conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ============================================
-- 3. RLS 미활성화 테이블 수정
-- ============================================
-- classes, class_students, subjects: 006에서 정책이 생성되었으나
-- ENABLE ROW LEVEL SECURITY가 없어 정책이 무효화 상태.

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. 누락된 인덱스 추가
-- ============================================
-- 쿼리 빈도 기반 우선순위로 정렬

-- quiz_attempts — student_id, node_id 모두 다수 Server Action에서 조회
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student
  ON quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_node
  ON quiz_attempts(node_id);

-- tutor_conversations — achievements.ts + tutor.ts
CREATE INDEX IF NOT EXISTS idx_tutor_conversations_student
  ON tutor_conversations(student_id);

-- skill_trees — class_id (25회), created_by (14회) 사용
CREATE INDEX IF NOT EXISTS idx_skill_trees_class
  ON skill_trees(class_id) WHERE class_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_skill_trees_created_by
  ON skill_trees(created_by);

-- student_progress — node_id (quiz.ts, skill-tree.ts에서 빈번)
CREATE INDEX IF NOT EXISTS idx_progress_node
  ON student_progress(node_id);

-- activity_feed — user_id (achievements.ts 피드 반응 카운트)
CREATE INDEX IF NOT EXISTS idx_feed_user
  ON activity_feed(user_id);

-- classes — teacher_id (RLS 정책 + 다수 Server Action)
CREATE INDEX IF NOT EXISTS idx_classes_teacher
  ON classes(teacher_id);

-- class_enrollments — student_id (빈번한 승인/조회)
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student
  ON class_enrollments(student_id);

-- school_members — user_id (랭킹, 대시보드)
CREATE INDEX IF NOT EXISTS idx_school_members_user
  ON school_members(user_id);

-- direct_messages — sender/receiver pair (메시지 조회)
CREATE INDEX IF NOT EXISTS idx_dm_sender ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dm_receiver ON direct_messages(receiver_id);

-- daily_missions — student_id + mission_date (매일 조회)
CREATE INDEX IF NOT EXISTS idx_daily_missions_student_date
  ON daily_missions(student_id, mission_date);

-- weekly_plans — student_id + week_start (주간 계획 캐시 조회)
CREATE INDEX IF NOT EXISTS idx_weekly_plans_student_week
  ON weekly_plans(student_id, week_start);

-- weekly_plan_missions — student_id + week_start (미션 조회)
CREATE INDEX IF NOT EXISTS idx_weekly_plan_missions_student_week
  ON weekly_plan_missions(student_id, week_start);
