'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Mail } from 'lucide-react'

interface LatestUnread {
  senderId: string
  senderName: string
  lastMessage: string
  count: number
}

interface Props {
  role: 'teacher' | 'student' | 'admin'
  latestUnread: LatestUnread | null
  totalUnread: number
}

/**
 * 로그인 직후 읽지 않은 메시지가 있으면 토스트 알림 표시.
 * - 한 세션(sessionStorage) 내에서 한 번만 표시
 * - 클릭하면 메시지 페이지로 이동
 */
export function MessageNotifier({ role, latestUnread, totalUnread }: Props) {
  const router = useRouter()
  const shownRef = useRef(false)

  useEffect(() => {
    if (shownRef.current) return
    if (!latestUnread || totalUnread === 0) return

    // 세션 스토리지로 중복 표시 방지
    const key = `learngraph_unread_notified_${latestUnread.senderId}_${latestUnread.count}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {
      // private mode 등에서 실패해도 무시
    }

    shownRef.current = true

    const messagesPath = `/${role}/messages`
    const title = totalUnread > 1
      ? `새 메시지 ${totalUnread}개`
      : '새 메시지가 있습니다'

    toast(
      <div className="flex items-start gap-3 pr-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#4F6BF6]/10">
          <Mail className="h-4 w-4 text-[#4F6BF6]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
            {latestUnread.senderName}: {latestUnread.lastMessage}
          </p>
        </div>
      </div>,
      {
        duration: 8000,
        position: 'bottom-right',
        action: {
          label: '확인',
          onClick: () => router.push(messagesPath),
        },
      }
    )
  }, [latestUnread, totalUnread, role, router])

  return null
}
