'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Send, Loader2, Bot, User, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { chatWithTutor, clearTutorHistory, type ChatMessage } from '@/actions/tutor'
import { toast } from 'sonner'

interface ChatInterfaceProps {
  initialMessages?: ChatMessage[]
  nodeId?: string
}

export function ChatInterface({ initialMessages = [], nodeId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async (): Promise<void> => {
    const text = input.trim()
    if (!text || loading) return

    const userMessage: ChatMessage = { role: 'user', content: text }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    const result = await chatWithTutor(newMessages, undefined, nodeId)
    if (result.error || !result.data) {
      toast.error(result.error ?? '응답을 받을 수 없습니다')
      setMessages(messages) // rollback
      setLoading(false)
      return
    }

    setMessages([...newMessages, { role: 'assistant', content: result.data.content }])
    setLoading(false)
  }

  const handleNewChat = async (): Promise<void> => {
    if (!confirm('대화 기록을 모두 삭제하고 새 대화를 시작하시겠습니까?')) return
    const result = await clearTutorHistory()
    if (result.error) {
      toast.error(result.error)
      return
    }
    setMessages([])
    toast.success('새 대화를 시작합니다')
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4F6BF6]/10">
            <Bot className="h-4 w-4 text-[#4F6BF6]" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">AI 튜터</h1>
        </div>
        <Button onClick={handleNewChat} variant="outline" size="sm">
          <Plus className="mr-1 h-4 w-4" />
          새 대화
        </Button>
      </div>

      {/* Messages */}
      <Card className="flex-1 overflow-hidden">
        <CardContent className="h-full p-0">
          <div ref={scrollRef} className="h-full overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#4F6BF6]/10">
                  <Bot className="h-7 w-7 text-[#4F6BF6]" />
                </div>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  궁금한 것을 물어보세요
                </p>
                <p className="text-sm text-gray-500">
                  수업 자료를 기반으로 친절하게 답변해드립니다
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        m.role === 'user' ? 'bg-[#4F6BF6]' : 'bg-gray-100 dark:bg-gray-800'
                      }`}
                    >
                      {m.role === 'user' ? (
                        <User className="h-4 w-4 text-white" />
                      ) : (
                        <Bot className="h-4 w-4 text-[#4F6BF6]" />
                      )}
                    </div>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                        m.role === 'user'
                          ? 'bg-[#4F6BF6] text-white'
                          : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                      }`}
                    >
                      {m.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                      <Bot className="h-4 w-4 text-[#4F6BF6]" />
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl bg-gray-100 px-4 py-2.5 dark:bg-gray-800">
                      <Loader2 className="h-4 w-4 animate-spin text-[#4F6BF6]" />
                      <span className="text-sm text-gray-500">답변 생성 중...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="메시지를 입력하세요..."
          disabled={loading}
          className="flex-1"
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="bg-[#4F6BF6] hover:bg-[#4F6BF6]/90"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
