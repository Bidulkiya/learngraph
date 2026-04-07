import { getWrongAnswers, analyzeWeakness } from '@/actions/weakness'
import { WrongAnswersView } from './WrongAnswersView'

export default async function WrongAnswersPage() {
  const [wrongRes, weaknessRes] = await Promise.all([
    getWrongAnswers(),
    analyzeWeakness(),
  ])

  return (
    <WrongAnswersView
      wrongAnswers={wrongRes.data ?? []}
      weakness={weaknessRes.data}
    />
  )
}
