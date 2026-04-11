export type Role = 'teacher' | 'student' | 'admin' | 'parent' | 'learner'

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

  // profiles v2 (019_profile_fields)
  nickname?: string | null
  nickname_changed_at?: string | null
  avatar_seed?: string | null
  avatar_change_count?: number
  grade?: string | null
  bio?: string | null
  interests?: string[] | null
  subject?: string | null
}
