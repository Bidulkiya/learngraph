"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { BookOpen, Eye, EyeOff, GraduationCap, Shield, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createBrowserClient } from "@/lib/supabase/client"
import type { Role } from "@/types/user"

const roles: Array<{ value: Role; label: string; icon: React.ElementType; color: string; desc: string }> = [
  { value: "teacher", label: "교사", icon: GraduationCap, color: "#10B981", desc: "스킬트리 생성 · 학생 관리" },
  { value: "student", label: "학생", icon: BookOpen, color: "#4F6BF6", desc: "스킬트리 탐험 · 퀴즈 풀기" },
  { value: "admin", label: "운영자", icon: Shield, color: "#F59E0B", desc: "템플릿 관리 · 전체 분석" },
]

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<Role>("student")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

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

      const supabase = createBrowserClient()

      // signUp with user metadata — DB trigger will auto-create profiles row
      // 이메일 확인 설정:
      // 개발 환경에서는 Supabase Dashboard → Authentication → Settings에서
      // "Confirm email" 옵션을 끄면 바로 로그인 가능.
      // 프로덕션에서는 이메일 확인을 켜고 callback route로 처리.
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name.trim(),
            role,
          },
        },
      })

      if (signUpError) {
        // Translate common Supabase errors to Korean
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

      router.push("/login?registered=true")
    } catch {
      setError("회원가입 중 오류가 발생했습니다. 다시 시도해주세요.")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#4F6BF6]/5 via-white to-[#7C5CFC]/5 px-4 dark:from-[#4F6BF6]/10 dark:via-gray-950 dark:to-[#7C5CFC]/10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#4F6BF6] to-[#7C5CFC]">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl">회원가입</CardTitle>
          <CardDescription>LearnGraph에 가입하여 학습을 시작하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                placeholder="홍길동"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

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

            {/* Role Selection */}
            <div className="space-y-2">
              <Label>역할 선택</Label>
              <div className="grid grid-cols-3 gap-2">
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

            {/* Submit */}
            <Button type="submit" className="w-full bg-[#4F6BF6] hover:bg-[#4F6BF6]/90" disabled={loading}>
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
