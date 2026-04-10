"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Eye, EyeOff, Loader2, Check, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createBrowserClient } from "@/lib/supabase/client"
import { LogoSymbol } from "@/components/Logo"

/**
 * 비밀번호 재설정 페이지.
 *
 * Supabase가 이메일의 재설정 링크를 클릭하면 이 페이지로 리디렉트한다.
 * URL의 해시 fragment에 access_token이 포함되며,
 * Supabase 클라이언트가 자동으로 세션을 복원한다.
 *
 * 주의: Supabase Dashboard → Authentication → URL Configuration → Redirect URLs에
 * https://nodebloom.vercel.app/reset-password (또는 로컬 http://localhost:3000/reset-password)
 * 가 등록되어 있어야 한다.
 */
export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [sessionReady, setSessionReady] = useState(false)

  // Supabase가 URL hash에서 토큰을 읽어 세션을 복원하는 이벤트 감지
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const supabase = createBrowserClient()

    // SIGNED_IN 이벤트가 오면 세션이 복원된 것
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
          setSessionReady(true)
        }
      },
    )

    // 이미 세션이 있을 수도 있음 (직접 접속)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessionReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError("")

    if (password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.")
      return
    }
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.")
      return
    }

    setLoading(true)
    try {
      const supabase = createBrowserClient()
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        if (updateError.message.includes("same_password")) {
          setError("새 비밀번호가 기존 비밀번호와 같습니다. 다른 비밀번호를 입력해주세요.")
        } else {
          setError(updateError.message)
        }
        setLoading(false)
        return
      }

      // 비밀번호 변경 성공 → 세션 정리 후 로그인 유도
      await supabase.auth.signOut()
      setSuccess(true)
    } catch {
      setError("비밀번호 변경 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#6366F1]/5 via-white to-[#A855F7]/5 px-4 dark:from-[#6366F1]/10 dark:via-gray-950 dark:to-[#A855F7]/10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex items-center justify-center">
            <LogoSymbol size={56} />
          </div>
          <CardTitle className="text-2xl">새 비밀번호 설정</CardTitle>
          <CardDescription>
            {success
              ? "비밀번호가 성공적으로 변경되었습니다"
              : "새로 사용할 비밀번호를 입력해주세요"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  비밀번호가 변경되었습니다
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  새 비밀번호로 로그인해주세요.
                </p>
              </div>
              <Link href="/login">
                <Button className="w-full bg-[#4F6BF6] hover:bg-[#4F6BF6]/90">
                  로그인하기
                </Button>
              </Link>
            </div>
          ) : !sessionReady ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#4F6BF6]" />
              <p className="text-sm text-gray-500">
                인증 정보를 확인하고 있습니다...
              </p>
              <p className="text-xs text-gray-400">
                이메일의 재설정 링크를 통해 접속해주세요.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">새 비밀번호</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="6자 이상 입력"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    minLength={6}
                    required
                    autoFocus
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

              <div className="space-y-2">
                <Label htmlFor="confirm-password">비밀번호 확인</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="비밀번호 다시 입력"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  required
                  className={
                    confirmPassword && password !== confirmPassword
                      ? 'border-red-500 focus-visible:ring-red-500'
                      : confirmPassword && password === confirmPassword
                      ? 'border-green-500 focus-visible:ring-green-500'
                      : ''
                  }
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-600">비밀번호가 일치하지 않습니다</p>
                )}
                {confirmPassword && password === confirmPassword && password.length >= 6 && (
                  <p className="flex items-center gap-1 text-xs text-green-600">
                    <Check className="h-3 w-3" />
                    비밀번호가 일치합니다
                  </p>
                )}
              </div>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full bg-[#4F6BF6] hover:bg-[#4F6BF6]/90"
                disabled={loading || password.length < 6 || password !== confirmPassword}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                비밀번호 변경
              </Button>

              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                <Link
                  href="/login"
                  className="font-medium text-[#4F6BF6] hover:underline"
                >
                  로그인으로 돌아가기
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
