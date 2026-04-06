import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/components/layout/RoleGuard'
import { TeacherQuizManager } from './TeacherQuizManager'

export default async function TeacherQuizzesPage() {
  const profile = await getCurrentProfile()
  if (!profile) return null

  const admin = createAdminClient()

  const { data: trees } = await admin
    .from('skill_trees')
    .select('id, title, nodes(id, title, difficulty)')
    .eq('created_by', profile.id)
    .order('created_at', { ascending: false })

  return (
    <TeacherQuizManager
      skillTrees={(trees ?? []).map(t => ({
        id: t.id,
        title: t.title,
        nodes: Array.isArray(t.nodes) ? t.nodes : [],
      }))}
    />
  )
}
