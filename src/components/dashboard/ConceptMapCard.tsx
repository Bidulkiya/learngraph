'use client'

import { useState } from 'react'
import { Network, Loader2, Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { findConceptConnections } from '@/actions/cross-curriculum'
import type { CrossCurriculumOutput } from '@/lib/ai/schemas'
import { toast } from 'sonner'

interface Props {
  studentId: string
}

export function ConceptMapCard({ studentId }: Props) {
  const [data, setData] = useState<CrossCurriculumOutput | null>(null)
  const [loading, setLoading] = useState(false)

  const handleAnalyze = async (): Promise<void> => {
    setLoading(true)
    const res = await findConceptConnections(studentId)
    setLoading(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    if (res.data) setData(res.data)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Network className="h-4 w-4 text-[#7C5CFC]" />
          내 지식 맵
        </CardTitle>
        {!data && (
          <Button
            size="sm"
            onClick={handleAnalyze}
            disabled={loading}
            className="bg-[#7C5CFC] hover:bg-[#7C5CFC]/90"
          >
            {loading
              ? <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              : <Sparkles className="mr-1 h-3 w-3" />}
            지식 연결 발견하기
          </Button>
        )}
        {data && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleAnalyze}
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
            다시 분석
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!data ? (
          <p className="py-4 text-center text-sm text-gray-400">
            과목을 넘나드는 개념 연결을 AI가 발견해드립니다.<br />
            <span className="text-xs">(노드를 3개 이상 완료한 후 사용 가능)</span>
          </p>
        ) : data.connections.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">
            아직 의미 있는 연결을 찾지 못했습니다. 더 많은 노드를 완료해보세요!
          </p>
        ) : (
          <ul className="space-y-3">
            {data.connections.map((c, i) => (
              <li
                key={i}
                className="rounded-lg border bg-gradient-to-br from-[#7C5CFC]/5 to-[#4F6BF6]/5 p-3 text-sm dark:border-gray-800"
              >
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="bg-[#7C5CFC]/10 text-[#7C5CFC]">
                    {c.from_subject}
                  </Badge>
                  <span className="font-semibold">{c.from_node}</span>
                  <ArrowRight className="h-3 w-3 text-gray-400" />
                  <Badge variant="outline" className="bg-[#4F6BF6]/10 text-[#4F6BF6]">
                    {c.to_subject}
                  </Badge>
                  <span className="font-semibold">{c.to_node}</span>
                </div>
                <p className="mb-1 text-gray-700 dark:text-gray-300">{c.relation}</p>
                <p className="text-xs italic text-[#7C5CFC]">💡 {c.benefit}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
