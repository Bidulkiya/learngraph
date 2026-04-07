'use client'

import { useState } from 'react'
import { School as SchoolIcon, Loader2, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { joinSchoolAsTeacher } from '@/actions/school'
import { toast } from 'sonner'

export default function TeacherJoinPage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)

    const res = await joinSchoolAsTeacher(code)
    if (res.error || !res.data) {
      toast.error(res.error ?? '가입에 실패했습니다')
      setLoading(false)
      return
    }

    toast.success(`${res.data.schoolName}에 가입했습니다`)
    // full navigation — router.push + refresh 조합의 race condition 회피
    window.location.href = '/teacher'
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 py-8">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-[#10B981]/10">
            <SchoolIcon className="h-6 w-6 text-[#10B981]" />
          </div>
          <CardTitle>스쿨 가입</CardTitle>
          <CardDescription>운영자에게 받은 교사 초대 코드를 입력하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">교사 코드</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABCD1234"
                  className="pl-9 font-mono uppercase tracking-wider"
                  maxLength={8}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={!code.trim() || loading}
              className="w-full bg-[#10B981] hover:bg-[#10B981]/90"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              스쿨 가입
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
