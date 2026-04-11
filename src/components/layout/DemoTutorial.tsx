'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  TreePine,
  Bot,
  Trophy,
  Rocket,
  FileText,
  Users,
  BarChart3,
  Upload,
  Mic,
  ArrowRight,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { LogoSymbol } from '@/components/Logo'
import { createBrowserClient } from '@/lib/supabase/client'

/**
 * 데모 모드 튜토리얼 팝업.
 *
 * sessionStorage에 'demo_tutorial_shown_{role}' 플래그를 저장하여
 * 같은 세션 내에서 재표시를 방지한다. 탭을 닫으면 초기화.
 *
 * 디자인: 카드 슬라이드 + 하단 진행 점 + "다음"/"시작하기" 버튼.
 */

interface TutorialStep {
  icon: React.ReactNode
  title: string
  description: string
  detail?: string
}

// ============================================
// 학생 튜토리얼 단계
// ============================================

const STUDENT_STEPS: TutorialStep[] = [
  {
    icon: <LogoSymbol size={64} />,
    title: 'NodeBloom에 오신 것을 환영합니다! 🌸',
    description: 'AI가 만든 스킬트리로 게임처럼 배우는 교육 플랫폼입니다.',
    detail: '간단히 둘러볼게요!',
  },
  {
    icon: <TreePine className="h-16 w-16 text-[#10B981]" />,
    title: '수업 내용이 스킬트리로 정리됩니다',
    description:
      '노드를 하나씩 잠금해제하며 학습해요. 퀴즈를 풀면 다음 노드가 열립니다!',
    detail: "'내 학습' 메뉴에서 확인해보세요.",
  },
  {
    icon: <Bot className="h-16 w-16 text-[#6366F1]" />,
    title: '모르는 게 있으면 AI 튜터에게 물어보세요',
    description:
      '각 노드마다 AI가 만든 학습 문서와 플래시카드가 준비되어 있어요.',
    detail: '소크라틱 방식으로 스스로 답을 찾도록 도와줍니다.',
  },
  {
    icon: <Trophy className="h-16 w-16 text-[#F59E0B]" />,
    title: '퀴즈를 풀면 XP를 얻고, 레벨이 올라갑니다!',
    description:
      '일일 미션, 주간 챌린지, 업적을 달성하며 학습 동기를 유지하세요.',
    detail: '랭킹에서 친구들과 경쟁할 수도 있어요! 🏆',
  },
  {
    icon: <Rocket className="h-16 w-16 text-[#A855F7]" />,
    title: '준비되셨나요?',
    description:
      '둘러보기 모드에서는 구경만 가능합니다.',
    detail:
      '직접 스킬트리를 만들고 퀴즈를 풀어보려면 회원가입하세요!',
  },
]

// ============================================
// 교사 튜토리얼 단계
// ============================================

const TEACHER_STEPS: TutorialStep[] = [
  {
    icon: <LogoSymbol size={64} />,
    title: '교사 둘러보기 모드에 오신 것을 환영합니다! 📚',
    description:
      'AI가 수업 자료를 분석해서 커리큘럼을 자동으로 만들어드립니다.',
    detail: '어떤 기능이 있는지 살펴볼게요!',
  },
  {
    icon: (
      <div className="flex gap-2">
        <Upload className="h-12 w-12 text-[#4F6BF6]" />
        <Mic className="h-12 w-12 text-[#7C5CFC]" />
      </div>
    ),
    title: 'PDF 업로드 또는 수업 녹음',
    description:
      'AI가 개념 간 관계를 분석해서 스킬트리를 자동 생성합니다.',
    detail: '퀴즈와 학습 문서까지 한 번에!',
  },
  {
    icon: (
      <div className="flex gap-2">
        <Users className="h-12 w-12 text-[#10B981]" />
        <BarChart3 className="h-12 w-12 text-[#F59E0B]" />
      </div>
    ),
    title: '학생 관리 + AI 인사이트',
    description:
      '학생들의 진도, 감정 상태, 이탈 위험을 실시간으로 파악하세요.',
    detail: 'AI가 주간 브리핑을 자동으로 만들어줍니다.',
  },
  {
    icon: <Rocket className="h-16 w-16 text-[#A855F7]" />,
    title: '준비되셨나요?',
    description: '둘러보기만 가능한 모드입니다.',
    detail: '직접 사용해보려면 회원가입하세요!',
  },
]

// ============================================
// 독학러 튜토리얼 단계
// ============================================

const LEARNER_STEPS: TutorialStep[] = [
  {
    icon: <LogoSymbol size={64} />,
    title: '독학러 모드에 오신 것을 환영합니다! 📖',
    description:
      'PDF를 업로드하면 AI가 스킬트리를 만들어주고, 직접 퀴즈를 풀며 학습할 수 있어요.',
    detail: '대학생, 직장인, 자격증 준비생에게 딱!',
  },
  {
    icon: <TreePine className="h-16 w-16 text-[#8B5CF6]" />,
    title: 'PDF로 나만의 스킬트리를 만드세요',
    description:
      '학습 자료를 업로드하면 AI가 개념 간 관계를 분석해서 스킬트리를 자동 생성합니다.',
    detail: '퀴즈와 학습 문서도 AI가 만들어줘요!',
  },
  {
    icon: <Trophy className="h-16 w-16 text-[#F59E0B]" />,
    title: '혼자서도 게이미피케이션!',
    description:
      'XP, 레벨, 스트릭, 업적으로 학습 동기를 유지하세요.',
    detail: '주간 학습 플랜과 복습 알림도 제공돼요.',
  },
  {
    icon: <Rocket className="h-16 w-16 text-[#A855F7]" />,
    title: '준비되셨나요?',
    description: '둘러보기만 가능한 모드입니다.',
    detail: '직접 사용해보려면 회원가입하세요!',
  },
]

// ============================================
// 메인 컴포넌트
// ============================================

interface Props {
  role: 'student' | 'teacher' | 'learner'
}

export function DemoTutorial({ role }: Props) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  const steps = role === 'student'
    ? STUDENT_STEPS
    : role === 'teacher'
    ? TEACHER_STEPS
    : LEARNER_STEPS
  const storageKey = `demo_tutorial_shown_${role}`

  // 첫 진입 시에만 자동 표시 (sessionStorage 플래그 체크)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof sessionStorage === 'undefined') return
    if (sessionStorage.getItem(storageKey)) return
    // 약간의 딜레이 — 대시보드 로드 후 자연스럽게
    const timer = setTimeout(() => {
      setOpen(true)
      sessionStorage.setItem(storageKey, 'true')
    }, 800)
    return () => clearTimeout(timer)
  }, [storageKey])
  /* eslint-enable react-hooks/set-state-in-effect */

  const isLastStep = step === steps.length - 1
  const currentStep = steps[step]

  const handleNext = (): void => {
    if (isLastStep) {
      setOpen(false)
    } else {
      setStep(s => s + 1)
    }
  }

  const handleSignup = async (): Promise<void> => {
    try {
      const supabase = createBrowserClient()
      await supabase.auth.signOut()
    } catch {
      // OK
    }
    window.location.href = '/signup'
  }

  const handleClose = (): void => {
    setOpen(false)
    setStep(0)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent
        className="overflow-hidden border-0 bg-transparent p-0 shadow-none sm:max-w-md [&>button]:hidden"
        showCloseButton={false}
      >
        <div className="relative overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
          {/* 상단 그라데이션 배경 */}
          <div className="relative flex h-52 items-center justify-center bg-gradient-to-br from-[#6366F1] via-[#7C5CFC] to-[#A855F7]">
            {/* 장식 원 */}
            <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

            {/* 닫기 버튼 */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-3 top-3 rounded-full bg-white/20 p-1.5 text-white/80 backdrop-blur transition-colors hover:bg-white/30 hover:text-white"
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </button>

            {/* 아이콘 — 반투명 흰색 원형 배경으로 대비 확보 */}
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white/20 shadow-lg backdrop-blur-sm">
              <div className="text-white drop-shadow-lg">
                {currentStep.icon}
              </div>
            </div>
          </div>

          {/* 컨텐츠 */}
          <div className="px-6 pb-6 pt-5">
            <h2 className="text-center text-lg font-bold text-gray-900 dark:text-white">
              {currentStep.title}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-300">
              {currentStep.description}
            </p>
            {currentStep.detail && (
              <p className="mt-1.5 text-center text-xs text-gray-500 dark:text-gray-400">
                {currentStep.detail}
              </p>
            )}

            {/* 진행 점 */}
            <div className="mt-5 flex items-center justify-center gap-1.5">
              {steps.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStep(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === step
                      ? 'w-6 bg-[#6366F1]'
                      : 'w-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600'
                  }`}
                  aria-label={`${i + 1}단계`}
                />
              ))}
            </div>

            {/* 버튼 */}
            <div className="mt-5 flex gap-2">
              {isLastStep ? (
                <>
                  <Button
                    onClick={handleClose}
                    className="flex-1 bg-[#6366F1] hover:bg-[#6366F1]/90"
                  >
                    시작하기
                  </Button>
                  <Button
                    onClick={handleSignup}
                    variant="outline"
                    className="flex-1 border-[#6366F1]/40 text-[#6366F1] hover:bg-[#6366F1]/5"
                  >
                    회원가입
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={handleClose}
                    className="text-gray-500"
                  >
                    건너뛰기
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="flex-1 bg-[#6366F1] hover:bg-[#6366F1]/90"
                  >
                    다음
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
