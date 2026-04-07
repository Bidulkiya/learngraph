import { getMyClasses } from '@/actions/school'
import NewSkillTreeForm from './NewSkillTreeForm'

export default async function NewSkillTreePage() {
  const { data: classes } = await getMyClasses()

  const classOptions = (classes ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    school_name: c.school_name,
  }))

  return <NewSkillTreeForm classes={classOptions} />
}
