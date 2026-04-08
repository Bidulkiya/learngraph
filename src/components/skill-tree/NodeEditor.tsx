'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, Trash2, Sparkles, Save, RefreshCw, Download, Printer, Eye, Code2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  regenerateLearningDoc,
  reviseLearningDoc,
  saveLearningDocManually,
  updateNodePermissions,
  getNodeLearningDoc,
} from '@/actions/learning-doc'
import { toast } from 'sonner'

interface NodeData {
  id: string
  title: string
  description: string
  difficulty: number
}

interface NodeEditorProps {
  open: boolean
  onClose: () => void
  node: NodeData | null
  onSave: (id: string, title: string, description: string, difficulty: number) => Promise<void>
  onDelete: (id: string) => Promise<void>
  mode?: 'edit' | 'add'
  onAdd?: (title: string, description: string, difficulty: number) => Promise<void>
}

type EditorTab = 'basic' | 'document' | 'permissions'

export function NodeEditor({ open, onClose, node, onSave, onDelete, mode = 'edit', onAdd }: NodeEditorProps) {
  const [title, setTitle] = useState(node?.title ?? '')
  const [description, setDescription] = useState(node?.description ?? '')
  const [difficulty, setDifficulty] = useState(node?.difficulty ?? 1)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // 학습 문서 관련
  const [activeTab, setActiveTab] = useState<EditorTab>('basic')
  const [learningDoc, setLearningDoc] = useState<string>('')
  const [docLoading, setDocLoading] = useState(false)
  const [docSaving, setDocSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [allowDownload, setAllowDownload] = useState(true)
  const [allowPrint, setAllowPrint] = useState(true)
  const [docViewMode, setDocViewMode] = useState<'preview' | 'source'>('preview')

  // AI 수정 인라인 입력
  const [showRevisionInput, setShowRevisionInput] = useState(false)
  const [revisionInput, setRevisionInput] = useState('')
  const [revising, setRevising] = useState(false)

  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Reset form when node changes
  const resetForm = (): void => {
    setTitle(node?.title ?? '')
    setDescription(node?.description ?? '')
    setDifficulty(node?.difficulty ?? 1)
    setConfirmDelete(false)
    setActiveTab('basic')
    setRevisionInput('')
    setShowRevisionInput(false)
    setDocViewMode('preview')
  }

  // 노드 변경 시 상태 초기화 + 학습 문서 로드.
  // 이 effect는 data fetching + popup reset 패턴이라 setState는 의도된 것 (cancelled 가드로 stale state 방지).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open || !node || mode === 'add') {
      setLearningDoc('')
      return
    }
    let cancelled = false
    setTitle(node.title)
    setDescription(node.description)
    setDifficulty(node.difficulty)
    setActiveTab('basic')
    setDocViewMode('preview')
    setShowRevisionInput(false)
    setDocLoading(true)
    getNodeLearningDoc(node.id).then(res => {
      if (cancelled) return
      if (res.data) {
        setLearningDoc(res.data.content ?? '')
        setAllowDownload(res.data.allowDownload)
        setAllowPrint(res.data.allowPrint)
      }
      setDocLoading(false)
    })
    return () => { cancelled = true }
  }, [open, node, mode])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSave = async (): Promise<void> => {
    if (!title.trim()) return
    setSaving(true)
    if (mode === 'add' && onAdd) {
      await onAdd(title.trim(), description.trim(), difficulty)
    } else if (node) {
      await onSave(node.id, title.trim(), description.trim(), difficulty)
    }
    setSaving(false)
    onClose()
  }

  const handleDelete = async (): Promise<void> => {
    if (!node) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    await onDelete(node.id)
    setDeleting(false)
    onClose()
  }

  const handleRegenerate = async (): Promise<void> => {
    if (!node) return
    setRegenerating(true)
    const res = await regenerateLearningDoc(node.id)
    setRegenerating(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    if (res.data) {
      setLearningDoc(res.data)
      toast.success('학습 문서가 재생성되었습니다')
    }
  }

  const handleSaveDoc = async (): Promise<void> => {
    if (!node) return
    setDocSaving(true)
    const res = await saveLearningDocManually(node.id, learningDoc)
    setDocSaving(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    if (res.data?.styleAnalyzed) {
      toast.success('저장 완료! 교사 스타일이 분석되어 다음 노드에 반영됩니다')
    } else {
      toast.success('학습 문서가 저장되었습니다')
    }
  }

  const handleRevision = async (): Promise<void> => {
    if (!node || !revisionInput.trim()) return
    setRevising(true)
    const res = await reviseLearningDoc(node.id, revisionInput)
    setRevising(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    if (res.data) {
      setLearningDoc(res.data)
      setRevisionInput('')
      setShowRevisionInput(false)
      toast.success('AI가 학습 문서를 수정했습니다')
    }
  }

  const handlePermissionToggle = async (type: 'download' | 'print', value: boolean): Promise<void> => {
    if (!node) return
    const newDownload = type === 'download' ? value : allowDownload
    const newPrint = type === 'print' ? value : allowPrint
    if (type === 'download') setAllowDownload(value)
    if (type === 'print') setAllowPrint(value)
    const res = await updateNodePermissions(node.id, newDownload, newPrint)
    if (res.error) {
      toast.error(res.error)
      // 롤백
      if (type === 'download') setAllowDownload(!value)
      if (type === 'print') setAllowPrint(!value)
    }
  }

  // iframe srcdoc — 미리보기용 안전한 HTML 문서 (sandbox)
  const iframeSrcDoc = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>학습 문서 미리보기</title>
<style>
  body { font-family: -apple-system, 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; padding: 20px; line-height: 1.65; color: #1f2937; background: #fff; margin: 0; }
  * { box-sizing: border-box; }
  table { max-width: 100%; }
  img, video, iframe { max-width: 100%; }
</style>
</head>
<body>
${learningDoc}
</body>
</html>`

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose() } }}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? '새 노드 추가' : `노드 편집: ${node?.title ?? ''}`}</DialogTitle>
          <DialogDescription>
            {mode === 'add' ? '새로운 학습 개념 노드를 추가합니다' : '기본 정보, AI 학습 문서, 권한을 관리합니다'}
          </DialogDescription>
        </DialogHeader>

        {mode === 'add' ? (
          // 추가 모드: 기본 필드만
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="node-title">제목</Label>
              <Input
                id="node-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="학습 개념 이름 (10자 이내 추천)"
                maxLength={30}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="node-desc">설명</Label>
              <textarea
                id="node-desc"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="이 개념에 대한 설명 (2-3문장)"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <Label>난이도</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                      difficulty === d
                        ? 'bg-[#4F6BF6] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // 편집 모드: 3개 탭
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as EditorTab)} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">기본</TabsTrigger>
              <TabsTrigger value="document">학습 문서</TabsTrigger>
              <TabsTrigger value="permissions">권한</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-3">
              {/* 기본 정보 */}
              <TabsContent value="basic" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="node-title">제목</Label>
                  <Input
                    id="node-title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="학습 개념 이름 (10자 이내 추천)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="node-desc">설명</Label>
                  <textarea
                    id="node-desc"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="이 개념에 대한 설명 (2-3문장)"
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="space-y-2">
                  <Label>난이도</Label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(d => (
                      <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                          difficulty === d
                            ? 'bg-[#4F6BF6] text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* 학습 문서 (HTML) */}
              <TabsContent value="document" className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setDocViewMode('preview')}
                      className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        docViewMode === 'preview'
                          ? 'bg-[#4F6BF6] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      <Eye className="h-3 w-3" />
                      미리보기
                    </button>
                    <button
                      onClick={() => setDocViewMode('source')}
                      className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        docViewMode === 'source'
                          ? 'bg-[#4F6BF6] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      <Code2 className="h-3 w-3" />
                      HTML 편집
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRegenerate}
                      disabled={regenerating || revising}
                    >
                      {regenerating ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
                      AI 재생성
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveDoc}
                      disabled={docSaving}
                      className="bg-[#4F6BF6] hover:bg-[#4F6BF6]/90"
                    >
                      {docSaving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
                      저장
                    </Button>
                  </div>
                </div>

                {docLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-[#4F6BF6]" />
                  </div>
                ) : docViewMode === 'preview' ? (
                  <div className="space-y-2">
                    {!learningDoc ? (
                      <div className="rounded-md border border-dashed bg-gray-50 p-8 text-center text-sm text-gray-500 dark:bg-gray-900">
                        학습 문서가 없습니다. <br />
                        <strong>[AI 재생성]</strong> 버튼을 눌러 생성하거나 <strong>HTML 편집</strong>으로 직접 작성하세요.
                      </div>
                    ) : (
                      <iframe
                        ref={iframeRef}
                        srcDoc={iframeSrcDoc}
                        sandbox="allow-same-origin"
                        title="학습 문서 미리보기"
                        className="h-[420px] w-full rounded-md border bg-white"
                      />
                    )}
                  </div>
                ) : (
                  <textarea
                    value={learningDoc}
                    onChange={e => setLearningDoc(e.target.value)}
                    placeholder='HTML 학습지를 직접 편집할 수 있습니다. 예: <div class="ws-doc">...</div>'
                    rows={18}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                )}

                {/* 인라인 AI 수정 요청 (학습문서 탭 안) */}
                <div className="rounded-lg border border-[#7C5CFC]/30 bg-[#7C5CFC]/5 p-3">
                  {!showRevisionInput ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-[#7C5CFC]/40 text-[#7C5CFC] hover:bg-[#7C5CFC]/10"
                      onClick={() => setShowRevisionInput(true)}
                      disabled={!learningDoc}
                    >
                      <Sparkles className="mr-1 h-3.5 w-3.5" />
                      AI에게 수정 요청
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-[#7C5CFC]" />
                        <span className="text-xs font-medium text-[#7C5CFC]">
                          어떻게 수정할까요?
                        </span>
                      </div>
                      <textarea
                        value={revisionInput}
                        onChange={e => setRevisionInput(e.target.value)}
                        placeholder='예: "표를 더 추가해줘", "예시를 쉽게 바꿔줘", "초등학생 수준으로 다시 써줘"'
                        rows={2}
                        autoFocus
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setShowRevisionInput(false); setRevisionInput('') }}
                          disabled={revising}
                          className="flex-1"
                        >
                          취소
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleRevision}
                          disabled={!revisionInput.trim() || revising}
                          className="flex-1 bg-[#7C5CFC] hover:bg-[#7C5CFC]/90"
                        >
                          {revising ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Send className="mr-1 h-3 w-3" />}
                          AI에 전송
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-500">
                  HTML 형식의 학습지로 저장됩니다. 교사가 직접 작성해 저장하면 그 스타일이 분석되어 같은 스킬트리의 다른 노드 생성에 반영됩니다.
                </p>
              </TabsContent>

              {/* 권한 */}
              <TabsContent value="permissions" className="space-y-4">
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        학습지 다운로드 허용
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">
                        학생이 학습 문서를 HTML 파일로 다운로드할 수 있습니다
                      </p>
                    </div>
                    <button
                      onClick={() => handlePermissionToggle('download', !allowDownload)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        allowDownload ? 'bg-[#4F6BF6]' : 'bg-gray-300 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          allowDownload ? 'translate-x-[22px]' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between border-t pt-3">
                    <div>
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Printer className="h-4 w-4" />
                        프린트 허용
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">
                        학생이 학습 문서를 브라우저에서 프린트(PDF로 저장)할 수 있습니다
                      </p>
                    </div>
                    <button
                      onClick={() => handlePermissionToggle('print', !allowPrint)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        allowPrint ? 'bg-[#4F6BF6]' : 'bg-gray-300 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          allowPrint ? 'translate-x-[22px]' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
                <div className="rounded-lg bg-yellow-50 p-3 text-xs text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300">
                  <Badge className="mr-2 bg-yellow-200 text-yellow-800">주의</Badge>
                  비활성화하면 학생의 노드 팝업에서 해당 버튼이 비활성화됩니다.
                </div>
              </TabsContent>
            </div>
          </Tabs>
        )}

        <div className="flex justify-between border-t pt-3 mt-2">
          {mode === 'edit' && node && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              size="sm"
            >
              {deleting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1 h-4 w-4" />}
              {confirmDelete ? '정말 삭제' : '삭제'}
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={() => { resetForm(); onClose() }} size="sm">
              닫기
            </Button>
            {(mode === 'add' || activeTab === 'basic') && (
              <Button
                onClick={handleSave}
                disabled={saving || !title.trim()}
                size="sm"
                className="bg-[#4F6BF6] hover:bg-[#4F6BF6]/90"
              >
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                {mode === 'add' ? '추가' : '저장'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
