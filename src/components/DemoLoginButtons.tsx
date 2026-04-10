'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, BookOpen, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { loginAsDemo } from '@/actions/school'
import { toast } from 'sonner'

export function DemoLoginButtons() {
  const router = useRouter()
  const [loading, setLoading] = useState<'teacher' | 'student' | null>(null)

  const handleDemo = async (role: 'teacher' | 'student'): Promise<void> => {
    setLoading(role)
    const res = await loginAsDemo(role)
    if (res.error || !res.data) {
      toast.error(res.error ?? '데모 로그인 실패')
      setLoading(null)
      return
    }
    // window.location으로 full navigation — 쿠키 확실히 전달
    window.location.href = res.data.redirect
  }

  return (
    <div className="grid w-full grid-cols-2 gap-3">
      <Button
        onClick={() => handleDemo('teacher')}
        disabled={loading !== null}
        className="bg-[#10B981] hover:bg-[#10B981]/90"
      >
        {loading === 'teacher' ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <GraduationCap className="mr-2 h-4 w-4" />
        )}
        교사로 둘러보기
      </Button>
      <Button
        onClick={() => handleDemo('student')}
        disabled={loading !== null}
        className="bg-[#4F6BF6] hover:bg-[#4F6BF6]/90"
      >
        {loading === 'student' ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <BookOpen className="mr-2 h-4 w-4" />
        )}
        학생으로 둘러보기
      </Button>
    </div>
  )
}
