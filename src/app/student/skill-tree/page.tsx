import Link from 'next/link'
import { TreePine, FileText, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/components/layout/RoleGuard'

export default async function StudentSkillTreeListPage() {
  const profile = await getCurrentProfile()
  if (!profile) return null

  const admin = createAdminClient()

  // 1. 학생이 승인된 클래스 조회
  const { data: approvedEnrollments } = await admin
    .from('class_enrollments')
    .select('class_id')
    .eq('student_id', profile.id)
    .eq('status', 'approved')

  const approvedClassIds = approvedEnrollments?.map(e => e.class_id) ?? []

  // 2. 승인 대기 중인 수강신청
  const { data: pendingEnrollments } = await admin
    .from('class_enrollments')
    .select('class_id, classes(name)')
    .eq('student_id', profile.id)
    .eq('status', 'pending')

  // 3. 승인된 클래스의 published 스킬트리
  let trees: Array<{
    id: string
    title: string
    description: string | null
    status: string
    created_at: string
    nodes: Array<{ count: number }>
  }> = []

  if (approvedClassIds.length > 0) {
    const { data } = await admin
      .from('skill_trees')
      .select('id, title, description, status, created_at, nodes(count)')
      .in('class_id', approvedClassIds)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
    trees = data ?? []
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">내 스킬트리</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          소속 클래스의 스킬트리를 확인하세요
        </p>
      </div>

      {/* 승인 대기 중 */}
      {pendingEnrollments && pendingEnrollments.length > 0 && (
        <Card className="border-[#F59E0B]/30 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-[#F59E0B]" />
              <p className="text-sm font-semibold text-[#F59E0B]">승인 대기 중</p>
            </div>
            <ul className="space-y-1 text-sm">
              {pendingEnrollments.map((e, i) => {
                // Supabase join 결과는 배열 또는 객체일 수 있음
                const classesData = e.classes as { name: string } | { name: string }[] | null
                const name = Array.isArray(classesData)
                  ? classesData[0]?.name ?? '알 수 없음'
                  : classesData?.name ?? '알 수 없음'
                return (
                  <li key={i} className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">대기</Badge>
                    <span>{name}</span>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {trees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
              <TreePine className="h-8 w-8 text-gray-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {approvedClassIds.length === 0
                  ? '아직 소속된 클래스가 없습니다'
                  : '소속 클래스에 스킬트리가 없습니다'}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {approvedClassIds.length === 0
                  ? '초대 코드로 클래스에 가입해주세요'
                  : '교사가 스킬트리를 만들면 여기에 표시됩니다'}
              </p>
            </div>
            {approvedClassIds.length === 0 && (
              <Link href="/student/join">
                <Badge className="cursor-pointer bg-[#4F6BF6]">
                  코드로 가입하러 가기 →
                </Badge>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trees.map((tree) => {
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
