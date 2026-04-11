'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { Step } from 'react-joyride'

// react-joyride는 SSR 비호환이고 named export — dynamic import로 감싸기
const Joyride = dynamic(
  () => import('react-joyride').then(mod => mod.Joyride) as Promise<React.ComponentType<JoyrideProps>>,
  { ssr: false },
)

// Joyride props 타입 (최소 필요 필드만)
interface JoyrideProps {
  steps: Step[]
  run: boolean
  continuous?: boolean
  showSkipButton?: boolean
  showProgress?: boolean
  scrollToFirstStep?: boolean
  disableOverlayClose?: boolean
  callback?: (data: { status: string }) => void
  styles?: Record<string, unknown>
  locale?: Record<string, string>
  floaterProps?: Record<string, unknown>
}

/**
 * 데모 모드 인터랙티브 가이드 (React Joyride).
 *
 * DemoTutorial(카드 팝업)이 끝난 후 1초 뒤에 자동 시작.
 * 화면의 실제 요소를 spotlight + 말풍선으로 안내한다.
 *
 * localStorage에 완료 플래그 저장 → 같은 세션 재표시 방지.
 *
 * 주의: 사이드바 메뉴 항목에 data-tour-* 속성이 필요하다.
 * Sidebar.tsx에서 각 메뉴 항목에 `data-tour={item.key}` 를 추가해야 한다.
 */

interface Props {
  role: 'student' | 'teacher' | 'learner'
}

// ============================================
// 단계 정의
// ============================================

const STUDENT_STEPS: Step[] = [
  {
    target: '[data-tour="skill-tree"]',
    content: '여기서 수업별 스킬트리를 확인할 수 있어요. 노드를 클릭하면 퀴즈, 학습 문서, AI 튜터를 이용할 수 있어요!',
    title: '📚 내 학습',
    placement: 'right',
  },
  {
    target: '[data-tour="achievements"]',
    content: '퀴즈를 풀면 XP와 업적을 얻을 수 있어요! 일일 미션도 도전해보세요.',
    title: '🏆 업적',
    placement: 'right',
  },
  {
    target: '[data-tour="tutor"]',
    content: '모르는 게 있으면 AI 튜터에게 질문하세요. 소크라틱 방식으로 스스로 답을 찾도록 도와줘요!',
    title: '🤖 AI 튜터',
    placement: 'right',
  },
  {
    target: '[data-tour="wrong-answers"]',
    content: '틀린 문제는 오답 노트에서 다시 풀어볼 수 있어요. 약점을 집중 공략하세요!',
    title: '📝 오답 노트',
    placement: 'right',
  },
  {
    target: '[data-tour="messages"]',
    content: '선생님이나 친구에게 메시지를 보낼 수 있어요.',
    title: '✉️ 메시지',
    placement: 'right',
  },
]

const TEACHER_STEPS: Step[] = [
  {
    target: '[data-tour="skill-tree"]',
    content: 'PDF를 업로드하면 AI가 스킬트리, 퀴즈, 학습 문서를 자동으로 만들어줘요!',
    title: '🌲 스킬트리 관리',
    placement: 'right',
  },
  {
    target: '[data-tour="recording"]',
    content: '수업을 녹음하면 AI가 전사 + 요약 + 스킬트리/퀴즈 자동 생성을 해줘요.',
    title: '🎙️ 수업 녹음',
    placement: 'right',
  },
  {
    target: '[data-tour="quizzes"]',
    content: '클래스별, 노드별로 퀴즈를 관리할 수 있어요. AI가 자동 생성한 퀴즈를 수정할 수도 있습니다.',
    title: '📋 퀴즈 관리',
    placement: 'right',
  },
  {
    target: '[data-tour="classes"]',
    content: '학생들의 진도, 감정 상태, 이탈 위험을 실시간으로 확인하세요.',
    title: '👥 내 클래스',
    placement: 'right',
  },
  {
    target: '[data-tour="messages"]',
    content: '학생이나 학부모에게 메시지를 보낼 수 있어요.',
    title: '✉️ 메시지',
    placement: 'right',
  },
]

const LEARNER_STEPS: Step[] = [
  {
    target: '[data-tour="skill-tree"]',
    content: 'PDF를 업로드하면 AI가 나만의 스킬트리를 만들어줘요. 직접 퀴즈를 풀며 학습할 수 있어요!',
    title: '📚 내 스킬트리',
    placement: 'right',
  },
  {
    target: '[data-tour="recording"]',
    content: '강의를 녹음하면 AI가 핵심 내용을 추출해서 스킬트리나 퀴즈를 만들어줘요.',
    title: '🎙️ 녹음으로 만들기',
    placement: 'right',
  },
  {
    target: '[data-tour="achievements"]',
    content: '퀴즈를 풀면 XP와 업적을 얻을 수 있어요. 혼자서도 동기부여!',
    title: '🏆 업적',
    placement: 'right',
  },
]

// ============================================
// 스타일
// ============================================

const joyrideStyles = {
  options: {
    primaryColor: '#6366F1',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    overlayColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 10000,
    arrowColor: '#ffffff',
  },
  tooltipContainer: {
    textAlign: 'left' as const,
  },
  buttonNext: {
    backgroundColor: '#6366F1',
    borderRadius: '8px',
    fontSize: '13px',
    padding: '8px 16px',
  },
  buttonBack: {
    color: '#6B7280',
    fontSize: '13px',
  },
  buttonSkip: {
    color: '#9CA3AF',
    fontSize: '12px',
  },
  tooltip: {
    borderRadius: '12px',
    padding: '20px',
  },
}

// ============================================
// 컴포넌트
// ============================================

export function DemoJoyrideGuide({ role }: Props) {
  const [run, setRun] = useState(false)
  const storageKey = `nodebloom_joyride_shown_${role}`

  // 카드 튜토리얼 완료 후 1초 뒤 시작
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof localStorage === 'undefined') return
    if (localStorage.getItem(storageKey)) return

    // DemoTutorial 카드가 닫힌 후에 시작하도록 딜레이
    const timer = setTimeout(() => {
      // 카드 튜토리얼이 이미 표시되었는지 확인
      const tutorialShown = localStorage.getItem(`nodebloom_tutorial_shown_${role}`)
      if (tutorialShown) {
        setRun(true)
      }
    }, 2000) // 카드 튜토리얼 표시 시간 + 여유

    return () => clearTimeout(timer)
  }, [storageKey, role])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleCallback = (data: { status: string }): void => {
    const { status } = data
    const finishedStatuses: string[] = ['finished', 'skipped']

    if (finishedStatuses.includes(status)) {
      setRun(false)
      localStorage.setItem(storageKey, 'true')
    }
  }

  const steps = role === 'student'
    ? STUDENT_STEPS
    : role === 'teacher'
    ? TEACHER_STEPS
    : LEARNER_STEPS

  if (!run) return null

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep
      disableOverlayClose={false}
      callback={handleCallback}
      styles={joyrideStyles}
      locale={{
        back: '이전',
        close: '닫기',
        last: '완료',
        next: '다음',
        skip: '건너뛰기',
      }}
      floaterProps={{
        disableAnimation: false,
      }}
    />
  )
}
