# NodeBloom AI 파이프라인

> 13종 AI 통합 기능의 입력 → 처리 → 출력 흐름, 사용 모델, Zod 스키마, 비용 특성을 정리한 문서입니다.

---

## 모델 선택 원칙

| 작업 유형 | 모델 | 이유 |
|---|---|---|
| 구조화 출력 (JSON) | Claude Sonnet 4.6 | 복잡한 스키마 준수 + 한국어 품질 |
| 대화 (스트리밍) | Claude Sonnet 4.6 | 맥락 유지 + 교육적 응답 |
| 음성 전사 (STT) | OpenAI Whisper `whisper-1` | 한국어 인식률 + 다국어 |
| 임베딩 (벡터 검색) | OpenAI `text-embedding-3-small` | 가장 저렴 ($0.02/1M tokens) |

**고유 규칙**:
- 모델 ID는 `claude-sonnet-4-6` 사용 (코드베이스 전체 통일)
- `generateObject`/`streamText`는 Server Action에서만 사용
- Zod 스키마는 `.describe()`로 제약 표현 (`.min()`/`.max()` 금지)
- 모든 AI 액션은 `{ data, error }` 패턴

---

## 1. 스킬트리 자동 생성

**Server Action**: `generateSkillTree()`, `saveSkillTree()` (`src/actions/skill-tree.ts`)
**모델**: Claude Sonnet 4.6 (`generateObject`)
**스키마**: `skillTreeSchema`

```
교사 업로드 (PDF/텍스트)
    │
    ▼
[입력 검증] — 최대 50000자, 빈 입력 차단
    │
    ▼
[입력 길이 제한] — 비용 폭주 방지 (30000자 초과 시 자르기)
    │
    ▼
[Claude API · generateObject]
    ├── 모델: claude-sonnet-4-6
    ├── 스키마: skillTreeSchema (Zod)
    └── 프롬프트: SKILL_TREE_PROMPT
    │
    ▼
[JSON 검증] — Zod로 타입 보장
    │
    ▼
[교사 편집] — D3 그래프 + NodeEditor
    │
    ▼
[saveSkillTree() → DB 저장]
    ├── skill_trees 테이블
    ├── nodes 테이블
    └── node_edges 테이블
    │
    ▼
[문서 임베딩 병렬 실행]
    ├── text-embedding-3-small
    └── document_chunks에 저장 (RAG용)
    │
    ▼
[학생 진도 초기화]
    └── 루트 노드(incoming edge 없음) → available
        나머지 → locked
```

**비용 특성**: 생성 시 1회 AI 호출, 이후 DB에서만 조회. 데모는 미리 생성된 스킬트리 사용.

---

## 2. 퀴즈 생성 + 서술형 채점 + 힌트

**Server Action**: `generateQuizForNode`, `submitQuizAnswer`, `getQuizHint`, `completeNode`
**모델**: Claude Sonnet 4.6
**스키마**: `quizSchema`, `essayGradingSchema`, `quizHintSchema`

```
[생성 단계]
노드 선택
    │
    ▼
[캐시 체크]
    └── 이미 있으면 DB에서 반환 (AI 호출 없음)
    │
    ▼
[난이도 자동 조절]
    ├── 최근 5개 attempts 조회
    ├── 3연속 정답 → 난이도 +1
    └── 2연속 오답 → 난이도 -1
    │
    ▼
[Claude · generateObject]
    ├── 스키마: quizSchema
    └── QUIZ_PROMPT(title, description, adjustedDifficulty)
    │
    ▼
[quizzes 테이블 insert]

[채점 단계]
학생 답변 제출
    │
    ▼
[문제 유형 분기]
    ├── 객관식 → 정확 매칭 (AI X)
    └── 서술형 → Claude · essayGradingSchema로 의미 채점
         ├── score: 0-100
         ├── feedback: 부분 점수 설명
         └── key_points_matched: [{point, matched, evidence}]
    │
    ▼
[quiz_attempts 기록] + 점수
    │
    ▼
[completeNode 호출 조건: score ≥ 70]
    ├── student_progress.status = completed
    ├── XP 추가 (+30)
    ├── 업적 체크 (checkAndAwardAchievements)
    ├── 복습 알림 생성 (에빙하우스 1/3/7일)
    ├── 플래시카드 자동 생성 (generateFlashcards)
    ├── 활동 피드 기록 (postActivity)
    ├── 미션 진행 (updateMissionProgress)
    └── 100% 완료 시 인증서 자동 발급 (issueCertificate)

[힌트 단계 — 노력 기반 잠금]
학생이 힌트 요청
    │
    ▼
[노력 체크]
    └── quiz_attempts 3회 미만이면 거부 ("n번 더 시도 후 열립니다")
    │
    ▼
[Claude · generateObject]
    ├── 스키마: quizHintSchema
    └── QUIZ_HINT_PROMPT (정답 직접 공개 금지)
    │
    ▼
[힌트 반환] — "방향 제시" 수준의 소크라틱 힌트
```

**비용 특성**: 노드당 1회 생성 후 DB 캐시. 서술형 채점만 매번 AI 호출.

---

## 3. 소크라틱 AI 튜터 (RAG)

**Server Action**: `chatWithTutor()` (`src/actions/tutor.ts`)
**모델**: Claude Sonnet 4.6 (`streamText` — 내부적으로 generateText 패턴)
**임베딩**: `text-embedding-3-small`

```
학생 질문 (텍스트 또는 음성)
    │
    ├── [음성인 경우]
    │   └── Whisper API로 transcribeAudio()
    │
    ▼
[학생 학습 스타일 + 감정 조회]
    ├── profiles.learning_style
    └── emotion_reports (최신)
    │
    ▼
[OpenAI Embeddings API]
    ├── 모델: text-embedding-3-small
    └── 출력: 1536차원 벡터
    │
    ▼
[Supabase pgvector 유사도 검색]
    ├── match_documents RPC
    └── 현재 스킬트리의 document_chunks에서 top-3
    │
    ▼
[프롬프트 조립]
    ├── TUTOR_SYSTEM_PROMPT (소크라틱 기본)
    ├── TUTOR_SOCRATIC_PROMPT (정답 직접 금지)
    ├── TUTOR_LEARNING_STYLE (시각/텍스트/실습형 적응)
    ├── TUTOR_EMOTION_ADAPTATION (자신감/고전/좌절 톤 조절)
    └── 검색된 문서 컨텍스트 3개
    │
    ▼
[Claude · streamText] — 내부 generateText 패턴
    │
    ▼
[tutor_conversations에 누적]
    └── messages (jsonb) 배열에 push
    │
    ▼
[응답 반환]
```

**비용 특성**: 매 메시지마다 임베딩 + Claude 호출. 대화 길이 제한 필요.

---

## 4. 수업 녹음 → 전사 → 요약

**Server Action**: `transcribeRecording`, `summarizeLesson`, `generateQuizFromRecording`
**모델**: Whisper + Claude Sonnet 4.6
**스키마**: `lessonSummarySchema`, `quizSchema`

```
[1단계: 전사]
교사 녹음 업로드 (FormData, max 25MB)
    │
    ▼
[권한 체크] — 교사/운영자만
    │
    ▼
[Whisper API]
    ├── 모델: whisper-1
    ├── 언어: ko
    └── 출력: transcript (텍스트)
    │
    ▼
[lesson_recordings insert]
    ├── teacher_id
    ├── transcript
    └── duration_seconds

[2단계: 요약]
recordingId 전달
    │
    ▼
[권한 체크 + 전사 존재 확인]
    │
    ▼
[Claude · generateObject]
    ├── 스키마: lessonSummarySchema
    └── LESSON_SUMMARY_PROMPT
    │
    ▼
[summary 업데이트 — DB 캐시]
    ├── key_points: [string]
    ├── topics: [string]
    ├── questions: [string]
    └── action_items: [string]

[3단계: 복습 퀴즈 생성]
recordingId 전달
    │
    ▼
[Claude · generateObject]
    ├── 스키마: quizSchema
    └── QUIZ_PROMPT('수업 복습', transcript[:2000], 2)
    │
    ▼
[quiz 반환 — 복습용]
```

**비용 특성**: 녹음당 1회 전사 + 1회 요약. 추가 재생성 없음.

---

## 5. 주간 학습 플랜 (학습 코치)

**Server Action**: `getWeeklyPlan()` (`src/actions/coach.ts`)
**모델**: Claude Sonnet 4.6
**스키마**: `weeklyPlanSchema`

```
학생 대시보드 WeeklyPlanCard 마운트
    │
    ▼
[주 캐시 확인]
    └── weekly_plans WHERE week_start = 월요일(오늘)
         └── 있으면 반환 (AI 호출 없음)
    │
    ▼
[데모 계정 분기]
    └── 데모면 하드코딩 fallback plan 반환
    │
    ▼
[학생 데이터 집계]
    ├── 진도: student_progress (completed/available/locked 집계)
    ├── 약점: quiz_score < 80인 노드 목록
    └── 현재 available 노드 목록
    │
    ▼
[Claude · generateObject]
    ├── 스키마: weeklyPlanSchema
    └── WEEKLY_PLAN_PROMPT(progressSummary, availableList, weakList)
    │
    ▼
[weekly_plans upsert] — 주 단위 캐시
    │
    ▼
[plan 반환]
    └── plan: [{day, nodes, reason}], motivation: string
```

**비용 특성**: 학생당 **주 1회**만 AI 호출. 캐시 덕분에 월 평균 4~5회.

---

## 6. 학습 감정 분석

**Server Action**: `analyzeStudentEmotion()` (`src/actions/emotion.ts`)
**모델**: Claude Sonnet 4.6
**스키마**: `emotionReportSchema`

```
교사/학생이 EmotionOverviewCard 조회
    │
    ▼
[일 캐시 확인]
    └── emotion_reports WHERE report_date = 오늘
         └── 있으면 반환 (AI 호출 없음)
    │
    ▼
[데모 분기] — 데모는 캐시만, 생성 안 함
    │
    ▼
[최근 20회 quiz_attempts 조회]
    ├── is_correct, score, hint_used, feedback
    └── attempted_at DESC
    │
    ▼
[Claude · generateObject]
    ├── 스키마: emotionReportSchema
    └── EMOTION_ANALYSIS_PROMPT
    │
    ▼
[emotion_reports upsert] — 일 단위
    └── mood: 'confident' | 'neutral' | 'struggling' | 'frustrated'
    └── mood_score: 0-100
    └── insights, recommendation
    └── node_emotions: [{node_title, emotion}]
    │
    ▼
[튜터가 이 리포트를 읽고 톤 자동 조절]
```

**비용 특성**: 학생당 **하루 1회**만 AI 호출.

---

## 7. 이탈 조기 경보

**Server Action**: `calculateRiskScore`, `getClassRiskAlerts`, `getAdminRiskOverview`
**모델**: **AI 없음** — 통계/규칙 기반

```
교사/운영자 대시보드 조회
    │
    ▼
[각 학생 데이터 수집]
    ├── 최근 7일 접속 여부 (last_study_date)
    ├── 최근 10회 퀴즈 정답률
    ├── 주당 학습 시간 (week_study_minutes)
    ├── 일일 미션 완료율
    └── 스트릭 끊김 여부
    │
    ▼
[위험 점수 계산] — 가중합
    ├── 접속 안 함: +30
    ├── 정답률 < 50%: +25
    ├── 학습 시간 < 60분/주: +20
    ├── 미션 완료율 0%: +15
    └── 스트릭 끊김: +10
    │
    ▼
[위험 등급 분류]
    ├── 0-24 → low
    ├── 25-49 → medium
    ├── 50-74 → high
    └── 75-100 → critical
    │
    ▼
[위험 요인 텍스트 생성]
    └── "최근 5회 오답", "5일간 미접속" 등
```

**비용 특성**: AI 호출 **없음**. 순수 SQL + 집계.

---

## 8. 적응형 복습 엔진

**Server Action**: `getTodayReviews`, `markReviewCompleted`
**모델**: **AI 없음** — 에빙하우스 곡선 + 정답률 기반 간격 조절

```
[복습 알림 생성] — 노드 완료 시 자동
    │
    ▼
[기본 간격]
    └── 1일 후 첫 복습 예약
         review_reminders insert (interval_days: 1)

[복습 완료 처리]
학생이 복습 퀴즈 풀이 완료
    │
    ▼
[적응형 간격 계산]
    ├── 정답률 ≥ 80% → prev × 2.0 (잘 기억)
    ├── 60-79%    → prev × 1.0 (동일)
    └── < 60%     → prev × 0.5 (자주 복습)
         └── 최소 1일, 최대 60일
    │
    ▼
[다음 review_reminders insert]
    └── remind_at = 오늘 + 새 interval_days
    │
    ▼
[긴급도 분류]
    ├── remind_at < 오늘 → overdue
    ├── remind_at = 오늘 → today
    └── remind_at > 오늘 → soon
```

**비용 특성**: AI 호출 **없음**.

---

## 9. 크로스커리큘럼 지식 맵

**Server Action**: `findConceptConnections()` (`src/actions/cross-curriculum.ts`)
**모델**: Claude Sonnet 4.6
**스키마**: `crossCurriculumSchema`

```
학생이 ConceptMapCard "지식 연결 발견" 버튼 클릭
    │
    ▼
[권한 체크] — 본인/담당 교사/admin
    │
    ▼
[데모 분기] — 데모는 AI 호출 차단
    │
    ▼
[학생의 completed 노드 전체 조회]
    └── 최소 3개 이상 필요 (그 미만이면 거부)
    │
    ▼
[노드 + 스킬트리 정보 join]
    └── trees.subject_hint (과학/수학/국어/영어/사회)
    │
    ▼
[노드 데이터 포맷]
    └── "[과학] 광합성의 명반응 — 엽록체에서 빛 에너지를..."
    │
    ▼
[Claude · generateObject]
    ├── 스키마: crossCurriculumSchema
    └── CROSS_CURRICULUM_PROMPT
    │
    ▼
[결과 반환]
    └── connections: [{from_subject, from_node, to_subject, to_node, relation, benefit}]
```

**비용 특성**: 학생이 버튼 클릭 시에만 호출. 저빈도.

---

## 10. HTML 학습지 자동 생성

**Server Action**: `generateLearningDocForNode`, `getOrCreatePersonalizedDoc`, `reviseLearningDoc`, `saveLearningDocManually`
**모델**: Claude Sonnet 4.6
**스키마**: `learningDocSchema`, `teacherStyleSchema`

```
[학생 접근]
학생이 NodeDetailPopup 열기
    │
    ▼
[nodes.learning_content 조회]
    └── 이미 있으면 반환 (AI 호출 없음)
    │
    ▼
[데모 분기] — 데모는 미리 만든 문서만 사용
    │
    ▼
[학습 스타일 + 스킬트리 style_guide 조회]
    │
    ▼
[Claude · generateObject]
    ├── 스키마: learningDocSchema
    └── LEARNING_DOC_PROMPT(title, description, treeTitle, subjectHint, styleGuide, learningStyle)
    │
    ▼
[HTML 문서 반환]
    ├── 단원명 배너 + 학습 목표
    ├── 핵심 개념 설명
    ├── 표 (핵심 포인트)
    ├── 예시 문제
    ├── 핵심 정리
    └── 더 생각해 보기 질문
    │
    ▼
[nodes.learning_content update] — 캐시

[교사 수정]
교사가 "AI에게 고쳐줘" 요청
    │
    ▼
[Claude · generateObject + LEARNING_DOC_REVISE_PROMPT]

[교사 직접 작성]
교사가 직접 HTML 작성
    │
    ▼
[Claude · generateObject + TEACHER_STYLE_ANALYSIS_PROMPT]
    └── 스타일 가이드 추출 → skill_trees.style_guide에 저장
    └── 이후 같은 스킬트리의 다른 노드 생성 시 이 가이드가 프롬프트에 주입됨
```

**비용 특성**: 노드당 1회 생성 후 DB 캐시. 교사 재생성 시에만 추가 호출.

---

## 11. 약점 진단 + 오답 분석

**Server Action**: `getWrongAnswers`, `analyzeWeakness` (`src/actions/weakness.ts`)
**모델**: Claude Sonnet 4.6
**스키마**: `weaknessAnalysisSchema`

```
[오답 목록]
학생이 /student/wrong-answers 접근
    │
    ▼
[getWrongAnswers]
    ├── quiz_attempts WHERE is_correct = false
    ├── JOIN quizzes (문제/정답/해설)
    ├── JOIN nodes (노드 제목)
    └── ORDER BY attempted_at DESC

[AI 진단]
학생이 "약점 진단" 버튼 클릭
    │
    ▼
[최근 10개 오답 샘플]
    │
    ▼
[데모 분기] — 차단
    │
    ▼
[Claude · generateObject]
    ├── 스키마: weaknessAnalysisSchema
    └── 프롬프트: 오답 패턴 분석 + 개념 이해 vs 단순 실수 구분
    │
    ▼
[결과 반환]
    ├── diagnosis: 전체 진단 (한국어)
    ├── weak_areas: [구체적 개념 이름]
    └── recommendations: [실천 가능한 행동]
```

**비용 특성**: 학생이 명시적으로 요청할 때만 호출.

---

## 12. 학부모 리포트 + 자동 인증서 + 주간 브리핑

**Server Action**: `generateParentReport`, `issueCertificate`, `generateWeeklyBriefing`
**모델**: Claude Sonnet 4.6
**스키마**: `parentReportSchema`, `weeklyBriefingSchema`

### 12-A. 학부모 리포트
```
교사/학부모가 리포트 요청
    │
    ▼
[권한 체크] — 본인/담당 교사/admin
    │
    ▼
[데모 분기] — 차단
    │
    ▼
[학생 데이터 집계]
    ├── 진도율 (completed/total)
    ├── 평균 퀴즈 점수
    ├── 약점 노드 (score < 70)
    ├── 스트릭 / 학습 시간
    └── 최근 2주 활동 기록
    │
    ▼
[Claude · generateObject]
    ├── 스키마: parentReportSchema
    └── PARENT_REPORT_PROMPT
    │
    ▼
[결과 — 학부모 친화적 리포트]
    ├── overall_comment
    ├── strengths: [강점]
    ├── improvements: [개선점]
    └── encouragement: 격려 메시지
```

### 12-B. 자동 인증서
```
completeNode 호출 시점
    │
    ▼
[스킬트리 100% 완료 체크]
    └── student_progress 전체 COUNT(status=completed) == 총 노드 수
    │
    ▼
[issueCertificate 자동 호출]
    │
    ▼
[중복 체크] — certificates에 이미 있으면 기존 반환
    │
    ▼
[데모 분기] — silent skip
    │
    ▼
[인증서 데이터 조립]
    ├── 학생명, 스킬트리 제목, 교사명
    ├── 노드 수, 평균 점수
    └── 발급일
    │
    ▼
[certificates insert]
    │
    ▼
[MyCertificatesCard에서 HTML 템플릿으로 인쇄 가능]
    └── NodeBloom 로고 + SEAL + A4 양식
```

### 12-C. 주간 AI 브리핑 (교사용)
```
교사가 WeeklyBriefingCard 조회
    │
    ▼
[주 캐시 확인] — weekly_briefings WHERE week_start = 월요일
    └── 있으면 반환
    │
    ▼
[데모 분기] — 차단
    │
    ▼
[지난 7일 데이터 집계]
    ├── 학생 목록
    ├── 퀴즈 평균 점수
    ├── 진도율
    └── 병목 노드 (통과율 낮은 상위 3)
    │
    ▼
[Claude · generateObject]
    ├── 스키마: weeklyBriefingSchema
    └── WEEKLY_BRIEFING_PROMPT
    │
    ▼
[weekly_briefings upsert] — 주 단위
    └── summary, highlights, concerns, action_items
```

**비용 특성**: 각 캐시 정책 덕분에 학생당 월 4~5회 수준.

---

## 13. 사전 시뮬레이션

**Server Action**: `simulateSkillTree()` (`src/actions/simulation.ts`)
**모델**: Claude Sonnet 4.6
**스키마**: `simulationSchema`

```
교사가 SimulationDialog "시뮬레이션" 버튼 클릭
    │
    ▼
[권한 체크] — 스킬트리 소유 교사/admin
    │
    ▼
[데모 분기] — 차단
    │
    ▼
[스킬트리 구조 조회]
    ├── nodes (난이도 포함)
    ├── edges
    └── 노드별 퀴즈 수
    │
    ▼
[포맷 조립]
    ├── "1. [난이도 3] AI란 무엇인가 — 설명... (퀴즈 4개)"
    └── 엣지: "노드1 → 노드2"
    │
    ▼
[Claude · generateObject]
    ├── 스키마: simulationSchema
    └── SIMULATION_PROMPT
         "100명의 가상 학생이 이 스킬트리를 학습한다고 가정하고..."
    │
    ▼
[결과 반환]
    ├── estimated_completion_rate: 예상 완주율
    ├── estimated_avg_score: 예상 평균 점수
    ├── bottleneck_nodes: [병목 노드 (학생의 몇 %가 막힐지)]
    ├── difficulty_issues: [난이도 문제]
    └── recommendations: [스킬트리 개선 제안]
```

**비용 특성**: 교사가 배포 전 1회 호출. 저빈도.

---

## 보조 AI 기능

### 플래시카드 자동 생성 (`generateFlashcards`)
- 노드 완료 시 자동 호출
- 5장 앞/뒤 카드 생성
- Claude + `flashcardsSchema`

### 학생 그룹 분류 (`analyzeStudentGroups`)
- 교사용 클래스 학생 2-4 그룹 분류
- XP/진도/성적 기반
- Claude + `studentGroupsSchema`

### 교육과정 병목 분석 (`analyzeBottlenecks`)
- 운영자용 스쿨 전체 병목 노드 탐지
- 통계 + AI 설명
- Claude + `bottleneckSchema`

### 개념 추천 (`getConceptConnections`)
- 노드 클릭 시 관련 개념 추천
- Claude + `conceptConnectionSchema`

---

## 문서 벡터화 (RAG 전처리)

```
교사가 스킬트리 생성 + 파일 업로드
    │
    ▼
[텍스트 추출] — pdf-parse 등
    │
    ▼
[청크 분할]
    └── 500자 단위, 문장 경계 기준
    │
    ▼
[각 청크]
    ├── OpenAI Embeddings → 1536 차원 벡터
    └── document_chunks insert (skill_tree_id, content, embedding)
    │
    ▼
[pgvector 인덱스 자동 갱신]
    └── 이후 chatWithTutor에서 match_documents RPC로 검색
```

---

## API 비용 최적화 전략

### 캐시 우선 정책
| 기능 | 캐시 단위 | 테이블 |
|---|---|---|
| 주간 학습 플랜 | 주 | `weekly_plans` |
| 학습 감정 분석 | 일 | `emotion_reports` |
| 주간 AI 브리핑 | 주 | `weekly_briefings` |
| 학습 문서 | 영구 (노드별) | `nodes.learning_content` |
| 퀴즈 | 영구 (노드별) | `quizzes` |
| 플래시카드 | 영구 (노드별) | `flashcards` |
| 튜터 대화 | 세션 | `tutor_conversations` |
| 수업 녹음 요약 | 영구 (녹음별) | `lesson_recordings.summary` |

### 데모 계정 차단
- 모든 AI 호출 Server Action은 `assertNotDemo` 가드 포함
- 데모 환경은 미리 하드코딩된 데이터만 사용 → 비용 0

### 입력 길이 제한
- 스킬트리 생성: 30000자
- 수업 녹음 요약: 전사 전체
- 학습 문서 생성: 노드 설명 5000자
- 튜터 대화: 최근 10개 메시지만 유지

### 가드 패턴 (예: generateWeeklyBriefing)
```typescript
// 1. 캐시 먼저 확인
if (!forceRefresh) {
  const { data: cached } = await admin.from('weekly_briefings')...
  if (cached) return { data: cached }
}

// 2. 데모 차단
if (isDemoAccount(user.email)) {
  return { error: '체험 모드에서는 이 기능을 사용할 수 없습니다...' }
}

// 3. AI 호출
const { object } = await generateObject({ ... })
```

---

## Zod 스키마 위치
모든 AI 출력 스키마는 `src/lib/ai/schemas.ts`에 집중:

| 스키마 | 함수 |
|---|---|
| `skillTreeSchema` | generateSkillTree |
| `quizSchema` | generateQuizForNode, generateQuizFromRecording |
| `essayGradingSchema` | submitQuizAnswer (서술형 채점) |
| `quizHintSchema` | getQuizHint |
| `learningDocSchema` | generateLearningDocForNode, reviseLearningDoc |
| `teacherStyleSchema` | saveLearningDocManually |
| `weaknessAnalysisSchema` | analyzeWeakness |
| `weeklyPlanSchema` | getWeeklyPlan |
| `weeklyBriefingSchema` | generateWeeklyBriefing |
| `emotionReportSchema` | analyzeStudentEmotion |
| `simulationSchema` | simulateSkillTree |
| `crossCurriculumSchema` | findConceptConnections |
| `parentReportSchema` | generateParentReport |
| `lessonSummarySchema` | summarizeLesson |
| `flashcardsSchema` | generateFlashcards |
| `studentGroupsSchema` | analyzeStudentGroups |
| `bottleneckSchema` | analyzeBottlenecks |
| `conceptConnectionSchema` | getConceptConnections |

모든 스키마는 `.describe()` 기반. `z.number().min().max()` 사용 금지 — Claude 구조화 출력 호환성.
