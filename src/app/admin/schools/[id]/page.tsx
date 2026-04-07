import { getSchoolDetail } from '@/actions/school'
import { SchoolDetailView } from './SchoolDetailView'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminSchoolDetailPage({ params }: Props) {
  const { id } = await params
  const { data, error } = await getSchoolDetail(id)

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-red-500">{error ?? '스쿨을 찾을 수 없습니다'}</p>
      </div>
    )
  }

  return <SchoolDetailView detail={data} />
}
