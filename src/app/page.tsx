import { BookOpen, GraduationCap, Shield, Sparkles } from "lucide-react"
import Link from "next/link"
import { DemoLoginButtons } from "@/components/DemoLoginButtons"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#4F6BF6]/5 via-white to-[#7C5CFC]/5 dark:from-[#4F6BF6]/10 dark:via-gray-950 dark:to-[#7C5CFC]/10">
      <main className="flex flex-col items-center gap-8 px-6 py-12 text-center">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4F6BF6] to-[#7C5CFC] shadow-lg">
            <BookOpen className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            Learn<span className="text-[#4F6BF6]">Graph</span>
          </h1>
        </div>

        {/* Description */}
        <p className="max-w-lg text-lg text-gray-600 dark:text-gray-400">
          AI가 수업 자료를 분석하여 스킬트리를 자동 생성하고,
          <br />
          학생이 퀴즈를 풀어 노드를 언락하며 학습하는 교육 플랫폼
        </p>

        {/* Demo buttons */}
        <div className="flex w-full max-w-md flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
            <Sparkles className="h-4 w-4 text-[#7C5CFC]" />
            데모 체험하기 (회원가입 없이 바로 시작)
          </div>
          <DemoLoginButtons />
        </div>

        {/* Divider */}
        <div className="flex w-full max-w-md items-center gap-3">
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
          <span className="text-xs text-gray-400">또는 직접 로그인</span>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
        </div>

        {/* Role Cards */}
        <div className="grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            href="/login"
            className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-[#10B981]/50 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-[#10B981]/50"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#10B981]/10 transition-colors group-hover:bg-[#10B981]/20">
              <GraduationCap className="h-6 w-6 text-[#10B981]" />
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">교사</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">스킬트리 생성 · 학생 관리</span>
          </Link>

          <Link
            href="/login"
            className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-[#4F6BF6]/50 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-[#4F6BF6]/50"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#4F6BF6]/10 transition-colors group-hover:bg-[#4F6BF6]/20">
              <BookOpen className="h-6 w-6 text-[#4F6BF6]" />
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">학생</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">스킬트리 탐험 · 퀴즈 풀기</span>
          </Link>

          <Link
            href="/login"
            className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-[#F59E0B]/50 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-[#F59E0B]/50"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F59E0B]/10 transition-colors group-hover:bg-[#F59E0B]/20">
              <Shield className="h-6 w-6 text-[#F59E0B]" />
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">운영자</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">스쿨 관리 · 전체 분석</span>
          </Link>
        </div>
      </main>
    </div>
  )
}
