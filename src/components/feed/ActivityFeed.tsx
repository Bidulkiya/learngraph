'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { TreePine, CheckCircle, Award, Trophy, Flame } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toggleReaction, type FeedItem } from '@/actions/feed'
import { toast } from 'sonner'

const ACTION_ICONS: Record<string, React.ReactNode> = {
  node_unlock: <TreePine className="h-4 w-4 text-[#10B981]" />,
  quiz_complete: <CheckCircle className="h-4 w-4 text-[#4F6BF6]" />,
  badge_earned: <Award className="h-4 w-4 text-[#7C5CFC]" />,
  tree_complete: <Trophy className="h-4 w-4 text-[#F59E0B]" />,
  streak: <Flame className="h-4 w-4 text-red-500" />,
}

const EMOJIS = ['👏', '🔥', '⭐']

function getActionText(item: FeedItem): string {
  const name = item.user_nickname ?? item.user_name
  const detail = item.detail as { title?: string; score?: number; days?: number }
  switch (item.action_type) {
    case 'node_unlock':
      return `${name}님이 "${detail.title ?? '노드'}"를 잠금해제했습니다! 🎉`
    case 'quiz_complete':
      return `${name}님이 퀴즈를 ${detail.score ?? 0}점으로 통과했습니다! 👍`
    case 'badge_earned':
      return `${name}님이 "${detail.title ?? '배지'}"를 획득했습니다! 🏆`
    case 'tree_complete':
      return `${name}님이 스킬트리를 완주했습니다! 🎊`
    case 'streak':
      return `${name}님의 학습 스트릭이 ${detail.days ?? 0}일에 도달했습니다! 🔥`
    default:
      return `${name}님의 새 활동`
  }
}

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '방금'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return `${days}일 전`
}

export function ActivityFeed({ initialFeed }: { initialFeed: FeedItem[] }) {
  const [feed, setFeed] = useState(initialFeed)
  const [, startTransition] = useTransition()

  const handleReact = (feedId: string, emoji: string): void => {
    // 낙관적 업데이트
    setFeed(prev =>
      prev.map(f => {
        if (f.id !== feedId) return f
        const existing = f.reactions.find(r => r.emoji === emoji)
        let newReactions = [...f.reactions]

        if (existing?.by_me) {
          // 취소
          newReactions = newReactions
            .map(r => r.emoji === emoji ? { ...r, count: r.count - 1, by_me: false } : r)
            .filter(r => r.count > 0)
        } else {
          // 다른 이모지 내 반응 해제
          newReactions = newReactions.map(r =>
            r.by_me ? { ...r, count: r.count - 1, by_me: false } : r
          ).filter(r => r.count > 0)
          // 새 이모지 추가
          const target = newReactions.find(r => r.emoji === emoji)
          if (target) {
            newReactions = newReactions.map(r =>
              r.emoji === emoji ? { ...r, count: r.count + 1, by_me: true } : r
            )
          } else {
            newReactions.push({ emoji, count: 1, by_me: true })
          }
        }
        return { ...f, reactions: newReactions }
      })
    )

    startTransition(async () => {
      const res = await toggleReaction(feedId, emoji)
      if (res.error) toast.error(res.error)
    })
  }

  if (feed.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">반 활동</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm text-gray-400">
            아직 활동이 없습니다. 첫 번째 활동의 주인공이 되어보세요!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">반 활동 타임라인</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {feed.map(item => (
          <div
            key={item.id}
            className="rounded-lg border p-3 text-sm dark:border-gray-800"
          >
            <div className="flex items-start gap-2">
              {/* 아바타 + 액션 아이콘 뱃지 */}
              <div className="relative shrink-0">
                {item.user_avatar ? (
                  <Image
                    src={item.user_avatar}
                    alt={item.user_nickname ?? item.user_name}
                    width={40}
                    height={40}
                    unoptimized
                    className="h-10 w-10 rounded-full border border-gray-200 bg-white dark:border-gray-700"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                    {ACTION_ICONS[item.action_type] ?? <CheckCircle className="h-4 w-4" />}
                  </div>
                )}
                {item.user_avatar && (
                  <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white ring-2 ring-white dark:bg-gray-900 dark:ring-gray-900">
                    {ACTION_ICONS[item.action_type] ?? <CheckCircle className="h-3 w-3" />}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-gray-800 dark:text-gray-200">{getActionText(item)}</p>
                <p className="mt-0.5 text-xs text-gray-400">{formatTime(item.created_at)}</p>

                {/* 리액션 */}
                <div className="mt-2 flex gap-1">
                  {EMOJIS.map(emoji => {
                    const r = item.reactions.find(x => x.emoji === emoji)
                    return (
                      <button
                        key={emoji}
                        onClick={() => handleReact(item.id, emoji)}
                        className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-all ${
                          r?.by_me
                            ? 'border-[#4F6BF6] bg-[#4F6BF6]/10 text-[#4F6BF6]'
                            : 'border-gray-200 hover:border-[#4F6BF6]/50 dark:border-gray-700'
                        }`}
                      >
                        <span>{emoji}</span>
                        {r && <span>{r.count}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
