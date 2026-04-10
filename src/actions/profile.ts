'use server'

import { getCachedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertNotDemo } from '@/lib/demo'
import { dicebearUrl, generateRandomSeeds } from '@/lib/dicebear'
import type { Profile } from '@/types/user'

/**
 * 프로필 시스템 Server Actions.
 *
 * 주요 기능:
 * - checkNicknameAvailable: 중복 체크 (회원가입 + 프로필 편집 시)
 * - getProfile: 현재 유저 프로필 조회
 * - updateProfile: 프로필 정보 업데이트 (닉네임 변경 시 30일 제한)
 * - changeAvatar: 랜덤 시드 3개 → 3개 DiceBear URL 반환 (변경 횟수 체크만, 아직 저장 X)
 * - confirmAvatar: 선택한 시드로 확정 + avatar_change_count 증가
 *
 * 정책:
 * - 닉네임 변경 제한: 마지막 변경 후 30일 경과 필요
 * - 아바타 변경 제한: 계정당 최대 3회 (avatar_change_count)
 * - 데모 계정은 모든 쓰기 차단 (읽기는 허용)
 */

const NICKNAME_CHANGE_COOLDOWN_DAYS = 30
const MAX_AVATAR_CHANGES = 3

// ============================================
// 닉네임 검증
// ============================================

/**
 * 닉네임 형식 검증.
 * - 2~20자
 * - 공백으로만 이루어진 문자열 금지
 * - 금지 문자 (HTML 태그 등) 차단
 */
function validateNicknameFormat(nickname: string): string | null {
  const trimmed = nickname.trim()
  if (trimmed !== nickname) return '닉네임 앞뒤에 공백이 있습니다.'
  if (trimmed.length < 2) return '닉네임은 2자 이상이어야 합니다.'
  if (trimmed.length > 20) return '닉네임은 20자 이하여야 합니다.'
  if (/[<>/"'`\\]/.test(trimmed)) return '닉네임에 사용할 수 없는 문자가 포함되어 있습니다.'
  return null
}

/**
 * 닉네임 중복 가능 여부 체크.
 * 회원가입 시 중복 확인 버튼에서 호출.
 */
export async function checkNicknameAvailable(
  nickname: string,
): Promise<{ data?: { available: boolean; reason?: string }; error?: string }> {
  try {
    const formatError = validateNicknameFormat(nickname)
    if (formatError) {
      return { data: { available: false, reason: formatError } }
    }

    const admin = createAdminClient()
    const { data } = await admin
      .from('profiles')
      .select('id')
      .eq('nickname', nickname.trim())
      .maybeSingle()

    if (data) {
      return { data: { available: false, reason: '이미 사용 중인 닉네임입니다.' } }
    }
    return { data: { available: true } }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

// ============================================
// 프로필 조회
// ============================================

/**
 * 현재 유저의 전체 프로필 조회 (확장 필드 포함).
 */
export async function getProfile(): Promise<{ data?: Profile; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('profiles')
      .select('id, email, name, role, avatar_url, level, xp, streak_days, last_active_at, created_at, learning_style, nickname, nickname_changed_at, avatar_seed, avatar_change_count, grade, bio, interests, subject')
      .eq('id', user.id)
      .maybeSingle()

    if (error || !data) return { error: error?.message ?? '프로필을 찾을 수 없습니다.' }
    return { data: data as Profile }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

// ============================================
// 프로필 업데이트
// ============================================

export interface UpdateProfileInput {
  nickname?: string // 30일 쿨다운
  grade?: string | null
  bio?: string | null
  interests?: string[]
  subject?: string | null // 교사 전용
}

/**
 * 프로필 정보 업데이트.
 * 닉네임은 마지막 변경 후 30일이 경과해야 변경 가능.
 */
export async function updateProfile(
  input: UpdateProfileInput,
): Promise<{ data?: { updated: boolean }; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    // 입력 검증
    if (input.bio && input.bio.length > 500) {
      return { error: '소개글이 너무 깁니다 (최대 500자).' }
    }
    if (input.grade && input.grade.length > 30) {
      return { error: '학년 값이 너무 깁니다.' }
    }
    if (input.subject && input.subject.length > 30) {
      return { error: '과목 값이 너무 깁니다.' }
    }
    if (input.interests && input.interests.length > 20) {
      return { error: '관심사가 너무 많습니다.' }
    }

    const admin = createAdminClient()

    // 현재 프로필 조회
    const { data: current } = await admin
      .from('profiles')
      .select('nickname, nickname_changed_at')
      .eq('id', user.id)
      .single()

    if (!current) return { error: '프로필을 찾을 수 없습니다.' }

    // 업데이트 필드 구성
    const updates: Record<string, unknown> = {}

    // 닉네임 변경 체크
    if (input.nickname !== undefined && input.nickname !== current.nickname) {
      const formatError = validateNicknameFormat(input.nickname)
      if (formatError) return { error: formatError }

      // 30일 쿨다운 체크 (최초 설정이면 null → 허용)
      if (current.nickname_changed_at) {
        const lastChanged = new Date(current.nickname_changed_at).getTime()
        const daysSince = (Date.now() - lastChanged) / (1000 * 60 * 60 * 24)
        if (daysSince < NICKNAME_CHANGE_COOLDOWN_DAYS) {
          const nextDate = new Date(
            lastChanged + NICKNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000,
          )
          return {
            error: `닉네임은 30일에 한 번만 변경할 수 있습니다. 다음 변경 가능일: ${nextDate.toISOString().slice(0, 10)}`,
          }
        }
      }

      // 중복 체크
      const { data: dup } = await admin
        .from('profiles')
        .select('id')
        .eq('nickname', input.nickname.trim())
        .neq('id', user.id)
        .maybeSingle()
      if (dup) return { error: '이미 사용 중인 닉네임입니다.' }

      updates.nickname = input.nickname.trim()
      updates.nickname_changed_at = new Date().toISOString()
    }

    if (input.grade !== undefined) updates.grade = input.grade
    if (input.bio !== undefined) updates.bio = input.bio
    if (input.interests !== undefined) updates.interests = input.interests
    if (input.subject !== undefined) updates.subject = input.subject

    if (Object.keys(updates).length === 0) {
      return { data: { updated: false } }
    }

    const { error } = await admin
      .from('profiles')
      .update(updates)
      .eq('id', user.id)

    if (error) return { error: error.message }
    return { data: { updated: true } }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

// ============================================
// 아바타 변경 플로우
// ============================================

/**
 * 랜덤 시드 3개를 생성하고 DiceBear URL을 반환.
 * 사용자는 3개 중 하나를 선택해서 confirmAvatar로 확정.
 *
 * 변경 횟수 체크만 하고 실제 저장은 하지 않는다.
 */
export async function changeAvatar(): Promise<{
  data?: { candidates: Array<{ seed: string; url: string }>; remaining: number }
  error?: string
}> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('avatar_change_count')
      .eq('id', user.id)
      .single()

    if (!profile) return { error: '프로필을 찾을 수 없습니다.' }

    const current = profile.avatar_change_count ?? 0
    if (current >= MAX_AVATAR_CHANGES) {
      return { error: `아바타 변경 횟수를 모두 사용했습니다 (${MAX_AVATAR_CHANGES}/${MAX_AVATAR_CHANGES})` }
    }

    const seeds = generateRandomSeeds(3)
    const candidates = seeds.map(seed => ({
      seed,
      url: dicebearUrl(seed, 200),
    }))

    return {
      data: {
        candidates,
        remaining: MAX_AVATAR_CHANGES - current,
      },
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * 선택한 시드로 아바타 확정 + change count 증가.
 */
export async function confirmAvatar(
  seed: string,
): Promise<{ data?: { avatarUrl: string; remaining: number }; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    if (!seed || seed.length > 100) return { error: '유효하지 않은 시드값입니다.' }

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('avatar_change_count')
      .eq('id', user.id)
      .single()

    if (!profile) return { error: '프로필을 찾을 수 없습니다.' }

    const current = profile.avatar_change_count ?? 0
    if (current >= MAX_AVATAR_CHANGES) {
      return { error: '아바타 변경 횟수를 모두 사용했습니다.' }
    }

    const avatarUrl = dicebearUrl(seed, 200)

    const { error } = await admin
      .from('profiles')
      .update({
        avatar_url: avatarUrl,
        avatar_seed: seed,
        avatar_change_count: current + 1,
      })
      .eq('id', user.id)

    if (error) return { error: error.message }

    return {
      data: {
        avatarUrl,
        remaining: MAX_AVATAR_CHANGES - (current + 1),
      },
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

// ============================================
// 회원가입 시 프로필 초기화 (signup flow)
// ============================================

/**
 * 회원가입 직후 프로필에 nickname + avatar를 설정.
 * auth trigger가 user_metadata에서 nickname을 이미 읽지만, 추가 보증을 위해
 * signup 페이지에서 session 받은 직후 명시적으로 이 액션을 호출할 수 있다.
 *
 * 이미 nickname이 있으면 no-op.
 */
export async function initializeProfileAfterSignup(
  nickname: string,
): Promise<{ data?: { initialized: boolean }; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const formatError = validateNicknameFormat(nickname)
    if (formatError) return { error: formatError }

    const admin = createAdminClient()
    const { data: existing } = await admin
      .from('profiles')
      .select('nickname, avatar_url')
      .eq('id', user.id)
      .single()

    if (!existing) return { error: '프로필을 찾을 수 없습니다.' }

    // 이미 nickname + avatar_url 둘 다 있으면 no-op
    if (existing.nickname && existing.avatar_url) {
      return { data: { initialized: false } }
    }

    const avatarUrl = dicebearUrl(nickname.trim(), 200)
    const updates: Record<string, unknown> = {}
    if (!existing.nickname) updates.nickname = nickname.trim()
    if (!existing.avatar_url) {
      updates.avatar_url = avatarUrl
      updates.avatar_seed = nickname.trim()
    }

    const { error } = await admin
      .from('profiles')
      .update(updates)
      .eq('id', user.id)

    if (error) {
      // UNIQUE 제약 위반 대비 (이미 다른 사람이 동시에 가입)
      if (error.message.includes('unique') || error.message.includes('duplicate')) {
        return { error: '이미 사용 중인 닉네임입니다. 다른 닉네임을 선택해주세요.' }
      }
      return { error: error.message }
    }

    return { data: { initialized: true } }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * 회원가입 완료 화면에서 사용할 프로필 정보 조회.
 * avatar_url, nickname, role만 반환.
 */
export async function getSignupCompletionInfo(): Promise<{
  data?: { nickname: string; avatarUrl: string; role: string }
  error?: string
}> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('nickname, avatar_url, role')
      .eq('id', user.id)
      .single()

    if (!profile) return { error: '프로필을 찾을 수 없습니다.' }

    return {
      data: {
        nickname: profile.nickname ?? '',
        avatarUrl: profile.avatar_url ?? '',
        role: profile.role ?? 'student',
      },
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}
