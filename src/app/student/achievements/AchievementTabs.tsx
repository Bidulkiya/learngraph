'use client'

import { useState } from 'react'
import { Lock, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { UserAchievement, AchievementCategory } from '@/actions/achievements'

const CATEGORY_LABELS: Record<AchievementCategory | 'all', { label: string; color: string; emoji: string }> = {
  all: { label: '전체', color: '#7C5CFC', emoji: '🏅' },
  learning: { label: '학습', color: '#10B981', emoji: '🌱' },
  streak: { label: '스트릭', color: '#F59E0B', emoji: '🔥' },
  ranking: { label: '랭킹', color: '#EAB308', emoji: '👑' },
  social: { label: '소셜', color: '#EC4899', emoji: '💬' },
  hidden: { label: '히든', color: '#A855F7', emoji: '🔒' },
}

interface Props {
  achievements: UserAchievement[]
}

export function AchievementTabs({ achievements }: Props) {
  const [tab, setTab] = useState<AchievementCategory | 'all'>('all')

  const filtered = tab === 'all'
    ? achievements
    : achievements.filter(a => a.category === tab)

  // 카테고리별 획득 집계
  const getCount = (cat: AchievementCategory | 'all'): string => {
    const list = cat === 'all'
      ? achievements
      : achievements.filter(a => a.category === cat)
    const earned = list.filter(a => a.earned).length
    return `${earned}/${list.length}`
  }

  const categories: Array<AchievementCategory | 'all'> = [
    'all', 'learning', 'streak', 'ranking', 'social', 'hidden',
  ]

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as AchievementCategory | 'all')}>
      <TabsList className="w-full">
        {categories.map(cat => {
          const info = CATEGORY_LABELS[cat]
          return (
            <TabsTrigger key={cat} value={cat} className="flex-1 text-xs">
              <span className="mr-1">{info.emoji}</span>
              {info.label}
              <span className="ml-1 text-[10px] text-gray-400">{getCount(cat)}</span>
            </TabsTrigger>
          )
        })}
      </TabsList>

      {categories.map(cat => (
        <TabsContent key={cat} value={cat} className="mt-4">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">
              이 카테고리의 업적이 없습니다.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(a => (
                <AchievementCard key={a.id} achievement={a} />
              ))}
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  )
}

function AchievementCard({ achievement }: { achievement: UserAchievement }) {
  const { earned, is_hidden, category } = achievement

  // 히든 미획득 → ??? + 자물쇠
  if (!earned && is_hidden) {
    return (
      <Card className="border-dashed bg-gray-50/70 dark:border-gray-800 dark:bg-gray-900/40">
        <CardContent className="flex items-start gap-3 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-200 text-2xl dark:bg-gray-800">
            <Lock className="h-5 w-5 text-gray-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="border-dashed text-[10px] text-gray-400">
                히든
              </Badge>
            </div>
            <h4 className="mt-1 text-sm font-bold text-gray-400">???</h4>
            <p className="mt-0.5 text-xs text-gray-400">숨겨진 업적</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const categoryColor = CATEGORY_LABELS[category ?? 'learning'].color

  if (!earned) {
    // 일반 미획득 — 흐릿한 아이콘 + 조건 설명
    return (
      <Card className="opacity-60 transition-opacity hover:opacity-90">
        <CardContent className="flex items-start gap-3 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-2xl grayscale dark:bg-gray-800">
            {achievement.icon}
          </div>
          <div className="min-w-0 flex-1">
            <Badge
              variant="outline"
              className="text-[10px]"
              style={{ borderColor: `${categoryColor}40`, color: categoryColor }}
            >
              {CATEGORY_LABELS[category ?? 'learning'].label}
            </Badge>
            <h4 className="mt-1 truncate text-sm font-bold text-gray-700 dark:text-gray-300">
              {achievement.title}
            </h4>
            <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
              {achievement.description}
            </p>
            <p className="mt-1 text-[10px] text-gray-400">+{achievement.xp_reward} XP</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 획득한 업적 — 컬러 + 획득일
  const earnedDate = achievement.earned_at
    ? new Date(achievement.earned_at).toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'short', day: 'numeric',
      })
    : null

  return (
    <Card
      className="border-2 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
      style={{
        borderColor: `${categoryColor}40`,
        background: `linear-gradient(135deg, ${categoryColor}08, transparent)`,
      }}
    >
      <CardContent className="flex items-start gap-3 p-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl shadow-md"
          style={{
            backgroundColor: `${categoryColor}15`,
            boxShadow: `0 6px 16px ${categoryColor}30`,
          }}
        >
          {achievement.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {is_hidden && (
              <Badge
                className="text-[9px] font-bold"
                style={{ backgroundColor: '#A855F7', color: 'white' }}
              >
                🔓 히든
              </Badge>
            )}
            <Badge
              variant="outline"
              className="text-[10px]"
              style={{ borderColor: `${categoryColor}60`, color: categoryColor }}
            >
              {CATEGORY_LABELS[category ?? 'learning'].label}
            </Badge>
          </div>
          <h4 className="mt-1 truncate text-sm font-bold text-gray-900 dark:text-white">
            {achievement.title}
          </h4>
          <p className="mt-0.5 line-clamp-2 text-xs text-gray-600 dark:text-gray-300">
            {achievement.description}
          </p>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#10B981]">
              +{achievement.xp_reward} XP
            </span>
            {earnedDate && (
              <span className="flex items-center gap-1 text-[10px] text-gray-400">
                <CheckCircle2 className="h-3 w-3" />
                {earnedDate}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
