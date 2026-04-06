-- quiz_attempts: students manage own, teachers view
CREATE POLICY "Students manage own attempts" ON quiz_attempts
  FOR ALL USING (auth.uid() = student_id);

CREATE POLICY "Teachers view quiz attempts" ON quiz_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM nodes n
      JOIN skill_trees st ON st.id = n.skill_tree_id
      WHERE n.id = quiz_attempts.node_id AND st.created_by = auth.uid()
    )
  );

-- Students can view quizzes for nodes
CREATE POLICY "Students view quizzes" ON quizzes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM nodes n
      JOIN skill_trees st ON st.id = n.skill_tree_id
      JOIN class_students cs ON cs.class_id = st.class_id
      WHERE n.id = quizzes.node_id AND cs.student_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM nodes n
      JOIN skill_trees st ON st.id = n.skill_tree_id
      WHERE n.id = quizzes.node_id AND st.created_by = auth.uid()
    )
  );
