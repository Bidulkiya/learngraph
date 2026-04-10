'use client'

import { useState, useEffect } from 'react'
import { Heart, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { getMyLatestEmotion } from '@/actions/emotion'

/**
 * 학생 대시보드 감정 미니 카드.
 * AI가 분석한 최신 학습 감정을 이모지 + 한 줄 인사이트로 표시.
 */

const moodEmoji: Record<string, string> = {
  confident: '😊',
  neutral: '😐',
  struggling: '😟',
  frustrated: '😰',
}
const moodLabel: Record<string, string> = {
  confident: '자신감',
  neutral: '보통',
  struggling: '고전 중',
  frustrated: '좌절',
}

export function EmotionMiniCard() {
  const [mood, setMood] = useState<string | null>(null)
  const [insight, setInsight] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false
    getMyLatestEmotion().then(res => {
      if (cancelled) return
      if (res.data) {
        setMood(res.data.mood)
        setInsight(res.data.insights)
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-pink-400" />
        </CardContent>
      </Card>
    )
  }

  if (!mood) {
    return (
      <Card>
        <CardContent className="py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-50 dark:bg-pink-950/30">
              <Heart className="h-5 w-5 text-pink-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">내 학습 감정</p>
              <p className="text-xs text-gray-500">퀴즈를 더 풀면 AI가 학습 감정을 분석해드려요</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const emoji = moodEmoji[mood] ?? '😐'
  const label = moodLabel[mood] ?? mood

  return (
    <Card>
      <CardContent className="py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-50 text-2xl dark:bg-pink-950/30">
            {emoji}
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Heart className="h-3.5 w-3.5 text-pink-400" />
              학습 감정: {label}
            </p>
            {insight && (
              <p className="mt-0.5 truncate text-xs text-gray-500">{insight}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
