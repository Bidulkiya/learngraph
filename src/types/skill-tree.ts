export interface SkillTree {
  id: string
  title: string
  description: string
  subject_id: string | null
  class_id: string | null
  created_by: string
  is_template: boolean
  source_file_url: string | null
  status: 'draft' | 'published' | 'archived'
  created_at: string
  updated_at: string
  nodes?: SkillNode[]
  edges?: NodeEdge[]
}

export interface SkillNode {
  id: string
  skill_tree_id: string
  title: string
  description: string
  difficulty: number
  order_index: number
  position_x: number | null
  position_y: number | null
  created_at: string
}

export interface NodeEdge {
  id: string
  skill_tree_id: string
  source_node_id: string
  target_node_id: string
  label: string | null
}

export interface StudentProgress {
  id: string
  student_id: string
  node_id: string
  skill_tree_id: string
  status: 'locked' | 'available' | 'in_progress' | 'completed'
  quiz_score: number | null
  attempts: number
  completed_at: string | null
}
