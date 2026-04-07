'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Loader2, FileText, ListChecks, Lightbulb, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { transcribeRecording, summarizeLesson, generateQuizFromRecording } from '@/actions/recording'
import type { LessonSummaryOutput } from '@/lib/ai/schemas'
import { toast } from 'sonner'

type Phase = 'idle' | 'recording' | 'transcribing' | 'transcribed' | 'summarizing' | 'done'

export default function RecordingPage() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [duration, setDuration] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [recordingId, setRecordingId] = useState<string | null>(null)
  const [summary, setSummary] = useState<LessonSummaryOutput | null>(null)
  const [quizGenerating, setQuizGenerating] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startRecording = async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      setDuration(0)

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        if (timerRef.current) clearInterval(timerRef.current)

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setPhase('transcribing')

        const formData = new FormData()
        formData.append('audio', blob, 'lesson.webm')
        formData.append('duration', String(duration))

        const res = await transcribeRecording(formData)
        if (res.error || !res.data) {
          toast.error(res.error ?? '전사 실패')
          setPhase('idle')
          return
        }
        setTranscript(res.data.transcript)
        setRecordingId(res.data.recordingId)
        setPhase('transcribed')
      }

      mediaRecorder.start()
      setPhase('recording')
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
    } catch {
      toast.error('마이크 권한을 허용해주세요')
    }
  }

  const stopRecording = (): void => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }

  const handleSummarize = async (): Promise<void> => {
    if (!recordingId) return
    setPhase('summarizing')
    const res = await summarizeLesson(recordingId)
    if (res.error || !res.data) {
      toast.error(res.error ?? '요약 실패')
      setPhase('transcribed')
      return
    }
    setSummary(res.data)
    setPhase('done')
    toast.success('요약 완료!')
  }

  const handleGenerateQuiz = async (): Promise<void> => {
    if (!recordingId) return
    setQuizGenerating(true)
    const res = await generateQuizFromRecording(recordingId)
    setQuizGenerating(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success(`퀴즈 ${res.data?.questions}개가 생성되었습니다`)
  }

  const handleReset = (): void => {
    setPhase('idle')
    setDuration(0)
    setTranscript('')
    setRecordingId(null)
    setSummary(null)
  }

  const min = Math.floor(duration / 60)
  const sec = duration % 60
  const timeDisplay = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">수업 녹음 & AI 요약</h1>
        <p className="mt-1 text-gray-500">
          수업을 녹음하면 AI가 자동으로 전사하고 요약 + 복습 퀴즈를 만들어드립니다
        </p>
      </div>

      {/* 녹음 카드 */}
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10">
          {phase === 'idle' && (
            <>
              <button
                onClick={startRecording}
                className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#4F6BF6] to-[#7C5CFC] shadow-lg transition-all hover:scale-105"
              >
                <Mic className="h-10 w-10 text-white" />
              </button>
              <p className="text-sm text-gray-500">녹음 시작하기</p>
            </>
          )}
          {phase === 'recording' && (
            <>
              <button
                onClick={stopRecording}
                className="flex h-24 w-24 items-center justify-center rounded-full bg-red-500 shadow-lg animate-pulse transition-all"
              >
                <Square className="h-10 w-10 fill-white text-white" />
              </button>
              <p className="font-mono text-2xl font-bold text-red-500">{timeDisplay}</p>
              <p className="text-sm text-gray-500">녹음 중... (클릭하여 정지)</p>
            </>
          )}
          {phase === 'transcribing' && (
            <>
              <Loader2 className="h-16 w-16 animate-spin text-[#4F6BF6]" />
              <p className="text-sm text-gray-500">AI가 음성을 텍스트로 전사 중입니다...</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* 전사 결과 */}
      {(phase === 'transcribed' || phase === 'summarizing' || phase === 'done') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-[#4F6BF6]" />
              전사 결과
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={8}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="전사 결과가 여기 표시됩니다..."
              readOnly={phase !== 'transcribed'}
            />
            {phase === 'transcribed' && (
              <div className="flex gap-2">
                <Button
                  onClick={handleSummarize}
                  className="flex-1 bg-[#4F6BF6] hover:bg-[#4F6BF6]/90"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI 요약 + 복습 퀴즈 만들기
                </Button>
                <Button onClick={handleReset} variant="outline">
                  다시 녹음
                </Button>
              </div>
            )}
            {phase === 'summarizing' && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                AI가 요약을 생성 중입니다...
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 요약 결과 */}
      {phase === 'done' && summary && (
        <>
          <Card className="border-2 border-[#7C5CFC]/30 bg-gradient-to-br from-[#7C5CFC]/5 to-[#4F6BF6]/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-[#7C5CFC]" />
                AI 수업 요약
              </CardTitle>
              <CardDescription>{summary.summary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 flex items-center gap-1 text-xs font-semibold text-gray-500">
                  <ListChecks className="h-3.5 w-3.5" />
                  핵심 포인트
                </div>
                <ul className="space-y-1">
                  {summary.keyPoints.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Badge variant="secondary" className="mt-0.5 shrink-0">{i + 1}</Badge>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="mb-2 flex items-center gap-1 text-xs font-semibold text-gray-500">
                  <Lightbulb className="h-3.5 w-3.5" />
                  다음 수업 제안
                </div>
                <ul className="ml-4 list-disc space-y-1 text-sm">
                  {summary.nextLessonSuggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button
              onClick={handleGenerateQuiz}
              disabled={quizGenerating}
              className="flex-1 bg-[#10B981] hover:bg-[#10B981]/90"
            >
              {quizGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              복습 퀴즈 생성
            </Button>
            <Button onClick={handleReset} variant="outline">
              새 녹음
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
