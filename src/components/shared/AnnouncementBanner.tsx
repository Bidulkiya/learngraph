'use client'

import { useState } from 'react'
import { Bell, ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { markAnnouncementRead, type Announcement } from '@/actions/announcements'
import { toast } from 'sonner'

interface Props {
  announcements: Announcement[]
}

export function AnnouncementBanner({ announcements }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<string | null>(null)

  const unread = announcements.filter(a => !a.is_read && !dismissed.has(a.id))
  if (unread.length === 0) return null

  const handleRead = async (id: string): Promise<void> => {
    const res = await markAnnouncementRead(id)
    if (res.error) {
      toast.error(res.error)
      return
    }
    setDismissed(prev => new Set(prev).add(id))
  }

  return (
    <Card className="border-2 border-[#F59E0B]/30 bg-gradient-to-r from-[#F59E0B]/5 to-[#7C5CFC]/5">
      <CardContent className="pt-4">
        <div className="mb-2 flex items-center gap-2">
          <Bell className="h-4 w-4 text-[#F59E0B]" />
          <span className="text-sm font-semibold">공지사항 ({unread.length}건)</span>
        </div>
        <div className="space-y-2">
          {unread.slice(0, 3).map(a => {
            const isExpanded = expanded === a.id
            return (
              <div
                key={a.id}
                className="rounded-lg border bg-white p-3 text-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => setExpanded(isExpanded ? null : a.id)}
                    className="flex flex-1 items-center gap-2 text-left"
                  >
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                    <span className="font-medium">{a.title}</span>
                    {a.author_name && (
                      <span className="text-xs text-gray-400">— {a.author_name}</span>
                    )}
                  </button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => handleRead(a.id)}
                    title="읽음 처리"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {isExpanded && (
                  <p className="mt-2 border-t pt-2 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-400">
                    {a.content}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
