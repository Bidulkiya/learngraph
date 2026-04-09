-- 일별 랭킹 스냅샷 — "클래스 1등 3일 연속 유지", "스쿨 1등 30일 연속 유지" 등
-- 지속형 업적을 위한 기반 테이블.
--
-- 매일 학생의 업적 체크 시점에 현재 클래스/스쿨 1등 여부를 기록한다.
-- 업적 계산 시 최근 N일의 연속 1등 일수를 세어 조건 달성 여부 판정.

CREATE TABLE IF NOT EXISTS daily_ranking_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  class_top1 boolean NOT NULL DEFAULT false,
  school_top1 boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, snapshot_date)
);

-- 최근 N일 연속 조회용 인덱스 (가장 빈번한 쿼리 패턴)
CREATE INDEX IF NOT EXISTS idx_drs_student_date
  ON daily_ranking_snapshots(student_id, snapshot_date DESC);

-- RLS — 본인 스냅샷만 읽기 가능. 쓰기는 service_role만.
ALTER TABLE daily_ranking_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Student can read own ranking snapshots" ON daily_ranking_snapshots;
CREATE POLICY "Student can read own ranking snapshots" ON daily_ranking_snapshots
  FOR SELECT USING (auth.uid() = student_id);

-- 랭킹 업적 조건값 상향 (난이도 상향)
-- 기존: 1회 랭크인 = 달성
-- 신규: N일 연속 유지 필요
--
-- condition_value 의미:
--   class_top1:             3  = 3일 연속 클래스 1등
--   school_top1:            3  = 3일 연속 스쿨 1등
--   class_top1_persistent:  14 = 14일 연속 클래스 1등 (클래스 왕좌)
--   school_top1_persistent: 30 = 30일 연속 스쿨 1등 (스쿨 왕좌)

UPDATE achievements
  SET condition_value = 3,
      description = '3일 연속 클래스 XP 랭킹 1등을 유지했습니다'
  WHERE code = 'class_top1';

UPDATE achievements
  SET condition_value = 3,
      description = '3일 연속 스쿨 XP 랭킹 1등을 유지했습니다'
  WHERE code = 'school_top1';

UPDATE achievements
  SET condition_value = 14,
      description = '14일 연속 클래스 XP 랭킹 1등을 유지한 진정한 왕'
  WHERE code = 'class_top1_persistent';

UPDATE achievements
  SET condition_value = 30,
      description = '30일 연속 스쿨 XP 랭킹 1등을 유지한 전설의 왕'
  WHERE code = 'school_top1_persistent';
