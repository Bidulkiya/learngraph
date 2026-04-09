'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Mic, Square, Loader2, FileText, Sparkles, TreePine,
  ListChecks, Lightbulb, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  transcribeRecording,
  cleanTranscriptForSkillTree,
  summarizeLesson,
} from '@/actions/recording'
import { generateSkillTree, saveSkillTree } from '@/actions/skill-tree'
import { getMyClasses } from '@/actions/school'
import type { SkillTreeOutput, LessonSummaryOutput } from '@/lib/ai/schemas'
import { useRecorder } from './useRecorder'

type Phase =
  | 'form'            // 제목/클래스 입력
  | 'recording'       // 녹음 중
  | 'transcribing'    // Whisper 전사 중
  | 'review'          // 전사 프리뷰 + 편집
  | 'generating'      // AI 스킬트리 생성 중
  | 'preview'         // 스킬트리 프리뷰
  | 'saving'          // 저장 중
  | 'done'            // 완료

interface Props {
  onBack: () => void
}

export function RecordingTreeMode({ onBack }: Props) {
  const router = useRouter()

  const [phase, setPhase] = useState<Phase>('form')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [classId, setClassId] = useState('')
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([])

  const [transcript, setTranscript] = useState('')
  const [cleanedTranscript, setCleanedTranscript] = useState('')
  const [recordingId, setRecordingId] = useState<string | null>(null)
  const [skillTree, setSkillTree] = useState<SkillTreeOutput | null>(null)
  const [summary, setSummary] = useState<LessonSummaryOutput | null>(null)

  // 클래스 목록 로드
  useEffect(() => {
    getMyClasses().then(res => {
      if (res.data) {
        setClasses(res.data.map(c => ({ id: c.id, name: c.name })))
      }
    })
  }, [])

  // 녹음 완료 콜백 — Blob을 Whisper에 전송
  const handleRecordingComplete = async (blob: Blob, durationSec: number): Promise<void> => {
    setPhase('transcribing')
    const formData = new FormData()
    formData.append('audio', blob, 'lesson.webm')
    formData.append('duration', String(durationSec))

    const res = await transcribeRecording(formData)
    if (res.error || !res.data) {
      toast.error(res.error ?? '전사에 실패했습니다')
      setPhase('form')
      return
    }
    setTranscript(res.data.transcript)
    setRecordingId(res.data.recordingId)
    setPhase('review')
  }

  const recorder = useRecorder(handleRecordingComplete)

  const handleStartRecording = async (): Promise<void> => {
    if (!title.trim()) {
      toast.error('스킬트리 제목을 입력해주세요')
      return
    }
    setPhase('recording')
    await recorder.startRecording()
  }

  const handleAnalyze = async (): Promise<void> => {
    setPhase('generating')

    // 1. 전사 텍스트 정리 (잡음 제거)
    const cleanRes = await cleanTranscriptForSkillTree(transcript)
    if (cleanRes.error || !cleanRes.data) {
      toast.error(cleanRes.error ?? '전사 정리 실패')
      setPhase('review')
      return
    }
    setCleanedTranscript(cleanRes.data)

    // 2. 스킬트리 생성 (병렬로 요약도 함께)
    const [treeRes, summaryRes] = await Promise.all([
      generateSkillTree(cleanRes.data),
      recordingId ? summarizeLesson(recordingId) : Promise.resolve({ data: undefined, error: undefined }),
    ])

    if (treeRes.error || !treeRes.data) {
      toast.error(treeRes.error ?? 'AI 스킬트리 생성 실패')
      setPhase('review')
      return
    }

    // 제목/설명은 사용자 입력 우선, AI 생성 결과로 덮어쓰지 않음
    setSkillTree({
      ...treeRes.data,
      title: title.trim(),
      description: description.trim() || treeRes.data.description,
    })
    if (summaryRes.data) setSummary(summaryRes.data)
    setPhase('preview')
  }

  const handleSave = async (): Promise<void> => {
    if (!skillTree) return
    setPhase('saving')

    const result = await saveSkillTree(
      {
        title: skillTree.title,
        description: skillTree.description,
        subject_hint: skillTree.subject_hint,
      },
      skillTree.nodes,
      skillTree.edges,
      cleanedTranscript || transcript,
      classId || undefined,
    )

    if (result.error) {
      toast.error(result.error)
      setPhase('preview')
      return
    }

    setPhase('done')
    toast.success('스킬트리가 저장되었습니다!')
    setTimeout(() => router.push('/teacher/skill-tree'), 1500)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          disabled={phase === 'recording' || phase === 'transcribing' || phase === 'generating' || phase === 'saving'}
          className="h-8 px-2 text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" />
          모드 선택으로
        </Button>
        <Badge className="bg-[#10B981]/10 text-[#10B981] dark:bg-[#10B981]/20">
          🌳 스킬트리 작성 모드
        </Badge>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">녹음으로 스킬트리 만들기</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          수업을 녹음하면 AI가 전사·잡음 제거·커리큘럼 설계·학습 문서·퀴즈까지 자동 생성합니다
        </p>
      </div>

      {/* Phase: form — 제목/클래스/설명 입력 */}
      {phase === 'form' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">수업 정보</CardTitle>
            <CardDescription>녹음하기 전 이 스킬트리의 기본 정보를 입력하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tree-title">스킬트리 제목 *</Label>
              <Input
                id="tree-title"
                placeholder="예: 광합성과 호흡"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tree-desc">간단한 설명</Label>
              <Input
                id="tree-desc"
                placeholder="한 줄 설명 (선택사항)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tree-class">배정할 클래스 (선택)</Label>
              <select
                id="tree-class"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="">클래스 미배정 (나중에 설정 가능)</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <Button
              onClick={handleStartRecording}
              disabled={!title.trim()}
              className="w-full bg-[#10B981] hover:bg-[#10B981]/90"
            >
              <Mic className="mr-2 h-4 w-4" />
              녹음 시작
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Phase: recording */}
      {phase === 'recording' && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-14">
            <button
              type="button"
              onClick={recorder.stopRecording}
              className="flex h-28 w-28 animate-pulse items-center justify-center rounded-full bg-red-500 shadow-2xl transition-all hover:scale-105"
            >
              <Square className="h-12 w-12 fill-white text-white" />
            </button>
            <p className="font-mono text-3xl font-bold text-red-500">{recorder.timeDisplay}</p>
            <p className="text-sm text-gray-500">🔴 녹음 중... 클릭하여 정지</p>
            <p className="text-xs text-gray-400">&ldquo;{title}&rdquo; 수업 녹음</p>
          </CardContent>
        </Card>
      )}

      {/* Phase: transcribing */}
      {phase === 'transcribing' && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-14">
            <Loader2 className="h-16 w-16 animate-spin text-[#10B981]" />
            <p className="text-sm text-gray-500">Whisper가 음성을 텍스트로 전사 중입니다...</p>
          </CardContent>
        </Card>
      )}

      {/* Phase: review — 전사 텍스트 편집 */}
      {phase === 'review' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-[#10B981]" />
              전사 결과 (필요하면 수정)
            </CardTitle>
            <CardDescription>
              다음 단계에서 AI가 자동으로 농담·진행 멘트·말 더듬기를 제거하고 교육 내용만 추출합니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={10}
              placeholder="전사 결과가 여기 표시됩니다..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleAnalyze}
                disabled={transcript.trim().length < 30}
                className="flex-1 bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#10B981]/90"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                AI 분석 시작 (스킬트리 생성)
              </Button>
              <Button variant="outline" onClick={() => setPhase('form')}>
                다시 녹음
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase: generating */}
      {phase === 'generating' && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-14">
            <Loader2 className="h-16 w-16 animate-spin text-[#10B981]" />
            <p className="text-sm text-gray-500">AI가 잡음을 제거하고 스킬트리를 설계 중입니다...</p>
            <p className="text-xs text-gray-400">이 작업은 30초~1분 정도 걸립니다</p>
          </CardContent>
        </Card>
      )}

      {/* Phase: preview — 스킬트리 프리뷰 */}
      {phase === 'preview' && skillTree && (
        <>
          <Card className="border-[#10B981]/30 bg-[#10B981]/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TreePine className="h-4 w-4 text-[#10B981]" />
                생성된 스킬트리 프리뷰
              </CardTitle>
              <CardDescription>{skillTree.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-500">
                  노드 {skillTree.nodes.length}개 · 연결 {skillTree.edges.length}개
                </p>
                <ul className="max-h-64 overflow-y-auto space-y-1.5 rounded-md border bg-white p-3 text-sm dark:bg-gray-900">
                  {skillTree.nodes.map((n, i) => (
                    <li key={n.id} className="flex items-start gap-2">
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        Lv.{n.difficulty}
                      </Badge>
                      <span className="flex-1">
                        <strong>{i + 1}. {n.title}</strong>
                        <span className="ml-1 text-xs text-gray-500">— {n.description}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 부가: 수업 요약 (있으면 같이 표시) */}
          {summary && (
            <Card className="border-2 border-[#7C5CFC]/30 bg-gradient-to-br from-[#7C5CFC]/5 to-[#6366F1]/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-[#7C5CFC]" />
                  부가: AI 수업 요약
                </CardTitle>
                <CardDescription>{summary.summary}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
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
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              className="flex-1 bg-gradient-to-r from-[#10B981] to-[#059669]"
            >
              <Check className="mr-2 h-4 w-4" />
              스킬트리 저장 + 학습 문서/퀴즈 자동 생성
            </Button>
            <Button variant="outline" onClick={() => setPhase('review')}>
              다시 생성
            </Button>
          </div>
        </>
      )}

      {/* Phase: saving */}
      {phase === 'saving' && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-14">
            <Loader2 className="h-16 w-16 animate-spin text-[#10B981]" />
            <p className="text-sm text-gray-500">스킬트리 저장 중...</p>
            <p className="text-xs text-gray-400">학습 문서와 퀴즈도 함께 생성됩니다 (1-2분 소요)</p>
          </CardContent>
        </Card>
      )}

      {/* Phase: done */}
      {phase === 'done' && (
        <Card className="border-[#10B981]/30 bg-[#10B981]/5">
          <CardContent className="flex flex-col items-center gap-3 py-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#10B981] text-white shadow-lg">
              <Check className="h-8 w-8" />
            </div>
            <p className="font-semibold text-gray-900 dark:text-white">저장 완료!</p>
            <p className="text-xs text-gray-500">스킬트리 목록으로 이동 중...</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
