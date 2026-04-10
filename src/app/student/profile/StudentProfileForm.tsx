'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Loader2,
  Save,
  Sparkles,
  User,
  Award,
  Flame,
  Star,
  Zap,
  Check,
  X,
  RefreshCcw,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  updateProfile,
  changeAvatar,
  confirmAvatar,
  checkNicknameAvailable,
} from '@/actions/profile'
import type { Profile } from '@/types/user'
import { AccountSettings } from '@/components/shared/AccountSettings'
import { toast } from 'sonner'

interface Props {
  initial: Profile
  isDemo?: boolean
}

const GRADES = [
  '초1', '초2', '초3', '초4', '초5', '초6',
  '중1', '중2', '중3',
  '고1', '고2', '고3',
  '대학', '기타',
]

const INTEREST_TAGS = ['과학', '수학', '국어', '영어', '사회', '역사', '예술', '기타']

type NicknameCheckStatus = 'idle' | 'checking' | 'available' | 'unavailable'

export function StudentProfileForm({ initial, isDemo = false }: Props) {
  // 기본 정보 상태
  const [grade, setGrade] = useState<string>(initial.grade ?? '')
  const [bio, setBio] = useState<string>(initial.bio ?? '')
  const [interests, setInterests] = useState<string[]>(initial.interests ?? [])
  const [saving, setSaving] = useState(false)

  // 닉네임 변경
  const [nickname, setNickname] = useState<string>(initial.nickname ?? '')
  const [editingNickname, setEditingNickname] = useState(false)
  const [newNickname, setNewNickname] = useState('')
  const [nicknameStatus, setNicknameStatus] = useState<NicknameCheckStatus>('idle')
  const [nicknameMessage, setNicknameMessage] = useState('')
  const [nicknameChangedAt, setNicknameChangedAt] = useState<string | null>(
    initial.nickname_changed_at ?? null,
  )

  // 아바타 변경
  const [avatarUrl, setAvatarUrl] = useState<string>(initial.avatar_url ?? '')
  const [avatarChangeCount, setAvatarChangeCount] = useState<number>(
    initial.avatar_change_count ?? 0,
  )
  const [avatarCandidates, setAvatarCandidates] = useState<Array<{ seed: string; url: string }>>([])
  const [selectedSeed, setSelectedSeed] = useState<string | null>(null)
  const [avatarLoading, setAvatarLoading] = useState(false)

  const MAX_AVATAR_CHANGES = 3
  const avatarRemaining = MAX_AVATAR_CHANGES - avatarChangeCount
  const canChangeAvatar = avatarRemaining > 0

  // 닉네임 변경 가능일 계산 (30일 쿨다운)
  const nicknameNextChangeDate = (() => {
    if (!nicknameChangedAt) return null
    const changed = new Date(nicknameChangedAt).getTime()
    const next = changed + 30 * 24 * 60 * 60 * 1000
    return next
  })()
  const canChangeNickname = !nicknameNextChangeDate || Date.now() >= nicknameNextChangeDate
  const nextDateStr = nicknameNextChangeDate
    ? new Date(nicknameNextChangeDate).toISOString().slice(0, 10)
    : null

  // ============================================
  // 기본 정보 저장
  // ============================================
  const handleSaveInfo = async (): Promise<void> => {
    setSaving(true)
    const res = await updateProfile({ grade, bio, interests })
    setSaving(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success('프로필이 저장되었습니다')
  }

  const toggleInterest = (tag: string): void => {
    setInterests(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag],
    )
  }

  // ============================================
  // 닉네임 변경
  // ============================================
  const handleCheckNickname = async (): Promise<void> => {
    if (!newNickname.trim()) {
      setNicknameStatus('unavailable')
      setNicknameMessage('닉네임을 입력해주세요.')
      return
    }
    if (newNickname.trim() === nickname) {
      setNicknameStatus('unavailable')
      setNicknameMessage('현재 닉네임과 같습니다.')
      return
    }
    setNicknameStatus('checking')
    const res = await checkNicknameAvailable(newNickname.trim())
    if (res.error) {
      setNicknameStatus('unavailable')
      setNicknameMessage(res.error)
      return
    }
    if (res.data?.available) {
      setNicknameStatus('available')
      setNicknameMessage('사용 가능한 닉네임입니다')
    } else {
      setNicknameStatus('unavailable')
      setNicknameMessage(res.data?.reason ?? '이미 사용 중인 닉네임입니다.')
    }
  }

  const handleSaveNickname = async (): Promise<void> => {
    if (nicknameStatus !== 'available') {
      toast.error('닉네임 중복 확인을 먼저 해주세요')
      return
    }
    setSaving(true)
    const res = await updateProfile({ nickname: newNickname.trim() })
    setSaving(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    setNickname(newNickname.trim())
    setNicknameChangedAt(new Date().toISOString())
    setEditingNickname(false)
    setNewNickname('')
    setNicknameStatus('idle')
    toast.success('닉네임이 변경되었습니다. 다음 변경은 30일 후 가능합니다.')
  }

  // ============================================
  // 아바타 변경
  // ============================================
  const handleStartAvatarChange = async (): Promise<void> => {
    if (!canChangeAvatar) return
    setAvatarLoading(true)
    const res = await changeAvatar()
    setAvatarLoading(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    if (res.data) {
      setAvatarCandidates(res.data.candidates)
      setSelectedSeed(null)
    }
  }

  const handleConfirmAvatar = async (): Promise<void> => {
    if (!selectedSeed) return
    setAvatarLoading(true)
    const res = await confirmAvatar(selectedSeed)
    setAvatarLoading(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    if (res.data) {
      setAvatarUrl(res.data.avatarUrl)
      setAvatarChangeCount(MAX_AVATAR_CHANGES - res.data.remaining)
      setAvatarCandidates([])
      setSelectedSeed(null)
      toast.success(`아바타가 변경되었습니다 (남은 횟수: ${res.data.remaining}/${MAX_AVATAR_CHANGES})`)
    }
  }

  const handleCancelAvatarChange = (): void => {
    setAvatarCandidates([])
    setSelectedSeed(null)
  }

  // ============================================
  // Render
  // ============================================
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">내 프로필</h1>
        <p className="mt-1 text-gray-500">닉네임과 아바타, 관심사를 관리하세요</p>
      </div>

      {/* 게이미피케이션 요약 (읽기 전용) */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex items-center gap-2 rounded-lg bg-[#6366F1]/5 p-3">
              <Star className="h-5 w-5 text-[#6366F1]" />
              <div>
                <p className="text-xs text-gray-500">레벨</p>
                <p className="text-lg font-bold">Lv.{initial.level}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-[#A855F7]/5 p-3">
              <Zap className="h-5 w-5 text-[#A855F7]" />
              <div>
                <p className="text-xs text-gray-500">경험치</p>
                <p className="text-lg font-bold">{initial.xp.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-[#F59E0B]/5 p-3">
              <Flame className="h-5 w-5 text-[#F59E0B]" />
              <div>
                <p className="text-xs text-gray-500">스트릭</p>
                <p className="text-lg font-bold">{initial.streak_days}일</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-[#10B981]/5 p-3">
              <Award className="h-5 w-5 text-[#10B981]" />
              <div>
                <p className="text-xs text-gray-500">역할</p>
                <p className="text-lg font-bold">학생</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 아바타 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            아바타
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {avatarCandidates.length === 0 ? (
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
              {avatarUrl && (
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#6366F1]/10 to-[#A855F7]/10 blur-xl" />
                  <Image
                    src={avatarUrl}
                    alt={nickname}
                    width={200}
                    height={200}
                    unoptimized
                    className="relative h-48 w-48 rounded-full border-4 border-white bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900"
                  />
                </div>
              )}
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  닉네임 기반으로 자동 생성된 아바타입니다. 마음에 들지 않으면 새로 뽑아볼 수 있어요!
                </p>
                <p className="text-xs text-gray-500">
                  남은 변경 횟수: <strong className="text-[#4F6BF6]">{avatarRemaining}/{MAX_AVATAR_CHANGES}</strong>
                </p>
                <Button
                  onClick={handleStartAvatarChange}
                  disabled={!canChangeAvatar || avatarLoading}
                  className="bg-[#6366F1] hover:bg-[#6366F1]/90"
                >
                  {avatarLoading ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : canChangeAvatar ? (
                    <Sparkles className="mr-1 h-4 w-4" />
                  ) : (
                    <Lock className="mr-1 h-4 w-4" />
                  )}
                  {canChangeAvatar ? '아바타 변경' : '변경 횟수를 모두 사용했습니다'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium">마음에 드는 아바타를 선택하세요:</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {avatarCandidates.map((cand) => (
                  <button
                    key={cand.seed}
                    type="button"
                    onClick={() => setSelectedSeed(cand.seed)}
                    className={`relative rounded-xl border-2 p-3 transition-all ${
                      selectedSeed === cand.seed
                        ? 'border-[#6366F1] bg-[#6366F1]/5 shadow-lg ring-2 ring-[#6366F1]/30'
                        : 'border-gray-200 hover:border-[#6366F1]/40 dark:border-gray-700'
                    }`}
                  >
                    <Image
                      src={cand.url}
                      alt={cand.seed}
                      width={200}
                      height={200}
                      unoptimized
                      className="mx-auto h-32 w-32 rounded-full bg-white"
                    />
                    {selectedSeed === cand.seed && (
                      <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#6366F1] text-white">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancelAvatarChange} className="flex-1">
                  취소
                </Button>
                <Button
                  variant="outline"
                  onClick={handleStartAvatarChange}
                  disabled={avatarLoading}
                  className="flex-1"
                >
                  <RefreshCcw className="mr-1 h-3 w-3" />
                  다시 뽑기
                </Button>
                <Button
                  onClick={handleConfirmAvatar}
                  disabled={!selectedSeed || avatarLoading}
                  className="flex-1 bg-[#6366F1] hover:bg-[#6366F1]/90"
                >
                  {avatarLoading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                  이걸로 결정
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 닉네임 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle>닉네임</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!editingNickname ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{nickname || '(미설정)'}</p>
                {canChangeNickname ? (
                  <p className="mt-1 text-xs text-gray-500">
                    닉네임은 30일에 한 번 변경할 수 있습니다
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">
                    다음 변경 가능일: <strong>{nextDateStr}</strong>
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!canChangeNickname}
                onClick={() => {
                  setEditingNickname(true)
                  setNewNickname(nickname)
                  setNicknameStatus('idle')
                  setNicknameMessage('')
                }}
              >
                {canChangeNickname ? '닉네임 변경' : <><Lock className="mr-1 h-3 w-3" />변경 불가</>}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newNickname}
                  onChange={(e) => {
                    setNewNickname(e.target.value)
                    setNicknameStatus('idle')
                  }}
                  placeholder="새 닉네임"
                  maxLength={20}
                  className={
                    nicknameStatus === 'available'
                      ? 'border-green-500'
                      : nicknameStatus === 'unavailable'
                      ? 'border-red-500'
                      : ''
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCheckNickname}
                  disabled={nicknameStatus === 'checking'}
                  className="shrink-0"
                >
                  {nicknameStatus === 'checking' ? <Loader2 className="h-4 w-4 animate-spin" /> : '중복 확인'}
                </Button>
              </div>
              {nicknameStatus === 'available' && (
                <p className="flex items-center gap-1 text-xs text-green-600">
                  <Check className="h-3 w-3" />
                  {nicknameMessage}
                </p>
              )}
              {nicknameStatus === 'unavailable' && (
                <p className="flex items-center gap-1 text-xs text-red-600">
                  <X className="h-3 w-3" />
                  {nicknameMessage}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingNickname(false)
                    setNewNickname('')
                    setNicknameStatus('idle')
                  }}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveNickname}
                  disabled={nicknameStatus !== 'available' || saving}
                  className="flex-1 bg-[#4F6BF6] hover:bg-[#4F6BF6]/90"
                >
                  {saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  저장
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                ⚠️ 닉네임은 변경 후 30일 동안 다시 변경할 수 없습니다
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 학년 */}
          <div className="space-y-2">
            <Label htmlFor="grade">학년</Label>
            <select
              id="grade"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">선택 안 함</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* 학습 목표 */}
          <div className="space-y-2">
            <Label htmlFor="bio">학습 목표 (선택)</Label>
            <Input
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="예: 중간고사에서 과학 90점 넘기!"
              maxLength={100}
            />
            <p className="text-xs text-gray-500">{bio.length}/100</p>
          </div>

          {/* 관심 과목 */}
          <div className="space-y-2">
            <Label>관심 과목 (복수 선택)</Label>
            <div className="flex flex-wrap gap-2">
              {INTEREST_TAGS.map((tag) => {
                const selected = interests.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleInterest(tag)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                      selected
                        ? 'border-[#6366F1] bg-[#6366F1] text-white'
                        : 'border-gray-300 text-gray-600 hover:border-[#6366F1]/50 dark:border-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
            {interests.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {interests.map((t) => (
                  <Badge key={t} variant="secondary" className="bg-[#6366F1]/10 text-[#6366F1]">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={handleSaveInfo}
            disabled={saving}
            className="w-full bg-[#4F6BF6] hover:bg-[#4F6BF6]/90"
          >
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            저장
          </Button>
        </CardContent>
      </Card>

      {/* 비밀번호 변경 + 계정 삭제 */}
      <AccountSettings isDemo={isDemo} />
    </div>
  )
}
