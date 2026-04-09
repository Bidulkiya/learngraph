-- 업적 시스템 대폭 확장 (10개 → 36개)
-- - achievements 테이블에 category, is_hidden 컬럼 추가
-- - 기존 10개는 유지하고 category만 업데이트
-- - 신규 26개 업적을 ON CONFLICT DO NOTHING으로 추가

ALTER TABLE achievements
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

-- code에 UNIQUE 제약이 없을 수 있음 — 확인 후 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'achievements_code_key'
  ) THEN
    ALTER TABLE achievements ADD CONSTRAINT achievements_code_key UNIQUE (code);
  END IF;
END $$;

-- 1. 기존 10개 업적에 category 부여
UPDATE achievements SET category = 'learning' WHERE code IN (
  'first_unlock', 'five_unlocks', 'ten_unlocks',
  'tree_complete', 'perfect_quiz', 'quiz_master', 'five_streak_correct'
) AND category IS NULL;

UPDATE achievements SET category = 'streak' WHERE code IN ('streak_3', 'streak_7') AND category IS NULL;

UPDATE achievements SET category = 'social' WHERE code = 'helper' AND category IS NULL;

-- 2. 신규 업적 26개 INSERT

-- 학습 업적 8개 신규
INSERT INTO achievements (code, title, description, icon, xp_reward, condition_type, condition_value, category, is_hidden)
VALUES
  ('twenty_unlocks', '산을 오르다', '노드 20개를 언락했습니다', '🏔️', 150, 'nodes_unlocked', 20, 'learning', false),
  ('fifty_unlocks', '전설의 등반', '노드 50개를 언락했습니다', '💫', 300, 'nodes_unlocked', 50, 'learning', false),
  ('tree_complete_3', '세 스킬트리 마스터', '스킬트리 3개를 완주했습니다', '🌟', 500, 'tree_complete', 3, 'learning', false),
  ('quiz_10', '퀴즈 초심자', '퀴즈 10개를 풀었습니다', '🎯', 40, 'quizzes_completed', 10, 'learning', false),
  ('quiz_50', '퀴즈 챔피언', '퀴즈 50개를 풀었습니다', '⭐', 120, 'quizzes_completed', 50, 'learning', false),
  ('quiz_100', '퀴즈 레전드', '퀴즈 100개를 풀었습니다', '💫', 250, 'quizzes_completed', 100, 'learning', false),
  ('perfect_quiz_5', '다섯 번의 완벽', '퀴즈 만점을 5회 달성했습니다', '✨', 120, 'perfect_score', 5, 'learning', false),
  ('ten_streak_correct', '연속 정답 제왕', '10문제 연속 정답을 달성했습니다', '🎖️', 150, 'streak_correct', 10, 'learning', false)
ON CONFLICT (code) DO NOTHING;

-- 스트릭 업적 4개 신규
INSERT INTO achievements (code, title, description, icon, xp_reward, condition_type, condition_value, category, is_hidden)
VALUES
  ('streak_14', '2주 파도', '14일 연속으로 학습했습니다', '🌊', 200, 'streak_days', 14, 'streak', false),
  ('streak_30', '한 달 번개', '30일 연속으로 학습했습니다', '⚡', 500, 'streak_days', 30, 'streak', false),
  ('weekly_plan_1', '주간 완주 1회', 'AI 학습 코치 주간 계획을 1주 완주했습니다', '📅', 100, 'weekly_plan_completed', 1, 'streak', false),
  ('weekly_plan_4', '한 달 완주', 'AI 학습 코치 주간 계획을 4주 완주했습니다', '📆', 400, 'weekly_plan_completed', 4, 'streak', false)
ON CONFLICT (code) DO NOTHING;

-- 랭킹 업적 4개 신규
INSERT INTO achievements (code, title, description, icon, xp_reward, condition_type, condition_value, category, is_hidden)
VALUES
  ('class_top1', '클래스 1등', '클래스 XP 랭킹에서 1등을 달성했습니다', '👑', 200, 'ranking_class_top1', 1, 'ranking', false),
  ('school_top1', '스쿨 1등', '스쿨 XP 랭킹에서 1등을 달성했습니다', '🏆', 500, 'ranking_school_top1', 1, 'ranking', false),
  ('class_top1_persistent', '클래스 왕좌', '계정 개설 후 1주 이상 + 클래스 1등 유지', '🥇', 400, 'ranking_class_top1_persistent', 1, 'ranking', false),
  ('school_top1_persistent', '스쿨 왕좌', '계정 개설 후 2주 이상 + 스쿨 1등 유지', '🎖️', 1000, 'ranking_school_top1_persistent', 1, 'ranking', false)
ON CONFLICT (code) DO NOTHING;

-- 소셜 업적 4개 신규
INSERT INTO achievements (code, title, description, icon, xp_reward, condition_type, condition_value, category, is_hidden)
VALUES
  ('tutor_30', '대화의 달인', 'AI 튜터에게 30번 질문했습니다', '🤝', 120, 'tutor_questions', 30, 'social', false),
  ('study_group_join', '동료를 만나다', '스터디 그룹에 가입했습니다', '💐', 50, 'study_group_joined', 1, 'social', false),
  ('feed_reactions_10', '인기 학생', '활동 피드에 리액션 10개를 받았습니다', '🎉', 100, 'feed_reactions_received', 10, 'social', false),
  ('flashcard_50', '복습의 달인', '플래시카드 50장을 복습했습니다', '📇', 150, 'flashcards_reviewed', 50, 'social', false)
ON CONFLICT (code) DO NOTHING;

-- 히든 업적 6개 신규
INSERT INTO achievements (code, title, description, icon, xp_reward, condition_type, condition_value, category, is_hidden)
VALUES
  ('night_owl', '밤의 올빼미', '밤 11시 이후에 퀴즈를 풀었습니다', '🦉', 80, 'night_quiz', 1, 'hidden', true),
  ('early_bird', '얼리 버드', '오전 6시 이전에 학습을 시작했습니다', '🐦', 80, 'early_activity', 1, 'hidden', true),
  ('marathon', '마라토너', '하루에 3시간 이상 학습했습니다', '🏃', 150, 'daily_marathon', 180, 'hidden', true),
  ('perfectionist', '완벽주의자', '스킬트리의 모든 노드를 만점으로 클리어했습니다', '💯', 300, 'perfect_tree', 1, 'hidden', true),
  ('explorer', '탐험가', '서로 다른 과목의 스킬트리 3개를 완주했습니다', '🧭', 400, 'cross_subject_trees', 3, 'hidden', true),
  ('phoenix', '불사조', '5연속 오답 후 같은 노드를 만점으로 클리어했습니다', '🔥', 200, 'phoenix_recovery', 1, 'hidden', true)
ON CONFLICT (code) DO NOTHING;

UPDATE achievements SET category = 'learning' WHERE category IS NULL;
