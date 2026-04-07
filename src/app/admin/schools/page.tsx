import Link from 'next/link'
import { Plus, School as SchoolIcon, Users, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getMySchools } from '@/actions/school'

export default async function AdminSchoolsPage() {
  const { data: schools } = await getMySchools()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">스쿨 관리</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            스쿨을 만들고 교사/학생을 초대하세요
          </p>
        </div>
        <Link href="/admin/schools/new">
          <Button className="bg-[#F59E0B] hover:bg-[#F59E0B]/90">
            <Plus className="mr-2 h-4 w-4" />
            새 스쿨 만들기
          </Button>
        </Link>
      </div>

      {!schools || schools.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F59E0B]/10">
              <SchoolIcon className="h-8 w-8 text-[#F59E0B]" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900 dark:text-white">아직 스쿨이 없습니다</p>
              <p className="mt-1 text-sm text-gray-500">첫 번째 스쿨을 만들어 시작하세요</p>
            </div>
            <Link href="/admin/schools/new">
              <Button className="bg-[#F59E0B] hover:bg-[#F59E0B]/90">
                <Plus className="mr-2 h-4 w-4" />
                스쿨 만들기
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schools.map((school) => (
            <Link key={school.id} href={`/admin/schools/${school.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <SchoolIcon className="h-4 w-4 text-[#F59E0B]" />
                    {school.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">{school.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" />
                      교사 {school.teacher_count}명
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      학생 {school.student_count}명
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs">
                      교사: {school.teacher_code}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      학생: {school.student_code}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
