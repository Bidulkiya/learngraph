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

// 수업 녹음 요약
export const lessonSummarySchema = z.object({
  summary: z.string().describe('수업 내용 전체 요약 (3-5문장)'),
  keyPoints: z.array(z.string()).describe('핵심 포인트 목록 (5개 이내)'),
  nextLessonSuggestions: z.array(z.string()).describe('다음 수업에서 다룰 것 제안 (3개 이내)'),
})
export type LessonSummaryOutput = z.infer<typeof lessonSummarySchema>

// 퀴즈 힌트
export const quizHintSchema = z.object({
  hint: z.string().describe('정답을 직접 알려주지 않는 방향성 힌트 (2문장 이내)'),
})
export type QuizHintOutput = z.infer<typeof quizHintSchema>

// 개념 연결 추천
export const conceptConnectionSchema = z.object({
  connections: z.array(z.object({
    subject: z.string().describe('관련 과목/분야'),
    concept: z.string().describe('관련 개념 이름'),
    relation: z.string().describe('원래 개념과의 관계 설명 (1-2문장)'),
  })).describe('관련 개념 3개'),
})
export type ConceptConnectionOutput = z.infer<typeof conceptConnectionSchema>

// AI 학습 코치 주간 계획
export const weeklyPlanSchema = z.object({
  plan: z.array(z.object({
    day: z.string().describe('요일 (월/화/수/목/금/토/일)'),
    nodes: z.array(z.string()).describe('해당 요일에 학습할 노드 제목 목록'),
    reason: z.string().describe('이 요일에 이 노드를 학습하는 이유'),
  })).describe('주간 학습 계획'),
  motivation: z.string().describe('동기부여 메시지 (한 문단)'),
})
export type WeeklyPlanOutput = z.infer<typeof weeklyPlanSchema>

// 학생 그룹 분석
export const studentGroupsSchema = z.object({
  groups: z.array(z.object({
    name: z.string().describe('그룹 이름 (예: 개념 이해 우수 그룹)'),
    level: z.string().describe('수준 (상/중/하)'),
    students: z.array(z.string()).describe('해당 그룹 학생 이름 목록'),
    characteristics: z.string().describe('그룹 특성 설명'),
    recommendation: z.string().describe('교사에게 주는 추천 행동'),
  })).describe('학생 그룹 (2~4개)'),
})
export type StudentGroupsOutput = z.infer<typeof studentGroupsSchema>

// 교육과정 병목 분석
export const bottleneckSchema = z.object({
  bottlenecks: z.array(z.object({
    node: z.string().describe('노드 제목'),
    unlockRate: z.number().describe('언락률 (0~100)'),
    cause: z.string().describe('추정 원인'),
    suggestion: z.string().describe('개선 제안'),
  })).describe('병목 노드 목록'),
})
export type BottleneckOutput = z.infer<typeof bottleneckSchema>

// 학부모 리포트
export const parentReportSchema = z.object({
  overall_comment: z.string().describe('학생 전반에 대한 한 문단 코멘트'),
  strengths: z.array(z.string()).describe('강점 목록'),
  improvements: z.array(z.string()).describe('개선점 목록'),
  encouragement: z.string().describe('학생에게 전하는 격려 메시지'),
})
export type ParentReportOutput = z.infer<typeof parentReportSchema>
