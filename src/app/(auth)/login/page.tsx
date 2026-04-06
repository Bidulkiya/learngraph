"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { BookOpen, Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createBrowserClient } from "@/lib/supabase/client"
import type { Role } from "@/types/user"

function LoginForm() {
  const searchParams = useSearchParams()
  const justRegistered = searchParams.get("registered") === "true"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

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
        } else if (signInError.message.includes("Email not confirmed")) {
          setError("이메일 인증이 필요합니다. 이메일을 확인해주세요.")
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
      {justRegistered && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          회원가입이 완료되었습니다. 로그인해주세요.
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

        <Button type="submit" className="w-full bg-[#4F6BF6] hover:bg-[#4F6BF6]/90" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          로그인
        </Button>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="font-medium text-[#4F6BF6] hover:underline">
            회원가입
          </Link>
        </p>
      </form>
    </>
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#4F6BF6]/5 via-white to-[#7C5CFC]/5 px-4 dark:from-[#4F6BF6]/10 dark:via-gray-950 dark:to-[#7C5CFC]/10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#4F6BF6] to-[#7C5CFC]">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl">로그인</CardTitle>
          <CardDescription>LearnGraph에 로그인하세요</CardDescription>
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
