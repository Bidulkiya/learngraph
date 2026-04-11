import Link from 'next/link'
import { Plus, TreePine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/components/layout/RoleGuard'

export default async function LearnerSkillTreeListPage() {
  const profile = await getCurrentProfile()
  if (!profile) return null

  const admin = createAdminClient()
  const { data: skillTrees } = await admin
    .from('skill_trees')
    .select('id, title, description, subject_hint, created_at, nodes(count)')
    .eq('created_by', profile.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">내 스킬트리</h1>
          <p className="mt-1 text-gray-500">PDF를 업로드하면 AI가 스킬트리를 자동 생성합니다</p>
        </div>
        <Link href="/learner/skill-tree/new">
          <Button className="bg-[#8B5CF6] hover:bg-[#8B5CF6]/90">
            <Plus className="mr-2 h-4 w-4" />
            새 스킬트리 만들기
          </Button>
        </Link>
      </div>

      {!skillTrees || skillTrees.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={<TreePine className="h-8 w-8" />}
              title="첫 스킬트리를 만들어보세요!"
              description="PDF를 업로드하면 AI가 자동으로 스킬트리 + 퀴즈 + 학습 문서를 만들어줍니다."
              detail="1. PDF 업로드 → 2. AI 분석 → 3. 스킬트리 완성!"
              actionHref="/learner/skill-tree/new"
              actionLabel="스킬트리 만들기"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {skillTrees.map((tree) => {
            const nodeCount = Array.isArray(tree.nodes) ? tree.nodes[0]?.count ?? 0 : 0
            return (
              <Link key={tree.id} href={`/learner/skill-tree/${tree.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <TreePine className="h-4 w-4 text-[#8B5CF6]" />
                      {tree.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-2 text-xs text-gray-500">{tree.description ?? ''}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <Badge variant="secondary">{nodeCount}개 노드</Badge>
                      <span className="text-xs text-gray-400">
                        {new Date(tree.created_at).toLocaleDateString('ko-KR')}
                      </span>
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
