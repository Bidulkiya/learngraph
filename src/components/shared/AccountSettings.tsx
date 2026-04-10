'use client'

import { useState } from 'react'
import { Loader2, Trash2, Lock, Eye, EyeOff, Check, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { deleteAccount } from '@/actions/profile'
import { createBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

/**
 * 계정 설정 공용 컴포넌트 — 비밀번호 변경 + 계정 삭제.
 * /student/profile과 /teacher/profile에서 공용 사용.
 */

interface Props {
  isDemo: boolean
}

export function AccountSettings({ isDemo }: Props) {
  return (
    <div className="space-y-6">
      <PasswordChangeSection isDemo={isDemo} />
      <AccountDeleteSection isDemo={isDemo} />
    </div>
  )
}

// ============================================
// 비밀번호 변경
// ============================================

function PasswordChangeSection({ isDemo }: { isDemo: boolean }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const passwordsMatch = newPassword === confirmPassword && newPassword.length >= 6

  const handleChange = async (): Promise<void> => {
    if (isDemo) {
      toast.error('체험 모드에서는 비밀번호를 변경할 수 없습니다.')
      return
    }
    if (!passwordsMatch) return

    setLoading(true)
    try {
      const supabase = createBrowserClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })

      if (error) {
        if (error.message.includes('same_password')) {
          toast.error('새 비밀번호가 기존 비밀번호와 같습니다.')
        } else {
          toast.error(error.message)
        }
      } else {
        toast.success('비밀번호가 변경되었습니다')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch {
      toast.error('비밀번호 변경 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-4 w-4" />
          비밀번호 변경
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-pw">새 비밀번호</Label>
          <div className="relative">
            <Input
              id="new-pw"
              type={showPassword ? 'text' : 'password'}
              placeholder="6자 이상 입력"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-pw">새 비밀번호 확인</Label>
          <Input
            id="confirm-pw"
            type={showPassword ? 'text' : 'password'}
            placeholder="비밀번호 다시 입력"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={6}
            className={
              confirmPassword && newPassword !== confirmPassword
                ? 'border-red-500'
                : confirmPassword && passwordsMatch
                ? 'border-green-500'
                : ''
            }
          />
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-red-600">비밀번호가 일치하지 않습니다</p>
          )}
          {confirmPassword && passwordsMatch && (
            <p className="flex items-center gap-1 text-xs text-green-600">
              <Check className="h-3 w-3" />
              비밀번호가 일치합니다
            </p>
          )}
        </div>

        <Button
          onClick={handleChange}
          disabled={loading || !passwordsMatch || isDemo}
          className="w-full"
        >
          {loading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          비밀번호 변경
        </Button>
      </CardContent>
    </Card>
  )
}

// ============================================
// 계정 삭제
// ============================================

function AccountDeleteSection({ isDemo }: { isDemo: boolean }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDelete = async (): Promise<void> => {
    if (isDemo) {
      toast.error('체험 모드에서는 계정을 삭제할 수 없습니다.')
      return
    }
    if (confirmText !== '삭제합니다') {
      toast.error('"삭제합니다"를 정확히 입력해주세요.')
      return
    }

    setLoading(true)
    const res = await deleteAccount(confirmText)
    setLoading(false)

    if (res.error) {
      toast.error(res.error)
      return
    }

    // 성공 — 세션 정리 후 랜딩으로 이동
    try {
      const supabase = createBrowserClient()
      await supabase.auth.signOut()
    } catch {
      // OK
    }

    toast.success('계정이 삭제되었습니다.')
    window.location.href = '/'
  }

  return (
    <>
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
            위험 구역
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            계정을 삭제하면 <strong>모든 데이터가 영구적으로 삭제</strong>되며{' '}
            <strong>복구할 수 없습니다.</strong> 스킬트리, 퀴즈 기록, 업적, 학습 데이터가 모두 사라집니다.
          </div>
          <Button
            variant="destructive"
            onClick={() => {
              if (isDemo) {
                toast.error('체험 모드에서는 계정을 삭제할 수 없습니다.')
                return
              }
              setDialogOpen(true)
            }}
            className="w-full"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            계정 삭제
          </Button>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              정말로 계정을 삭제하시겠습니까?
            </DialogTitle>
            <DialogDescription>
              이 작업은 되돌릴 수 없습니다. 모든 학습 데이터, 업적, 스킬트리가 영구 삭제됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>
                확인을 위해 <strong className="text-red-600">&ldquo;삭제합니다&rdquo;</strong>를 입력하세요
              </Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="삭제합니다"
                className={
                  confirmText === '삭제합니다'
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : ''
                }
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => { setDialogOpen(false); setConfirmText('') }}
                className="flex-1"
                disabled={loading}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={loading || confirmText !== '삭제합니다'}
                className="flex-1"
              >
                {loading ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-1 h-4 w-4" />
                )}
                영구 삭제
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
