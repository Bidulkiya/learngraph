'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  TrendingUp,
  ChevronRight,
  Wand2,
  ArrowRight,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  simulateSkillTree,
  improveSkillTreeFromSimulation,
} from '@/actions/simulation'
import type { SimulationOutput } from '@/lib/ai/schemas'
import { toast } from 'sonner'

interface Props {
  treeId: string
  treeTitle: string
}

const GAP_TYPE_LABEL: Record<string, string> = {
  prerequisite_missing: '선수지식 부족',
  difficulty_jump: '난이도 급상승',
  content_gap: '개념 공백',
  quiz_mismatch: '퀴즈 불일치',
  abstract_concept: '추상 개념',
}

const GAP_TYPE_COLOR: Record<string, string> = {
  prerequisite_missing: 'bg-orange-100 text-orange-700 border-orange-200',
  difficulty_jump: 'bg-red-100 text-red-700 border-red-200',
  content_gap: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  quiz_mismatch: 'bg-blue-100 text-blue-700 border-blue-200',
  abstract_concept: 'bg-purple-100 text-purple-700 border-purple-200',
}

export function SimulationDialog({ treeId, treeTitle }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<SimulationOutput | null>(null)
  const [previousData, setPreviousData] = useState<SimulationOutput | null>(null)
  const [loading, setLoading] = useState(false)
  const [improving, setImproving] = useState(false)
  const [improved, setImproved] = useState(false)

  const handleRun = async (): Promise<void> => {
    setLoading(true)
    setData(null)
    setPreviousData(null)
    setImproved(false)
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

  const handleImprove = async (): Promise<void> => {
    if (!data) return
    if (!confirm(
      '시뮬레이션 결과를 바탕으로 AI가 스킬트리를 개선합니다.\n' +
      '기존 노드/엣지/퀴즈는 모두 교체되며, 학생 진도도 재초기화됩니다.\n' +
      '계속하시겠습니까?'
    )) return

    setImproving(true)
    setPreviousData(data) // 비교용 저장
    const res = await improveSkillTreeFromSimulation(treeId, data)
    setImproving(false)

    if (res.error) {
      toast.error(res.error)
      setPreviousData(null)
      return
    }

    if (res.data) {
      setData(res.data.simulation)
      setImproved(true)
      toast.success(
        `스킬트리가 개선되었습니다 (${res.data.newNodeCount}개 노드, ${res.data.newEdgeCount}개 엣지)`
      )
      // 트리 페이지 새로고침하여 개선된 스킬트리 반영
      router.refresh()
    }
  }

  const passColor = (rate: number): string => {
    if (rate >= 80) return 'text-green-600'
    if (rate >= 60) return 'text-yellow-600'
    if (rate >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  // 개선 전/후 차이 표시용
  const diff = previousData && data
    ? data.overall_pass_rate - previousData.overall_pass_rate
    : null

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
              AI가 100명의 가상 중학생이 <strong>{treeTitle}</strong> 스킬트리를 학습한다고 가정하고, 퀴즈 내용과 학습 문서까지 분석하여 병목을 예측합니다.
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
                AI가 노드 구조·난이도·퀴즈·학습문서를 정밀 분석하여 병목 지점을 예측합니다 (15-40초)
              </p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#7C5CFC]" />
              <p className="text-sm text-gray-500">
                AI가 스킬트리를 정밀 분석하고 있습니다...
              </p>
              <p className="text-xs text-gray-400">
                퀴즈 내용, 학습 문서, 난이도 갭을 모두 고려하는 중
              </p>
            </div>
          )}

          {improving && (
            <div className="flex flex-col items-center gap-3 py-12">
              <Wand2 className="h-8 w-8 animate-pulse text-[#7C5CFC]" />
              <p className="text-sm font-semibold text-[#7C5CFC]">
                AI가 스킬트리를 개선하고 있습니다...
              </p>
              <p className="text-xs text-gray-500 text-center max-w-md">
                병목 노드의 선수지식을 보강하고 난이도를 재배치합니다.<br />
                새 학습 문서와 퀴즈도 자동 생성됩니다. (40-90초)
              </p>
            </div>
          )}

          {data && !improving && (
            <div className="space-y-4">
              {improved && (
                <div className="rounded-lg border-2 border-green-500 bg-green-50 p-3 dark:bg-green-950/30">
                  <p className="flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-300">
                    <Check className="h-4 w-4" />
                    스킬트리가 개선되었습니다
                  </p>
                  {diff !== null && (
                    <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                      통과율 {previousData?.overall_pass_rate.toFixed(1)}% → {data.overall_pass_rate.toFixed(1)}%
                      {diff > 0 && (
                        <span className="ml-1 font-bold">(+{diff.toFixed(1)}%p 개선)</span>
                      )}
                      {diff < 0 && (
                        <span className="ml-1 font-bold">({diff.toFixed(1)}%p)</span>
                      )}
                      {diff === 0 && <span className="ml-1">(변동 없음)</span>}
                    </p>
                  )}
                </div>
              )}

              {/* 전체 통과율 */}
              <div className="rounded-lg border-2 border-[#7C5CFC]/20 bg-gradient-to-br from-[#7C5CFC]/5 to-[#4F6BF6]/5 p-4 text-center">
                <p className="text-xs font-semibold text-[#7C5CFC]">
                  {improved ? '개선 후 예상 전체 완주율' : '예상 전체 완주율'}
                </p>
                <div className="mt-1 flex items-center justify-center gap-2">
                  {previousData && improved && (
                    <>
                      <span className="text-xl text-gray-400 line-through">
                        {previousData.overall_pass_rate.toFixed(1)}%
                      </span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </>
                  )}
                  <span className={`text-4xl font-bold ${passColor(data.overall_pass_rate)}`}>
                    {data.overall_pass_rate.toFixed(1)}%
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  100명 중 약 {data.overall_pass_rate.toFixed(1)}명이 끝까지 완주 예상
                </p>
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
                      <div className="mb-2 flex items-center justify-between flex-wrap gap-1">
                        <span className="font-semibold">{b.node_title}</span>
                        <div className="flex gap-1 items-center">
                          {b.gap_type && (
                            <Badge
                              className={`text-[10px] border ${GAP_TYPE_COLOR[b.gap_type] ?? 'bg-gray-100 text-gray-700'}`}
                            >
                              {GAP_TYPE_LABEL[b.gap_type] ?? b.gap_type}
                            </Badge>
                          )}
                          <Badge className={`${passColor(b.predicted_pass_rate)} bg-white border`}>
                            {b.predicted_pass_rate.toFixed(1)}%
                          </Badge>
                        </div>
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

              {/* 액션 버튼: 다시 시뮬레이션 + AI 개선 재생성 */}
              <div className="flex flex-col gap-2 pt-2 border-t">
                <Button
                  onClick={handleImprove}
                  className="w-full bg-gradient-to-r from-[#7C5CFC] to-[#4F6BF6] hover:from-[#7C5CFC]/90 hover:to-[#4F6BF6]/90 text-white"
                  disabled={improving || loading}
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  AI가 개선한 스킬트리로 재생성
                </Button>
                <p className="text-center text-xs text-gray-500">
                  병목 원인을 반영해 선수지식 보강·난이도 재배치 후 재시뮬레이션까지 자동 실행
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRun}
                  className="w-full"
                  disabled={loading || improving}
                >
                  <Sparkles className="mr-1 h-3 w-3" />
                  다시 시뮬레이션만 실행
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
