'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Trophy, RotateCcw, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { QuizCard } from '@/components/quiz/QuizCard'
import { QuizResult } from '@/components/quiz/QuizResult'
import { generateQuizForNode, submitQuizAnswer, completeNode } from '@/actions/quiz'
import type { Quiz } from '@/types/quiz'
import { toast } from 'sonner'

interface Props {
  nodeId: string
  nodeTitle: string
  nodeDescription: string
  nodeDifficulty: number
  skillTreeId: string
}

type QuizState = 'loading' | 'answering' | 'result' | 'summary'

interface AnswerResult {
  quizId: string
  isCorrect: boolean
  explanation: string
}

export function QuizSession({ nodeId, nodeTitle, nodeDescription, nodeDifficulty, skillTreeId }: Props) {
  const router = useRouter()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [state, setState] = useState<QuizState>('loading')
  const [results, setResults] = useState<AnswerResult[]>([])
  const [currentResult, setCurrentResult] = useState<AnswerResult | null>(null)
  const [error, setError] = useState('')

  // Load quizzes on mount
  useEffect(() => {
    async function load(): Promise<void> {
      const res = await generateQuizForNode(nodeId)
      if (res.error || !res.data) {
        setError(res.error ?? '퀴즈를 불러올 수 없습니다')
        return
      }
      setQuizzes(res.data)
      setState('answering')
    }
    load()
  }, [nodeId])

  const currentQuiz = quizzes[currentIndex]
  const correctCount = results.filter(r => r.isCorrect).length
  const totalAnswered = results.length
  const scorePercent = totalAnswered > 0 ? Math.round((correctCount / quizzes.length) * 100) : 0

  const handleSubmitAnswer = async (quizId: string, answer: string): Promise<void> => {
    const res = await submitQuizAnswer(quizId, nodeId, answer)
    if (res.error || !res.data) {
      toast.error(res.error ?? '채점 중 오류가 발생했습니다')
      return
    }

    const result: AnswerResult = {
      quizId,
      isCorrect: res.data.isCorrect,
      explanation: res.data.explanation,
    }
    setCurrentResult(result)
    setResults(prev => [...prev, result])
    setState('result')
  }

  const handleNext = async (): Promise<void> => {
    if (currentIndex + 1 < quizzes.length) {
      setCurrentIndex(prev => prev + 1)
      setCurrentResult(null)
      setState('answering')
    } else {
      // All questions done — show summary
      setState('summary')
      const finalCorrect = results.filter(r => r.isCorrect).length + (currentResult?.isCorrect ? 1 : 0)
      const finalPercent = Math.round((finalCorrect / quizzes.length) * 100)

      if (finalPercent >= 70) {
        const unlockRes = await completeNode(nodeId, finalPercent)
        if (unlockRes.error) {
          toast.error('노드 언락 실패: ' + unlockRes.error)
        } else {
          toast.success('노드 언락! 🎉')
        }
      }
    }
  }

  const handleRetry = (): void => {
    setCurrentResult(null)
    setState('answering')
  }

  const handleRestartQuiz = (): void => {
    setCurrentIndex(0)
    setResults([])
    setCurrentResult(null)
    setState('answering')
  }

  const finalCorrectCount = results.filter(r => r.isCorrect).length
  const finalPercent = quizzes.length > 0 ? Math.round((finalCorrectCount / quizzes.length) * 100) : 0
  const passed = finalPercent >= 70

  if (error) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-red-500">{error}</p>
            <Link href={`/student/skill-tree/${skillTreeId}`}>
              <Button variant="outline" className="mt-4">스킬트리로 돌아가기</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/student/skill-tree/${skillTreeId}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
            <BookOpen className="h-5 w-5 text-[#4F6BF6]" />
            {nodeTitle}
          </h1>
          <p className="text-sm text-gray-500">{nodeDescription}</p>
        </div>
        <Badge variant="secondary">Lv.{nodeDifficulty}</Badge>
      </div>

      {/* Progress */}
      {state !== 'loading' && state !== 'summary' && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>문제 {currentIndex + 1} / {quizzes.length}</span>
            <span>{correctCount}개 정답</span>
          </div>
          <Progress value={((currentIndex + (state === 'result' ? 1 : 0)) / quizzes.length) * 100} className="h-2" />
        </div>
      )}

      {/* Loading */}
      {state === 'loading' && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#4F6BF6]" />
            <p className="text-gray-500">퀴즈를 준비하고 있습니다...</p>
          </CardContent>
        </Card>
      )}

      {/* Answering */}
      {state === 'answering' && currentQuiz && (
        <QuizCard
          quiz={currentQuiz}
          index={currentIndex}
          onSubmit={handleSubmitAnswer}
        />
      )}

      {/* Result */}
      {state === 'result' && currentResult && currentQuiz && (
        <QuizResult
          isCorrect={currentResult.isCorrect}
          explanation={currentResult.explanation}
          questionText={currentQuiz.question}
          onRetry={!currentResult.isCorrect ? handleRetry : undefined}
          onNext={handleNext}
        />
      )}

      {/* Summary */}
      {state === 'summary' && (
        <Card className={`border-2 ${passed ? 'border-[#10B981]' : 'border-gray-300'}`}>
          <CardHeader className="text-center">
            <div className={`mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full ${passed ? 'bg-[#10B981]/10' : 'bg-gray-100'}`}>
              {passed ? (
                <Trophy className="h-8 w-8 text-[#10B981]" />
              ) : (
                <RotateCcw className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <CardTitle className={passed ? 'text-[#10B981]' : 'text-gray-600'}>
              {passed ? '🎉 노드 언락!' : '아쉬워요!'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div>
              <p className="text-3xl font-bold">{finalPercent}점</p>
              <p className="text-sm text-gray-500">{finalCorrectCount}/{quizzes.length} 정답 (70% 이상 통과)</p>
            </div>

            {passed ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  +{(nodeDifficulty) * 20} XP 획득!
                </p>
                <Link href={`/student/skill-tree/${skillTreeId}`}>
                  <Button className="w-full bg-[#10B981] hover:bg-[#10B981]/90">
                    스킬트리로 돌아가기
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">다시 도전해서 70% 이상을 달성하세요!</p>
                <Button onClick={handleRestartQuiz} variant="outline" className="w-full">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  다시 도전하기
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
