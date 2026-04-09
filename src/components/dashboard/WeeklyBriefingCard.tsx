'use client'

import { useState, useEffect } from 'react'
import { Newspaper, RefreshCw, Loader2, ChevronDown, ChevronUp, CheckCircle, AlertCircle, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { generateWeeklyBriefing, type WeeklyBriefing } from '@/actions/briefing'
import { toast } from 'sonner'

interface ClassOption {
  id: string
  name: string
}

interface Props {
  classes: ClassOption[]
  selectedClassIdOverride?: string | null
  hideInternalSelector?: boolean
}

export function WeeklyBriefingCard({ classes, selectedClassIdOverride, hideInternalSelector }: Props) {
  const [internalSelectedClass, setInternalSelectedClass] = useState<string>(classes[0]?.id ?? '')
  const selectedClass = selectedClassIdOverride ?? internalSelectedClass
  const setSelectedClass = setInternalSelectedClass
  const [briefing, setBriefing] = useState<WeeklyBriefing | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [expanded, setExpanded] = useState(true)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!selectedClass) return
    let cancelled = false
    setLoading(true)
    setBriefing(null)
    generateWeeklyBriefing(selectedClass, false).then(res => {
      if (cancelled) return
      if (res.data) setBriefing(res.data)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [selectedClass])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleRefresh = async (): Promise<void> => {
    if (!selectedClass) return
    setGenerating(true)
    const res = await generateWeeklyBriefing(selectedClass, true)
    setGenerating(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    if (res.data) {
      setBriefing(res.data)
      toast.success('브리핑이 새로 생성되었습니다')
    }
  }

  if (classes.length === 0) return null

  const weekStartFormatted = briefing
    ? new Date(briefing.week_start).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
    : ''

  return (
    <Card className="border-[#4F6BF6]/30 bg-gradient-to-br from-[#4F6BF6]/5 to-[#7C5CFC]/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Newspaper className="h-4 w-4 text-[#4F6BF6]" />
            이번 주 학습 브리핑
            {briefing && <span className="text-xs font-normal text-gray-500">· {weekStartFormatted} 주차</span>}
          </CardTitle>
          <div className="flex items-center gap-2">
            {classes.length > 1 && !hideInternalSelector && (
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="rounded-md border bg-background px-2 py-1 text-xs"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={generating}
            >
              {generating
                ? <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                : <RefreshCw className="mr-1 h-3 w-3" />}
              새로 생성
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-[#4F6BF6]" />
            </div>
          ) : !briefing ? (
            <div className="py-6 text-center">
              <p className="text-sm text-gray-500 mb-3">아직 이번 주 브리핑이 없습니다</p>
              <Button
                size="sm"
                onClick={handleRefresh}
                disabled={generating}
                className="bg-[#4F6BF6] hover:bg-[#4F6BF6]/90"
              >
                {generating ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                AI 브리핑 생성
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 요약 */}
              <div className="rounded-lg bg-white p-3 text-sm dark:bg-gray-900">
                <p className="text-gray-700 dark:text-gray-300">{briefing.summary}</p>
              </div>

              {/* 성과 */}
              {briefing.highlights.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-400">
                    <CheckCircle className="h-3 w-3" />
                    주요 성과
                  </p>
                  <ul className="space-y-1 text-sm">
                    {briefing.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 rounded bg-green-50 p-2 dark:bg-green-950/30">
                        <span className="text-green-600">✓</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 우려 */}
              {briefing.concerns.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-orange-700 dark:text-orange-400">
                    <AlertCircle className="h-3 w-3" />
                    우려 사항
                  </p>
                  <ul className="space-y-1 text-sm">
                    {briefing.concerns.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 rounded bg-orange-50 p-2 dark:bg-orange-950/30">
                        <span className="text-orange-600">!</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 권장 행동 */}
              {briefing.action_items.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-[#4F6BF6]">
                    <Target className="h-3 w-3" />
                    권장 행동
                  </p>
                  <ul className="space-y-1 text-sm">
                    {briefing.action_items.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 rounded bg-[#4F6BF6]/5 p-2">
                        <span className="text-[#4F6BF6]">→</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
