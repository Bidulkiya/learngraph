'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'

interface HeatmapDataPoint {
  name: string
  unlockRate: number
}

interface HeatmapChartProps {
  title?: string
  data: HeatmapDataPoint[]
}

export function HeatmapChart({ title = '노드별 잠금해제율', data }: HeatmapChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-[#4F6BF6]" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex h-40 items-center justify-center text-sm text-gray-400">
          아직 데이터가 없습니다
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-[#4F6BF6]" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
            <XAxis dataKey="name" fontSize={11} angle={-20} textAnchor="end" height={50} />
            <YAxis fontSize={11} domain={[0, 100]} unit="%" />
            <Tooltip
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
              formatter={(value) => [`${value}%`, '잠금해제율']}
            />
            <Bar dataKey="unlockRate" fill="#4F6BF6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
