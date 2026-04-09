'use client'

import { useState, useEffect } from 'react'
import { Heart, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { getClassEmotionOverview, analyzeStudentEmotion } from '@/actions/emotion'
import { toast } from 'sonner'

interface ClassOption {
  id: string
  name: string
}

interface StudentEmotion {
  student_id: string
  student_name: string
  mood: 'confident' | 'neutral' | 'struggling' | 'frustrated' | 'unknown'
  mood_score: number | null
  insights: string | null
  recommendation: string | null
  last_report_date: string | null
}

interface Props {
  classes: ClassOption[]
  defaultSkillTreeId?: string
  /**
   * 외부 컨텍스트 선택기에서 내려온 classId 오버라이드.
   * null이면 내부 state/기본값 사용.
   * 'all'(전체)도 수용: selectedOverride가 null일 때만 내부 state 사용.
   */
  selectedClassIdOverride?: string | null
  /**
   * true면 내부 드롭다운을 숨긴다 (외부 ContextSelector가 조작).
   */
  hideInternalSelector?: boolean
}

const moodEmoji: Record<string, string> = {
  confident: '😊',
  neutral: '😐',
  struggling: '😟',
  frustrated: '😰',
  unknown: '⚪',
}
const moodLabel: Record<string, string> = {
  confident: '자신감',
  neutral: '보통',
  struggling: '고전',
  frustrated: '좌절',
  unknown: '미분석',
}
const moodColor: Record<string, string> = {
  confident: 'bg-green-100 text-green-700 border-green-300',
  neutral: 'bg-gray-100 text-gray-700 border-gray-300',
  struggling: 'bg-orange-100 text-orange-700 border-orange-300',
  frustrated: 'bg-red-100 text-red-700 border-red-300',
  unknown: 'bg-gray-50 text-gray-400 border-gray-200',
}

export function EmotionOverviewCard({
  classes,
  defaultSkillTreeId,
  selectedClassIdOverride,
  hideInternalSelector,
}: Props) {
  const [internalSelectedClass, setInternalSelectedClass] = useState<string>(classes[0]?.id ?? '')
  // 외부 오버라이드가 있으면 그걸 우선 사용 (null/빈문자열은 "첫 번째 클래스"로 fallback)
  const selectedClass = selectedClassIdOverride ?? internalSelectedClass
  const setSelectedClass = setInternalSelectedClass
  const [students, setStudents] = useState<StudentEmotion[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [detailStudent, setDetailStudent] = useState<StudentEmotion | null>(null)

  // 클래스 변경 시 fetch
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!selectedClass) return
    let cancelled = false
    setLoading(true)
    getClassEmotionOverview(selectedClass).then(res => {
      if (cancelled) return
      if (res.error) {
        toast.error(res.error)
        setStudents([])
      } else {
        setStudents(res.data ?? [])
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [selectedClass])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleRefreshAll = async (): Promise<void> => {
    if (!selectedClass || !defaultSkillTreeId) {
      toast.error('스킬트리 정보가 필요합니다')
      return
    }
    setRefreshing(true)
    let success = 0
    let failed = 0
    for (const s of students) {
      const res = await analyzeStudentEmotion(s.student_id, defaultSkillTreeId)
      if (res.error) failed++
      else success++
    }
    setRefreshing(false)
    toast.success(`갱신 완료 — 성공 ${success}건${failed > 0 ? `, 실패 ${failed}건` : ''}`)
    // 갱신 후 다시 fetch
    const res = await getClassEmotionOverview(selectedClass)
    if (res.data) setStudents(res.data)
  }

  if (classes.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart className="h-4 w-4 text-pink-500" />
            학생 감정 현황
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm text-gray-400">담당 클래스가 없습니다</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart className="h-4 w-4 text-pink-500" />
            학생 감정 현황
          </CardTitle>
          <div className="flex items-center gap-2">
            {!hideInternalSelector && (
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="rounded-md border bg-background px-2 py-1 text-xs"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
            {defaultSkillTreeId && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefreshAll}
                disabled={refreshing || students.length === 0}
              >
                {refreshing
                  ? <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  : <RefreshCw className="mr-1 h-3 w-3" />}
                전체 갱신
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-pink-500" />
            </div>
          ) : students.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">소속 학생이 없습니다</p>
          ) : (
            <ul className="space-y-1.5">
              {students.map(s => (
                <li key={s.student_id}>
                  <button
                    onClick={() => setDetailStudent(s)}
                    className="flex w-full items-center justify-between rounded-lg border p-2.5 text-sm transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{moodEmoji[s.mood]}</span>
                      <span className="font-medium">{s.student_name}</span>
                      {s.mood_score != null && (
                        <span className="text-xs text-gray-500">{s.mood_score}점</span>
                      )}
                    </div>
                    <Badge variant="outline" className={moodColor[s.mood]}>
                      {moodLabel[s.mood]}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 상세 분석 다이얼로그 */}
      <Dialog open={!!detailStudent} onOpenChange={(v) => { if (!v) setDetailStudent(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{detailStudent ? moodEmoji[detailStudent.mood] : ''}</span>
              {detailStudent?.student_name}
            </DialogTitle>
            <DialogDescription>
              {detailStudent?.last_report_date
                ? `${detailStudent.last_report_date} 분석`
                : '아직 분석되지 않았습니다'}
            </DialogDescription>
          </DialogHeader>

          {detailStudent && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">감정 상태</span>
                <Badge variant="outline" className={moodColor[detailStudent.mood]}>
                  {moodLabel[detailStudent.mood]} {detailStudent.mood_score != null && `(${detailStudent.mood_score}점)`}
                </Badge>
              </div>

              {detailStudent.insights ? (
                <>
                  <div className="rounded-lg bg-pink-50 p-3 dark:bg-pink-950/30">
                    <p className="mb-1 text-xs font-semibold text-pink-700 dark:text-pink-300">
                      <Sparkles className="mr-1 inline h-3 w-3" />
                      AI 분석
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{detailStudent.insights}</p>
                  </div>
                  {detailStudent.recommendation && (
                    <div className="rounded-lg border-l-4 border-[#4F6BF6] bg-[#4F6BF6]/5 p-3">
                      <p className="mb-1 text-xs font-semibold text-[#4F6BF6]">교사 권장 행동</p>
                      <p className="text-sm">{detailStudent.recommendation}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="py-6 text-center text-sm text-gray-400">
                  아직 감정 분석 데이터가 없습니다.<br />
                  &ldquo;전체 갱신&rdquo; 버튼을 눌러 분석해주세요.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
