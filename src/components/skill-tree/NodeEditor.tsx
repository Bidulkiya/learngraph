'use client'

import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface NodeEditorProps {
  open: boolean
  onClose: () => void
  node: { id: string; title: string; description: string; difficulty: number } | null
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

  // Reset form when node changes
  const resetForm = (): void => {
    setTitle(node?.title ?? '')
    setDescription(node?.description ?? '')
    setDifficulty(node?.difficulty ?? 1)
    setConfirmDelete(false)
  }

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

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose() } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? '새 노드 추가' : '노드 편집'}</DialogTitle>
          <DialogDescription>
            {mode === 'add' ? '새로운 학습 개념 노드를 추가합니다' : '노드의 정보를 수정합니다'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="node-title">제목</Label>
            <Input
              id="node-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="학습 개념 이름"
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
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

        <div className="flex justify-between">
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
              취소
            </Button>
            <Button onClick={handleSave} disabled={saving || !title.trim()} size="sm" className="bg-[#4F6BF6] hover:bg-[#4F6BF6]/90">
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {mode === 'add' ? '추가' : '저장'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
