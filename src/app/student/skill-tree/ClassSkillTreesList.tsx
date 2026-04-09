'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronDown,
  ChevronRight,
  TreePine,
  GraduationCap,
  BookOpen,
  School as SchoolIcon,
  Trophy,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ClassWithSkillTrees } from '@/actions/school'

interface Props {
  classes: ClassWithSkillTrees[]
}

/**
 * 과목 힌트 → 한국어 라벨 + 강조 색.
 * 스킬트리 카드의 subject 뱃지에 쓰인다.
 */
const SUBJECT_INFO: Record<string, { label: string; color: string }> = {
  science: { label: '과학', color: '#10B981' },
  math: { label: '수학', color: '#4F6BF6' },
  korean: { label: '국어', color: '#F59E0B' },
  english: { label: '영어', color: '#EC4899' },
  social: { label: '사회', color: '#7C5CFC' },
  history: { label: '역사', color: '#B45309' },
  art: { label: '예체능', color: '#DB2777' },
}

/**
 * 클래스 → 스킬트리 2단계 아코디언.
 *
 * - 클래스가 1개뿐이면 자동으로 펼친 상태로 시작 (불필요한 클릭 제거)
 * - 클래스가 여러 개면 첫 번째만 펼친 상태로 시작 (빠른 최초 조회)
 * - 헤더 클릭으로 토글
 */
export function ClassSkillTreesList({ classes }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    if (classes.length === 0) return new Set()
    // 1개든 여러 개든 첫 클래스는 기본 펼침
    return new Set([classes[0].id])
  })

  const toggle = (classId: string): void => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(classId)) next.delete(classId)
      else next.add(classId)
      return next
    })
  }

  return (
    <div className="space-y-3">
      {classes.map(cls => {
        const isExpanded = expanded.has(cls.id)
        const totalTrees = cls.skill_trees.length
        const totalNodes = cls.skill_trees.reduce((sum, t) => sum + t.total_nodes, 0)
        const completedNodes = cls.skill_trees.reduce((sum, t) => sum + t.completed_nodes, 0)
        const overallPercent = totalNodes > 0
          ? Math.round((completedNodes / totalNodes) * 100)
          : 0

        return (
          <Card key={cls.id} className="overflow-hidden py-0 gap-0">
            {/* 클래스 헤더 — 클릭 시 토글 */}
            <button
              type="button"
              onClick={() => toggle(cls.id)}
              className="flex w-full items-center justify-between gap-3 p-5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
              aria-expanded={isExpanded}
            >
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#4F6BF6] to-[#7C5CFC] text-white shadow-md shadow-[#4F6BF6]/20">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-bold text-gray-900 dark:text-white">
                    {cls.name}
                  </h2>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
                    {cls.teacher_name && (
                      <span className="flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" />
                        {cls.teacher_name}
                      </span>
                    )}
                    {cls.school_name && (
                      <>
                        <span className="text-gray-300 dark:text-gray-700">·</span>
                        <span className="flex items-center gap-1">
                          <SchoolIcon className="h-3 w-3" />
                          {cls.school_name}
                        </span>
                      </>
                    )}
                    <span className="text-gray-300 dark:text-gray-700">·</span>
                    <span className="flex items-center gap-1">
                      <TreePine className="h-3 w-3" />
                      스킬트리 {totalTrees}개
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                {/* 진도 요약 */}
                {totalNodes > 0 && (
                  <div className="hidden text-right sm:block">
                    <div className="flex items-center justify-end gap-1 text-xs text-gray-500">
                      <Trophy className="h-3 w-3 text-[#F59E0B]" />
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {completedNodes}/{totalNodes}
                      </span>
                      <span className="text-[#4F6BF6]">({overallPercent}%)</span>
                    </div>
                    <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#4F6BF6] to-[#7C5CFC] transition-all"
                        style={{ width: `${overallPercent}%` }}
                      />
                    </div>
                  </div>
                )}
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </button>

            {/* 아코디언 내용 — 스킬트리 카드 그리드 */}
            {isExpanded && (
              <div className="border-t border-gray-100 bg-gray-50/60 p-4 dark:border-gray-900 dark:bg-gray-950/40">
                {totalTrees === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-400">
                    이 클래스에는 아직 스킬트리가 없습니다.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {cls.skill_trees.map(tree => {
                      const subject = tree.subject_hint
                        ? SUBJECT_INFO[tree.subject_hint]
                        : null
                      return (
                        <Link
                          key={tree.id}
                          href={`/student/skill-tree/${tree.id}`}
                          className="group block"
                        >
                          <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-[#4F6BF6]/40 hover:shadow-md">
                            <CardContent className="p-4">
                              <div className="mb-2 flex items-start justify-between gap-2">
                                <h3 className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
                                  <TreePine className="h-3.5 w-3.5 shrink-0 text-[#4F6BF6]" />
                                  <span className="truncate">{tree.title}</span>
                                </h3>
                                {subject && (
                                  <Badge
                                    variant="outline"
                                    className="shrink-0 border-current text-[10px]"
                                    style={{ color: subject.color }}
                                  >
                                    {subject.label}
                                  </Badge>
                                )}
                              </div>
                              {tree.description && (
                                <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-gray-500">
                                  {tree.description}
                                </p>
                              )}
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>
                                  {tree.completed_nodes}/{tree.total_nodes} 노드
                                </span>
                                <span className="font-semibold text-[#4F6BF6]">
                                  {tree.progress_percent}%
                                </span>
                              </div>
                              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-[#4F6BF6] to-[#7C5CFC] transition-all"
                                  style={{ width: `${tree.progress_percent}%` }}
                                />
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
