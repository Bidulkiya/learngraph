'use client'

import { CheckCircle, XCircle, RotateCcw, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface QuizResultProps {
  isCorrect: boolean
  explanation: string
  questionText: string
  onRetry?: () => void
  onNext?: () => void
}

export function QuizResult({ isCorrect, explanation, questionText, onRetry, onNext }: QuizResultProps) {
  return (
    <Card className={`border-2 ${isCorrect ? 'border-[#10B981] bg-green-50 dark:bg-green-950/30' : 'border-red-400 bg-red-50 dark:bg-red-950/30'}`}>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center gap-2">
          {isCorrect ? (
            <CheckCircle className="h-5 w-5 text-[#10B981]" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
          <span className={`font-semibold ${isCorrect ? 'text-[#10B981]' : 'text-red-600'}`}>
            {isCorrect ? '정답입니다!' : '오답입니다'}
          </span>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">해설:</span> {explanation}
        </p>

        <div className="flex gap-2">
          {!isCorrect && onRetry && (
            <Button onClick={onRetry} variant="outline" size="sm">
              <RotateCcw className="mr-1 h-4 w-4" />
              다시 풀기
            </Button>
          )}
          {onNext && (
            <Button onClick={onNext} size="sm" className="bg-[#4F6BF6] hover:bg-[#4F6BF6]/90">
              다음 문제
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
