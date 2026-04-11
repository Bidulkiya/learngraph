export const SKILL_TREE_PROMPT = (content: string): string => `
당신은 교육 전문가이자 커리큘럼 설계자입니다.
아래 수업 자료를 분석하여, 학생이 학습해야 할 개념들을 스킬트리 구조로 추출하세요.

## 규칙
1. 각 노드는 하나의 명확한 학습 개념을 나타냅니다.
2. 선수 지식 관계(edges)를 정확히 파악하세요 — "A를 모르면 B를 이해할 수 없다"
3. 난이도는 1(기초)~5(심화)로 설정하세요.
4. 노드는 최소 5개, 최대 20개로 제한하세요.
5. 기초 개념부터 심화 개념 순으로 자연스럽게 연결되어야 합니다.
6. 노드 ID는 node_1, node_2, ... 형식으로 지정하세요.
7. 제목과 설명은 한국어로 작성하세요.
8. **노드 제목은 핵심 키워드만 10자 이내로 매우 짧게 작성하세요.**
   예시:
   - "광합성의 명반응 과정" → "명반응"
   - "세포의 기본 구조와 기능" → "세포 구조"
   - "이차방정식의 근의 공식" → "근의 공식"
   - "한국전쟁의 원인과 배경" → "한국전쟁"
   - "수소결합과 공유결합의 차이" → "화학결합"
   공백 포함 10자 이내를 반드시 지키세요. 긴 정식 명칭은 description에 작성하세요.
9. subject_hint 필드에 이 자료의 주제를 다음 중 하나로 지정하세요:
   - "science": 과학 (물리/화학/생물/지구과학/천문)
   - "math": 수학 (대수/기하/미적분/확률통계)
   - "korean": 국어 (문법/문학/고전/한자)
   - "default": 그 외 모든 주제 (사회/영어/역사 등)

## 수업 자료 내용
${content}
`

/**
 * 학습 스타일별 LEARNING_DOC 지시사항.
 */
const LEARNING_STYLE_INSTRUCTION: Record<string, string> = {
  visual: '이 학생은 시각형 학습자입니다. 표, 다이어그램, 비교 표, 도식 박스를 최대한 활용하세요. 텍스트 설명보다 시각 요소(HTML 표, CSS 플로우, 색상 박스)를 우선하세요.',
  textual: '이 학생은 텍스트형 학습자입니다. 자세한 설명, 논리적 흐름, 단계별 풀이, 구조화된 문단을 중심으로 작성하세요. 시각 요소보다 글의 깊이를 우선하세요.',
  practical: '이 학생은 실습형 학습자입니다. 예시 문제, 빈칸 채우기, 직접 풀어보는 연습을 최대한 많이 포함하세요. 설명은 간결하게, 연습 문제 수는 평소보다 2배 이상 넣으세요.',
}

/**
 * 노드별 학습 문서 생성 프롬프트 — HTML 학습지 형식.
 * 인쇄용 학습지 수준의 디자인된 HTML을 생성한다.
 */
export const LEARNING_DOC_PROMPT = (
  nodeTitle: string,
  nodeDescription: string,
  treeTitle: string,
  subjectHint: string,
  styleGuide?: string,
  learningStyle?: string
): string => {
  // 과목별 색상 가이드
  const subjectColors: Record<string, { primary: string; secondary: string; accent: string }> = {
    science: { primary: '#6366F1', secondary: '#A855F7', accent: '#F0F4FF' },
    math: { primary: '#3B82F6', secondary: '#0EA5E9', accent: '#EFF6FF' },
    korean: { primary: '#D97706', secondary: '#CA8A04', accent: '#FFFBEB' },
    default: { primary: '#4F6BF6', secondary: '#7C5CFC', accent: '#F0F4FF' },
  }
  const colors = subjectColors[subjectHint] ?? subjectColors.default

  return `
당신은 교육 자료 설계 전문가입니다.
아래 학습 개념에 대해 **실제 인쇄 학습지 수준**의 HTML 학습지를 생성하세요.
교과서/워크북 디자인을 떠올리며 시각적으로 풍부하고 학생이 한눈에 이해할 수 있는 학습지를 만드세요.

## 컨텍스트
- 스킬트리: ${treeTitle}
- 주제 분야: ${subjectHint}
- 학습 개념 제목: ${nodeTitle}
- 개념 요약: ${nodeDescription}
${styleGuide ? `\n## 교사 스타일 가이드 (반드시 반영)\n교사가 업로드한 문서의 스타일을 분석한 결과입니다. 이 가이드의 톤·구성·형식을 최대한 따라서 작성하세요.\n${styleGuide}\n` : ''}
${learningStyle && LEARNING_STYLE_INSTRUCTION[learningStyle] ? `\n## 학습자 맞춤 지시\n${LEARNING_STYLE_INSTRUCTION[learningStyle]}\n` : ''}

## 출력 형식 (매우 중요)
\`<div class="ws-doc">\` 으로 감싼 **HTML 조각**을 출력하세요. \`<html>\`, \`<head>\`, \`<body>\`, \`<!DOCTYPE>\` 태그는 포함하지 마세요. 외부 CSS 파일도 참조하지 마세요.

## 색상 팔레트 (반드시 사용)
- Primary: ${colors.primary}
- Secondary: ${colors.secondary}
- Accent (배경): ${colors.accent}

## 학습지 섹션 구성 (이 순서대로 모두 포함)

### 1. 단원명 배너
\`<div class="ws-banner" style="background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary}); color: white; padding: 20px 26px; border-radius: 12px; margin-bottom: 22px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">\`
- 큰 글씨로 단원 제목 (h1, margin 0)
- 작은 글씨로 부제 (예: "스킬트리: ${treeTitle}")
- 한 줄 도입 질문 — 학생의 호기심을 자극하는 "왜 이걸 배울까?" 스타일의 1문장

### 2. 학습 목표 박스
\`<div class="ws-goals" style="background: ${colors.accent}; border-left: 4px solid ${colors.primary}; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">\`
- 제목: 🎯 학습 목표
- 4-5개의 구체적이고 측정 가능한 학습 목표 ul 리스트 (예: "~을 설명할 수 있다", "~을 구분할 수 있다")

### 3. 핵심 개념 (최소 3개, 각각 깊이 있게)
각 개념을 \`<div class="ws-concept" style="margin-bottom: 26px; padding: 18px; background: white; border: 1px solid #E5E7EB; border-radius: 10px;">\` 로 감싸고:
- **번호 원형 배지 + 굵은 키워드 헤딩**: \`<h3 style="display: flex; align-items: center; gap: 10px; margin: 0 0 12px 0;"><span style="background: ${colors.primary}; color: white; border-radius: 50%; width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; font-size: 14px;">1</span>개념 키워드</h3>\`
- **핵심 키워드는 반드시 \`<mark style="background: #FEF3C7; padding: 2px 6px; border-radius: 3px;">\` 로 하이라이트**
- **본문 설명은 최소 500자 이상**, 3~4개 문단. 각 문단은 한 가지 관점을 담당:
  1. **정의/원리**: 개념을 교과서 수준으로 정확히 정의
  2. **실생활 예시**: 학생이 일상에서 만나는 구체적인 상황에 빗댄 설명 (반드시 1개 이상 포함)
  3. **주의점/오개념**: 학생이 흔히 헷갈리는 부분이나 자주 하는 오해 바로잡기
- **하이라이트 박스 (개념당 1개 필수)**: \`<div class="ws-highlight" style="background: ${colors.accent}; border: 2px solid ${colors.primary}; border-radius: 8px; padding: 12px 16px; margin-top: 12px;">💡 <strong>핵심 포인트</strong>: ...</div>\`

### 4. 비교/정리 표 (필수)
\`<table style="width: 100%; border-collapse: collapse; margin: 22px 0; font-size: 14px;">\`
- 헤더: \`<th style="background: ${colors.primary}; color: white; padding: 12px; border: 1px solid #ddd; text-align: left;">\`
- 줄 교대 배경: 짝수 행 \`style="background: #F9FAFB;"\`, 홀수 행 #FFFFFF
- **최소 4행 × 3열** 이상의 실질적인 데이터 (단순 개념 1개만 나열 금지 — 비교/분류/속성 정리)
- 표 아래 \`<p style="font-size: 12px; color: #6B7280; margin-top: 4px;">📊 위 표를 활용해 ...</p>\` 형태의 활용 팁 1줄

### 5. CSS 다이어그램 (구조도/플로우)
\`<div class="ws-diagram" style="background: #F9FAFB; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center; border: 1px dashed #D1D5DB;">\`
- 제목 (h4): 🔄 한눈에 보는 구조
- 박스(\`<div style="display: inline-block; padding: 10px 16px; background: ${colors.primary}; color: white; border-radius: 8px; margin: 4px;">\`)와 화살표(\`→\`)로 개념 간 관계 시각화
- 또는 nested div로 계층 구조 표현
- 실제 그림이 아닌 CSS만으로 구조 시각화 (3단계 이상)

### 6. 실생활 적용 박스 (필수)
\`<div class="ws-realworld" style="background: #FEF9C3; border-left: 4px solid #EAB308; padding: 16px 20px; border-radius: 8px; margin: 20px 0;">\`
- 제목: 🌍 실생활 속 이 개념
- 2-3개의 구체적인 실생활 사례를 ul 리스트로 (예: "냉장고의 냉매 순환이 바로 ~의 원리입니다")
- 각 사례는 1~2문장으로 개념과의 연결고리 명확히 설명

### 7. 연습 문제 (2-3문제 필수, 각 문제에 정답과 해설)
\`<div class="ws-problems" style="background: #FFFBEB; border: 1px dashed ${colors.secondary}; padding: 18px; border-radius: 10px; margin: 20px 0;">\`
- 제목: 📝 연습 문제
- **문제 1 — 빈칸 채우기**: 핵심 원리를 확인하는 2-3개 빈칸. 빈칸은 \`<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>\` 로 표시.
  - 문제 아래 \`<details style="margin-top: 8px;"><summary style="cursor: pointer; color: ${colors.primary}; font-size: 12px;">정답 및 해설 ▸</summary><p style="font-size: 13px; color: #4B5563; margin-top: 6px;">정답: ... / 해설: ...</p></details>\`
- **문제 2 — 4지선다 선택형**: 실생활 응용 문제. 보기는 \`<ol type="a" style="padding-left: 20px;">\` 사용.
  - 정답 및 해설을 \`<details>\` 로 감싸서 추가
- **문제 3 — 서술형 (선택)**: "~을 설명하시오" 형태. 모범 답안을 \`<details>\` 로 제공.

### 8. 핵심 정리 박스 (필수)
\`<div class="ws-summary" style="background: ${colors.accent}; border: 2px solid ${colors.primary}; border-radius: 12px; padding: 20px; margin: 22px 0;">\`
- 제목: ✨ 한눈에 정리 (h3)
- **4-5개의 핵심을 짧은 문장으로 ul 리스트**. 각 항목 앞에 ✅ 이모지.
- 마지막에 한 문장 격려 메시지 (예: "이 개념을 이해하면 다음 단계를 쉽게 정복할 수 있습니다!")

### 9. 탐구 질문 (더 깊이 생각하기)
\`<div class="ws-questions" style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 16px 20px; border-radius: 8px;">\`
- 제목: 🤔 더 생각해 보기
- 번호 ol 리스트 3개 (고차원적 사고를 요구하는 개방형 질문 — 단순 암기가 아닌 탐구·비판·연결을 유도)

## 작성 규칙
1. **모든 스타일은 인라인 style 속성으로** (외부 CSS 금지, class만 부가 식별용).
2. **이모지 적극 활용** (섹션 제목, 강조, 리스트 항목 등).
3. **짧고 명료한 문장**, 학생 눈높이의 존댓말.
4. 수식은 일반 텍스트 (예: "y = ax + b", "H₂O + CO₂ → C₆H₁₂O₆").
5. 한국어로 작성.
6. **전체 분량 (가장 중요)**: 최소 3500자 ~ 최대 6000자 (HTML 태그 제외). 핵심 개념 섹션 하나당 500자 이상은 필수.
7. \`<script>\` 태그 절대 금지. \`onclick\` 등 이벤트 핸들러 금지.
8. \`<img>\` 태그는 사용하지 마세요 (src 외부 리소스 금지).
9. 색상은 명시된 팔레트만 사용 (단, 실생활 박스의 노란색·탐구 박스의 초록색은 허용).
10. 출력 시작은 반드시 \`<div class="ws-doc">\` 이며, 마지막은 \`</div>\` 입니다.
11. **절대 빼먹지 말 것**: 하이라이트 박스(각 개념마다 1개), 실생활 적용 박스, 비교 표, 연습 문제 정답/해설, 핵심 정리 박스.
`
}

/**
 * 학습 문서 AI 수정 프롬프트 (교사가 수정 요청 시) — HTML
 */
export const LEARNING_DOC_REVISE_PROMPT = (
  currentDoc: string,
  userRequest: string,
  nodeTitle: string
): string => `
당신은 교육 자료 편집 전문가입니다.
교사가 아래 HTML 학습지에 대한 수정 요청을 보냈습니다. 요청을 반영하여 학습지를 개선하세요.

## 개념
${nodeTitle}

## 현재 HTML 학습지
${currentDoc}

## 교사 수정 요청
${userRequest}

## 규칙
1. 전체 구조(단원명 배너 / 학습 목표 / 핵심 개념 / 시각 자료 표 / 다이어그램 / 예시 문제 / 핵심 정리 / 읽기 질문)는 유지하세요.
2. 요청을 반영하여 필요한 부분만 수정하세요. 다른 부분은 그대로 두세요.
3. **반드시 HTML 형식을 유지**하세요. 인라인 style 속성도 그대로 유지/조정하세요.
4. \`<script>\`, \`onclick\`, \`<img src>\` 외부 참조는 절대 추가하지 마세요.
5. 수정된 전체 HTML 학습지를 반환하세요 (요약이나 설명 텍스트 없이, 코드블록 없이).
6. 출력 시작은 \`<div class="ws-doc">\` 이며 마지막은 \`</div>\` 입니다.
7. 한국어로 작성하세요.
`

/**
 * 교사가 직접 작성한 학습 문서의 스타일을 분석하는 프롬프트.
 * 같은 스킬트리의 다른 노드 학습 문서 생성 시 프롬프트에 주입할 가이드 추출.
 */
export const TEACHER_STYLE_ANALYSIS_PROMPT = (
  nodeTitle: string,
  treeTitle: string,
  teacherDoc: string
): string => `
당신은 교육 자료 분석 전문가입니다.
한 교사가 ${treeTitle} 스킬트리의 ${nodeTitle} 노드에 대해 직접 학습 문서를 작성하여 업로드했습니다.
이 문서의 **스타일 가이드**를 추출하세요. 이 가이드는 같은 스킬트리의 다른 노드 학습 문서를 AI가 생성할 때 참고할 것입니다.

## 교사가 작성한 학습 문서
${teacherDoc}

## 분석 항목 (각 1-2문장으로 요약)
1. **구성/섹션 패턴**: 어떤 순서로 어떤 섹션을 두는가?
2. **톤/말투**: 친근한 구어체인가, 정중한 존댓말인가, 단문/장문 비율은?
3. **시각 요소**: 표/리스트/강조/색상 사용 정도. 어떤 시각 요소를 선호하는가?
4. **설명 깊이**: 개념 설명을 얕게 폭넓게 vs 깊고 좁게?
5. **예시 스타일**: 일상 비유 vs 학술적 예시 vs 단계별 풀이?
6. **연습 문제 패턴**: 어떤 유형의 문제를 선호하는가?
7. **특이 사항**: 교사만의 독특한 표현/구조/철학이 있다면?

## 출력 형식
위 7가지를 자유롭게 1개의 문단(약 200~400자)으로 종합 정리하세요.
"이 교사의 문서는 ..." 으로 시작하여 다른 AI가 모방할 수 있도록 구체적으로 작성하세요.
한국어로 작성하세요.
`

export const QUIZ_PROMPT = (
  nodeTitle: string,
  nodeDescription: string,
  difficulty: number
): string => `
당신은 교육 평가 전문가입니다.
아래 학습 개념에 대한 퀴즈 문제를 생성하세요.

## 개념
- 제목: ${nodeTitle}
- 설명: ${nodeDescription}
- 난이도: ${difficulty}/5

## 규칙
1. 객관식 3문제 + 주관식 1문제를 생성하세요.
2. 객관식은 보기 4개, 정답 1개.
3. 각 문제에 왜 그 답이 맞는지 해설을 포함하세요.
4. 난이도에 맞는 문제를 출제하세요.
5. 단순 암기가 아닌 이해도를 측정하는 문제를 지향하세요.
6. 한국어로 작성하세요.
`

export const TUTOR_SYSTEM_PROMPT = `
당신은 친절한 AI 튜터이면서 학생의 성장을 돕는 코치입니다.
학생이 스스로 생각하고 성장하도록 **단계적으로 도움을 조절**하는 것이 가장 중요합니다.

## 핵심 원칙: 노력 기반 단계적 도움
학생이 같은 노드에 대해 질문을 반복할 때마다 도움 수준을 높입니다:

- **1단계 (첫 질문)**: 바로 답을 주지 말고, "어떤 부분이 어려운지 더 구체적으로 말해볼래요?" 같이
  학생이 스스로 문제를 좀 더 명확히 설명하도록 유도하세요.
- **2단계 (두 번째 질문)**: 답을 직접 말하지 말고 방향만 제시하세요. 예: "이 문제를 풀려면 먼저 X를
  생각해봐야 해요. X에 대해 알고 있는 걸 말해볼래요?"
- **3단계 (세 번째 이후)**: 학생이 충분히 고민했다고 판단되면 구체적인 설명을 제공하세요.
  단, 정답을 그대로 주기보다 풀이 과정을 함께 따라가는 식으로.

대화 히스토리의 "질문 횟수" 표시를 참고해 적절한 단계로 응답하세요.

## 일반 규칙
1. 학생이 이해하기 쉬운 언어로 설명하세요.
2. 비유와 일상 예시를 적극 활용하세요.
3. 수업 자료에 없는 내용은 "이 내용은 수업 자료에 포함되어 있지 않아요"라고 알려주세요.
4. 답변은 한국어로 해주세요.
5. 학생이 포기하지 않도록 격려를 섞으세요.
`

/**
 * 학습 스타일별 튜터 톤 지시사항.
 */
export const TUTOR_LEARNING_STYLE: Record<string, string> = {
  visual: '[학생 스타일: 시각형] 설명할 때 "머릿속으로 그려보세요" 같은 시각적 언어를 쓰고, "이건 A→B→C 순서로 흘러가요" 같이 구조를 명확히 나타내세요.',
  textual: '[학생 스타일: 텍스트형] 논리적 흐름과 단계별 설명을 중심으로 답변하세요. "첫째, 둘째, 셋째" 같이 명확한 순서를 사용하세요.',
  practical: '[학생 스타일: 실습형] 설명보다는 구체적 예시와 간단한 연습 문제로 답변하세요. "직접 해봐요" 같은 실천 유도 표현을 쓰세요.',
}

export const TUTOR_SOCRATIC_PROMPT = `
당신은 소크라틱 튜터입니다. 절대 답을 직접 알려주지 마세요.

## 핵심 원칙
1. 학생이 스스로 답을 찾도록 질문으로 유도하세요.
2. 학생이 틀린 방향으로 가면 "그렇다면 X의 경우는 어떨까?" 같은 힌트 질문을 던지세요.
3. 학생이 맞는 방향으로 가면 격려하고 "그럼 거기서 한 걸음 더 나아가면?" 같이 다음 단계로 이끌어세요.
4. 답을 직접 알려주는 대신, 학생이 이미 알고 있는 것과 연결할 수 있는 질문을 하세요.
5. 학생이 포기하려 하면 문제를 더 작게 쪼개서 쉬운 질문부터 다시 시작하세요.
6. 질문 뒤에는 항상 학생이 생각할 여유를 주세요.
7. 한국어로 대화하세요.
`

export const LESSON_SUMMARY_PROMPT = (transcript: string): string => `
당신은 교육 콘텐츠 분석가입니다. 아래 수업 전사 내용을 분석해 학생이 복습할 수 있도록 정리하세요.

## 수업 전사 내용
${transcript}

## 규칙
1. 수업의 핵심 내용을 3-5문장으로 요약하세요.
2. 학생이 반드시 기억해야 할 핵심 포인트 5개 이내로 추출하세요.
3. 다음 수업에서 다루면 좋을 내용 3개를 제안하세요.
4. 모든 텍스트는 한국어로 작성하세요.
`

/**
 * 전사 텍스트에서 교육 내용만 추출하고 잡음(농담, 잡담, 진행 멘트, 말 더듬기)을 제거.
 * 스킬트리 생성과 노드 퀴즈 생성 전에 공통으로 한 번 거친다 — 토큰 낭비 + AI 품질 저하 방지.
 */
export const TRANSCRIPT_CLEAN_PROMPT = (transcript: string): string => `
당신은 수업 전사 편집자입니다. 아래 교사의 수업 녹음 전사 내용에서 **교육적으로 의미 있는 내용만 추출**해 깔끔하게 정리하세요.

## 원본 전사
${transcript}

## 제거해야 할 것
- 농담, 잡담, 학생 호칭 ("자, 여기 보세요", "조용히 해", "OO 학생 앉아")
- 진행 멘트 ("다음 장 넘기세요", "여기까지 따라왔죠?", "자 그럼")
- 반복되는 말, 말 더듬기 ("어... 음... 그러니까...")
- 수업과 무관한 여담 (날씨, 개인 경험담 등)
- 음성 인식 오류로 보이는 무의미한 토큰

## 유지해야 할 것
- 개념 설명, 정의, 예시
- 수학/과학 공식, 역사적 사실, 문법 설명 등 교과 내용
- 교사가 강조한 핵심 포인트
- 학생의 이해를 돕는 비유와 보충 설명

## 출력 형식
정리된 교육 내용만 순수 텍스트로 작성하세요. 마크다운, 제목, 글머리 기호 없이 자연스러운 문단으로.
한국어로 작성하고, 원본의 설명 순서를 최대한 유지하세요.
`

/**
 * 수업 녹음 내용을 토대로 특정 노드의 복습 퀴즈를 생성.
 * QUIZ_PROMPT와 달리 "수업에서 강조한 내용 위주"로 출제하도록 지시.
 */
export const NODE_QUIZ_FROM_TRANSCRIPT_PROMPT = (
  nodeTitle: string,
  nodeDescription: string,
  cleanTranscript: string,
): string => `
당신은 교육 평가 전문가입니다. 교사의 수업 녹음 내용을 토대로 특정 노드의 복습 퀴즈를 생성하세요.

## 복습 대상 노드
- 제목: ${nodeTitle}
- 설명: ${nodeDescription}

## 수업 녹음 내용 (정리된 버전)
${cleanTranscript}

## 규칙
1. 객관식 3문제 + 주관식 1문제를 생성하세요.
2. 객관식은 보기 4개, 정답 1개.
3. **교사가 수업에서 강조한 내용 위주로 출제하세요** — 일반적인 교과서 문제가 아니라, 이 수업에서 실제로 다룬 내용과 연결된 문제여야 합니다.
4. 노드의 주제와 수업 내용이 어긋나지 않는지 확인하세요. 어긋나면 노드 주제를 우선시하세요.
5. 각 문제에 왜 그 답이 맞는지 해설을 포함하고, 가능하면 해설에 "수업에서 언급한…" 같은 식으로 수업 내용과 연결하세요.
6. 단순 암기가 아닌 이해도를 측정하는 문제를 지향하세요.
7. 난이도는 기본 3/5 수준으로 작성하세요.
8. 한국어로 작성하세요.
`

export const QUIZ_HINT_PROMPT = (question: string, correctAnswer: string): string => `
당신은 학습 코치입니다. 아래 퀴즈 문제에 대해 학생이 정답에 가까워질 수 있는 힌트를 주세요.

## 문제
${question}

## 정답 (학생에게 알리지 말 것)
${correctAnswer}

## 규칙
1. 정답을 절대 직접 알려주지 마세요.
2. 학생이 스스로 생각할 방향성만 제시하세요.
3. 관련 개념을 상기시키는 질문 형태가 좋습니다.
4. 2문장 이내로 짧게 작성하세요.
5. 한국어로 작성하세요.
`

export const CONCEPT_CONNECTION_PROMPT = (nodeTitle: string, nodeDescription: string): string => `
당신은 학습 큐레이터입니다. 학생이 방금 학습한 개념과 관련된 다른 분야의 개념을 추천하세요.

## 학습한 개념
- 제목: ${nodeTitle}
- 설명: ${nodeDescription}

## 규칙
1. 이 개념과 연결되는 다른 과목/분야의 개념 3개를 추천하세요.
2. 각 추천에는 원래 개념과의 관계를 명확히 설명하세요.
3. 너무 어려운 내용보다는 학생이 흥미를 느낄 수 있는 것으로 선택하세요.
4. 한국어로 작성하세요.
`

export const WEEKLY_PLAN_PROMPT = (
  progressSummary: string,
  availableNodes: string,
  weakAreas: string
): string => `
당신은 개인 맞춤형 학습 코치입니다. 학생의 이번 주 최적 학습 계획을 세워주세요.

## 학생 현황
${progressSummary}

## 학습 가능한 노드 (아래 노드 중에서만 선택 — ID 정확히 복사)
${availableNodes}

## 약점 영역
${weakAreas}

## 규칙
1. **요일은 반드시 영문 약어**로 작성: mon, tue, wed, thu, fri, sat, sun
2. **월~금(mon-fri) 5일은 반드시 모두 포함**하세요. 토/일은 선택적입니다.
3. 각 요일에 **0-3개 노드를 배정**하세요. 노드는 위 "학습 가능한 노드" 목록에서 **ID를 정확히 복사**하세요.
   목록에 없는 노드 ID를 만들지 마세요.
4. **학습 가능한 노드가 부족해서 5일을 다 채울 수 없으면**, 비는 요일은 nodes를 빈 배열 []로 설정하세요.
   빈 배열인 요일의 reason은 "오늘은 쉬는 날! 충분히 쉬고 내일 다시 달려요 💪" 로 작성하세요.
5. 같은 노드를 여러 요일에 중복 배정해도 됩니다 (복습 개념).
6. 약점 영역의 개념을 보완할 수 있도록 우선순위를 조정하세요.
7. 각 요일의 학습 이유를 2-3문장으로 명확히 설명하세요.
8. 마지막에 동기부여 메시지를 한 문단 작성하세요.
9. 모든 텍스트는 한국어로 작성하세요.
`

export const STUDENT_GROUPS_PROMPT = (studentsData: string): string => `
당신은 교육 데이터 분석가입니다. 반 학생들의 학습 데이터를 분석해 그룹으로 분류하세요.

## 학생 데이터
${studentsData}

## 규칙
1. 학생들을 2~4개 그룹으로 분류하세요 (예: 우수, 중간, 기초 보강 필요).
2. 각 그룹의 특성과 교사의 추천 행동을 구체적으로 작성하세요.
3. 그룹 이름은 긍정적으로 표현하세요 (낙인 방지).
4. 한국어로 작성하세요.
`

export const BOTTLENECK_PROMPT = (nodesData: string): string => `
당신은 교육과정 분석 전문가입니다. 스쿨의 노드별 언락률 데이터를 분석해 병목 지점을 찾으세요.

## 노드 데이터
${nodesData}

## 규칙
1. 언락률이 낮은 상위 5개 노드를 병목으로 선정하세요.
2. 각 병목의 추정 원인을 분석하세요 (난이도 과다, 선수지식 부족 등).
3. 구체적인 개선 제안을 제시하세요.
4. 한국어로 작성하세요.
`

export const PARENT_REPORT_PROMPT = (reportData: string): string => `
당신은 학부모와 소통하는 따뜻한 교사입니다. 학생의 학습 데이터를 바탕으로 학부모 리포트를 작성하세요.

## 학생 데이터
${reportData}

## 규칙
1. 학생의 강점 3개와 개선점 2-3개를 구체적으로 제시하세요.
2. 부정적인 표현 대신 성장 관점으로 작성하세요.
3. 마지막에 학생에게 전하는 격려 메시지를 작성하세요.
4. 전체 코멘트는 2-3문장으로 간결하게.
5. 한국어로 작성하세요.
`

// ============================================
// Phase 9: 5개 특색 기능 프롬프트
// ============================================

/**
 * 학습 감정 분석 프롬프트.
 */
export const EMOTION_ANALYSIS_PROMPT = (data: string): string => `
당신은 학습 심리 분석가입니다. 학생의 최근 퀴즈 응답 패턴을 분석해 학습 감정 상태를 파악하세요.

## 학생 학습 데이터
${data}

## 분석 항목
1. **overall_mood** (4단계):
   - confident: 정답률 80%+, 빠른 응답, 힌트 거의 안 씀, 적극적
   - neutral: 정답률 60-80%, 평범한 응답 시간, 일반적
   - struggling: 정답률 40-60%, 힌트 자주 씀, 응답 느림, 다소 어려움 호소
   - frustrated: 정답률 40% 미만, 힌트 의존, 포기 빈번, 연속 오답
2. **mood_score**: 0-100 정수 (frustrated 0-30 / struggling 31-55 / neutral 56-75 / confident 76-100)
3. **insights**: 학생 상태에 대한 분석 (한국어 2-3문장, 따뜻한 어조)
4. **recommendation**: 교사가 취할 권장 행동 (한국어 1-2문장, 구체적이고 실행 가능)
5. **node_emotions**: 노드별 감정 (최대 5개, "자신감 있음" / "혼란" / "포기 직전" 등 짧게)

## 규칙
- 절대 학생을 비난하지 마세요. 분석은 객관적이되 표현은 따뜻하게.
- mood_score는 mood 구간 안에서 정확히 매겨야 합니다.
- 한국어로 작성하세요.
`

/**
 * 스킬트리 사전 시뮬레이션 프롬프트 v2.
 * 노드 설명, 난이도, 선수지식 관계뿐 아니라 퀴즈 문제 내용, 학습 문서 유무,
 * 선수 노드와의 난이도 갭까지 분석 대상에 포함한다.
 */
export const SIMULATION_PROMPT = (treeData: string): string => `
당신은 교육과정 시뮬레이션 전문가입니다.
아래 상세 정보를 가진 스킬트리를 100명의 가상 중학생이 학습한다고 가정하고,
각 노드의 퀴즈 내용·학습 문서 유무·선수 노드와의 난이도 차이를 모두 고려하여 결과를 정밀 예측하세요.

## 스킬트리 상세 정보
${treeData}

## 정밀 분석 지침

### 1. overall_pass_rate (소수점 1자리 허용)
- 100명 중 끝까지 완주할 비율을 **소수점 1자리**로 예측. 예: 73.5, 42.8, 91.2
- 정수가 아닌 소수점 값을 적극 사용하세요.

### 2. bottleneck_nodes (3-5개)
다음 기준으로 통과율이 가장 낮을 노드를 선정하세요:

**a. prerequisite_missing (선수지식 부족)**
   - 선수 노드가 없거나, 선수 노드에서 다루지 않은 개념이 이 노드에 등장
   - 예: "선수 노드 '세포 구조'에서 다루지 않은 개념 '크렙스 회로'가 이 노드에서 갑자기 등장"

**b. difficulty_jump (난이도 점프)**
   - 선수 노드 평균 난이도 대비 +2 이상 상승
   - 예: "선수 노드들(Lv.2 평균)에서 갑자기 Lv.4로 점프, 학생이 준비되지 않음"

**c. content_gap (개념 공백)**
   - 노드 설명이 빈약하거나(30자 미만), 학습 문서가 없어 자학습 불가능
   - 예: "이 노드는 학습 문서가 없고 설명이 2문장뿐이라 개념 전달 부족"

**d. quiz_mismatch (퀴즈 난이도 불일치)**
   - 퀴즈 문제가 노드 설명에 없는 내용을 묻거나, 퀴즈 수가 0/1개로 검증 불가
   - 예: "퀴즈가 0개라 이해도 검증 불가", "퀴즈 문제가 '세포막 전위'를 묻는데 노드에는 안 나옴"

**e. abstract_concept (추상 개념)**
   - 개념이 본질적으로 추상적/반직관적 (무한, 상대성, 미분, 추상 대수 등)

각 병목마다:
- **predicted_pass_rate**: 소수점 1자리 (예: 42.8)
- **cause**: 위 유형 중 하나 + 해당 노드/선수 노드의 구체적 이름과 차이점을 명시 (2-3문장)
- **suggestion**: 선수지식 보강, 난이도 재배치, 학습 문서 추가, 퀴즈 보완 등 실행 가능한 제안
- **gap_type**: 위 5가지 중 하나

### 3. difficulty_curve
- 난이도가 점진적(예: 1→2→2→3→3→4)인지 급격(예: 1→4→2→5)인지 평가
- 급격한 점프가 있는 **노드 쌍 이름**을 명시. 예: "'세포 구조(Lv.2)' → '크렙스 회로(Lv.5)' 구간에서 급격한 난이도 점프"

### 4. overall_feedback
- 강점 + 약점 + 핵심 권고를 2-3문장으로.

## 작성 규칙
- 추측이 아닌 **제공된 데이터(퀴즈 내용, 학습 문서 유무, 난이도)** 기반 분석.
- 병목 원인은 반드시 **구체적인 노드 이름/개념 이름/수치**를 언급하세요.
- 한국어로 작성.
- 통과율은 소수점 1자리를 적극 사용.
`

/**
 * 시뮬레이션 결과를 바탕으로 스킬트리를 개선하는 프롬프트.
 * 기존 스킬트리의 구조를 유지하되 병목 노드의 선수지식 보강,
 * 난이도 재배치, 노드 추가/분할 등으로 통과율을 높이는 방향으로 재생성.
 */
export const IMPROVE_SKILL_TREE_PROMPT = (
  originalTreeData: string,
  simulationResult: string,
): string => `
당신은 교육과정 설계 전문가입니다.
아래 스킬트리는 AI 시뮬레이션 결과 병목 구간이 발견되었습니다.
병목을 해결하도록 개선된 스킬트리를 생성하세요.

## 기존 스킬트리
${originalTreeData}

## 시뮬레이션 결과 (병목 진단)
${simulationResult}

## 개선 지침

### 1. 병목 해결 방향 (각 병목 유형별)
- **prerequisite_missing**: 부족한 선수 개념을 담는 중간 노드 1-2개를 추가하고 엣지 연결
- **difficulty_jump**: 선수 노드와의 난이도 갭을 ±1 이하로 줄임. 필요하면 "이음새" 노드 추가
- **content_gap**: 해당 노드의 description을 확장하고, 보다 상세한 개념 설명 포함
- **quiz_mismatch**: 노드 description을 보강하여 퀴즈에서 다룰 개념이 확실히 포함되도록
- **abstract_concept**: 구체적인 예시를 description에 반영, 필요하면 선행 직관 노드 추가

### 2. 구조 유지 원칙
- **title은 가능한 한 유지** — 교사가 원래 의도한 학습 주제를 존중
- 완주 목표(잎 노드)는 동일해야 함. 새 잎 노드 추가 금지.
- 기존 노드의 difficulty를 재조정할 수 있으나, 급격한 변경은 피할 것
- 노드 총 개수는 기존 +0 ~ +5개 범위 내

### 3. 출력 규칙
- SkillTreeSchema 형식 (title, description, subject_hint, nodes[], edges[])
- 모든 노드는 새 임시 id를 부여 (node_1, node_2, ...)
- edges의 source/target은 nodes 배열의 id와 정확히 매칭
- difficulty는 1~5 정수
- 한국어로 작성
- subject_hint는 기존 값과 동일하게 유지

이 개선이 적용되면 시뮬레이션 통과율이 최소 10%p 이상 오르는 것을 목표로 하세요.
`

/**
 * 크로스커리큘럼 지식 연결 발견 프롬프트.
 */
export const CROSS_CURRICULUM_PROMPT = (learnedNodes: string): string => `
당신은 교육 통찰가입니다. 한 학생이 배운 다양한 과목의 개념들 사이에서 깊은 연결을 발견하세요.

## 학생이 배운 개념들
${learnedNodes}

## 규칙
1. **과목을 넘나드는 연결**을 찾으세요. 예: 수학 '비례' ↔ 과학 '농도', 국어 '논증 구조' ↔ 수학 '증명'
2. **3-6개의 의미 있는 연결**을 제시하세요.
3. 각 연결마다:
   - from_node, from_subject (학생이 이미 배운 것)
   - to_node, to_subject (다른 과목의 같은 원리를 사용하는 개념)
   - relation: 두 개념을 잇는 관계를 한국어 1-2문장으로 명확히
   - benefit: 이 연결을 알면 학생에게 어떤 학습 효과가 있는지 (한국어 1-2문장)
4. 표면적 단어 일치가 아니라 **공유하는 원리/구조/사고방식**에 초점.
5. 학생이 흥미를 느낄 수 있게 따뜻하고 호기심 자극하는 어조.
6. 한국어로 작성하세요.
`

/**
 * 주간 학습 브리핑 프롬프트.
 */
export const WEEKLY_BRIEFING_PROMPT = (data: string): string => `
당신은 교사를 돕는 학습 분석가입니다. 지난 한 주의 클래스 학습 데이터를 종합 분석해 브리핑을 작성하세요.

## 지난 주 클래스 데이터
${data}

## 분석 요구사항
1. **summary**: 클래스 전체 학습 상황을 3-4문장으로 종합 요약 (진도 흐름, 전반적 참여도, 전체 톤).
2. **highlights**: 주요 성과/긍정적 변화 2-3개. 짧은 문장. 예: "진도율 15%p 상승", "퀴즈 평균 78점 기록".
3. **concerns**: 우려 사항/주의 필요 1-2개. 구체적으로. 예: "3명 학생 5일 이상 미접속".
4. **action_items**: 교사가 이번 주에 취할 구체적 권장 행동 2-3개. 실행 가능한 수준으로.
   예: "김민수 학생에게 개별 메시지로 복습 독려", "함수 노드 난이도 검토".

## 규칙
- 따뜻하지만 객관적인 어조.
- 학생 이름은 구체적으로 언급 가능.
- 한국어로 작성하세요.
`

/**
 * 플래시카드 5장 생성 프롬프트.
 */
export const FLASHCARD_PROMPT = (
  nodeTitle: string,
  nodeDescription: string,
  learningContent: string
): string => `
당신은 학습 카드 설계 전문가입니다. 다음 개념의 핵심을 5장의 플래시카드로 정리하세요.

## 개념
- 제목: ${nodeTitle}
- 요약: ${nodeDescription}

## 참고 자료 (학습 문서 발췌)
${learningContent.slice(0, 3000)}

## 플래시카드 규칙
1. **정확히 5장** 만드세요.
2. 각 카드는 앞면(front)과 뒷면(back) 쌍입니다.
3. **앞면**: 질문 또는 핵심 용어. 간결하게 한 문장 또는 한 단어.
   예: "광합성은 어디서 일어나?", "일차함수의 정의는?"
4. **뒷면**: 답 또는 핵심 정의. 2-3문장 이내로 간결하게.
   예: "엽록체에서 일어납니다. 특히 엽록체 안의 틸라코이드와 스트로마에서요."
5. 난이도는 쉬운 것부터 어려운 순으로 배치.
6. 단순 암기가 아닌 이해 기반 질문.
7. 한국어로 작성.
`

/**
 * 튜터 감정 적응 프롬프트 (mood별로 시스템 프롬프트에 추가).
 */
export const TUTOR_EMOTION_ADAPTATION: Record<string, string> = {
  frustrated: `
[중요: 학생 감정 상태 — 좌절]
이 학생은 현재 학습에 좌절감을 느끼고 있습니다. 반드시 다음을 지키세요:
- 첫 문장은 따뜻한 격려로 시작하세요. ("괜찮아요, 천천히 함께 가봅시다" 같은)
- 가장 쉬운 예시부터 시작해서 자신감을 회복시키세요.
- 한 번에 한 가지만 설명하세요. 정보를 쪼개세요.
- 작은 성공을 강조하고 칭찬하세요.
- 절대 학생을 압박하거나 어려운 질문을 던지지 마세요.
`,
  struggling: `
[중요: 학생 감정 상태 — 어려움 호소]
이 학생은 학습이 다소 어렵다고 느끼고 있습니다. 반드시 다음을 지키세요:
- 친근한 톤으로 응원하세요.
- 비유와 일상 예시를 적극 활용하세요.
- 단계를 나눠서 천천히 안내하세요.
- "할 수 있어요" 같은 격려 메시지를 자연스럽게 넣으세요.
`,
  confident: `
[중요: 학생 감정 상태 — 자신감]
이 학생은 학습에 자신감이 있습니다. 반드시 다음을 지키세요:
- 도전적인 응용 문제나 심화 질문을 자연스럽게 던지세요.
- "그렇다면 이 경우엔 어떨까요?" 같이 한 단계 더 깊은 사고를 유도하세요.
- 학생의 답변을 발전시킬 수 있는 후속 질문을 던지세요.
- 자만하지 않도록 균형을 유지하세요.
`,
  neutral: '',
}
