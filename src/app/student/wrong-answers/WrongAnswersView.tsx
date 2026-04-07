'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertCircle, Sparkles, ChevronDown, RotateCcw, BookX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { WrongAnswer } from '@/actions/weakness'
import type { WeaknessAnalysisOutput } from '@/lib/ai/schemas'

interface Props {
  wrongAnswers: WrongAnswer[]
  weakness?: WeaknessAnalysisOutput
}

export function WrongAnswersView({ wrongAnswers, weakness }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // 노드별 그룹핑
  const groupedByNode = new Map<string, WrongAnswer[]>()
  wrongAnswers.forEach(w => {
    if (!groupedByNode.has(w.node_id)) groupedByNode.set(w.node_id, [])
    groupedByNode.get(w.node_id)!.push(w)
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
          <BookX className="h-6 w-6 text-red-500" />
          오답 노트
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          틀린 문제를 다시 살펴보고 약점을 보완하세요
        </p>
      </div>

      {/* AI 약점 진단 */}
      {weakness && (
        <Card className="border-2 border-[#7C5CFC]/30 bg-gradient-to-br from-[#7C5CFC]/5 to-[#4F6BF6]/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-[#7C5CFC]" />
              AI 약점 진단
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-700 dark:text-gray-300">{weakness.diagnosis}</p>
            {weakness.weak_areas.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500">약한 영역</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {weakness.weak_areas.map((a, i) => (
                    <Badge key={i} variant="secondary" className="bg-red-100 text-red-700">
                      {a}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {weakness.recommendations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500">추천 학습 방향</p>
                <ul className="mt-1 ml-4 list-disc text-sm text-gray-700 dark:text-gray-300">
                  {weakness.recommendations.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 오답 목록 */}
      {wrongAnswers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/30">
              <AlertCircle className="h-8 w-8 text-[#10B981]" />
            </div>
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              아직 오답이 없습니다
            </p>
            <p className="text-sm text-gray-500">완벽해요! 계속 학습을 이어가세요</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {Array.from(groupedByNode.entries()).map(([nodeId, items]) => (
            <Card key={nodeId}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{items[0].node_title}</span>
                  <Badge variant="secondary" className="bg-red-100 text-red-700">
                    {items.length}개 오답
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.map(w => {
                  const expanded = expandedId === w.attempt_id
                  return (
                    <div
                      key={w.attempt_id}
                      className="rounded-lg border bg-white p-3 text-sm dark:border-gray-800 dark:bg-gray-900"
                    >
                      <button
                        onClick={() => setExpandedId(expanded ? null : w.attempt_id)}
                        className="flex w-full items-start justify-between text-left"
                      >
                        <span className="flex-1 font-medium">{w.question}</span>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {expanded && (
                        <div className="mt-3 space-y-2 border-t pt-3 dark:border-gray-800">
                          <div>
                            <p className="text-xs text-gray-500">내 답변</p>
                            <p className="text-sm text-red-600">{w.user_answer || '(미입력)'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">정답</p>
                            <p className="text-sm text-green-600">{w.correct_answer}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">해설</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{w.explanation}</p>
                          </div>
                          {w.feedback && w.feedback !== w.explanation && (
                            <div>
                              <p className="flex items-center gap-1 text-xs text-gray-500">
                                <Sparkles className="h-3 w-3 text-[#7C5CFC]" />
                                AI 피드백
                              </p>
                              <p className="text-sm text-gray-700 dark:text-gray-300">{w.feedback}</p>
                            </div>
                          )}
                          <Link href={`/student/quiz/${w.node_id}`}>
                            <Button size="sm" variant="outline" className="mt-2">
                              <RotateCcw className="mr-1 h-3 w-3" />
                              다시 풀기
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
