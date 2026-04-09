'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

/**
 * 수업 녹음 공용 훅 — 스킬트리 모드 / 복습 퀴즈 모드 모두 사용.
 *
 * MediaRecorder + 타이머 + blob 수집을 캡슐화한다.
 * - startRecording(): 마이크 권한 요청 후 녹음 시작
 * - stopRecording(): 녹음 정지 + onComplete 콜백에 Blob 전달
 * - duration: 현재 녹음 시간 (초)
 * - isRecording: 녹음 중 여부
 */
export function useRecorder(onComplete: (blob: Blob, durationSec: number) => void) {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const durationRef = useRef(0)

  // unmount 시 타이머/스트림 정리
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      const rec = mediaRecorderRef.current
      if (rec && rec.state !== 'inactive') {
        rec.stream.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  const startRecording = async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      setDuration(0)
      durationRef.current = 0

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        setIsRecording(false)
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        onComplete(blob, durationRef.current)
      }

      mediaRecorder.start()
      setIsRecording(true)
      timerRef.current = setInterval(() => {
        durationRef.current += 1
        setDuration(durationRef.current)
      }, 1000)
    } catch {
      toast.error('마이크 권한을 허용해주세요')
    }
  }

  const stopRecording = (): void => {
    const rec = mediaRecorderRef.current
    if (rec && rec.state === 'recording') {
      rec.stop()
    }
  }

  const min = Math.floor(duration / 60)
  const sec = duration % 60
  const timeDisplay = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`

  return {
    isRecording,
    duration,
    timeDisplay,
    startRecording,
    stopRecording,
  }
}
