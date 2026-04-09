'use client'

import { Printer, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ParentReportData } from '@/actions/report'

export function ParentReportView({ report }: { report: ParentReportData }) {
  const handlePrint = (): void => window.print()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#4F6BF6]" />
          <h1 className="text-xl font-bold">학부모 리포트</h1>
        </div>
        <Button onClick={handlePrint} className="bg-[#4F6BF6] hover:bg-[#4F6BF6]/90">
          <Printer className="mr-2 h-4 w-4" />
          PDF로 저장/인쇄
        </Button>
      </div>

      {/* 리포트 본문 */}
      <Card className="print:shadow-none print:border-0">
        <CardHeader className="border-b text-center">
          <CardTitle className="text-2xl">NodeBloom 학습 리포트</CardTitle>
          <p className="text-sm text-gray-500">{report.period}</p>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* 학생 정보 */}
          <div>
            <h2 className="mb-2 text-sm font-semibold text-gray-500">학생 정보</h2>
            <p className="text-lg font-bold">{report.student_name}</p>
          </div>

          {/* 통계 */}
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-gray-500">진도율</p>
              <p className="text-2xl font-bold text-[#4F6BF6]">{report.progress_rate}%</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-gray-500">완료 노드</p>
              <p className="text-2xl font-bold text-[#10B981]">
                {report.completed_nodes}/{report.total_nodes}
              </p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-gray-500">퀴즈 평균</p>
              <p className="text-2xl font-bold text-[#7C5CFC]">{report.avg_quiz_score}점</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-gray-500">스트릭</p>
              <p className="text-2xl font-bold text-[#F59E0B]">{report.streak_days}일</p>
            </div>
          </div>

          {/* AI 코멘트 */}
          <div>
            <h2 className="mb-2 text-sm font-semibold text-gray-500">종합 평가</h2>
            <p className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-900">
              {report.ai_comment.overall_comment}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-[#10B981]">강점</h3>
              <ul className="space-y-1 text-sm">
                {report.ai_comment.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <Badge variant="secondary" className="mt-0.5 shrink-0 bg-[#10B981]/10 text-[#10B981]">✓</Badge>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-[#F59E0B]">개선점</h3>
              <ul className="space-y-1 text-sm">
                {report.ai_comment.improvements.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <Badge variant="secondary" className="mt-0.5 shrink-0 bg-[#F59E0B]/10 text-[#F59E0B]">!</Badge>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 격려 메시지 */}
          <div className="rounded-lg border-l-4 border-[#4F6BF6] bg-[#4F6BF6]/5 p-4">
            <p className="text-sm italic text-gray-700 dark:text-gray-300">
              &ldquo;{report.ai_comment.encouragement}&rdquo;
            </p>
          </div>

          <p className="border-t pt-3 text-center text-xs text-gray-400">
            NodeBloom AI 교육 플랫폼 · 자동 생성 리포트
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
