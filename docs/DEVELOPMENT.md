# NodeBloom 개발 가이드

> NodeBloom(노드블룸)은 "노드가 피다, 지식이 자라다"를 슬로건으로 하는 AI 기반 스킬트리 교육 플랫폼입니다.
> 이 문서는 프로젝트에서 사용하는 기술 스택, DB 스키마, AI 파이프라인, Server Action 패턴, 고유 규칙을 정리한 **단일 소스의 개발 가이드**입니다.

---

## 목차
1. [기술 스택](#1-기술-스택)
2. [프로젝트 구조](#2-프로젝트-구조)
3. [DB 스키마 (40개 테이블)](#3-db-스키마-40개-테이블)
4. [AI 핵심 로직 (16종)](#4-ai-핵심-로직-16종)
5. [Server Action 패턴](#5-server-action-패턴)
6. [4자 역할 시스템](#6-4자-역할-시스템)
7. [스쿨/클래스 초대 플로우](#7-스쿨클래스-초대-플로우)
8. [게이미피케이션 시스템](#8-게이미피케이션-시스템)
9. [데모 모드 (읽기 전용)](#9-데모-모드-읽기-전용)
10. [프로젝트 고유 규칙](#10-프로젝트-고유-규칙)

---

## 1. 기술 스택

| 영역 | 기술 | 버전/모델 |
|---|---|---|
| **프레임워크** | Next.js | 16 (App Router + Turbopack) |
| **언어** | TypeScript | strict mode |
| **스타일** | Tailwind CSS | 4 |
| **UI** | shadcn/ui + Radix UI | — |
| **아이콘** | lucide-react | — |
| **AI SDK** | Vercel AI SDK | v6 (`generateObject`, `streamText`) |
| **AI 모델** | Anthropic Claude | `claude-sonnet-4-6` |
| **임베딩** | OpenAI | `text-embedding-3-small` |
| **STT** | OpenAI Whisper | `whisper-1` |
| **DB** | Supabase PostgreSQL | 17 |
| **Auth** | Supabase Auth | — |
| **RAG** | Supabase pgvector | 1536 dim |
| **시각화** | D3.js | 7 (force simulation) |
| **차트** | Recharts | 3 |
| **알림** | sonner | — |
| **배포** | Vercel | + GitHub |

### 핵심 디자인 원칙
- **React 19 Server Components 우선** — 가능한 한 Server Component, 인터랙션 필요 시 Client
- **Server Actions 전용** — API Routes 없음, 모든 백엔드 로직은 `'use server'` 파일
- **getCachedUser** — `React.cache()`로 동일 SSR request 내 `auth.getUser()` 1회만 실행
- **Admin client 패턴** — RLS 우회하여 service_role로 조회 (인증은 getCachedUser에서 이미 확인)

---

## 2. 프로젝트 구조

```
nodebloom/
├── src/
│   ├── app/                        # 39 routes
│   │   ├── (auth)/                 # login, signup, verify, callback, forgot-password, reset-password, terms, privacy
│   │   ├── teacher/                # 교사 라우트 (12)
│   │   ├── student/                # 학생 라우트 (13)
│   │   ├── admin/                  # 운영자 라우트 (6)
│   │   ├── parent/                 # 학부모 라우트 (2)
│   │   ├── layout.tsx              # 루트 metadata
│   │   ├── page.tsx                # 랜딩 페이지
│   │   └── icon.svg                # 파비콘 (NodeBloom 로고)
│   ├── actions/                    # 35 파일 / 136 함수
│   ├── components/
│   │   ├── ui/                     # shadcn/ui
│   │   ├── Logo.tsx                # NodeBloom SVG 로고
│   │   ├── skill-tree/             # D3 그래프, 에디터, 팝업
│   │   ├── quiz/                   # 적응형 퀴즈 + 힌트
│   │   ├── tutor/                  # 채팅, 음성 버튼
│   │   ├── dashboard/              # 차트, 히트맵, 위험 경보
│   │   ├── student/                # 타이머, 코치 카드, 인증서
│   │   ├── feed/                   # 활동 피드
│   │   ├── shared/                 # 공지 배너
│   │   └── layout/                 # Sidebar, Header, DemoBanner
│   ├── lib/
│   │   ├── supabase/               # client/server/admin
│   │   ├── ai/                     # prompts, schemas, embeddings
│   │   ├── d3/                     # skill-tree-layout
│   │   └── demo.ts                 # 데모 판별/가드
│   ├── hooks/                      # useSkillTree, useQuiz, useVoice
│   └── types/                      # 도메인 타입
├── supabase/migrations/            # 20 마이그레이션 (001~020)
├── middleware.ts                   # Auth + role 라우팅
└── docs/                           # 개발 문서
```

---

## 3. DB 스키마 (40개 테이블)

### 3.1 사용자 + 권한
| 테이블 | 주요 컬럼 | 용도 |
|---|---|---|
| `profiles` | `id`, `email`, `name`, `role`, `xp`, `streak_days`, `learning_style`, `avatar_url` | 기본 프로필 (auth.users 트리거로 자동 생성) |
| `schools` | `id`, `name`, `description`, `teacher_code`, `student_code`, `created_by` | 스쿨 + 초대 코드 |
| `school_members` | `school_id`, `user_id`, `role`, `status` | 스쿨 ↔ 유저 매핑 (pending/approved) |
| `classes` | `id`, `school_id`, `name`, `description`, `teacher_id`, `max_students` | 클래스 |
| `class_enrollments` | `id`, `class_id`, `student_id`, `status`, `approved_at`, `approved_by` | 수강신청 (pending/approved/rejected) |
| `class_students` | `class_id`, `student_id` | 승인된 수강 학생 (legacy 호환) |
| `subjects` | `id`, `name` | 과목 마스터 (미사용) |

### 3.2 스킬트리 + 노드
| 테이블 | 주요 컬럼 | 용도 |
|---|---|---|
| `skill_trees` | `id`, `title`, `description`, `class_id`, `created_by`, `subject_hint`, `status`, `style_guide` | 스킬트리 메타 |
| `nodes` | `id`, `skill_tree_id`, `title`, `description`, `difficulty`, `order_index`, `learning_content`, `allow_download`, `allow_print`, `position_x`, `position_y` | 노드 + HTML 학습 문서 |
| `node_edges` | `id`, `skill_tree_id`, `source_node_id`, `target_node_id`, `label` | 선수지식 엣지 |
| `document_chunks` | `id`, `skill_tree_id`, `content`, `embedding` (vector 1536) | RAG 벡터 스토리지 |

### 3.3 학습 진도
| 테이블 | 주요 컬럼 | 용도 |
|---|---|---|
| `student_progress` | `student_id`, `node_id`, `skill_tree_id`, `status` (locked/available/in_progress/completed), `quiz_score`, `completed_at` | 노드별 학생 진도 |
| `quizzes` | `id`, `node_id`, `question`, `question_type`, `options`, `correct_answer`, `explanation`, `difficulty` | 퀴즈 문항 |
| `quiz_attempts` | `id`, `student_id`, `quiz_id`, `node_id`, `user_answer`, `is_correct`, `score`, `feedback`, `hint_used`, `attempted_at` | 풀이 시도 기록 |

### 3.4 게이미피케이션
| 테이블 | 주요 컬럼 | 용도 |
|---|---|---|
| `daily_missions` | `student_id`, `mission_type`, `title`, `target`, `progress`, `completed`, `xp_reward`, `mission_date` | 일일 미션 (5유형) |
| `achievements` | `id`, `code`, `title`, `description`, `icon`, `xp_reward`, `condition_type`, `condition_value` | 업적 마스터 (10종) |
| `user_achievements` | `user_id`, `achievement_id`, `earned_at` | 유저 업적 획득 |
| `review_reminders` | `student_id`, `node_id`, `remind_at`, `completed`, `interval_days` | 적응형 복습 알림 (에빙하우스 1/3/7일) |
| `flashcards` | `id`, `node_id`, `card_index`, `front`, `back` | AI 자동 생성 플래시카드 (노드당 5장) |
| `flashcard_reviews` | `student_id`, `flashcard_id`, `result` (known/unknown) | 복습 결과 |
| `certificates` | `id`, `student_id`, `skill_tree_id`, `tree_title`, `node_count`, `avg_score`, `teacher_name`, `issued_at` | 스킬트리 100% 완료 시 자동 발급 |

### 3.5 AI 캐시 (비용 절감)
| 테이블 | 주요 컬럼 | 용도 |
|---|---|---|
| `emotion_reports` | `student_id`, `skill_tree_id`, `mood`, `mood_score`, `insights`, `recommendation`, `report_date` | 학습 감정 분석 캐시 (일 단위) |
| `weekly_plans` | `student_id`, `week_start`, `plan` (jsonb), `motivation` | 주간 학습 플랜 캐시 (주 단위) |
| `weekly_briefings` | `class_id`, `week_start`, `summary`, `highlights`, `concerns`, `action_items` | 교사용 주간 브리핑 캐시 |
| `tutor_conversations` | `student_id`, `messages` (jsonb), `updated_at` | 튜터 대화 기록 (세션 유지) |
| `lesson_recordings` | `id`, `teacher_id`, `transcript`, `summary` (jsonb), `duration_seconds` | Whisper 전사 + Claude 요약 캐시 |

### 3.6 학부모 연결
| 테이블 | 주요 컬럼 | 용도 |
|---|---|---|
| `parent_invite_codes` | `code`, `student_id`, `expires_at` | 6자리 학부모 초대 코드 |
| `parent_student_links` | `parent_id`, `student_id`, `created_at` | 학부모 ↔ 자녀 매핑 |

### 3.7 커뮤니케이션
| 테이블 | 주요 컬럼 | 용도 |
|---|---|---|
| `announcements` | `id`, `school_id`, `author_id`, `title`, `content`, `target_role` | 공지사항 |
| `announcement_reads` | `user_id`, `announcement_id`, `read_at` | 읽음 처리 |
| `direct_messages` | `id`, `school_id`, `sender_id`, `receiver_id`, `content`, `read_at` | 1:1 메신저 |
| `activity_feed` | `id`, `class_id`, `user_id`, `action_type`, `detail`, `created_at` | 활동 피드 타임라인 |
| `feed_reactions` | `feed_id`, `user_id`, `emoji` | 피드 이모지 리액션 |
| `study_groups` | `id`, `class_id`, `name`, `created_by` | 스터디 그룹 |
| `study_group_members` | `group_id`, `user_id`, `joined_at` | 그룹 멤버 |
| `study_group_messages` | `group_id`, `user_id`, `content`, `created_at` | 그룹 채팅 |

### 3.8 기타
| 테이블 | 주요 컬럼 | 용도 |
|---|---|---|
| `node_memos` | `student_id`, `node_id`, `content` | 학생 노드 메모 (upsert) |

### 3.9 마이그레이션 순서
| 파일 | 내용 |
|---|---|
| `001_initial.sql` | 기본 스키마 (profiles, skill_trees, nodes, quizzes, progress) |
| `002_auth_trigger.sql` | auth.users → profiles 자동 생성 트리거 |
| `003_fix_profiles_rls_recursion.sql` | profiles RLS 재귀 제거 |
| `004_add_rls_for_phase3.sql` | 노드/엣지 RLS |
| `005_quiz_rls.sql` | 퀴즈 + 시도 RLS |
| `006_fix_missing_rls_policies.sql` | 클래스 RLS 보강 |
| `007_school_class_system.sql` | 스쿨/클래스/enrollment + 초대 코드 |
| `008_student_features.sql` | 미션/업적/메모/복습 |
| `009_teacher_ai_features.sql` | 수업 녹음/메신저/공지 |
| `010_social_polish.sql` | 활동 피드/스터디 그룹/리액션 |
| `011_node_learning_content.sql` | 노드 learning_content 컬럼 (HTML 학습지) |
| `012_skill_tree_style_guide.sql` | 스킬트리 스타일 가이드 (교사 작성 톤 학습) |
| `013_special_features.sql` | 감정 리포트/이탈 경보/시뮬레이션 지원 |
| `014_advanced_features.sql` | 크로스커리큘럼/학부모 연결/인증서 |
| `015_weekly_plans_cache.sql` | 주간 학습 플랜 캐시 |

---

## 4. AI 핵심 로직 (13종)

각 AI 기능의 상세 입력/출력/모델/비용 특성은 [AI-PIPELINE.md](./AI-PIPELINE.md) 참조.

| # | 기능 | Server Action | 모델 | 캐시 |
|---|---|---|---|---|
| 1 | 스킬트리 자동 생성 | `generateSkillTree`, `saveSkillTree` | Claude | DB (skill_trees) |
| 2 | 퀴즈 생성/채점 | `generateQuizForNode`, `submitQuizAnswer`, `getQuizHint` | Claude | DB (quizzes) |
| 3 | 소크라틱 튜터 (RAG) | `chatWithTutor` | Claude + Embedding | 대화 기록 |
| 4 | 수업 녹음 → 요약 | `transcribeRecording`, `summarizeLesson`, `generateQuizFromRecording` | Whisper + Claude | DB (lesson_recordings) |
| 5 | 주간 학습 플랜 | `getWeeklyPlan` | Claude | 주 단위 (weekly_plans) |
| 6 | 학습 감정 분석 | `analyzeStudentEmotion` | Claude | 일 단위 (emotion_reports) |
| 7 | 이탈 조기 경보 | `calculateRiskScore`, `getClassRiskAlerts` | 통계 (AI X) | — |
| 8 | 적응형 복습 엔진 | `getTodayReviews`, `markReviewCompleted` | 로직 (AI X) | — |
| 9 | 크로스커리큘럼 지식 맵 | `findConceptConnections` | Claude | — |
| 10 | HTML 학습지 생성 | `generateLearningDocForNode`, `getOrCreatePersonalizedDoc` | Claude | DB (nodes.learning_content) |
| 11 | 약점 진단 + 오답 분석 | `analyzeWeakness`, `getWrongAnswers` | Claude | — |
| 12 | 학부모 리포트 + 인증서 | `generateParentReport`, `issueCertificate`, `generateWeeklyBriefing` | Claude | 주 단위 (weekly_briefings) |
| 13 | 사전 시뮬레이션 | `simulateSkillTree` | Claude | — |

**추가 AI 지원 기능**
- `generateFlashcards` — 노드 완료 시 5장 플래시카드 자동 생성
- `analyzeStudentGroups`, `analyzeBottlenecks` — 교사/운영자용 통계 분석
- `getConceptConnections` — 개념 연결 추천

---

## 5. Server Action 패턴

### 5.1 표준 쓰기 액션
```typescript
'use server'

import { getCachedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertNotDemo } from '@/lib/demo'

export async function saveMemo(
  nodeId: string,
  content: string
): Promise<{ error?: string }> {
  try {
    // 1. 인증 확인 (React cache로 동일 request 내 1회만 실행)
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    // 2. 데모 가드
    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    // 3. 입력 검증
    if (content.length > 2000) return { error: '메모가 너무 깁니다.' }

    // 4. DB 작업 (admin client — RLS bypass)
    const admin = createAdminClient()
    const { error } = await admin.from('node_memos').upsert({
      student_id: user.id,
      node_id: nodeId,
      content,
    }, { onConflict: 'student_id,node_id' })

    if (error) return { error: error.message }
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}
```

### 5.2 표준 AI 생성 액션
```typescript
'use server'

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { getCachedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertNotDemo } from '@/lib/demo'
import { quizSchema } from '@/lib/ai/schemas'
import { QUIZ_PROMPT } from '@/lib/ai/prompts'

export async function generateQuizForNode(
  nodeId: string
): Promise<{ data?: Quiz[]; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const admin = createAdminClient()

    // 1. 캐시 확인 (이미 있으면 그대로 반환)
    const { data: existing } = await admin
      .from('quizzes')
      .select('*')
      .eq('node_id', nodeId)
    if (existing && existing.length > 0) return { data: existing as Quiz[] }

    // 2. 데모 가드 (캐시 miss 시에만, 미리 만든 퀴즈만 사용하도록)
    const demoBlock = assertNotDemo(user.email)
    if (demoBlock) return demoBlock

    // 3. AI 호출
    const { data: node } = await admin.from('nodes').select('title, description, difficulty').eq('id', nodeId).single()
    if (!node) return { error: '노드를 찾을 수 없습니다.' }

    const { object: quiz } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: quizSchema,
      prompt: QUIZ_PROMPT(node.title, node.description ?? '', node.difficulty ?? 1),
    })

    // 4. DB 저장 후 반환
    const { data: saved } = await admin
      .from('quizzes')
      .insert(quiz.questions.map(q => ({ node_id: nodeId, ...q })))
      .select()

    return { data: saved as Quiz[] }
  } catch (err) {
    return { error: err instanceof Error ? err.message : '퀴즈 생성 실패' }
  }
}
```

### 5.3 읽기 액션
```typescript
export async function getStudentDashboardData(
  studentId: string
): Promise<{ data?: StudentDashboardData; error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    // 권한: 본인 / 담당 교사 / admin만
    if (user.id !== studentId) {
      // ... 권한 체크 로직
    }

    const admin = createAdminClient()
    // ... 조회 로직
    return { data }
  } catch (err) {
    return { error: String(err) }
  }
}
```

### 5.4 내부 호출 silent skip 패턴
```typescript
// completeNode 같은 핵심 액션 내부에서 호출되는 sub-action
// 데모 계정이면 에러 없이 조용히 skip (상위 로직이 계속 진행하도록)
export async function updateMissionProgress(
  type: string,
  delta: number
): Promise<{ error?: string }> {
  try {
    const user = await getCachedUser()
    if (!user) return { error: '인증이 필요합니다.' }

    // 데모는 silent skip (에러 토스트 방지)
    if (isDemoAccount(user.email)) return {}

    // ... 실제 로직
    return {}
  } catch (err) {
    return { error: String(err) }
  }
}
```

---

## 6. 4자 역할 시스템

### 6.1 역할 판별
- **middleware.ts**: `user.user_metadata.role`을 우선 사용 (signup 시 `options.data.role`로 저장됨)
- **Fallback**: metadata에 role이 없으면 `profiles.role` DB 조회 (레거시 계정 대비)
- **RoleGuard** 컴포넌트: 페이지 레벨에서 역할 확인

### 6.2 라우트 매핑
| 역할 | 베이스 경로 | 주요 페이지 |
|---|---|---|
| `teacher` | `/teacher/*` | dashboard, skill-tree, classes, quizzes, recording, report, messages, join |
| `student` | `/student/*` | dashboard, skill-tree (내 학습), quiz, tutor, wrong-answers, groups, messages, onboarding, join |
| `parent` | `/parent/*` | dashboard, link |
| `admin` | `/admin/*` | dashboard, schools, announcements, messages |

### 6.3 권한 체크 패턴
```typescript
// Dashboard Server Action 예시
if (user.id !== studentId) {
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  let allowed = profile?.role === 'admin'
  if (!allowed && profile?.role === 'teacher') {
    // 이 학생이 내 클래스인지 확인
    const { data: enrollments } = await admin
      .from('class_enrollments')
      .select('class_id, classes!inner(teacher_id)')
      .eq('student_id', studentId)
      .eq('status', 'approved')
    allowed = !!enrollments?.some(e => {
      const cls = Array.isArray(e.classes) ? e.classes[0] : e.classes
      return cls?.teacher_id === user.id
    })
  }
  if (!allowed) return { error: '권한이 없습니다.' }
}
```

---

## 7. 스쿨/클래스 초대 플로우

```
운영자(admin)
   ├─ createSchool() → schools.teacher_code + student_code 자동 발급
   └─ 코드를 교사/학생에게 배포

교사(teacher)
   ├─ joinSchoolAsTeacher(code) → school_members (status: approved)
   ├─ createClass(schoolId, name, description, teacherId)
   ├─ 학생의 수강신청 승인: approveEnrollment(enrollmentId)
   └─ 클래스에 스킬트리 배포 (saveSkillTree)

학생(student)
   ├─ joinWithCode(code) → school_members (status: pending or approved)
   ├─ requestClassEnrollment(classId) → class_enrollments (status: pending)
   ├─ 교사 승인 대기 → approved 후 학습 시작
   └─ /student/skill-tree에서 "내 학습" (클래스 → 스킬트리 2단계 아코디언)

학부모(parent)
   ├─ 자녀가 createParentInviteCode() → 6자리 코드 생성
   ├─ linkParentToStudent(code) → parent_student_links 생성
   └─ /parent에서 자녀 학습 현황 확인
```

---

## 8. 게이미피케이션 시스템

### 8.1 XP / 레벨
- XP는 `profiles.xp`에 저장
- 레벨 = `Math.floor(xp / 100) + 1`
- XP 획득원: 노드 완료(+30), 퀴즈 만점(+25), 일일 미션 완료(+20~35)

### 8.2 학습 스트릭
- `profiles.streak_days` + `profiles.last_study_date`
- `addStudyMinutes()` 호출 시 날짜 비교로 자동 증감
- 하루 학습 안 하면 다음날 0으로 리셋

### 8.3 일일 미션 (5유형)
```typescript
const MISSION_TEMPLATES = [
  { type: 'unlock_node', title: '노드 1개 언락하기', target: 1, xp_reward: 30 },
  { type: 'complete_quiz', title: '퀴즈 3개 풀기', target: 3, xp_reward: 25 },
  { type: 'ask_tutor', title: 'AI 튜터에게 1번 질문하기', target: 1, xp_reward: 20 },
  { type: 'review_node', title: '복습 노드 1개 다시 풀기', target: 1, xp_reward: 25 },
  { type: 'study_time', title: '30분 학습하기', target: 30, xp_reward: 35 },
]
```
- 매일 랜덤 3개 자동 생성 (`getTodayMissions`)
- 진도 자동 추적: 다른 Server Action이 `updateMissionProgress`로 delta 전달

### 8.4 업적 10종
- `first_unlock`, `five_unlocks`, `ten_unlocks`, `perfect_quiz`, `perfect_streak`, ...
- `checkAndAwardAchievements()` — 학생 활동 집계 후 미획득 업적 자동 부여

### 8.5 플래시카드
- 노드 완료 시 `generateFlashcards()` 자동 호출 (AI 5장)
- `flashcards` 테이블에 저장, 학생이 "알겠어요/다시볼게요" 선택

### 8.6 수료 인증서
- `issueCertificate()` — 스킬트리 100% 완료 시 자동 발급
- HTML 템플릿으로 인쇄 가능 (A4, NodeBloom 로고 + SEAL)

### 8.7 적응형 복습 (에빙하우스)
- `review_reminders.interval_days` — 정답률에 따라 2배/1배/0.5배 자동 조절
- 기본 간격: 1일 → 3일 → 7일 → 14일 → 30일

---

## 9. 데모 모드 (읽기 전용)

### 9.1 판별 (`src/lib/demo.ts`)
```typescript
export const DEMO_TEACHER_EMAIL = 'demo_teacher@learngraph.app'
export const DEMO_STUDENT_EMAIL = 'demo_student@learngraph.app'

export function isDemoAccount(email: string | null | undefined): boolean { /* ... */ }

export function assertNotDemo(email: string | null | undefined): { error: string } | null {
  if (isDemoAccount(email)) {
    return { error: '체험 모드에서는 이 기능을 사용할 수 없습니다. 회원가입 후 이용해주세요!' }
  }
  return null
}
```

### 9.2 쓰기 가드
모든 쓰기 Server Action 상단에서 호출:
```typescript
const demoBlock = assertNotDemo(user.email)
if (demoBlock) return demoBlock
```
내부 호출(미션 진행 등)은 `isDemoAccount` 체크 + silent return.

### 9.3 시드 (`src/actions/demo-setup.ts`)
- `setupDemoData()` — idempotent (fast-path로 구축 완료 감지 시 즉시 return)
- 생성 데이터:
  - "NodeBloom 체험 학교" + "AI 학습 체험반"
  - "인공지능의 이해" 스킬트리 14 노드 + 엣지
  - HTML 학습 문서 (node당 300자+)
  - 4개 완료 노드: 퀴즈 16개 + 플래시카드 20개 + quiz_attempts
  - 미션 3개, 업적 3개, 감정 리포트, 주간 브리핑
  - 환영 공지 + DM 2개
- 학생 `김지수`, 교사 `박지훈`

### 9.4 UI
- `DemoBanner` 컴포넌트 (Server Component) — 4개 레이아웃 상단에서 `isDemoAccount(profile.email)` 체크 후 조건부 렌더
- 로그인 페이지 "교사 체험하기" / "학생 체험하기" 버튼 → `loginAsDemo(role)` → 클라이언트에서 `signInWithPassword`

---

## 10. 프로젝트 고유 규칙

> 이 규칙들은 코드베이스 전반에 적용되며, 예외 없이 준수되어야 합니다.

1. **DB 조회/쓰기는 반드시 `createAdminClient()` 사용.**
   인증은 `getCachedUser()`로만 확인. `createServerClient()`는 `getCachedUser` 내부에서만 사용.

2. **Server Action은 throw 금지.**
   반드시 `{ data, error }` 객체 반환. try-catch로 모든 에러를 `error` 필드로 변환.

3. **RLS 정책 SQL 작성 시 `CREATE POLICY` 앞에 항상 `DROP POLICY IF EXISTS` 선행.**
   마이그레이션 재실행 안전 보장.

4. **Zod 스키마에서 `z.number()`에 `.min()`/`.max()` 금지.**
   범위 제약은 `.describe()`와 프롬프트로 지시 (Claude 구조화 출력 호환성).

5. **Claude API 모델 ID는 `claude-sonnet-4-6` 사용.**
   코드베이스 전체 통일.

6. **`generateObject`/`streamText` 반환 시 직렬화 가능한 패턴 사용.**
   Server Action에서 stream 객체 자체를 반환하지 않음 — 완료된 객체만.

### 추가 금지 패턴
- ❌ API Routes 생성 (`app/api/*/route.ts`) — Server Actions로 대체
- ❌ `useEffect`에서 직접 `setState` 호출 (React 19 set-state-in-effect 경고) — event handler로 옮김
- ❌ `any` 타입 사용 — `unknown` 또는 구체 타입
- ❌ 사용자 대면 영문 메시지 — 한국어로 번역
- ❌ 150줄 초과 컴포넌트 — 분리

---

## 참고 문서
- [PHASES.md](./PHASES.md) — 개발 Phase 로드맵
- [AI-PIPELINE.md](./AI-PIPELINE.md) — 13종 AI 파이프라인 상세
- [PLANNING.md](./PLANNING.md) — 프로젝트 기획서
