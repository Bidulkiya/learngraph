"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { BookOpen, Mail, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function VerifyContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get("email") ?? ""

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#4F6BF6] to-[#7C5CFC]">
          <Mail className="h-7 w-7 text-white" />
        </div>
        <CardTitle className="text-2xl">이메일을 확인해주세요</CardTitle>
        <CardDescription className="mt-2">
          {email ? (
            <>
              <span className="font-medium text-gray-900 dark:text-white">{email}</span>
              <br />
              주소로 인증 메일을 보냈습니다
            </>
          ) : (
            '가입하신 이메일 주소로 인증 메일을 보냈습니다'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-[#4F6BF6]/20 bg-[#4F6BF6]/5 p-4">
          <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#4F6BF6]" />
              <span>이메일 앱에서 LearnGraph의 인증 메일을 열어주세요</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#4F6BF6]" />
              <span>메일 안의 "이메일 확인" 링크를 클릭하세요</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#4F6BF6]" />
              <span>확인이 완료되면 로그인 페이지에서 로그인하세요</span>
            </li>
          </ol>
        </div>

        <div className="rounded-lg bg-yellow-50 p-3 text-xs text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300">
          <p className="font-medium">메일이 도착하지 않았나요?</p>
          <p className="mt-1">
            스팸함을 확인해보세요. 수 분 내에 도착하지 않으면 다시 회원가입을 시도해주세요.
          </p>
        </div>

        <Link href="/login" className="block">
          <Button className="w-full bg-[#4F6BF6] hover:bg-[#4F6BF6]/90">
            로그인 페이지로 이동
          </Button>
        </Link>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          회원가입을 잘못 하셨나요?{' '}
          <Link href="/signup" className="font-medium text-[#4F6BF6] hover:underline">
            다시 가입
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}

export default function VerifyPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#4F6BF6]/5 via-white to-[#7C5CFC]/5 px-4 dark:from-[#4F6BF6]/10 dark:via-gray-950 dark:to-[#7C5CFC]/10">
      <div className="w-full max-w-md">
        <div className="mb-4 flex items-center justify-center gap-2">
          <BookOpen className="h-5 w-5 text-[#4F6BF6]" />
          <span className="text-sm font-bold">Learn<span className="text-[#4F6BF6]">Graph</span></span>
        </div>
        <Suspense fallback={<div className="text-center text-sm text-gray-500">로딩 중...</div>}>
          <VerifyContent />
        </Suspense>
      </div>
    </div>
  )
}
