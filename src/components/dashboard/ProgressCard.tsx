'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'

interface ProgressCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  iconColor?: string
  subtitle?: string
  progress?: number
}

export function ProgressCard({
  label,
  value,
  icon: Icon,
  iconColor = '#4F6BF6',
  subtitle,
  progress,
}: ProgressCardProps) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
          </div>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${iconColor}1A` }}
          >
            <Icon className="h-5 w-5" style={{ color: iconColor }} />
          </div>
        </div>
        {progress !== undefined && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: iconColor }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
