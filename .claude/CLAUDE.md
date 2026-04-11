# NodeBloom — AI 기반 스킬트리 교육 플랫폼

## 프로젝트 개요
교사가 수업 자료를 업로드하면 AI가 자동으로 스킬트리(Skill Tree)를 생성하고,
학생이 퀴즈를 풀어 노드를 잠금해제하며 학습하는 차세대 교육 플랫폼.
슬로건: **"노드가 피다, 지식이 자라다"** — 노드를 하나씩 잠금해제하면 꽃이 피듯 지식이 확장된다.

- **공모전**: 제1회 KIT 바이브코딩 공모전 — AI활용 차세대 교육 솔루션
- **핵심 가치**: 교사 · 학생 · 학부모 · 운영자 **4자 연동**
- **브랜드 컬러**: `#6366F1` (인디고) · `#A855F7` (연보라) · `#10B981` (초록)

## 프로젝트 현황
- **라우트**: 46개 (Static 9 + Dynamic 37)
- **Server Action**: 35개 파일 / **135개 함수**
- **DB 테이블**: 40개 (마이그레이션 001~021)
- **AI 기능**: 16종 통합
- **컴포넌트**: 68개
- **소스 파일**: 203개 (.ts/.tsx)
- **역할 시스템**: 5자 (teacher / student / admin / parent / learner)

## 기술 스택 (절대 변경 금지)
- **프론트엔드**: Next.js 16 (App Router + Turbopack) + TypeScript strict + Tailwind CSS 4 + shadcn/ui
- **AI 프레임워크**: Vercel AI SDK v6 (`generateObject`, `streamText`) + Server Actions
- **AI 엔진**: Claude Sonnet 4.6 (`claude-sonnet-4-6` 모델 ID) — `@ai-sdk/anthropic`
- **RAG**: Supabase pgvector + OpenAI `text-embedding-3-small`
- **음성**: OpenAI Whisper API (STT)
- **DB**: Supabase (Auth + PostgreSQL + pgvector + Realtime + Storage)
- **시각화**: D3.js (스킬트리 force simulation) + Recharts (대시보드 차트)
- **배포**: Vercel + GitHub

## 프로젝트 구조
```
nodebloom/
├── .claude/
│   ├── CLAUDE.md              # 이 파일
│   ├── launch.json            # Preview 서버 설정
│   └── commands/              # 커스텀 슬래시 커맨드
├── docs/
│   ├── DEVELOPMENT.md         # 개발 가이드
│   ├── PHASES.md              # Phase별 개발 로드맵
│   ├── AI-PIPELINE.md         # AI 파이프라인 상세
│   ├── PLANNING.md            # 프로젝트 기획서
│   └── planning/              # 제출용 PDF
├── src/
│   ├── app/                        # Next.js 16 App Router (39 routes)
│   │   ├── (auth)/                 # login, signup, verify, callback, forgot-password, reset-password, terms, privacy
│   │   ├── teacher/                # 12 routes — dashboard, skill-tree, classes, quizzes, recording, report, messages, join, profile
│   │   ├── student/                # 13 routes — dashboard, skill-tree, quiz, tutor, wrong-answers, groups, messages, onboarding, join, achievements, profile
│   │   ├── admin/                  # 6 routes — dashboard, schools, announcements, messages
│   │   ├── parent/                 # 2 routes — dashboard, link
│   │   ├── not-found.tsx           # 404 페이지
│   │   ├── error.tsx               # 에러 바운더리
│   │   ├── layout.tsx              # 루트 레이아웃 (metadata)
│   │   ├── page.tsx                # 랜딩 페이지
│   │   └── icon.svg                # 파비콘 (NodeBloom SVG 로고)
│   ├── actions/                    # 35개 Server Action 파일, 135개 함수
│   │   ├── skill-tree.ts           # 스킬트리 생성/수정 (AI)
│   │   ├── quiz.ts                 # 퀴즈 생성/채점/힌트 (AI)
│   │   ├── tutor.ts                # 소크라틱 AI 튜터 (RAG)
│   │   ├── recording.ts            # 수업 녹음 + 전사 + 요약
│   │   ├── coach.ts                # 주간 학습 플랜 (AI)
│   │   ├── emotion.ts              # 학습 감정 분석 (AI)
│   │   ├── alert.ts                # 이탈 조기 경보
│   │   ├── cross-curriculum.ts     # 크로스커리큘럼 지식 맵 (AI)
│   │   ├── learning-doc.ts         # HTML 학습지 자동 생성 (AI)
│   │   ├── weakness.ts             # 약점 진단 + 오답 분석 (AI)
│   │   ├── simulation.ts           # 사전 시뮬레이션 + AI 재생성 (AI)
│   │   ├── briefing.ts             # 주간 AI 브리핑
│   │   ├── report.ts               # 학부모 리포트 (AI)
│   │   ├── certificate.ts          # 수료 인증서 자동 발급
│   │   ├── flashcard.ts            # 플래시카드 생성/복습
│   │   ├── reminders.ts            # 적응형 복습 엔진
│   │   ├── missions.ts             # 일일 미션
│   │   ├── achievements.ts         # 업적/배지
│   │   ├── school.ts               # 스쿨/클래스/enrollment (16 함수)
│   │   ├── parent.ts               # 학부모 연결
│   │   ├── messages.ts             # 메신저
│   │   ├── announcements.ts        # 공지
│   │   ├── feed.ts                 # 활동 피드
│   │   ├── study-group.ts          # 스터디 그룹
│   │   ├── memo.ts                 # 노드 메모
│   │   ├── study-time.ts           # 학습 시간 타이머
│   │   ├── dashboard.ts            # 대시보드 집계
│   │   ├── dashboard-filters.ts    # 대시보드 컨텍스트 선택 + 노드별 잠금해제율
│   │   ├── analysis.ts             # 학생 그룹/병목 분석 (AI)
│   │   ├── recommendations.ts      # 개념 추천 (AI)
│   │   ├── ranking.ts              # XP/스트릭/진도 랭킹
│   │   ├── profile.ts              # 프로필/닉네임/아바타/계정 삭제
│   │   ├── learning-style.ts       # 학습 스타일 진단/재진단
│   │   ├── voice.ts                # 음성 입력 (Whisper)
│   │   └── demo-setup.ts           # 데모 환경 idempotent 구축
│   ├── components/
│   │   ├── ui/                     # shadcn/ui 컴포넌트
│   │   ├── Logo.tsx                # NodeBloom SVG 로고 (variant/size/light)
│   │   ├── skill-tree/             # SkillTreeGraph (D3), NodeEditor, NodeDetailPopup
│   │   ├── quiz/                   # AdaptiveQuiz, 힌트 UI
│   │   ├── tutor/                  # ChatInterface, VoiceButton
│   │   ├── dashboard/              # 차트, 히트맵, 위험 경보
│   │   ├── student/                # WeeklyPlanCard, StudyTimer, MyCertificatesCard
│   │   ├── feed/                   # ActivityFeed
│   │   ├── shared/                 # AnnouncementBanner
│   │   ├── shared/                 # AnnouncementBanner, MessengerView, EmptyState, AccountSettings
│   │   └── layout/                 # Sidebar, Header, DemoBanner, DemoTutorial, DashboardShell, RealtimeProvider, MessageNotifier, RoleGuard
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts           # 브라우저 클라이언트
│   │   │   ├── server.ts           # 서버 클라이언트 + getCachedUser (React cache)
│   │   │   └── admin.ts            # Admin 클라이언트 (service_role)
│   │   ├── ai/
│   │   │   ├── prompts.ts          # 프롬프트 템플릿
│   │   │   ├── schemas.ts          # Zod 스키마 (AI 출력)
│   │   │   └── embeddings.ts       # 벡터 임베딩
│   │   ├── d3/
│   │   │   └── skill-tree-layout.ts  # D3 레이아웃 + 테마
│   │   ├── demo.ts                 # isDemoAccount + assertNotDemo 가드
│   │   └── utils.ts
│   ├── hooks/                      # useSkillTree, useQuiz, useVoice
│   └── types/                      # skill-tree, quiz, user, database
├── supabase/
│   └── migrations/                 # 21개 마이그레이션 (001~021)
├── middleware.ts                   # Auth middleware (user_metadata.role 기반 최적화)
└── package.json                    # name: nodebloom
```

## 코딩 규칙

### 필수 원칙
1. **TypeScript strict mode** — any 타입 절대 금지, 모든 함수에 반환 타입 명시
2. **Server Actions** — API Routes 대신 Vercel AI SDK v6의 Server Actions 사용
3. **Zod 스키마** — AI 출력은 반드시 Zod로 구조화, `z.infer`로 타입 추론
4. **에러 핸들링** — try-catch 필수, 사용자에게 한국어 에러 메시지 표시
5. **한국어 UI** — 모든 사용자 대면 텍스트는 한국어, 코드 주석은 한국어/영어 모두 OK
6. **컴포넌트 크기** — 150줄 초과 시 분리, 단일 책임 원칙
7. **파일 네이밍** — 컴포넌트: `PascalCase.tsx`, 유틸/훅: `camelCase.ts`

### AI 호출 패턴
```typescript
// ✅ 올바른 패턴 — Server Action + generateObject
'use server'
import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { skillTreeSchema } from '@/lib/ai/schemas'
import { getCachedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertNotDemo } from '@/lib/demo'

export async function generateSkillTree(content: string) {
  const user = await getCachedUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const demoBlock = assertNotDemo(user.email)
  if (demoBlock) return demoBlock

  try {
    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: skillTreeSchema,
      prompt: SKILL_TREE_PROMPT(content),
    })
    return { data: object }
  } catch (err) {
    return { error: err instanceof Error ? err.message : '생성 실패' }
  }
}
```

```typescript
// ❌ 금지 패턴 — API Route 사용
// app/api/skill-tree/route.ts  ← 이렇게 하지 마라
```

### DB 접근 패턴
```typescript
// 인증 확인
import { getCachedUser } from '@/lib/supabase/server'
const user = await getCachedUser()
if (!user) return { error: '인증이 필요합니다.' }

// DB 조회/쓰기
import { createAdminClient } from '@/lib/supabase/admin'
const admin = createAdminClient()
const { data } = await admin.from('profiles').select('*').eq('id', user.id).single()
```

### 역할 기반 접근 제어
- **4가지 역할**: `'teacher' | 'student' | 'parent' | 'admin'`
- **middleware.ts**에서 `user_metadata.role` 확인 후 리디렉트 (profiles 쿼리 회피 최적화)
- **RLS 정책**으로 DB 레벨 보안
- **RoleGuard** 컴포넌트로 UI 레벨 보안
- **isDemoAccount + assertNotDemo** 가드로 데모 계정 쓰기 차단

---

## 프로젝트 고유 규칙 (예외 없음)

1. **DB 조회/쓰기는 반드시 `createAdminClient()` 사용.** `createServerClient()`는 내부적으로 `getCachedUser()`에서만 사용되며, 일반 Server Action은 `getCachedUser()`로 인증 확인만 수행.
2. **Server Action은 throw 금지.** 반드시 `{ data, error }` 객체 반환 패턴.
3. **RLS 정책 SQL 작성 시 `CREATE POLICY` 앞에 항상 `DROP POLICY IF EXISTS` 선행.** 재실행 안전 보장.
4. **Zod 스키마에서 `z.number()`에 `.min()`/`.max()` 금지.** 범위는 `.describe()`와 프롬프트로 지시.
5. **Claude API 모델 ID는 `claude-sonnet-4-6`을 사용.** 코드베이스 전체 통일.
6. **`generateObject`/`streamText` 반환 시 직렬화 가능한 패턴 사용.** Server Action은 객체만 반환.

---

## 주요 시스템

### 4자 역할 시스템
| 역할 | 메뉴/기능 | 경로 |
|---|---|---|
| 👨‍🏫 **교사** | 스킬트리 관리 · 클래스 · 퀴즈 · 수업 녹음 · 학부모 리포트 · 메시지 | `/teacher/*` |
| 👩‍🎓 **학생** | 내 학습 · 퀴즈 · AI 튜터 · 오답노트 · 스터디 그룹 · 메시지 | `/student/*` |
| 👨‍👩‍👧 **학부모** | 자녀 학습 현황 · 연결 | `/parent/*` |
| 🛡️ **운영자** | 스쿨 관리 · 공지 · 병목 분석 · 메시지 | `/admin/*` |

### 스쿨/클래스 초대 플로우
1. 운영자 → 스쿨 생성, 교사/학생 초대 코드 자동 발급
2. 교사 → 코드로 스쿨 가입 → 클래스 생성 + 학생 수강신청 승인
3. 학생 → 클래스 코드로 수강신청 → 교사 승인 → 학습 시작
4. 학부모 → 자녀의 6자리 초대 코드로 자동 연결

### AI 통합 16종
1. 스킬트리 자동 생성 · 2. AI 퀴즈 + 서술형 채점 · 3. 소크라틱 AI 튜터 (RAG)
4. 수업 녹음 → 전사 → 요약 · 5. 주간 학습 플랜 · 6. 학습 감정 분석
7. 이탈 조기 경보 · 8. 적응형 복습 엔진 · 9. 크로스커리큘럼 지식 맵
10. HTML 학습지 자동 생성 · 11. 약점 진단 + 오답 분석
12. 학부모 리포트 + 인증서 · 13. 사전 시뮬레이션 + AI 재생성
14. 학생 그룹 분석 · 15. 플래시카드 자동 생성 · 16. 개념 연결 추천

### 둘러보기 모드 (읽기 전용)
- **판별**: `isDemoAccount(email)` — `demo_teacher@learngraph.app` 또는 `demo_student@learngraph.app`
- **가드**: 모든 쓰기 Server Action 상단에서 `assertNotDemo(user.email)` 호출
- **시드**: `setupDemoData()` — idempotent (fast-path로 이미 구축된 경우 즉시 return)
- **UI**: `DemoBanner` 컴포넌트 5개 레이아웃 상단 표시 + `DemoTutorial` 카드 팝업
- **계정명**: 데모 학생(`데모 학생`) / 데모 교사(`데모 선생님`)

---

## 환경 변수
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI APIs
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Git 규칙
- 커밋 메시지: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `perf:`, `brand:` 접두사
- main 브랜치에 직접 푸시 (1인 개발이므로)
- `.env.local`은 `.gitignore`에 반드시 포함 (API Key 노출 방지)

## 주의사항
- **API Key 노출 금지** — `.env.local` 파일은 절대 커밋하지 않음
- **데모 데이터** — 실제 학생 정보 사용 금지, 데모 계정은 `데모`/`데모 학생`/`데모 선생님` (이메일: `demo_student@learngraph.app`, `demo_teacher@learngraph.app`)
- **비용 관리** — Claude Sonnet 4.6 사용, 캐싱 우선 (weekly_plans, emotion_reports, weekly_briefings 등 DB에 캐시 후 재조회)
- **브랜드**: LearnGraph 언급 발견 시 전부 NodeBloom으로 교체. 예외: `demo.ts`의 이메일 도메인(`@learngraph.app`), `demo-setup.ts`의 `LEGACY_DEMO_SCHOOL_NAME` 상수(migration 참조용)는 의도적 유지
