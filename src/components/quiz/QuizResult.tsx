'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, RotateCcw, ArrowRight, ChevronDown, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface QuizResultProps {
  isCorrect: boolean
  score: number
  explanation: string
  aiFeedback?: string
  isEssay?: boolean
  onRetry?: () => void
  onNext?: () => void
}

export function QuizResult({
  isCorrect,
  score,
  explanation,
  aiFeedback,
  isEssay = false,
  onRetry,
  onNext,
}: QuizResultProps) {
  const [expanded, setExpanded] = useState(false)

  const bgClass = isCorrect
    ? 'border-[#10B981] bg-green-50 dark:bg-green-950/30'
    : 'border-red-400 bg-red-50 dark:bg-red-950/30'
  const animClass = isCorrect ? 'animate-bounce-in' : 'animate-shake'

  return (
    <Card className={`border-2 ${bgClass} ${animClass}`}>
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isCorrect ? (
              <CheckCircle className="h-6 w-6 text-[#10B981]" />
            ) : (
              <XCircle className="h-6 w-6 text-red-500" />
            )}
            <span className={`text-base font-bold ${isCorrect ? 'text-[#10B981]' : 'text-red-600'}`}>
              {isCorrect ? '정답입니다!' : '오답입니다'}
            </span>
          </div>

          {/* Score circle for essay */}
          {isEssay && (
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#7C5CFC]" />
              <span className="text-xs text-gray-500">AI 채점</span>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold ${
                  score >= 70 ? 'bg-[#10B981] text-white' : 'bg-red-500 text-white'
                }`}
              >
                {score}
              </div>
            </div>
          )}
        </div>

        {/* AI feedback (서술형) */}
        {aiFeedback && (
          <div className="rounded-lg bg-white/60 p-3 dark:bg-gray-900/40">
            <p className="text-xs font-medium text-gray-500 mb-1">AI 피드백</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{aiFeedback}</p>
          </div>
        )}

        {/* Explanation accordion */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white/40 p-2 text-sm hover:bg-white/70 dark:border-gray-800 dark:bg-gray-900/40"
        >
          <span className="font-medium">해설 {expanded ? '접기' : '보기'}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
        {expanded && (
          <p className="rounded-lg bg-white/60 p-3 text-sm text-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
            {explanation}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          {!isCorrect && onRetry && (
            <Button onClick={onRetry} variant="outline" size="sm" className="flex-1">
              <RotateCcw className="mr-1 h-4 w-4" />
              다시 풀기
            </Button>
          )}
          {onNext && (
            <Button onClick={onNext} size="sm" className="flex-1 bg-[#4F6BF6] hover:bg-[#4F6BF6]/90">
              다음 문제
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
