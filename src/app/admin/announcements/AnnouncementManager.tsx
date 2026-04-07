'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Megaphone, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { createAnnouncement, type Announcement } from '@/actions/announcements'
import { toast } from 'sonner'

interface School {
  id: string
  name: string
}

interface Props {
  schools: School[]
  announcements: Announcement[]
}

export function AnnouncementManager({ schools, announcements }: Props) {
  const router = useRouter()
  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [targetRole, setTargetRole] = useState<'all' | 'teacher' | 'student'>('all')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!schoolId || !title.trim() || !content.trim()) return
    setSubmitting(true)
    const res = await createAnnouncement(schoolId, title.trim(), content.trim(), targetRole)
    setSubmitting(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success('공지사항 등록 완료')
    setTitle('')
    setContent('')
    router.refresh()
  }

  const roleLabel: Record<string, string> = {
    all: '전체',
    teacher: '교사',
    student: '학생',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
          <Megaphone className="h-6 w-6 text-[#F59E0B]" />
          공지사항
        </h1>
        <p className="mt-1 text-gray-500">스쿨 구성원에게 공지를 전달하세요</p>
      </div>

      {/* 작성 폼 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4 text-[#F59E0B]" />
            새 공지 작성
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label>스쿨</Label>
              <select
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
                {schools.length === 0 && <option value="">먼저 스쿨을 만드세요</option>}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">제목</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="공지 제목"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">내용</Label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="공지 내용"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>대상</Label>
              <div className="flex gap-2">
                {(['all', 'teacher', 'student'] as const).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setTargetRole(r)}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${
                      targetRole === r
                        ? 'border-[#F59E0B] bg-[#F59E0B]/10 text-[#F59E0B]'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {roleLabel[r]}
                  </button>
                ))}
              </div>
            </div>
            <Button
              type="submit"
              disabled={submitting || schools.length === 0}
              className="bg-[#F59E0B] hover:bg-[#F59E0B]/90"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              공지 등록
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 기존 공지 목록 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">내가 쓴 공지 ({announcements.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">아직 등록된 공지가 없습니다</p>
          ) : (
            <ul className="space-y-2">
              {announcements.map(a => (
                <li
                  key={a.id}
                  className="rounded-lg border p-3 text-sm dark:border-gray-800"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{a.title}</p>
                    <Badge variant="secondary" className="text-xs">
                      {roleLabel[a.target_role]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">{a.content}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(a.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
