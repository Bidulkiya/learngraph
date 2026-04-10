'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { clearLearningStyle } from '@/actions/learning-style'
import { toast } from 'sonner'

/**
 * 학습 스타일 재진단 버튼.
 *
 * 데모 계정: 클릭 시 토스트만 표시 (체험 모드에서 재진단 불가)
 * 일반 계정: learning_style null로 초기화 후 /student/onboarding으로 이동
 *
 * 배경: /student/onboarding 페이지는 profile.learning_style이 이미 있으면
 * /student로 리디렉트하므로, 재진단하려면 먼저 값을 null로 초기화해야 한다.
 */
interface Props {
  isDemo: boolean
}

export function RediagnoseButton({ isDemo }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleClick = async (): Promise<void> => {
    if (isDemo) {
      toast.error('둘러보기 모드에서는 학습 스타일 재진단을 할 수 없습니다. 회원가입 후 이용해주세요!')
      return
    }

    setLoading(true)
    const res = await clearLearningStyle()
    setLoading(false)

    if (res.error) {
      toast.error(res.error)
      return
    }

    router.push('/student/onboarding')
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-xs text-gray-500 hover:text-[#4F6BF6]"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
      재진단
    </Button>
  )
}
