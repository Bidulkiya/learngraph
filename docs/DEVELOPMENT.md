# NodeBloom 개발 뼈대 문서

> 이 문서는 개발 중 참고할 코드 패턴, 구현 가이드, 핵심 로직 설계를 담고 있습니다.

---

## 1. 프로젝트 초기 세팅

### 1.1 프로젝트 생성
```bash
npx create-next-app@latest nodebloom --typescript --tailwind --eslint --app --src-dir
cd nodebloom

# 핵심 의존성
npm install ai @ai-sdk/anthropic @ai-sdk/openai zod
npm install openai                              # 임베딩용 네이티브 SDK
npm install @supabase/supabase-js @supabase/ssr
npm install d3 @types/d3 recharts
npm install lucide-react class-variance-authority clsx tailwind-merge

# shadcn/ui 초기화
npx shadcn@latest init
npx shadcn@latest add button card input label dialog tabs badge progress toast sheet select separator avatar dropdown-menu
```

### 1.2 환경 변수 (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
ELEVENLABS_API_KEY=xi-xxxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 1.3 .env.example (커밋용)
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
ELEVENLABS_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 2. Supabase 클라이언트 설정

### 2.1 서버 클라이언트 (src/lib/supabase/server.ts)
```typescript
import { createServerClient as createClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerClient() {
  const cookieStore = await cookies()

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch { /* Server Component에서는 무시 */ }
        },
      },
    }
  )
}
```

### 2.2 브라우저 클라이언트 (src/lib/supabase/client.ts)
```typescript
import { createBrowserClient as createClient } from '@supabase/ssr'

export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### 2.3 미들웨어 (middleware.ts)
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 비로그인 사용자 → 로그인 페이지로
  if (!user && !request.nextUrl.pathname.startsWith('/login') 
      && !request.nextUrl.pathname.startsWith('/signup')
      && request.nextUrl.pathname !== '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 역할 기반 라우팅
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role
    const path = request.nextUrl.pathname

    if (path.startsWith('/teacher') && role !== 'teacher') {
      return NextResponse.redirect(new URL(`/${role}`, request.url))
    }
    if (path.startsWith('/student') && role !== 'student') {
      return NextResponse.redirect(new URL(`/${role}`, request.url))
    }
    if (path.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL(`/${role}`, request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sounds|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

---

## 3. DB 스키마

### 3.1 전체 스키마 (supabase/migrations/001_initial.sql)
```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- ========================================
-- 사용자 프로필
-- ========================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student', 'admin')),
  avatar_url TEXT,
  level INT DEFAULT 1,
  xp INT DEFAULT 0,
  streak_days INT DEFAULT 0,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 과목 / 반
-- ========================================
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE class_students (
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (class_id, student_id)
);

-- ========================================
-- 스킬트리
-- ========================================
CREATE TABLE skill_trees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  subject_id UUID REFERENCES subjects(id),
  class_id UUID REFERENCES classes(id),
  created_by UUID REFERENCES profiles(id),
  is_template BOOLEAN DEFAULT FALSE,  -- 운영자 마스터 템플릿 여부
  source_file_url TEXT,               -- 원본 업로드 파일 URL
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 노드 (개별 학습 개념)
-- ========================================
CREATE TABLE nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_tree_id UUID REFERENCES skill_trees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  difficulty INT DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  order_index INT DEFAULT 0,
  -- D3 시각화용 좌표 (교사 편집 시 저장)
  position_x FLOAT,
  position_y FLOAT,
  -- 메타
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 노드 간 연결 (선수 지식 관계)
-- ========================================
CREATE TABLE node_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_tree_id UUID REFERENCES skill_trees(id) ON DELETE CASCADE,
  source_node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  target_node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  label TEXT,  -- 관계 설명 (선택)
  UNIQUE(source_node_id, target_node_id)
);

-- ========================================
-- 퀴즈
-- ========================================
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'short_answer', 'essay')),
  options JSONB,           -- 객관식: ["A", "B", "C", "D"]
  correct_answer TEXT,     -- 정답
  explanation TEXT,         -- 해설
  difficulty INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 학생 진도
-- ========================================
CREATE TABLE student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  skill_tree_id UUID REFERENCES skill_trees(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'locked' CHECK (status IN ('locked', 'available', 'in_progress', 'completed')),
  quiz_score FLOAT,        -- 최고 점수 (0~100)
  attempts INT DEFAULT 0,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, node_id)
);

-- ========================================
-- 퀴즈 시도 기록
-- ========================================
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  answer TEXT,
  is_correct BOOLEAN,
  score FLOAT,
  feedback TEXT,           -- AI 피드백
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- AI 튜터 대화 기록
-- ========================================
CREATE TABLE tutor_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  skill_tree_id UUID REFERENCES skill_trees(id),
  node_id UUID REFERENCES nodes(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 수업 자료 벡터 임베딩 (RAG)
-- ========================================
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_tree_id UUID REFERENCES skill_trees(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1536),  -- text-embedding-3-small
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 벡터 검색 함수
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  p_skill_tree_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
    AND (p_skill_tree_id IS NULL OR dc.skill_tree_id = p_skill_tree_id)
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ========================================
-- RLS 정책
-- ========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- 프로필: 본인 읽기/수정
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 스킬트리: 교사는 자기 것 CRUD, 학생은 자기 반 것 읽기
CREATE POLICY "Teachers manage own skill trees" ON skill_trees 
  FOR ALL USING (auth.uid() = created_by);
CREATE POLICY "Students view class skill trees" ON skill_trees 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_students cs
      WHERE cs.class_id = skill_trees.class_id
      AND cs.student_id = auth.uid()
    )
  );
-- 운영자는 전체 접근
CREATE POLICY "Admins access all skill trees" ON skill_trees 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 학생 진도: 본인 것만
CREATE POLICY "Students manage own progress" ON student_progress 
  FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Teachers view class progress" ON student_progress 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM skill_trees st
      WHERE st.id = student_progress.skill_tree_id
      AND st.created_by = auth.uid()
    )
  );

-- 인덱스
CREATE INDEX idx_nodes_skill_tree ON nodes(skill_tree_id);
CREATE INDEX idx_edges_skill_tree ON node_edges(skill_tree_id);
CREATE INDEX idx_quizzes_node ON quizzes(node_id);
CREATE INDEX idx_progress_student ON student_progress(student_id);
CREATE INDEX idx_progress_tree ON student_progress(skill_tree_id);
CREATE INDEX idx_chunks_embedding ON document_chunks USING hnsw (embedding vector_cosine_ops);
```

---

## 4. AI 핵심 로직

### 4.1 Zod 스키마 (src/lib/ai/schemas.ts)
```typescript
import { z } from 'zod'

// 스킬트리 노드 스키마 (AI 출력 구조)
export const skillTreeNodeSchema = z.object({
  id: z.string().describe('고유 ID (예: node_1, node_2)'),
  title: z.string().describe('개념 이름 (짧고 명확하게)'),
  description: z.string().describe('개념 설명 (2-3문장)'),
  difficulty: z.number().min(1).max(5).describe('난이도 1-5'),
})

export const skillTreeEdgeSchema = z.object({
  source: z.string().describe('선수 지식 노드 ID'),
  target: z.string().describe('후속 개념 노드 ID'),
  label: z.string().optional().describe('관계 설명'),
})

export const skillTreeSchema = z.object({
  title: z.string().describe('스킬트리 제목'),
  description: z.string().describe('스킬트리 설명'),
  nodes: z.array(skillTreeNodeSchema).describe('개념 노드 목록'),
  edges: z.array(skillTreeEdgeSchema).describe('노드 간 연결 (선수지식 관계)'),
})

export type SkillTreeOutput = z.infer<typeof skillTreeSchema>
export type SkillTreeNode = z.infer<typeof skillTreeNodeSchema>
export type SkillTreeEdge = z.infer<typeof skillTreeEdgeSchema>

// 퀴즈 스키마
export const quizSchema = z.object({
  questions: z.array(z.object({
    question: z.string(),
    type: z.enum(['multiple_choice', 'short_answer']),
    options: z.array(z.string()).optional(),
    correct_answer: z.string(),
    explanation: z.string(),
    difficulty: z.number().min(1).max(5),
  }))
})

export type QuizOutput = z.infer<typeof quizSchema>
```

### 4.2 프롬프트 (src/lib/ai/prompts.ts)
```typescript
export const SKILL_TREE_PROMPT = (content: string) => `
당신은 교육 전문가이자 커리큘럼 설계자입니다.
아래 수업 자료를 분석하여, 학생이 학습해야 할 개념들을 스킬트리 구조로 추출하세요.

## 규칙
1. 각 노드는 하나의 명확한 학습 개념을 나타냅니다.
2. 선수 지식 관계(edges)를 정확히 파악하세요 — "A를 모르면 B를 이해할 수 없다"
3. 난이도는 1(기초)~5(심화)로 설정하세요.
4. 노드는 최소 5개, 최대 20개로 제한하세요.
5. 기초 개념부터 심화 개념 순으로 자연스럽게 연결되어야 합니다.
6. 노드 ID는 node_1, node_2, ... 형식으로 지정하세요.

## 수업 자료 내용
${content}
`

export const QUIZ_PROMPT = (nodeTitle: string, nodeDescription: string, difficulty: number) => `
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
`

export const TUTOR_SYSTEM_PROMPT = `
당신은 친절한 AI 튜터입니다. 학생의 질문에 수업 자료를 기반으로 정확하게 답변하세요.

## 규칙
1. 학생이 이해하기 쉬운 언어로 설명하세요.
2. 비유와 예시를 적극 활용하세요.
3. 학생이 스스로 생각할 수 있도록 힌트를 주세요 (바로 정답을 주지 마세요).
4. 수업 자료에 없는 내용은 "이 내용은 수업 자료에 포함되어 있지 않아요"라고 알려주세요.
5. 답변은 한국어로 해주세요.
`
```

### 4.3 스킬트리 생성 Server Action (src/actions/skill-tree.ts)
```typescript
'use server'

import { streamObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createServerClient } from '@/lib/supabase/server'
import { skillTreeSchema } from '@/lib/ai/schemas'
import { SKILL_TREE_PROMPT } from '@/lib/ai/prompts'

export async function generateSkillTree(fileContent: string, classId: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('인증이 필요합니다')

  const result = streamObject({
    model: anthropic('claude-sonnet-4-6-20250514'),
    schema: skillTreeSchema,
    prompt: SKILL_TREE_PROMPT(fileContent),
  })

  return result
}

export async function saveSkillTree(
  treeData: { title: string; description: string },
  nodes: Array<{ id: string; title: string; description: string; difficulty: number; position_x?: number; position_y?: number }>,
  edges: Array<{ source: string; target: string; label?: string }>,
  classId: string
) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('인증이 필요합니다')

  // 1. 스킬트리 레코드 생성
  const { data: tree, error: treeError } = await supabase
    .from('skill_trees')
    .insert({
      title: treeData.title,
      description: treeData.description,
      class_id: classId,
      created_by: user.id,
      status: 'published',
    })
    .select()
    .single()

  if (treeError) throw treeError

  // 2. 노드 일괄 삽입 (N+1 방지)
  const nodeInserts = nodes.map((node, index) => ({
    skill_tree_id: tree.id,
    title: node.title,
    description: node.description,
    difficulty: node.difficulty,
    position_x: node.position_x,
    position_y: node.position_y,
    order_index: index,
  }))

  const { data: dbNodes, error: nodesError } = await supabase
    .from('nodes')
    .insert(nodeInserts)
    .select()

  if (nodesError) throw nodesError

  // 임시ID → DB UUID 매핑
  const nodeMap = new Map<string, string>()
  nodes.forEach((node, index) => {
    nodeMap.set(node.id, dbNodes[index].id)
  })

  // 3. 엣지 일괄 삽입
  const edgeInserts = edges.map(edge => ({
    skill_tree_id: tree.id,
    source_node_id: nodeMap.get(edge.source),
    target_node_id: nodeMap.get(edge.target),
    label: edge.label,
  }))

  if (edgeInserts.length > 0) {
    const { error: edgesError } = await supabase
      .from('node_edges')
      .insert(edgeInserts)
    if (edgesError) throw edgesError
  }

  // 4. 학생 진도 초기화 (루트 노드는 available, 나머지는 locked)
  const rootNodeIds = nodes
    .filter(n => !edges.some(e => e.target === n.id))
    .map(n => nodeMap.get(n.id)!)

  const { data: students } = await supabase
    .from('class_students')
    .select('student_id')
    .eq('class_id', classId)

  if (students) {
    for (const student of students) {
      for (const [tempId, dbId] of nodeMap) {
        await supabase.from('student_progress').insert({
          student_id: student.student_id,
          node_id: dbId,
          skill_tree_id: tree.id,
          status: rootNodeIds.includes(dbId) ? 'available' : 'locked',
        })
      }
    }
  }

  return tree
}
```

### 4.4 AI 튜터 Server Action (src/actions/tutor.ts)
```typescript
'use server'

import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import OpenAI from 'openai'
import { createServerClient } from '@/lib/supabase/server'
import { TUTOR_SYSTEM_PROMPT } from '@/lib/ai/prompts'

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function chatWithTutor(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  skillTreeId: string,
  nodeId?: string
) {
  const supabase = await createServerClient()

  // RAG: 관련 문서 검색
  const lastMessage = messages[messages.length - 1].content

  // 임베딩 생성 (OpenAI 네이티브 SDK 사용 — Vercel AI SDK는 임베딩 미지원)
  const embeddingResponse = await openaiClient.embeddings.create({
    model: 'text-embedding-3-small',
    input: lastMessage,
  })
  const queryEmbedding = embeddingResponse.data[0].embedding

  // 유사 문서 검색
  const { data: docs } = await supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: 3,
    p_skill_tree_id: skillTreeId,
  })

  const context = docs?.map((d: any) => d.content).join('\n\n') || ''

  const result = streamText({
    model: anthropic('claude-sonnet-4-6-20250514'),
    system: `${TUTOR_SYSTEM_PROMPT}\n\n## 참고 수업 자료\n${context}`,
    messages,
  })

  return result
}
```

### 4.5 퀴즈 생성 + 채점 (src/actions/quiz.ts)
```typescript
'use server'

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createServerClient } from '@/lib/supabase/server'
import { quizSchema } from '@/lib/ai/schemas'
import { QUIZ_PROMPT } from '@/lib/ai/prompts'

export async function generateQuizForNode(nodeId: string) {
  const supabase = await createServerClient()

  const { data: node } = await supabase
    .from('nodes')
    .select('title, description, difficulty')
    .eq('id', nodeId)
    .single()

  if (!node) throw new Error('노드를 찾을 수 없습니다')

  const { object: quiz } = await generateObject({
    model: anthropic('claude-sonnet-4-6-20250514'),
    schema: quizSchema,
    prompt: QUIZ_PROMPT(node.title, node.description, node.difficulty),
  })

  // DB에 저장
  for (const q of quiz.questions) {
    await supabase.from('quizzes').insert({
      node_id: nodeId,
      question: q.question,
      question_type: q.type,
      options: q.options || null,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      difficulty: q.difficulty,
    })
  }

  return quiz
}

export async function submitQuizAnswer(
  quizId: string,
  nodeId: string,
  answer: string
) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('인증이 필요합니다')

  // 정답 확인
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('correct_answer, explanation')
    .eq('id', quizId)
    .single()

  if (!quiz) throw new Error('퀴즈를 찾을 수 없습니다')

  const isCorrect = answer.trim().toLowerCase() === quiz.correct_answer.trim().toLowerCase()

  // 시도 기록
  await supabase.from('quiz_attempts').insert({
    student_id: user.id,
    quiz_id: quizId,
    node_id: nodeId,
    answer,
    is_correct: isCorrect,
    score: isCorrect ? 100 : 0,
    feedback: quiz.explanation,
  })

  // 노드 진도 업데이트
  if (isCorrect) {
    await supabase
      .from('student_progress')
      .update({ status: 'completed', quiz_score: 100, completed_at: new Date().toISOString() })
      .eq('student_id', user.id)
      .eq('node_id', nodeId)

    // 후속 노드 언락
    const { data: nextEdges } = await supabase
      .from('node_edges')
      .select('target_node_id')
      .eq('source_node_id', nodeId)

    if (nextEdges) {
      for (const edge of nextEdges) {
        // 모든 선수 노드가 completed인지 확인
        const { data: prereqEdges } = await supabase
          .from('node_edges')
          .select('source_node_id')
          .eq('target_node_id', edge.target_node_id)

        if (prereqEdges) {
          const allCompleted = await Promise.all(
            prereqEdges.map(async (pe) => {
              const { data } = await supabase
                .from('student_progress')
                .select('status')
                .eq('student_id', user.id)
                .eq('node_id', pe.source_node_id)
                .single()
              return data?.status === 'completed'
            })
          )

          if (allCompleted.every(Boolean)) {
            await supabase
              .from('student_progress')
              .update({ status: 'available' })
              .eq('student_id', user.id)
              .eq('node_id', edge.target_node_id)
          }
        }
      }
    }
  }

  return {
    isCorrect,
    explanation: quiz.explanation,
    score: isCorrect ? 100 : 0,
  }
}
```

### 4.6 RAG 임베딩 (src/lib/ai/embeddings.ts)
```typescript
import OpenAI from 'openai'
import { createServerClient } from '@/lib/supabase/server'

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function embedAndStoreDocument(
  content: string,
  skillTreeId: string,
  chunkSize: number = 500
) {
  const supabase = await createServerClient()

  // 텍스트를 청크로 분할
  const chunks = splitIntoChunks(content, chunkSize)

  for (const chunk of chunks) {
    // 임베딩 생성
    const response = await openaiClient.embeddings.create({
      model: 'text-embedding-3-small',
      input: chunk,
    })

    const embedding = response.data[0].embedding

    // Supabase에 저장
    await supabase.from('document_chunks').insert({
      skill_tree_id: skillTreeId,
      content: chunk,
      embedding,
    })
  }
}

function splitIntoChunks(text: string, maxChars: number): string[] {
  const sentences = text.split(/[.!?\n]+/).filter(s => s.trim())
  const chunks: string[] = []
  let current = ''

  for (const sentence of sentences) {
    if ((current + sentence).length > maxChars && current) {
      chunks.push(current.trim())
      current = sentence
    } else {
      current += (current ? '. ' : '') + sentence
    }
  }

  if (current.trim()) chunks.push(current.trim())
  return chunks
}
```

---

## 5. D3.js 스킬트리 시각화 핵심

### 5.1 레이아웃 로직 (src/lib/d3/skill-tree-layout.ts)
```typescript
import * as d3 from 'd3'

export interface D3Node {
  id: string
  title: string
  difficulty: number
  status: 'locked' | 'available' | 'in_progress' | 'completed'
  x?: number
  y?: number
  fx?: number | null  // 고정 위치 (교사 편집용)
  fy?: number | null
}

export interface D3Edge {
  source: string
  target: string
}

export function createSkillTreeSimulation(
  nodes: D3Node[],
  edges: D3Edge[],
  width: number,
  height: number
) {
  const simulation = d3.forceSimulation(nodes as any)
    .force('link', d3.forceLink(edges).id((d: any) => d.id).distance(120))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(50))
    .force('y', d3.forceY().strength(0.1))  // 위에서 아래로 흐르도록

  return simulation
}

export function getNodeColor(status: string): string {
  switch (status) {
    case 'completed': return '#10B981'   // 초록 (언락됨)
    case 'available': return '#F59E0B'   // 노랑 (도전 가능)
    case 'in_progress': return '#4F6BF6' // 파랑 (진행 중)
    case 'locked': return '#94A3B8'      // 회색 (잠김)
    default: return '#94A3B8'
  }
}

export function getNodeGlow(status: string): string {
  switch (status) {
    case 'completed': return '0 0 15px rgba(16, 185, 129, 0.5)'
    case 'available': return '0 0 15px rgba(245, 158, 11, 0.5)'
    default: return 'none'
  }
}
```

---

## 6. 타입 정의

### 6.1 핵심 타입 (src/types/skill-tree.ts)
```typescript
export interface SkillTree {
  id: string
  title: string
  description: string
  subject_id: string | null
  class_id: string | null
  created_by: string
  is_template: boolean
  status: 'draft' | 'published' | 'archived'
  created_at: string
  updated_at: string
  nodes?: Node[]
  edges?: NodeEdge[]
}

export interface Node {
  id: string
  skill_tree_id: string
  title: string
  description: string
  difficulty: number
  order_index: number
  position_x: number | null
  position_y: number | null
}

export interface NodeEdge {
  id: string
  skill_tree_id: string
  source_node_id: string
  target_node_id: string
  label: string | null
}

export interface StudentProgress {
  id: string
  student_id: string
  node_id: string
  skill_tree_id: string
  status: 'locked' | 'available' | 'in_progress' | 'completed'
  quiz_score: number | null
  attempts: number
  completed_at: string | null
}
```

---

## 7. 체크리스트

### Day 1 체크리스트
- [ ] Next.js 프로젝트 생성 + 의존성 설치
- [ ] Supabase 프로젝트 생성 + DB 마이그레이션 실행
- [ ] 환경 변수 설정
- [ ] GitHub 레포 생성 + Vercel 연결
- [ ] Supabase 클라이언트 설정 (server/client/middleware)
- [ ] shadcn/ui 초기화 + 기본 컴포넌트 추가
- [ ] 기본 레이아웃 (Sidebar + Header) 생성
- [ ] CLAUDE.md + 개발 문서 프로젝트에 포함
- [ ] 기획서 PDF docs/planning/ 에 포함

### Day 2 체크리스트
- [ ] Supabase Auth 회원가입/로그인 구현
- [ ] profiles 테이블 + 역할(teacher/student/admin) 설정
- [ ] 미들웨어 역할 기반 라우팅
- [ ] 파일 업로드 (Supabase Storage)
- [ ] PDF 텍스트 추출 로직
- [ ] Claude 스킬트리 생성 Server Action
- [ ] Zod 스키마 + streamObject 연동 테스트

### Day 3 체크리스트
- [ ] D3.js 스킬트리 컴포넌트 (SkillTreeGraph.tsx)
- [ ] 노드 상태별 색상/글로우 효과
- [ ] 교사 편집 모드 (드래그 이동, 노드 추가/삭제)
- [ ] 언락 애니메이션
- [ ] 스킬트리 저장 (saveSkillTree)

### Day 4 체크리스트
- [ ] 퀴즈 자동 생성 (generateQuizForNode)
- [ ] 퀴즈 UI (객관식/주관식)
- [ ] 정답 채점 + 노드 언락 로직 (submitQuizAnswer)
- [ ] 학생 진도 DB 저장
- [ ] 후속 노드 자동 언락

### Day 5 체크리스트
- [ ] 수업자료 벡터화 (embedAndStoreDocument)
- [ ] RAG 기반 AI 튜터 (chatWithTutor)
- [ ] 채팅 UI (ChatInterface.tsx)
- [ ] ElevenLabs 음성 연동 (가능하면)

### Day 6 체크리스트
- [ ] 교사 대시보드 (히트맵, 학생 목록)
- [ ] 운영자 대시보드 (전체 통계)
- [ ] 학생 레벨/XP 시스템
- [ ] Recharts 차트 컴포넌트

### Day 7 체크리스트
- [ ] UI/UX 전체 폴리싱
- [ ] 에러 핸들링 + 로딩 상태
- [ ] 데모 데이터 seed
- [ ] README.md 작성
- [ ] 최종 배포 + 테스트
- [ ] 제출물 준비 (GitHub URL, 라이브 URL, AI 리포트)
