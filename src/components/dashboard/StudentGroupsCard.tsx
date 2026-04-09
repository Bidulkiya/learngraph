'use client'

import { useState } from 'react'
import { Sparkles, Loader2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { analyzeStudentGroups } from '@/actions/analysis'
import type { StudentGroupsOutput } from '@/lib/ai/schemas'
import { toast } from 'sonner'

interface Props {
  classes: Array<{ id: string; name: string }>
  selectedClassIdOverride?: string | null
  hideInternalSelector?: boolean
}

export function StudentGroupsCard({ classes, selectedClassIdOverride, hideInternalSelector }: Props) {
  const [internalClassId, setInternalClassId] = useState(classes[0]?.id ?? '')
  const classId = selectedClassIdOverride ?? internalClassId
  const setClassId = setInternalClassId
  const [loading, setLoading] = useState(false)
  const [groups, setGroups] = useState<StudentGroupsOutput | null>(null)

  const handleAnalyze = async (): Promise<void> => {
    if (!classId) return
    setLoading(true)
    const res = await analyzeStudentGroups(classId)
    setLoading(false)
    if (res.error || !res.data) {
      toast.error(res.error ?? '분석 실패')
      return
    }
    setGroups(res.data)
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-[#7C5CFC]" />
          AI 학생 그룹 분석
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {classes.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">담당 클래스가 없습니다</p>
        ) : (
          <>
            <div className="flex gap-2">
              {!hideInternalSelector && (
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
              <Button
                onClick={handleAnalyze}
                disabled={loading}
                className="bg-[#7C5CFC] hover:bg-[#7C5CFC]/90"
                size="sm"
              >
                {loading ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                )}
                분석
              </Button>
            </div>

            {groups && (
              <div className="space-y-2">
                {groups.groups.map((g, i) => (
                  <div key={i} className="rounded-lg border p-3 text-sm dark:border-gray-800">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{g.name}</h3>
                      <Badge variant="secondary">{g.level}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{g.characteristics}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {g.students.map((s, si) => (
                        <Badge key={si} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                    <p className="mt-2 text-xs italic text-[#7C5CFC]">💡 {g.recommendation}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
