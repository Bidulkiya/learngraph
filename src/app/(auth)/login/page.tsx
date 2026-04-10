"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createBrowserClient } from "@/lib/supabase/client"
import { loginAsDemo } from "@/actions/school"
import { LogoSymbol } from "@/components/Logo"
import type { Role } from "@/types/user"

function LoginForm() {
  const searchParams = useSearchParams()
  const justRegistered = searchParams.get("registered") === "true"
  const justVerified = searchParams.get("verified") === "true"
  const authError = searchParams.get("error") === "auth_callback_failed"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState<'teacher' | 'student' | null>(null)

  async function handleDemoLogin(role: 'teacher' | 'student'): Promise<void> {
    setError("")
    setDemoLoading(role)
    try {
      const supabase = createBrowserClient()

      // 0. 기존 세션이 있으면 먼저 강제 로그아웃 (레거시 데모 계정이나 다른 계정 쿠키 정리)
      // 이전에 demo_student1 등으로 로그인했던 쿠키가 남아있으면 체험 환경이 오염됨.
      try {
        await supabase.auth.signOut()
      } catch {
        // 세션이 없어도 OK
      }

      // 1. 서버에서 데모 환경 idempotent 구축 + 이메일/비번 회신
      const setupRes = await loginAsDemo(role)
      if (setupRes.error || !setupRes.data) {
        setError(setupRes.error ?? '데모 환경 구축에 실패했습니다.')
        setDemoLoading(null)
        return
      }

      // 2. 클라이언트에서 직접 로그인 (브라우저 쿠키 보장)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: setupRes.data.email,
        password: setupRes.data.password,
      })
      if (signInError) {
        setError('데모 로그인 실패: ' + signInError.message)
        setDemoLoading(null)
        return
      }

      // 3. 페이지 이동 — full navigation으로 미들웨어 쿠키 반영
      window.location.href = setupRes.data.redirect
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError('데모 로그인 중 오류가 발생했습니다: ' + msg)
      setDemoLoading(null)
    }
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const supabase = createBrowserClient()

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        if (signInError.message.includes("Invalid login credentials")) {
          setError("이메일 또는 비밀번호가 올바르지 않습니다.")
        } else if (
          signInError.message.includes("Email not confirmed") ||
          signInError.message.includes("email_not_confirmed")
        ) {
          setError("이메일 인증이 완료되지 않았습니다. 받은 메일함에서 인증 링크를 클릭해주세요.")
        } else {
          setError(signInError.message)
        }
        setLoading(false)
        return
      }

      // Fetch user role from profiles
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError("사용자 정보를 불러올 수 없습니다.")
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      const role = (profile?.role as Role) || "student"

      // FIX: router.push + router.refresh 대신 window.location 사용.
      // router.push()는 soft navigation이라 middleware가 stale 쿠키로 실행될 수 있고,
      // router.refresh()와 동시 호출 시 /login 재요청 → 리디렉트 루프가 발생했음.
      // window.location은 full navigation이므로 쿠키가 확실히 포함된다.
      window.location.href = `/${role}`
    } catch {
      setError("로그인 중 오류가 발생했습니다. 다시 시도해주세요.")
      setLoading(false)
    }
  }

  return (
    <>
      {justVerified && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          ✓ 이메일 인증이 완료되었습니다. 로그인해주세요.
        </div>
      )}
      {justRegistered && !justVerified && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          회원가입이 완료되었습니다. 로그인해주세요.
        </div>
      )}
      {authError && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          이메일 인증 링크가 유효하지 않거나 만료되었습니다. 다시 시도해주세요.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            type="email"
            placeholder="example@school.ac.kr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">비밀번호</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="비밀번호 입력"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
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

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <Button type="submit" className="w-full bg-[#4F6BF6] hover:bg-[#4F6BF6]/90" disabled={loading || demoLoading !== null}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          로그인
        </Button>

        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Link href="/signup" className="font-medium text-[#4F6BF6] hover:underline">
            회원가입
          </Link>
          <span className="text-gray-300 dark:text-gray-700">·</span>
          <Link href="/forgot-password" className="font-medium text-gray-500 hover:text-[#4F6BF6] hover:underline dark:text-gray-400">
            비밀번호 찾기
          </Link>
        </div>
      </form>

      {/* 데모 체험 영역 */}
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200 dark:border-gray-800" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-2 text-gray-500 dark:text-gray-400">또는 회원가입 없이 둘러보기</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleDemoLogin('teacher')}
            disabled={loading || demoLoading !== null}
            className="border-[#10B981]/30 text-[#10B981] hover:bg-[#10B981]/5"
          >
            {demoLoading === 'teacher' ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            )}
            교사 체험
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleDemoLogin('student')}
            disabled={loading || demoLoading !== null}
            className="border-[#4F6BF6]/30 text-[#4F6BF6] hover:bg-[#4F6BF6]/5"
          >
            {demoLoading === 'student' ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            )}
            학생 체험
          </Button>
        </div>
        <p className="mt-2 text-center text-[11px] text-gray-400">
          체험 모드는 읽기 전용으로 둘러볼 수 있습니다
        </p>
      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#6366F1]/5 via-white to-[#A855F7]/5 px-4 dark:from-[#6366F1]/10 dark:via-gray-950 dark:to-[#A855F7]/10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex items-center justify-center">
            <LogoSymbol size={56} />
          </div>
          <CardTitle className="text-2xl">로그인</CardTitle>
          <CardDescription>NodeBloom에 로그인하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="py-8 text-center text-sm text-gray-500">로딩 중...</div>}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
