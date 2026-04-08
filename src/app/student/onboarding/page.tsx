import { getCurrentProfile } from '@/components/layout/RoleGuard'
import { redirect } from 'next/navigation'
import { OnboardingQuiz } from './OnboardingQuiz'

export default async function OnboardingPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'student') redirect(`/${profile.role}`)

  // 이미 진단 완료했으면 대시보드로
  if (profile.learning_style) {
    redirect('/student')
  }

  return <OnboardingQuiz />
}
