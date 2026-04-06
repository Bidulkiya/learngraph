# AI 파이프라인 상세 문서

## 1. 스킬트리 생성 파이프라인

```
교사 업로드 (PDF/PPT/이미지/음성)
    │
    ▼
[파일 타입 분기]
    ├── PDF → pdfjs-dist로 텍스트 추출
    ├── 이미지 → Claude Vision API로 텍스트/개념 추출
    └── 음성 → Whisper API로 전사
    │
    ▼
[텍스트 정규화]
    │
    ▼
[Claude API - streamObject]
    ├── 모델: claude-sonnet-4-6-20250514
    ├── 스키마: skillTreeSchema (Zod)
    └── 프롬프트: SKILL_TREE_PROMPT
    │
    ▼
[JSON 스트리밍 수신]
    ├── nodes: [{id, title, description, difficulty}, ...]
    └── edges: [{source, target, label}, ...]
    │
    ▼
[D3.js 렌더링] ← 노드가 하나씩 스트리밍으로 나타남
    │
    ▼
[교사 편집] → 드래그/추가/삭제/연결
    │
    ▼
[DB 저장] → skill_trees + nodes + node_edges 테이블
    │
    ▼
[학생 진도 초기화] → student_progress (루트=available, 나머지=locked)
```

## 2. 퀴즈 파이프라인

```
노드 선택 (교사 또는 학생 트리거)
    │
    ▼
[Claude API - generateObject]
    ├── 입력: 노드 title + description + difficulty
    ├── 스키마: quizSchema (Zod)
    └── 출력: questions [{question, type, options, correct_answer, explanation}]
    │
    ▼
[DB 저장] → quizzes 테이블
    │
    ▼
[학생 풀이]
    │
    ▼
[채점 로직]
    ├── 객관식: 정확 매칭
    └── 주관식: Claude API로 의미 비교 (선택적)
    │
    ▼
[결과 처리]
    ├── 정답 → student_progress.status = 'completed'
    │          → 후속 노드 선수 조건 확인 → available로 전환
    │          → XP 추가 + 레벨 체크
    └── 오답 → 해설 표시 + 재도전 유도
              → quiz_attempts 기록 (적응형 출제에 활용)
```

## 3. RAG 튜터 파이프라인

```
학생 질문 (텍스트 또는 음성)
    │
    ├── [음성인 경우] → Whisper API → 텍스트 변환
    │
    ▼
[OpenAI Embeddings API]
    └── 모델: text-embedding-3-small
    └── 출력: 1536차원 벡터
    │
    ▼
[Supabase pgvector 유사도 검색]
    └── match_documents RPC 함수
    └── 해당 스킬트리의 문서 청크에서 top-3 검색
    │
    ▼
[Claude API - streamText]
    ├── system: TUTOR_SYSTEM_PROMPT + 검색된 문서 컨텍스트
    ├── messages: 대화 히스토리
    └── 스트리밍 응답
    │
    ▼
[응답 표시]
    ├── 텍스트: 채팅 UI에 스트리밍
    └── [음성 요청 시] → ElevenLabs TTS → 음성 재생
```

## 4. 문서 벡터화 파이프라인 (RAG 전처리)

```
교사가 수업자료 업로드 + 스킬트리 생성 시 동시 실행
    │
    ▼
[텍스트 추출] (스킬트리 생성과 동일)
    │
    ▼
[청크 분할]
    └── 500자 단위, 문장 경계에서 분할
    │
    ▼
[각 청크마다]
    ├── OpenAI Embeddings → 1536차원 벡터
    └── Supabase document_chunks 테이블에 저장
```

## 5. API 비용 최적화 전략

| 작업 | 모델 | 이유 |
|------|------|------|
| 스킬트리 생성 | Claude Sonnet 4.6 | 구조 추출 정확도 필요 |
| 퀴즈 생성 | Claude Sonnet 4.6 | 교육 품질 중요 |
| AI 튜터 | Claude Sonnet 4.6 | 맥락 이해 + 스트리밍 |
| 임베딩 | text-embedding-3-small | 가장 저렴 ($0.02/1M) |
| 음성 전사 | Whisper API | 정확도 + 다국어 |
| 음성 합성 | ElevenLabs | 자연스러운 한국어 |

### 비용 절감 팁
- 스킬트리 JSON 결과를 DB에 캐싱 → 같은 자료로 재호출 방지
- 데모용 스킬트리 2~3개는 JSON 하드코딩 (seed 데이터)
- 퀴즈는 노드 생성 시 한 번만 생성, 이후 DB에서 불러오기
- RAG 청크는 한 번 벡터화 후 재사용
