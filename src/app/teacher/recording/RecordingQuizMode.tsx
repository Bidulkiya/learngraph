'use client'

import { useEffect, useState } from 'react'
import {
  ArrowLeft, Mic, Square, Loader2, FileText, Sparkles,
  TreePine, ClipboardCheck, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  transcribeRecording,
  generateNodeQuizFromTranscript,
} from '@/actions/recording'
import { listMyTeacherSkillTrees } from '@/actions/skill-tree'
import { useRecorder } from './useRecorder'

type Phase =
  | 'select-tree'     // 스킬트리 선택
  | 'select-node'     // 노드 선택
  | 'ready'           // 선택 완료, 녹음 대기
  | 'recording'       // 녹음 중
  | 'transcribing'    // Whisper 전사 중
  | 'review'          // 전사 프리뷰 + 편집
  | 'generating'      // AI 퀴즈 생성 중
  | 'done'            // 저장 완료

interface TreeWithNodes {
  id: string
  title: string
  description: string | null
  subject_hint: string | null
  nodes: Array<{
    id: string
    title: string
    description: string | null
    difficulty: number | null
    order_index: number | null
  }>
}

interface Props {
  onBack: () => void
}

export function RecordingQuizMode({ onBack }: Props) {
  const [phase, setPhase] = useState<Phase>('select-tree')

  const [trees, setTrees] = useState<TreeWithNodes[]>([])
  const [treesLoading, setTreesLoading] = useState(true)
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const [transcript, setTranscript] = useState('')
  const [generatedCount, setGeneratedCount] = useState(0)

  // 스킬트리 목록 로드
  useEffect(() => {
    listMyTeacherSkillTrees().then(res => {
      if (res.data) setTrees(res.data)
      if (res.error) toast.error(res.error)
      setTreesLoading(false)
    })
  }, [])

  const selectedTree = trees.find(t => t.id === selectedTreeId) ?? null
  const selectedNode = selectedTree?.nodes.find(n => n.id === selectedNodeId) ?? null

  // 녹음 완료 → 전사
  const handleRecordingComplete = async (blob: Blob, durationSec: number): Promise<void> => {
    setPhase('transcribing')
    const formData = new FormData()
    formData.append('audio', blob, 'lesson.webm')
    formData.append('duration', String(durationSec))

    const res = await transcribeRecording(formData)
    if (res.error || !res.data) {
      toast.error(res.error ?? '전사에 실패했습니다')
      setPhase('ready')
      return
    }
    setTranscript(res.data.transcript)
    setPhase('review')
  }

  const recorder = useRecorder(handleRecordingComplete)

  const handleStartRecording = async (): Promise<void> => {
    setPhase('recording')
    await recorder.startRecording()
  }

  const handleGenerateQuiz = async (): Promise<void> => {
    if (!selectedNodeId) return
    setPhase('generating')

    const res = await generateNodeQuizFromTranscript(selectedNodeId, transcript)
    if (res.error || !res.data) {
      toast.error(res.error ?? '퀴즈 생성 실패')
      setPhase('review')
      return
    }

    setGeneratedCount(res.data.insertedCount)
    setPhase('done')
    toast.success(`퀴즈 ${res.data.insertedCount}개가 추가되었습니다!`)
  }

  const handleReset = (): void => {
    setTranscript('')
    setGeneratedCount(0)
    setPhase('ready')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          disabled={phase === 'recording' || phase === 'transcribing' || phase === 'generating'}
          className="h-8 px-2 text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" />
          모드 선택으로
        </Button>
        <Badge className="bg-[#6366F1]/10 text-[#6366F1] dark:bg-[#6366F1]/20">
          📝 복습 퀴즈 생성 모드
        </Badge>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">녹음으로 복습 퀴즈 추가</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          스킬트리의 특정 노드를 선택하고 수업을 녹음하면 AI가 강조한 내용 위주로 복습 퀴즈를 출제합니다
        </p>
      </div>

      {/* 선택된 스킬트리/노드 요약 (select-tree 제외 시 표시) */}
      {phase !== 'select-tree' && selectedTree && (
        <Card className="border-[#6366F1]/30 bg-[#6366F1]/5">
          <CardContent className="flex items-center gap-3 py-3">
            <TreePine className="h-4 w-4 shrink-0 text-[#6366F1]" />
            <div className="min-w-0 flex-1 text-sm">
              <div className="truncate font-semibold text-gray-900 dark:text-white">
                {selectedTree.title}
              </div>
              {selectedNode && (
                <div className="truncate text-xs text-gray-500">
                  → {selectedNode.title}
                </div>
              )}
            </div>
            {phase === 'ready' && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setSelectedNodeId(null)
                  setPhase('select-node')
                }}
              >
                노드 변경
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Phase: select-tree */}
      {phase === 'select-tree' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1단계 · 스킬트리 선택</CardTitle>
            <CardDescription>복습 퀴즈를 추가할 스킬트리를 선택하세요</CardDescription>
          </CardHeader>
          <CardContent>
            {treesLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-[#6366F1]" />
              </div>
            ) : trees.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                아직 만든 스킬트리가 없습니다. 먼저 스킬트리를 만들어주세요.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {trees.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedTreeId(t.id)
                      setPhase('select-node')
                    }}
                    disabled={t.nodes.length === 0}
                    className="flex flex-col items-start gap-2 rounded-lg border bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[#6366F1]/40 hover:shadow-md disabled:opacity-50 disabled:hover:translate-y-0 dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <TreePine className="h-4 w-4 shrink-0 text-[#6366F1]" />
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        노드 {t.nodes.length}개
                      </Badge>
                    </div>
                    <h3 className="line-clamp-1 text-sm font-semibold text-gray-900 dark:text-white">
                      {t.title}
                    </h3>
                    {t.description && (
                      <p className="line-clamp-2 text-xs text-gray-500">{t.description}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Phase: select-node */}
      {phase === 'select-node' && selectedTree && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2단계 · 노드 선택</CardTitle>
            <CardDescription>
              퀴즈를 추가할 노드를 선택하세요 — 선택한 노드의 내용으로 녹음 → 퀴즈가 생성됩니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedTreeId(null)
                  setPhase('select-tree')
                }}
                className="h-7 text-xs"
              >
                ← 다른 스킬트리 선택
              </Button>
            </div>
            {selectedTree.nodes.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">이 스킬트리에는 노드가 없습니다.</p>
            ) : (
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {selectedTree.nodes.map((n, i) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      setSelectedNodeId(n.id)
                      setPhase('ready')
                    }}
                    className="flex w-full items-start gap-3 rounded-lg border bg-white p-3 text-left transition-all hover:border-[#6366F1]/40 hover:bg-[#6366F1]/5 dark:border-gray-800 dark:bg-gray-900"
                  >
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {i + 1}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                          {n.title}
                        </h4>
                        {n.difficulty !== null && (
                          <Badge variant="outline" className="shrink-0 text-[10px]">
                            Lv.{n.difficulty}
                          </Badge>
                        )}
                      </div>
                      {n.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                          {n.description}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Phase: ready — 선택 완료, 녹음 준비 */}
      {phase === 'ready' && selectedNode && (
        <>
          <Card className="border-dashed bg-gray-50/70 dark:bg-gray-900/30">
            <CardContent className="space-y-2 py-4">
              <p className="text-xs font-semibold text-gray-500">선택한 노드</p>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {selectedNode.title}
              </h3>
              {selectedNode.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedNode.description}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <button
                type="button"
                onClick={handleStartRecording}
                className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#6366F1] to-[#A855F7] shadow-lg transition-all hover:scale-105"
              >
                <Mic className="h-10 w-10 text-white" />
              </button>
              <p className="text-sm text-gray-500">녹음 시작 — 이 노드에 대해 수업을 진행하세요</p>
            </CardContent>
          </Card>
        </>
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
            {selectedNode && (
              <p className="text-xs text-gray-400">&ldquo;{selectedNode.title}&rdquo; 수업 녹음</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Phase: transcribing */}
      {phase === 'transcribing' && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-14">
            <Loader2 className="h-16 w-16 animate-spin text-[#6366F1]" />
            <p className="text-sm text-gray-500">Whisper가 음성을 텍스트로 전사 중입니다...</p>
          </CardContent>
        </Card>
      )}

      {/* Phase: review */}
      {phase === 'review' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-[#6366F1]" />
              전사 결과 (필요하면 수정)
            </CardTitle>
            <CardDescription>
              다음 단계에서 AI가 자동으로 잡음을 제거하고 강조된 내용을 토대로 퀴즈를 만듭니다
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
                onClick={handleGenerateQuiz}
                disabled={transcript.trim().length < 30}
                className="flex-1 bg-gradient-to-r from-[#6366F1] to-[#A855F7] hover:from-[#6366F1]/90"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                AI 퀴즈 생성
              </Button>
              <Button variant="outline" onClick={() => setPhase('ready')}>
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
            <Loader2 className="h-16 w-16 animate-spin text-[#6366F1]" />
            <p className="text-sm text-gray-500">AI가 잡음 제거 후 퀴즈를 설계 중입니다...</p>
            <p className="text-xs text-gray-400">잠시만 기다려주세요</p>
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
            <p className="text-center">
              <span className="block font-semibold text-gray-900 dark:text-white">
                퀴즈 {generatedCount}개 추가 완료!
              </span>
              {selectedNode && (
                <span className="block text-xs text-gray-500">
                  &ldquo;{selectedNode.title}&rdquo; 노드에 저장되었습니다
                </span>
              )}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <ClipboardCheck className="mr-1 h-3.5 w-3.5" />
                같은 노드에 추가
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedTreeId(null)
                  setSelectedNodeId(null)
                  setTranscript('')
                  setGeneratedCount(0)
                  setPhase('select-tree')
                }}
                className="bg-[#6366F1]"
              >
                다른 노드 선택
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
