'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Loader2, MessageSquare, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  getConversation,
  getConversations,
  sendMessage,
  getMessageContacts,
  type Conversation,
  type DirectMessage,
} from '@/actions/messages'
import { toast } from 'sonner'

interface Contact {
  id: string
  name: string
  email: string
  role: string
}

export function MessengerView({ currentUserId }: { currentUserId: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // 초기 로드
  useEffect(() => {
    Promise.all([getConversations(), getMessageContacts()]).then(([convs, cnts]) => {
      setConversations(convs.data ?? [])
      setContacts(cnts.data ?? [])
      setLoading(false)
    })
  }, [])

  // 선택된 대화 로드
  useEffect(() => {
    if (!selected) return
    getConversation(selected).then(res => {
      setMessages(res.data ?? [])
    })
  }, [selected])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleSend = async (): Promise<void> => {
    if (!selected || !input.trim() || sending) return
    setSending(true)
    const res = await sendMessage(selected, input)
    if (res.error) {
      toast.error(res.error)
      setSending(false)
      return
    }
    setInput('')
    // 메시지 다시 로드
    const updated = await getConversation(selected)
    setMessages(updated.data ?? [])
    setSending(false)
  }

  const selectedContact = contacts.find(c => c.id === selected) ??
    conversations.find(c => c.user_id === selected)

  // 대화 + 연락처 통합 (대화 이력 없는 연락처도 시작 가능)
  const conversationIds = new Set(conversations.map(c => c.user_id))
  const newContacts = contacts.filter(c => !conversationIds.has(c.id))

  const filteredContacts = search
    ? [...conversations, ...newContacts.map(c => ({
        user_id: c.id,
        name: c.name,
        email: c.email,
        role: c.role,
        last_message: '',
        last_at: '',
        unread_count: 0,
      }))].filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : conversations

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* 좌측: 대화 목록 */}
      <Card className="w-80 overflow-hidden">
        <CardContent className="h-full p-0">
          <div className="border-b p-3">
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <MessageSquare className="h-4 w-4 text-[#4F6BF6]" />
              메시지
            </h2>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="사람 검색"
                className="h-8 pl-7 text-xs"
              />
            </div>
          </div>

          <div className="h-[calc(100%-100px)] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-[#4F6BF6]" />
              </div>
            ) : filteredContacts.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-400">
                {search ? '검색 결과 없음' : '대화 가능한 사람이 없습니다'}
              </p>
            ) : (
              <ul>
                {filteredContacts.map(c => (
                  <li key={c.user_id}>
                    <button
                      onClick={() => setSelected(c.user_id)}
                      className={`flex w-full items-center gap-2 border-b p-3 text-left text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900 ${
                        selected === c.user_id ? 'bg-[#4F6BF6]/5' : ''
                      }`}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#4F6BF6]/10 text-sm font-medium text-[#4F6BF6]">
                        {c.name[0]}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{c.name}</p>
                          {c.unread_count > 0 && (
                            <Badge className="h-5 min-w-5 bg-[#4F6BF6] px-1.5 text-xs">
                              {c.unread_count}
                            </Badge>
                          )}
                        </div>
                        <p className="truncate text-xs text-gray-500">
                          {c.last_message || c.email}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 우측: 채팅 */}
      <Card className="flex-1 overflow-hidden">
        <CardContent className="flex h-full flex-col p-0">
          {!selected ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <MessageSquare className="h-12 w-12 text-gray-300" />
              <p className="text-gray-500">대화를 선택하세요</p>
            </div>
          ) : (
            <>
              {/* 헤더 */}
              <div className="border-b p-3">
                <p className="font-semibold">{selectedContact?.name ?? '사용자'}</p>
                <p className="text-xs text-gray-500">{selectedContact?.email}</p>
              </div>

              {/* 메시지 목록 */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">
                    아직 대화가 없습니다. 첫 메시지를 보내보세요!
                  </p>
                ) : (
                  messages.map(m => {
                    const isMine = m.sender_id === currentUserId
                    return (
                      <div key={m.id} className={`flex ${isMine ? 'justify-end' : ''}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-3 py-1.5 text-sm ${
                            isMine
                              ? 'bg-[#4F6BF6] text-white'
                              : 'bg-gray-100 dark:bg-gray-800'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.content}</p>
                          <p className={`mt-0.5 text-xs ${isMine ? 'text-blue-100' : 'text-gray-500'}`}>
                            {new Date(m.created_at).toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* 입력 */}
              <div className="flex gap-2 border-t p-3">
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
