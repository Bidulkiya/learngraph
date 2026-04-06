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
  is_template BOOLEAN DEFAULT FALSE,
  source_file_url TEXT,
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
  position_x FLOAT,
  position_y FLOAT,
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
  label TEXT,
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
  options JSONB,
  correct_answer TEXT,
  explanation TEXT,
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
  quiz_score FLOAT,
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
  feedback TEXT,
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
  embedding VECTOR(1536),
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

-- ========================================
-- 인덱스
-- ========================================
CREATE INDEX idx_nodes_skill_tree ON nodes(skill_tree_id);
CREATE INDEX idx_edges_skill_tree ON node_edges(skill_tree_id);
CREATE INDEX idx_quizzes_node ON quizzes(node_id);
CREATE INDEX idx_progress_student ON student_progress(student_id);
CREATE INDEX idx_progress_tree ON student_progress(skill_tree_id);
CREATE INDEX idx_chunks_embedding ON document_chunks USING hnsw (embedding vector_cosine_ops);
