-- nodes: Teachers can manage nodes on their own skill trees
CREATE POLICY "Teachers manage own nodes" ON nodes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM skill_trees st
      WHERE st.id = nodes.skill_tree_id AND st.created_by = auth.uid()
    )
  );

CREATE POLICY "Students view nodes" ON nodes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM skill_trees st
      JOIN class_students cs ON cs.class_id = st.class_id
      WHERE st.id = nodes.skill_tree_id AND cs.student_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM skill_trees st
      WHERE st.id = nodes.skill_tree_id AND st.created_by = auth.uid()
    )
  );

CREATE POLICY "Teachers manage own edges" ON node_edges
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM skill_trees st
      WHERE st.id = node_edges.skill_tree_id AND st.created_by = auth.uid()
    )
  );

CREATE POLICY "Students view edges" ON node_edges
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM skill_trees st
      JOIN class_students cs ON cs.class_id = st.class_id
      WHERE st.id = node_edges.skill_tree_id AND cs.student_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM skill_trees st
      WHERE st.id = node_edges.skill_tree_id AND st.created_by = auth.uid()
    )
  );

CREATE POLICY "Teachers manage own chunks" ON document_chunks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM skill_trees st
      WHERE st.id = document_chunks.skill_tree_id AND st.created_by = auth.uid()
    )
  );

CREATE POLICY "Teachers manage own quizzes" ON quizzes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM nodes n
      JOIN skill_trees st ON st.id = n.skill_tree_id
      WHERE n.id = quizzes.node_id AND st.created_by = auth.uid()
    )
  );

CREATE POLICY "Admins access all nodes" ON nodes
  FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "Admins access all edges" ON node_edges
  FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "Admins access all chunks" ON document_chunks
  FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "Admins access all quizzes" ON quizzes
  FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;
