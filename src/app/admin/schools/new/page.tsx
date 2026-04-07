'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, School as SchoolIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createSchool } from '@/actions/school'
import { toast } from 'sonner'

export default function NewSchoolPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)

    const res = await createSchool(name.trim(), description.trim())
    if (res.error || !res.data) {
      toast.error(res.error ?? '스쿨 생성에 실패했습니다')
      setSubmitting(false)
      return
    }

    toast.success('스쿨이 생성되었습니다')
    router.push(`/admin/schools/${res.data.id}`)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin/schools">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">새 스쿨 만들기</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <SchoolIcon className="h-4 w-4 text-[#F59E0B]" />
            스쿨 정보
          </CardTitle>
          <CardDescription>스쿨 생성 시 교사/학생 초대 코드가 자동 발급됩니다</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">스쿨 이름</Label>
              <Input
                id="name"
                placeholder="예: 서울중학교 1학년"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="스쿨에 대한 간단한 설명"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <Button
              type="submit"
              disabled={!name.trim() || submitting}
              className="w-full bg-[#F59E0B] hover:bg-[#F59E0B]/90"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              스쿨 생성
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
