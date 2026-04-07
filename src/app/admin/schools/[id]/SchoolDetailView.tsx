'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  School as SchoolIcon,
  Copy,
  Check,
  GraduationCap,
  Users,
  Plus,
  UserCheck,
  UserX,
  TreePine,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  approveSchoolMember,
  rejectSchoolMember,
  approveEnrollment,
  rejectEnrollment,
  createClass,
  type SchoolDetailData,
} from '@/actions/school'
import { toast } from 'sonner'

export function SchoolDetailView({ detail }: { detail: SchoolDetailData }) {
  const router = useRouter()
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [classDialogOpen, setClassDialogOpen] = useState(false)
  const [className, setClassName] = useState('')
  const [classDesc, setClassDesc] = useState('')
  const [classTeacherId, setClassTeacherId] = useState('')
  const [creating, setCreating] = useState(false)

  const copyCode = (code: string): void => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success('코드가 복사되었습니다')
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleApproveMember = async (userId: string): Promise<void> => {
    const res = await approveSchoolMember(detail.school.id, userId)
    if (res.error) toast.error(res.error)
    else {
      toast.success('승인 완료')
      router.refresh()
    }
  }

  const handleRejectMember = async (userId: string): Promise<void> => {
    const res = await rejectSchoolMember(detail.school.id, userId)
    if (res.error) toast.error(res.error)
    else {
      toast.success('거절 완료')
      router.refresh()
    }
  }

  const handleApproveEnrollment = async (enrollmentId: string): Promise<void> => {
    const res = await approveEnrollment(enrollmentId)
    if (res.error) toast.error(res.error)
    else {
      toast.success('수강신청 승인 완료')
      router.refresh()
    }
  }

  const handleRejectEnrollment = async (enrollmentId: string): Promise<void> => {
    const res = await rejectEnrollment(enrollmentId)
    if (res.error) toast.error(res.error)
    else {
      toast.success('수강신청 거절 완료')
      router.refresh()
    }
  }

  const handleCreateClass = async (): Promise<void> => {
    if (!className.trim() || !classTeacherId) return
    setCreating(true)
    const res = await createClass(detail.school.id, className.trim(), classDesc.trim(), classTeacherId)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('클래스가 생성되었습니다')
      setClassDialogOpen(false)
      setClassName('')
      setClassDesc('')
      setClassTeacherId('')
      router.refresh()
    }
    setCreating(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/schools">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
            <SchoolIcon className="h-5 w-5 text-[#F59E0B]" />
            {detail.school.name}
          </h1>
          {detail.school.description && (
            <p className="text-sm text-gray-500">{detail.school.description}</p>
          )}
        </div>
      </div>

      {/* Codes */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between pt-5">
            <div>
              <p className="text-xs text-gray-500">교사 초대 코드</p>
              <p className="font-mono text-lg font-bold text-[#10B981]">
                {detail.school.teacher_code}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyCode(detail.school.teacher_code)}
            >
              {copiedCode === detail.school.teacher_code ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between pt-5">
            <div>
              <p className="text-xs text-gray-500">학생 초대 코드</p>
              <p className="font-mono text-lg font-bold text-[#4F6BF6]">
                {detail.school.student_code}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyCode(detail.school.student_code)}
            >
              {copiedCode === detail.school.student_code ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Classes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TreePine className="h-4 w-4 text-[#10B981]" />
            클래스 ({detail.classes.length})
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setClassDialogOpen(true)}
            disabled={detail.teachers.length === 0}
            className="bg-[#10B981] hover:bg-[#10B981]/90"
          >
            <Plus className="mr-1 h-4 w-4" />
            클래스 만들기
          </Button>
        </CardHeader>
        <CardContent>
          {detail.classes.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              {detail.teachers.length === 0
                ? '먼저 교사를 초대한 후 클래스를 만드세요'
                : '아직 클래스가 없습니다'}
            </p>
          ) : (
            <ul className="space-y-2">
              {detail.classes.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm dark:border-gray-800"
                >
                  <div className="flex-1">
                    <p className="font-medium">{c.name}</p>
                    {c.description && <p className="text-xs text-gray-500">{c.description}</p>}
                  </div>
                  {c.class_code && (
                    <Badge variant="secondary" className="font-mono">
                      {c.class_code}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Pending members */}
      {detail.pendingMembers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">가입 대기 ({detail.pendingMembers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {detail.pendingMembers.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border bg-yellow-50 p-3 text-sm dark:border-gray-800 dark:bg-yellow-950/30"
                >
                  <div>
                    <span className="font-medium">{m.name}</span>
                    <span className="ml-2 text-gray-500">{m.email}</span>
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {m.role === 'teacher' ? '교사' : '학생'}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      onClick={() => handleApproveMember(m.id)}
                      className="bg-[#10B981] hover:bg-[#10B981]/90"
                    >
                      <UserCheck className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleRejectMember(m.id)}>
                      <UserX className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Pending enrollments */}
      {detail.pendingEnrollments.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              수강신청 대기 ({detail.pendingEnrollments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {detail.pendingEnrollments.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between rounded-lg border bg-yellow-50 p-3 text-sm dark:border-gray-800 dark:bg-yellow-950/30"
                >
                  <div>
                    <span className="font-medium">{e.student_name}</span>
                    <span className="ml-2 text-gray-500">→ {e.class_name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      onClick={() => handleApproveEnrollment(e.id)}
                      className="bg-[#10B981] hover:bg-[#10B981]/90"
                    >
                      <UserCheck className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRejectEnrollment(e.id)}
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Members */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-4 w-4 text-[#10B981]" />
              교사 ({detail.teachers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {detail.teachers.length === 0 ? (
              <p className="py-2 text-sm text-gray-400">아직 가입한 교사가 없습니다</p>
            ) : (
              <ul className="space-y-1.5">
                {detail.teachers.map((t) => (
                  <li key={t.id} className="text-sm">
                    <span className="font-medium">{t.name}</span>
                    <span className="ml-2 text-gray-500">{t.email}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-[#4F6BF6]" />
              학생 ({detail.students.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {detail.students.length === 0 ? (
              <p className="py-2 text-sm text-gray-400">아직 가입한 학생이 없습니다</p>
            ) : (
              <ul className="space-y-1.5">
                {detail.students.map((s) => (
                  <li key={s.id} className="text-sm">
                    <span className="font-medium">{s.name}</span>
                    <span className="ml-2 text-gray-500">{s.email}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create class dialog */}
      <Dialog open={classDialogOpen} onOpenChange={setClassDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 클래스 만들기</DialogTitle>
            <DialogDescription>스쿨 내에 새로운 클래스를 추가합니다</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="class-name">클래스 이름</Label>
              <Input
                id="class-name"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="예: 1학년 1반"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-desc">설명</Label>
              <Input
                id="class-desc"
                value={classDesc}
                onChange={(e) => setClassDesc(e.target.value)}
                placeholder="(선택사항)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-teacher">담당 교사</Label>
              <select
                id="class-teacher"
                value={classTeacherId}
                onChange={(e) => setClassTeacherId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">교사 선택...</option>
                {detail.teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setClassDialogOpen(false)} size="sm">
              취소
            </Button>
            <Button
              onClick={handleCreateClass}
              disabled={!className.trim() || !classTeacherId || creating}
              size="sm"
              className="bg-[#10B981] hover:bg-[#10B981]/90"
            >
              생성
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
