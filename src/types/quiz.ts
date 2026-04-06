export type QuestionType = 'multiple_choice' | 'short_answer' | 'essay'

export interface Quiz {
  id: string
  node_id: string
  question: string
  question_type: QuestionType
  options: string[] | null
  correct_answer: string
  explanation: string
  difficulty: number
  created_at: string
}

export interface QuizAttempt {
  id: string
  student_id: string
  quiz_id: string
  node_id: string
  answer: string
  is_correct: boolean
  score: number
  feedback: string
  attempted_at: string
}
