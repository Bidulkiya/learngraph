"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { BookOpen, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createBrowserClient } from "@/lib/supabase/client"
import type { Role } from "@/types/user"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const justRegistered = searchParams.get("registered") === "true"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
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

      // Fetch user's role from profiles
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

      // Redirect to role-specific dashboard
      router.push(`/${role}`)
      router.refresh()
    } catch {
      setError("로그인 중 오류가 발생했습니다. 다시 시도해주세요.")
      setLoading(false)
    }
  }

  return (
    <>
      {/* Registration success notice */}
      {justRegistered && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          회원가입이 완료되었습니다. 로그인해주세요.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
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

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password">비밀번호</Label>
          <Input
            id="password"
            type="password"
            placeholder="비밀번호 입력"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        {/* Submit */}
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
