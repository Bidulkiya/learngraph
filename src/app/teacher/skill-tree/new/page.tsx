'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, Loader2, CheckCircle, TreePine, ArrowRight, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { extractPdfText, generateSkillTree, saveSkillTree } from '@/actions/skill-tree'

type Phase = 'upload' | 'extracting' | 'generating' | 'preview' | 'saving' | 'done'

interface SkillTreeResult {
  title: string
  description: string
  nodes: Array<{ id: string; title: string; description: string; difficulty: number }>
  edges: Array<{ source: string; target: string; label?: string }>
}

export default function NewSkillTreePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [phase, setPhase] = useState<Phase>('upload')
  const [fileName, setFileName] = useState('')
  const [extractedText, setExtractedText] = useState('')
  const [skillTree, setSkillTree] = useState<SkillTreeResult | null>(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('PDF 파일만 지원합니다.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('파일 크기는 10MB 이하여야 합니다.')
      return
    }

    setError('')
    setFileName(file.name)

    // Phase 1: Extract text
    setPhase('extracting')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const text = await extractPdfText(formData)
      setExtractedText(text)

      // Phase 2: Generate skill tree (server-side, await full result)
      // generateObject는 완전한 plain object를 반환하므로 직렬화 문제 없음.
      setPhase('generating')
      const result = await generateSkillTree(text)
      setSkillTree(result)
      setPhase('preview')
    } catch (err) {
      const message = err instanceof Error ? err.message : '처리 중 오류가 발생했습니다.'
      setError(message)
      setPhase('upload')
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleSave = async (): Promise<void> => {
    if (!skillTree) return
    setPhase('saving')
    setError('')

    try {
      await saveSkillTree(
        { title: skillTree.title, description: skillTree.description },
        skillTree.nodes,
        skillTree.edges,
        extractedText
      )
      setPhase('done')
      setTimeout(() => router.push('/teacher/skill-tree'), 1500)
    } catch (err) {
      const message = err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.'
      setError(message)
      setPhase('preview')
    }
  }

  const difficultyColor = (d: number): string => {
    if (d <= 1) return 'bg-green-100 text-green-700'
    if (d <= 2) return 'bg-blue-100 text-blue-700'
    if (d <= 3) return 'bg-yellow-100 text-yellow-700'
    if (d <= 4) return 'bg-orange-100 text-orange-700'
    return 'bg-red-100 text-red-700'
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">새 스킬트리 만들기</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          수업 자료(PDF)를 업로드하면 AI가 자동으로 스킬트리를 생성합니다
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        <Badge variant={phase === 'upload' ? 'default' : 'secondary'}>1. 업로드</Badge>
        <ArrowRight className="h-3 w-3 text-gray-400" />
        <Badge variant={phase === 'extracting' || phase === 'generating' ? 'default' : 'secondary'}>2. AI 분석</Badge>
        <ArrowRight className="h-3 w-3 text-gray-400" />
        <Badge variant={phase === 'preview' || phase === 'saving' ? 'default' : 'secondary'}>3. 확인 · 저장</Badge>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Phase: Upload */}
      {phase === 'upload' && (
        <Card
          className={`cursor-pointer border-2 border-dashed transition-colors ${
            dragOver
              ? 'border-[#4F6BF6] bg-[#4F6BF6]/5'
              : 'border-gray-300 hover:border-[#4F6BF6]/50 dark:border-gray-700'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#4F6BF6]/10">
              <Upload className="h-8 w-8 text-[#4F6BF6]" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900 dark:text-white">PDF 파일을 드래그하거나 클릭하세요</p>
              <p className="mt-1 text-sm text-gray-500">최대 10MB · PDF 형식</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Phase: Extracting / Generating */}
      {(phase === 'extracting' || phase === 'generating') && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="h-10 w-10 animate-spin text-[#4F6BF6]" />
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {phase === 'extracting' ? 'PDF 텍스트 추출 중...' : 'AI가 스킬트리를 생성 중...'}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {phase === 'generating' && '10~30초 정도 소요됩니다'}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                {fileName && <><FileText className="mr-1 inline h-4 w-4" />{fileName}</>}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase: Preview */}
      {(phase === 'preview' || phase === 'saving' || phase === 'done') && skillTree && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TreePine className="h-5 w-5 text-[#10B981]" />
                    {skillTree.title}
                  </CardTitle>
                  <CardDescription className="mt-1">{skillTree.description}</CardDescription>
                </div>
                <Badge>{skillTree.nodes.length}개 노드</Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Nodes */}
          <div className="grid gap-3 sm:grid-cols-2">
            {skillTree.nodes.map((node) => (
              <Card key={node.id}>
                <CardContent className="flex items-start gap-3 pt-4">
                  <Badge className={difficultyColor(node.difficulty)} variant="secondary">
                    Lv.{node.difficulty}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{node.title}</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{node.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Edges */}
          {skillTree.edges.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">선수지식 관계 ({skillTree.edges.length}개)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5 text-sm">
                  {skillTree.edges.map((edge, i) => {
                    const sourceNode = skillTree.nodes.find(n => n.id === edge.source)
                    const targetNode = skillTree.nodes.find(n => n.id === edge.target)
                    return (
                      <div key={i} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <span className="font-medium text-gray-900 dark:text-white">{sourceNode?.title ?? edge.source}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="font-medium text-gray-900 dark:text-white">{targetNode?.title ?? edge.target}</span>
                        {edge.label && <span className="text-xs text-gray-400">({edge.label})</span>}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Save / Done */}
          <div className="flex justify-end gap-3">
            {phase === 'preview' && (
              <>
                <Button variant="outline" onClick={() => { setPhase('upload'); setSkillTree(null) }}>
                  다시 만들기
                </Button>
                <Button onClick={handleSave} className="bg-[#10B981] hover:bg-[#10B981]/90">
                  <Save className="mr-2 h-4 w-4" />
                  스킬트리 저장
                </Button>
              </>
            )}
            {phase === 'saving' && (
              <Button disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                저장 중...
              </Button>
            )}
            {phase === 'done' && (
              <Button disabled className="bg-[#10B981]">
                <CheckCircle className="mr-2 h-4 w-4" />
                저장 완료! 이동 중...
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
