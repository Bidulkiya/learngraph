# LearnGraph 개발 Phase 가이드

> Claude Code가 각 Phase에서 무엇을 만들어야 하는지, 완료 기준이 무엇인지 참고하는 문서.
> 각 Phase는 순서대로 진행하며, 이전 Phase의 결과물이 다음 Phase의 전제 조건이다.

---

## Phase 1: 프로젝트 초기화 + 기반 세팅

### 목표
프로젝트가 로컬에서 실행되고, DB 테이블이 생성되고, Vercel 자동 배포가 작동하는 상태.

### 작업 목록
1. Next.js 프로젝트 생성 (App Router + TypeScript + Tailwind + src 디렉토리)
2. 핵심 의존성 설치
   - `ai @ai-sdk/anthropic @ai-sdk/openai zod`
   - `@supabase/supabase-js @supabase/ssr`
   - `d3 @types/d3 recharts`
   - `lucide-react class-variance-authority clsx tailwind-merge`
3. shadcn/ui 초기화 + 기본 컴포넌트 추가 (button, card, input, label, dialog, tabs, badge, progress, toast, sheet, select, separator, avatar, dropdown-menu)
4. Supabase 프로젝트 생성 + pgvector 확장 활성화
5. DB 마이그레이션 실행 (DEVELOPMENT.md의 전체 스키마 SQL)
6. 환경변수 설정 (.env.local + .env.example)
7. Supabase 클라이언트 설정 (src/lib/supabase/server.ts, client.ts)
8. 기본 레이아웃 생성 (Sidebar + Header 컴포넌트)
9. 3자 역할별 라우트 디렉토리 생성 (/teacher, /student, /admin)
10. GitHub 레포 생성 + 초기 커밋 + Vercel 연결
11. docs/ 디렉토리에 기획서 PDF + 개발 문서 포함

### 완료 기준
- [ ] `npm run dev` → localhost:3000에서 기본 레이아웃이 보인다
- [ ] `npm run build` → 에러 없이 빌드 성공
- [ ] Supabase 대시보드에서 모든 테이블이 생성되어 있다
- [ ] Vercel에서 자동 배포가 작동한다
- [ ] .env.example이 커밋되어 있고, .env.local은 .gitignore에 포함

### 이 Phase에서 생성되는 파일
```
src/app/layout.tsx
src/app/page.tsx
src/app/teacher/layout.tsx
src/app/teacher/page.tsx
src/app/student/layout.tsx
src/app/student/page.tsx
src/app/admin/layout.tsx
src/app/admin/page.tsx
src/components/layout/Sidebar.tsx
src/components/layout/Header.tsx
src/lib/supabase/server.ts
src/lib/supabase/client.ts
.env.local
.env.example
```

---

## Phase 2: 인증 + 역할 시스템

### 목표
3종 계정(교사/학생/운영자)으로 각각 로그인하면 역할에 맞는 대시보드로 이동하는 상태.

### 전제 조건
- Phase 1 완료 (Supabase 연결 + 기본 레이아웃)

### 작업 목록
1. 회원가입 페이지 (src/app/(auth)/signup/page.tsx)
   - 이름, 이메일, 비밀번호, 역할 선택 (teacher/student/admin)
   - Supabase Auth signUp + profiles 테이블 insert
2. 로그인 페이지 (src/app/(auth)/login/page.tsx)
   - 이메일/비밀번호 로그인
   - 로그인 후 역할에 따라 리디렉트 (/teacher, /student, /admin)
3. 미들웨어 (middleware.ts)
   - 비로그인 → /login 리디렉트
   - 역할 불일치 → 올바른 역할 라우트로 리디렉트
4. RLS 정책 적용 (Supabase SQL Editor에서 실행)
5. 로그아웃 기능
6. RoleGuard 컴포넌트 (src/components/layout/RoleGuard.tsx)
7. 각 역할별 대시보드에 환영 메시지 + 역할 표시

### 완료 기준
- [ ] 교사 계정으로 가입 → 로그인 → /teacher 페이지 도착
- [ ] 학생 계정으로 가입 → 로그인 → /student 페이지 도착
- [ ] 운영자 계정으로 가입 → 로그인 → /admin 페이지 도착
- [ ] 학생 계정으로 /teacher 접근 시 → /student로 리디렉트
- [ ] 비로그인 상태로 /teacher 접근 시 → /login으로 리디렉트
- [ ] 로그아웃 후 보호 페이지 접근 불가

### 이 Phase에서 생성되는 파일
```
src/app/(auth)/login/page.tsx
src/app/(auth)/signup/page.tsx
src/app/(auth)/callback/route.ts    ← Supabase 이메일 확인 콜백
src/components/layout/RoleGuard.tsx
middleware.ts
src/types/user.ts
```

---

## Phase 3: 핵심 AI 파이프라인 — 스킬트리 생성

### 목표
교사가 PDF를 업로드하면 AI가 스킬트리 JSON을 생성하고 DB에 저장되는 상태.

### 전제 조건
- Phase 2 완료 (교사 계정 로그인 가능)

### 작업 목록
1. 파일 업로드 UI (src/app/teacher/skill-tree/new/page.tsx)
   - PDF/이미지 드래그 앤 드롭 업로드
   - Supabase Storage에 파일 저장
2. PDF 텍스트 추출 로직
   - pdf-parse 또는 pdfjs-dist 사용
3. Zod 스키마 정의 (src/lib/ai/schemas.ts)
   - skillTreeSchema, skillTreeNodeSchema, skillTreeEdgeSchema
4. 프롬프트 정의 (src/lib/ai/prompts.ts)
   - SKILL_TREE_PROMPT
5. 스킬트리 생성 Server Action (src/actions/skill-tree.ts)
   - generateSkillTree: streamObject로 Claude API 호출
   - saveSkillTree: 결과를 skill_trees + nodes + node_edges 테이블에 저장
6. 생성 중 스트리밍 UI
   - useObject 훅으로 노드가 하나씩 나타나는 프리뷰
7. 학생 진도 초기화 로직
   - 루트 노드(선수 조건 없는 노드)는 'available', 나머지는 'locked'
8. 수업자료 벡터화 (스킬트리 생성과 동시에 실행)
   - 원본 텍스트를 청크 분할 → OpenAI Embeddings → document_chunks 테이블 저장
   - Phase 6 AI 튜터 RAG의 전제 조건이므로 여기서 미리 처리

### 완료 기준
- [ ] 교사가 PDF 업로드 → AI가 스킬트리 JSON 생성 (노드 5~20개 + 엣지)
- [ ] 생성 중 노드가 실시간 스트리밍으로 프리뷰에 나타남
- [ ] 생성 완료 후 DB에 skill_trees, nodes, node_edges 레코드 저장
- [ ] 생성된 스킬트리 목록 페이지에서 확인 가능
- [ ] 원본 텍스트가 document_chunks 테이블에 벡터화되어 저장됨

### 이 Phase에서 생성되는 파일
```
src/app/teacher/skill-tree/new/page.tsx
src/app/teacher/skill-tree/page.tsx (목록)
src/actions/skill-tree.ts
src/lib/ai/schemas.ts
src/lib/ai/prompts.ts
src/lib/ai/embeddings.ts             ← 벡터화 유틸 (Phase 6 RAG에서 재사용)
src/types/skill-tree.ts
```

---

## Phase 4: 스킬트리 시각화 + 편집

### 목표
스킬트리가 인터랙티브 그래프로 화면에 렌더링되고, 교사가 편집할 수 있는 상태.

### 전제 조건
- Phase 3 완료 (DB에 스킬트리 데이터 존재)

### 작업 목록
1. D3.js 스킬트리 그래프 컴포넌트 (src/components/skill-tree/SkillTreeGraph.tsx)
   - force-directed layout
   - 노드 상태별 색상: completed(초록), available(노랑), locked(회색)
   - 노드 상태별 글로우 효과
   - 엣지(연결선) 렌더링 + 화살표
2. 개별 노드 컴포넌트 (src/components/skill-tree/SkillNode.tsx)
   - 클릭 이벤트 (학생: 퀴즈 진입, 교사: 편집 모달)
   - 호버 시 설명 툴팁
3. 교사 편집 모드
   - 노드 드래그 이동 (위치 DB 저장)
   - 노드 추가/삭제 모달 (NodeEditor.tsx)
   - 엣지 추가/삭제 (노드 간 연결선)
4. 언락 애니메이션 (src/components/skill-tree/UnlockAnimation.tsx)
   - 노드가 'completed'로 전환될 때 빛나는 효과 + 파티클
5. D3 레이아웃 유틸 (src/lib/d3/skill-tree-layout.ts)
   - 시뮬레이션 설정, 색상 함수, 글로우 함수
6. 스킬트리 상세 페이지 (src/app/teacher/skill-tree/[id]/page.tsx)
7. 학생용 스킬트리 탐험 페이지 (src/app/student/skill-tree/[id]/page.tsx)
   - 편집 불가, 클릭 → 퀴즈 진입

### 완료 기준
- [ ] DB의 스킬트리 데이터가 D3 그래프로 렌더링됨
- [ ] 노드 색상이 상태(locked/available/completed)에 따라 다름
- [ ] 교사가 노드를 드래그하면 위치가 저장됨
- [ ] 교사가 노드를 추가/삭제/연결할 수 있음
- [ ] 학생 뷰에서 스킬트리가 보이고 available 노드 클릭 가능

### 이 Phase에서 생성되는 파일
```
src/components/skill-tree/SkillTreeGraph.tsx
src/components/skill-tree/SkillNode.tsx
src/components/skill-tree/NodeEditor.tsx
src/components/skill-tree/UnlockAnimation.tsx
src/lib/d3/skill-tree-layout.ts
src/hooks/useSkillTree.ts
src/app/teacher/skill-tree/[id]/page.tsx
src/app/student/skill-tree/[id]/page.tsx
```

---

## Phase 5: 퀴즈 엔진 + 학생 학습 플로우

### 목표
학생이 노드를 클릭하면 퀴즈를 풀 수 있고, 맞추면 노드가 언락되는 상태.

### 전제 조건
- Phase 4 완료 (스킬트리 시각화 + 학생이 노드 클릭 가능)

### 작업 목록
1. 퀴즈 생성 Server Action (src/actions/quiz.ts)
   - generateQuizForNode: Claude API로 노드별 퀴즈 자동 생성
   - submitQuizAnswer: 채점 + 노드 언락 + 후속 노드 available 전환
2. 퀴즈 UI (src/components/quiz/)
   - QuizCard.tsx: 문제 표시 (객관식/주관식)
   - QuizResult.tsx: 정답/오답 결과 + 해설
   - AdaptiveQuiz.tsx: 틀린 패턴 기반 추가 출제
3. 퀴즈 풀기 페이지 (src/app/student/quiz/[nodeId]/page.tsx)
4. 노드 언락 로직
   - 모든 선수 노드가 completed → 후속 노드 available로 전환
   - 언락 시 XP 추가 + 레벨 체크
5. 학생 진도 조회 (교사/학생 양쪽)
6. 퀴즈 관리 페이지 (src/app/teacher/quizzes/page.tsx)
   - 교사가 AI 생성 퀴즈 확인/수정/추가

### 완료 기준
- [ ] 학생이 available 노드 클릭 → 퀴즈 페이지 이동
- [ ] 퀴즈 제출 → 정답이면 노드 언락 애니메이션 + 후속 노드 열림
- [ ] 오답이면 해설 표시 + 재도전 가능
- [ ] 교사가 노드별 퀴즈 목록 확인/편집 가능
- [ ] student_progress, quiz_attempts 테이블에 데이터 저장

### 이 Phase에서 생성되는 파일
```
src/actions/quiz.ts
src/components/quiz/QuizCard.tsx
src/components/quiz/QuizResult.tsx
src/components/quiz/AdaptiveQuiz.tsx
src/app/student/quiz/[nodeId]/page.tsx
src/app/teacher/quizzes/page.tsx
src/hooks/useQuiz.ts
src/types/quiz.ts
```

---

## Phase 6: AI 튜터 + 대시보드

### 목표
학생이 AI 튜터와 대화할 수 있고, 교사/운영자가 대시보드에서 학습 데이터를 확인하는 상태.

### 전제 조건
- Phase 5 완료 (학생 학습 데이터가 DB에 축적)

### 작업 목록
1. AI 튜터 Server Action (src/actions/tutor.ts)
   - chatWithTutor: RAG 검색 (Phase 3에서 벡터화된 document_chunks 활용) → Claude 스트리밍 답변
2. 튜터 UI (src/components/tutor/)
   - ChatInterface.tsx: 채팅 인터페이스 (useChat)
   - TutorMessage.tsx: 메시지 말풍선
   - VoiceButton.tsx: 음성 입력 버튼 (Whisper STT) — 시간 허락 시
3. 튜터 페이지 (src/app/student/tutor/page.tsx)
4. 교사 대시보드 (src/app/teacher/page.tsx 확장)
   - 반 전체 스킬트리 히트맵 (Recharts)
   - 학생별 진도 목록
   - 위험군 학생 알림 (3회 연속 실패 등)
5. 운영자 대시보드 (src/app/admin/page.tsx 확장)
   - 전체 스킬트리 수, 학생 수, 평균 언락률
   - 과목별/반별 통계 차트
6. 학생 대시보드 확장
   - 레벨/XP 표시
   - 학습 스트릭
   - 주간 진도 요약

### 완료 기준
- [ ] 학생이 AI 튜터에게 질문 → 수업자료 기반 답변이 스트리밍
- [ ] 교사 대시보드에 히트맵 + 학생 목록 + 위험군 알림 표시
- [ ] 운영자 대시보드에 전체 통계 표시
- [ ] 학생 대시보드에 레벨/XP/스트릭 표시

### 이 Phase에서 생성되는 파일
```
src/actions/tutor.ts
src/components/tutor/ChatInterface.tsx
src/components/tutor/TutorMessage.tsx
src/components/tutor/VoiceButton.tsx
src/components/dashboard/HeatmapChart.tsx
src/components/dashboard/ProgressCard.tsx
src/components/dashboard/RiskAlert.tsx
src/app/student/tutor/page.tsx
```

---

## Phase 7: 폴리싱 + 제출

### 목표
심사위원이 접속해서 3자 역할 전부 체험 가능한 완성된 프로덕트.

### 전제 조건
- Phase 6 완료 (핵심 기능 전부 작동)

### 작업 목록
1. UI/UX 폴리싱
   - 색상/타이포그래피 일관성 점검
   - 빈 상태(empty state) 처리
   - 로딩 스켈레톤 추가
   - 토스트 알림 통일
2. 반응형 대응 (모바일 최소 대응)
3. 에러 핸들링 통합
   - 모든 Server Action에 try-catch
   - 사용자 친화적 에러 메시지
   - error.tsx 바운더리 페이지
4. 데모 데이터 세팅 (supabase/seed.sql)
   - 교사 1명 + 학생 3명 + 운영자 1명
   - 스킬트리 2개 (과학/수학) + 노드/엣지/퀴즈 데이터
   - 학생 진도 일부 진행 상태
5. 랜딩 페이지 (src/app/page.tsx)
   - 프로젝트 소개 + 데모 로그인 버튼
6. README.md 작성
   - 프로젝트 설명, 기술 스택, 실행 방법, 스크린샷
7. AI 리포트 PDF 작성 (공모전 양식)
8. 최종 배포 + 테스트
9. 제출물 정리
   - GitHub 저장소 주소 (public, API Key 미노출 확인)
   - 배포된 라이브 URL
   - AI 리포트 PDF
   - 개인정보 동의서 + 참가 각서

### 완료 기준
- [ ] `npm run build` 에러 없음
- [ ] 라이브 URL에서 3자 역할 전부 작동
- [ ] 데모 계정으로 로그인 → 스킬트리 확인 → 퀴즈 풀기 → 언락 → AI 튜터 대화 가능
- [ ] GitHub에 API Key 노출 없음
- [ ] README에 실행 방법 + 데모 계정 정보 기재
- [ ] 제출물 4종 준비 완료

### 이 Phase에서 생성/수정되는 파일
```
src/app/page.tsx (랜딩 페이지)
src/app/error.tsx
supabase/seed.sql
README.md
```

---

## Phase 간 의존 관계

```
Phase 1 (기반)
    └→ Phase 2 (인증)
         └→ Phase 3 (AI 파이프라인)
              └→ Phase 4 (시각화)
                   └→ Phase 5 (퀴즈)
                        └→ Phase 6 (튜터 + 대시보드)
                             └→ Phase 7 (폴리싱)
```

**절대 규칙**: 이전 Phase의 완료 기준을 충족하지 않은 상태에서 다음 Phase로 넘어가지 않는다.
