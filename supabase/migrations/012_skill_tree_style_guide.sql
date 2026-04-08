-- ========================================
-- Phase 8-B: 교사 스타일 학습
-- 교사가 직접 작성한 학습 문서를 AI가 분석한 결과를 저장.
-- 같은 스킬트리의 다른 노드 학습 문서 생성 시 프롬프트에 주입.
-- ========================================

ALTER TABLE skill_trees ADD COLUMN IF NOT EXISTS style_guide TEXT;

COMMENT ON COLUMN skill_trees.style_guide IS '교사가 업로드한 학습 문서를 AI가 분석한 스타일 가이드 (구성/톤/형식). 같은 스킬트리의 다른 노드 학습 문서 생성 시 프롬프트에 주입.';
