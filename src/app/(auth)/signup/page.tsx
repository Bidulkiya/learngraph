"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import {
  BookOpen,
  Eye,
  EyeOff,
  GraduationCap,
  Shield,
  Loader2,
  Heart,
  Check,
  X,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createBrowserClient } from "@/lib/supabase/client"
import { LogoSymbol } from "@/components/Logo"
import { dicebearUrl } from "@/lib/dicebear"
import { checkNicknameAvailable, checkEmailAvailable, initializeProfileAfterSignup } from "@/actions/profile"
import type { Role } from "@/types/user"

const roles: Array<{ value: Role; label: string; icon: React.ElementType; color: string; desc: string }> = [
  { value: "teacher", label: "교사", icon: GraduationCap, color: "#10B981", desc: "스킬트리 생성 · 학생 관리" },
  { value: "student", label: "학생", icon: BookOpen, color: "#4F6BF6", desc: "스킬트리 탐험 · 퀴즈 풀기" },
  { value: "parent", label: "학부모", icon: Heart, color: "#EC4899", desc: "자녀 학습 현황 확인" },
  { value: "admin", label: "운영자", icon: Shield, color: "#F59E0B", desc: "템플릿 관리 · 전체 분석" },
]

type NicknameStatus = 'idle' | 'checking' | 'available' | 'unavailable'
type EmailStatus = 'idle' | 'checking' | 'available' | 'unavailable'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<Role>("student")
  const [nickname, setNickname] = useState("")
  const [nicknameStatus, setNicknameStatus] = useState<NicknameStatus>('idle')
  const [nicknameMessage, setNicknameMessage] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // 이메일 중복 체크
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('idle')
  const [emailMessage, setEmailMessage] = useState("")
  const emailDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 약관 동의
  const [termsAgreed, setTermsAgreed] = useState(false)

  // 완료 화면
  const [completed, setCompleted] = useState<{ nickname: string; avatarUrl: string; role: Role } | null>(null)

  // 이메일 debounce 체크 (500ms) — 입력할 때마다
  const handleEmailChange = useCallback((value: string): void => {
    setEmail(value)
    setEmailStatus('idle')
    setEmailMessage('')

    if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current)

    // 최소 이메일 형식 검증 후 서버 체크
    const trimmed = value.trim()
    if (!trimmed) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return

    emailDebounceRef.current = setTimeout(async () => {
      setEmailStatus('checking')
      const res = await checkEmailAvailable(trimmed)
      if (res.error) {
        setEmailStatus('unavailable')
        setEmailMessage(res.error)
        return
      }
      if (res.data?.available) {
        setEmailStatus('available')
        setEmailMessage('사용 가능한 이메일입니다')
      } else {
        setEmailStatus('unavailable')
        setEmailMessage(res.data?.reason ?? '같은 이메일로 가입된 계정이 있습니다.')
      }
    }, 500)
  }, [])

  // blur 시에도 체크 (타이핑 중 debounce를 놓친 경우)
  const handleEmailBlur = async (): Promise<void> => {
    if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current)
    const trimmed = email.trim()
    if (!trimmed) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailStatus('unavailable')
      setEmailMessage('올바른 이메일 형식이 아닙니다.')
      return
    }
    if (emailStatus === 'available' || emailStatus === 'checking') return

    setEmailStatus('checking')
    const res = await checkEmailAvailable(trimmed)
    if (res.error) {
      setEmailStatus('unavailable')
      setEmailMessage(res.error)
      return
    }
    if (res.data?.available) {
      setEmailStatus('available')
      setEmailMessage('사용 가능한 이메일입니다')
    } else {
      setEmailStatus('unavailable')
      setEmailMessage(res.data?.reason ?? '같은 이메일로 가입된 계정이 있습니다.')
    }
  }

  const handleNicknameChange = (value: string): void => {
    setNickname(value)
    if (nicknameStatus !== 'idle') {
      setNicknameStatus('idle')
      setNicknameMessage("")
    }
  }

  const handleCheckNickname = async (): Promise<void> => {
    if (!nickname.trim()) {
      setNicknameStatus('unavailable')
      setNicknameMessage('닉네임을 입력해주세요.')
      return
    }
    setNicknameStatus('checking')
    setNicknameMessage("")
    const res = await checkNicknameAvailable(nickname.trim())
    if (res.error) {
      setNicknameStatus('unavailable')
      setNicknameMessage(res.error)
      return
    }
    if (res.data?.available) {
      setNicknameStatus('available')
      setNicknameMessage('사용 가능한 닉네임입니다 ✓')
    } else {
      setNicknameStatus('unavailable')
      setNicknameMessage(res.data?.reason ?? '이미 사용 중인 닉네임입니다.')
    }
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (!name.trim()) {
        setError("이름을 입력해주세요.")
        setLoading(false)
        return
      }
      if (emailStatus === 'unavailable') {
        setError("이메일 중복을 확인해주세요.")
        setLoading(false)
        return
      }
      if (nicknameStatus !== 'available') {
        setError("닉네임 중복 확인을 완료해주세요.")
        setLoading(false)
        return
      }

      const supabase = createBrowserClient()
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin

      // DiceBear 아바타 URL 미리 생성 (닉네임 기반 seed)
      const avatarUrl = dicebearUrl(nickname.trim())

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name.trim(),
            role,
            nickname: nickname.trim(),
            avatar_url: avatarUrl,
            avatar_seed: nickname.trim(),
          },
          emailRedirectTo: `${appUrl}/callback?next=/login?verified=true`,
        },
      })

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setError("이미 등록된 이메일입니다.")
        } else if (signUpError.message.includes("Password should be")) {
          setError("비밀번호는 최소 6자 이상이어야 합니다.")
        } else if (signUpError.message.includes("valid email")) {
          setError("올바른 이메일 형식을 입력해주세요.")
        } else {
          setError(signUpError.message)
        }
        setLoading(false)
        return
      }

      // session이 있으면 (이메일 확인 꺼져있음) → 프로필 초기화 + 완료 화면
      if (signUpData.session) {
        // auth trigger가 nickname/avatar를 기록하지만, race condition 대비 명시 업데이트
        const initRes = await initializeProfileAfterSignup(nickname.trim())
        if (initRes.error && !initRes.error.includes('이미')) {
          setError(initRes.error)
          setLoading(false)
          return
        }

        setCompleted({
          nickname: nickname.trim(),
          avatarUrl,
          role,
        })
        setLoading(false)
        return
      }

      // 이메일 확인이 켜진 환경 — verify 페이지로 이동
      router.push(`/verify?email=${encodeURIComponent(email)}`)
    } catch {
      setError("회원가입 중 오류가 발생했습니다. 다시 시도해주세요.")
      setLoading(false)
    }
  }

  // 회원가입 완료 화면
  if (completed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#6366F1]/5 via-white to-[#A855F7]/5 px-4 dark:from-[#6366F1]/10 dark:via-gray-950 dark:to-[#A855F7]/10">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex items-center justify-center">
              <LogoSymbol size={56} />
            </div>
            <CardTitle className="text-2xl">🎉 환영합니다!</CardTitle>
            <CardDescription>NodeBloom 가입이 완료되었습니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-[#6366F1]/20 to-[#A855F7]/20 blur-2xl" />
                <Image
                  src={completed.avatarUrl}
                  alt={completed.nickname}
                  width={200}
                  height={200}
                  unoptimized
                  className="relative rounded-full border-4 border-white bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900"
                />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {completed.nickname}
                </p>
                <p className="text-xs text-gray-500">
                  {roles.find(r => r.value === completed.role)?.label}
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-[#7C5CFC]/30 bg-[#7C5CFC]/5 p-3">
              <p className="flex items-center justify-center gap-1.5 text-sm text-[#7C5CFC]">
                <Sparkles className="h-4 w-4" />
                닉네임에 맞게 생성된 프로필입니다!
              </p>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                나중에 프로필에서 교체가 가능해요! 🎨
              </p>
            </div>
            <Button
              onClick={() => { window.location.href = `/${completed.role}` }}
              className="w-full bg-gradient-to-r from-[#6366F1] to-[#A855F7] hover:opacity-90"
            >
              시작하기 →
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#6366F1]/5 via-white to-[#A855F7]/5 px-4 py-8 dark:from-[#6366F1]/10 dark:via-gray-950 dark:to-[#A855F7]/10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex items-center justify-center">
            <LogoSymbol size={56} />
          </div>
          <CardTitle className="text-2xl">회원가입</CardTitle>
          <CardDescription>NodeBloom에 가입하여 학습을 시작하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">이름 (실명)</Label>
              <Input
                id="name"
                placeholder="홍길동"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Email — 실시간 중복 체크 */}
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="example@school.ac.kr"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onBlur={handleEmailBlur}
                  required
                  className={
                    emailStatus === 'available'
                      ? 'border-green-500 focus-visible:ring-green-500 pr-8'
                      : emailStatus === 'unavailable'
                      ? 'border-red-500 focus-visible:ring-red-500 pr-8'
                      : ''
                  }
                />
                {emailStatus === 'checking' && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                )}
                {emailStatus === 'available' && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
                {emailStatus === 'unavailable' && (
                  <X className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                )}
              </div>
              {emailStatus === 'available' && (
                <p className="flex items-center gap-1 text-xs text-green-600">
                  <Check className="h-3 w-3" />
                  {emailMessage}
                </p>
              )}
              {emailStatus === 'unavailable' && (
                <p className="flex items-center gap-1 text-xs text-red-600">
                  <X className="h-3 w-3" />
                  {emailMessage}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="6자 이상 입력"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Nickname (신규) */}
            <div className="space-y-2">
              <Label htmlFor="nickname">
                닉네임 <span className="text-xs text-gray-400">(2~20자, 다른 사용자에게 표시)</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="nickname"
                  placeholder="지수123"
                  value={nickname}
                  onChange={(e) => handleNicknameChange(e.target.value)}
                  maxLength={20}
                  minLength={2}
                  required
                  className={
                    nicknameStatus === 'available'
                      ? 'border-green-500 focus-visible:ring-green-500'
                      : nicknameStatus === 'unavailable'
                      ? 'border-red-500 focus-visible:ring-red-500'
                      : ''
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCheckNickname}
                  disabled={nicknameStatus === 'checking' || !nickname.trim()}
                  size="sm"
                  className="shrink-0"
                >
                  {nicknameStatus === 'checking'
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : '중복 확인'}
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
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <Label>역할 선택</Label>
              <div className="grid grid-cols-2 gap-2">
                {roles.map((r) => {
                  const Icon = r.icon
                  const selected = role === r.value
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-xs transition-all ${
                        selected
                          ? "border-current shadow-sm"
                          : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                      }`}
                      style={{ color: selected ? r.color : undefined }}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{r.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            {/* 약관 동의 */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-[#4F6BF6] focus:ring-[#4F6BF6]"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                가입 시{' '}
                <Link href="/terms" target="_blank" className="text-[#4F6BF6] underline hover:text-[#4F6BF6]/80">
                  이용약관
                </Link>
                {' '}및{' '}
                <Link href="/privacy" target="_blank" className="text-[#4F6BF6] underline hover:text-[#4F6BF6]/80">
                  개인정보처리방침
                </Link>
                에 동의합니다.
              </span>
            </label>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full bg-[#4F6BF6] hover:bg-[#4F6BF6]/90"
              disabled={loading || nicknameStatus !== 'available' || emailStatus === 'unavailable' || !termsAgreed}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              가입하기
            </Button>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              이미 계정이 있으신가요?{" "}
              <Link href="/login" className="font-medium text-[#4F6BF6] hover:underline">
                로그인
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
