import Link from 'next/link'
import { TreePine, FileText } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/components/layout/RoleGuard'

export default async function StudentSkillTreeListPage() {
  const profile = await getCurrentProfile()
  const supabase = await createServerClient()

  // 1. Get classes the student belongs to
  const { data: memberships } = await supabase
    .from('class_students')
    .select('class_id')
    .eq('student_id', profile?.id ?? '')

  const classIds = memberships?.map(m => m.class_id) ?? []

  // 2. Get published skill trees for those classes + any without class (directly assigned)
  let skillTrees: Array<{
    id: string
    title: string
    description: string | null
    status: string
    created_at: string
    nodes: Array<{ count: number }>
  }> = []

  if (classIds.length > 0) {
    const { data } = await supabase
      .from('skill_trees')
      .select('id, title, description, status, created_at, nodes(count)')
      .in('class_id', classIds)
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    skillTrees = data ?? []
  }

  // Also include skill trees where this student has progress (direct access)
  const { data: progressTrees } = await supabase
    .from('student_progress')
    .select('skill_tree_id')
    .eq('student_id', profile?.id ?? '')

  const progressTreeIds = [...new Set(progressTrees?.map(p => p.skill_tree_id) ?? [])]
  const existingIds = new Set(skillTrees.map(t => t.id))
  const missingIds = progressTreeIds.filter(id => !existingIds.has(id))

  if (missingIds.length > 0) {
    const { data: extraTrees } = await supabase
      .from('skill_trees')
      .select('id, title, description, status, created_at, nodes(count)')
      .in('id', missingIds)

    if (extraTrees) {
      skillTrees = [...skillTrees, ...extraTrees]
    }
  }

  // Also show ALL published skill trees for demo purposes (no class restriction)
  if (skillTrees.length === 0) {
    const { data: allPublished } = await supabase
      .from('skill_trees')
      .select('id, title, description, status, created_at, nodes(count)')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(20)

    skillTrees = allPublished ?? []
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">내 스킬트리</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">스킬트리를 선택하여 학습을 시작하세요</p>
      </div>

      {skillTrees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
              <TreePine className="h-8 w-8 text-gray-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900 dark:text-white">배정된 스킬트리가 없습니다</p>
              <p className="mt-1 text-sm text-gray-500">선생님이 수업에 스킬트리를 배정하면 여기에 표시됩니다</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {skillTrees.map((tree) => {
            const nodeCount = Array.isArray(tree.nodes) ? tree.nodes[0]?.count ?? 0 : 0
            return (
              <Link key={tree.id} href={`/student/skill-tree/${tree.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <TreePine className="h-4 w-4 text-[#4F6BF6]" />
                      {tree.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">{tree.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {nodeCount}개 노드
                      </span>
                      <span>{new Date(tree.created_at).toLocaleDateString('ko-KR')}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
