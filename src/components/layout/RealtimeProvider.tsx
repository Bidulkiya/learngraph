'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

/**
 * Supabase Realtime 구독 관리 Provider.
 *
 * 구독 대상:
 * 1. direct_messages INSERT → 새 메시지 뱃지 + 토스트
 * 2. announcements INSERT → 새 공지 토스트
 * 3. student_progress 변경 → 대시보드 카드 갱신 시그널
 *
 * 로그인 상태에서만 활성화, 언마운트 시 자동 정리.
 */

interface RealtimeContextType {
  /** 안 읽은 메시지 수 (실시간 증가) */
  realtimeUnread: number
  /** 진도 변경 시그널 — 값이 바뀔 때마다 대시보드가 다시 fetch */
  progressVersion: number
}

const RealtimeContext = createContext<RealtimeContextType>({
  realtimeUnread: 0,
  progressVersion: 0,
})

export function useRealtime(): RealtimeContextType {
  return useContext(RealtimeContext)
}

interface Props {
  userId: string | null
  children: React.ReactNode
}

export function RealtimeProvider({ userId, children }: Props) {
  const [realtimeUnread, setRealtimeUnread] = useState(0)
  const [progressVersion, setProgressVersion] = useState(0)
  const channelRef = useRef<ReturnType<ReturnType<typeof createBrowserClient>['channel']> | null>(null)

  useEffect(() => {
    if (!userId) return

    const supabase = createBrowserClient()

    // 단일 채널에 여러 이벤트 구독
    const channel = supabase
      .channel(`realtime-${userId}`)
      // 1. 새 메시지 수신
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => {
          setRealtimeUnread(prev => prev + 1)
          const senderId = (payload.new as { sender_id?: string }).sender_id
          toast.info(`새 메시지가 도착했습니다`, {
            description: senderId ? '메시지 메뉴에서 확인하세요' : undefined,
          })
        },
      )
      // 2. 새 공지사항
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'announcements',
        },
        () => {
          toast.info('새 공지사항이 등록되었습니다')
        },
      )
      // 3. 진도 변경 (본인)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_progress',
          filter: `student_id=eq.${userId}`,
        },
        () => {
          setProgressVersion(prev => prev + 1)
        },
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [userId])

  return (
    <RealtimeContext.Provider value={{ realtimeUnread, progressVersion }}>
      {children}
    </RealtimeContext.Provider>
  )
}
