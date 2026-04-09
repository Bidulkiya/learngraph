'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Loader2,
  Save,
  Sparkles,
  User,
  GraduationCap,
  School as SchoolIcon,
  Users,
  Check,
  X,
  RefreshCcw,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  updateProfile,
  changeAvatar,
  confirmAvatar,
  checkNicknameAvailable,
} from '@/actions/profile'
import type { Profile } from '@/types/user'
import { toast } from 'sonner'

interface Props {
  initial: Profile
  classes: Array<{ id: string; name: string }>
  schools: Array<{ id: string; name: string }>
}

const SUBJECTS = ['수학', '과학', '국어', '영어', '사회', '역사', '예술', '체육', '기타']

type NicknameCheckStatus = 'idle' | 'checking' | 'available' | 'unavailable'

export function TeacherProfileForm({ initial, classes, schools }: Props) {
  // 기본 정보 상태
  const [subject, setSubject] = useState<string>(initial.subject ?? '')
  const [bio, setBio] = useState<string>(initial.bio ?? '')
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

  // 닉네임 변경 가능일 계산
  const nicknameNextChangeDate = (() => {
    if (!nicknameChangedAt) return null
    const changed = new Date(nicknameChangedAt).getTime()
    return changed + 30 * 24 * 60 * 60 * 1000
  })()
  const canChangeNickname = !nicknameNextChangeDate || Date.now() >= nicknameNextChangeDate
  const nextDateStr = nicknameNextChangeDate
    ? new Date(nicknameNextChangeDate).toISOString().slice(0, 10)
    : null

  // ============================================
  // 기본 정보 저장
  // ============================================
  const handleSaveInfo = async (): Promise<void> => {
    if (bio.length > 200) {
      toast.error('소개는 200자 이하여야 합니다')
      return
    }
    setSaving(true)
    const res = await updateProfile({ subject, bio })
    setSaving(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success('프로필이 저장되었습니다')
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
    toast.success('닉네임이 변경되었습니다')
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

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">교사 프로필</h1>
        <p className="mt-1 text-gray-500">담당 과목과 소개를 작성하여 학생에게 보여주세요</p>
      </div>

      {/* 소속 스쿨/클래스 (읽기 전용) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            소속 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-gray-500">소속 스쿨</Label>
            {schools.length === 0 ? (
              <p className="mt-1 text-sm text-gray-400">아직 소속된 스쿨이 없습니다</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {schools.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 text-sm">
                    <SchoolIcon className="h-3.5 w-3.5 text-[#10B981]" />
                    <span className="font-medium">{s.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <Label className="text-xs text-gray-500">담당 클래스 ({classes.length})</Label>
            {classes.length === 0 ? (
              <p className="mt-1 text-sm text-gray-400">아직 클래스가 없습니다</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {classes.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 text-sm">
                    <Users className="h-3.5 w-3.5 text-[#4F6BF6]" />
                    <span className="font-medium">{c.name}</span>
                  </li>
                ))}
              </ul>
            )}
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
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#10B981]/10 to-[#6366F1]/10 blur-xl" />
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
                  학생들에게 보여지는 당신의 얼굴입니다.
                </p>
                <p className="text-xs text-gray-500">
                  남은 변경 횟수: <strong className="text-[#10B981]">{avatarRemaining}/{MAX_AVATAR_CHANGES}</strong>
                </p>
                <Button
                  onClick={handleStartAvatarChange}
                  disabled={!canChangeAvatar || avatarLoading}
                  className="bg-[#10B981] hover:bg-[#10B981]/90"
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
                        ? 'border-[#10B981] bg-[#10B981]/5 shadow-lg ring-2 ring-[#10B981]/30'
                        : 'border-gray-200 hover:border-[#10B981]/40 dark:border-gray-700'
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
                      <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#10B981] text-white">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setAvatarCandidates([]); setSelectedSeed(null) }} className="flex-1">
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
                  className="flex-1 bg-[#10B981] hover:bg-[#10B981]/90"
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
                  onChange={(e) => { setNewNickname(e.target.value); setNicknameStatus('idle') }}
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
                  onClick={() => { setEditingNickname(false); setNewNickname(''); setNicknameStatus('idle') }}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveNickname}
                  disabled={nicknameStatus !== 'available' || saving}
                  className="flex-1 bg-[#10B981] hover:bg-[#10B981]/90"
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
          {/* 담당 과목 */}
          <div className="space-y-2">
            <Label htmlFor="subject">담당 과목</Label>
            <select
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">선택 안 함</option>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* 한 줄 소개 */}
          <div className="space-y-2">
            <Label htmlFor="bio">한 줄 소개</Label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="예: 10년차 중학교 과학 교사입니다. 실험을 통한 탐구 수업을 좋아합니다."
              maxLength={200}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-xs text-gray-500">{bio.length}/200</p>
          </div>

          <Button
            onClick={handleSaveInfo}
            disabled={saving}
            className="w-full bg-[#10B981] hover:bg-[#10B981]/90"
          >
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            저장
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
