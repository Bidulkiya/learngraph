'use server'

import { getCachedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * 랭킹 항목 공용 타입.
 */
export interface RankingEntry {
  rank: number
  student_id: string
  name: string
  nickname: string | null
  avatar_url: string | null
  value: number        // 주 메트릭 (진도 %, 스트릭 일수, XP)
  detail?: string      // "4/14" 같은 부가 표시
  level?: number       // XP 랭킹에서만
}

export interface RankingResult {
  entries: RankingEntry[]
  myRank: number | null      // 내 순위 (랭킹 바깥일 수 있음)
  myEntry: RankingEntry | null
  totalCount: number
  scopeLabel: string         // "스쿨 전체" / "내 클래스" / "인공지능의 이해"
}

/**
 * 같은 스킬트리를 학습하는 학생들의 진도 랭킹.
 * 진도 = 완료 노드 수 / 전체 노드 수 (퍼센트).
 */
export async function getProgressRanking(
  skillTreeId: string
): Promise<{ data?: RankingResult; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    // 1. 스킬트리 정보 + 전체 노드 수
    const { data: tree } = await admin
      .from('skill_trees')
      .select('id, title, class_id')
      .eq('id', skillTreeId)
      .maybeSingle()
    if (!tree) return { error: '스킬트리를 찾을 수 없습니다.' }

    const { count: totalNodesCount } = await admin
      .from('nodes')
      .select('*', { count: 'exact', head: true })
      .eq('skill_tree_id', skillTreeId)
    const totalNodes = totalNodesCount ?? 0
    if (totalNodes === 0) {
      return {
        data: {
          entries: [],
          myRank: null,
          myEntry: null,
          totalCount: 0,
          scopeLabel: tree.title,
        },
      }
    }

    // 2. 이 스킬트리의 student_progress 전부 조회
    const { data: progressRows } = await admin
      .from('student_progress')
      .select('student_id, status')
      .eq('skill_tree_id', skillTreeId)

    // 3. 학생별 완료 노드 수 집계
    const completedByStudent = new Map<string, number>()
    for (const row of progressRows ?? []) {
      const prev = completedByStudent.get(row.student_id) ?? 0
      completedByStudent.set(row.student_id, prev + (row.status === 'completed' ? 1 : 0))
    }
    const studentIds = [...completedByStudent.keys()]
    if (studentIds.length === 0) {
      return {
        data: {
          entries: [],
          myRank: null,
          myEntry: null,
          totalCount: 0,
          scopeLabel: tree.title,
        },
      }
    }

    // 4. 학생 프로필 조회
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, name, nickname, avatar_url')
      .in('id', studentIds)

    // 5. 진도율 계산 + 정렬
    const unranked: Array<Omit<RankingEntry, 'rank'>> = (profiles ?? [])
      .map(p => {
        const completed = completedByStudent.get(p.id) ?? 0
        const percent = Math.round((completed / totalNodes) * 100)
        return {
          student_id: p.id,
          name: p.name,
          nickname: p.nickname ?? null,
          avatar_url: p.avatar_url,
          value: percent,
          detail: `${completed}/${totalNodes}`,
        }
      })
      .sort((a, b) => b.value - a.value)

    const entries: RankingEntry[] = unranked.map((e, i) => ({ ...e, rank: i + 1 }))
    const myEntry = entries.find(e => e.student_id === user.id) ?? null

    return {
      data: {
        entries,
        myRank: myEntry?.rank ?? null,
        myEntry,
        totalCount: entries.length,
        scopeLabel: tree.title,
      },
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * 학습 스트릭 랭킹 — 스쿨 전체 또는 특정 클래스 범위.
 */
export async function getStreakRanking(
  scope: 'school' | 'class',
  scopeId: string
): Promise<{ data?: RankingResult; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    const { studentIds, scopeLabel } = await resolveStudentIds(admin, scope, scopeId)
    if (studentIds.length === 0) {
      return {
        data: { entries: [], myRank: null, myEntry: null, totalCount: 0, scopeLabel },
      }
    }

    const { data: profiles } = await admin
      .from('profiles')
      .select('id, name, nickname, avatar_url, streak_days')
      .in('id', studentIds)
      .eq('role', 'student')

    const unranked: Array<Omit<RankingEntry, 'rank'>> = (profiles ?? [])
      .map(p => ({
        student_id: p.id,
        name: p.name,
        nickname: p.nickname ?? null,
        avatar_url: p.avatar_url,
        value: p.streak_days ?? 0,
        detail: `${p.streak_days ?? 0}일`,
      }))
      .sort((a, b) => b.value - a.value)

    const entries: RankingEntry[] = unranked.map((e, i) => ({ ...e, rank: i + 1 }))
    const myEntry = entries.find(e => e.student_id === user.id) ?? null

    return {
      data: {
        entries,
        myRank: myEntry?.rank ?? null,
        myEntry,
        totalCount: entries.length,
        scopeLabel,
      },
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * XP 랭킹 — 스쿨 전체 또는 특정 클래스 범위.
 * 레벨 = floor(xp / 100) + 1
 */
export async function getXpRanking(
  scope: 'school' | 'class',
  scopeId: string
): Promise<{ data?: RankingResult; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    const { studentIds, scopeLabel } = await resolveStudentIds(admin, scope, scopeId)
    if (studentIds.length === 0) {
      return {
        data: { entries: [], myRank: null, myEntry: null, totalCount: 0, scopeLabel },
      }
    }

    const { data: profiles } = await admin
      .from('profiles')
      .select('id, name, nickname, avatar_url, xp')
      .in('id', studentIds)
      .eq('role', 'student')

    const unranked: Array<Omit<RankingEntry, 'rank'>> = (profiles ?? [])
      .map(p => {
        const xp = p.xp ?? 0
        const level = Math.floor(xp / 100) + 1
        return {
          student_id: p.id,
          name: p.name,
          nickname: p.nickname ?? null,
          avatar_url: p.avatar_url,
          value: xp,
          detail: `${xp.toLocaleString()} XP`,
          level,
        }
      })
      .sort((a, b) => b.value - a.value)

    const entries: RankingEntry[] = unranked.map((e, i) => ({ ...e, rank: i + 1 }))
    const myEntry = entries.find(e => e.student_id === user.id) ?? null

    return {
      data: {
        entries,
        myRank: myEntry?.rank ?? null,
        myEntry,
        totalCount: entries.length,
        scopeLabel,
      },
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * 학생이 속한 스쿨/클래스 정보를 반환.
 * 랭킹 다이얼로그에서 탭을 채우기 위함.
 */
export async function getMyRankingScopes(): Promise<{
  data?: {
    schools: Array<{ id: string; name: string }>
    classes: Array<{ id: string; name: string; school_id: string | null }>
    skillTrees: Array<{ id: string; title: string }>
  }
  error?: string
}> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    // approved school memberships
    const { data: memberships } = await admin
      .from('school_members')
      .select('school_id')
      .eq('user_id', user.id)
      .eq('status', 'approved')
    const schoolIds = memberships?.map(m => m.school_id) ?? []

    // approved class enrollments
    const { data: enrollments } = await admin
      .from('class_enrollments')
      .select('class_id')
      .eq('student_id', user.id)
      .eq('status', 'approved')
    const classIds = enrollments?.map(e => e.class_id) ?? []

    const [schoolsRes, classesRes, treesRes] = await Promise.all([
      schoolIds.length > 0
        ? admin.from('schools').select('id, name').in('id', schoolIds)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
      classIds.length > 0
        ? admin.from('classes').select('id, name, school_id').in('id', classIds)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string; school_id: string | null }> }),
      classIds.length > 0
        ? admin
            .from('skill_trees')
            .select('id, title')
            .in('class_id', classIds)
            .eq('status', 'published')
        : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
    ])

    return {
      data: {
        schools: schoolsRes.data ?? [],
        classes: classesRes.data ?? [],
        skillTrees: treesRes.data ?? [],
      },
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

// ============================================
// 내부 헬퍼
// ============================================

/**
 * scope(school/class) → 학생 ID 목록 + 라벨 해석.
 */
async function resolveStudentIds(
  admin: ReturnType<typeof createAdminClient>,
  scope: 'school' | 'class',
  scopeId: string,
): Promise<{ studentIds: string[]; scopeLabel: string }> {
  if (scope === 'class') {
    const { data: cls } = await admin
      .from('classes')
      .select('id, name')
      .eq('id', scopeId)
      .maybeSingle()
    const { data: enrollments } = await admin
      .from('class_enrollments')
      .select('student_id')
      .eq('class_id', scopeId)
      .eq('status', 'approved')
    return {
      studentIds: enrollments?.map(e => e.student_id) ?? [],
      scopeLabel: cls?.name ?? '내 클래스',
    }
  }

  // school
  const { data: school } = await admin
    .from('schools')
    .select('id, name')
    .eq('id', scopeId)
    .maybeSingle()
  const { data: members } = await admin
    .from('school_members')
    .select('user_id')
    .eq('school_id', scopeId)
    .eq('role', 'student')
    .eq('status', 'approved')
  return {
    studentIds: members?.map(m => m.user_id) ?? [],
    scopeLabel: school?.name ?? '스쿨 전체',
  }
}
