-- ========================================
-- Phase 7-A: 멀티 스쿨/클래스 시스템
-- ========================================

-- schools 테이블
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  teacher_code TEXT NOT NULL UNIQUE DEFAULT upper(substring(md5(random()::text) from 1 for 8)),
  student_code TEXT NOT NULL UNIQUE DEFAULT upper(substring(md5(random()::text) from 1 for 8)),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- school_members 테이블
CREATE TABLE IF NOT EXISTS school_members (
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (school_id, user_id)
);

-- classes 테이블 확장
ALTER TABLE classes ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS class_code TEXT UNIQUE DEFAULT upper(substring(md5(random()::text) from 1 for 8));
ALTER TABLE classes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS max_students INT DEFAULT 50;

-- class_enrollments 테이블
CREATE TABLE IF NOT EXISTS class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  UNIQUE(class_id, student_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_school_members_user ON school_members(user_id);
CREATE INDEX IF NOT EXISTS idx_school_members_school ON school_members(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_school ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student ON class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class ON class_enrollments(class_id);

-- RLS 활성화
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;

-- schools RLS
DROP POLICY IF EXISTS "Admins manage own schools" ON schools;
CREATE POLICY "Admins manage own schools" ON schools
  FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    AND auth.uid() = created_by
  );

DROP POLICY IF EXISTS "Members view own school" ON schools;
CREATE POLICY "Members view own school" ON schools
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM school_members sm
      WHERE sm.school_id = schools.id AND sm.user_id = auth.uid() AND sm.status = 'approved'
    )
  );

-- school_members RLS
DROP POLICY IF EXISTS "Admins manage own school members" ON school_members;
CREATE POLICY "Admins manage own school members" ON school_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM schools s WHERE s.id = school_members.school_id AND s.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users view own memberships" ON school_members;
CREATE POLICY "Users view own memberships" ON school_members
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users join schools" ON school_members;
CREATE POLICY "Users join schools" ON school_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- class_enrollments RLS
DROP POLICY IF EXISTS "Students manage own enrollments" ON class_enrollments;
CREATE POLICY "Students manage own enrollments" ON class_enrollments
  FOR ALL USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Teachers view class enrollments" ON class_enrollments;
CREATE POLICY "Teachers view class enrollments" ON class_enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classes c WHERE c.id = class_enrollments.class_id AND c.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers approve enrollments" ON class_enrollments;
CREATE POLICY "Teachers approve enrollments" ON class_enrollments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM classes c WHERE c.id = class_enrollments.class_id AND c.teacher_id = auth.uid()
    )
  );
