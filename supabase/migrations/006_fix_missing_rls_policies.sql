-- class_students RLS
CREATE POLICY "Students view own classes" ON class_students
  FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Teachers manage class students" ON class_students
  FOR ALL USING (
    EXISTS (SELECT 1 FROM classes c WHERE c.id = class_students.class_id AND c.teacher_id = auth.uid())
  );
CREATE POLICY "Admins manage all class students" ON class_students
  FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- classes RLS
CREATE POLICY "Teachers manage own classes" ON classes
  FOR ALL USING (auth.uid() = teacher_id);
CREATE POLICY "Students view own classes" ON classes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM class_students cs WHERE cs.class_id = classes.id AND cs.student_id = auth.uid())
  );
CREATE POLICY "Admins manage all classes" ON classes
  FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- subjects RLS
CREATE POLICY "Anyone can view subjects" ON subjects FOR SELECT USING (true);
CREATE POLICY "Teachers manage own subjects" ON subjects FOR ALL USING (auth.uid() = created_by);
CREATE POLICY "Admins manage all subjects" ON subjects
  FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Fix skill_trees admin policy (profiles 재귀 방지)
DROP POLICY IF EXISTS "Admins access all skill trees" ON skill_trees;
CREATE POLICY "Admins access all skill trees" ON skill_trees
  FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Students can view skill trees they have progress in
CREATE POLICY "Students view progress skill trees" ON skill_trees
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM student_progress sp WHERE sp.skill_tree_id = skill_trees.id AND sp.student_id = auth.uid())
  );
