'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Loader2, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getNodeUnlockRates, type NodeUnlockRate } from '@/actions/dashboard-filters'

/**
 * 노드별 언락율 차트 (교사/운영자 공용).
 *
 * 입력:
 * - skillTreeId: 특정 스킬트리 선택 시 (null이면 안내 메시지)
 *
 * 출력:
 * - 레벨(Lv.1~5)별로 그룹화된 노드 목록
 * - 각 노드: 이름 + 퍼센트 바 + 언락 학생 수/전체
 * - 언락율 < 30%: 빨간색 강조 (병목)
 * - 언락율 30~60%: 주황색
 * - 언락율 >= 60%: 초록색
 */

interface Props {
  skillTreeId: string | null
  title?: string
}

const BOTTLENECK_THRESHOLD = 30 // % 미만이면 병목
const WARNING_THRESHOLD = 60 // % 미만이면 주의

export function NodeUnlockChart({ skillTreeId, title = '노드별 언락율' }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nodes, setNodes] = useState<NodeUnlockRate[]>([])
  const [totalStudents, setTotalStudents] = useState(0)
  const [treeTitle, setTreeTitle] = useState<string>('')

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!skillTreeId) {
      setNodes([])
      setTotalStudents(0)
      setTreeTitle('')
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    getNodeUnlockRates(skillTreeId).then(res => {
      if (cancelled) return
      setLoading(false)
      if (res.error) {
        setError(res.error)
        setNodes([])
        return
      }
      if (res.data) {
        setNodes(res.data.nodes)
        setTotalStudents(res.data.total_students)
        setTreeTitle(res.data.skill_tree_title)
      }
    })
    return () => { cancelled = true }
  }, [skillTreeId])
  /* eslint-enable react-hooks/set-state-in-effect */

  // 레벨별 그룹화
  const nodesByLevel = new Map<number, NodeUnlockRate[]>()
  nodes.forEach(n => {
    const list = nodesByLevel.get(n.difficulty) ?? []
    list.push(n)
    nodesByLevel.set(n.difficulty, list)
  })
  const sortedLevels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b)

  // 병목 노드 수
  const bottleneckCount = nodes.filter(n => n.unlock_rate < BOTTLENECK_THRESHOLD && n.total_students > 0).length

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#4F6BF6]" />
            {title}
          </span>
          {!loading && treeTitle && totalStudents > 0 && (
            <Badge variant="secondary" className="text-xs font-normal">
              학생 {totalStudents}명
            </Badge>
          )}
        </CardTitle>
        {treeTitle && (
          <p className="text-xs text-gray-500">{treeTitle}</p>
        )}
      </CardHeader>
      <CardContent>
        {!skillTreeId ? (
          <div className="py-10 text-center text-sm text-gray-400">
            상단 컨텍스트 선택기에서 스킬트리를 선택하세요
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[#4F6BF6]" />
          </div>
        ) : error ? (
          <div className="py-10 text-center text-sm text-red-500">{error}</div>
        ) : nodes.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            아직 노드가 없습니다
          </div>
        ) : totalStudents === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            아직 이 스킬트리를 학습한 학생이 없습니다
          </div>
        ) : (
          <>
            {bottleneckCount > 0 && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>
                  언락율이 30% 미만인 <strong>{bottleneckCount}개 노드</strong>가 병목 구간입니다
                </span>
              </div>
            )}

            <div className="space-y-4">
              {sortedLevels.map(level => {
                const levelNodes = nodesByLevel.get(level) ?? []
                return (
                  <div key={level}>
                    <div className="mb-2 flex items-center gap-2">
                      <Badge className="bg-[#7C5CFC]/10 text-[#7C5CFC] border border-[#7C5CFC]/30">
                        Lv.{level}
                      </Badge>
                      <span className="text-[10px] text-gray-500">
                        {levelNodes.length}개 노드
                      </span>
                    </div>
                    <div className="space-y-2">
                      {levelNodes.map(n => (
                        <NodeRow key={n.node_id} node={n} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function NodeRow({ node }: { node: NodeUnlockRate }) {
  const rate = node.unlock_rate
  const isBottleneck = rate < BOTTLENECK_THRESHOLD
  const isWarning = rate < WARNING_THRESHOLD && !isBottleneck

  let barColor = 'from-[#10B981] to-[#10B981]/70' // good
  let textColor = 'text-[#10B981]'
  if (isBottleneck) {
    barColor = 'from-red-500 to-red-400'
    textColor = 'text-red-600 dark:text-red-400'
  } else if (isWarning) {
    barColor = 'from-[#F59E0B] to-[#F59E0B]/70'
    textColor = 'text-[#F59E0B]'
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className={`truncate font-medium ${isBottleneck ? 'text-red-600 dark:text-red-400' : ''}`}>
            {isBottleneck && '🚨 '}
            {node.node_title}
          </span>
          <span className="shrink-0 text-[10px] text-gray-500">
            {node.unlocked_count}/{node.total_students}
          </span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all`}
            style={{ width: `${rate}%` }}
          />
        </div>
      </div>
      <span className={`shrink-0 text-sm font-bold ${textColor} w-12 text-right`}>
        {rate}%
      </span>
    </div>
  )
}
