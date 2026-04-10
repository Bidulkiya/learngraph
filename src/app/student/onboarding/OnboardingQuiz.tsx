'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, CheckCircle, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { saveLearningStyle } from '@/actions/learning-style'
import type { LearningStyle } from '@/types/user'
import { toast } from 'sonner'

type StyleChoice = 'visual' | 'textual' | 'practical'

interface Question {
  question: string
  options: Array<{ label: string; style: StyleChoice; icon: string }>
}

const QUESTIONS: Question[] = [
  {
    question: '새로운 개념을 배울 때 어떤 게 가장 도움이 돼요?',
    options: [
      { label: '그림이나 표로 한눈에 보기', style: 'visual', icon: '📊' },
      { label: '자세한 글 설명 읽기', style: 'textual', icon: '📖' },
      { label: '직접 문제를 풀어보며 이해하기', style: 'practical', icon: '✍️' },
    ],
  },
  {
    question: '선생님 설명을 들을 때 어떤 방식이 좋아요?',
    options: [
      { label: '다이어그램/판서 그려가며 설명', style: 'visual', icon: '🖼️' },
      { label: '논리적 순서로 단계별 설명', style: 'textual', icon: '📝' },
      { label: '예시와 실제 풀이 위주', style: 'practical', icon: '🎯' },
    ],
  },
  {
    question: '문제를 풀다 막혔을 때 어떻게 해결해요?',
    options: [
      { label: '전체 그림을 다시 그려봐요', style: 'visual', icon: '🗺️' },
      { label: '개념 설명을 다시 찬찬히 읽어봐요', style: 'textual', icon: '🔍' },
      { label: '비슷한 쉬운 문제를 찾아 풀어봐요', style: 'practical', icon: '🧩' },
    ],
  },
  {
    question: '시험 공부할 때 뭘 먼저 해요?',
    options: [
      { label: '마인드맵이나 요약 표 만들기', style: 'visual', icon: '🧠' },
      { label: '교과서 / 필기 꼼꼼히 읽기', style: 'textual', icon: '📚' },
      { label: '기출/연습 문제 반복해서 풀기', style: 'practical', icon: '💪' },
    ],
  },
  {
    question: '가장 집중이 잘 되는 학습 환경은?',
    options: [
      { label: '색상/이미지가 풍부한 자료', style: 'visual', icon: '🎨' },
      { label: '조용히 글을 읽을 수 있는 환경', style: 'textual', icon: '📕' },
      { label: '손으로 써보고 풀어볼 수 있는 환경', style: 'practical', icon: '✏️' },
    ],
  },
]

const styleInfo: Record<LearningStyle, { emoji: string; label: string; description: string; color: string }> = {
  visual: {
    emoji: '👁️',
    label: '시각형',
    description: '그림과 구조로 이해하는 것이 편한 학습자',
    color: 'from-purple-500 to-pink-500',
  },
  textual: {
    emoji: '📖',
    label: '텍스트형',
    description: '논리적 설명과 글 읽기로 깊이 이해하는 학습자',
    color: 'from-blue-500 to-cyan-500',
  },
  practical: {
    emoji: '💪',
    label: '실습형',
    description: '직접 풀어보고 경험하며 배우는 학습자',
    color: 'from-green-500 to-emerald-500',
  },
}

export function OnboardingQuiz() {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<StyleChoice[]>([])
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<LearningStyle | null>(null)

  const handleAnswer = async (choice: StyleChoice): Promise<void> => {
    const newAnswers = [...answers, choice]
    setAnswers(newAnswers)
    if (currentIndex < QUESTIONS.length - 1) {
      setCurrentIndex(currentIndex + 1)
      return
    }
    // 마지막 문제 — 저장
    setSaving(true)
    const res = await saveLearningStyle(newAnswers)
    setSaving(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    if (res.data) setResult(res.data.style)
  }

  const handleFinish = (): void => {
    router.push('/student')
  }

  const progress = result ? 100 : Math.round(((currentIndex) / QUESTIONS.length) * 100)

  if (result) {
    const info = styleInfo[result]
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#4F6BF6]/5 via-white to-[#7C5CFC]/5 p-4 dark:from-[#4F6BF6]/10 dark:via-gray-950 dark:to-[#7C5CFC]/10">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div
              className={`mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br ${info.color} text-4xl shadow-lg`}
            >
              {info.emoji}
            </div>
            <CardTitle className="text-2xl">
              당신은 <span className={`bg-gradient-to-r ${info.color} bg-clip-text text-transparent`}>{info.label}</span> 학습자예요!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {info.description}
            </p>
            <div className="rounded-lg bg-[#4F6BF6]/5 p-4 text-left text-sm dark:bg-[#4F6BF6]/10">
              <p className="mb-2 flex items-center gap-1 font-semibold text-[#4F6BF6]">
                <CheckCircle className="h-4 w-4" />
                앞으로 이렇게 바뀌어요
              </p>
              <ul className="ml-5 list-disc space-y-1 text-gray-700 dark:text-gray-300">
                <li>학습 문서가 당신 스타일에 맞게 자동으로 구성돼요</li>
                <li>AI 튜터가 당신에게 맞는 방식으로 설명해요</li>
                <li>언제든지 재진단할 수 있어요</li>
              </ul>
            </div>
            <Button
              onClick={handleFinish}
              className="w-full bg-[#4F6BF6] hover:bg-[#4F6BF6]/90"
            >
              학습 시작하기
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const q = QUESTIONS[currentIndex]
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#4F6BF6]/5 via-white to-[#7C5CFC]/5 p-4 dark:from-[#4F6BF6]/10 dark:via-gray-950 dark:to-[#7C5CFC]/10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
            <span>진단 중 · {currentIndex + 1} / {QUESTIONS.length}</span>
          </div>
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#4F6BF6] to-[#7C5CFC] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5 text-[#4F6BF6]" />
            당신에게 맞는 학습 방식을 찾아볼게요
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-base font-medium text-gray-900 dark:text-white">{q.question}</p>
          {saving ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#4F6BF6]" />
              <span className="ml-2 text-sm text-gray-500">결과 분석 중...</span>
            </div>
          ) : (
            <div className="space-y-2">
              {q.options.map(opt => (
                <button
                  key={opt.style}
                  onClick={() => handleAnswer(opt.style)}
                  className="flex w-full items-center gap-3 rounded-xl border-2 border-gray-200 p-4 text-left transition-all hover:scale-[1.02] hover:border-[#4F6BF6] hover:bg-[#4F6BF6]/5 dark:border-gray-700 dark:hover:border-[#4F6BF6]"
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <span className="flex-1 text-sm font-medium">{opt.label}</span>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
