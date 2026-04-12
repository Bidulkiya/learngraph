import Link from 'next/link'
import { getCurrentProfile } from '@/components/layout/RoleGuard'
import { getMyChildren } from '@/actions/parent'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Heart, KeyRound } from 'lucide-react'
import { ParentDashboardView } from './ParentDashboardView'

export default async function ParentDashboardPage() {
  const profile = await getCurrentProfile()
  if (!profile) return null

  const { data: children } = await getMyChildren()
  const childList = children ?? []

  if (childList.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            안녕하세요, {profile.name}님 👋
          </h1>
          <p className="mt-1 text-gray-500">자녀의 학습을 함께 응원해주세요</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="h-4 w-4 text-pink-500" />
              자녀를 먼저 연결해주세요
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              자녀의 학습 현황을 보려면 먼저 자녀 계정과 연결해야 합니다.
              자녀에게 <strong>NodeBloom 앱에서 학부모 초대 코드</strong>를 받아
              아래 버튼을 눌러 입력해주세요.
            </p>
            <Link href="/parent/link">
              <Button className="bg-pink-500 hover:bg-pink-500/90">
                <KeyRound className="mr-2 h-4 w-4" />
                자녀 연결 코드 입력하기
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <ParentDashboardView parentName={profile.name} students={childList} />
}
