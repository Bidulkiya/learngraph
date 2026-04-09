# 🌳 LearnGraph

**AI가 만드는 스킬트리, 게임처럼 배우는 학습.**
수업 자료 한 장을 올리면 AI가 커리큘럼을 설계하고, 학생은 노드를 언락하며 성장합니다. 교사 · 학생 · 학부모 · 운영자 네 주체가 하나의 학습 여정에서 연결되는 차세대 AI 교육 플랫폼입니다.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-pgvector-3ECF8E?logo=supabase)](https://supabase.com)
[![Claude](https://img.shields.io/badge/Claude-Sonnet_4.6-CC785C?logo=anthropic)](https://www.anthropic.com)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel)](https://vercel.com)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

> 🏆 KEG 바이브 코딩 대회 2026 · AI활용 차세대 교육 솔루션

---

## 🚀 라이브 데모

**[👉 learninggraph.vercel.app](https://learninggraph.vercel.app)**

로그인 페이지 하단 또는 랜딩 페이지의 **"교사 체험하기" / "학생 체험하기"** 버튼을 클릭하면 회원가입 없이 즉시 체험할 수 있습니다. 데모 환경은 첫 로그인 시 idempotent하게 자동 구축됩니다.

### 데모 계정 (읽기 전용)

| 역할 | 이메일 | 비밀번호 |
|---|---|---|
| 👨‍🏫 교사 | `demo_teacher@learngraph.app` | `demo1234` |
| 👩‍🎓 학생 | `demo_student@learngraph.app` | `demo1234` |

> ℹ️ 데모 계정은 **읽기 전용**입니다. 쓰기 작업 시 "체험 모드에서는 이 기능을 사용할 수 없습니다" 토스트가 표시됩니다.

---

## ✨ 핵심 기능

### 🧠 AI 통합 (13종)

| # | 기능 | 설명 |
|---|---|---|
| 1 | **스킬트리 자동 생성** | PDF 업로드 → Claude Sonnet 4.6이 학습 노드와 선수지식 관계를 자동 추출 |
| 2 | **AI 퀴즈 + 서술형 의미 채점** | 객관식/서술형 자동 생성, 부분 점수와 개별 피드백 제공 |
| 3 | **소크라틱 AI 튜터** | RAG (pgvector) 기반 맥락 이해, 정답을 주지 않고 단계적으로 유도 |
| 4 | **수업 녹음 → 전사 → 요약** | Whisper 전사, Claude 요약, 복습 퀴즈 자동 생성까지 원스톱 |
| 5 | **주간 AI 학습 코치** | 학생 진도·약점·학습 스타일을 분석해 이번 주 최적 계획 수립 |
| 6 | **학습 감정 분석** | 퀴즈 응답 패턴에서 자신감/고전/좌절을 감지, 튜터 톤 자동 조절 |
| 7 | **이탈 조기 경보** | 접속·퀴즈·학습시간 데이터로 이탈 위험 학생을 조기 탐지 |
| 8 | **적응형 복습 엔진** | 정답률에 따라 복습 간격을 2배/유지/절반으로 자동 조절 (에빙하우스 곡선) |
| 9 | **크로스커리큘럼 지식 맵** | 과목을 넘나드는 개념 연결을 AI가 발견해 학습 동기 자극 |
| 10 | **HTML 학습지 자동 생성** | 인쇄 가능한 학습지 수준의 HTML 문서를 노드별 자동 생성 |
| 11 | **약점 진단 + 오답 분석** | 누적 오답을 분석해 개인별 약점 영역과 복습 방향 제시 |
| 12 | **학부모 리포트 + 자동 인증서** | 주간 브리핑을 AI가 작성, 스킬트리 완료 시 수료 인증서 자동 발급 |
| 13 | **사전 시뮬레이션** | 스킬트리 배포 전 100명 가상 학생이 학습한다고 가정해 병목·난이도 시뮬레이션 |

### 🎮 게이미피케이션

- **XP · 레벨 · 학습 스트릭** — 매일 쌓이는 경험치, 연속 학습일 기록
- **업적/배지 10종** — 첫 수료, 10연속 정답, 퍼펙트 퀴즈 등 성취마다 획득
- **일일 미션 + 주간 챌린지** — 매일 3개의 자동 생성 미션
- **AI 플래시카드** — 노드 완료 시 5장의 복습 카드 자동 생성
- **오답 노트** — 틀린 문제와 AI 피드백 자동 정리
- **수료 인증서** — 스킬트리 100% 완료 시 인증서 자동 발급 + 다운로드

### 🏫 스쿨 · 클래스 시스템

- **운영자(Admin)** → 스쿨 생성, 교사/학생 초대 코드 자동 발급
- **교사(Teacher)** → 코드로 스쿨 가입, 클래스 생성, 스킬트리 배포
- **학생(Student)** → 클래스 코드로 수강신청 → 교사 승인 후 학습 시작
- **학부모(Parent)** → 자녀가 생성한 6자리 코드로 자동 연결

### 🎯 적응형 학습

- **학습 스타일 진단** — 시각형(👁️) · 텍스트형(📖) · 실습형(💪) 3가지
  로 진단 후 AI가 튜터 답변·학습 문서 스타일을 맞춤 조정
- **노력 기반 도움 시스템** — 퀴즈 3회 이상 시도 후에만 AI 힌트 잠금 해제
  (무분별한 힌트 소비 방지)
- **에빙하우스 복습 알림** — 1/3/7일 간격 자동 복습 추천

### 💬 커뮤니케이션

- **1:1 메신저** — 운영자 ↔ 교사 ↔ 학생 사이 실시간 메시지
- **스터디 그룹 채팅** — 같은 클래스 친구들과 그룹 대화
- **공지사항 + 읽음 처리** — 스쿨 단위 공지, 읽음 배지
- **활동 피드** — 반 친구들의 학습 성과를 타임라인으로 공유
- **주간 AI 브리핑** — 교사용 이번 주 클래스 요약·병목·조치사항 자동 리포트

### 🎭 데모 모드 (읽기 전용)

- 회원가입 없이 즉시 체험 가능
- 데모 계정 판별(`isDemoAccount`)로 모든 쓰기 Server Action 자동 차단
- 페이지 진입 시 상단에 "체험 모드" 배너 표시
- "LearnGraph 체험 학교" + "AI 학습 체험반" + "인공지능의 이해" 스킬트리 14노드
- 하드코딩된 퀴즈/플래시카드/미션/업적/감정/브리핑 (AI 호출 없이 풍부한 예시)

---

## 🛠️ 기술 스택

| 영역 | 기술 |
|---|---|
| **프레임워크** | Next.js 16 (App Router + Turbopack) + TypeScript strict |
| **스타일** | Tailwind CSS 4 + shadcn/ui |
| **AI SDK** | Vercel AI SDK v6 (`@ai-sdk/anthropic`, `generateObject`) |
| **AI 모델** | Claude Sonnet 4.6 + OpenAI Whisper + `text-embedding-3-small` |
| **데이터베이스** | Supabase PostgreSQL + Auth + **pgvector** (RAG) + Storage |
| **시각화** | D3.js (스킬트리 force simulation) + Recharts (대시보드 차트) |
| **상태/폼** | React 19 Server Components + Server Actions |
| **배포** | Vercel + GitHub |

### 프로젝트 고유 규칙

1. DB 조회/쓰기는 `createAdminClient()` 사용, `createServerClient()`는 `getUser()` 인증 확인 전용
2. Server Action은 throw 금지, `{ data, error }` 객체 반환 패턴
3. Zod 스키마는 `.describe()`로 지시, `.min()`/`.max()` 사용 금지
4. AI 호출은 Server Action + `streamObject`/`generateObject` 패턴
5. RLS 정책 작성 시 `CREATE POLICY` 앞에 `DROP POLICY IF EXISTS` 선행

---

## 📁 프로젝트 구조

```
learngraph/
├── src/
│   ├── app/                        # Next.js 16 App Router
│   │   ├── (auth)/                 # login · signup · verify · callback
│   │   ├── teacher/                # 교사 라우트 (11개)
│   │   │   ├── skill-tree/[id]/    # 스킬트리 편집 + D3 그래프
│   │   │   ├── quizzes/            # 퀴즈 관리
│   │   │   ├── recording/          # 수업 녹음 → 요약
│   │   │   ├── report/[studentId]/ # AI 학부모 리포트
│   │   │   └── classes · messages · join
│   │   ├── student/                # 학생 라우트 (10개)
│   │   │   ├── skill-tree/[id]/    # 스킬트리 탐험
│   │   │   ├── quiz/[nodeId]/      # 퀴즈 풀기 + 힌트
│   │   │   ├── tutor/              # 소크라틱 튜터
│   │   │   ├── wrong-answers/      # 오답 노트
│   │   │   ├── groups/             # 스터디 그룹
│   │   │   └── messages · join · onboarding
│   │   ├── admin/                  # 운영자 라우트 (6개)
│   │   │   ├── schools/            # 스쿨 관리
│   │   │   ├── announcements/      # 공지 작성
│   │   │   └── messages
│   │   ├── parent/                 # 학부모 라우트 (2개)
│   │   │   └── link/               # 자녀 6자리 코드 연결
│   │   └── page.tsx                # 랜딩 페이지
│   ├── actions/                    # 32개 Server Actions
│   │   ├── skill-tree.ts           # 스킬트리 생성/편집
│   │   ├── quiz.ts                 # 퀴즈 생성/채점/힌트
│   │   ├── tutor.ts                # RAG 기반 튜터 대화
│   │   ├── recording.ts            # Whisper + 수업 요약
│   │   ├── coach.ts                # 주간 학습 플랜
│   │   ├── emotion.ts              # 학습 감정 분석
│   │   ├── alert.ts                # 이탈 예측
│   │   ├── cross-curriculum.ts     # 과목간 지식 맵
│   │   ├── learning-doc.ts         # HTML 학습지 생성
│   │   ├── weakness.ts             # 약점 진단
│   │   ├── simulation.ts           # 사전 시뮬레이션
│   │   ├── briefing.ts             # 주간 AI 브리핑
│   │   ├── certificate.ts          # 자동 인증서 발급
│   │   ├── report.ts               # 학부모 리포트
│   │   ├── flashcard.ts            # 플래시카드
│   │   ├── missions.ts             # 일일 미션
│   │   ├── achievements.ts         # 업적/배지
│   │   ├── school.ts               # 스쿨/클래스/enrollment
│   │   ├── parent.ts               # 학부모 연결
│   │   ├── demo-setup.ts           # 데모 환경 구축 (idempotent)
│   │   └── ...                     # messages, announcements, feed, etc.
│   ├── components/
│   │   ├── ui/                     # shadcn/ui 컴포넌트
│   │   ├── skill-tree/             # SkillTreeGraph (D3) + NodeEditor
│   │   ├── quiz/                   # AdaptiveQuiz + 힌트 UI
│   │   ├── tutor/                  # ChatInterface + VoiceButton
│   │   ├── dashboard/              # 차트, 히트맵, 위험 경보
│   │   ├── student/                # WeeklyPlanCard, StudyTimer
│   │   ├── feed/                   # ActivityFeed
│   │   └── layout/                 # Sidebar, Header, DemoBanner
│   ├── lib/
│   │   ├── supabase/               # client / server / admin
│   │   ├── ai/                     # Zod 스키마 + 프롬프트
│   │   ├── d3/                     # 스킬트리 force simulation
│   │   └── demo.ts                 # isDemoAccount + 쓰기 가드
│   └── types/                      # 도메인 타입
├── supabase/
│   └── migrations/                 # 15개 DB 마이그레이션
└── docs/                           # 개발 문서
```

---

## 🏃 실행 방법

### 1. 프로젝트 클론 및 의존성 설치

```bash
git clone https://github.com/Bidulkiya/learngraph.git
cd learngraph
npm install
```

### 2. 환경 변수 설정

`.env.example`을 `.env.local`로 복사하고 값을 채워넣습니다:

```bash
cp .env.example .env.local
```

```env
# Supabase (https://supabase.com)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI APIs
ANTHROPIC_API_KEY=       # https://console.anthropic.com
OPENAI_API_KEY=          # https://platform.openai.com (Whisper + Embeddings)
ELEVENLABS_API_KEY=      # (선택) 음성 튜터용

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Supabase 프로젝트 설정

Supabase 프로젝트를 생성한 후, `supabase/migrations/` 디렉토리의 SQL 파일을 순서대로 실행하거나 Supabase CLI로 적용합니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

→ http://localhost:3000 접속

### 5. 프로덕션 빌드

```bash
npm run build
npm start
```

---

## 🗄️ 데이터베이스 마이그레이션

| # | 파일 | 내용 |
|---|---|---|
| 001 | `001_initial.sql` | 기본 스키마 (profiles, skill_trees, nodes, quizzes, progress) |
| 002 | `002_auth_trigger.sql` | Supabase Auth → profiles 자동 생성 트리거 |
| 003 | `003_fix_profiles_rls_recursion.sql` | Profiles RLS 재귀 수정 |
| 004 | `004_add_rls_for_phase3.sql` | 노드/엣지 RLS 정책 |
| 005 | `005_quiz_rls.sql` | 퀴즈 및 시도 RLS |
| 006 | `006_fix_missing_rls_policies.sql` | 클래스 RLS 보강 |
| 007 | `007_school_class_system.sql` | 멀티 스쿨 · 클래스 · enrollment |
| 008 | `008_student_features.sql` | 일일 미션 · 업적 · 메모 · 복습 |
| 009 | `009_teacher_ai_features.sql` | 교사 AI 도구 + 메신저 + 공지 |
| 010 | `010_social_polish.sql` | 활동 피드 · 스터디 그룹 · 이모지 리액션 |
| 011 | `011_node_learning_content.sql` | 노드별 learning_content (HTML 학습지) |
| 012 | `012_skill_tree_style_guide.sql` | 스킬트리 스타일 가이드 (교사 작성 톤 학습) |
| 013 | `013_special_features.sql` | 감정 리포트 · 이탈 경보 · 시뮬레이션 |
| 014 | `014_advanced_features.sql` | 크로스커리큘럼 · 학부모 연결 · 인증서 |
| 015 | `015_weekly_plans_cache.sql` | 주간 학습 플랜 캐싱 |

---

## 🛣️ 라우트 목록

### 공용
- `/` — 랜딩 페이지
- `/login` · `/signup` · `/verify` · `/callback` — 인증

### 👨‍🏫 교사 (`/teacher/*`)
- `/teacher` — 대시보드 (위험군, 감정, 병목, 주간 브리핑)
- `/teacher/skill-tree` — 스킬트리 목록
- `/teacher/skill-tree/new` — PDF 업로드 → AI 생성
- `/teacher/skill-tree/[id]` — D3 그래프 편집 + 노드/퀴즈 관리
- `/teacher/classes` — 내 클래스 + 수강 승인
- `/teacher/quizzes` — 퀴즈 일괄 관리
- `/teacher/recording` — 수업 녹음 → 전사 → 요약
- `/teacher/report/[studentId]` — AI 학부모 리포트
- `/teacher/messages` — 메신저
- `/teacher/join` — 스쿨 초대 코드 입력

### 👩‍🎓 학생 (`/student/*`)
- `/student` — 대시보드 (미션, 복습, 활동 피드, 지식 맵)
- `/student/onboarding` — 학습 스타일 진단
- `/student/skill-tree` — 내 스킬트리 목록
- `/student/skill-tree/[id]` — 스킬트리 탐험
- `/student/quiz/[nodeId]` — 퀴즈 풀기 (힌트 시스템)
- `/student/tutor` — 소크라틱 AI 튜터
- `/student/wrong-answers` — 오답 노트 + 약점 진단
- `/student/groups` — 스터디 그룹
- `/student/messages` — 메신저
- `/student/join` — 클래스 코드 입력

### 🛡️ 운영자 (`/admin/*`)
- `/admin` — 전체 통계 + 병목 · 위험 현황
- `/admin/schools` — 스쿨 관리
- `/admin/schools/new` · `/admin/schools/[id]` — 스쿨 생성/상세
- `/admin/announcements` — 공지 작성
- `/admin/messages` — 메신저

### 👨‍👩‍👧 학부모 (`/parent/*`)
- `/parent` — 자녀 학습 현황
- `/parent/link` — 자녀 6자리 코드 연결

**총 31개 라우트** (Server/Client Components 혼합)

---

## 🧪 검증 상태

```bash
npm run build
# ✓ Compiled successfully
# ✓ TypeScript 통과
# ✓ 31개 페이지 생성
```

---

## 📜 라이선스

MIT License — 자유롭게 사용·수정·배포할 수 있습니다.

---

## 🙏 Acknowledgments

- **Anthropic Claude Sonnet 4.6** — 모든 AI 생성·채점·분석의 두뇌
- **Supabase** — Auth, Postgres, pgvector, Realtime을 한 번에
- **Vercel** — Next.js 16 Turbopack + Edge 배포
- **OpenAI** — Whisper STT + 임베딩

> _Built with ❤️ for KEG 바이브 코딩 대회 2026_
