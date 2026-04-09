import { getCurrentProfile } from '@/components/layout/RoleGuard'
import { getTeacherClassesWithTrees } from '@/actions/quiz'
import { TeacherQuizManager } from './TeacherQuizManager'

export default async function TeacherQuizzesPage() {
  const profile = await getCurrentProfile()
  if (!profile) return null

  const { data: classes } = await getTeacherClassesWithTrees()

  return <TeacherQuizManager initialClasses={classes ?? []} />
}
