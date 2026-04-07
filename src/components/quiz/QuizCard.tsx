'use client'

import { useState, useEffect } from 'react'
import { Loader2, Send, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Quiz } from '@/types/quiz'

interface QuizCardProps {
  quiz: Quiz
  index: number
  total: number
  onSubmit: (quizId: string, answer: string) => Promise<void>
  disabled?: boolean
}

export function QuizCard({ quiz, index, total, onSubmit, disabled }: QuizCardProps) {
  const [selected, setSelected] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [animKey, setAnimKey] = useState(0)

  // 문제가 바뀔 때마다 애니메이션 트리거 + 입력 초기화
  useEffect(() => {
    setSelected('')
    setAnimKey(k => k + 1)
  }, [quiz.id])

  const handleSubmit = async (): Promise<void> => {
    if (!selected.trim()) return
    setSubmitting(true)
    await onSubmit(quiz.id, selected)
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
                  className={`group flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 text-sm transition-all duration-200 ${
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

        <Button
          onClick={handleSubmit}
          disabled={!selected.trim() || submitting || disabled}
          className="w-full bg-[#4F6BF6] hover:bg-[#4F6BF6]/90"
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
      </CardContent>
    </Card>
  )
}
