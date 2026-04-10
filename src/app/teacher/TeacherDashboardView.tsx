'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ClipboardCheck, School as SchoolIcon, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProgressCard } from '@/components/dashboard/ProgressCard'
import { RiskAlert } from '@/components/dashboard/RiskAlert'
import { RiskAlertCard } from '@/components/dashboard/RiskAlertCard'
import { EmotionOverviewCard } from '@/components/dashboard/EmotionOverviewCard'
import { StudentGroupsCard } from '@/components/dashboard/StudentGroupsCard'
import { WeeklyBriefingCard } from '@/components/dashboard/WeeklyBriefingCard'
import { AnnouncementBanner } from '@/components/shared/AnnouncementBanner'
import { ContextSelector, EMPTY_FILTER, type DashboardFilter } from '@/components/dashboard/ContextSelector'
import { NodeUnlockChart } from '@/components/dashboard/NodeUnlockChart'
import type {
  ContextClass,
  ContextSkillTree,
} from '@/actions/dashboard-filters'
import type { TeacherDashboardData } from '@/actions/dashboard'
import type { Announcement } from '@/actions/announcements'

interface SchoolMembership {
  school_id: string
  school_name: string
}

interface Props {
  profileName: string
  dashboardData: TeacherDashboardData | null
  contextClasses: ContextClass[]
  contextSkillTrees: ContextSkillTree[]
  mySchools: SchoolMembership[]
  announcements: Announcement[]
}

export function TeacherDashboardView({
  profileName,
  dashboardData,
  contextClasses,
  contextSkillTrees,
  mySchools,
  announcements,
}: Props) {
  // 초기 선택값: "전체"로 시작 (카드들은 자체 기본값으로 동작)
  const [filter, setFilter] = useState<DashboardFilter>(EMPTY_FILTER)

  // 선택된 스킬트리 결정: 명시적 선택이 없으면 첫 번째 스킬트리 (있을 경우)
  const effectiveSkillTreeId = useMemo(() => {
    if (filter.skillTreeId) return filter.skillTreeId
    // 클래스 필터가 있으면 해당 클래스의 첫 스킬트리
    if (filter.classId) {
      const firstOfClass = contextSkillTrees.find(t => t.class_id === filter.classId)
      return firstOfClass?.id ?? null
    }
    // 아무 필터도 없으면 첫 스킬트리
    return contextSkillTrees[0]?.id ?? null
  }, [filter.classId, filter.skillTreeId, contextSkillTrees])

  // 선택된 클래스의 ID를 카드들에게 override로 내린다.
  // null이면 카드는 자체 기본값(첫 클래스) 사용
  const overrideClassId = filter.classId

  // 카드용 classes 목록 (그 자체 드롭다운은 숨길 것이므로 override만 쓰면 됨)
  const myClasses = useMemo(
    () => contextClasses.map(c => ({ id: c.id, name: c.name })),
    [contextClasses],
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          안녕하세요, {profileName} 선생님 👋
        </h1>
        <p className="mt-1 text-gray-500">스킬트리와 학생 학습 현황을 확인하세요</p>
      </div>

      <AnnouncementBanner announcements={announcements} />

      {/* 컨텍스트 선택기 */}
      <ContextSelector
        variant="teacher"
        filter={filter}
        onFilterChange={setFilter}
        classes={contextClasses}
        skillTrees={contextSkillTrees}
      />

      {/* Phase 10: 주간 브리핑 */}
      <WeeklyBriefingCard
        classes={myClasses}
        selectedClassIdOverride={overrideClassId}
        hideInternalSelector
      />

      {/* 내 스쿨 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <SchoolIcon className="h-4 w-4 text-[#10B981]" />
            내 스쿨 ({mySchools.length})
          </CardTitle>
          <Link href="/teacher/join">
            <Button size="sm" variant="outline">
              <KeyRound className="mr-1 h-3.5 w-3.5" />
              스쿨 가입
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {mySchools.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm text-gray-400">아직 소속된 스쿨이 없습니다</p>
              <p className="mt-1 text-xs text-gray-500">
                운영자에게 받은 교사 초대 코드로 가입해주세요
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {mySchools.map(s => (
                <li
                  key={s.school_id}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm dark:border-gray-800"
                >
                  <div className="flex items-center gap-2">
                    <SchoolIcon className="h-4 w-4 text-[#10B981]" />
                    <span className="font-medium">{s.school_name}</span>
                  </div>
                  <Badge variant="secondary" className="bg-[#10B981]/10 text-[#10B981]">
                    가입됨
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ProgressCard
          label="내 스킬트리"
          value={dashboardData?.skillTreeCount ?? 0}
          icon="TreePine"
          iconColor="#10B981"
          subtitle="생성한 스킬트리"
        />
        <ProgressCard
          label="수강 학생"
          value={dashboardData?.totalStudents ?? 0}
          icon="Users"
          iconColor="#4F6BF6"
          subtitle="고유 학생 수"
        />
        <ProgressCard
          label="평균 잠금해제율"
          value={`${dashboardData?.avgUnlockRate ?? 0}%`}
          icon="Zap"
          iconColor="#7C5CFC"
          progress={dashboardData?.avgUnlockRate ?? 0}
        />
        <ProgressCard
          label="위험군 학생"
          value={dashboardData?.riskStudentCount ?? 0}
          icon="AlertTriangle"
          iconColor="#F59E0B"
          subtitle="주의 필요"
        />
      </div>

      {/* Phase 9: 감정 + 위험 경보 (선택된 클래스 기준) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <EmotionOverviewCard
          classes={myClasses}
          defaultSkillTreeId={effectiveSkillTreeId ?? undefined}
          selectedClassIdOverride={overrideClassId}
          hideInternalSelector
        />
        <RiskAlertCard
          classes={myClasses}
          selectedClassIdOverride={overrideClassId}
          hideInternalSelector
        />
      </div>

      <StudentGroupsCard
        classes={myClasses}
        selectedClassIdOverride={overrideClassId}
        hideInternalSelector
      />

      {/* 노드별 언락율 + 위험 학생 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <NodeUnlockChart
            skillTreeId={effectiveSkillTreeId}
            title="노드별 잠금해제율"
          />
        </div>
        <RiskAlert students={dashboardData?.riskStudents ?? []} />
      </div>

      {/* Recent attempts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-4 w-4 text-[#4F6BF6]" />
            최근 퀴즈 시도
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dashboardData?.recentAttempts.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">아직 시도 기록이 없습니다</p>
          ) : (
            <ul className="space-y-2">
              {dashboardData?.recentAttempts.map((a, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg border p-2 text-sm dark:border-gray-800">
                  <div>
                    <span className="font-medium">{a.student_name}</span>
                    <span className="ml-2 text-gray-500">— {a.node_title}</span>
                  </div>
                  <Badge
                    variant={a.is_correct ? 'default' : 'destructive'}
                    className={a.is_correct ? 'bg-[#10B981]' : ''}
                  >
                    {a.score}점
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
