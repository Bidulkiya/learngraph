'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Loader2,
  Trash2,
  Sparkles,
  RefreshCw,
  Download,
  Printer,
  Send,
  Upload,
  Bot,
  FileText,
  ArrowLeft,
  Replace,
} from 'lucide-react'
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
  uploadLearningDoc,
  updateNodePermissions,
  getNodeLearningDoc,
} from '@/actions/learning-doc'
import { extractPdfText } from '@/actions/skill-tree'
import { buildPrintableHtml } from '@/lib/learning-doc-utils'
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
type UploadMode = 'choice' | 'upload' | 'text-input'

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
  const [regenerating, setRegenerating] = useState(false)
  const [allowDownload, setAllowDownload] = useState(true)
  const [allowPrint, setAllowPrint] = useState(true)

  // 업로드 플로우 상태
  const [uploadMode, setUploadMode] = useState<UploadMode>('choice')
  const [textInput, setTextInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    setUploadMode('choice')
    setTextInput('')
  }

  // 노드 변경 시 상태 초기화 + 학습 문서 로드.
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
    setShowRevisionInput(false)
    setUploadMode('choice')
    setTextInput('')
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

  const handleTextUpload = async (): Promise<void> => {
    if (!node || !textInput.trim()) return
    setUploading(true)
    const res = await uploadLearningDoc(node.id, textInput)
    setUploading(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    // 업로드 후 재조회
    const docRes = await getNodeLearningDoc(node.id)
    if (docRes.data) {
      setLearningDoc(docRes.data.content ?? '')
      setUploadMode('choice')
      setTextInput('')
      if (res.data?.styleAnalyzed) {
        toast.success('업로드 완료! 교사 스타일이 분석되어 다른 노드에 반영됩니다')
      } else {
        toast.success('학습 문서가 업로드되었습니다')
      }
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0]
    if (!file || !node) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error('파일 크기는 10MB 이하여야 합니다')
      return
    }

    setUploading(true)
    try {
      let text = ''
      const lowerName = file.name.toLowerCase()

      if (lowerName.endsWith('.pdf')) {
        // PDF → extractPdfText 재사용
        const fd = new FormData()
        fd.append('file', file)
        const extractRes = await extractPdfText(fd)
        if (extractRes.error || !extractRes.text) {
          toast.error(extractRes.error ?? 'PDF 텍스트 추출 실패')
          setUploading(false)
          return
        }
        text = extractRes.text
      } else if (lowerName.endsWith('.txt') || lowerName.endsWith('.md')) {
        // TXT/Markdown: 브라우저에서 read
        text = await file.text()
      } else if (lowerName.endsWith('.docx')) {
        toast.error('DOCX는 아직 지원되지 않습니다. TXT로 저장하거나 텍스트를 복사해서 붙여넣어 주세요')
        setUploading(false)
        return
      } else {
        toast.error('지원하지 않는 파일 형식입니다 (PDF, TXT, MD만 지원)')
        setUploading(false)
        return
      }

      const res = await uploadLearningDoc(node.id, text)
      if (res.error) {
        toast.error(res.error)
        setUploading(false)
        return
      }

      const docRes = await getNodeLearningDoc(node.id)
      if (docRes.data) {
        setLearningDoc(docRes.data.content ?? '')
        setUploadMode('choice')
      }
      toast.success(`"${file.name}" 업로드 완료`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '파일 업로드 실패')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
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
      if (type === 'download') setAllowDownload(!value)
      if (type === 'print') setAllowPrint(!value)
    }
  }

  // 교사 자신의 다운로드/프린트 — 권한 체크 불필요 (자기 자료)
  const handleDownload = (): void => {
    if (!learningDoc || !node) return
    const html = buildPrintableHtml(node.title, learningDoc)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${node.title}_학습문서.html`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('다운로드 완료')
  }

  const handlePrint = (): void => {
    if (!learningDoc || !node) return
    const printWindow = window.open('', '_blank', 'width=860,height=900')
    if (!printWindow) {
      toast.error('팝업 차단을 해제해주세요')
      return
    }
    const html = buildPrintableHtml(node.title, learningDoc)
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 350)
  }

  const handleReplaceDoc = (): void => {
    setUploadMode('choice')
    setLearningDoc('')
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
            {mode === 'add' ? '새로운 학습 개념 노드를 추가합니다' : '기본 정보, 학습 문서, 권한을 관리합니다'}
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

              {/* 학습 문서 — 업로드/AI 선택 + 미리보기 only */}
              <TabsContent value="document" className="space-y-3">
                {docLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-[#4F6BF6]" />
                  </div>
                ) : !learningDoc ? (
                  // 학습 문서 없음 → 업로드 / AI 선택 카드
                  <>
                    {uploadMode === 'choice' && (
                      <div className="grid gap-3 sm:grid-cols-2 py-4">
                        <button
                          type="button"
                          onClick={() => setUploadMode('upload')}
                          className="flex flex-col items-center gap-2 rounded-xl border-2 border-[#4F6BF6]/30 bg-[#4F6BF6]/5 p-6 text-center transition-all hover:border-[#4F6BF6] hover:shadow-md"
                        >
                          <div className="rounded-full bg-[#4F6BF6]/10 p-3">
                            <FileText className="h-6 w-6 text-[#4F6BF6]" />
                          </div>
                          <span className="font-semibold text-sm">📄 내 학습지 업로드</span>
                          <p className="text-xs text-gray-500">
                            PDF/TXT 파일 또는 텍스트를 직접 입력해 업로드하면 HTML 학습지로 변환됩니다
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={handleRegenerate}
                          disabled={regenerating}
                          className="flex flex-col items-center gap-2 rounded-xl border-2 border-[#7C5CFC]/30 bg-[#7C5CFC]/5 p-6 text-center transition-all hover:border-[#7C5CFC] hover:shadow-md disabled:opacity-60"
                        >
                          <div className="rounded-full bg-[#7C5CFC]/10 p-3">
                            {regenerating
                              ? <Loader2 className="h-6 w-6 animate-spin text-[#7C5CFC]" />
                              : <Bot className="h-6 w-6 text-[#7C5CFC]" />}
                          </div>
                          <span className="font-semibold text-sm">🤖 AI 학습지 생성</span>
                          <p className="text-xs text-gray-500">
                            {regenerating
                              ? 'AI가 학습지를 생성하고 있습니다...'
                              : 'AI가 노드 내용을 바탕으로 HTML 학습지를 자동 생성합니다'}
                          </p>
                        </button>
                      </div>
                    )}

                    {uploadMode === 'upload' && (
                      <div className="space-y-3 py-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setUploadMode('choice')}
                          className="text-xs"
                        >
                          <ArrowLeft className="mr-1 h-3 w-3" />
                          선택으로 돌아가기
                        </Button>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
                            <Upload className="mx-auto h-8 w-8 text-gray-400" />
                            <p className="mt-2 text-sm font-semibold">파일 업로드</p>
                            <p className="mt-1 text-xs text-gray-500">PDF, TXT, MD (최대 10MB)</p>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".pdf,.txt,.md"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                            <Button
                              size="sm"
                              className="mt-3 bg-[#4F6BF6] hover:bg-[#4F6BF6]/90"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploading}
                            >
                              {uploading
                                ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />업로드 중</>
                                : '파일 선택'}
                            </Button>
                          </div>
                          <div className="rounded-lg border p-4 space-y-2">
                            <Label className="text-sm">텍스트 직접 입력</Label>
                            <textarea
                              value={textInput}
                              onChange={e => setTextInput(e.target.value)}
                              placeholder={'첫 줄은 제목으로 인식됩니다.\n\n- 리스트 항목\n1. 순서 있는 리스트\n**굵게** *기울임*'}
                              rows={8}
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                            <Button
                              size="sm"
                              className="w-full bg-[#4F6BF6] hover:bg-[#4F6BF6]/90"
                              onClick={handleTextUpload}
                              disabled={uploading || !textInput.trim()}
                            >
                              {uploading
                                ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />업로드 중</>
                                : '이 텍스트로 저장'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  // 학습 문서 있음 → 미리보기 + 액션 버튼들
                  <div className="space-y-3">
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDownload}
                      >
                        <Download className="mr-1 h-3 w-3" />
                        다운로드
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handlePrint}
                      >
                        <Printer className="mr-1 h-3 w-3" />
                        프린트
                      </Button>
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
                        variant="outline"
                        onClick={handleReplaceDoc}
                      >
                        <Replace className="mr-1 h-3 w-3" />
                        내 학습지로 교체
                      </Button>
                    </div>

                    <iframe
                      ref={iframeRef}
                      srcDoc={iframeSrcDoc}
                      sandbox="allow-same-origin"
                      title="학습 문서 미리보기"
                      className="h-[420px] w-full rounded-md border bg-white"
                    />

                    {/* 인라인 AI 수정 요청 */}
                    <div className="rounded-lg border border-[#7C5CFC]/30 bg-[#7C5CFC]/5 p-3">
                      {!showRevisionInput ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full border-[#7C5CFC]/40 text-[#7C5CFC] hover:bg-[#7C5CFC]/10"
                          onClick={() => setShowRevisionInput(true)}
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
                      💡 교사가 직접 학습지를 업로드하면 그 스타일이 분석되어 같은 스킬트리의 다른 노드 생성에 반영됩니다.
                    </p>
                  </div>
                )}
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
                  비활성화하면 학생의 노드 팝업에서 해당 버튼이 비활성화됩니다. (교사 본인은 항상 다운로드/프린트 가능)
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
