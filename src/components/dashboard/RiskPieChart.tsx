'use client'

import { useState, useEffect } from 'react'
import { ShieldAlert, Loader2 } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getAdminRiskOverview, type RiskLevel, type RiskAssessment } from '@/actions/alert'
import { toast } from 'sonner'

interface RiskOverview {
  total: number
  distribution: { level: RiskLevel; count: number; label: string }[]
  topRisks: RiskAssessment[]
}

const COLORS: Record<RiskLevel, string> = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#F97316',
  critical: '#EF4444',
}

const levelEmoji: Record<RiskLevel, string> = {
  low: '🟢',
  medium: '🟡',
  high: '🟠',
  critical: '🔴',
}

export function RiskPieChart() {
  const [data, setData] = useState<RiskOverview | null>(null)
  const [loading, setLoading] = useState(true)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAdminRiskOverview().then(res => {
      if (cancelled) return
      if (res.error) {
        toast.error(res.error)
      } else if (res.data) {
        setData(res.data)
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="h-4 w-4 text-red-500" />
          전체 위험 현황
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-red-500" />
          </div>
        ) : !data || data.total === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">분석할 학생이 없습니다</p>
        ) : (
          <div className="space-y-4">
            {/* Pie Chart */}
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.distribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="label"
                    label={(props: { name?: string; value?: number }) => {
                      const v = props.value ?? 0
                      return v > 0 ? `${props.name ?? ''} ${v}` : ''
                    }}
                  >
                    {data.distribution.map((entry) => (
                      <Cell key={entry.level} fill={COLORS[entry.level]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value}명`, String(name)]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={20}
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <p className="text-center text-xs text-gray-500">
              총 학생 <strong>{data.total}명</strong>
            </p>

            {/* Top 5 위험 학생 */}
            {data.topRisks.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-400">
                  최고 위험 학생 TOP 5
                </p>
                <ul className="space-y-1">
                  {data.topRisks.map((r) => (
                    <li
                      key={r.student_id}
                      className="flex items-center justify-between rounded border p-2 text-xs dark:border-gray-800"
                    >
                      <span className="flex items-center gap-1.5">
                        <span>{levelEmoji[r.risk_level]}</span>
                        <span className="font-medium">{r.student_name}</span>
                        <span className="text-gray-500">— {r.primary_reason}</span>
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {r.risk_score}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
