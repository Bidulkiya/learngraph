import { z } from 'zod'

// Skill tree node schema (AI output structure)
export const skillTreeNodeSchema = z.object({
  id: z.string().describe('고유 ID (예: node_1, node_2)'),
  title: z.string().describe('개념 이름 (짧고 명확하게)'),
  description: z.string().describe('개념 설명 (2-3문장)'),
  difficulty: z.number().min(1).max(5).describe('난이도 1(기초)~5(심화)'),
})

export const skillTreeEdgeSchema = z.object({
  source: z.string().describe('선수 지식 노드 ID'),
  target: z.string().describe('후속 개념 노드 ID'),
  label: z.string().optional().describe('관계 설명 (선택)'),
})

export const skillTreeSchema = z.object({
  title: z.string().describe('스킬트리 제목'),
  description: z.string().describe('스킬트리 전체 설명 (1-2문장)'),
  nodes: z.array(skillTreeNodeSchema).describe('개념 노드 목록 (5~20개)'),
  edges: z.array(skillTreeEdgeSchema).describe('노드 간 연결 (선수지식 → 후속개념)'),
})

export type SkillTreeOutput = z.infer<typeof skillTreeSchema>
export type SkillTreeNodeOutput = z.infer<typeof skillTreeNodeSchema>
export type SkillTreeEdgeOutput = z.infer<typeof skillTreeEdgeSchema>

// Quiz schema
export const quizQuestionSchema = z.object({
  question: z.string().describe('문제 내용'),
  type: z.enum(['multiple_choice', 'short_answer']).describe('문제 유형'),
  options: z.array(z.string()).optional().describe('객관식 보기 (4개)'),
  correct_answer: z.string().describe('정답'),
  explanation: z.string().describe('해설'),
  difficulty: z.number().min(1).max(5).describe('난이도'),
})

export const quizSchema = z.object({
  questions: z.array(quizQuestionSchema).describe('퀴즈 문제 목록'),
})

export type QuizOutput = z.infer<typeof quizSchema>
