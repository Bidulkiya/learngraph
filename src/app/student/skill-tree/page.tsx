import Link from 'next/link'
import { TreePine, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/components/layout/RoleGuard'
import { getMyClassesWithSkillTrees } from '@/actions/school'
import { ClassSkillTreesList } from './ClassSkillTreesList'

export default async function StudentSkillTreeListPage() {
  const profile = await getCurrentProfile()
  if (!profile) return null

  const admin = createAdminClient()

  // 병렬: 내 클래스+스킬트리 + 승인 대기 enrollments
  const [classesRes, pendingRes] = await Promise.all([
    getMyClassesWithSkillTrees(),
    admin
      .from('class_enrollments')
      .select('class_id, classes(name)')
      .eq('student_id', profile.id)
      .eq('status', 'pending'),
  ])

  const classesWithTrees = classesRes.data ?? []
  const pendingEnrollments = pendingRes.data ?? []

  const hasNoClasses = classesWithTrees.length === 0
  // "클래스는 있는데 모든 클래스가 스킬트리가 없음" 케이스도 empty 상태로 처리
  const hasNoTrees =
    !hasNoClasses && classesWithTrees.every(c => c.skill_trees.length === 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">내 학습</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          소속 클래스의 스킬트리를 확인하세요
        </p>
      </div>

      {/* 승인 대기 중 */}
      {pendingEnrollments.length > 0 && (
        <Card className="border-[#F59E0B]/30 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center gap-2">
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
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                      대기
                    </Badge>
                    <span>{name}</span>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {hasNoClasses || hasNoTrees ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
              <TreePine className="h-8 w-8 text-gray-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {hasNoClasses
                  ? '아직 소속된 클래스가 없습니다'
                  : '소속 클래스에 스킬트리가 없습니다'}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {hasNoClasses
                  ? '초대 코드로 클래스에 가입해주세요'
                  : '교사가 스킬트리를 만들면 여기에 표시됩니다'}
              </p>
            </div>
            {hasNoClasses && (
              <Link href="/student/join">
                <Badge className="cursor-pointer bg-[#4F6BF6]">
                  코드로 가입하러 가기 →
                </Badge>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <ClassSkillTreesList classes={classesWithTrees} />
      )}
    </div>
  )
}
