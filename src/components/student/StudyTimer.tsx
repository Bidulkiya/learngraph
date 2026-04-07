'use client'

import { useEffect, useRef, useState } from 'react'
import { Clock } from 'lucide-react'
import { addStudyMinutes, getStudyStats } from '@/actions/study-time'

const SAVE_INTERVAL_MINUTES = 5

export function StudyTimer() {
  const [secondsToday, setSecondsToday] = useState(0)
  const [active, setActive] = useState(true)
  const accumulatedRef = useRef(0)

  // 초기 stats 가져오기
  useEffect(() => {
    getStudyStats().then(res => {
      if (res.data) setSecondsToday(res.data.todayMinutes * 60)
    })
  }, [])

  // 가시성 변경 시 정지/재개
  useEffect(() => {
    const handleVisibility = (): void => {
      setActive(!document.hidden)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // 1초마다 카운트
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

  // 페이지 이탈 시 누적분 저장
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

  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-[#4F6BF6]/10 px-2.5 py-1.5 text-xs font-medium text-[#4F6BF6]">
      <Clock className="h-3.5 w-3.5" />
      <span className="font-mono">
        {hours > 0 ? `${hours}:` : ''}
        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </span>
    </div>
  )
}
