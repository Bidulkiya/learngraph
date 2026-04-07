import Link from 'next/link'
import {
  BookOpen,
  GraduationCap,
  Shield,
  Sparkles,
  TreePine,
  Bot,
  Mic,
  ClipboardCheck,
  Target,
  Award,
  Users,
  BookX,
  Brain,
  MessageSquare,
  Zap,
} from 'lucide-react'
import { DemoLoginButtons } from '@/components/DemoLoginButtons'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#4F6BF6]/5 via-white to-[#7C5CFC]/5 dark:from-[#4F6BF6]/10 dark:via-gray-950 dark:to-[#7C5CFC]/10">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          {/* Logo */}
          <div className="mb-8 flex items-center justify-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4F6BF6] to-[#7C5CFC] shadow-xl">
              <BookOpen className="h-9 w-9 text-white" />
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
              Learn<span className="text-[#4F6BF6]">Graph</span>
            </h1>
          </div>

          {/* Tagline */}
          <h2 className="mx-auto mb-4 max-w-3xl text-3xl font-bold leading-tight text-gray-900 dark:text-white sm:text-4xl">
            AI가 만드는 스킬트리,
            <br />
            게임처럼 배우는 학습
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
            수업 자료를 업로드하면 AI가 자동으로 스킬트리를 생성하고,
            학생은 퀴즈를 풀어 노드를 언락하며 학습합니다.
            교강사 · 수강생 · 운영자 3자가 하나의 학습 여정에서 연결됩니다.
          </p>

          {/* Demo buttons */}
          <div className="mx-auto mb-6 flex w-full max-w-md flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
              <Sparkles className="h-4 w-4 text-[#7C5CFC]" />
              회원가입 없이 바로 체험하기
            </div>
            <DemoLoginButtons />
          </div>

          {/* Or login */}
          <div className="flex items-center justify-center gap-3 text-sm text-gray-400">
            <Link href="/login" className="font-medium text-[#4F6BF6] hover:underline">
              로그인
            </Link>
            <span>·</span>
            <Link href="/signup" className="font-medium text-[#4F6BF6] hover:underline">
              회원가입
            </Link>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute left-1/2 top-1/2 -z-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4F6BF6]/5 blur-3xl dark:bg-[#4F6BF6]/10" />
      </section>

      {/* 3자 역할 카드 */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h3 className="mb-2 text-center text-sm font-semibold uppercase tracking-wider text-[#4F6BF6]">
          3자 플랫폼
        </h3>
        <h2 className="mb-10 text-center text-3xl font-bold text-gray-900 dark:text-white">
          모두를 위한 학습 경험
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          <RoleCard
            icon={<GraduationCap className="h-8 w-8 text-[#10B981]" />}
            title="교사"
            color="#10B981"
            features={[
              'PDF 업로드 → AI 스킬트리 자동 생성',
              '수업 녹음 → 자동 요약 + 복습 퀴즈',
              '학생 그룹 AI 분석',
              '학부모 리포트 자동 작성',
            ]}
          />
          <RoleCard
            icon={<BookOpen className="h-8 w-8 text-[#4F6BF6]" />}
            title="학생"
            color="#4F6BF6"
            features={[
              'AI 튜터 + 소크라틱 대화',
              '서술형 AI 의미 기반 채점',
              '일일 미션 · 배지 · 스트릭',
              '학습 코치 주간 플랜 + 오답 분석',
            ]}
          />
          <RoleCard
            icon={<Shield className="h-8 w-8 text-[#F59E0B]" />}
            title="운영자"
            color="#F59E0B"
            features={[
              '스쿨 만들기 · 교사/학생 초대 코드',
              '교육과정 병목 AI 분석',
              '교사 활동 비교 차트',
              '공지사항 · 1:1 메신저',
            ]}
          />
        </div>
      </section>

      {/* AI 기능 하이라이트 */}
      <section className="bg-gradient-to-br from-[#4F6BF6]/5 to-[#7C5CFC]/5 dark:from-[#4F6BF6]/10 dark:to-[#7C5CFC]/10">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h3 className="mb-2 text-center text-sm font-semibold uppercase tracking-wider text-[#7C5CFC]">
            AI 통합 기능
          </h3>
          <h2 className="mb-3 text-center text-3xl font-bold text-gray-900 dark:text-white">
            7가지 AI 기능이 하나로
          </h2>
          <p className="mb-10 text-center text-gray-500">
            Claude Sonnet 4.6 · OpenAI Whisper · Embeddings
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AIFeatureBadge icon={<TreePine />} label="스킬트리 자동 생성" />
            <AIFeatureBadge icon={<ClipboardCheck />} label="퀴즈 자동 생성 + AI 채점" />
            <AIFeatureBadge icon={<Bot />} label="RAG 기반 AI 튜터" />
            <AIFeatureBadge icon={<Mic />} label="음성 전사 + 수업 요약" />
            <AIFeatureBadge icon={<Target />} label="학습 코치 주간 플랜" />
            <AIFeatureBadge icon={<Brain />} label="약점 진단 + 오답 분석" />
            <AIFeatureBadge icon={<Users />} label="학생 그룹 · 병목 분석" />
            <AIFeatureBadge icon={<Sparkles />} label="관련 개념 자동 추천" />
          </div>
        </div>
      </section>

      {/* 스킬트리 설명 */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#10B981]">
              스킬트리란?
            </h3>
            <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
              학습 개념을 <span className="text-[#10B981]">연결된 노드</span>로
            </h2>
            <p className="mb-6 text-gray-600 dark:text-gray-400">
              게임에서 스킬을 하나씩 언락하듯, 학습 개념을 노드로 시각화합니다.
              퀴즈를 통과해 노드를 언락하면 다음 개념이 열립니다.
              학생은 자신의 진도를 한눈에 보고, 교사는 반 전체의 학습 흐름을 파악할 수 있습니다.
            </p>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]" />
                <span>선수지식 관계가 시각적으로 표현됨</span>
              </li>
              <li className="flex items-start gap-2">
                <Award className="mt-0.5 h-4 w-4 shrink-0 text-[#7C5CFC]" />
                <span>게이미피케이션 (XP · 레벨 · 스트릭 · 배지)</span>
              </li>
              <li className="flex items-start gap-2">
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#4F6BF6]" />
                <span>노드별 AI 튜터 · 메모 · 관련 개념 추천</span>
              </li>
              <li className="flex items-start gap-2">
                <BookX className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <span>오답 노트 + AI 약점 진단</span>
              </li>
            </ul>
          </div>
          <div className="flex justify-center">
            <div className="relative h-80 w-80">
              {/* SVG 스킬트리 일러스트 */}
              <svg viewBox="0 0 320 320" className="h-full w-full">
                <defs>
                  <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4F6BF6" />
                    <stop offset="100%" stopColor="#7C5CFC" />
                  </linearGradient>
                </defs>
                {/* 엣지 */}
                <line x1="160" y1="60" x2="80" y2="160" stroke="#CBD5E1" strokeWidth="2" />
                <line x1="160" y1="60" x2="240" y2="160" stroke="#CBD5E1" strokeWidth="2" />
                <line x1="80" y1="160" x2="160" y2="260" stroke="#CBD5E1" strokeWidth="2" />
                <line x1="240" y1="160" x2="160" y2="260" stroke="#CBD5E1" strokeWidth="2" />
                <line x1="160" y1="60" x2="160" y2="260" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="4" />
                {/* 완료 노드 */}
                <circle cx="160" cy="60" r="32" fill="#10B981" className="drop-shadow-lg" />
                <text x="160" y="65" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">기초</text>
                {/* 도전 가능 */}
                <circle cx="80" cy="160" r="32" fill="#F59E0B" className="drop-shadow-lg animate-pulse" />
                <text x="80" y="165" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">개념</text>
                <circle cx="240" cy="160" r="32" fill="#F59E0B" className="drop-shadow-lg animate-pulse" />
                <text x="240" y="165" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">원리</text>
                {/* 잠김 */}
                <circle cx="160" cy="260" r="32" fill="#94A3B8" />
                <text x="160" y="265" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">심화</text>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-[#4F6BF6] to-[#7C5CFC] py-16 text-white">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="mb-3 text-3xl font-bold">지금 시작하세요</h2>
          <p className="mb-8 text-blue-100">
            데모 계정으로 회원가입 없이 바로 체험하거나, 계정을 만들어 나만의 스킬트리를 생성하세요
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup">
              <Button size="lg" className="bg-white text-[#4F6BF6] hover:bg-blue-50">
                무료로 시작하기
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="border-white bg-transparent text-white hover:bg-white/10">
                로그인
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-8 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-gray-500">
          <div className="mb-2 flex items-center justify-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[#4F6BF6] to-[#7C5CFC]">
              <BookOpen className="h-3 w-3 text-white" />
            </div>
            <span className="font-semibold text-gray-700 dark:text-gray-300">LearnGraph</span>
          </div>
          <p>AI 기반 스킬트리 교육 플랫폼 · Built with Next.js 16 + Claude Sonnet 4.6</p>
        </div>
      </footer>
    </div>
  )
}

function RoleCard({
  icon,
  title,
  color,
  features,
}: {
  icon: React.ReactNode
  title: string
  color: string
  features: string[]
}) {
  return (
    <div
      className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
      style={{ borderTopColor: color, borderTopWidth: 3 }}
    >
      <div
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
        style={{ backgroundColor: `${color}1A` }}
      >
        {icon}
      </div>
      <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
      <ul className="space-y-2">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AIFeatureBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#7C5CFC]/20 bg-white p-4 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md dark:border-[#7C5CFC]/30 dark:bg-gray-900">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#7C5CFC]/10 text-[#7C5CFC] [&_svg]:h-5 [&_svg]:w-5">
        {icon}
      </div>
      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</span>
    </div>
  )
}
