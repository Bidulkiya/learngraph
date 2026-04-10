'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { markReviewCompleted } from '@/actions/reminders'
import { toast } from 'sonner'

/**
 * 복습 항목의 액션 버튼 — "복습하기" + "복습 완료 ✓"
 */
interface Props {
  reviewId: string
  nodeId: string
}

export function ReviewItemActions({ reviewId, nodeId }: Props) {
  const [completed, setCompleted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleComplete = async (): Promise<void> => {
    setLoading(true)
    const res = await markReviewCompleted(reviewId)
    setLoading(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    setCompleted(true)
    toast.success('복습 완료! 다음 복습 일정이 자동 조정됩니다.')
  }

  if (completed) {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600">
        <Check className="h-3.5 w-3.5" />
        완료
      </span>
    )
  }

  return (
    <div className="flex gap-1.5">
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs text-green-600 hover:bg-green-50 hover:text-green-700"
        onClick={handleComplete}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="mr-0.5 h-3 w-3" />}
        완료
      </Button>
      <Link href={`/student/quiz/${nodeId}`}>
        <Button size="sm" variant="outline" className="h-7 text-xs">
          복습
        </Button>
      </Link>
    </div>
  )
}
