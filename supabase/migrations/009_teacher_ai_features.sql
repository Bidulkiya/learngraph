-- ========================================
-- Phase 7-C: 교사 AI 기능 + 메신저 + 공지
-- ========================================

CREATE TABLE IF NOT EXISTS lesson_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  skill_tree_id UUID REFERENCES skill_trees(id) ON DELETE SET NULL,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  transcript TEXT,
  summary JSONB,
  duration_seconds INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_role TEXT DEFAULT 'all' CHECK (target_role IN ('all', 'teacher', 'student')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcement_reads (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, announcement_id)
);

CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE student_progress ADD COLUMN IF NOT EXISTS current_difficulty INT DEFAULT 1;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS hint_used BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_recordings_teacher ON lesson_recordings(teacher_id);
CREATE INDEX IF NOT EXISTS idx_announcements_school ON announcements(school_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON direct_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_pair ON direct_messages(sender_id, receiver_id, created_at);

ALTER TABLE lesson_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers manage own recordings" ON lesson_recordings;
CREATE POLICY "Teachers manage own recordings" ON lesson_recordings FOR ALL USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "School members view announcements" ON announcements;
CREATE POLICY "School members view announcements" ON announcements FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM school_members sm
    WHERE sm.school_id = announcements.school_id AND sm.user_id = auth.uid() AND sm.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Admins manage school announcements" ON announcements;
CREATE POLICY "Admins manage school announcements" ON announcements FOR ALL USING (
  EXISTS (SELECT 1 FROM schools s WHERE s.id = announcements.school_id AND s.created_by = auth.uid())
);

DROP POLICY IF EXISTS "Users manage own reads" ON announcement_reads;
CREATE POLICY "Users manage own reads" ON announcement_reads FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own messages" ON direct_messages;
CREATE POLICY "Users access own messages" ON direct_messages FOR ALL USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
