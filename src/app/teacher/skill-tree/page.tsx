import Link from 'next/link'
import { Plus, TreePine, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/components/layout/RoleGuard'

export default async function SkillTreeListPage() {
  const profile = await getCurrentProfile()
  if (!profile) return null

  // admin client로 조회 — anon client의 RLS에서 auth.uid()가
  // Server Component 쿠키 컨텍스트에서 불안정하게 작동하는 이슈 우회.
  // 인증은 getCurrentProfile()에서 이미 확인됨.
  const admin = createAdminClient()

  const { data: skillTrees } = await admin
    .from('skill_trees')
    .select('*, nodes(count)')
    .eq('created_by', profile.id)
    .order('created_at', { ascending: false })

  const statusLabel: Record<string, string> = {
    draft: '초안',
    published: '게시됨',
    archived: '보관됨',
  }

  const statusColor: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-700',
    published: 'bg-green-100 text-green-700',
    archived: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">스킬트리 관리</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">생성한 스킬트리를 관리하세요</p>
        </div>
        <Link href="/teacher/skill-tree/new">
          <Button className="bg-[#10B981] hover:bg-[#10B981]/90">
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
              description="PDF를 업로드하거나 수업을 녹음하면 AI가 자동으로 커리큘럼을 만들어줍니다."
              detail="1. PDF 업로드 → 2. AI 분석 → 3. 스킬트리 + 퀴즈 + 학습 문서 완성!"
              actionHref="/teacher/skill-tree/new"
              actionLabel="스킬트리 만들기"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {skillTrees.map((tree) => {
            const nodeCount = Array.isArray(tree.nodes) ? tree.nodes[0]?.count ?? 0 : 0
            return (
              <Link key={tree.id} href={`/teacher/skill-tree/${tree.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <TreePine className="h-4 w-4 text-[#10B981]" />
                        {tree.title}
                      </CardTitle>
                      <Badge className={statusColor[tree.status]} variant="secondary">
                        {statusLabel[tree.status]}
                      </Badge>
                    </div>
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
