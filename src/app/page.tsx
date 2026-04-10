'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  BookOpen, GraduationCap, Heart, Sparkles, TreePine, Bot, Mic, ClipboardCheck,
  Target, Award, Brain, FileText, Network, FlaskConical, Users,
  RefreshCw, AlertTriangle,
  School as SchoolIcon, ArrowRight, ExternalLink, Loader2, Rocket,
} from 'lucide-react'
import { loginAsDemo } from '@/actions/school'
import { createBrowserClient } from '@/lib/supabase/client'
import { LogoSymbol } from '@/components/Logo'
import { toast } from 'sonner'

export default function LandingPage() {
  const [demoLoading, setDemoLoading] = useState<'teacher' | 'student' | null>(null)

  /**
   * 로그인/회원가입 페이지로 이동 시 기존 세션 강제 정리.
   *
   * 배경: 학생/교사 체험 후 랜딩으로 돌아와 "로그인" 버튼을 누르면
   * middleware가 기존 데모 세션 쿠키를 감지하여 /login에 있는 인증 유저를
   * /student 같은 대시보드로 자동 리디렉트해버린다 → 마치 "데모 계정으로
   * 자동 로그인되는 버그"처럼 보인다.
   *
   * router.push 전에 명시적으로 signOut하여 로그인/회원가입 화면에 도달하도록.
   */
  const handleAuthNav = async (path: '/login' | '/signup'): Promise<void> => {
    try {
      const supabase = createBrowserClient()
      await supabase.auth.signOut()
    } catch {
      // 세션이 없어도 OK
    }
    // window.location으로 full navigation → middleware가 새 쿠키 상태로 판단
    window.location.href = path
  }

  // 데모 체험 — 서버에서 idempotent 환경 구축 후 클라이언트에서 직접 로그인.
  // 서버에서 로그인하면 브라우저 쿠키에 세션이 반영 안 돼서 리다이렉트 후 미인증 상태로
  // /login으로 튕김. 반드시 클라이언트에서 signInWithPassword를 호출해야 쿠키가 설정됨.
  const handleDemo = async (role: 'teacher' | 'student'): Promise<void> => {
    setDemoLoading(role)
    try {
      const supabase = createBrowserClient()

      // 기존 세션이 있으면 먼저 강제 로그아웃 (다른 계정 쿠키가 남아있으면 체험 환경 오염)
      try {
        await supabase.auth.signOut()
      } catch {
        // 세션이 없어도 OK
      }

      // 1. 서버: 데모 환경 idempotent 구축 + 이메일/비번 회신
      const res = await loginAsDemo(role)
      if (res.error || !res.data) {
        toast.error(res.error ?? '데모 로그인에 실패했습니다')
        setDemoLoading(null)
        return
      }

      // 2. 클라이언트: 직접 로그인 (브라우저 쿠키 보장)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: res.data.email,
        password: res.data.password,
      })
      if (signInError) {
        toast.error('데모 로그인 실패: ' + signInError.message)
        setDemoLoading(null)
        return
      }

      // 3. 페이지 이동 — full navigation으로 미들웨어가 신규 쿠키를 읽도록
      window.location.href = res.data.redirect
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error('데모 로그인 중 오류가 발생했습니다: ' + msg)
      setDemoLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* ═══════════════════════════════════════════════
          섹션 1: 히어로
      ═══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* 배경 그라데이션 + 블러 원 */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#4F6BF6]/5 via-white to-[#7C5CFC]/5 dark:from-[#4F6BF6]/10 dark:via-gray-950 dark:to-[#7C5CFC]/10" />
        <div className="pointer-events-none absolute left-1/4 top-20 -z-10 h-[500px] w-[500px] rounded-full bg-[#4F6BF6]/20 blur-[120px] dark:bg-[#4F6BF6]/10" />
        <div className="pointer-events-none absolute right-1/4 bottom-0 -z-10 h-[400px] w-[400px] rounded-full bg-[#7C5CFC]/20 blur-[120px] dark:bg-[#7C5CFC]/10" />
        {/* 격자 패턴 */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03] dark:opacity-[0.06]"
          style={{
            backgroundImage: 'linear-gradient(#4F6BF6 1px, transparent 1px), linear-gradient(90deg, #4F6BF6 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="mx-auto max-w-6xl px-6 py-16 text-center sm:py-24">
          {/* 상단 뱃지 */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#7C5CFC]/30 bg-white/60 px-4 py-1.5 text-xs font-medium text-[#7C5CFC] shadow-sm backdrop-blur dark:bg-gray-900/60">
            <Sparkles className="h-3.5 w-3.5" />
            KEG 바이브 코딩 대회 2026 · AI활용 차세대 교육 솔루션
          </div>

          {/* 로고 + 이름 */}
          <div className="mb-8 flex items-center justify-center gap-3">
            <LogoSymbol size={72} />
            <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
              Node
              <span className="bg-gradient-to-r from-[#6366F1] to-[#A855F7] bg-clip-text text-transparent">
                Bloom
              </span>
            </h1>
          </div>

          {/* 메인 카피 */}
          <h2 className="mx-auto mb-5 max-w-4xl text-3xl font-bold leading-tight text-gray-900 dark:text-white sm:text-5xl">
            AI가 수업을{' '}
            <span className="bg-gradient-to-r from-[#6366F1] to-[#A855F7] bg-clip-text text-transparent">설계</span>하고,
            <br />
            학생이 게임처럼{' '}
            <span className="bg-gradient-to-r from-[#10B981] to-[#34D399] bg-clip-text text-transparent">성장</span>합니다.
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-gray-600 dark:text-gray-400 sm:text-lg">
            수업 자료 하나로 스킬트리 · 퀴즈 · 학습 문서가 자동 생성됩니다.
            <br className="hidden sm:block" />
            교사 · 학생 · 학부모 · 운영자, 네 주체가 하나로 연결됩니다.
          </p>

          {/* CTA 버튼 2개 — 눈에 띄게 큼 */}
          <div className="mx-auto mb-5 flex w-full max-w-xl flex-col items-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => handleDemo('teacher')}
              disabled={demoLoading !== null}
              className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] px-6 py-4 text-base font-semibold text-white shadow-xl shadow-[#10B981]/30 transition-all hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-[#10B981]/40 disabled:opacity-70 sm:flex-1"
            >
              <span className="relative flex items-center justify-center gap-2">
                {demoLoading === 'teacher' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <GraduationCap className="h-5 w-5" />
                )}
                교사로 둘러보기
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </button>
            <button
              type="button"
              onClick={() => handleDemo('student')}
              disabled={demoLoading !== null}
              className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#4F6BF6] to-[#7C5CFC] px-6 py-4 text-base font-semibold text-white shadow-xl shadow-[#4F6BF6]/30 transition-all hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-[#4F6BF6]/40 disabled:opacity-70 sm:flex-1"
            >
              <span className="relative flex items-center justify-center gap-2">
                {demoLoading === 'student' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <BookOpen className="h-5 w-5" />
                )}
                학생으로 둘러보기
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </button>
          </div>
          <p className="mb-8 text-xs text-gray-500">
            회원가입 없이 즉시 둘러보기 · 인터랙티브 가이드가 주요 기능을 안내해드려요
          </p>

          {/* 로그인 / 회원가입 */}
          <div className="flex items-center justify-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => handleAuthNav('/login')}
              className="font-medium text-[#4F6BF6] hover:underline"
            >
              로그인
            </button>
            <span className="text-gray-300 dark:text-gray-700">·</span>
            <button
              type="button"
              onClick={() => handleAuthNav('/signup')}
              className="font-medium text-[#4F6BF6] hover:underline"
            >
              회원가입
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          섹션 2: 핵심 가치 3 카드
      ═══════════════════════════════════════════════ */}
      <FadeInSection>
        <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="mb-12 text-center">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#4F6BF6]">
              누구에게나 맞는 학습
            </h3>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              한 플랫폼, 네 가지 시선
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <ValueCard
              icon={<GraduationCap className="h-7 w-7" />}
              title="교사"
              color="#10B981"
              headline="자료 한 장이 곧 커리큘럼"
              description="PDF를 올리면 AI가 학습 개념을 노드로 분해하고 선수지식을 연결합니다. 퀴즈·학습 문서·복습 시스템이 자동으로 만들어집니다."
            />
            <ValueCard
              icon={<BookOpen className="h-7 w-7" />}
              title="학생"
              color="#4F6BF6"
              headline="게임처럼 노드를 잠금해제"
              description="내 학습 스타일에 맞게 적응하는 AI 튜터, 매일 쌓이는 경험치, 스트릭과 배지. 배우는 것이 즐거워지는 학습 경험."
            />
            <ValueCard
              icon={<Heart className="h-7 w-7" />}
              title="학부모"
              color="#EC4899"
              headline="곁에서 응원하는 부모"
              description="자녀의 학습 진도, 감정 상태, 위험 신호를 실시간으로. AI가 만든 주간 브리핑으로 한눈에 파악합니다."
            />
          </div>
        </section>
      </FadeInSection>

      {/* ═══════════════════════════════════════════════
          섹션 3: AI 16종 통합
      ═══════════════════════════════════════════════ */}
      <FadeInSection>
        <section className="relative overflow-hidden bg-gradient-to-br from-[#4F6BF6]/[0.04] to-[#7C5CFC]/[0.04] dark:from-[#4F6BF6]/[0.08] dark:to-[#7C5CFC]/[0.08]">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <div className="mb-12 text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#7C5CFC]/30 bg-white/70 px-4 py-1.5 text-xs font-semibold text-[#7C5CFC] backdrop-blur dark:bg-gray-900/60">
                <Sparkles className="h-3.5 w-3.5" />
                AI 통합 기능
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
                <CountUp end={16} />가지 AI 기능이 하나로
              </h2>
              <p className="mt-3 text-gray-500">
                Claude Sonnet 4.6 · OpenAI Whisper · text-embedding-3-small
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AIFeature icon={<TreePine />} color="#10B981"
                title="스킬트리 자동 생성"
                desc="PDF 업로드 → Claude가 학습 노드·선수지식 관계를 자동 추출" />
              <AIFeature icon={<ClipboardCheck />} color="#4F6BF6"
                title="AI 퀴즈 + 서술형 채점"
                desc="노드별 객관식·서술형 자동 생성, 의미 기반 채점과 점수 산출" />
              <AIFeature icon={<Bot />} color="#7C5CFC"
                title="소크라틱 AI 튜터"
                desc="RAG 기반 맥락 이해, 답을 직접 주지 않고 단계적으로 유도" />
              <AIFeature icon={<Mic />} color="#F59E0B"
                title="수업 녹음 → 전사 → 요약"
                desc="Whisper로 전사, Claude가 핵심 요약과 복습 퀴즈까지 생성" />
              <AIFeature icon={<Target />} color="#EC4899"
                title="주간 학습 플랜"
                desc="학생 진도·약점·스타일을 분석해 AI가 이번 주 최적 계획 수립" />
              <AIFeature icon={<Heart />} color="#EF4444"
                title="학습 감정 분석"
                desc="퀴즈 응답 패턴에서 자신감/고전/좌절을 감지하고 튜터 톤 자동 조절" />
              <AIFeature icon={<AlertTriangle />} color="#F97316"
                title="이탈 조기 경보"
                desc="접속/퀴즈/학습시간 데이터로 이탈 위험 학생을 조기에 탐지" />
              <AIFeature icon={<RefreshCw />} color="#06B6D4"
                title="적응형 복습 엔진"
                desc="정답률에 따라 복습 간격을 2배/유지/절반으로 자동 조절" />
              <AIFeature icon={<Network />} color="#8B5CF6"
                title="크로스커리큘럼 지식 맵"
                desc="과목을 넘나드는 개념 연결을 AI가 발견해 학습 동기 자극" />
              <AIFeature icon={<FileText />} color="#0EA5E9"
                title="HTML 학습지 자동 생성"
                desc="인쇄 가능한 학습지 수준 HTML 문서를 노드별 자동 생성" />
              <AIFeature icon={<Brain />} color="#14B8A6"
                title="약점 진단 + 오답 분석"
                desc="누적 오답을 분석해 개인별 약점 영역과 복습 방향 제시" />
              <AIFeature icon={<Award />} color="#EAB308"
                title="학부모 리포트 + 인증서"
                desc="주간 브리핑을 AI가 작성, 스킬트리 완료 시 수료 인증서 자동 발급" />
              <AIFeature icon={<FlaskConical />} color="#A855F7"
                title="사전 시뮬레이션 + AI 재생성"
                desc="100명 가상 학생으로 병목 검증 → AI가 스킬트리를 자동 개선" />
              <AIFeature icon={<Users />} color="#6366F1"
                title="학생 그룹 분석"
                desc="AI가 학습 수준별로 학생을 자동 분류하여 맞춤 지도 지원" />
              <AIFeature icon={<BookOpen />} color="#10B981"
                title="AI 플래시카드"
                desc="노드 완료 시 핵심 개념 복습 카드를 자동 생성" />
              <AIFeature icon={<Network />} color="#EC4899"
                title="개념 연결 추천"
                desc="학생이 배운 개념과 연관된 심화 개념을 AI가 추천" />
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* ═══════════════════════════════════════════════
          섹션 4: 학생 경험 하이라이트 (게이미피케이션)
      ═══════════════════════════════════════════════ */}
      <FadeInSection>
        <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="mb-12 text-center">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#4F6BF6]">
              학습이 즐거워지는 순간
            </h3>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              배움을 게임처럼
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <GamificationCard icon="🎯" title="일일 미션 + 주간 챌린지" desc="매일 작은 목표를 달성하며 학습 루틴을 만듭니다" />
            <GamificationCard icon="🏆" title="업적 · 배지 36종" desc="학습/스트릭/랭킹/소셜/히든 5카테고리 배지 획득" />
            <GamificationCard icon="⚡" title="XP · 레벨 시스템" desc="노드 완료와 퀴즈 만점으로 경험치를 쌓고 레벨 업" />
            <GamificationCard icon="🔥" title="학습 스트릭" desc="연속 학습일이 쌓일수록 동기부여" />
            <GamificationCard icon="👁️" title="학습 스타일 진단" desc="시각형/텍스트형/실습형 중 나에게 맞는 학습법 찾기" />
            <GamificationCard icon="🔐" title="노력 기반 도움" desc="3회 이상 시도한 후에만 AI 힌트가 열립니다" />
            <GamificationCard icon="📇" title="AI 플래시카드" desc="노드 완료 시 5장의 복습 카드가 자동 생성" />
            <GamificationCard icon="📓" title="오답 노트" desc="틀린 문제와 AI 피드백이 자동으로 정리" />
            <GamificationCard icon="🎓" title="수료 인증서" desc="스킬트리 100% 완료 시 인증서 자동 발급 + 다운로드" />
            <GamificationCard icon="👥" title="스터디 그룹" desc="같은 클래스 친구들과 실시간 그룹 채팅" />
            <GamificationCard icon="🥇" title="랭킹 시스템" desc="클래스/스쿨 XP·스트릭·진도 랭킹으로 경쟁" />
            <GamificationCard icon="🎨" title="DiceBear 아바타" desc="닉네임 기반 캐릭터가 자동 생성, 프로필에서 변경 가능" />
          </div>
        </section>
      </FadeInSection>

      {/* ═══════════════════════════════════════════════
          섹션 5: 스쿨/클래스 시스템
      ═══════════════════════════════════════════════ */}
      <FadeInSection>
        <section className="bg-gray-50 dark:bg-gray-900/50">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <div className="mb-12 text-center">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#F59E0B]">
                학교 · 학원 · 온라인 강의 어디서든
              </h3>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
                운영자부터 학생까지, 한 번의 코드로
              </h2>
              <p className="mt-3 text-gray-500">
                초대 코드 시스템으로 누구나 빠르게 연결됩니다
              </p>
            </div>

            {/* 플로우 다이어그램 */}
            <div className="flex flex-col items-stretch gap-4 lg:flex-row lg:items-start">
              <FlowStep
                step="1"
                icon={<SchoolIcon className="h-6 w-6" />}
                color="#F59E0B"
                title="운영자"
                description="스쿨을 만들고 교사/학생 초대 코드를 발급"
              />
              <FlowArrow />
              <FlowStep
                step="2"
                icon={<GraduationCap className="h-6 w-6" />}
                color="#10B981"
                title="교사"
                description="코드로 스쿨 가입 후 클래스 생성, 스킬트리 배포"
              />
              <FlowArrow />
              <FlowStep
                step="3"
                icon={<BookOpen className="h-6 w-6" />}
                color="#4F6BF6"
                title="학생"
                description="클래스 코드로 수강신청 → 승인 후 학습 시작"
              />
              <FlowArrow />
              <FlowStep
                step="4"
                icon={<Heart className="h-6 w-6" />}
                color="#EC4899"
                title="학부모"
                description="자녀가 생성한 6자리 코드로 자동 연결"
              />
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* ═══════════════════════════════════════════════
          섹션 6: 기술 스택
      ═══════════════════════════════════════════════ */}
      <FadeInSection>
        <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="mb-10 text-center">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
              TECH STACK
            </h3>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
              최신 기술로 구축된 교육 플랫폼
            </h2>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <TechBadge name="Next.js 16" emoji="▲" color="from-gray-800 to-black" />
            <TechBadge name="TypeScript" emoji="TS" color="from-blue-600 to-blue-800" />
            <TechBadge name="Tailwind CSS" emoji="🎨" color="from-cyan-500 to-cyan-700" />
            <TechBadge name="shadcn/ui" emoji="🧩" color="from-slate-700 to-slate-900" />
            <TechBadge name="Supabase" emoji="🗄️" color="from-green-600 to-emerald-700" />
            <TechBadge name="Claude Sonnet 4.6" emoji="✨" color="from-orange-500 to-amber-600" />
            <TechBadge name="Vercel AI SDK v6" emoji="🚀" color="from-gray-700 to-gray-900" />
            <TechBadge name="OpenAI Whisper" emoji="🎙️" color="from-purple-500 to-purple-700" />
            <TechBadge name="pgvector RAG" emoji="🔍" color="from-indigo-600 to-purple-700" />
            <TechBadge name="D3.js" emoji="🌳" color="from-orange-600 to-red-600" />
            <TechBadge name="Recharts" emoji="📊" color="from-pink-500 to-rose-600" />
          </div>
        </section>
      </FadeInSection>

      {/* ═══════════════════════════════════════════════
          섹션 7: CTA 반복
      ═══════════════════════════════════════════════ */}
      <FadeInSection>
        <section className="relative overflow-hidden bg-gradient-to-br from-[#4F6BF6] via-[#6B5CFC] to-[#7C5CFC] py-20 text-white">
          {/* 배경 장식 */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-10 top-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute right-10 bottom-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-3xl px-6 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-medium backdrop-blur">
              <Rocket className="h-3.5 w-3.5" />
              지금 바로 시작하세요
            </div>
            <h2 className="mb-5 text-3xl font-bold sm:text-5xl">
              3분이면 충분합니다
            </h2>
            <p className="mb-10 text-base leading-relaxed text-white/90 sm:text-lg">
              둘러보기로 주요 기능을 직접 확인하거나,
              <br className="hidden sm:block" />
              무료 계정을 만들어 나만의 스킬트리를 시작하세요.
            </p>

            <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => handleDemo('teacher')}
                disabled={demoLoading !== null}
                className="group w-full rounded-xl bg-white px-6 py-4 text-base font-semibold text-[#4F6BF6] shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl disabled:opacity-70 sm:flex-1"
              >
                <span className="flex items-center justify-center gap-2">
                  {demoLoading === 'teacher' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <GraduationCap className="h-5 w-5" />
                  )}
                  교사로 둘러보기
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleDemo('student')}
                disabled={demoLoading !== null}
                className="group w-full rounded-xl bg-white/10 px-6 py-4 text-base font-semibold text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/20 disabled:opacity-70 sm:flex-1 border border-white/30"
              >
                <span className="flex items-center justify-center gap-2">
                  {demoLoading === 'student' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <BookOpen className="h-5 w-5" />
                  )}
                  학생으로 둘러보기
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleAuthNav('/signup')}
              className="mt-4 inline-flex items-center gap-1 text-sm text-white/90 hover:text-white hover:underline"
            >
              또는 무료 계정 만들기
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>
      </FadeInSection>

      {/* ═══════════════════════════════════════════════
          푸터
      ═══════════════════════════════════════════════ */}
      <footer className="border-t border-gray-200 bg-gray-50 py-10 dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <LogoSymbol size={28} />
              <span className="font-bold text-gray-800 dark:text-gray-200">
                Node<span className="text-[#6366F1]">Bloom</span>
              </span>
              <span className="text-sm text-gray-500">© 2026</span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 sm:gap-4">
              <Link href="/terms" className="transition-colors hover:text-[#6366F1]">
                이용약관
              </Link>
              <Link href="/privacy" className="transition-colors hover:text-[#6366F1]">
                개인정보처리방침
              </Link>
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-[#A855F7]" />
                Powered by Claude AI
              </span>
              <a
                href="https://github.com/Bidulkiya/nodebloom"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 transition-colors hover:text-[#6366F1]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                GitHub
              </a>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-gray-400">
            노드가 피다, 지식이 자라다 · Built with Next.js 16 + Claude Sonnet 4.6 + Supabase
          </p>
        </div>
      </footer>
    </div>
  )
}

// ═══════════════════════════════════════════════
// 보조 컴포넌트
// ═══════════════════════════════════════════════

/**
 * 스크롤 시 페이드인. IntersectionObserver 기반.
 */
function FadeInSection({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      }`}
    >
      {children}
    </div>
  )
}

/**
 * 숫자 카운트업 애니메이션 (IntersectionObserver로 view에 들어올 때).
 */
function CountUp({ end }: { end: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [count, setCount] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const duration = 1200
          const steps = 40
          const stepTime = duration / steps
          const increment = end / steps
          let current = 0
          const timer = setInterval(() => {
            current += increment
            if (current >= end) {
              current = end
              clearInterval(timer)
            }
            setCount(Math.round(current))
          }, stepTime)
        }
      })
    }, { threshold: 0.5 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [end])

  return <span ref={ref} className="bg-gradient-to-r from-[#4F6BF6] to-[#7C5CFC] bg-clip-text text-transparent">{count}</span>
}

function ValueCard({
  icon, title, color, headline, description,
}: {
  icon: React.ReactNode
  title: string
  color: string
  headline: string
  description: string
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-2xl dark:border-gray-800 dark:bg-gray-900"
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-10 transition-opacity group-hover:opacity-20"
        style={{ backgroundColor: color }}
      />
      <div
        className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg transition-transform group-hover:scale-110"
        style={{ backgroundColor: color, boxShadow: `0 10px 30px ${color}40` }}
      >
        {icon}
      </div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color }}>
        {title}
      </div>
      <h3 className="mb-3 text-xl font-bold text-gray-900 dark:text-white">
        {headline}
      </h3>
      <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
        {description}
      </p>
    </div>
  )
}

function AIFeature({
  icon, title, desc, color,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  color: string
}) {
  return (
    <div className="group flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md transition-transform group-hover:scale-110 [&_svg]:h-5 [&_svg]:w-5"
        style={{ backgroundColor: color, boxShadow: `0 8px 20px ${color}30` }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="mb-1 text-sm font-bold text-gray-900 dark:text-white">{title}</h4>
        <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">{desc}</p>
      </div>
    </div>
  )
}

function GamificationCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50/50 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-800 dark:from-gray-900 dark:to-gray-900/50">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#4F6BF6]/10 text-2xl">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="mb-0.5 text-sm font-bold text-gray-900 dark:text-white">{title}</h4>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
    </div>
  )
}

function FlowStep({
  step, icon, color, title, description,
}: {
  step: string
  icon: React.ReactNode
  color: string
  title: string
  description: string
}) {
  return (
    <div className="relative flex-1 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div
        className="absolute -top-3 left-5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white shadow-md"
        style={{ backgroundColor: color }}
      >
        {step}
      </div>
      <div
        className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-white"
        style={{ backgroundColor: color, boxShadow: `0 8px 20px ${color}30` }}
      >
        {icon}
      </div>
      <h4 className="mb-1 text-base font-bold text-gray-900 dark:text-white">{title}</h4>
      <p className="text-xs text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  )
}

function FlowArrow() {
  return (
    <div className="hidden items-center justify-center self-center lg:flex">
      <ArrowRight className="h-5 w-5 text-gray-300 dark:text-gray-700" />
    </div>
  )
}

function TechBadge({ name, emoji, color }: { name: string; emoji: string; color: string }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-full bg-gradient-to-r ${color} px-4 py-2 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5 hover:shadow-lg`}
    >
      <span className="text-base">{emoji}</span>
      <span>{name}</span>
    </div>
  )
}
