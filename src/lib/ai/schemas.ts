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
  subject_hint: z.enum(['science', 'math', 'korean', 'default']).describe('주제 분야 — 시각 테마 결정용'),
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

/**
 * AI 학습 코치 주간 계획 스키마 v2.
 *
 * 주요 변경:
 * - `day`가 영문 약어 enum (mon~sun) — 프론트/백엔드 일관성
 * - `nodes`가 `{ id, title }` 배열 — weekly_plan_missions 테이블에 바로 매핑
 *   → 학생이 해당 노드의 퀴즈를 풀면 미션 완료 자동 추적
 */
export const weeklyPlanSchema = z.object({
  plan: z.array(z.object({
    day: z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])
      .describe('요일 약어 (mon/tue/wed/thu/fri/sat/sun)'),
    nodes: z.array(z.object({
      id: z.string().describe('available 노드 목록 중 하나의 노드 ID'),
      title: z.string().describe('해당 노드의 제목'),
    })).describe('해당 요일에 학습할 노드 1-3개 — 제공된 available 노드 목록에서만 선택'),
    reason: z.string().describe('이 요일에 이 노드를 학습하는 이유'),
  })).describe('주간 학습 계획 — 월~금은 반드시 포함, 토/일은 선택'),
  motivation: z.string().describe('동기부여 메시지 (한 문단)'),
})
export type WeeklyPlanOutput = z.infer<typeof weeklyPlanSchema>
export type WeeklyPlanDay = z.infer<typeof weeklyPlanSchema>['plan'][number]['day']

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

// 노드별 학습 문서 (HTML 학습지)
export const learningDocSchema = z.object({
  content: z.string().describe('HTML 형식의 학습지 전체 (<div class="ws-doc">로 시작하는 인라인 스타일 HTML 조각). <html>/<head>/<body> 태그 없이 div fragment만 출력.'),
})
export type LearningDocOutput = z.infer<typeof learningDocSchema>

// 교사 스타일 분석 결과
export const teacherStyleSchema = z.object({
  style_guide: z.string().describe('교사가 작성한 학습 문서의 스타일을 종합 분석한 가이드 (200~400자 1문단). 다른 AI가 모방할 수 있도록 구체적으로.'),
})
export type TeacherStyleOutput = z.infer<typeof teacherStyleSchema>

// ============================================
// Phase 9: 5개 특색 기능 스키마
// ============================================

// 1. 학습 감정 추적
export const emotionReportSchema = z.object({
  overall_mood: z.enum(['confident', 'neutral', 'struggling', 'frustrated']).describe('학생의 전반적 학습 감정 상태'),
  mood_score: z.number().describe('0-100 정수, 높을수록 긍정적 (0=극도 좌절, 100=완전 자신감)'),
  insights: z.string().describe('학생 상태에 대한 한국어 분석 (2-3문장)'),
  recommendation: z.string().describe('교사가 취해야 할 권장 행동 (한국어 1-2문장)'),
  node_emotions: z.array(z.object({
    node_title: z.string().describe('노드 제목'),
    emotion: z.string().describe('해당 노드에서 학생이 느낀 감정 (예: 자신감/혼란/포기 등)'),
  })).describe('노드별 감정 (최근 시도한 노드 위주, 최대 5개)'),
})
export type EmotionReportOutput = z.infer<typeof emotionReportSchema>

// 2. 스킬트리 사전 시뮬레이션
export const simulationSchema = z.object({
  overall_pass_rate: z.number().describe('전체 예상 통과율 0-100 정수'),
  bottleneck_nodes: z.array(z.object({
    node_title: z.string().describe('병목 노드 제목'),
    predicted_pass_rate: z.number().describe('예상 통과율 0-100'),
    cause: z.string().describe('병목 원인 분석 (한국어 1-2문장)'),
    suggestion: z.string().describe('개선 제안 (한국어 1-2문장)'),
  })).describe('병목 후보 노드 (3-5개)'),
  difficulty_curve: z.string().describe('난이도 흐름 평가 (한국어 2-3문장)'),
  overall_feedback: z.string().describe('스킬트리 전체에 대한 종합 평가 (한국어 2-3문장)'),
})
export type SimulationOutput = z.infer<typeof simulationSchema>

// 3. 크로스커리큘럼 지식 연결
export const crossCurriculumSchema = z.object({
  connections: z.array(z.object({
    from_node: z.string().describe('출발 개념 (학생이 배운 노드 제목)'),
    from_subject: z.string().describe('출발 과목 (예: 수학/과학/국어)'),
    to_node: z.string().describe('도착 개념'),
    to_subject: z.string().describe('도착 과목'),
    relation: z.string().describe('두 개념을 잇는 관계 설명 (한국어 1-2문장)'),
    benefit: z.string().describe('이 연결을 알면 학생에게 어떤 도움이 되는지 (한국어 1-2문장)'),
  })).describe('과목을 넘나드는 개념 연결 (3-6개)'),
})
export type CrossCurriculumOutput = z.infer<typeof crossCurriculumSchema>

// ============================================
// Phase 10: 6개 고급 기능 스키마
// ============================================

// 4. 주간 학습 브리핑
export const weeklyBriefingSchema = z.object({
  summary: z.string().describe('지난 한 주의 클래스 전체 학습 상황 종합 요약 (한국어 3-4문장)'),
  highlights: z.array(z.string()).describe('주요 성과/긍정적 변화 2-3개 (한국어 짧은 문장)'),
  concerns: z.array(z.string()).describe('우려 사항/주의 필요 1-2개 (한국어 짧은 문장)'),
  action_items: z.array(z.string()).describe('교사 권장 행동 2-3개 (구체적이고 실행 가능한, 한국어)'),
})
export type WeeklyBriefingOutput = z.infer<typeof weeklyBriefingSchema>

// 5. 플래시카드 (5장)
export const flashcardsSchema = z.object({
  cards: z.array(z.object({
    front: z.string().describe('카드 앞면 — 질문 또는 개념 (짧게, 한국어)'),
    back: z.string().describe('카드 뒷면 — 답 또는 핵심 설명 (간결하게, 한국어)'),
  })).describe('핵심 개념 5장의 플래시카드'),
})
export type FlashcardsOutput = z.infer<typeof flashcardsSchema>
