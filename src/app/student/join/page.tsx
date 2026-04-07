'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, Loader2, BookOpen, CheckCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { joinWithCode, requestClassEnrollment, type SchoolClass } from '@/actions/school'
import { toast } from 'sonner'

type Step = 'code' | 'class-select' | 'pending'

export default function StudentJoinPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('code')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [schoolName, setSchoolName] = useState('')
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [enrolling, setEnrolling] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)

    const res = await joinWithCode(code)
    if (res.error || !res.data) {
      toast.error(res.error ?? '가입에 실패했습니다')
      setLoading(false)
      return
    }

    if (res.data.type === 'school') {
      setSchoolName(res.data.schoolName ?? '')
      setClasses(res.data.classes ?? [])
      setStep('class-select')
      toast.success(`${res.data.schoolName} 가입 완료`)
    } else if (res.data.type === 'class') {
      toast.success(`${res.data.className} 수강신청 완료. 승인을 기다려주세요`)
      setStep('pending')
    }
    setLoading(false)
  }

  const handleEnroll = async (classId: string): Promise<void> => {
    setEnrolling(classId)
    const res = await requestClassEnrollment(classId)
    if (res.error) {
      toast.error(res.error)
      setEnrolling(null)
      return
    }
    toast.success('수강신청 완료. 교사 승인을 기다려주세요')
    setEnrolling(null)
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 py-4">
      {step === 'code' && (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-[#4F6BF6]/10">
              <KeyRound className="h-6 w-6 text-[#4F6BF6]" />
            </div>
            <CardTitle>코드로 가입하기</CardTitle>
            <CardDescription>스쿨 코드 또는 클래스 코드를 입력하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">초대 코드</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABCD1234"
                  className="font-mono uppercase tracking-wider"
                  maxLength={8}
                  required
                />
                <p className="text-xs text-gray-500">
                  스쿨 코드: 즉시 가입 후 클래스 선택 / 클래스 코드: 운영자 승인 필요
                </p>
              </div>

              <Button
                type="submit"
                disabled={!code.trim() || loading}
                className="w-full bg-[#4F6BF6] hover:bg-[#4F6BF6]/90"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                가입하기
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 'class-select' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-[#10B981]" />
              <CardTitle className="text-base">{schoolName} 가입 완료</CardTitle>
            </div>
            <CardDescription>수강할 클래스를 선택하세요. 교사의 승인이 필요합니다</CardDescription>
          </CardHeader>
          <CardContent>
            {classes.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">
                아직 개설된 클래스가 없습니다
              </p>
            ) : (
              <ul className="space-y-2">
                {classes.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border p-3 dark:border-gray-800"
                  >
                    <div>
                      <p className="font-medium">{c.name}</p>
                      {c.description && <p className="text-xs text-gray-500">{c.description}</p>}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleEnroll(c.id)}
                      disabled={enrolling === c.id}
                      className="bg-[#4F6BF6] hover:bg-[#4F6BF6]/90"
                    >
                      {enrolling === c.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        '신청'
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => router.push('/student')}
            >
              대시보드로 이동
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'pending' && (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100 dark:bg-yellow-950/30">
              <BookOpen className="h-6 w-6 text-[#F59E0B]" />
            </div>
            <CardTitle>승인 대기 중</CardTitle>
            <CardDescription>운영자/교사가 가입을 검토하고 있습니다</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="mx-auto block w-fit bg-yellow-100 text-yellow-700">
              승인 후 스킬트리에 접근할 수 있습니다
            </Badge>
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => router.push('/student')}
            >
              대시보드로 이동
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
