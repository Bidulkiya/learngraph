# LearnGraph

**AI 기반 스킬트리 교육 플랫폼** — 수업 자료를 업로드하면 AI가 자동으로 스킬트리를 생성하고, 학생이 퀴즈를 풀어 노드를 언락하며 학습하는 차세대 교육 솔루션.

## 핵심 기능

### 🧠 AI 통합 (7종)
- **스킬트리 자동 생성** — PDF 업로드 → Claude Sonnet 4.6이 학습 개념 구조 추출
- **퀴즈 자동 생성 + AI 의미 채점** — 객관식/서술형 지원, 부분 점수 + 피드백
- **RAG 기반 AI 튜터** — OpenAI 임베딩 + Supabase pgvector, 소크라틱 모드 지원
- **음성 녹음 → 수업 요약** — Whisper 전사 + Claude 요약 + 복습 퀴즈 자동 생성
- **학습 코치 주간 플랜** — 개인 진도/약점 기반 맞춤형 계획
- **오답 분석 + 약점 진단** — 오답 패턴 분석 후 보완 제안
- **학생 그룹 · 교육과정 병목 분석** — 교사/운영자용 AI 분석

### 🎮 게이미피케이션
- 레벨 · XP · 스트릭 · 배지 (10종 업적)
- 일일 미션 자동 생성 (5가지 유형)
- 복습 알림 (에빙하우스 곡선 기반 1/3/7일)
- 언락 애니메이션 + 효과
- 반 활동 타임라인 + 이모지 리액션

### 👥 3자 플랫폼
- **교사**: 스킬트리 생성, 수업 녹음, 학생 모니터링, 학부모 리포트
- **학생**: 스킬트리 탐험, 퀴즈, AI 튜터, 스터디 그룹, 오답 노트
- **운영자**: 스쿨 관리, 교사 초대, 병목 분석, 공지사항, 메신저

### 🏫 멀티 스쿨 시스템
- 운영자가 스쿨 생성 → 교사/학생 초대 코드 자동 발급
- 클래스 수강신청 + 승인 워크플로우
- 반 활동 타임라인 + 스터디 그룹 채팅

### 💬 커뮤니케이션
- 1:1 메신저 (운영자 ↔ 교사)
- 스터디 그룹 채팅
- 공지사항 + 읽음 처리

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui |
| AI Framework | Vercel AI SDK v6 + @ai-sdk/anthropic |
| AI Models | Claude Sonnet 4.6 + OpenAI Whisper + text-embedding-3-small |
| Database | Supabase (Auth + PostgreSQL + pgvector + Storage) |
| Visualization | D3.js (스킬트리 그래프) + Recharts (대시보드 차트) |
| Deployment | Vercel + GitHub |

## 실행 방법

### 1. 클론 + 설치
```bash
git clone https://github.com/Bidulkiya/learngraph.git
cd learngraph
npm install
```

### 2. 환경 변수 설정
`.env.example`을 `.env.local`로 복사하고 값을 채워넣으세요:
```bash
cp .env.example .env.local
```

필수 환경 변수:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI APIs
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
ELEVENLABS_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. DB 마이그레이션
Supabase 프로젝트를 생성한 후, `supabase/migrations/` 디렉토리의 SQL 파일들을 순서대로 실행:
1. `001_initial.sql` — 기본 스키마 (profiles, skill_trees, nodes, quizzes 등)
2. `002_auth_trigger.sql` — profiles 자동 생성 트리거
3. `003_fix_profiles_rls_recursion.sql` — RLS 정책 수정
4. `004_add_rls_for_phase3.sql` — 노드/엣지 RLS
5. `005_quiz_rls.sql` — 퀴즈 RLS
6. `006_fix_missing_rls_policies.sql` — 클래스 RLS
7. `007_school_class_system.sql` — 스쿨 시스템
8. `008_student_features.sql` — 학생 기능 (미션/배지/메모)
9. `009_teacher_ai_features.sql` — 교사 AI 기능 + 메신저
10. `010_social_polish.sql` — 소셜 기능

### 4. 개발 서버 실행
```bash
npm run dev
```

http://localhost:3000 접속

## 데모 계정

랜딩 페이지의 "교사 체험하기" / "학생 체험하기" 버튼을 클릭하면 회원가입 없이 바로 체험할 수 있습니다. 데모 데이터는 첫 로그인 시 자동 생성됩니다.

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 교사 | `demo_teacher@learngraph.app` | `demo1234` |
| 학생 | `demo_student1@learngraph.app` | `demo1234` |

## 프로젝트 구조

```
learngraph/
├── src/
│   ├── app/                    # Next.js 16 App Router
│   │   ├── (auth)/             # 로그인/회원가입
│   │   ├── teacher/            # 교사 라우트
│   │   │   ├── skill-tree/     # 스킬트리 관리
│   │   │   ├── quizzes/        # 퀴즈 관리
│   │   │   ├── recording/      # 수업 녹음
│   │   │   ├── messages/       # 메신저
│   │   │   └── report/         # 학부모 리포트
│   │   ├── student/            # 학생 라우트
│   │   │   ├── skill-tree/     # 스킬트리 탐험
│   │   │   ├── quiz/           # 퀴즈 풀기
│   │   │   ├── tutor/          # AI 튜터
│   │   │   ├── wrong-answers/  # 오답 노트
│   │   │   └── groups/         # 스터디 그룹
│   │   └── admin/              # 운영자 라우트
│   │       ├── schools/        # 스쿨 관리
│   │       ├── announcements/  # 공지사항
│   │       └── messages/       # 메신저
│   ├── actions/                # Server Actions (AI + DB)
│   │   ├── skill-tree.ts       # 스킬트리 생성/저장
│   │   ├── quiz.ts             # 퀴즈 생성/채점
│   │   ├── tutor.ts            # AI 튜터 (RAG)
│   │   ├── recording.ts        # Whisper + 요약
│   │   ├── missions.ts         # 일일 미션
│   │   ├── achievements.ts     # 업적 시스템
│   │   ├── weakness.ts         # 오답 분석
│   │   ├── coach.ts            # 학습 코치
│   │   ├── analysis.ts         # 그룹/병목 분석
│   │   ├── feed.ts             # 활동 피드
│   │   └── ...
│   ├── components/
│   │   ├── ui/                 # shadcn/ui
│   │   ├── skill-tree/         # D3 시각화 + 노드 팝업
│   │   ├── quiz/               # 퀴즈 UI (힌트, 결과)
│   │   ├── tutor/              # 튜터 + 음성 버튼
│   │   ├── dashboard/          # 대시보드 차트
│   │   ├── feed/               # 활동 피드
│   │   ├── student/            # 학생 전용 (타이머, 코치)
│   │   └── shared/             # 공지 배너, 메신저
│   └── lib/
│       ├── supabase/           # Supabase 클라이언트 (server/client/admin)
│       ├── ai/                 # Zod 스키마 + 프롬프트
│       └── d3/                 # D3 레이아웃
├── supabase/
│   └── migrations/             # 10개 DB 마이그레이션
└── docs/                       # 개발 문서
```

## 개발 Phase

| Phase | 내용 |
|-------|------|
| 1 | 프로젝트 초기화 + 기반 세팅 |
| 2 | 인증 + 역할 시스템 (3자 분리) |
| 3 | 스킬트리 AI 생성 파이프라인 |
| 4 | 스킬트리 D3 시각화 + 편집 |
| 5 | 퀴즈 엔진 + 학생 학습 플로우 |
| 6 | AI 튜터 + 3자 대시보드 |
| 7-A | 멀티 스쿨/클래스 시스템 + 데모 모드 |
| 7-B | 학생 경험 게이미피케이션 + AI 채점 |
| 7-C | 교사 AI 도구 + 메신저 + 공지 |
| 7-D | 소셜 기능 + UI 폴리싱 + 버그 수정 |

## 라이선스

MIT License
