'use client'

import { useMemo } from 'react'
import { School, GraduationCap, TreePine } from 'lucide-react'
import type {
  ContextClass,
  ContextTeacher,
  ContextSkillTree,
} from '@/actions/dashboard-filters'

/**
 * 대시보드 컨텍스트 선택기 — 교사/운영자 공용.
 *
 * 모드:
 * - variant="teacher": 2단계 (클래스 → 스킬트리)
 * - variant="admin": 3단계 (클래스 → 교사 → 스킬트리)
 *
 * 동작:
 * - 상위 선택이 변경되면 하위 드롭다운 옵션이 자동 필터링된다
 * - "전체" 옵션은 `all` 값으로 표현하며, 이 값이면 전체 스코프로 집계
 * - onFilterChange는 상위 state에 반영되고, 이 컴포넌트는 stateless
 *
 * 설계 이유: 페이지가 다른 URL param/state 방식으로 관리할 수 있도록
 * controlled 컴포넌트로 구현.
 */

export interface DashboardFilter {
  classId: string | null // null = 전체
  teacherId: string | null // null = 전체 (admin만 사용)
  skillTreeId: string | null // null = 전체
}

export const EMPTY_FILTER: DashboardFilter = {
  classId: null,
  teacherId: null,
  skillTreeId: null,
}

interface BaseProps {
  filter: DashboardFilter
  onFilterChange: (next: DashboardFilter) => void
  classes: ContextClass[]
  skillTrees: ContextSkillTree[]
  loading?: boolean
}

interface TeacherProps extends BaseProps {
  variant: 'teacher'
}

interface AdminProps extends BaseProps {
  variant: 'admin'
  teachers: ContextTeacher[]
}

type Props = TeacherProps | AdminProps

export function ContextSelector(props: Props) {
  const { filter, onFilterChange, classes, skillTrees, loading } = props
  const isAdmin = props.variant === 'admin'
  const teachers: ContextTeacher[] = isAdmin ? props.teachers : []

  // 클래스에 따른 교사 필터링 (admin)
  const filteredTeachers = useMemo(() => {
    if (!isAdmin) return teachers
    if (!filter.classId) return teachers
    const cls = classes.find(c => c.id === filter.classId)
    if (!cls?.teacher_id) return teachers
    return teachers.filter(t => t.id === cls.teacher_id)
  }, [isAdmin, teachers, filter.classId, classes])

  // 클래스 + 교사에 따른 스킬트리 필터링
  const filteredSkillTrees = useMemo(() => {
    let out = skillTrees
    if (filter.classId) {
      out = out.filter(t => t.class_id === filter.classId)
    }
    if (isAdmin && filter.teacherId) {
      out = out.filter(t => t.created_by === filter.teacherId)
    }
    return out
  }, [skillTrees, filter.classId, filter.teacherId, isAdmin])

  // 핸들러 — 상위 선택이 바뀌면 하위 선택을 자동으로 "전체"로 초기화
  const handleClassChange = (value: string): void => {
    const next: DashboardFilter = {
      classId: value === 'all' ? null : value,
      teacherId: null,
      skillTreeId: null,
    }
    onFilterChange(next)
  }

  const handleTeacherChange = (value: string): void => {
    onFilterChange({
      ...filter,
      teacherId: value === 'all' ? null : value,
      skillTreeId: null,
    })
  }

  const handleTreeChange = (value: string): void => {
    onFilterChange({
      ...filter,
      skillTreeId: value === 'all' ? null : value,
    })
  }

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
        <span>📊 컨텍스트 선택</span>
        {loading && <span className="text-[10px] font-normal text-gray-400">로딩 중...</span>}
      </div>
      <div className={`grid gap-3 ${isAdmin ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {/* 클래스 */}
        <div className="space-y-1">
          <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
            <School className="h-3 w-3 text-[#4F6BF6]" />
            클래스
          </label>
          <select
            value={filter.classId ?? 'all'}
            onChange={(e) => handleClassChange(e.target.value)}
            disabled={loading}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          >
            <option value="all">전체 클래스</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}{c.school_name ? ` · ${c.school_name}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* 교사 (admin only) */}
        {isAdmin && (
          <div className="space-y-1">
            <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
              <GraduationCap className="h-3 w-3 text-[#10B981]" />
              교사
            </label>
            <select
              value={filter.teacherId ?? 'all'}
              onChange={(e) => handleTeacherChange(e.target.value)}
              disabled={loading || filteredTeachers.length === 0}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            >
              <option value="all">전체 교사</option>
              {filteredTeachers.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nickname ?? t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 스킬트리 */}
        <div className="space-y-1">
          <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
            <TreePine className="h-3 w-3 text-[#7C5CFC]" />
            스킬트리
          </label>
          <select
            value={filter.skillTreeId ?? 'all'}
            onChange={(e) => handleTreeChange(e.target.value)}
            disabled={loading || filteredSkillTrees.length === 0}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          >
            <option value="all">전체 스킬트리</option>
            {filteredSkillTrees.map(t => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 선택 상태 요약 뱃지 */}
      {(filter.classId || filter.teacherId || filter.skillTreeId) && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {filter.classId && (
            <FilterChip
              label={classes.find(c => c.id === filter.classId)?.name ?? '클래스'}
              color="#4F6BF6"
              onClear={() => handleClassChange('all')}
            />
          )}
          {isAdmin && filter.teacherId && (
            <FilterChip
              label={
                filteredTeachers.find(t => t.id === filter.teacherId)?.nickname
                ?? filteredTeachers.find(t => t.id === filter.teacherId)?.name
                ?? '교사'
              }
              color="#10B981"
              onClear={() => handleTeacherChange('all')}
            />
          )}
          {filter.skillTreeId && (
            <FilterChip
              label={skillTrees.find(t => t.id === filter.skillTreeId)?.title ?? '스킬트리'}
              color="#7C5CFC"
              onClear={() => handleTreeChange('all')}
            />
          )}
        </div>
      )}
    </div>
  )
}

function FilterChip({
  label,
  color,
  onClear,
}: {
  label: string
  color: string
  onClear: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors hover:bg-opacity-20"
      style={{ color, borderColor: `${color}66`, backgroundColor: `${color}0d` }}
    >
      {label}
      <span className="text-[10px] opacity-60">×</span>
    </button>
  )
}
