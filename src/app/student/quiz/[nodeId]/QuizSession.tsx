'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Loader2, Trophy, RotateCcw, BookOpen, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { QuizCard } from '@/components/quiz/QuizCard'
import { QuizResult } from '@/components/quiz/QuizResult'
import { generateQuizForNode, submitQuizAnswer, completeNode } from '@/actions/quiz'
import type { Quiz } from '@/types/quiz'
import { toast } from 'sonner'
import { notifyAchievement } from '@/components/student/AchievementToast'

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
  score: number
  explanation: string
  aiFeedback?: string
}

export function QuizSession({ nodeId, nodeTitle, nodeDescription, nodeDifficulty, skillTreeId }: Props) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [state, setState] = useState<QuizState>('loading')
  const [results, setResults] = useState<AnswerResult[]>([])
  const [currentResult, setCurrentResult] = useState<AnswerResult | null>(null)
  const [error, setError] = useState('')
  // Date.now()는 impure 함수 — useState init이 아닌 useRef에서 첫 mount 시점에 한 번 측정
  const startTimeRef = useRef<number>(0)
  const [elapsedSec, setElapsedSec] = useState(0)

  // 타이머 + 시작 시각 기록 (mount 시점)
  useEffect(() => {
    startTimeRef.current = Date.now()
  }, [])

  useEffect(() => {
    if (state === 'summary' || state === 'loading') return
    const interval = setInterval(() => {
      if (startTimeRef.current === 0) return
      setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [state])

  // 퀴즈 로드
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

  const handleSubmitAnswer = async (quizId: string, answer: string, hintUsed: boolean): Promise<void> => {
    const res = await submitQuizAnswer(quizId, nodeId, answer)
    if (res.error || !res.data) {
      toast.error(res.error ?? '채점 중 오류가 발생했습니다')
      return
    }

    // 힌트 사용 시 점수 50% 감소
    const finalScore = hintUsed ? Math.round(res.data.score * 0.5) : res.data.score

    const result: AnswerResult = {
      quizId,
      isCorrect: res.data.isCorrect,
      score: finalScore,
      explanation: res.data.explanation,
      aiFeedback: res.data.aiFeedback,
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
      setState('summary')
      const finalCorrect = results.filter(r => r.isCorrect).length
      const finalPercent = Math.round((finalCorrect / quizzes.length) * 100)
      if (finalPercent >= 70) {
        const unlockRes = await completeNode(nodeId, finalPercent)
        if (unlockRes.error) {
          toast.error('노드 언락 실패: ' + unlockRes.error)
        } else {
          toast.success('🎉 노드 언락!')
          // 새로 획득한 업적을 순차 토스트로 알림 (골드/보라 이펙트)
          const newAch = unlockRes.data?.newAchievements ?? []
          newAch.forEach((ach, idx) => {
            setTimeout(() => notifyAchievement(ach), 800 + idx * 600)
          })
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
  const minutes = Math.floor(elapsedSec / 60)
  const seconds = elapsedSec % 60

  // 문제별 상태 인디케이터
  const getNumberStatus = (i: number): 'correct' | 'wrong' | 'current' | 'pending' => {
    if (results[i]) return results[i].isCorrect ? 'correct' : 'wrong'
    if (i === currentIndex && state !== 'summary') return 'current'
    return 'pending'
  }

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

      {/* 진행 인디케이터 */}
      {state !== 'loading' && state !== 'summary' && quizzes.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
              <span className="font-medium">
                정답 {correctCount} · 시간 {minutes}:{seconds.toString().padStart(2, '0')}
              </span>
              <span>{currentIndex + 1} / {quizzes.length}</span>
            </div>
            <div className="flex gap-2">
              {quizzes.map((_, i) => {
                const s = getNumberStatus(i)
                return (
                  <div
                    key={i}
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                      s === 'correct'
                        ? 'bg-[#10B981] text-white'
                        : s === 'wrong'
                        ? 'bg-red-500 text-white'
                        : s === 'current'
                        ? 'bg-[#4F6BF6] text-white animate-pulse-ring'
                        : 'bg-gray-100 text-gray-400 dark:bg-gray-800'
                    }`}
                  >
                    {i + 1}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 로딩 */}
      {state === 'loading' && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#4F6BF6]" />
            <p className="text-gray-500">퀴즈를 준비하고 있습니다...</p>
          </CardContent>
        </Card>
      )}

      {/* 풀이 — key prop으로 quiz 변경 시 컴포넌트 자동 reset (cascade rerender 방지) */}
      {state === 'answering' && currentQuiz && (
        <QuizCard
          key={currentQuiz.id}
          quiz={currentQuiz}
          index={currentIndex}
          total={quizzes.length}
          onSubmit={handleSubmitAnswer}
        />
      )}

      {/* 결과 */}
      {state === 'result' && currentResult && currentQuiz && (
        <QuizResult
          isCorrect={currentResult.isCorrect}
          score={currentResult.score}
          explanation={currentResult.explanation}
          aiFeedback={currentResult.aiFeedback}
          isEssay={currentQuiz.question_type !== 'multiple_choice'}
          onRetry={!currentResult.isCorrect ? handleRetry : undefined}
          onNext={handleNext}
        />
      )}

      {/* 요약 */}
      {state === 'summary' && (
        <Card className={`border-2 ${passed ? 'border-[#10B981] animate-celebrate' : 'border-gray-300'}`}>
          <CardHeader className="text-center">
            <div
              className={`mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-full ${
                passed ? 'bg-gradient-to-br from-[#10B981] to-[#4F6BF6]' : 'bg-gray-100'
              }`}
            >
              {passed ? (
                <Trophy className="h-10 w-10 text-white" />
              ) : (
                <RotateCcw className="h-10 w-10 text-gray-400" />
              )}
            </div>
            <CardTitle className={`text-2xl ${passed ? 'text-[#10B981]' : 'text-gray-600'}`}>
              {passed ? '🎉 노드 언락!' : '아쉬워요!'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-2xl font-bold text-[#4F6BF6]">{finalPercent}점</p>
                <p className="text-xs text-gray-500">총점</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#10B981]">{finalCorrectCount}/{quizzes.length}</p>
                <p className="text-xs text-gray-500">정답률</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#7C5CFC]">
                  {minutes}:{seconds.toString().padStart(2, '0')}
                </p>
                <p className="text-xs text-gray-500">걸린 시간</p>
              </div>
            </div>

            {passed ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                  <Sparkles className="h-4 w-4 text-[#7C5CFC]" />
                  <span>+{nodeDifficulty * 20} XP 획득!</span>
                </div>
                <p className="text-sm font-medium text-[#10B981]">
                  축하합니다! 노드가 언락되었습니다 🎊
                </p>
                <Link href={`/student/skill-tree/${skillTreeId}`}>
                  <Button className="w-full bg-[#10B981] hover:bg-[#10B981]/90">
                    스킬트리로 돌아가기
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">다시 도전해서 70% 이상을 달성하세요! 💪</p>
                <Button onClick={handleRestartQuiz} variant="outline" className="w-full">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  다시 도전하기
                </Button>
                <Link href={`/student/skill-tree/${skillTreeId}`}>
                  <Button variant="ghost" className="w-full">
                    스킬트리로 돌아가기
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
