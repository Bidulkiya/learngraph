# NodeBloom 개발 Phase 가이드

> 프로젝트 개발 단계별 로드맵. 각 Phase는 순차 진행하며, 이전 Phase의 결과물이 다음 Phase의 전제 조건이 됩니다.

---

## 전체 Phase 요약

| Phase | 내용 | 완료 |
|---|---|---|
| **1** | 프로젝트 초기화 + 기반 세팅 | ✅ |
| **2** | 인증 + 역할 시스템 (3자 분리) | ✅ |
| **3** | 스킬트리 AI 생성 파이프라인 | ✅ |
| **4** | 스킬트리 D3 시각화 + 편집 | ✅ |
| **5** | 퀴즈 엔진 + 학생 학습 플로우 | ✅ |
| **6** | AI 튜터 + 3자 대시보드 | ✅ |
| **7-A** | 멀티 스쿨/클래스 시스템 + 데모 모드 | ✅ |
| **7-B** | 학생 경험 강화 (미션 · 배지 · 오답노트 · 메모 · 타이머 · 복습 · 노드 팝업) | ✅ |
| **7-C** | 교사/운영자/AI 강화 (녹음 · 소크라틱 · 힌트 · 코치 · 메신저 · 병목 분석 등 13개) | ✅ |
| **7-D** | 소셜 + UI/UX 폴리싱 + 제출 준비 | ✅ |
| **8** | 특색 기능 5개 (감정 · 시뮬레이션 · 크로스커리큘럼 · 적응형 복습 · 이탈 경보) | ✅ |
| **9** | 고급 기능 6개 (학습 스타일 · 노력 힌트 · 학부모 대시 · 브리핑 · 플래시카드 · 인증서) | ✅ |
| **10** | 스킬트리 UI 글래스모피즘 재디자인 | ✅ |
| **11** | 브랜드 전환 (LearnGraph → NodeBloom) | ✅ |

---

## Phase 1 — 프로젝트 초기화 + 기반 세팅

**목표**: Next.js 16 + Supabase + 기본 의존성으로 빈 프로젝트 시작.

**작업**:
- `create-next-app` (App Router + TypeScript + Tailwind + ESLint + src/)
- Supabase 프로젝트 생성, Auth 활성화
- shadcn/ui 초기화
- 환경 변수 (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, Supabase URL/Key)
- 루트 레이아웃 + 기본 메타데이터

**산출물**: 빈 Next.js 앱 + Supabase 연결

---

## Phase 2 — 인증 + 역할 시스템

**목표**: 교사/학생/운영자 3자 분리 + Auth 기반 라우팅.

**작업**:
- Supabase Auth (이메일/비밀번호)
- `profiles` 테이블 + `handle_new_user()` 트리거
- `middleware.ts` — 보호된 라우트 + 역할별 리디렉트
- Login/Signup/Verify 페이지
- RoleGuard Server Component

**산출물**: `/teacher`, `/student`, `/admin` 역할별 진입

---

## Phase 3 — 스킬트리 AI 생성 파이프라인

**목표**: PDF 업로드 → Claude가 스킬트리 JSON 생성 → DB 저장.

**작업**:
- PDF 텍스트 추출 (`pdf-parse`)
- `skillTreeSchema` Zod 스키마
- `SKILL_TREE_PROMPT` 프롬프트
- `generateSkillTree()` + `saveSkillTree()` Server Actions
- `skill_trees`, `nodes`, `node_edges` 테이블

**산출물**: 교사가 PDF 올리면 스킬트리가 DB에 저장됨

---

## Phase 4 — 스킬트리 D3 시각화 + 편집

**목표**: D3.js force simulation으로 스킬트리 렌더링 + 교사 편집 모드.

**작업**:
- `SkillTreeGraph` 컴포넌트 (D3.js)
- 노드 추가/삭제/드래그, 엣지 연결
- `NodeEditor` 모달
- `updateNode`, `addNode`, `deleteNode`, `addEdge`, `deleteEdge` Actions

**산출물**: 교사가 D3 그래프를 직접 편집 가능

---

## Phase 5 — 퀴즈 엔진 + 학생 학습 플로우

**목표**: 노드별 퀴즈 생성, 학생 풀이, 정답 시 노드 언락.

**작업**:
- `quizSchema` + `QUIZ_PROMPT`
- `generateQuizForNode`, `submitQuizAnswer`, `completeNode`
- 객관식/서술형 채점 로직 (AI 의미 비교)
- `student_progress` 상태 머신 (locked → available → in_progress → completed)
- `/student/quiz/[nodeId]` 풀이 페이지

**산출물**: 학생이 퀴즈를 풀어 노드를 언락할 수 있음

---

## Phase 6 — AI 튜터 + 3자 대시보드

**목표**: RAG 기반 소크라틱 튜터 + 각 역할 대시보드 기본 틀.

**작업**:
- `document_chunks` + pgvector 인덱스
- 문서 임베딩 (`text-embedding-3-small`)
- `chatWithTutor()` — RAG 검색 + Claude 스트리밍
- `/student/tutor` 채팅 페이지
- 교사/학생/운영자 대시보드 (`getStudentDashboardData`, `getTeacherDashboardData`, `getAdminDashboardData`)

**산출물**: 학생이 AI 튜터와 대화 가능, 각 역할별 대시보드 첫 화면 완성

---

## Phase 7-A — 멀티 스쿨/클래스 시스템 + 데모 모드

**목표**: 여러 스쿨이 각자 교사/학생 관리, 데모 모드 구축.

**작업**:
- `schools`, `classes`, `school_members`, `class_enrollments` 테이블 (migration 007)
- 운영자 스쿨 생성 + 초대 코드 발급
- `joinSchoolAsTeacher`, `joinWithCode`, `requestClassEnrollment`, `approveEnrollment`
- `/admin/schools/*` 관리 페이지
- `src/lib/demo.ts` — `isDemoAccount` + `assertNotDemo`
- `setupDemoData()` — idempotent 시드

**산출물**: 멀티 스쿨 지원 + 데모 계정 체험 가능

---

## Phase 7-B — 학생 경험 강화

**목표**: 학생 학습을 즐겁게 만드는 기능 7종.

**작업**:
- **일일 미션** — `daily_missions` + 5유형 템플릿 (`getTodayMissions`, `updateMissionProgress`)
- **업적/배지 10종** — `achievements` + `user_achievements` + `checkAndAwardAchievements`
- **오답 노트** — `/student/wrong-answers` + `getWrongAnswers`, `analyzeWeakness`
- **노드 메모** — `node_memos` + `saveMemo`, `getMemo`
- **학습 시간 타이머** — `StudyTimer` + `study-time.ts` Actions
- **복습 알림** — `review_reminders` + `getTodayReviews`, `markReviewCompleted`
- **노드 상세 팝업** — `NodeDetailPopup` + HTML 학습 문서 다운로드

**산출물**: 학생 대시보드가 게이미피케이션 + 학습 보조 도구로 풍성해짐

---

## Phase 7-C — 교사/운영자/AI 강화 (13개)

**목표**: 교사 도구 + AI 기능 확장 + 메신저/공지.

**작업**:
- **수업 녹음 → 전사 → 요약** — Whisper + Claude (`transcribeRecording`, `summarizeLesson`, `generateQuizFromRecording`)
- **소크라틱 튜터 개선** — 학습 스타일 + 감정 적응 프롬프트
- **AI 퀴즈 힌트** — 노력 기반 잠금 (3회 시도 후 해제)
- **학습 코치** — 주간 학습 플랜 (`getWeeklyPlan`)
- **메신저** — `direct_messages` + 1:1 채팅
- **공지사항** — `announcements` + `announcement_reads` + 읽음 배지
- **학생 그룹 분류** — `analyzeStudentGroups`
- **교육과정 병목 분석** — `analyzeBottlenecks`
- **교사 활동 분석** — `getTeacherActivity`
- **학부모 리포트 생성** — `generateParentReport`
- **개념 추천** — `getConceptConnections`
- **적응형 퀴즈 출제** — 난이도 자동 조절
- **수업 녹음 페이지** — `/teacher/recording`

**산출물**: 교사가 실제 교실 운영에 쓸 수 있는 수준의 AI 도구 세트

---

## Phase 7-D — 소셜 + UI/UX 폴리싱

**목표**: 소셜 기능 + 최종 UI 마감 + 제출 준비.

**작업**:
- **활동 피드** — `activity_feed` + 클래스 타임라인 + 이모지 리액션
- **스터디 그룹** — `study_groups` + 그룹 채팅
- **UI/UX 폴리싱** — 로딩 상태, 에러 토스트, 반응형, 다크모드
- **랜딩 페이지 완성** — 카피 + 카드 + CTA + 푸터
- **버그 수정** — 전수 테스트

**산출물**: 제출 가능한 완성도의 제품

---

## Phase 8 — 특색 기능 5개

**목표**: 경쟁 프로젝트와 차별화되는 특색 기능 도입.

**작업**:
- **① 학습 감정 분석** (`analyzeStudentEmotion`)
  - 퀴즈 응답 패턴 → 자신감/고전/좌절 감지
  - `emotion_reports` 일 단위 캐시
  - 튜터 톤이 학생 감정에 따라 자동 조절
- **② 사전 시뮬레이션** (`simulateSkillTree`)
  - 교사가 스킬트리 배포 전 100명 가상 학생으로 테스트
  - 병목 노드/난이도 문제 사전 탐지
- **③ 크로스커리큘럼 지식 맵** (`findConceptConnections`)
  - 과목을 넘나드는 개념 연결 발견
  - 학생 대시보드 `ConceptMapCard`
- **④ 적응형 복습 엔진** (강화)
  - 정답률 기반 간격 2배/유지/절반 자동 조절
  - 긴급도 표시 (overdue/today/soon)
- **⑤ 이탈 조기 경보** (`calculateRiskScore`, `getClassRiskAlerts`)
  - 접속/퀴즈/학습시간 데이터로 위험 학생 탐지
  - 교사 대시보드 `RiskAlertCard`

**DB 마이그레이션**: `013_special_features.sql`

**산출물**: 감정 인식 + 예측 분석이 포함된 차세대 AI 교육 플랫폼

---

## Phase 9 — 고급 기능 6개

**목표**: 학부모 역할 추가 + 개인화 학습 강화.

**작업**:
- **① 학습 스타일 진단** (`learning-style.ts`)
  - 시각형/텍스트형/실습형 3가지 진단
  - `/student/onboarding` 초기 진단 페이지
  - 튜터/학습 문서 스타일이 자동 적응
- **② 노력 기반 도움 시스템** (`getQuizHint`)
  - AI 힌트가 3회 시도 후에만 잠금 해제
  - 정답 직접 공개 금지
- **③ 학부모 대시보드** (`/parent/*`)
  - 4번째 역할 추가
  - `parent_student_links` + `parent_invite_codes` 6자리 코드
  - 자녀 학습 현황 실시간 확인
- **④ 주간 AI 브리핑** (`generateWeeklyBriefing`)
  - 교사용 이번 주 클래스 요약
  - 학부모용 자녀 주간 리포트
  - 주 단위 캐시 (`weekly_briefings`)
- **⑤ AI 플래시카드** (`generateFlashcards`)
  - 노드 완료 시 5장 자동 생성
  - `flashcards` + `flashcard_reviews` 복습 결과 추적
- **⑥ 수료 인증서 자동 발급** (`issueCertificate`)
  - 스킬트리 100% 완료 시 자동 생성
  - HTML 템플릿 인쇄 가능 (A4, NodeBloom 로고 + SEAL)

**DB 마이그레이션**: `014_advanced_features.sql`, `015_weekly_plans_cache.sql`

**산출물**: 4자 플랫폼 + 개인화 학습 완성

---

## Phase 10 — 스킬트리 UI 글래스모피즘 재디자인

**목표**: SkillTreeGraph 시각적 업그레이드 + UX 개선.

**작업**:
- 글래스 + 그라데이션 + 애니메이션 (pulse-ring, progress-ring, orbit-ring)
- 과목별 테마 (과학/수학/국어/영어/사회) — subject_hint 기반
- 배경 패턴 (별/격자/한지)
- 노드 hover 애니메이션 (중첩 `<g.node-inner>` 구조로 tick과 분리)
- 진입 staggered 페이드인
- 엣지 cubic bezier 곡선 + 그라데이션 + 화살표 마커

**산출물**: 상용 수준의 D3 시각화

---

## Phase 11 — 브랜드 전환 (LearnGraph → NodeBloom)

**목표**: 브랜드 아이덴티티 재정의.

**작업**:
- **브랜드 정의**
  - 영문: NodeBloom / 한국어: 노드블룸
  - 슬로건: "노드가 피다, 지식이 자라다"
  - 컨셉: 노드 언락 시 꽃이 피듯 지식 확장
  - 컬러: `#6366F1` 인디고 · `#A855F7` 연보라 · `#10B981` 초록
- **신규 에셋**
  - `Logo.tsx` SVG 컴포넌트 (원형 노드 + 꽃잎 4장 + 성장의 잎)
  - `icon.svg` 파비콘 (동일 디자인)
- **전면 교체**
  - 22개 파일: package.json, layout.tsx, 랜딩, Sidebar, Auth 페이지, demo-setup, 인증서, 학습 문서, 학부모 리포트, 학부모 링크, MessageNotifier, launch.json, README, docs
  - DB 자동 migration: "LearnGraph 체험 학교" → "NodeBloom 체험 학교" (demo-setup 0-pre 단계)
- **의도적 유지**
  - `@learngraph.app` 이메일 도메인 (Supabase Auth 호환)
  - `LEGACY_DEMO_SCHOOL_NAME` 상수 (migration 참조용)
  - Vercel 도메인 + Supabase Site URL (수동 변경 예정)

**산출물**: NodeBloom 브랜드로 전면 전환된 프로덕션 빌드

---

## 통계 (현재 상태)

| 항목 | 수치 |
|---|---|
| 라우트 | 32개 |
| Server Action 파일 | 32개 |
| Server Action 함수 | 112개 |
| DB 테이블 | 38개 |
| DB 마이그레이션 | 15개 |
| AI 통합 기능 | 13종 |
| 역할 | 4자 (teacher/student/parent/admin) |
| 컴포넌트 (ui/ 제외) | 60+ |

---

## 완료 기준 (각 Phase 공통)

각 Phase는 다음 조건을 모두 만족해야 "완료"로 간주:

1. **`npm run build` 성공** — TypeScript strict 통과, 모든 페이지 컴파일
2. **주요 플로우 동작 확인** — Preview 서버에서 사용자 시나리오 검증
3. **프로젝트 고유 규칙 6개 준수** — `.claude/CLAUDE.md` 참조
4. **Git commit** — `feat:`/`fix:`/`perf:`/`brand:` 접두사로 커밋
