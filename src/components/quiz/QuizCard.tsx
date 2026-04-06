'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Quiz } from '@/types/quiz'

interface QuizCardProps {
  quiz: Quiz
  index: number
  onSubmit: (quizId: string, answer: string) => Promise<void>
  disabled?: boolean
}

export function QuizCard({ quiz, index, onSubmit, disabled }: QuizCardProps) {
  const [selected, setSelected] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (): Promise<void> => {
    if (!selected.trim()) return
    setSubmitting(true)
    await onSubmit(quiz.id, selected)
    setSubmitting(false)
  }

  const isMultipleChoice = quiz.question_type === 'multiple_choice'
  const options = (quiz.options as string[]) ?? []

  return (
    <Card className={disabled ? 'opacity-50 pointer-events-none' : ''}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4F6BF6]/10 text-sm font-bold text-[#4F6BF6]">
            {index + 1}
          </span>
          <span className="flex-1">{quiz.question}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isMultipleChoice ? (
          <div className="space-y-2">
            {options.map((option, i) => (
              <label
                key={i}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${
                  selected === option
                    ? 'border-[#4F6BF6] bg-[#4F6BF6]/5'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                }`}
              >
                <input
                  type="radio"
                  name={`quiz-${quiz.id}`}
                  value={option}
                  checked={selected === option}
                  onChange={() => setSelected(option)}
                  className="sr-only"
                />
                <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 text-xs ${
                  selected === option
                    ? 'border-[#4F6BF6] bg-[#4F6BF6] text-white'
                    : 'border-gray-300'
                }`}>
                  {selected === option && '✓'}
                </span>
                {option}
              </label>
            ))}
          </div>
        ) : (
          <Input
            placeholder="답변을 입력하세요"
            value={selected}
            onChange={e => setSelected(e.target.value)}
          />
        )}

        <Button
          onClick={handleSubmit}
          disabled={!selected.trim() || submitting || disabled}
          className="w-full bg-[#4F6BF6] hover:bg-[#4F6BF6]/90"
          size="sm"
        >
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          제출
        </Button>
      </CardContent>
    </Card>
  )
}
