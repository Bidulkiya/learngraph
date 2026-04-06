'use client'

import { useState } from 'react'
import { Loader2, RefreshCw, ClipboardList, TreePine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { getQuizzesForNode, updateQuiz, regenerateQuizzes } from '@/actions/quiz'
import type { Quiz } from '@/types/quiz'
import { toast } from 'sonner'

interface SkillTreeWithNodes {
  id: string
  title: string
  nodes: Array<{ id: string; title: string; difficulty: number }>
}

export function TeacherQuizManager({ skillTrees }: { skillTrees: SkillTreeWithNodes[] }) {
  const [selectedTree, setSelectedTree] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})

  const tree = skillTrees.find(t => t.id === selectedTree)

  const loadQuizzes = async (nodeId: string): Promise<void> => {
    setSelectedNode(nodeId)
    setLoading(true)
    const res = await getQuizzesForNode(nodeId)
    setQuizzes(res.data ?? [])
    setLoading(false)
  }

  const handleRegenerate = async (): Promise<void> => {
    if (!selectedNode) return
    setLoading(true)
    const res = await regenerateQuizzes(selectedNode)
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">퀴즈 관리</h1>
        <p className="mt-1 text-gray-500">스킬트리 노드별 퀴즈를 확인하고 편집하세요</p>
      </div>

      {/* Tree selection */}
      <div className="flex flex-wrap gap-2">
        {skillTrees.map(t => (
          <Button
            key={t.id}
            variant={selectedTree === t.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setSelectedTree(t.id); setSelectedNode(null); setQuizzes([]) }}
          >
            <TreePine className="mr-1 h-4 w-4" />
            {t.title}
          </Button>
        ))}
        {skillTrees.length === 0 && (
          <p className="text-sm text-gray-500">아직 스킬트리가 없습니다</p>
        )}
      </div>

      {/* Node list */}
      {tree && (
        <div className="flex flex-wrap gap-2">
          {tree.nodes.map(n => (
            <Button
              key={n.id}
              variant={selectedNode === n.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => loadQuizzes(n.id)}
              className={selectedNode === n.id ? 'bg-[#4F6BF6]' : ''}
            >
              {n.title}
              <Badge variant="secondary" className="ml-1">Lv.{n.difficulty}</Badge>
            </Button>
          ))}
        </div>
      )}

      {/* Quizzes */}
      {selectedNode && (
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
              이 노드에 퀴즈가 없습니다. "AI 재생성" 버튼을 눌러 생성하세요.
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
    </div>
  )
}
