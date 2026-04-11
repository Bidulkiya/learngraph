import NewSkillTreeForm from '@/app/teacher/skill-tree/new/NewSkillTreeForm'

/**
 * Learner 스킬트리 생성 — 교사 NewSkillTreeForm 재사용.
 * learner는 클래스가 없으므로 빈 배열 전달.
 */
export default function LearnerNewSkillTreePage() {
  return <NewSkillTreeForm classes={[]} />
}
