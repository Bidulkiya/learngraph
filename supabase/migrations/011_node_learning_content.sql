-- ========================================
-- Phase 8-A: 노드별 학습 문서 시스템
-- ========================================

-- 1. nodes 테이블에 학습 문서 컬럼 추가
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS learning_content TEXT;
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS allow_download BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS allow_print BOOLEAN NOT NULL DEFAULT true;

-- 2. skill_trees 테이블에 과목 힌트 컬럼 추가 (테마 결정용)
ALTER TABLE skill_trees ADD COLUMN IF NOT EXISTS subject_hint TEXT;
-- subject_hint: 'science' | 'math' | 'korean' | 'default'

-- 3. Comments
COMMENT ON COLUMN nodes.learning_content IS 'AI가 생성한 또는 교사가 업로드한 마크다운 학습 문서';
COMMENT ON COLUMN nodes.allow_download IS '학생이 학습 문서를 PDF로 다운로드할 수 있는지 여부';
COMMENT ON COLUMN nodes.allow_print IS '학생이 학습 문서를 프린트할 수 있는지 여부';
COMMENT ON COLUMN skill_trees.subject_hint IS '시각 테마를 결정하는 과목 힌트 (science|math|korean|default)';
