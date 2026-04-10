'use client'

import { useState, useEffect } from 'react'
import { School, Users, GraduationCap, TreePine } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AnnouncementBanner } from '@/components/shared/AnnouncementBanner'
import { ContextSelector, EMPTY_FILTER, type DashboardFilter } from '@/components/dashboard/ContextSelector'
import { NodeUnlockChart } from '@/components/dashboard/NodeUnlockChart'
import { ClassProgressChart } from '@/components/dashboard/ClassProgressChart'
import { AdminRiskBucketCard } from '@/components/dashboard/AdminRiskBucketCard'
import { AdminEmotionBucketCard } from '@/components/dashboard/AdminEmotionBucketCard'
import { AdminTeacherActivityCard } from '@/components/dashboard/AdminTeacherActivityCard'
import {
  getAdminFilteredDashboard,
  type AdminFilteredDashboardData,
  type ContextClass,
  type ContextTeacher,
  type ContextSkillTree,
} from '@/actions/dashboard-filters'
import type { Announcement } from '@/actions/announcements'
import { toast } from 'sonner'

interface Props {
  profileName: string
  contextClasses: ContextClass[]
  contextTeachers: ContextTeacher[]
  contextSkillTrees: ContextSkillTree[]
  initialData: AdminFilteredDashboardData
  announcements: Announcement[]
}

export function AdminDashboardView({
  profileName,
  contextClasses,
  contextTeachers,
  contextSkillTrees,
  initialData,
  announcements,
}: Props) {
  const [filter, setFilter] = useState<DashboardFilter>(EMPTY_FILTER)
  const [data, setData] = useState<AdminFilteredDashboardData>(initialData)
  const [loading, setLoading] = useState(false)

  // 필터 변경 시 데이터 재로드
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // 초기 상태와 같으면 skip (초기 props의 initialData 사용)
    if (!filter.classId && !filter.teacherId && !filter.skillTreeId) {
      return
    }
    let cancelled = false
    setLoading(true)
    getAdminFilteredDashboard({
      classId: filter.classId ?? undefined,
      teacherId: filter.teacherId ?? undefined,
      skillTreeId: filter.skillTreeId ?? undefined,
    }).then(res => {
      if (cancelled) return
      setLoading(false)
      if (res.error) {
        toast.error(res.error)
        return
      }
      if (res.data) setData(res.data)
    })
    return () => { cancelled = true }
  }, [filter.classId, filter.teacherId, filter.skillTreeId])
  /* eslint-enable react-hooks/set-state-in-effect */

  const isAllScope = !filter.classId && !filter.teacherId && !filter.skillTreeId

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          안녕하세요, {profileName} 관리자님 👋
        </h1>
        <p className="mt-1 text-gray-500">플랫폼 전체 현황을 모니터링하세요</p>
      </div>

      <AnnouncementBanner announcements={announcements} />

      {/* 컨텍스트 선택기 — 3단계 */}
      <ContextSelector
        variant="admin"
        filter={filter}
        onFilterChange={setFilter}
        classes={contextClasses}
        teachers={contextTeachers}
        skillTrees={contextSkillTrees}
        loading={loading}
      />

      {/* 전체 현황 요약 카드 (항상 표시) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">📊 스쿨 전체 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3 lg:grid-cols-5">
            <OverviewStat
              icon={<School className="h-4 w-4" />}
              label="스쿨"
              value={data.overview.totalSchools}
              color="#4F6BF6"
            />
            <OverviewStat
              icon={<Users className="h-4 w-4" />}
              label="클래스"
              value={data.overview.totalClasses}
              color="#7C5CFC"
            />
            <OverviewStat
              icon={<GraduationCap className="h-4 w-4" />}
              label="교사"
              value={data.overview.totalTeachers}
              color="#10B981"
            />
            <OverviewStat
              icon={<Users className="h-4 w-4" />}
              label="학생"
              value={data.overview.totalStudents}
              color="#F59E0B"
            />
            <OverviewStat
              icon={<TreePine className="h-4 w-4" />}
              label="스킬트리"
              value={data.overview.totalSkillTrees}
              color="#EC4899"
            />
          </div>
        </CardContent>
      </Card>

      {/* 클래스별 진도 비교 — 전체 스코프일 때만 의미 있음 */}
      {isAllScope && data.classProgress.length > 0 && (
        <ClassProgressChart entries={data.classProgress} />
      )}

      {/* 노드별 언락율 — 스킬트리 선택 시 */}
      {filter.skillTreeId && (
        <NodeUnlockChart
          skillTreeId={filter.skillTreeId}
          title="노드별 잠금해제율"
        />
      )}

      {/* 위험 / 감정 분포 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AdminRiskBucketCard buckets={data.riskBuckets} />
        <AdminEmotionBucketCard buckets={data.emotionBuckets} />
      </div>

      {/* 교사 활동 현황 */}
      <AdminTeacherActivityCard activities={data.teacherActivity} />
    </div>
  )
}

function OverviewStat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
}) {
  return (
    <div className="rounded-lg border p-2.5 dark:border-gray-800 sm:p-3">
      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 sm:text-xs">
        <span style={{ color }}>{icon}</span>
        {label}
      </div>
      <p className="mt-1 text-xl font-bold sm:text-2xl" style={{ color }}>
        {value.toLocaleString()}
      </p>
    </div>
  )
}
