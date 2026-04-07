'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, Users, UserCheck, UserX, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { getClassEnrollments, approveEnrollment, rejectEnrollment } from '@/actions/school'
import { toast } from 'sonner'

interface Enrollment {
  id: string
  student_id: string
  student_name: string
  student_email: string
  status: string
  requested_at: string
}

export function ClassCardActions({ classId, classCode }: { classId: string; classCode: string }) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(false)

  const copyCode = (): void => {
    if (!classCode) return
    navigator.clipboard.writeText(classCode)
    setCopied(true)
    toast.success('클래스 코드가 복사되었습니다')
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getClassEnrollments(classId).then((res) => {
      setEnrollments(res.data ?? [])
      setLoading(false)
    })
  }, [open, classId])

  const handleApprove = async (id: string): Promise<void> => {
    const res = await approveEnrollment(id)
    if (res.error) toast.error(res.error)
    else {
      toast.success('수강신청 승인')
      const updated = await getClassEnrollments(classId)
      setEnrollments(updated.data ?? [])
      router.refresh()
    }
  }

  const handleReject = async (id: string): Promise<void> => {
    const res = await rejectEnrollment(id)
    if (res.error) toast.error(res.error)
    else {
      toast.success('수강신청 거절')
      const updated = await getClassEnrollments(classId)
      setEnrollments(updated.data ?? [])
    }
  }

  const pending = enrollments.filter((e) => e.status === 'pending')

  return (
    <div className="flex flex-col gap-2">
      {classCode && (
        <div className="flex items-center justify-between rounded-lg border bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">클래스 코드</span>
            <span className="font-mono text-sm font-bold">{classCode}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyCode}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      )}
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="w-full">
        <Users className="mr-1 h-4 w-4" />
        수강신청 관리
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>수강신청 관리</DialogTitle>
            <DialogDescription>학생들의 수강신청을 승인하거나 거절하세요</DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#4F6BF6]" />
            </div>
          ) : pending.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">대기 중인 신청이 없습니다</p>
          ) : (
            <ul className="space-y-2 py-2">
              {pending.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between rounded-lg border bg-yellow-50 p-3 text-sm dark:border-gray-800 dark:bg-yellow-950/30"
                >
                  <div>
                    <p className="font-medium">{e.student_name}</p>
                    <p className="text-xs text-gray-500">{e.student_email}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(e.id)}
                      className="bg-[#10B981] hover:bg-[#10B981]/90"
                    >
                      <UserCheck className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleReject(e.id)}>
                      <UserX className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!loading && enrollments.length > 0 && (
            <div className="border-t pt-3 text-xs text-gray-500">
              <Badge variant="secondary">전체 {enrollments.length}명</Badge>
              <Badge variant="secondary" className="ml-1 bg-[#10B981]/10 text-[#10B981]">
                승인 {enrollments.filter((e) => e.status === 'approved').length}명
              </Badge>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
