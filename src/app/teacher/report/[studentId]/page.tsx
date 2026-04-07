import { generateParentReport } from '@/actions/report'
import { ParentReportView } from './ParentReportView'

interface Props {
  params: Promise<{ studentId: string }>
}

export default async function ParentReportPage({ params }: Props) {
  const { studentId } = await params
  const { data, error } = await generateParentReport(studentId)

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-red-500">{error ?? '리포트를 생성할 수 없습니다'}</p>
      </div>
    )
  }

  return <ParentReportView report={data} />
}
