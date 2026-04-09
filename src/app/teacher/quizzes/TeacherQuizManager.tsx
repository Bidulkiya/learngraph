'use client'

import { useState } from 'react'
import {
  Loader2,
  RefreshCw,
  ClipboardList,
  TreePine,
  ChevronRight,
  School,
  ChevronLeft,
  BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getQuizzesForNode, updateQuiz, regenerateQuizzes } from '@/actions/quiz'
import type {
  TeacherQuizHierarchyClass,
  TeacherQuizHierarchyTree,
  TeacherQuizHierarchyNode,
} from '@/actions/quiz'
import type { Quiz } from '@/types/quiz'
import { toast } from 'sonner'

interface Props {
  initialClasses: TeacherQuizHierarchyClass[]
}

interface SelectedPath {
  classId: string | null
  className: string
  tree: TeacherQuizHierarchyTree
  node: TeacherQuizHierarchyNode
}

type DialogStage = 'class' | 'tree' | 'node'

export function TeacherQuizManager({ initialClasses }: Props) {
  const [classes] = useState<TeacherQuizHierarchyClass[]>(initialClasses)
  const [selected, setSelected] = useState<SelectedPath | null>(null)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})

  // Dialog 내부 탐색 상태
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogStage, setDialogStage] = useState<DialogStage>('class')
  const [dialogClass, setDialogClass] = useState<TeacherQuizHierarchyClass | null>(null)
  const [dialogTree, setDialogTree] = useState<TeacherQuizHierarchyTree | null>(null)

  const openPicker = (): void => {
    setDialogOpen(true)
    setDialogStage('class')
    setDialogClass(null)
    setDialogTree(null)
  }

  const closeDialog = (): void => {
    setDialogOpen(false)
  }

  const loadQuizzes = async (nodeId: string): Promise<void> => {
    setLoading(true)
    const res = await getQuizzesForNode(nodeId)
    setQuizzes(res.data ?? [])
    setLoading(false)
  }

  const handleRegenerate = async (): Promise<void> => {
    if (!selected) return
    setLoading(true)
    const res = await regenerateQuizzes(selected.node.id)
    if (res.error) {
      toast.error(res.error)
    } else {
      setQuizzes(res.data ?? [])
      toast.success('퀴즈가 재생성되었습니다')
    }
    setLoading(false)
  }

  const handleSaveEdit = async (quizId: string): Promise<void> => {
    const updates: Record<string, string> = {}
    if (editValues[`${quizId}-q`]) updates.question = editValues[`${quizId}-q`]
    if (editValues[`${quizId}-a`]) updates.correct_answer = editValues[`${quizId}-a`]
    if (editValues[`${quizId}-e`]) updates.explanation = editValues[`${quizId}-e`]

    const res = await updateQuiz(quizId, updates)
    if (res.error) {
      toast.error(res.error)
    } else {
      setQuizzes(prev => prev.map(q =>
        q.id === quizId ? { ...q, ...updates } : q
      ))
      toast.success('퀴즈가 수정되었습니다')
    }
    setEditingId(null)
    setEditValues({})
  }

  const selectClass = (cls: TeacherQuizHierarchyClass): void => {
    setDialogClass(cls)
    setDialogStage('tree')
  }

  const selectTree = (tree: TeacherQuizHierarchyTree): void => {
    setDialogTree(tree)
    setDialogStage('node')
  }

  const selectNode = (node: TeacherQuizHierarchyNode): void => {
    if (!dialogClass || !dialogTree) return
    const path: SelectedPath = {
      classId: dialogClass.id,
      className: dialogClass.name,
      tree: dialogTree,
      node,
    }
    setSelected(path)
    closeDialog()
    loadQuizzes(node.id)
  }

  const goBack = (): void => {
    if (dialogStage === 'node') {
      setDialogStage('tree')
      setDialogTree(null)
    } else if (dialogStage === 'tree') {
      setDialogStage('class')
      setDialogClass(null)
    }
  }

  // 노드를 난이도별로 그룹화
  const groupNodesByLevel = (nodes: TeacherQuizHierarchyNode[]): Map<number, TeacherQuizHierarchyNode[]> => {
    const map = new Map<number, TeacherQuizHierarchyNode[]>()
    nodes.forEach(n => {
      const level = n.difficulty
      const list = map.get(level) ?? []
      list.push(n)
      map.set(level, list)
    })
    return new Map([...map.entries()].sort((a, b) => a[0] - b[0]))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">퀴즈 관리</h1>
        <p className="mt-1 text-gray-500">
          클래스 → 스킬트리 → 노드 순서로 선택하고 퀴즈를 편집하세요
        </p>
      </div>

      {/* 빵가루 네비게이션 (노드 선택된 경우) */}
      {selected && (
        <div className="flex items-center justify-between rounded-lg border bg-[#4F6BF6]/5 p-3 flex-wrap gap-2">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <School className="h-4 w-4 text-[#4F6BF6]" />
            <span className="font-medium">{selected.className}</span>
            <ChevronRight className="h-3 w-3 text-gray-400" />
            <TreePine className="h-4 w-4 text-[#10B981]" />
            <span className="font-medium">{selected.tree.title}</span>
            <ChevronRight className="h-3 w-3 text-gray-400" />
            <BookOpen className="h-4 w-4 text-[#7C5CFC]" />
            <span className="font-semibold">{selected.node.title}</span>
            <Badge variant="secondary" className="ml-1">Lv.{selected.node.difficulty}</Badge>
          </div>
          <Button size="sm" variant="outline" onClick={openPicker}>
            다른 노드 선택
          </Button>
        </div>
      )}

      {/* 최초 진입 — 클래스 카드 그리드 */}
      {!selected && (
        <div className="space-y-4">
          {classes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardList className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-3 text-sm text-gray-500">
                  아직 클래스가 없습니다. 먼저 클래스를 생성하고 스킬트리를 추가하세요.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {classes.map(cls => {
                const totalNodes = cls.trees.reduce((sum, t) => sum + t.nodes.length, 0)
                return (
                  <button
                    key={cls.id ?? 'personal'}
                    type="button"
                    onClick={() => {
                      setDialogOpen(true)
                      setDialogStage('tree')
                      setDialogClass(cls)
                    }}
                    className="group rounded-xl border bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#4F6BF6]/40 hover:shadow-md dark:bg-gray-900 dark:border-gray-800"
                  >
                    <div className="flex items-center gap-2">
                      <School className="h-5 w-5 text-[#4F6BF6]" />
                      <h3 className="flex-1 font-semibold text-gray-900 dark:text-white">
                        {cls.name}
                      </h3>
                      <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" />
                    </div>
                    {cls.school_name && (
                      <p className="mt-1 text-xs text-gray-500">{cls.school_name}</p>
                    )}
                    <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <TreePine className="h-3 w-3" />
                        스킬트리 {cls.trees.length}개
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        노드 {totalNodes}개
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 선택된 노드의 퀴즈 목록 */}
      {selected && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{quizzes.length}개 퀴즈</h2>
            <Button onClick={handleRegenerate} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`mr-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              AI 재생성
            </Button>
          </div>

          {loading ? (
            <Card><CardContent className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#4F6BF6]" />
            </CardContent></Card>
          ) : quizzes.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-gray-500">
              이 노드에 퀴즈가 없습니다. &ldquo;AI 재생성&rdquo; 버튼을 눌러 생성하세요.
            </CardContent></Card>
          ) : (
            quizzes.map((q, i) => (
              <Card key={q.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Badge variant="secondary">{q.question_type === 'multiple_choice' ? '객관식' : '주관식'}</Badge>
                    Q{i + 1}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {editingId === q.id ? (
                    <div className="space-y-2">
                      <Input
                        defaultValue={q.question}
                        onChange={e => setEditValues(v => ({ ...v, [`${q.id}-q`]: e.target.value }))}
                        placeholder="문제"
                      />
                      <Input
                        defaultValue={q.correct_answer}
                        onChange={e => setEditValues(v => ({ ...v, [`${q.id}-a`]: e.target.value }))}
                        placeholder="정답"
                      />
                      <Input
                        defaultValue={q.explanation}
                        onChange={e => setEditValues(v => ({ ...v, [`${q.id}-e`]: e.target.value }))}
                        placeholder="해설"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveEdit(q.id)}>저장</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>취소</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-medium">{q.question}</p>
                      {q.options && (
                        <div className="ml-4 space-y-1 text-gray-600 dark:text-gray-400">
                          {(q.options as string[]).map((opt, oi) => (
                            <p key={oi} className={opt === q.correct_answer ? 'font-semibold text-[#10B981]' : ''}>
                              {String.fromCharCode(65 + oi)}. {opt} {opt === q.correct_answer && '✓'}
                            </p>
                          ))}
                        </div>
                      )}
                      <p className="text-gray-500"><span className="font-medium">정답:</span> {q.correct_answer}</p>
                      <p className="text-gray-500"><span className="font-medium">해설:</span> {q.explanation}</p>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(q.id)}>편집</Button>
                    </>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Dialog: 클래스 → 스킬트리 → 노드 3단계 선택 */}
      <Dialog open={dialogOpen} onOpenChange={(v) => setDialogOpen(v)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogStage !== 'class' && (
                <Button size="sm" variant="ghost" onClick={goBack} className="h-7 w-7 p-0">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              {dialogStage === 'class' && '1. 클래스 선택'}
              {dialogStage === 'tree' && `2. 스킬트리 선택 — ${dialogClass?.name}`}
              {dialogStage === 'node' && `3. 노드 선택 — ${dialogTree?.title}`}
            </DialogTitle>
            <DialogDescription>
              {dialogStage === 'class' && '퀴즈를 편집할 클래스를 선택하세요'}
              {dialogStage === 'tree' && '클래스에 속한 스킬트리를 선택하세요'}
              {dialogStage === 'node' && '난이도별로 그룹화된 노드 중 하나를 선택하세요'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {/* Stage 1: Class */}
            {dialogStage === 'class' && (
              <div className="grid gap-2">
                {classes.map(cls => {
                  const total = cls.trees.reduce((sum, t) => sum + t.nodes.length, 0)
                  return (
                    <button
                      key={cls.id ?? 'personal'}
                      type="button"
                      onClick={() => selectClass(cls)}
                      className="flex items-center justify-between rounded-lg border p-3 text-left transition-all hover:border-[#4F6BF6] hover:bg-[#4F6BF6]/5"
                    >
                      <div>
                        <p className="flex items-center gap-2 font-semibold">
                          <School className="h-4 w-4 text-[#4F6BF6]" />
                          {cls.name}
                        </p>
                        {cls.school_name && (
                          <p className="text-xs text-gray-500 mt-0.5">{cls.school_name}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          스킬트리 {cls.trees.length}개 · 노드 {total}개
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </button>
                  )
                })}
              </div>
            )}

            {/* Stage 2: Tree */}
            {dialogStage === 'tree' && dialogClass && (
              <div className="grid gap-2">
                {dialogClass.trees.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-500">
                    이 클래스에는 아직 스킬트리가 없습니다
                  </p>
                ) : (
                  dialogClass.trees.map(tree => (
                    <button
                      key={tree.id}
                      type="button"
                      onClick={() => selectTree(tree)}
                      className="flex items-center justify-between rounded-lg border p-3 text-left transition-all hover:border-[#10B981] hover:bg-[#10B981]/5"
                    >
                      <div>
                        <p className="flex items-center gap-2 font-semibold">
                          <TreePine className="h-4 w-4 text-[#10B981]" />
                          {tree.title}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          노드 {tree.nodes.length}개
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Stage 3: Node (난이도별 그룹) */}
            {dialogStage === 'node' && dialogTree && (
              <div className="space-y-4">
                {dialogTree.nodes.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-500">
                    이 스킬트리에는 아직 노드가 없습니다
                  </p>
                ) : (
                  Array.from(groupNodesByLevel(dialogTree.nodes).entries()).map(([level, nodes]) => (
                    <div key={level}>
                      <div className="mb-2 flex items-center gap-2">
                        <Badge className="bg-[#7C5CFC]/10 text-[#7C5CFC] border border-[#7C5CFC]/30">
                          Lv.{level}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          난이도 {level} · {nodes.length}개 노드
                        </span>
                      </div>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {nodes.map(n => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => selectNode(n)}
                            className="flex items-center justify-between rounded-md border p-2.5 text-left text-sm transition-all hover:border-[#7C5CFC] hover:bg-[#7C5CFC]/5"
                          >
                            <span className="truncate font-medium">{n.title}</span>
                            <Badge
                              variant="secondary"
                              className={`ml-2 shrink-0 ${n.quiz_count === 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                            >
                              퀴즈 {n.quiz_count}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
