import { TreePine, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getMyClasses } from '@/actions/school'
import { ClassCardActions } from './ClassCardActions'

export default async function TeacherClassesPage() {
  const { data: classes } = await getMyClasses()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">내 클래스</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          담당 클래스와 학생 수강신청을 관리하세요
        </p>
      </div>

      {!classes || classes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
              <TreePine className="h-8 w-8 text-gray-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                담당 클래스가 없습니다
              </p>
              <p className="mt-1 text-sm text-gray-500">
                운영자가 클래스를 배정하면 여기에 표시됩니다
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <Card key={c.id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TreePine className="h-4 w-4 text-[#10B981]" />
                  {c.name}
                </CardTitle>
                <CardDescription>{c.school_name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    학생 {c.student_count}명
                  </span>
                  <span>스킬트리 {c.skill_tree_count}개</span>
                </div>
                <ClassCardActions classId={c.id} classCode={c.class_code ?? ''} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
