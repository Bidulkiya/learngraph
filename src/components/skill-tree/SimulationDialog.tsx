'use client'

import { useState } from 'react'
import { Sparkles, Loader2, AlertTriangle, TrendingUp, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { simulateSkillTree } from '@/actions/simulation'
import type { SimulationOutput } from '@/lib/ai/schemas'
import { toast } from 'sonner'

interface Props {
  treeId: string
  treeTitle: string
}

export function SimulationDialog({ treeId, treeTitle }: Props) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<SimulationOutput | null>(null)
  const [loading, setLoading] = useState(false)

  const handleRun = async (): Promise<void> => {
    setLoading(true)
    setData(null)
    const res = await simulateSkillTree(treeId)
    setLoading(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    if (res.data) {
      setData(res.data)
      toast.success('시뮬레이션 완료')
    }
  }

  const passColor = (rate: number): string => {
    if (rate >= 80) return 'text-green-600'
    if (rate >= 60) return 'text-yellow-600'
    if (rate >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="border-[#7C5CFC]/40 text-[#7C5CFC] hover:bg-[#7C5CFC]/10"
        onClick={() => setOpen(true)}
      >
        <Sparkles className="mr-1 h-4 w-4" />
        AI 시뮬레이션
      </Button>
      <Dialog open={open} onOpenChange={(v) => setOpen(v)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#7C5CFC]" />
            가상 학생 100명 시뮬레이션
          </DialogTitle>
          <DialogDescription>
            AI가 100명의 가상 중학생이 <strong>{treeTitle}</strong> 스킬트리를 학습한다고 가정하고 결과를 예측합니다.
          </DialogDescription>
        </DialogHeader>

        {!data && !loading && (
          <div className="py-8 text-center">
            <Button
              onClick={handleRun}
              className="bg-[#7C5CFC] hover:bg-[#7C5CFC]/90"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              시뮬레이션 시작
            </Button>
            <p className="mt-3 text-xs text-gray-500">
              AI가 노드 구조와 난이도를 분석하여 병목 지점을 예측합니다 (10-30초)
            </p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#7C5CFC]" />
            <p className="text-sm text-gray-500">AI가 스킬트리를 분석하고 있습니다...</p>
          </div>
        )}

        {data && (
          <div className="space-y-4">
            {/* 전체 통과율 */}
            <div className="rounded-lg border-2 border-[#7C5CFC]/20 bg-gradient-to-br from-[#7C5CFC]/5 to-[#4F6BF6]/5 p-4 text-center">
              <p className="text-xs font-semibold text-[#7C5CFC]">예상 전체 완주율</p>
              <p className={`mt-1 text-4xl font-bold ${passColor(data.overall_pass_rate)}`}>
                {data.overall_pass_rate}%
              </p>
              <p className="mt-1 text-xs text-gray-500">100명 중 {data.overall_pass_rate}명이 끝까지 완주 예상</p>
            </div>

            {/* 종합 평가 */}
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
              <p className="mb-1 flex items-center gap-1 text-xs font-semibold">
                <TrendingUp className="h-3 w-3 text-[#4F6BF6]" />
                종합 평가
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{data.overall_feedback}</p>
            </div>

            {/* 난이도 곡선 */}
            <div className="rounded-lg border bg-blue-50 p-3 dark:border-gray-800 dark:bg-blue-950/30">
              <p className="mb-1 text-xs font-semibold text-blue-700 dark:text-blue-300">난이도 곡선</p>
              <p className="text-sm">{data.difficulty_curve}</p>
            </div>

            {/* 병목 노드 */}
            {data.bottleneck_nodes.length > 0 && (
              <div className="space-y-2">
                <p className="flex items-center gap-1 text-sm font-semibold">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  병목 후보 노드 ({data.bottleneck_nodes.length})
                </p>
                {data.bottleneck_nodes.map((b, i) => (
                  <div
                    key={i}
                    className="rounded-lg border-l-4 border-red-500 bg-red-50 p-3 text-sm dark:bg-red-950/30"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-semibold">{b.node_title}</span>
                      <Badge className={`${passColor(b.predicted_pass_rate)} bg-white border`}>
                        예상 통과율 {b.predicted_pass_rate}%
                      </Badge>
                    </div>
                    <p className="mb-2 text-xs">
                      <strong className="text-red-700 dark:text-red-300">원인:</strong> {b.cause}
                    </p>
                    <p className="text-xs">
                      <ChevronRight className="mr-0.5 inline h-3 w-3 text-green-600" />
                      <strong className="text-green-700 dark:text-green-300">개선 제안:</strong> {b.suggestion}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleRun}
              className="w-full"
              disabled={loading}
            >
              <Sparkles className="mr-1 h-3 w-3" />
              다시 시뮬레이션
            </Button>
          </div>
        )}
        </DialogContent>
      </Dialog>
    </>
  )
}
