'use client'

import { useState } from 'react'
import { Users, GraduationCap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

interface Member {
  id: string
  name: string
  email: string
}

interface Props {
  label: string
  value: number
  subtitle?: string
  iconType: 'teacher' | 'student'
  iconColor: string
  members: Member[]
}

export function ClickableStatCard({ label, value, subtitle, iconType, iconColor, members }: Props) {
  const [open, setOpen] = useState(false)
  const Icon = iconType === 'teacher' ? GraduationCap : Users

  return (
    <>
      <Card
        onClick={() => setOpen(true)}
        className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]"
      >
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">{label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
              {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
              <p className="mt-1 text-xs text-[#4F6BF6]">클릭하여 명단 보기</p>
            </div>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${iconColor}1A` }}
            >
              <Icon className="h-5 w-5" style={{ color: iconColor }} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5" style={{ color: iconColor }} />
              {label} 명단
            </DialogTitle>
            <DialogDescription>
              내 스쿨에 소속된 {iconType === 'teacher' ? '교사' : '학생'} {members.length}명
            </DialogDescription>
          </DialogHeader>
          {members.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              아직 등록된 {iconType === 'teacher' ? '교사' : '학생'}이 없습니다
            </p>
          ) : (
            <ul className="space-y-2">
              {members.map((m, i) => (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-lg border p-3 text-sm dark:border-gray-800"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium"
                    style={{ backgroundColor: `${iconColor}1A`, color: iconColor }}
                  >
                    {m.name[0]}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="font-medium">{m.name}</p>
                    <p className="truncate text-xs text-gray-500">{m.email}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    #{i + 1}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
