'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  BookOpen,
  Bot,
  StickyNote,
  Star,
  CheckCircle,
  Lock,
  Loader2,
  Save,
  FileText,
  Download,
  Printer,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { saveMemo, getMemo } from '@/actions/memo'
import { getConceptConnections } from '@/actions/recommendations'
import { getNodeLearningDoc } from '@/actions/learning-doc'
import { FlashcardDeck } from './FlashcardDeck'
import { Layers } from 'lucide-react'
import { toast } from 'sonner'
import type { D3Node } from '@/lib/d3/skill-tree-layout'
import type { ConceptConnectionOutput } from '@/lib/ai/schemas'

/**
 * 콘텐츠가 HTML인지 마크다운인지 감지.
 * 신규 학습 문서는 HTML, 구버전은 마크다운일 수 있어 양쪽을 자연스럽게 처리.
 */
function isHtmlDoc(content: string): boolean {
  const trimmed = content.trimStart()
  return trimmed.startsWith('<') && /<(div|html|body|table|h[1-6]|p|section|article)/i.test(trimmed)
}

/**
 * 학습 문서를 다운로드/프린트용 self-contained HTML 문서로 변환.
 */
function buildPrintableHtml(title: string, content: string): string {
  const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // HTML이면 그대로, 마크다운이면 ReactMarkdown 없이 간단 변환
  let body = content
  if (!isHtmlDoc(content)) {
    // 간단 마크다운 → HTML 변환 (구버전 호환)
    const lines = content.replace(/</g, '&lt;').replace(/>/g, '&gt;').split('\n')
    const out: string[] = []
    let inList = false
    for (const line of lines) {
      if (/^### (.+)$/.test(line)) {
        if (inList) { out.push('</ul>'); inList = false }
        out.push(line.replace(/^### (.+)$/, '<h3>$1</h3>'))
      } else if (/^## (.+)$/.test(line)) {
        if (inList) { out.push('</ul>'); inList = false }
        out.push(line.replace(/^## (.+)$/, '<h2>$1</h2>'))
      } else if (/^# (.+)$/.test(line)) {
        if (inList) { out.push('</ul>'); inList = false }
        out.push(line.replace(/^# (.+)$/, '<h1>$1</h1>'))
      } else if (/^- (.+)$/.test(line)) {
        if (!inList) { out.push('<ul>'); inList = true }
        out.push(line.replace(/^- (.+)$/, '<li>$1</li>'))
      } else if (line.trim() === '') {
        if (inList) { out.push('</ul>'); inList = false }
        out.push('')
      } else {
        if (inList) { out.push('</ul>'); inList = false }
        const formatted = line
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
        out.push(`<p>${formatted}</p>`)
      }
    }
    if (inList) out.push('</ul>')
    body = out.join('\n')
  }
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>${safeTitle} - 학습 문서</title>
<style>
  body { font-family: -apple-system, 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; max-width: 820px; margin: 40px auto; padding: 24px; line-height: 1.65; color: #1f2937; background: #fff; }
  * { box-sizing: border-box; }
  h1 { color: #4F6BF6; border-bottom: 2px solid #4F6BF6; padding-bottom: 8px; margin-top: 0; }
  h2 { color: #1f2937; margin-top: 28px; }
  h3 { color: #4F6BF6; margin-top: 20px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { padding: 8px 10px; }
  ul, ol { padding-left: 22px; }
  p { margin: 12px 0; }
  .footer { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 11px; color: #9ca3af; text-align: center; }
  @media print { body { margin: 0; max-width: none; } .footer { page-break-before: avoid; } }
</style>
</head>
<body>
${body}
<div class="footer">NodeBloom — AI 기반 학습 문서</div>
</body>
</html>`
}

interface NodeDetailPopupProps {
  open: boolean
  onClose: () => void
  node: D3Node | null
  prerequisiteNodes?: D3Node[]
  quizScore?: number | null
}

export function NodeDetailPopup({
  open,
  onClose,
  node,
  prerequisiteNodes = [],
  quizScore,
}: NodeDetailPopupProps) {
  const router = useRouter()
  const [memo, setMemo] = useState('')
  const [memoLoaded, setMemoLoaded] = useState(false)
  const [memoSaving, setMemoSaving] = useState(false)
  const [memoSaved, setMemoSaved] = useState(false)
  const [connections, setConnections] = useState<ConceptConnectionOutput | null>(null)
  const [connectionsLoading, setConnectionsLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 학습 문서 관련
  const [learningDoc, setLearningDoc] = useState<string | null>(null)
  const [docLoading, setDocLoading] = useState(false)
  const [allowDownload, setAllowDownload] = useState(true)
  const [allowPrint, setAllowPrint] = useState(true)

  // 노드 변경 시 메모 + 학습문서 로드.
  // 이 effect는 data fetching + dialog reset 패턴이라 setState는 의도된 것 (cancelled 가드로 stale state 방지).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open || !node) {
      setMemo('')
      setMemoLoaded(false)
      setConnections(null)
      setLearningDoc(null)
      return
    }
    let cancelled = false
    setMemoLoaded(false)
    getMemo(node.id).then(res => {
      if (cancelled) return
      if (res.data) setMemo(res.data.content)
      setMemoLoaded(true)
    })
    // 학습 문서 로드 (locked가 아닐 때만)
    if (node.status !== 'locked') {
      setDocLoading(true)
      getNodeLearningDoc(node.id).then(res => {
        if (cancelled) return
        if (res.data) {
          setLearningDoc(res.data.content)
          setAllowDownload(res.data.allowDownload)
          setAllowPrint(res.data.allowPrint)
        }
        setDocLoading(false)
      })
    }
    // completed 노드는 관련 개념 자동 로드
    if (node.status === 'completed') {
      setConnectionsLoading(true)
      getConceptConnections(node.id).then(res => {
        if (cancelled) return
        if (res.data) setConnections(res.data)
        setConnectionsLoading(false)
      })
    }
    return () => { cancelled = true }
  }, [open, node])
  /* eslint-enable react-hooks/set-state-in-effect */

  // 학습 문서 다운로드 (HTML 파일)
  const handleDownload = (): void => {
    if (!allowDownload) {
      toast.error('교사가 다운로드를 허용하지 않았습니다')
      return
    }
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

  // 학습 문서 프린트 (새 창에서 PDF 저장 가능)
  const handlePrint = (): void => {
    if (!allowPrint) {
      toast.error('교사가 프린트를 허용하지 않았습니다')
      return
    }
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

  // 메모 자동 저장 (디바운스 500ms)
  useEffect(() => {
    if (!memoLoaded || !node) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setMemoSaving(true)
      const res = await saveMemo(node.id, memo)
      setMemoSaving(false)
      if (!res.error) {
        setMemoSaved(true)
        setTimeout(() => setMemoSaved(false), 2000)
      }
    }, 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [memo, node, memoLoaded])

  if (!node) return null

  const isLocked = node.status === 'locked'
  const isCompleted = node.status === 'completed'

  const statusLabel = {
    locked: '잠김',
    available: '도전 가능',
    in_progress: '진행 중',
    completed: '완료',
  }[node.status]

  const statusColor = {
    locked: 'bg-gray-100 text-gray-600',
    available: 'bg-yellow-100 text-yellow-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
  }[node.status]

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-xl">{node.title}</DialogTitle>
            <Badge variant="secondary" className={statusColor}>
              {statusLabel}
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${i < node.difficulty ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-gray-300'}`}
              />
            ))}
            <span className="ml-1">난이도 {node.difficulty}/5</span>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">{node.description}</p>

          {isCompleted && quizScore != null && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm dark:bg-green-950/30">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800 dark:text-green-300">
                완료 — 점수 {quizScore}점
              </span>
            </div>
          )}

          {/* 관련 개념 추천 (completed 노드) */}
          {isCompleted && (
            <div className="rounded-lg border border-[#7C5CFC]/20 bg-[#7C5CFC]/5 p-3">
              <p className="mb-2 text-xs font-semibold text-[#7C5CFC]">🔗 관련 개념 추천</p>
              {connectionsLoading && (
                <p className="text-xs text-gray-500">AI가 관련 개념을 찾고 있습니다...</p>
              )}
              {connections && (
                <ul className="space-y-1.5">
                  {connections.connections.map((c, i) => (
                    <li key={i} className="text-xs">
                      <span className="font-medium">[{c.subject}]</span>{' '}
                      <span className="font-semibold">{c.concept}</span>
                      <p className="mt-0.5 text-gray-600 dark:text-gray-400">{c.relation}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {isLocked && (
            <div className="rounded-lg bg-yellow-50 p-3 dark:bg-yellow-950/30">
              <div className="flex items-center gap-2 text-sm font-medium text-yellow-800 dark:text-yellow-300">
                <Lock className="h-4 w-4" />
                선수 과목을 먼저 완료하세요
              </div>
              {prerequisiteNodes.length > 0 && (
                <ul className="mt-2 ml-6 list-disc text-xs text-yellow-700 dark:text-yellow-400">
                  {prerequisiteNodes.map(n => (
                    <li key={n.id}>
                      {n.title} {n.status === 'completed' ? '✓' : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {!isLocked && (
            <Tabs defaultValue="actions" className="mt-2">
              <TabsList className={`grid w-full ${isCompleted ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <TabsTrigger value="actions">학습</TabsTrigger>
                <TabsTrigger value="document">학습 문서</TabsTrigger>
                {isCompleted && <TabsTrigger value="flashcards"><Layers className="mr-1 h-3 w-3" />카드</TabsTrigger>}
                <TabsTrigger value="memo">메모</TabsTrigger>
              </TabsList>
              <TabsContent value="actions" className="space-y-2">
                <Button
                  onClick={() => router.push(`/student/quiz/${node.id}`)}
                  className="w-full bg-[#4F6BF6] hover:bg-[#4F6BF6]/90"
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  {isCompleted ? '다시 풀기' : '퀴즈 풀기'}
                </Button>
                <Button
                  onClick={() => router.push(`/student/tutor?nodeId=${node.id}`)}
                  variant="outline"
                  className="w-full"
                >
                  <Bot className="mr-2 h-4 w-4" />
                  AI 튜터에게 질문
                </Button>
              </TabsContent>
              <TabsContent value="document" className="space-y-2">
                {docLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-[#4F6BF6]" />
                  </div>
                ) : !learningDoc ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <FileText className="h-8 w-8 text-gray-300" />
                    <p className="text-sm text-gray-500">아직 학습 문서가 없습니다</p>
                    <p className="text-xs text-gray-400">교사가 곧 준비할 예정입니다</p>
                  </div>
                ) : (
                  <>
                    {isHtmlDoc(learningDoc) ? (
                      // HTML: iframe srcdoc으로 격리 렌더링 (XSS 방어 + sandbox)
                      <iframe
                        srcDoc={`<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8" /><style>body{font-family:-apple-system,'Malgun Gothic',sans-serif;padding:16px;line-height:1.6;color:#1f2937;background:#fff;margin:0}*{box-sizing:border-box}img,video,iframe{max-width:100%}table{max-width:100%}</style></head><body>${learningDoc}</body></html>`}
                        sandbox="allow-same-origin"
                        title="학습 문서"
                        className="h-[360px] w-full rounded-md border bg-white"
                      />
                    ) : (
                      // 마크다운(구버전 호환)
                      <div className="max-h-[360px] overflow-y-auto rounded-md border bg-gray-50 p-4 text-sm dark:bg-gray-900">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {learningDoc}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDownload}
                        disabled={!allowDownload}
                        className="flex-1"
                        title={!allowDownload ? '교사가 허용하지 않았습니다' : ''}
                      >
                        <Download className="mr-1 h-3.5 w-3.5" />
                        {allowDownload ? '다운로드' : '다운로드 비허용'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handlePrint}
                        disabled={!allowPrint}
                        className="flex-1"
                        title={!allowPrint ? '교사가 허용하지 않았습니다' : ''}
                      >
                        <Printer className="mr-1 h-3.5 w-3.5" />
                        {allowPrint ? '프린트/PDF' : '프린트 비허용'}
                      </Button>
                    </div>
                    {(!allowDownload || !allowPrint) && (
                      <p className="text-xs text-yellow-600 dark:text-yellow-400">
                        ⚠️ 일부 기능이 교사에 의해 비활성화되었습니다
                      </p>
                    )}
                  </>
                )}
              </TabsContent>
              {isCompleted && (
                <TabsContent value="flashcards" className="space-y-2">
                  <FlashcardDeck nodeId={node.id} />
                </TabsContent>
              )}
              <TabsContent value="memo" className="space-y-2">
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="이 노드에 대한 메모를 작성하세요..."
                  rows={5}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <div className="flex items-center justify-end text-xs text-gray-500">
                  {memoSaving ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      저장 중...
                    </span>
                  ) : memoSaved ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <Save className="h-3 w-3" />
                      저장됨
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <StickyNote className="h-3 w-3" />
                      자동 저장
                    </span>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
