export type Role = 'teacher' | 'student' | 'admin'

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
}

export interface UserWithProfile {
  id: string
  email: string
  profile: Profile
}
