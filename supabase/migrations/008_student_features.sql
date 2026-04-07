-- ========================================
-- Phase 7-B: 학생 경험 강화 기능
-- ========================================

CREATE TABLE IF NOT EXISTS daily_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  mission_type TEXT NOT NULL CHECK (mission_type IN ('unlock_node', 'complete_quiz', 'ask_tutor', 'review_node', 'study_time', 'weekly_challenge')),
  title TEXT NOT NULL,
  target INT DEFAULT 1,
  progress INT DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  xp_reward INT DEFAULT 20,
  mission_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, mission_type, mission_date)
);

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT DEFAULT '🏆',
  xp_reward INT DEFAULT 50,
  condition_type TEXT NOT NULL,
  condition_value INT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS node_memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  content TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, node_id)
);

CREATE TABLE IF NOT EXISTS review_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  remind_at DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS today_study_minutes INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS week_study_minutes INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_study_date DATE;

CREATE INDEX IF NOT EXISTS idx_daily_missions_student_date ON daily_missions(student_id, mission_date);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_node_memos_student ON node_memos(student_id);
CREATE INDEX IF NOT EXISTS idx_review_reminders_student ON review_reminders(student_id, remind_at);

ALTER TABLE daily_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students manage own missions" ON daily_missions;
CREATE POLICY "Students manage own missions" ON daily_missions FOR ALL USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Anyone view achievements" ON achievements;
CREATE POLICY "Anyone view achievements" ON achievements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage own achievements" ON user_achievements;
CREATE POLICY "Users manage own achievements" ON user_achievements FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students manage own memos" ON node_memos;
CREATE POLICY "Students manage own memos" ON node_memos FOR ALL USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students manage own reminders" ON review_reminders;
CREATE POLICY "Students manage own reminders" ON review_reminders FOR ALL USING (auth.uid() = student_id);

INSERT INTO achievements (code, title, description, icon, xp_reward, condition_type, condition_value) VALUES
('first_unlock', '첫 걸음', '첫 번째 노드를 언락했습니다', '🌱', 30, 'nodes_unlocked', 1),
('five_unlocks', '성장하는 나무', '노드 5개를 언락했습니다', '🌳', 50, 'nodes_unlocked', 5),
('ten_unlocks', '지식의 숲', '노드 10개를 언락했습니다', '🌲', 100, 'nodes_unlocked', 10),
('perfect_quiz', '완벽한 답', '퀴즈를 100점으로 통과했습니다', '⭐', 50, 'perfect_score', 1),
('streak_3', '3일 연속', '3일 연속으로 학습했습니다', '🔥', 40, 'streak_days', 3),
('streak_7', '일주일 달성', '7일 연속으로 학습했습니다', '💎', 100, 'streak_days', 7),
('quiz_master', '퀴즈 마스터', '퀴즈 30개를 풀었습니다', '🎯', 80, 'quizzes_completed', 30),
('tree_complete', '스킬트리 완주', '스킬트리를 100% 완료했습니다', '🏆', 200, 'tree_complete', 1),
('five_streak_correct', '연속 정답왕', '5문제 연속 정답을 달성했습니다', '🎪', 60, 'streak_correct', 5),
('helper', '질문왕', 'AI 튜터에게 10번 질문했습니다', '💬', 40, 'tutor_questions', 10)
ON CONFLICT (code) DO NOTHING;
