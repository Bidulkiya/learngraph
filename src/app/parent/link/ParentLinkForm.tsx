'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { linkParentToStudent } from '@/actions/parent'
import { toast } from 'sonner'

export function ParentLinkForm() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [linkedName, setLinkedName] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (code.length !== 6) {
      toast.error('6자리 코드를 정확히 입력해주세요')
      return
    }
    setLoading(true)
    const res = await linkParentToStudent(code)
    setLoading(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    if (res.data) {
      setLinkedName(res.data.student_name)
      toast.success(`${res.data.student_name} 자녀와 연결되었습니다`)
      setTimeout(() => {
        router.push('/parent')
      }, 1500)
    }
  }

  if (linkedName) {
    return (
      <Card className="text-center">
        <CardHeader>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-7 w-7 text-green-600" />
          </div>
          <CardTitle>연결 성공!</CardTitle>
          <CardDescription>
            <strong>{linkedName}</strong> 자녀와 연결되었습니다
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-pink-500" />
          자녀 연결
        </CardTitle>
        <CardDescription>
          자녀의 LearnGraph 앱 대시보드에서 <strong>&ldquo;학부모 초대 코드&rdquo;</strong>를 생성한 뒤 여기에 입력해주세요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">6자리 초대 코드</Label>
            <Input
              id="code"
              placeholder="예: A7X9K2"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              maxLength={6}
              className="text-center text-2xl tracking-[0.5em] font-mono"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full bg-pink-500 hover:bg-pink-500/90"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            연결하기
          </Button>
          <p className="text-center text-xs text-gray-500">
            코드는 48시간 동안 유효합니다
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
