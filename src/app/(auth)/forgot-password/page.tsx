"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Mail, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createBrowserClient } from "@/lib/supabase/client"
import { LogoSymbol } from "@/components/Logo"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError("")

    const trimmed = email.trim()
    if (!trimmed) {
      setError("이메일을 입력해주세요.")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("올바른 이메일 형식이 아닙니다.")
      return
    }

    setLoading(true)
    try {
      const supabase = createBrowserClient()
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        trimmed,
        {
          redirectTo: `${appUrl}/reset-password`,
        },
      )

      // 보안: 존재하지 않는 이메일이어도 같은 성공 메시지를 표시
      // (Supabase는 기본적으로 없는 이메일도 에러를 던지지 않음)
      if (resetError) {
        // 실제 서버 오류만 표시
        console.error('[forgot-password]', resetError.message)
      }

      setSent(true)
    } catch {
      setError("요청 중 오류가 발생했습니다. 다시 시도해주세요.")
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
          <CardTitle className="text-2xl">비밀번호 재설정</CardTitle>
          <CardDescription>
            가입한 이메일을 입력하면 재설정 링크를 보내드립니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400">
                <Mail className="h-8 w-8" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  비밀번호 재설정 링크를 보냈습니다
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  <strong>{email}</strong>의 메일함을 확인해주세요.
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  메일이 오지 않으면 스팸함을 확인하거나 잠시 후 다시 시도해주세요.
                </p>
              </div>
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  로그인으로 돌아가기
                </Button>
              </Link>
            </div>
          ) : (
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
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full bg-[#4F6BF6] hover:bg-[#4F6BF6]/90"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                재설정 링크 보내기
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
