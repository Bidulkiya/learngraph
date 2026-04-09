'use client'

import { useState, useEffect } from 'react'
import { Loader2, Send, Check, Lightbulb, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getQuizHint, getQuizAttemptInfo } from '@/actions/quiz'
import type { Quiz } from '@/types/quiz'
import { toast } from 'sonner'

interface QuizCardProps {
  quiz: Quiz
  index: number
  total: number
  onSubmit: (quizId: string, answer: string, hintUsed: boolean) => Promise<void>
  disabled?: boolean
}

/**
 * 호출자에서 `key={quiz.id}`로 props 변경 시 컴포넌트가 unmount→mount되어
 * useState가 자연스럽게 초기화된다. 따라서 useEffect로 reset할 필요가 없다.
 * (React 19 권장 패턴 — cascade rerender 회피)
 */
export function QuizCard({ quiz, index, total, onSubmit, disabled }: QuizCardProps) {
  const [selected, setSelected] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const animKey = 0
  const [hint, setHint] = useState<string | null>(null)
  const [hintLoading, setHintLoading] = useState(false)
  const [hintUsed, setHintUsed] = useState(false)
  // 노력 기반 힌트 잠금 상태
  const [hintUnlocked, setHintUnlocked] = useState(false)
  const [attemptsRemaining, setAttemptsRemaining] = useState(3)

  // 마운트 시 힌트 잠금 상태 조회
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false
    getQuizAttemptInfo(quiz.id).then(res => {
      if (cancelled || !res.data) return
      setHintUnlocked(res.data.hintUnlocked)
      setAttemptsRemaining(res.data.attemptsRemaining)
    })
    return () => { cancelled = true }
  }, [quiz.id])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleHint = async (): Promise<void> => {
    if (hintUsed) return
    if (!hintUnlocked) {
      toast.info(`${attemptsRemaining}번 더 시도해야 힌트가 열려요. 스스로 풀어보세요! 💪`)
      return
    }
    setHintLoading(true)
    const res = await getQuizHint(quiz.id)
    setHintLoading(false)
    if (res.error || !res.data) {
      toast.error(res.error ?? '힌트 생성 실패')
      return
    }
    setHint(res.data.hint)
    setHintUsed(true)
  }

  const handleSubmit = async (): Promise<void> => {
    if (!selected.trim()) return
    setSubmitting(true)
    await onSubmit(quiz.id, selected, hintUsed)
    setSubmitting(false)
  }

  const isMultipleChoice = quiz.question_type === 'multiple_choice'
  const options = (quiz.options as string[]) ?? []

  return (
    <Card key={animKey} className={`animate-slide-in-right ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>문제 {index + 1} / {total}</span>
        </div>
        <CardTitle className="flex items-start gap-2 text-base">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#4F6BF6]/10 text-sm font-bold text-[#4F6BF6]">
            {index + 1}
          </span>
          <span className="flex-1">{quiz.question}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isMultipleChoice ? (
          <div className="space-y-2">
            {options.map((option, i) => {
              const isSelected = selected === option
              return (
                <label
                  key={i}
                  className={`group flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border-2 p-3 text-sm transition-all duration-200 ${
                    isSelected
                      ? 'scale-[1.02] border-[#4F6BF6] bg-[#4F6BF6]/10 shadow-sm'
                      : 'border-gray-200 hover:scale-[1.01] hover:border-[#4F6BF6]/50 hover:bg-[#4F6BF6]/5 dark:border-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    name={`quiz-${quiz.id}`}
                    value={option}
                    checked={isSelected}
                    onChange={() => setSelected(option)}
                    className="sr-only"
                  />
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs transition-all ${
                      isSelected
                        ? 'animate-bounce-in border-[#4F6BF6] bg-[#4F6BF6] text-white'
                        : 'border-gray-300 group-hover:border-[#4F6BF6]/50'
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </span>
                  {option}
                </label>
              )
            })}
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              placeholder="답변을 입력하세요... (서술형은 AI가 의미 기반으로 채점합니다)"
              value={selected}
              onChange={e => setSelected(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F6BF6]"
            />
          </div>
        )}

        {/* 힌트 */}
        {hint && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-300">
            <div className="mb-1 flex items-center gap-1 text-xs font-semibold">
              <Lightbulb className="h-3.5 w-3.5" />
              AI 힌트 (점수 50% 감소)
            </div>
            {hint}
          </div>
        )}

        <div className="flex gap-2">
          {!hintUsed && (
            <Button
              onClick={handleHint}
              disabled={hintLoading || disabled}
              variant="outline"
              size="sm"
              className={hintUnlocked ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50' : 'text-gray-400'}
              title={hintUnlocked ? '힌트가 열렸어요!' : `${attemptsRemaining}번 더 시도 후 열림`}
            >
              {hintLoading ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : hintUnlocked ? (
                <Lightbulb className="mr-1 h-3.5 w-3.5" />
              ) : (
                <Lock className="mr-1 h-3.5 w-3.5" />
              )}
              {hintUnlocked ? '힌트 (열림!)' : `힌트 (${attemptsRemaining}회 남음)`}
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!selected.trim() || submitting || disabled}
            className="flex-1 bg-[#4F6BF6] hover:bg-[#4F6BF6]/90"
            size="sm"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isMultipleChoice ? '채점 중...' : 'AI 채점 중...'}
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                제출
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
