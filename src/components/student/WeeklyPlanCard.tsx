'use client'

import { useState } from 'react'
import { Sparkles, Loader2, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getWeeklyPlan } from '@/actions/coach'
import type { WeeklyPlanOutput } from '@/lib/ai/schemas'
import { toast } from 'sonner'

export function WeeklyPlanCard() {
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<WeeklyPlanOutput | null>(null)

  const handleGenerate = async (): Promise<void> => {
    setLoading(true)
    const res = await getWeeklyPlan()
    setLoading(false)
    if (res.error || !res.data) {
      toast.error(res.error ?? '계획 생성 실패')
      return
    }
    setPlan(res.data)
  }

  return (
    <Card className="border-2 border-[#7C5CFC]/30 bg-gradient-to-br from-[#7C5CFC]/5 to-[#4F6BF6]/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-[#7C5CFC]" />
          AI 학습 코치
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!plan ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              AI가 당신의 진도와 약점을 분석해서 이번 주 최적 학습 계획을 세워드립니다
            </p>
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="bg-[#7C5CFC] hover:bg-[#7C5CFC]/90"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Calendar className="mr-2 h-4 w-4" />
              )}
              이번 주 계획 받기
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <ul className="space-y-2">
              {plan.plan.map((day, i) => (
                <li key={i} className="rounded-lg border bg-white p-2.5 text-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-[#7C5CFC]/10 text-[#7C5CFC]">
                      {day.day}
                    </Badge>
                    <span className="font-medium">{day.nodes.join(', ')}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{day.reason}</p>
                </li>
              ))}
            </ul>
            <div className="rounded-lg border-l-4 border-[#7C5CFC] bg-[#7C5CFC]/5 p-3">
              <p className="text-sm italic text-gray-700 dark:text-gray-300">
                💜 {plan.motivation}
              </p>
            </div>
            <Button onClick={handleGenerate} variant="outline" size="sm" className="w-full">
              다시 생성
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
