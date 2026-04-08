'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getClassRiskAlerts, type RiskLevel, type RiskAssessment } from '@/actions/alert'
import { toast } from 'sonner'

interface ClassOption {
  id: string
  name: string
}

interface Props {
  classes: ClassOption[]
}

const levelEmoji: Record<RiskLevel, string> = {
  low: '🟢',
  medium: '🟡',
  high: '🟠',
  critical: '🔴',
}
const levelLabel: Record<RiskLevel, string> = {
  low: '낮음',
  medium: '보통',
  high: '높음',
  critical: '매우 높음',
}
const levelColor: Record<RiskLevel, string> = {
  low: 'bg-green-100 text-green-700 border-green-300',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  high: 'bg-orange-100 text-orange-700 border-orange-300',
  critical: 'bg-red-100 text-red-700 border-red-300',
}

export function RiskAlertCard({ classes }: Props) {
  const [selectedClass, setSelectedClass] = useState<string>(classes[0]?.id ?? '')
  const [alerts, setAlerts] = useState<RiskAssessment[]>([])
  const [loading, setLoading] = useState(false)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!selectedClass) return
    let cancelled = false
    setLoading(true)
    getClassRiskAlerts(selectedClass).then(res => {
      if (cancelled) return
      if (res.error) {
        toast.error(res.error)
        setAlerts([])
      } else {
        setAlerts(res.data?.alerts ?? [])
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [selectedClass])
  /* eslint-enable react-hooks/set-state-in-effect */

  if (classes.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            학습 이탈 경보
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm text-gray-400">담당 클래스가 없습니다</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          학습 이탈 경보
          {alerts.length > 0 && (
            <Badge className="bg-red-500 text-white">{alerts.length}</Badge>
          )}
        </CardTitle>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="rounded-md border bg-background px-2 py-1 text-xs"
        >
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-red-500" />
          </div>
        ) : alerts.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">
            🎉 위험군 학생이 없습니다
          </p>
        ) : (
          <ul className="space-y-2">
            {alerts.map(a => (
              <li
                key={a.student_id}
                className="rounded-lg border p-3 text-sm dark:border-gray-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{levelEmoji[a.risk_level]}</span>
                    <div>
                      <p className="font-semibold">{a.student_name}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {a.primary_reason}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={levelColor[a.risk_level]}>
                    {levelLabel[a.risk_level]} ({a.risk_score})
                  </Badge>
                </div>
                {a.factors.length > 1 && (
                  <ul className="mt-2 ml-7 list-disc text-xs text-gray-500">
                    {a.factors.slice(1).map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
