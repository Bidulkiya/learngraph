'use client'

import { toast } from 'sonner'
import { Sparkles } from 'lucide-react'
import type { Achievement } from '@/actions/achievements'

/**
 * 업적 달성 토스트 알림.
 *
 * 사용 패턴:
 *   const res = await completeNode(...)
 *   if (res.data?.newAchievements) {
 *     res.data.newAchievements.forEach(notifyAchievement)
 *   }
 *
 * 스타일:
 * - 일반 업적: 골드 테두리 + 아이콘 + "업적 달성!"
 * - 히든 업적: 보라 테두리 + "🔓 히든 업적 해금!" + 반짝임
 *
 * 스택 동작:
 * - 여러 개 동시에 호출 시 대체되지 않고 쌓임 (Toaster visibleToasts=5, expand)
 * - 개별 지속 시간 5초 후 각각 자동 해제
 * - 고유 id로 중복 알림 방지
 */
export function notifyAchievement(achievement: Achievement): void {
  const isHidden = achievement.is_hidden

  toast.custom(
    (id) => (
      <AchievementToastContent
        achievement={achievement}
        onClose={() => toast.dismiss(id)}
      />
    ),
    {
      // 스택 방식 — 모든 업적 토스트는 5초 유지
      duration: 5000,
      position: 'top-right',
      // 고유 ID로 같은 업적 중복 표시 방지
      id: `achievement-${achievement.id}`,
    },
  )
}

function AchievementToastContent({
  achievement,
  onClose,
}: {
  achievement: Achievement
  onClose: () => void
}) {
  const isHidden = achievement.is_hidden
  const ringColor = isHidden ? '#A855F7' : '#F59E0B'
  const bgGradient = isHidden
    ? 'from-[#A855F7]/20 via-[#6366F1]/10 to-[#A855F7]/20'
    : 'from-[#F59E0B]/20 via-[#FBBF24]/10 to-[#F59E0B]/20'

  return (
    <button
      type="button"
      onClick={onClose}
      className={`relative w-80 overflow-hidden rounded-xl border-2 bg-gradient-to-br ${bgGradient} p-4 text-left shadow-2xl backdrop-blur transition-all hover:scale-[1.02] dark:bg-gray-900`}
      style={{
        borderColor: ringColor,
        boxShadow: `0 20px 50px ${ringColor}40, 0 0 0 1px ${ringColor}`,
      }}
    >
      {/* 반짝임 이펙트 (히든 업적) */}
      {isHidden && (
        <>
          <span className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 animate-pulse rounded-full bg-gradient-to-br from-[#A855F7]/40 to-transparent blur-2xl" />
          <span className="pointer-events-none absolute -bottom-4 -left-4 h-16 w-16 animate-pulse rounded-full bg-gradient-to-tr from-[#6366F1]/40 to-transparent blur-2xl" />
        </>
      )}

      <div className="relative flex items-start gap-3">
        {/* 아이콘 */}
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-3xl shadow-lg"
          style={{
            backgroundColor: `${ringColor}20`,
            boxShadow: `0 8px 20px ${ringColor}30`,
          }}
        >
          {achievement.icon}
        </div>

        {/* 내용 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: ringColor }} />
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: ringColor }}
            >
              {isHidden ? '🔓 히든 업적 해금!' : '업적 달성!'}
            </span>
          </div>
          <h4 className="mt-0.5 truncate text-base font-bold text-gray-900 dark:text-white">
            {achievement.title}
          </h4>
          <p className="mt-0.5 line-clamp-2 text-xs text-gray-600 dark:text-gray-300">
            {achievement.description}
          </p>
          <div className="mt-1.5 flex items-center gap-1">
            <span className="text-xs font-bold text-[#10B981]">
              +{achievement.xp_reward} XP
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}
