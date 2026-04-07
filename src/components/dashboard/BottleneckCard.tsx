'use client'

import { useState } from 'react'
import { Sparkles, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { analyzeBottlenecks } from '@/actions/analysis'
import type { BottleneckOutput } from '@/lib/ai/schemas'
import { toast } from 'sonner'

interface Props {
  schools: Array<{ id: string; name: string }>
}

export function BottleneckCard({ schools }: Props) {
  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BottleneckOutput | null>(null)

  const handleAnalyze = async (): Promise<void> => {
    if (!schoolId) return
    setLoading(true)
    const res = await analyzeBottlenecks(schoolId)
    setLoading(false)
    if (res.error || !res.data) {
      toast.error(res.error ?? '분석 실패')
      return
    }
    setResult(res.data)
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-[#F59E0B]" />
          AI 교육과정 병목 분석
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {schools.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">스쿨이 없습니다</p>
        ) : (
          <>
            <div className="flex gap-2">
              <select
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <Button
                onClick={handleAnalyze}
                disabled={loading}
                className="bg-[#F59E0B] hover:bg-[#F59E0B]/90"
                size="sm"
              >
                {loading ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                )}
                분석
              </Button>
            </div>

            {result && (
              <ul className="space-y-2">
                {result.bottlenecks.map((b, i) => (
                  <li key={i} className="rounded-lg border p-3 text-sm dark:border-gray-800">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold">{b.node}</p>
                      <Badge variant="destructive">{b.unlockRate}%</Badge>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      <span className="font-medium">원인:</span> {b.cause}
                    </p>
                    <p className="mt-0.5 text-xs text-[#F59E0B]">
                      <span className="font-medium">제안:</span> {b.suggestion}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
