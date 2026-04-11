# 🌸 NodeBloom

**AI가 수업을 설계하고, 학생이 게임처럼 성장합니다.**
수업 자료 하나로 스킬트리 · 퀴즈 · 학습 문서가 자동 생성됩니다.
교사 · 학생 · 학부모 · 운영자, 네 주체가 하나로 연결되는 차세대 AI 교육 플랫폼입니다.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-pgvector-3ECF8E?logo=supabase)](https://supabase.com)
[![Claude](https://img.shields.io/badge/Claude-Sonnet_4.6-CC785C?logo=anthropic)](https://www.anthropic.com)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel)](https://vercel.com)

> 🏆 KIT 바이브코딩 공모전 2026 · AI활용 차세대 교육 솔루션

---

## 🚀 라이브 데모

**[👉 nodebloom.vercel.app](https://nodebloom.vercel.app)**

랜딩 페이지의 **"교사로 둘러보기" / "학생으로 둘러보기"** 버튼을 클릭하면 회원가입 없이 즉시 둘러볼 수 있습니다.
인터랙티브 가이드가 주요 기능을 안내해드립니다.

### 데모 계정 (읽기 전용)

| 역할 | 이메일 | 비밀번호 | 닉네임 |
|---|---|---|---|
| 👨‍🏫 교사 | `demo_teacher@learngraph.app` | `demo1234` | 데모 선생님 |
| 👩‍🎓 학생 | `demo_student@learngraph.app` | `demo1234` | 데모 학생 |

> ℹ️ 데모 계정은 **읽기 전용**입니다. 쓰기 작업 시 "둘러보기 모드에서는 이 기능을 사용할 수 없습니다" 토스트가 표시됩니다.

---

## 📊 프로젝트 현황

| 항목 | 수치 |
|------|------|
| 라우트 | **46개** (Static 9 + Dynamic 37) |
| Server Action | **35개 파일 / 135개 함수** |
| DB 테이블 | **40개** |
| 마이그레이션 | **21개** (001~021) |
| AI 기능 | **16종** 통합 |
| 컴포넌트 | **68개** |
| 소스 파일 | **203개** (.ts/.tsx) |
| 역할 | 5자 (교사/학생/운영자/학부모/독학러) |

---

## ✨ 핵심 기능

### 🧠 AI 통합 (16종)

| # | 기능 | 설명 |
|---|---|---|
| 1 | **스킬트리 자동 생성** | PDF 업로드 → Claude Sonnet 4.6이 학습 노드와 선수지식 관계를 자동 추출 |
| 2 | **AI 퀴즈 + 서술형 의미 채점** | 객관식/서술형 자동 생성, 부분 점수와 개별 피드백 제공 |
| 3 | **소크라틱 AI 튜터** | RAG (pgvector) 기반 맥락 이해, 정답을 주지 않고 단계적으로 유도 |
| 4 | **수업 녹음 → 전사 → 요약** | Whisper 전사, Claude 요약, 복습 퀴즈 자동 생성까지 원스톱 |
| 5 | **주간 AI 학습 코치** | 학생 진도 · 약점 · 학습 스타일을 분석해 이번 주 최적 계획 수립 |
| 6 | **학습 감정 분석** | 퀴즈 응답 패턴에서 자신감/고전/좌절을 감지, 튜터 톤 자동 조절 |
| 7 | **이탈 조기 경보** | 접속 · 퀴즈 · 학습시간 데이터로 이탈 위험 학생을 조기 탐지 |
| 8 | **적응형 복습 엔진** | 정답률에 따라 복습 간격을 자동 조절 (에빙하우스 곡선) |
| 9 | **크로스커리큘럼 지식 맵** | 과목을 넘나드는 개념 연결을 AI가 발견해 학습 동기 자극 |
| 10 | **HTML 학습지 자동 생성** | 인쇄 가능한 학습지 수준의 HTML 문서를 노드별 자동 생성 |
| 11 | **약점 진단 + 오답 분석** | 누적 오답을 분석해 개인별 약점 영역과 복습 방향 제시 |
| 12 | **학부모 리포트 + 자동 인증서** | 주간 브리핑 자동 작성, 스킬트리 완료 시 수료 인증서 발급 |
| 13 | **사전 시뮬레이션 + AI 재생성** | 100명 가상 학생 시뮬레이션 → 병목 발견 → AI가 스킬트리 자동 개선 |
| 14 | **학생 그룹 분석** | AI가 학습 수준별로 학생 그룹을 자동 분류 |
| 15 | **AI 플래시카드** | 노드 완료 시 복습 카드 자동 생성 |
| 16 | **개념 연결 추천** | 학생이 배운 개념과 연관된 심화 개념을 AI가 추천 |

### 🎮 게이미피케이션

- **XP · 레벨 · 학습 스트릭** — 매일 쌓이는 경험치, 연속 학습일 기록
- **업적/배지 36종** — 학습/스트릭/랭킹/소셜/히든 5카테고리
- **일일 미션 + 주간 챌린지** — 매일 3개의 자동 생성 미션, 주간 완주 보너스
- **DiceBear 아바타 + 닉네임** — 회원가입 시 자동 생성, 프로필에서 변경 (3회 제한)
- **랭킹 시스템** — 클래스/스쿨 XP · 스트릭 · 진도 랭킹 + 연속 1등 유지 업적
- **오답 노트** — 틀린 문제와 AI 피드백 자동 정리
- **수료 인증서** — 스킬트리 100% 완료 시 인증서 자동 발급 + 다운로드

### 🏫 스쿨 · 클래스 시스템

- **운영자(Admin)** → 스쿨 생성, 교사/학생 초대 코드 자동 발급, 3단계 컨텍스트 선택 대시보드
- **교사(Teacher)** → 코드로 스쿨 가입, 클래스 생성, 스킬트리 배포, 2단계 컨텍스트 선택 대시보드
- **학생(Student)** → 클래스 코드로 수강신청 → 교사 승인 후 학습 시작
- **학부모(Parent)** → 자녀가 생성한 6자리 코드로 자동 연결

### 🎯 적응형 학습

- **학습 스타일 진단** — 시각형(👁️) · 텍스트형(📖) · 실습형(💪) 3가지 진단 후 AI 맞춤
- **노력 기반 도움 시스템** — 퀴즈 3회 이상 시도 후에만 AI 힌트 잠금 해제
- **에빙하우스 복습 알림** — 1/3/7일 간격 자동 복습 추천

### 📱 모바일 반응형

- **사이드바 드로어** — 모바일에서 햄버거 버튼 → 슬라이드 인 오버레이
- **터치 최적화** — 44px 터치 타겟, iOS safe-area, 터치 줌/팬
- **적응형 레이아웃** — 4열→2열→1열 그리드, 컴팩트 헤더

### 🎭 둘러보기 모드 (읽기 전용)

- 회원가입 없이 즉시 둘러보기 가능
- **환영 튜토리얼** — 단계별 카드 슬라이드 (학생 5단계 / 교사 4단계)
- **인터랙티브 가이드** — React Joyride로 메뉴 highlight + 말풍선 안내
- 데모 계정 판별(`isDemoAccount`)로 모든 쓰기 Server Action 자동 차단
- "NodeBloom 둘러보기 학교" + "AI 학습 둘러보기반" + "인공지능의 이해" 스킬트리 14노드

### 🔐 보안 · 계정

- **이메일 실시간 중복 체크** — 회원가입 시 debounce 500ms 실시간 검증
- **비밀번호 재설정** — /forgot-password → 이메일 링크 → /reset-password
- **비밀번호 변경** — 프로필에서 로그인 상태 변경
- **회원 탈퇴** — "삭제합니다" 텍스트 확인 → CASCADE 전체 삭제
- **이용약관 + 개인정보처리방침** — /terms, /privacy
- **다크모드 3상태** — 시스템/라이트/다크 순환, localStorage 저장

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
| **아바타** | DiceBear adventurer 스타일 (닉네임 기반 자동 생성) |
| **상태/폼** | React 19 Server Components + Server Actions |
| **배포** | Vercel + GitHub |

---

## 🧪 검증 상태

```bash
npm run build
# ✓ Compiled successfully
# ✓ TypeScript strict 0 에러
# ✓ 46개 라우트 생성
# ✓ Static 8 + Dynamic 31
```

---

## 📜 라이선스

MIT License — 자유롭게 사용 · 수정 · 배포할 수 있습니다.

---

## 🙏 Acknowledgments

- **Anthropic Claude Sonnet 4.6** — 모든 AI 생성 · 채점 · 분석의 두뇌
- **Supabase** — Auth, Postgres, pgvector, Realtime을 한 번에
- **Vercel** — Next.js 16 Turbopack + Edge 배포
- **OpenAI** — Whisper STT + 임베딩
- **DiceBear** — 아바타 자동 생성

> _Built with ❤️ for KIT 바이브코딩 공모전 2026_
