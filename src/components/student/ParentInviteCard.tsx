'use client'

import { useState } from 'react'
import { Heart, Loader2, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createParentInviteCode } from '@/actions/parent'
import { toast } from 'sonner'

export function ParentInviteCard() {
  const [code, setCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCreate = async (): Promise<void> => {
    setLoading(true)
    const res = await createParentInviteCode()
    setLoading(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    if (res.data) {
      setCode(res.data.code)
    }
  }

  const handleCopy = (): void => {
    if (!code) return
    navigator.clipboard.writeText(code)
    setCopied(true)
    toast.success('복사되었습니다')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="border-pink-200 bg-pink-50/30 dark:border-pink-900 dark:bg-pink-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Heart className="h-4 w-4 text-pink-500" />
          학부모 초대
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!code ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              부모님이 내 학습 현황을 볼 수 있도록 초대 코드를 생성하세요.
            </p>
            <Button
              onClick={handleCreate}
              disabled={loading}
              size="sm"
              className="w-full bg-pink-500 hover:bg-pink-500/90"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              초대 코드 생성
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border-2 border-dashed border-pink-300 bg-white p-4 text-center dark:bg-pink-950/40">
              <p className="text-xs text-gray-500">부모님에게 이 코드를 전달하세요</p>
              <p className="mt-2 text-3xl font-bold tracking-[0.5em] font-mono text-pink-600">
                {code}
              </p>
              <p className="mt-2 text-xs text-gray-500">48시간 동안 유효합니다</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                className="flex-1"
              >
                {copied ? (
                  <><Check className="mr-1 h-3 w-3" /> 복사됨</>
                ) : (
                  <><Copy className="mr-1 h-3 w-3" /> 복사</>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCode(null)}
                className="flex-1"
              >
                새로 생성
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
