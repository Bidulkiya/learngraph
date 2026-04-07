'use client'

import { Users } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface TeacherActivity {
  teacher_id: string
  teacher_name: string
  skill_tree_count: number
  quiz_count: number
  student_count: number
  avg_unlock_rate: number
  last_active: string | null
}

export function TeacherActivityCard({ activities }: { activities: TeacherActivity[] }) {
  const chartData = activities.map(a => ({
    name: a.teacher_name.slice(0, 6),
    트리: a.skill_tree_count,
    퀴즈: a.quiz_count,
    학생: a.student_count,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-[#10B981]" />
          교사 활동 비교
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">활동 데이터가 없습니다</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 15 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="트리" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="퀴즈" fill="#4F6BF6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="학생" fill="#7C5CFC" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-3 space-y-1 text-xs">
              {activities.map(a => (
                <div key={a.teacher_id} className="flex items-center justify-between rounded border p-2 dark:border-gray-800">
                  <span className="font-medium">{a.teacher_name}</span>
                  <span className="text-gray-500">
                    평균 언락률 {a.avg_unlock_rate}% ·{' '}
                    {a.last_active
                      ? new Date(a.last_active).toLocaleDateString('ko-KR')
                      : '활동 없음'}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
