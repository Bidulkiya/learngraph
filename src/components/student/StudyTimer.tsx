'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Clock, Pause } from 'lucide-react'
import { addStudyMinutes, getStudyStats } from '@/actions/study-time'

const SAVE_INTERVAL_MINUTES = 5

/**
 * 학습 페이지 여부 판정:
 * - 작동: /student/skill-tree/*, /student/quiz/*, /student/tutor, /student/wrong-answers
 * - 정지: /student(대시보드), /student/join, /student/groups, /student/messages, 그 외
 */
function isLearningPage(pathname: string | null): boolean {
  if (!pathname) return false
  if (pathname.startsWith('/student/skill-tree')) return true
  if (pathname.startsWith('/student/quiz')) return true
  if (pathname === '/student/tutor' || pathname.startsWith('/student/tutor/')) return true
  if (pathname === '/student/wrong-answers' || pathname.startsWith('/student/wrong-answers/')) return true
  return false
}

export function StudyTimer() {
  const pathname = usePathname()
  const [secondsToday, setSecondsToday] = useState(0)
  const [visible, setVisible] = useState(true)
  const accumulatedRef = useRef(0)

  const isLearning = isLearningPage(pathname)
  const active = visible && isLearning

  // 초기 stats 가져오기
  useEffect(() => {
    getStudyStats().then(res => {
      if (res.data) setSecondsToday(res.data.todayMinutes * 60)
    })
  }, [])

  // 가시성 변경 시 정지/재개 (탭 백그라운드 감지)
  useEffect(() => {
    const handleVisibility = (): void => {
      setVisible(!document.hidden)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // 1초마다 카운트 (active 상태일 때만)
  useEffect(() => {
    if (!active) return
    const interval = setInterval(() => {
      setSecondsToday(prev => prev + 1)
      accumulatedRef.current += 1

      // 5분(300초)마다 서버 저장
      if (accumulatedRef.current >= SAVE_INTERVAL_MINUTES * 60) {
        const minutesToSave = Math.floor(accumulatedRef.current / 60)
        accumulatedRef.current %= 60
        addStudyMinutes(minutesToSave).catch(() => {})
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [active])

  // 학습 페이지를 떠날 때(=isLearning이 true→false로 바뀔 때) 누적분 즉시 저장
  const prevLearningRef = useRef(isLearning)
  useEffect(() => {
    const wasLearning = prevLearningRef.current
    prevLearningRef.current = isLearning
    if (wasLearning && !isLearning && accumulatedRef.current >= 60) {
      const minutesToSave = Math.floor(accumulatedRef.current / 60)
      accumulatedRef.current %= 60
      addStudyMinutes(minutesToSave).catch(() => {})
    }
  }, [isLearning])

  // 언마운트 시 누적분 저장
  useEffect(() => {
    return () => {
      if (accumulatedRef.current >= 60) {
        const minutesToSave = Math.floor(accumulatedRef.current / 60)
        addStudyMinutes(minutesToSave).catch(() => {})
      }
    }
  }, [])

  const hours = Math.floor(secondsToday / 3600)
  const minutes = Math.floor((secondsToday % 3600) / 60)
  const seconds = secondsToday % 60

  const colorClass = active
    ? 'bg-[#4F6BF6]/10 text-[#4F6BF6]'
    : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'

  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${colorClass}`}
      title={active ? '학습 중 — 타이머 작동' : '일시정지 — 학습 페이지에서만 측정됩니다'}
    >
      {active ? <Clock className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
      <span className="font-mono">
        {hours > 0 ? `${hours}:` : ''}
        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </span>
    </div>
  )
}
