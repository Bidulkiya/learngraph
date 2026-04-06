# LearnGraph — AI 기반 스킬트리 교육 플랫폼

## 프로젝트 개요
교사가 수업 자료를 업로드하면 AI가 자동으로 스킬트리(Skill Tree)를 생성하고,
학생이 퀴즈를 풀어 노드를 언락하며 학습하는 차세대 교육 플랫폼.

- **공모전**: KEG 바이브 코딩 대회 (2025.04.06 ~ 04.13)
- **주제**: AI활용 차세대 교육 솔루션
- **핵심**: 교강사 · 수강생 · 운영자 3자 연동

## 기술 스택 (절대 변경 금지)
- **프론트엔드**: Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **AI 프레임워크**: Vercel AI SDK v6 (Server Actions, streamObject, useChat)
- **AI 엔진**: Claude API (Sonnet 4.6) — @ai-sdk/anthropic
- **RAG**: Supabase pgvector + OpenAI text-embedding-3-small
- **음성**: OpenAI Whisper API (STT) + ElevenLabs Conversational AI SDK (TTS)
- **이미지**: Claude Vision (분석) + GPT Image 1.5 API (생성)
- **DB**: Supabase (Auth + PostgreSQL + pgvector + Realtime + Storage)
- **시각화**: D3.js (스킬트리 그래프) + Recharts (대시보드 차트)
- **배포**: Vercel + GitHub

## 프로젝트 구조
```
learngraph/
├── .claude/
│   ├── CLAUDE.md              # 이 파일
│   └── commands/              # 커스텀 슬래시 커맨드
│       ├── generate-api.md
│       ├── generate-component.md
│       └── generate-schema.md
├── docs/
│   ├── DEVELOPMENT.md         # 개발 뼈대 문서
│   ├── DATABASE.md            # DB 스키마 상세
│   ├── AI-PIPELINE.md         # AI 파이프라인 상세
│   └── planning/              # 기획 문서 (심사위원용)
│       └── LearnGraph_기획서.pdf
├── src/
│   ├── app/
│   │   ├── layout.tsx         # 루트 레이아웃
│   │   ├── page.tsx           # 랜딩 페이지
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── teacher/           # 교사 전용 라우트
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx       # 교사 대시보드
│   │   │   ├── skill-tree/
│   │   │   │   ├── page.tsx   # 스킬트리 목록
│   │   │   │   ├── [id]/page.tsx  # 스킬트리 편집
│   │   │   │   └── new/page.tsx   # 새 스킬트리 생성
│   │   │   ├── students/page.tsx  # 학생 모니터링
│   │   │   └── quizzes/page.tsx   # 퀴즈 관리
│   │   ├── student/           # 학생 전용 라우트
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx       # 학생 대시보드 (내 스킬트리)
│   │   │   ├── skill-tree/
│   │   │   │   └── [id]/page.tsx  # 스킬트리 탐험
│   │   │   ├── quiz/
│   │   │   │   └── [nodeId]/page.tsx  # 퀴즈 풀기
│   │   │   └── tutor/page.tsx     # AI 튜터 채팅
│   │   └── admin/             # 운영자 전용 라우트
│   │       ├── layout.tsx
│   │       ├── page.tsx       # 운영자 대시보드
│   │       ├── templates/page.tsx # 마스터 템플릿 관리
│   │       └── analytics/page.tsx # 전체 분석
│   ├── actions/               # Server Actions (AI 호출)
│   │   ├── skill-tree.ts      # 스킬트리 생성/수정
│   │   ├── quiz.ts            # 퀴즈 생성/채점
│   │   ├── tutor.ts           # AI 튜터 대화
│   │   ├── analyze.ts         # 학습 분석
│   │   └── voice.ts           # 음성 처리
│   ├── components/
│   │   ├── ui/                # shadcn/ui 컴포넌트
│   │   ├── skill-tree/        # 스킬트리 관련
│   │   │   ├── SkillTreeGraph.tsx    # D3 스킬트리 메인
│   │   │   ├── SkillNode.tsx         # 개별 노드
│   │   │   ├── NodeEditor.tsx        # 노드 편집 모달
│   │   │   └── UnlockAnimation.tsx   # 언락 애니메이션
│   │   ├── quiz/              # 퀴즈 관련
│   │   │   ├── QuizCard.tsx
│   │   │   ├── QuizResult.tsx
│   │   │   └── AdaptiveQuiz.tsx
│   │   ├── tutor/             # AI 튜터 관련
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── VoiceButton.tsx
│   │   │   └── TutorMessage.tsx
│   │   ├── dashboard/         # 대시보드 관련
│   │   │   ├── HeatmapChart.tsx
│   │   │   ├── ProgressCard.tsx
│   │   │   └── RiskAlert.tsx
│   │   └── layout/            # 레이아웃 공통
│   │       ├── Sidebar.tsx
│   │       ├── Header.tsx
│   │       └── RoleGuard.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts      # 브라우저 클라이언트
│   │   │   ├── server.ts      # 서버 클라이언트
│   │   │   └── middleware.ts  # Auth 미들웨어
│   │   ├── ai/
│   │   │   ├── prompts.ts     # 프롬프트 템플릿 모음
│   │   │   ├── schemas.ts     # Zod 스키마 (AI 출력 구조)
│   │   │   └── embeddings.ts  # 벡터 임베딩 유틸
│   │   ├── d3/
│   │   │   └── skill-tree-layout.ts  # D3 레이아웃 로직
│   │   └── utils.ts           # 공통 유틸
│   ├── hooks/
│   │   ├── useSkillTree.ts    # 스킬트리 상태 관리
│   │   ├── useQuiz.ts         # 퀴즈 상태 관리
│   │   └── useVoice.ts        # 음성 입출력
│   └── types/
│       ├── skill-tree.ts      # 스킬트리 타입
│       ├── quiz.ts            # 퀴즈 타입
│       ├── user.ts            # 사용자 타입
│       └── database.ts        # DB 타입 (Supabase generated)
├── supabase/
│   ├── migrations/            # DB 마이그레이션 파일
│   └── seed.sql               # 데모 데이터
├── public/
│   └── sounds/
│       └── unlock.mp3         # 언락 효과음
├── .env.local                 # 환경 변수 (gitignore)
├── .env.example               # 환경 변수 템플릿
├── middleware.ts               # Next.js 미들웨어 (Auth)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## 코딩 규칙

### 필수 원칙
1. **TypeScript strict mode** — any 타입 절대 금지, 모든 함수에 반환 타입 명시
2. **Server Actions** — API Routes 대신 Vercel AI SDK v6의 Server Actions 사용
3. **Zod 스키마** — AI 출력은 반드시 Zod로 구조화, z.infer로 타입 추론
4. **에러 핸들링** — try-catch 필수, 사용자에게 한국어 에러 메시지 표시
5. **한국어 UI** — 모든 사용자 대면 텍스트는 한국어, 코드 주석은 영어 OK
6. **컴포넌트 크기** — 150줄 초과 시 분리, 단일 책임 원칙
7. **파일 네이밍** — 컴포넌트: PascalCase.tsx, 유틸/훅: camelCase.ts

### AI 호출 패턴
```typescript
// ✅ 올바른 패턴 — Server Action + streamObject
'use server'
import { streamObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

export async function generateSkillTree(content: string) {
  const result = await streamObject({
    model: anthropic('claude-sonnet-4-6-20250514'),
    schema: skillTreeSchema,  // Zod 스키마
    prompt: SKILL_TREE_PROMPT(content),
  })
  return result
}
```

```typescript
// ❌ 금지 패턴 — API Route 사용
// app/api/skill-tree/route.ts  ← 이렇게 하지 마라
```

### DB 접근 패턴
```typescript
// Server Component에서
import { createServerClient } from '@/lib/supabase/server'
const supabase = await createServerClient()

// Client Component에서
import { createBrowserClient } from '@/lib/supabase/client'
const supabase = createBrowserClient()
```

### 역할 기반 접근 제어
```typescript
// 3가지 역할: 'teacher' | 'student' | 'admin'
// middleware.ts에서 역할 확인 후 리디렉트
// RLS 정책으로 DB 레벨 보안
// RoleGuard 컴포넌트로 UI 레벨 보안
```

## 환경 변수
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI APIs
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
ELEVENLABS_API_KEY=

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Git 규칙
- 커밋 메시지: `feat:`, `fix:`, `docs:`, `style:`, `refactor:` 접두사
- main 브랜치에 직접 푸시 (1인 개발이므로)
- 공모전 제출 기한(04/13) 이후 커밋 절대 금지
- .env.local은 .gitignore에 반드시 포함 (API Key 노출 방지)

## 주의사항
- **API Key 노출 금지** — .env.local 파일은 절대 커밋하지 않음
- **데모 데이터** — 실제 학생 정보 사용 금지, 모두 가상 데이터
- **비용 관리** — Claude는 Sonnet 사용, 단순 작업은 Haiku로 분리 고려
- **속도 우선** — 완벽보다 작동하는 것이 먼저, 폴리싱은 Day 7
