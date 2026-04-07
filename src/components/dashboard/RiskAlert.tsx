'use client'

import { AlertTriangle, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export interface RiskStudent {
  id: string
  name: string
  reason: string
  severity: 'warning' | 'danger'
}

interface RiskAlertProps {
  students: RiskStudent[]
}

export function RiskAlert({ students }: RiskAlertProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-[#F59E0B]" />
          위험군 학생 알림
        </CardTitle>
      </CardHeader>
      <CardContent>
        {students.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">위험군 학생이 없습니다</p>
        ) : (
          <ul className="space-y-2">
            {students.map(s => (
              <li
                key={s.id}
                className={`flex items-center gap-3 rounded-lg border p-2 text-sm ${
                  s.severity === 'danger'
                    ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30'
                    : 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30'
                }`}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-gray-800">
                  <User className="h-4 w-4 text-gray-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.reason}</p>
                </div>
                <Badge variant={s.severity === 'danger' ? 'destructive' : 'secondary'} className="text-xs">
                  {s.severity === 'danger' ? '위험' : '주의'}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
