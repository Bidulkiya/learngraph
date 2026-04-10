'use client'

import { useState, useEffect, useRef } from 'react'
import { Users, Plus, Loader2, Send, UserPlus, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  createGroup,
  joinGroup,
  leaveGroup,
  sendGroupMessage,
  getGroupMessages,
  getMyGroups,
  type StudyGroup,
  type GroupMessage,
} from '@/actions/study-group'
import { toast } from 'sonner'

interface Props {
  initialGroups: StudyGroup[]
  classes: Array<{ id: string; name: string }>
  currentUserId: string
}

export function StudyGroupsView({ initialGroups, classes, currentUserId }: Props) {
  const [groups, setGroups] = useState(initialGroups)
  const [selected, setSelected] = useState<StudyGroup | null>(null)
  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupClassId, setGroupClassId] = useState(classes[0]?.id ?? '')
  const [creating, setCreating] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selected) return
    getGroupMessages(selected.id).then(res => setMessages(res.data ?? []))
  }, [selected])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleCreate = async (): Promise<void> => {
    if (!groupClassId || !groupName.trim()) return
    setCreating(true)
    const res = await createGroup(groupClassId, groupName)
    setCreating(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success('그룹이 생성되었습니다')
    setCreateOpen(false)
    setGroupName('')
    const updated = await getMyGroups()
    setGroups(updated.data ?? [])
  }

  const handleJoin = async (groupId: string): Promise<void> => {
    const res = await joinGroup(groupId)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success('그룹에 가입했습니다')
    const updated = await getMyGroups()
    setGroups(updated.data ?? [])
  }

  const handleSend = async (): Promise<void> => {
    if (!selected || !input.trim() || sending) return
    setSending(true)
    const res = await sendGroupMessage(selected.id, input)
    if (res.error) {
      toast.error(res.error)
      setSending(false)
      return
    }
    setInput('')
    const updated = await getGroupMessages(selected.id)
    setMessages(updated.data ?? [])
    setSending(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
            <Users className="h-6 w-6 text-[#4F6BF6]" />
            스터디 그룹
          </h1>
          <p className="mt-1 text-gray-500">친구들과 함께 공부해요</p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          disabled={classes.length === 0}
          className="bg-[#4F6BF6] hover:bg-[#4F6BF6]/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          그룹 만들기
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* 그룹 목록 */}
        <div className="lg:col-span-1">
          {groups.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <Users className="h-10 w-10 text-gray-300" />
                <p className="text-sm text-gray-500">
                  {classes.length === 0 ? '먼저 클래스에 가입하세요' : '아직 그룹이 없습니다'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {groups.map(g => (
                <Card
                  key={g.id}
                  className={`cursor-pointer transition-all ${
                    selected?.id === g.id ? 'ring-2 ring-[#4F6BF6]' : 'hover:shadow-md'
                  }`}
                  onClick={() => g.is_member && setSelected(g)}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{g.name}</p>
                        <p className="text-xs text-gray-500">{g.class_name}</p>
                      </div>
                      {g.is_member ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs text-gray-500 hover:text-red-500"
                          onClick={async (e) => {
                            e.stopPropagation()
                            if (!confirm('정말 이 그룹을 탈퇴하시겠습니까?')) return
                            const res = await leaveGroup(g.id)
                            if (res.error) { toast.error(res.error); return }
                            toast.success('그룹을 탈퇴했습니다')
                            if (selected?.id === g.id) setSelected(null)
                            const refreshed = await getMyGroups()
                            if (refreshed.data) setGroups(refreshed.data)
                          }}
                        >
                          탈퇴
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleJoin(g.id)
                          }}
                        >
                          <UserPlus className="mr-1 h-3.5 w-3.5" />
                          가입
                        </Button>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      <Users className="mr-1 inline h-3 w-3" />
                      {g.member_count}명
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* 채팅 */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {selected ? selected.name : '그룹을 선택하세요'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <div className="flex h-64 items-center justify-center">
                <MessageSquare className="h-12 w-12 text-gray-300" />
              </div>
            ) : (
              <div className="flex h-[450px] flex-col">
                <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto pr-2">
                  {messages.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-400">
                      첫 메시지를 보내보세요!
                    </p>
                  ) : (
                    messages.map(m => {
                      const isMine = m.user_id === currentUserId
                      return (
                        <div key={m.id} className={`flex ${isMine ? 'justify-end' : ''}`}>
                          <div className="max-w-[70%]">
                            {!isMine && (
                              <p className="mb-0.5 text-xs text-gray-500">{m.user_name}</p>
                            )}
                            <div
                              className={`rounded-2xl px-3 py-1.5 text-sm ${
                                isMine
                                  ? 'bg-[#4F6BF6] text-white'
                                  : 'bg-gray-100 dark:bg-gray-800'
                              }`}
                            >
                              {m.content}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                <div className="mt-3 flex gap-2 border-t pt-3">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    placeholder="메시지 입력..."
                    disabled={sending}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    size="icon"
                    className="bg-[#4F6BF6] hover:bg-[#4F6BF6]/90"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 그룹 생성 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 스터디 그룹</DialogTitle>
            <DialogDescription>같은 클래스 학생들과 함께 공부할 그룹을 만드세요</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>클래스</Label>
              <select
                value={groupClassId}
                onChange={(e) => setGroupClassId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>그룹 이름</Label>
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="예: 수학 마스터 그룹"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>취소</Button>
            <Button
              onClick={handleCreate}
              disabled={!groupName.trim() || creating}
              className="bg-[#4F6BF6] hover:bg-[#4F6BF6]/90"
            >
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              만들기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
