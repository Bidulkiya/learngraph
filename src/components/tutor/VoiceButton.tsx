'use client'

import { useRef, useState } from 'react'
import { Mic, Loader2, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { transcribeAudio } from '@/actions/voice'
import { toast } from 'sonner'

interface VoiceButtonProps {
  onTranscribed: (text: string) => void
  disabled?: boolean
}

export function VoiceButton({ onTranscribed, disabled }: VoiceButtonProps) {
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setTranscribing(true)
        const formData = new FormData()
        formData.append('audio', blob, 'voice.webm')
        const res = await transcribeAudio(formData)
        setTranscribing(false)
        if (res.error || !res.data) {
          toast.error(res.error ?? '음성 인식 실패')
          return
        }
        onTranscribed(res.data.text)
      }

      mediaRecorder.start()
      setRecording(true)
    } catch {
      toast.error('마이크 권한을 허용해주세요')
    }
  }

  const stopRecording = (): void => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }

  return (
    <Button
      type="button"
      size="icon"
      variant={recording ? 'destructive' : 'outline'}
      onClick={recording ? stopRecording : startRecording}
      disabled={disabled || transcribing}
      title={recording ? '녹음 중지' : '음성 입력'}
      className={recording ? 'animate-pulse' : ''}
    >
      {transcribing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : recording ? (
        <Square className="h-4 w-4 fill-current" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  )
}
