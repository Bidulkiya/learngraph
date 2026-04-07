'use server'

import { createAdminClient } from '@/lib/supabase/admin'

const DEMO_TEACHER_EMAIL = 'demo_teacher@learngraph.app'
const DEMO_STUDENT_EMAILS = [
  'demo_student1@learngraph.app',
  'demo_student2@learngraph.app',
  'demo_student3@learngraph.app',
]
const DEMO_PASSWORD = 'demo1234'

/**
 * Idempotent demo data setup.
 * Creates demo accounts and seeds data if not already present.
 */
export async function setupDemoData(): Promise<{ error?: string }> {
  try {
    const admin = createAdminClient()

    // 1. Check if demo teacher already exists
    const { data: existingTeacher } = await admin
      .from('profiles')
      .select('id')
      .eq('email', DEMO_TEACHER_EMAIL)
      .maybeSingle()

    let teacherId = existingTeacher?.id

    // Create demo teacher if missing
    if (!teacherId) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: DEMO_TEACHER_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { name: '데모 교사', role: 'teacher' },
      })
      if (createErr) return { error: '데모 교사 생성 실패: ' + createErr.message }
      teacherId = created.user.id

      // profiles는 trigger로 자동 생성되지만 보장 차원에서 upsert
      await admin.from('profiles').upsert({
        id: teacherId,
        email: DEMO_TEACHER_EMAIL,
        name: '데모 교사',
        role: 'teacher',
      })
    }

    // 2. Create demo students
    const studentIds: string[] = []
    for (let i = 0; i < DEMO_STUDENT_EMAILS.length; i++) {
      const email = DEMO_STUDENT_EMAILS[i]
      const { data: existing } = await admin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      if (existing) {
        studentIds.push(existing.id)
      } else {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email,
          password: DEMO_PASSWORD,
          email_confirm: true,
          user_metadata: { name: `데모 학생 ${i + 1}`, role: 'student' },
        })
        if (createErr || !created.user) continue
        studentIds.push(created.user.id)
        await admin.from('profiles').upsert({
          id: created.user.id,
          email,
          name: `데모 학생 ${i + 1}`,
          role: 'student',
        })
      }
    }

    // 3. Demo school (idempotent — check by name)
    const { data: existingSchool } = await admin
      .from('schools')
      .select('id')
      .eq('name', 'LearnGraph 데모 스쿨')
      .maybeSingle()

    let schoolId = existingSchool?.id
    if (!schoolId) {
      const { data: school } = await admin
        .from('schools')
        .insert({
          name: 'LearnGraph 데모 스쿨',
          description: '심사위원 체험용 데모 스쿨',
          created_by: teacherId,
        })
        .select('id')
        .single()
      schoolId = school?.id

      // Add teacher + students as members
      if (schoolId) {
        await admin.from('school_members').insert([
          { school_id: schoolId, user_id: teacherId, role: 'teacher', status: 'approved' },
          ...studentIds.map(sid => ({
            school_id: schoolId!,
            user_id: sid,
            role: 'student' as const,
            status: 'approved' as const,
          })),
        ])
      }
    }

    if (!schoolId) return { error: '데모 스쿨 생성 실패' }

    // 4. Demo classes
    const { data: existingClasses } = await admin
      .from('classes')
      .select('id, name')
      .eq('school_id', schoolId)

    let scienceClassId: string | undefined
    let mathClassId: string | undefined

    const science = existingClasses?.find(c => c.name === '과학 1반')
    const math = existingClasses?.find(c => c.name === '수학 1반')

    if (science) scienceClassId = science.id
    else {
      const { data } = await admin
        .from('classes')
        .insert({
          name: '과학 1반',
          school_id: schoolId,
          teacher_id: teacherId,
          description: '데모 과학 클래스',
        })
        .select('id')
        .single()
      scienceClassId = data?.id
    }

    if (math) mathClassId = math.id
    else {
      const { data } = await admin
        .from('classes')
        .insert({
          name: '수학 1반',
          school_id: schoolId,
          teacher_id: teacherId,
          description: '데모 수학 클래스',
        })
        .select('id')
        .single()
      mathClassId = data?.id
    }

    // 5. Enroll all demo students into both classes (approved)
    if (scienceClassId && mathClassId) {
      const enrollments = studentIds.flatMap(sid => [
        { class_id: scienceClassId!, student_id: sid, status: 'approved' as const },
        { class_id: mathClassId!, student_id: sid, status: 'approved' as const },
      ])
      await admin.from('class_enrollments').upsert(enrollments, {
        onConflict: 'class_id,student_id',
      })

      // class_students에도 추가
      const classStudentRows = studentIds.flatMap(sid => [
        { class_id: scienceClassId!, student_id: sid },
        { class_id: mathClassId!, student_id: sid },
      ])
      await admin.from('class_students').upsert(classStudentRows, {
        onConflict: 'class_id,student_id',
      })
    }

    // 6. Demo skill trees (one per class)
    await ensureDemoSkillTree(admin, '광합성과 호흡', scienceClassId, teacherId, studentIds, [
      { id: 'n1', title: '세포의 구조', desc: '세포의 기본 구성 요소를 이해한다', diff: 1 },
      { id: 'n2', title: '엽록체의 역할', desc: '식물 세포의 엽록체와 광합성 관계', diff: 2 },
      { id: 'n3', title: '광합성 과정', desc: '빛을 이용해 포도당을 합성하는 과정', diff: 3 },
      { id: 'n4', title: '미토콘드리아', desc: '세포 호흡의 중심 기관', diff: 2 },
      { id: 'n5', title: '세포 호흡', desc: '포도당을 분해해 ATP를 생성하는 과정', diff: 3 },
      { id: 'n6', title: '광합성과 호흡의 관계', desc: '두 과정의 상호 보완성', diff: 4 },
    ], [
      { source: 'n1', target: 'n2' },
      { source: 'n1', target: 'n4' },
      { source: 'n2', target: 'n3' },
      { source: 'n4', target: 'n5' },
      { source: 'n3', target: 'n6' },
      { source: 'n5', target: 'n6' },
    ])

    await ensureDemoSkillTree(admin, '함수와 그래프', mathClassId, teacherId, studentIds, [
      { id: 'n1', title: '변수와 식', desc: '대수식의 기본 표현', diff: 1 },
      { id: 'n2', title: '일차 방정식', desc: 'ax+b=0 형태의 방정식', diff: 2 },
      { id: 'n3', title: '함수의 개념', desc: '대응 관계로서의 함수', diff: 2 },
      { id: 'n4', title: '일차 함수', desc: 'y=ax+b 형태의 함수', diff: 3 },
      { id: 'n5', title: '함수 그래프', desc: '좌표평면 위의 직선 표현', diff: 3 },
    ], [
      { source: 'n1', target: 'n2' },
      { source: 'n1', target: 'n3' },
      { source: 'n2', target: 'n4' },
      { source: 'n3', target: 'n4' },
      { source: 'n4', target: 'n5' },
    ])

    return {}
  } catch (err) {
    return { error: String(err) }
  }
}

async function ensureDemoSkillTree(
  admin: ReturnType<typeof createAdminClient>,
  title: string,
  classId: string | undefined,
  teacherId: string,
  studentIds: string[],
  nodes: Array<{ id: string; title: string; desc: string; diff: number }>,
  edges: Array<{ source: string; target: string }>
): Promise<void> {
  if (!classId) return

  // Check if exists
  const { data: existing } = await admin
    .from('skill_trees')
    .select('id')
    .eq('title', title)
    .eq('class_id', classId)
    .maybeSingle()

  if (existing) return

  // Create skill tree
  const { data: tree } = await admin
    .from('skill_trees')
    .insert({
      title,
      description: `${title} 학습 스킬트리`,
      class_id: classId,
      created_by: teacherId,
      status: 'published',
    })
    .select('id')
    .single()

  if (!tree) return

  // Insert nodes
  const { data: dbNodes } = await admin
    .from('nodes')
    .insert(nodes.map((n, i) => ({
      skill_tree_id: tree.id,
      title: n.title,
      description: n.desc,
      difficulty: n.diff,
      order_index: i,
    })))
    .select()

  if (!dbNodes) return

  const nodeMap = new Map<string, string>()
  nodes.forEach((n, i) => nodeMap.set(n.id, dbNodes[i].id))

  // Insert edges
  const edgeInserts = edges
    .filter(e => nodeMap.has(e.source) && nodeMap.has(e.target))
    .map(e => ({
      skill_tree_id: tree.id,
      source_node_id: nodeMap.get(e.source)!,
      target_node_id: nodeMap.get(e.target)!,
    }))
  await admin.from('node_edges').insert(edgeInserts)

  // Initialize student progress (root nodes available, mix of statuses)
  const targetIds = new Set(edges.map(e => e.target))
  const progressRows = studentIds.flatMap((sid, sIdx) =>
    nodes.map((n, nIdx) => {
      const dbNodeId = nodeMap.get(n.id)!
      const isRoot = !targetIds.has(n.id)
      // First student: complete first 2 nodes, others available/locked
      let status: 'locked' | 'available' | 'completed' = isRoot ? 'available' : 'locked'
      if (sIdx === 0 && nIdx < 2) status = 'completed'
      else if (sIdx === 0 && nIdx === 2) status = 'available'
      return {
        student_id: sid,
        node_id: dbNodeId,
        skill_tree_id: tree.id,
        status,
        quiz_score: status === 'completed' ? 90 : null,
      }
    })
  )

  await admin.from('student_progress').upsert(progressRows, {
    onConflict: 'student_id,node_id',
  })
}
