export type Role = 'teacher' | 'student' | 'admin' | 'parent'

export type LearningStyle = 'visual' | 'textual' | 'practical'

export interface Profile {
  id: string
  email: string
  name: string
  role: Role
  avatar_url: string | null
  level: number
  xp: number
  streak_days: number
  last_active_at: string
  created_at: string
  learning_style?: LearningStyle | null
}
