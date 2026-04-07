'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  Bot,
  StickyNote,
  Star,
  CheckCircle,
  Lock,
  Loader2,
  Save,
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
import { toast } from 'sonner'
import type { D3Node } from '@/lib/d3/skill-tree-layout'

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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 노드 변경 시 메모 로드
  useEffect(() => {
    if (!open || !node) {
      setMemo('')
      setMemoLoaded(false)
      return
    }
    setMemoLoaded(false)
    getMemo(node.id).then(res => {
      if (res.data) setMemo(res.data.content)
      setMemoLoaded(true)
    })
  }, [open, node])

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
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="actions">학습</TabsTrigger>
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
