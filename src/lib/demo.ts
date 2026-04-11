/**
 * 데모 계정 판별 + 쓰기 가드.
 *
 * 데모 계정은 읽기 전용이다. 모든 쓰기 Server Action 상단에서
 * assertNotDemo(user.email)를 호출하여 차단한다.
 *
 * 이메일 도메인(@learngraph.app)은 Supabase Auth에 저장된 기존 계정 식별자와
 * 동일해야 하므로 브랜드 전환 후에도 변경하지 않는다. 표시명(UI/학교명)만 NodeBloom.
 */

export const DEMO_TEACHER_EMAIL = 'demo_teacher@learngraph.app'
export const DEMO_STUDENT_EMAIL = 'demo_student@learngraph.app'
export const DEMO_LEARNER_EMAIL = 'demo_learner@learngraph.app'
export const DEMO_PASSWORD = 'demo1234'

// 레거시 데모 계정 (기존 데이터 보존을 위해 판별에 포함)
const LEGACY_DEMO_EMAILS = [
  'demo_student1@learngraph.app',
  'demo_student2@learngraph.app',
  'demo_student3@learngraph.app',
]

const ALL_DEMO_EMAILS = new Set<string>([
  DEMO_TEACHER_EMAIL,
  DEMO_STUDENT_EMAIL,
  DEMO_LEARNER_EMAIL,
  ...LEGACY_DEMO_EMAILS,
])

/**
 * 주어진 이메일이 데모 계정인지 판별.
 */
export function isDemoAccount(email: string | null | undefined): boolean {
  if (!email) return false
  return ALL_DEMO_EMAILS.has(email.toLowerCase().trim())
}

/**
 * Server Action에서 데모 계정의 쓰기 작업을 차단하는 가드.
 * 데모 계정이면 null, 아니면 undefined 반환.
 *
 * 사용 패턴:
 * ```ts
 * const demoBlock = assertNotDemo(user.email)
 * if (demoBlock) return demoBlock
 * ```
 */
export function assertNotDemo(
  email: string | null | undefined
): { error: string } | null {
  if (isDemoAccount(email)) {
    return {
      error: '둘러보기 모드에서는 이 기능을 사용할 수 없습니다. 회원가입 후 이용해주세요!',
    }
  }
  return null
}
