'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  BookOpen, GraduationCap, Heart, Sparkles, TreePine, Bot, Mic,
  Target, Award, Brain, FileText, Users,
  AlertTriangle, Shield,
  School as SchoolIcon, ArrowRight, ExternalLink, Loader2,
} from 'lucide-react'
import { loginAsDemo } from '@/actions/school'
import { createBrowserClient } from '@/lib/supabase/client'
import { LogoSymbol } from '@/components/Logo'
import { toast } from 'sonner'

export default function LandingPage() {
  const [demoLoading, setDemoLoading] = useState<'teacher' | 'student' | 'learner' | null>(null)

  const handleAuthNav = async (path: '/login' | '/signup'): Promise<void> => {
    try {
      const supabase = createBrowserClient()
      await supabase.auth.signOut()
    } catch {
      // 세션이 없어도 OK
    }
    window.location.href = path
  }

  const handleDemo = async (role: 'teacher' | 'student' | 'learner'): Promise<void> => {
    setDemoLoading(role)
    try {
      const supabase = createBrowserClient()
      try { await supabase.auth.signOut() } catch { /* OK */ }

      const res = await loginAsDemo(role)
      if (res.error || !res.data) {
        toast.error(res.error ?? '데모 로그인에 실패했습니다')
        setDemoLoading(null)
        return
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: res.data.email,
        password: res.data.password,
      })
      if (signInError) {
        toast.error('데모 로그인 실패: ' + signInError.message)
        setDemoLoading(null)
        return
      }

      window.location.href = res.data.redirect
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error('데모 로그인 중 오류: ' + msg)
      setDemoLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">

      {/* ═══════════════════════════════════════════════
          히어로
      ═══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#4F6BF6]/5 via-white to-[#7C5CFC]/5 dark:from-[#4F6BF6]/10 dark:via-gray-950 dark:to-[#7C5CFC]/10" />
        <div className="pointer-events-none absolute left-1/4 top-20 -z-10 h-[500px] w-[500px] rounded-full bg-[#4F6BF6]/20 blur-[120px] dark:bg-[#4F6BF6]/10" />
        <div className="pointer-events-none absolute right-1/4 bottom-0 -z-10 h-[400px] w-[400px] rounded-full bg-[#7C5CFC]/20 blur-[120px] dark:bg-[#7C5CFC]/10" />
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03] dark:opacity-[0.06]"
          style={{
            backgroundImage: 'linear-gradient(#4F6BF6 1px, transparent 1px), linear-gradient(90deg, #4F6BF6 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="mx-auto max-w-6xl px-6 pb-16 pt-20 text-center sm:pb-24 sm:pt-28">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#6366F1]/30 bg-white/70 px-4 py-1.5 text-xs font-semibold text-[#6366F1] backdrop-blur dark:bg-gray-900/60">
            <Sparkles className="h-3.5 w-3.5" />
            AI 기반 차세대 교육 플랫폼
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-tight text-gray-900 dark:text-white sm:text-6xl">
            AI가 수업을{' '}
            <span className="bg-gradient-to-r from-[#6366F1] to-[#A855F7] bg-clip-text text-transparent">설계</span>하고,
            <br />
            학생이 게임처럼{' '}
            <span className="bg-gradient-to-r from-[#10B981] to-[#34D399] bg-clip-text text-transparent">성장</span>합니다.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-gray-600 dark:text-gray-400 sm:text-lg">
            수업 자료 하나로 스킬트리 · 퀴즈 · 학습 문서가 자동 생성됩니다.
            <br className="hidden sm:block" />
            교사 · 학생 · 학부모 · 운영자 · 독학러, 다섯 주체가 하나로 연결됩니다.
          </p>

          {/* CTA 버튼 3개 */}
          <div className="mx-auto mt-10 flex w-full max-w-3xl flex-col items-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => handleDemo('teacher')}
              disabled={demoLoading !== null}
              className="group w-full rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] px-5 py-3.5 text-sm font-semibold text-white shadow-xl shadow-[#10B981]/25 transition-all hover:-translate-y-0.5 hover:shadow-2xl disabled:opacity-70 sm:flex-1"
            >
              <span className="flex items-center justify-center gap-2">
                {demoLoading === 'teacher' ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
                교사로 둘러보기
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleDemo('student')}
              disabled={demoLoading !== null}
              className="group w-full rounded-xl bg-gradient-to-r from-[#4F6BF6] to-[#7C5CFC] px-5 py-3.5 text-sm font-semibold text-white shadow-xl shadow-[#4F6BF6]/25 transition-all hover:-translate-y-0.5 hover:shadow-2xl disabled:opacity-70 sm:flex-1"
            >
              <span className="flex items-center justify-center gap-2">
                {demoLoading === 'student' ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
                학생으로 둘러보기
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleDemo('learner')}
              disabled={demoLoading !== null}
              className="group w-full rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] px-5 py-3.5 text-sm font-semibold text-white shadow-xl shadow-[#F59E0B]/25 transition-all hover:-translate-y-0.5 hover:shadow-2xl disabled:opacity-70 sm:flex-1"
            >
              <span className="flex items-center justify-center gap-2">
                {demoLoading === 'learner' ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
                독학러로 둘러보기
              </span>
            </button>
          </div>

          <p className="mt-4 text-xs text-gray-500">
            회원가입 없이 즉시 둘러보기 · 팝업 가이드가 주요 기능을 안내합니다
          </p>

          <div className="mt-4 flex items-center justify-center gap-2 text-sm">
            <button type="button" onClick={() => handleAuthNav('/login')} className="font-medium text-[#4F6BF6] hover:underline">
              로그인
            </button>
            <span className="text-gray-300 dark:text-gray-700">·</span>
            <button type="button" onClick={() => handleAuthNav('/signup')} className="font-medium text-[#4F6BF6] hover:underline">
              회원가입
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          스토리 블록 1: 교사
      ═══════════════════════════════════════════════ */}
      <FadeInSection>
        <section className="bg-gradient-to-br from-[#4F6BF6]/[0.03] to-transparent dark:from-[#4F6BF6]/[0.06]">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 lg:grid-cols-2 lg:py-28">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#10B981]">For Teachers</p>
              <h2 className="text-3xl font-extrabold leading-snug text-gray-900 dark:text-white sm:text-4xl">
                수업이 끝나도,
                <br />
                AI가 학습을 이어갑니다.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                교사는 수업에만 집중하세요. 커리큘럼 설계, 퀴즈 출제, 학습 문서 제작,
                감정 분석, 이탈 경보까지 AI가 처리합니다.
              </p>
            </div>
            <div className="space-y-4">
              <StoryFeature icon={<FileText className="h-5 w-5" />} color="#10B981" title="PDF 한 장이면 커리큘럼이 완성됩니다" desc="AI가 개념 간 관계를 분석하여 스킬트리를 자동 설계합니다." />
              <StoryFeature icon={<Mic className="h-5 w-5" />} color="#10B981" title="수업 녹음만으로 스킬트리가 탄생합니다" desc="잡음을 제거하고 핵심 내용만 추출하여 퀴즈까지 자동 생성합니다." />
              <StoryFeature icon={<Brain className="h-5 w-5" />} color="#10B981" title="AI가 병목을 미리 예측하고 개선합니다" desc="100명의 가상 학생 시뮬레이션으로 배포 전 검증 + 자동 개선합니다." />
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* ═══════════════════════════════════════════════
          스토리 블록 2: 학생 지원
      ═══════════════════════════════════════════════ */}
      <FadeInSection>
        <section>
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 lg:grid-cols-2 lg:py-28">
            <div className="order-2 space-y-4 lg:order-1">
              <StoryFeature icon={<Heart className="h-5 w-5" />} color="#8B5CF6" title="학습 감정을 실시간으로 감지합니다" desc="퀴즈 응답 패턴에서 자신감, 고전, 좌절을 읽고 튜터 톤을 조절합니다." />
              <StoryFeature icon={<AlertTriangle className="h-5 w-5" />} color="#8B5CF6" title="이탈 위험을 조기에 경보합니다" desc="접속 빈도, 오답률, 학습 시간 감소를 AI가 감지하여 교사에게 알립니다." />
              <StoryFeature icon={<Bot className="h-5 w-5" />} color="#8B5CF6" title="답을 주지 않고, 질문으로 사고를 키웁니다" desc="소크라틱 AI 튜터가 RAG 기반으로 단계적으로 이해를 유도합니다." />
            </div>
            <div className="order-1 lg:order-2">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#8B5CF6]">AI Insight</p>
              <h2 className="text-3xl font-extrabold leading-snug text-gray-900 dark:text-white sm:text-4xl">
                학생이 포기하기 전에,
                <br />
                AI가 먼저 알아챕니다.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                표면에 드러나지 않는 학습 위기를 AI가 감지합니다.
                감정 분석, 이탈 경보, 소크라틱 튜터가 한 명도 놓치지 않습니다.
              </p>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* ═══════════════════════════════════════════════
          스토리 블록 3: 게이미피케이션
      ═══════════════════════════════════════════════ */}
      <FadeInSection>
        <section className="bg-gradient-to-br from-[#F59E0B]/[0.03] to-transparent dark:from-[#F59E0B]/[0.06]">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 lg:grid-cols-2 lg:py-28">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#F59E0B]">Gamification</p>
              <h2 className="text-3xl font-extrabold leading-snug text-gray-900 dark:text-white sm:text-4xl">
                게임처럼 배우니까,
                <br />
                멈출 수 없습니다.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                XP, 레벨, 업적, 스트릭, 랭킹.
                공부가 아니라 퀘스트를 클리어하는 느낌.
                한 번 시작하면 다음 노드가 궁금해집니다.
              </p>
            </div>
            <div className="space-y-4">
              <StoryFeature icon={<Award className="h-5 w-5" />} color="#F59E0B" title="XP, 레벨, 업적 36종으로 성취감을 채웁니다" desc="학습/스트릭/랭킹/소셜/히든 5카테고리의 도전 과제를 정복하세요." />
              <StoryFeature icon={<TreePine className="h-5 w-5" />} color="#F59E0B" title="노드를 잠금해제하며 지식이 확장됩니다" desc="선수 노드를 완료하면 다음 노드가 열리는 스킬트리 구조로 학습합니다." />
              <StoryFeature icon={<Target className="h-5 w-5" />} color="#F59E0B" title="일일 미션과 주간 챌린지로 루틴을 만듭니다" desc="AI 학습 코치가 매주 개인 맞춤 학습 계획을 수립합니다." />
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* ═══════════════════════════════════════════════
          숫자 강조
      ═══════════════════════════════════════════════ */}
      <FadeInSection>
        <section className="bg-gradient-to-br from-[#1e1b4b] to-[#312e81] text-white">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-6 py-16 sm:py-20 lg:grid-cols-4">
            <StatCard label="AI 기능" value={16} suffix="종" />
            <StatCard label="업적" value={36} suffix="종" />
            <StatCard label="역할 지원" value={5} suffix="자" />
            <StatCard label="페이지" value={46} suffix="개" />
          </div>
        </section>
      </FadeInSection>

      {/* ═══════════════════════════════════════════════
          5자 역할 소개
      ═══════════════════════════════════════════════ */}
      <FadeInSection>
        <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
              다섯 역할, 하나의 플랫폼
            </h2>
            <p className="mt-3 text-gray-500">각자의 역할에 최적화된 대시보드와 기능을 제공합니다</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <RoleCard icon={<GraduationCap className="h-6 w-6" />} color="#10B981" role="교사" desc="수업 자료만 올리면, AI가 나머지를 완성합니다" />
            <RoleCard icon={<BookOpen className="h-6 w-6" />} color="#4F6BF6" role="학생" desc="게임처럼 노드를 열며 성장합니다" />
            <RoleCard icon={<Shield className="h-6 w-6" />} color="#F59E0B" role="운영자" desc="학교 전체를 한 눈에 관리합니다" />
            <RoleCard icon={<Heart className="h-6 w-6" />} color="#EC4899" role="학부모" desc="자녀의 학습 여정을 실시간으로 확인합니다" />
            <RoleCard icon={<BookOpen className="h-6 w-6" />} color="#F59E0B" role="독학러" desc="혼자서도 AI와 함께 완벽한 학습을 합니다" />
          </div>
        </section>
      </FadeInSection>

      {/* ═══════════════════════════════════════════════
          하단 CTA
      ═══════════════════════════════════════════════ */}
      <FadeInSection>
        <section className="bg-gradient-to-br from-[#4F6BF6] via-[#6366F1] to-[#7C5CFC] py-20 text-white">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="mb-4 text-3xl font-extrabold sm:text-4xl">3분이면 충분합니다</h2>
            <p className="mb-10 text-base text-white/85 sm:text-lg">
              둘러보기로 주요 기능을 직접 확인하거나,
              <br className="hidden sm:block" />
              무료 계정을 만들어 나만의 스킬트리를 시작하세요.
            </p>
            <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-3 sm:flex-row">
              <button type="button" onClick={() => handleDemo('teacher')} disabled={demoLoading !== null}
                className="w-full rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-[#4F6BF6] shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl disabled:opacity-70 sm:flex-1">
                <span className="flex items-center justify-center gap-2">
                  {demoLoading === 'teacher' ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
                  교사로 둘러보기
                </span>
              </button>
              <button type="button" onClick={() => handleDemo('student')} disabled={demoLoading !== null}
                className="w-full rounded-xl bg-white/10 px-5 py-3.5 text-sm font-semibold text-white backdrop-blur border border-white/30 transition-all hover:-translate-y-0.5 hover:bg-white/20 disabled:opacity-70 sm:flex-1">
                <span className="flex items-center justify-center gap-2">
                  {demoLoading === 'student' ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
                  학생으로 둘러보기
                </span>
              </button>
              <button type="button" onClick={() => handleDemo('learner')} disabled={demoLoading !== null}
                className="w-full rounded-xl bg-white/10 px-5 py-3.5 text-sm font-semibold text-white backdrop-blur border border-white/30 transition-all hover:-translate-y-0.5 hover:bg-white/20 disabled:opacity-70 sm:flex-1">
                <span className="flex items-center justify-center gap-2">
                  {demoLoading === 'learner' ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
                  독학러로 둘러보기
                </span>
              </button>
            </div>
            <button type="button" onClick={() => handleAuthNav('/signup')}
              className="mt-6 inline-flex items-center gap-1 text-sm text-white/80 hover:text-white hover:underline">
              또는 무료 계정 만들기 <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>
      </FadeInSection>

      {/* ═══════════════════════════════════════════════
          기술 스택 뱃지
      ═══════════════════════════════════════════════ */}
      <FadeInSection>
        <section className="mx-auto max-w-4xl px-6 py-16 text-center">
          <p className="mb-6 text-xs font-bold uppercase tracking-widest text-gray-400">Built with</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <TechBadge name="Next.js 16" emoji="▲" color="from-gray-800 to-gray-900" />
            <TechBadge name="Claude Sonnet 4.6" emoji="🧠" color="from-[#CC785C] to-[#B35A3C]" />
            <TechBadge name="Supabase" emoji="⚡" color="from-[#3ECF8E] to-[#2DA673]" />
            <TechBadge name="D3.js" emoji="📊" color="from-[#F9A03C] to-[#E08928]" />
            <TechBadge name="Tailwind CSS 4" emoji="🎨" color="from-[#06B6D4] to-[#0891B2]" />
            <TechBadge name="TypeScript" emoji="🔷" color="from-[#3178C6] to-[#235A97]" />
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
              <Link href="/terms" className="transition-colors hover:text-[#6366F1]">이용약관</Link>
              <Link href="/privacy" className="transition-colors hover:text-[#6366F1]">개인정보처리방침</Link>
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-[#A855F7]" />
                Powered by Claude AI
              </span>
              <a href="https://github.com/Bidulkiya/nodebloom" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 transition-colors hover:text-[#6366F1]">
                <ExternalLink className="h-3.5 w-3.5" />GitHub
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

function FadeInSection({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => { entries.forEach(e => { if (e.isIntersecting) { setVisible(true); observer.disconnect() } }) },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={`transition-all duration-700 ease-out ${visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
      {children}
    </div>
  )
}

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
          const steps = 40
          const inc = end / steps
          let cur = 0
          const timer = setInterval(() => {
            cur += inc
            if (cur >= end) { cur = end; clearInterval(timer) }
            setCount(Math.round(cur))
          }, 30)
        }
      })
    }, { threshold: 0.5 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [end])

  return <span ref={ref}>{count}</span>
}

function StatCard({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return (
    <div className="text-center">
      <p className="text-4xl font-extrabold sm:text-5xl">
        <CountUp end={value} /><span className="text-xl sm:text-2xl">{suffix}</span>
      </p>
      <p className="mt-1 text-sm text-white/70">{label}</p>
    </div>
  )
}

function StoryFeature({ icon, color, title, desc }: { icon: React.ReactNode; color: string; title: string; desc: string }) {
  return (
    <div className="group flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md transition-transform group-hover:scale-110"
        style={{ backgroundColor: color, boxShadow: `0 6px 16px ${color}30` }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="mb-1 text-sm font-bold text-gray-900 dark:text-white">{title}</h4>
        <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">{desc}</p>
      </div>
    </div>
  )
}

function RoleCard({ icon, color, role, desc }: { icon: React.ReactNode; color: string; role: string; desc: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg"
        style={{ backgroundColor: color, boxShadow: `0 8px 24px ${color}30` }}
      >
        {icon}
      </div>
      <h3 className="text-base font-bold text-gray-900 dark:text-white">{role}</h3>
      <p className="text-xs leading-relaxed text-gray-500">{desc}</p>
    </div>
  )
}

function TechBadge({ name, emoji, color }: { name: string; emoji: string; color: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-full bg-gradient-to-r ${color} px-4 py-2 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5 hover:shadow-lg`}>
      <span className="text-base">{emoji}</span>
      <span>{name}</span>
    </div>
  )
}
