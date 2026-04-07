'use client'

import { useState, useEffect } from 'react'
import { Loader2, Trash2, Sparkles, Save, RefreshCw, Download, Printer, Bot, Send } from 'lucide-react'
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
import { chatWithTutor, type ChatMessage } from '@/actions/tutor'
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

export function NodeEditor({ open, onClose, node, onSave, onDelete, mode = 'edit', onAdd }: NodeEditorProps) {
  const [title, setTitle] = useState(node?.title ?? '')
  const [description, setDescription] = useState(node?.description ?? '')
  const [difficulty, setDifficulty] = useState(node?.difficulty ?? 1)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // 학습 문서 관련 상태
  const [activeTab, setActiveTab] = useState<'basic' | 'document' | 'chat' | 'tutor-test' | 'permissions'>('basic')
  const [learningDoc, setLearningDoc] = useState<string>('')
  const [docLoading, setDocLoading] = useState(false)
  const [docSaving, setDocSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [allowDownload, setAllowDownload] = useState(true)
  const [allowPrint, setAllowPrint] = useState(true)

  // AI 수정 요청 (chat)
  const [revisionInput, setRevisionInput] = useState('')
  const [revising, setRevising] = useState(false)

  // AI 튜터 테스트 (chat)
  const [tutorMessages, setTutorMessages] = useState<ChatMessage[]>([])
  const [tutorInput, setTutorInput] = useState('')
  const [tutorLoading, setTutorLoading] = useState(false)

  // Reset form when node changes
  const resetForm = (): void => {
    setTitle(node?.title ?? '')
    setDescription(node?.description ?? '')
    setDifficulty(node?.difficulty ?? 1)
    setConfirmDelete(false)
    setActiveTab('basic')
    setTutorMessages([])
    setTutorInput('')
    setRevisionInput('')
  }

  // 노드 변경 시 상태 초기화 + 학습 문서 로드
  useEffect(() => {
    if (!open || !node || mode === 'add') {
      setLearningDoc('')
      return
    }
    setTitle(node.title)
    setDescription(node.description)
    setDifficulty(node.difficulty)
    setActiveTab('basic')
    setTutorMessages([])
    setDocLoading(true)
    getNodeLearningDoc(node.id).then(res => {
      if (res.data) {
        setLearningDoc(res.data.content ?? '')
        setAllowDownload(res.data.allowDownload)
        setAllowPrint(res.data.allowPrint)
      }
      setDocLoading(false)
    })
  }, [open, node, mode])

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
    toast.success('학습 문서가 저장되었습니다')
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
      toast.success('AI가 학습 문서를 수정했습니다')
      setActiveTab('document')
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

  const handleTutorAsk = async (): Promise<void> => {
    if (!node || !tutorInput.trim() || tutorLoading) return
    const userMsg: ChatMessage = { role: 'user', content: tutorInput }
    const newMessages = [...tutorMessages, userMsg]
    setTutorMessages(newMessages)
    setTutorInput('')
    setTutorLoading(true)
    const res = await chatWithTutor(newMessages, undefined, node.id, 'normal')
    setTutorLoading(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    if (res.data) {
      setTutorMessages([...newMessages, { role: 'assistant', content: res.data.content }])
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose() } }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
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
          // 편집 모드: 탭 구조
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">기본</TabsTrigger>
              <TabsTrigger value="document">학습문서</TabsTrigger>
              <TabsTrigger value="chat">AI 수정</TabsTrigger>
              <TabsTrigger value="tutor-test">AI 테스트</TabsTrigger>
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

              {/* 학습 문서 */}
              <TabsContent value="document" className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">마크다운 학습 문서</Label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRegenerate}
                      disabled={regenerating}
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
                ) : (
                  <textarea
                    value={learningDoc}
                    onChange={e => setLearningDoc(e.target.value)}
                    placeholder="학습 문서가 없습니다. '[AI 재생성]' 버튼을 눌러 생성하세요."
                    rows={18}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                )}
                <p className="text-xs text-gray-500">
                  마크다운 형식으로 직접 편집 가능. 저장하면 학생에게 즉시 반영됩니다.
                </p>
              </TabsContent>

              {/* AI에게 수정 요청 */}
              <TabsContent value="chat" className="space-y-3">
                <div className="rounded-lg border border-[#7C5CFC]/20 bg-[#7C5CFC]/5 p-3">
                  <p className="mb-1 text-sm font-medium text-[#7C5CFC]">
                    <Sparkles className="mr-1 inline h-4 w-4" />
                    AI에게 학습 문서 수정 요청
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    현재 학습 문서를 어떻게 수정할지 자연어로 요청하세요. 예: "예시를 더 추가해줘", "초등학생 수준으로 쉽게 써줘"
                  </p>
                </div>
                <textarea
                  value={revisionInput}
                  onChange={e => setRevisionInput(e.target.value)}
                  placeholder="어떻게 수정할까요? (예: 예시를 2개 더 추가해줘)"
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button
                  onClick={handleRevision}
                  disabled={!revisionInput.trim() || revising}
                  className="w-full bg-[#7C5CFC] hover:bg-[#7C5CFC]/90"
                >
                  {revising ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
                  AI로 수정하기
                </Button>
              </TabsContent>

              {/* AI 튜터 테스트 */}
              <TabsContent value="tutor-test" className="flex flex-col gap-3">
                <div className="rounded-lg border border-[#10B981]/20 bg-[#10B981]/5 p-3">
                  <p className="mb-1 text-sm font-medium text-[#10B981]">
                    <Bot className="mr-1 inline h-4 w-4" />
                    AI 튜터 품질 검증
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    학생 입장에서 이 노드에 대해 AI 튜터에게 질문해보세요. 답변 품질을 검토한 후 학생에게 배포할 수 있습니다.
                  </p>
                </div>
                <div className="min-h-[200px] max-h-[300px] overflow-y-auto rounded-md border bg-gray-50 p-3 space-y-2 dark:bg-gray-900">
                  {tutorMessages.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 py-8">
                      학생이 할 만한 질문을 입력해보세요
                    </p>
                  ) : (
                    tutorMessages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : ''}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-xs ${
                            m.role === 'user'
                              ? 'bg-[#4F6BF6] text-white'
                              : 'bg-white dark:bg-gray-800'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                  {tutorLoading && (
                    <div className="flex">
                      <div className="rounded-2xl bg-white px-3 py-1.5 dark:bg-gray-800">
                        <Loader2 className="h-3 w-3 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={tutorInput}
                    onChange={e => setTutorInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleTutorAsk()
                      }
                    }}
                    placeholder="학생이 할 질문을 입력..."
                    disabled={tutorLoading}
                  />
                  <Button
                    onClick={handleTutorAsk}
                    disabled={!tutorInput.trim() || tutorLoading}
                    size="icon"
                    className="bg-[#10B981] hover:bg-[#10B981]/90"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
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
                        학생이 학습 문서를 PDF로 다운로드할 수 있습니다
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
                        학생이 학습 문서를 브라우저에서 프린트할 수 있습니다
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
