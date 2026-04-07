-- ========================================
-- Phase 7-D: 소셜 기능 + 폴리싱
-- ========================================

CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('node_unlock', 'quiz_complete', 'badge_earned', 'tree_complete', 'streak')),
  detail JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feed_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_id UUID REFERENCES activity_feed(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL DEFAULT '👏',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(feed_id, user_id)
);

CREATE TABLE IF NOT EXISTS study_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_group_members (
  group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS study_group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE skill_trees ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'default';

CREATE INDEX IF NOT EXISTS idx_feed_class ON activity_feed(class_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_reactions_feed ON feed_reactions(feed_id);
CREATE INDEX IF NOT EXISTS idx_study_groups_class ON study_groups(class_id);
CREATE INDEX IF NOT EXISTS idx_study_group_messages_group ON study_group_messages(group_id, created_at);

ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Class members view feed" ON activity_feed;
CREATE POLICY "Class members view feed" ON activity_feed FOR SELECT USING (
  EXISTS (SELECT 1 FROM class_enrollments ce WHERE ce.class_id = activity_feed.class_id AND ce.student_id = auth.uid() AND ce.status = 'approved')
  OR EXISTS (SELECT 1 FROM classes c WHERE c.id = activity_feed.class_id AND c.teacher_id = auth.uid())
);

DROP POLICY IF EXISTS "Users post own activities" ON activity_feed;
CREATE POLICY "Users post own activities" ON activity_feed FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own reactions" ON feed_reactions;
CREATE POLICY "Users manage own reactions" ON feed_reactions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Class members view reactions" ON feed_reactions;
CREATE POLICY "Class members view reactions" ON feed_reactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Class members manage groups" ON study_groups;
CREATE POLICY "Class members manage groups" ON study_groups FOR ALL USING (
  EXISTS (SELECT 1 FROM class_enrollments ce WHERE ce.class_id = study_groups.class_id AND ce.student_id = auth.uid() AND ce.status = 'approved')
);

DROP POLICY IF EXISTS "Users manage group memberships" ON study_group_members;
CREATE POLICY "Users manage group memberships" ON study_group_members FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Group members view messages" ON study_group_messages;
CREATE POLICY "Group members view messages" ON study_group_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM study_group_members sgm WHERE sgm.group_id = study_group_messages.group_id AND sgm.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Group members post messages" ON study_group_messages;
CREATE POLICY "Group members post messages" ON study_group_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
