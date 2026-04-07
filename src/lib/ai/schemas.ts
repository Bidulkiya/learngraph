import { z } from 'zod'

// Skill tree node schema (AI output structure)
export const skillTreeNodeSchema = z.object({
  id: z.string().describe('고유 ID (예: node_1, node_2)'),
  title: z.string().describe('개념 이름 (짧고 명확하게)'),
  description: z.string().describe('개념 설명 (2-3문장)'),
  difficulty: z.number().describe('난이도 (1~5 사이 정수, 1=기초, 5=심화)'),
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
  difficulty: z.number().describe('난이도 (1~5 사이 정수)'),
})

export const quizSchema = z.object({
  questions: z.array(quizQuestionSchema).describe('퀴즈 문제 목록'),
})

export type QuizOutput = z.infer<typeof quizSchema>

// 서술형 퀴즈 AI 채점 스키마
export const essayGradingSchema = z.object({
  is_correct: z.boolean().describe('70점 이상이면 true'),
  score: z.number().describe('0~100 점수 (의미 일치도 기반)'),
  feedback: z.string().describe('한국어 피드백 — 맞은 부분, 틀린 부분, 보충 설명을 포함'),
})

export type EssayGradingOutput = z.infer<typeof essayGradingSchema>

// AI 약점 진단 스키마
export const weaknessAnalysisSchema = z.object({
  diagnosis: z.string().describe('학생의 학습 약점에 대한 진단 (2-3문장)'),
  weak_areas: z.array(z.string()).describe('약한 개념/영역 목록'),
  recommendations: z.array(z.string()).describe('추천 학습 방향 (구체적인 행동)'),
})

export type WeaknessAnalysisOutput = z.infer<typeof weaknessAnalysisSchema>
