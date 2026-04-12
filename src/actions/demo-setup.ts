'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { DEMO_TEACHER_EMAIL, DEMO_STUDENT_EMAIL, DEMO_LEARNER_EMAIL, DEMO_PASSWORD } from '@/lib/demo'

const DEMO_SCHOOL_NAME = 'NodeBloom 둘러보기 학교'
const DEMO_CLASS_NAME = 'AI 학습 둘러보기반'
const DEMO_TREE_TITLE = '인공지능의 이해'

/**
 * 이전 브랜드 이름 — DB에 이미 있는 기존 데모 스쿨을 찾아 자동 rename 하기 위함.
 * NodeBloom 브랜드 전환 후에도 기존 데이터를 손상 없이 migration.
 */
/**
 * Idempotent 데모 환경 구축.
 * - 데모 교사 1명 + 데모 학생 1명 + 데모 독학러 1명 (email_confirmed)
 * - 데모 전용 스쿨 + 클래스
 * - 하드코딩된 스킬트리
 * - 각 노드 학습 문서, 퀴즈, 플래시카드 (완료 노드만)
 * - 게이미피케이션 데이터 (XP, 업적, 미션, 감정, 브리핑)
 *
 * 모든 생성은 "이미 있으면 스킵" 패턴으로 재실행 안전.
 *
 * 성능: 완전히 구축된 상태면 fast-path로 ~3개 병렬 쿼리 후 즉시 return.
 * 미구축 상태에서만 전체 30+ 쿼리 실행.
 */
export async function setupDemoData(): Promise<{ error?: string }> {
  try {
    const admin = createAdminClient()

    // ============================================
    // 0. Fast-path: 이미 완전 구축됐는지 병렬 쿼리로 확인
    // ============================================
    // 정상 구축된 상태: profile 2개 + school + class + tree + 14 nodes + 오늘 미션
    // 이 조건이 모두 만족되면 즉시 return (로딩 시간 대폭 단축).
    const todayStr = new Date().toISOString().slice(0, 10)
    const [
      teacherFast,
      studentFast,
      schoolFast,
    ] = await Promise.all([
      admin.from('profiles').select('id, name').eq('email', DEMO_TEACHER_EMAIL).maybeSingle(),
      admin.from('profiles').select('id, name, xp, streak_days').eq('email', DEMO_STUDENT_EMAIL).maybeSingle(),
      admin.from('schools').select('id').eq('name', DEMO_SCHOOL_NAME).maybeSingle(),
    ])

    if (
      teacherFast.data?.id &&
      studentFast.data?.id &&
      teacherFast.data.name === '데모' &&
      studentFast.data.name === '데모' &&
      schoolFast.data?.id
    ) {
      // 추가 병렬 체크: 클래스 + 스킬트리 + 노드 수 + 오늘 미션
      const [classCheck, treeCheck, missionCheck] = await Promise.all([
        admin.from('classes').select('id').eq('school_id', schoolFast.data.id).eq('name', DEMO_CLASS_NAME).maybeSingle(),
        admin.from('skill_trees').select('id, nodes(count)').eq('title', DEMO_TREE_TITLE).eq('created_by', teacherFast.data.id).maybeSingle(),
        admin.from('daily_missions').select('id', { count: 'exact', head: true }).eq('student_id', studentFast.data.id).eq('mission_date', todayStr),
      ])

      const nodeCount = treeCheck.data?.nodes
      const nodes = Array.isArray(nodeCount) ? nodeCount[0]?.count ?? 0 : 0
      if (
        classCheck.data?.id &&
        treeCheck.data?.id &&
        nodes === 14 &&
        (missionCheck.count ?? 0) >= 3
      ) {
        // 모든 핵심 entity가 이미 구축됨 → 전체 setup skip
        // 단, 닉네임/공지는 매번 강제 동기화 (코드 변경이 DB에 반영되도록)
        const { data: learnerProfile } = await admin
          .from('profiles')
          .select('id')
          .eq('email', DEMO_LEARNER_EMAIL)
          .maybeSingle()
        await Promise.all([
          admin.from('profiles').update({ nickname: '데모선생' }).eq('id', teacherFast.data.id),
          admin.from('profiles').update({ nickname: '데모학생' }).eq('id', studentFast.data.id),
          ...(learnerProfile ? [admin.from('profiles').update({ nickname: '데모독학' }).eq('id', learnerProfile.id)] : []),
        ])
        // 공지사항 중복 정리: 1건만 남기기
        const { data: annRows } = await admin
          .from('announcements')
          .select('id')
          .eq('school_id', schoolFast.data.id)
          .order('created_at', { ascending: false })
        if (annRows && annRows.length > 1) {
          const idsToDelete = annRows.slice(1).map(a => a.id)
          await admin.from('announcement_reads').delete().in('announcement_id', idsToDelete)
          await admin.from('announcements').delete().in('id', idsToDelete)
        }
        return {}
      }
    }

    // ============================================
    // 1. 데모 교사 계정
    // ============================================
    const { data: existingTeacherProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('email', DEMO_TEACHER_EMAIL)
      .maybeSingle()

    const TEACHER_NICKNAME = '데모선생'
    const TEACHER_AVATAR_SEED = '데모선생'
    const TEACHER_AVATAR_URL = `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(TEACHER_AVATAR_SEED)}`

    let teacherId = existingTeacherProfile?.id
    if (!teacherId) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: DEMO_TEACHER_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: {
          name: '데모',
          role: 'teacher',
          nickname: TEACHER_NICKNAME,
          avatar_url: TEACHER_AVATAR_URL,
          avatar_seed: TEACHER_AVATAR_SEED,
        },
      })
      if (createErr) return { error: '데모 교사 생성 실패: ' + createErr.message }
      teacherId = created.user.id
      await admin.from('profiles').upsert({
        id: teacherId,
        email: DEMO_TEACHER_EMAIL,
        name: '데모',
        role: 'teacher',
        nickname: TEACHER_NICKNAME,
        avatar_url: TEACHER_AVATAR_URL,
        avatar_seed: TEACHER_AVATAR_SEED,
      })
    }
    // 이름/닉네임/아바타 무조건 갱신
    await admin.from('profiles').update({
      name: '데모',
      nickname: TEACHER_NICKNAME,
      avatar_url: TEACHER_AVATAR_URL,
      avatar_seed: TEACHER_AVATAR_SEED,
      subject: '과학',
      bio: '둘러보기 전용 데모 교사 계정입니다.',
    }).eq('id', teacherId)

    // ============================================
    // 2. 데모 학생 계정
    // ============================================
    const { data: existingStudentProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('email', DEMO_STUDENT_EMAIL)
      .maybeSingle()

    const STUDENT_NICKNAME = '데모학생'
    const STUDENT_AVATAR_SEED = '데모학생'
    const STUDENT_AVATAR_URL = `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(STUDENT_AVATAR_SEED)}`

    let studentId = existingStudentProfile?.id
    if (!studentId) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: DEMO_STUDENT_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: {
          name: '데모',
          role: 'student',
          nickname: STUDENT_NICKNAME,
          avatar_url: STUDENT_AVATAR_URL,
          avatar_seed: STUDENT_AVATAR_SEED,
        },
      })
      if (createErr) return { error: '데모 학생 생성 실패: ' + createErr.message }
      studentId = created.user.id
      await admin.from('profiles').upsert({
        id: studentId,
        email: DEMO_STUDENT_EMAIL,
        name: '데모',
        role: 'student',
        nickname: STUDENT_NICKNAME,
        avatar_url: STUDENT_AVATAR_URL,
        avatar_seed: STUDENT_AVATAR_SEED,
      })
    }
    // 이름/닉네임/아바타 무조건 갱신
    await admin.from('profiles').update({
      name: '데모',
      nickname: STUDENT_NICKNAME,
      avatar_url: STUDENT_AVATAR_URL,
      avatar_seed: STUDENT_AVATAR_SEED,
      grade: '중2',
      bio: '둘러보기 전용 데모 학생 계정입니다.',
      interests: ['과학', '수학', '역사'],
    }).eq('id', studentId)

    // 학생 게이미피케이션 데이터 (덮어쓰기 — 데모는 항상 같은 상태)
    await admin.from('profiles').update({
      xp: 180,
      streak_days: 3,
      learning_style: 'visual',
      week_study_minutes: 95,
      today_study_minutes: 25,
      last_study_date: new Date().toISOString().slice(0, 10),
    }).eq('id', studentId)

    // ============================================
    // 2-c. 데모 독학러 계정
    // ============================================
    const LEARNER_NICKNAME = '데모독학'
    const LEARNER_AVATAR_SEED = '데모독학'
    const LEARNER_AVATAR_URL = `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(LEARNER_AVATAR_SEED)}`

    const { data: existingLearnerProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('email', DEMO_LEARNER_EMAIL)
      .maybeSingle()

    let learnerId = existingLearnerProfile?.id
    if (!learnerId) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: DEMO_LEARNER_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: {
          name: '데모',
          role: 'learner',
          nickname: LEARNER_NICKNAME,
          avatar_url: LEARNER_AVATAR_URL,
          avatar_seed: LEARNER_AVATAR_SEED,
        },
      })
      if (createErr) return { error: '데모 학습자 생성 실패: ' + createErr.message }
      learnerId = created.user.id
      await admin.from('profiles').upsert({
        id: learnerId,
        email: DEMO_LEARNER_EMAIL,
        name: '데모',
        role: 'learner',
        nickname: LEARNER_NICKNAME,
        avatar_url: LEARNER_AVATAR_URL,
        avatar_seed: LEARNER_AVATAR_SEED,
      })
    }
    await admin.from('profiles').update({
      name: '데모',
      nickname: LEARNER_NICKNAME,
      avatar_url: LEARNER_AVATAR_URL,
      avatar_seed: LEARNER_AVATAR_SEED,
      bio: '둘러보기 전용 데모 독학러 계정입니다.',
      xp: 120,
      streak_days: 2,
      learning_style: 'textual',
    }).eq('id', learnerId)

    // ============================================
    // 2-bis. 데모 학생/교사/학습자의 오염 데이터 전면 정리
    // ============================================
    const demoUserIds = [teacherId, studentId, learnerId]

    // weekly_plans — 캐시 전면 삭제 (getWeeklyPlan은 데모면 하드코딩 fallback 반환)
    await admin.from('weekly_plans').delete().in('student_id', demoUserIds)

    // emotion_reports — 체험 스킬트리 아닌 것 삭제 (오늘 데이터는 아래 12에서 upsert)
    await admin.from('emotion_reports').delete().in('student_id', demoUserIds)

    // tutor_conversations — 이전 대화 기록 삭제 (데모는 매번 깨끗한 상태)
    await admin.from('tutor_conversations').delete().in('student_id', demoUserIds)

    // weekly_briefings — 데모 교사 대상 (class_id 관련은 아래 단계에서 재생성)
    // 이 단계에선 보류: 체험 클래스 것만 남기고 삭제는 아래 13에서 처리

    // ============================================
    // 3. 데모 스쿨
    // ============================================
    const { data: existingSchool } = await admin
      .from('schools')
      .select('id')
      .eq('name', DEMO_SCHOOL_NAME)
      .maybeSingle()

    let schoolId = existingSchool?.id
    if (!schoolId) {
      const { data: school } = await admin
        .from('schools')
        .insert({
          name: DEMO_SCHOOL_NAME,
          description: '심사위원 둘러보기용 데모 스쿨 — 읽기 전용',
          created_by: teacherId,
        })
        .select('id')
        .single()
      schoolId = school?.id
    }

    if (!schoolId) return { error: '데모 스쿨 생성 실패' }

    // school_members 등록 (upsert)
    await admin.from('school_members').upsert([
      { school_id: schoolId, user_id: teacherId, role: 'teacher', status: 'approved' },
      { school_id: schoolId, user_id: studentId, role: 'student', status: 'approved' },
    ], { onConflict: 'school_id,user_id' })

    // ============================================
    // 4. 데모 클래스
    // ============================================
    const { data: existingClass } = await admin
      .from('classes')
      .select('id')
      .eq('school_id', schoolId)
      .eq('name', DEMO_CLASS_NAME)
      .maybeSingle()

    let classId = existingClass?.id
    if (!classId) {
      const { data: cls } = await admin
        .from('classes')
        .insert({
          school_id: schoolId,
          name: DEMO_CLASS_NAME,
          description: 'AI의 기초부터 실제 활용까지 배우는 둘러보기 클래스',
          teacher_id: teacherId,
        })
        .select('id')
        .single()
      classId = cls?.id
    }

    if (!classId) return { error: '데모 클래스 생성 실패' }

    // 학생 수강신청 (approved)
    await admin.from('class_enrollments').upsert(
      { class_id: classId, student_id: studentId, status: 'approved' },
      { onConflict: 'class_id,student_id' }
    )
    await admin.from('class_students').upsert(
      { class_id: classId, student_id: studentId },
      { onConflict: 'class_id,student_id' }
    )

    // ============================================
    // 4-bis. 데모 학생/교사의 "체험 스쿨/클래스가 아닌" 소속 전면 제거
    // ============================================
    // 데모 계정이 다른 실제 스쿨/클래스에 섞여있으면 /student/skill-tree에
    // 다른 계정의 스킬트리가 보이는 등 격리가 깨진다. 매 setupDemoData 호출마다
    // 체험 환경 외 모든 소속을 자동 정리.

    // 다른 스쿨 멤버십 삭제
    await admin.from('school_members').delete().in('user_id', demoUserIds).neq('school_id', schoolId)

    // 다른 클래스 enrollment 삭제
    await admin.from('class_enrollments').delete().eq('student_id', studentId).neq('class_id', classId)
    await admin.from('class_students').delete().eq('student_id', studentId).neq('class_id', classId)

    // 다른 클래스의 교사 배정도 제거 (데모 교사는 체험 클래스의 교사여야 함)
    await admin.from('classes').update({ teacher_id: null }).eq('teacher_id', teacherId).neq('id', classId)

    // 다른 스쿨/클래스에서 만든 skill_trees 중 데모 교사가 만든 것 삭제 (이전 데모 버전 잔여물 제거)
    const { data: orphanTrees } = await admin
      .from('skill_trees')
      .select('id')
      .eq('created_by', teacherId)
      .neq('class_id', classId)
    const orphanTreeIds = orphanTrees?.map(t => t.id) ?? []
    if (orphanTreeIds.length > 0) {
      // 의존 데이터부터
      const { data: orphanNodes } = await admin.from('nodes').select('id').in('skill_tree_id', orphanTreeIds)
      const orphanNodeIds = orphanNodes?.map(n => n.id) ?? []
      if (orphanNodeIds.length > 0) {
        await admin.from('flashcard_reviews').delete().in('flashcard_id',
          (await admin.from('flashcards').select('id').in('node_id', orphanNodeIds)).data?.map(f => f.id) ?? []
        )
        await admin.from('flashcards').delete().in('node_id', orphanNodeIds)
        await admin.from('quiz_attempts').delete().in('node_id', orphanNodeIds)
        await admin.from('quizzes').delete().in('node_id', orphanNodeIds)
        await admin.from('student_progress').delete().in('node_id', orphanNodeIds)
      }
      await admin.from('node_edges').delete().in('skill_tree_id', orphanTreeIds)
      await admin.from('nodes').delete().in('skill_tree_id', orphanTreeIds)
      await admin.from('emotion_reports').delete().in('skill_tree_id', orphanTreeIds)
      await admin.from('skill_trees').delete().in('id', orphanTreeIds)
    }

    // 데모 학생의 "체험 스킬트리와 무관한" student_progress도 삭제 (다른 클래스 잔여물)
    // 체험 스킬트리 ID는 아래 단계에서 알 수 있으니 그 후에 정리 → 아래 7에서 처리

    // ============================================
    // 5. 데모 스킬트리 "인공지능의 이해"
    // ============================================
    const { data: existingTree } = await admin
      .from('skill_trees')
      .select('id')
      .eq('class_id', classId)
      .eq('title', DEMO_TREE_TITLE)
      .maybeSingle()

    let treeId = existingTree?.id
    if (!treeId) {
      const { data: tree } = await admin
        .from('skill_trees')
        .insert({
          title: DEMO_TREE_TITLE,
          description: '인공지능의 기초 개념부터 딥러닝, 윤리까지 한 번에 배우는 종합 커리큘럼',
          class_id: classId,
          created_by: teacherId,
          subject_hint: 'science',
          status: 'published',
        })
        .select('id')
        .single()
      treeId = tree?.id
    }

    if (!treeId) return { error: '데모 스킬트리 생성 실패' }

    // ============================================
    // 6. 노드 14개 + 엣지 (이미 있으면 스킵)
    // ============================================
    const { data: existingNodes } = await admin
      .from('nodes')
      .select('id, title')
      .eq('skill_tree_id', treeId)

    let nodeIdMap = new Map<string, string>()

    if (!existingNodes || existingNodes.length === 0) {
      const { data: createdNodes } = await admin
        .from('nodes')
        .insert(
          DEMO_NODES.map((n, i) => ({
            skill_tree_id: treeId,
            title: n.title,
            description: n.description,
            difficulty: n.difficulty,
            order_index: i,
            learning_content: buildLearningDoc(n),
            allow_download: true,
            allow_print: true,
          }))
        )
        .select()

      if (createdNodes) {
        createdNodes.forEach((n, i) => nodeIdMap.set(DEMO_NODES[i].key, n.id))

        // 엣지 생성
        const edgeInserts = DEMO_EDGES
          .filter(e => nodeIdMap.has(e.from) && nodeIdMap.has(e.to))
          .map(e => ({
            skill_tree_id: treeId,
            source_node_id: nodeIdMap.get(e.from)!,
            target_node_id: nodeIdMap.get(e.to)!,
          }))
        await admin.from('node_edges').insert(edgeInserts)
      }
    } else {
      // 기존 노드의 title로 매핑 재구성
      DEMO_NODES.forEach(n => {
        const found = existingNodes.find(en => en.title === n.title)
        if (found) nodeIdMap.set(n.key, found.id)
      })
    }

    // ============================================
    // 7-pre. 데모 학생의 "체험 스킬트리 아닌" 진도 데이터 삭제
    // ============================================
    // 체험 스킬트리(treeId)와 무관한 student_progress/quiz_attempts는 전부 제거.
    // 이전 데모 세션에서 다른 스킬트리를 풀었던 잔여물을 완전히 정리.
    await admin.from('student_progress').delete().eq('student_id', studentId).neq('skill_tree_id', treeId)
    // quiz_attempts는 skill_tree_id 컬럼이 없으므로, 체험 스킬트리의 node_id들 제외한 것 삭제
    const { data: demoNodeIdsForAttempts } = await admin
      .from('nodes')
      .select('id')
      .eq('skill_tree_id', treeId)
    const demoNodeIdList = demoNodeIdsForAttempts?.map(n => n.id) ?? []
    if (demoNodeIdList.length > 0) {
      await admin
        .from('quiz_attempts')
        .delete()
        .eq('student_id', studentId)
        .not('node_id', 'in', `(${demoNodeIdList.map(id => `"${id}"`).join(',')})`)
    }

    // ============================================
    // 7. 학생 진도 설정 (14개 중 4 completed / 3 available / 7 locked)
    // ============================================
    const progressStatus: Record<string, { status: 'completed' | 'available' | 'locked'; score: number | null }> = {
      ai_intro: { status: 'completed', score: 95 },
      comp_history: { status: 'completed', score: 88 },
      data_info: { status: 'completed', score: 92 },
      algo_basics: { status: 'completed', score: 85 },
      programming: { status: 'available', score: null },
      ml_basics: { status: 'available', score: null },
      supervised: { status: 'available', score: null },
      unsupervised: { status: 'locked', score: null },
      neural_net: { status: 'locked', score: null },
      deep_learning: { status: 'locked', score: null },
      nlp: { status: 'locked', score: null },
      ai_ethics: { status: 'locked', score: null },
      ai_usage: { status: 'locked', score: null },
      future_ai: { status: 'locked', score: null },
    }

    const progressRows = DEMO_NODES.map(n => {
      const dbId = nodeIdMap.get(n.key)
      if (!dbId) return null
      const p = progressStatus[n.key]
      return {
        student_id: studentId,
        node_id: dbId,
        skill_tree_id: treeId,
        status: p.status,
        quiz_score: p.score,
        completed_at: p.status === 'completed' ? new Date(Date.now() - Math.random() * 3 * 86400_000).toISOString() : null,
      }
    }).filter((r): r is NonNullable<typeof r> => r !== null)

    await admin.from('student_progress').upsert(progressRows, {
      onConflict: 'student_id,node_id',
    })

    // ============================================
    // 8. 완료 노드의 퀴즈 데이터 (이미 있으면 스킵)
    // ============================================
    const completedKeys = Object.entries(progressStatus)
      .filter(([, p]) => p.status === 'completed')
      .map(([k]) => k)

    for (const key of completedKeys) {
      const nodeDbId = nodeIdMap.get(key)
      if (!nodeDbId) continue
      const { count: existingQuizCount } = await admin
        .from('quizzes')
        .select('*', { count: 'exact', head: true })
        .eq('node_id', nodeDbId)
      if (existingQuizCount && existingQuizCount > 0) continue

      const quizzes = DEMO_QUIZZES[key] ?? []
      if (quizzes.length > 0) {
        await admin.from('quizzes').insert(
          quizzes.map(q => ({
            node_id: nodeDbId,
            question: q.question,
            question_type: q.type,
            options: q.options ?? null,
            correct_answer: q.correct,
            explanation: q.explanation,
            difficulty: q.difficulty,
          }))
        )
      }
    }

    // ============================================
    // 9. 완료 노드의 플래시카드 (이미 있으면 스킵)
    // ============================================
    for (const key of completedKeys) {
      const nodeDbId = nodeIdMap.get(key)
      if (!nodeDbId) continue
      const { count: existingCardCount } = await admin
        .from('flashcards')
        .select('*', { count: 'exact', head: true })
        .eq('node_id', nodeDbId)
      if (existingCardCount && existingCardCount > 0) continue

      const cards = DEMO_FLASHCARDS[key] ?? []
      if (cards.length > 0) {
        await admin.from('flashcards').insert(
          cards.map((c, i) => ({
            node_id: nodeDbId,
            card_index: i,
            front: c.front,
            back: c.back,
          }))
        )
      }
    }

    // ============================================
    // 9-bis. quiz_attempts (완료 노드만, 정답 3 + 오답 1 패턴)
    // 시간을 노드별로 분산해서 dashboard "최근 시도"에 정답/오답이 섞여 보이도록.
    // 데모 학생의 quiz_attempts는 매번 reset (이전 잘못된 데이터 정리 + 시간 갱신).
    // ============================================
    await admin.from('quiz_attempts').delete().eq('student_id', studentId)

    for (let kIdx = 0; kIdx < completedKeys.length; kIdx++) {
      const key = completedKeys[kIdx]
      const nodeDbId = nodeIdMap.get(key)
      if (!nodeDbId) continue

      // 이 노드의 quizzes 가져오기
      const { data: nodeQuizzes } = await admin
        .from('quizzes')
        .select('id')
        .eq('node_id', nodeDbId)
        .order('created_at')

      if (!nodeQuizzes || nodeQuizzes.length === 0) continue

      // 노드별로 다른 날짜 (오래된 노드 → 더 과거).
      // ai_intro: 4일 전, comp_history: 3일 전, data_info: 2일 전, algo_basics: 1일 전.
      const dayOffset = (completedKeys.length - kIdx) // 4..3..2..1
      const baseDay = Date.now() - dayOffset * 86400_000

      // 4문항 중 처음 3개는 정답, 마지막 1개는 오답 (현실감)
      // 같은 날 안에서 시간만 분단위로 차이.
      const attemptRows = nodeQuizzes.slice(0, 4).map((q, idx) => {
        const isCorrect = idx < 3
        return {
          student_id: studentId,
          quiz_id: q.id,
          node_id: nodeDbId,
          is_correct: isCorrect,
          score: isCorrect ? 100 : 35,
          attempted_at: new Date(baseDay + idx * 600_000).toISOString(),
        }
      })
      await admin.from('quiz_attempts').insert(attemptRows)
    }

    // ============================================
    // 10. 일일 미션 (오늘 날짜, upsert)
    // ============================================
    const today = new Date().toISOString().slice(0, 10)
    const { data: existingMissions } = await admin
      .from('daily_missions')
      .select('id')
      .eq('student_id', studentId)
      .eq('mission_date', today)

    if (!existingMissions || existingMissions.length === 0) {
      await admin.from('daily_missions').insert([
        {
          student_id: studentId,
          mission_type: 'unlock_node',
          title: '노드 1개 잠금해제하기',
          target: 1,
          progress: 1,
          completed: true,
          xp_reward: 20,
          mission_date: today,
        },
        {
          student_id: studentId,
          mission_type: 'complete_quiz',
          title: '퀴즈 3개 풀기',
          target: 3,
          progress: 2,
          completed: false,
          xp_reward: 30,
          mission_date: today,
        },
        {
          student_id: studentId,
          mission_type: 'study_time',
          title: '30분 학습하기',
          target: 30,
          progress: 18,
          completed: false,
          xp_reward: 25,
          mission_date: today,
        },
      ])
    }

    // ============================================
    // 11. 업적 부여 (first_unlock, five_unlocks, perfect_quiz)
    // ============================================
    const { data: achievementsRows } = await admin
      .from('achievements')
      .select('id, code')
      .in('code', ['first_unlock', 'five_unlocks', 'perfect_quiz'])

    if (achievementsRows && achievementsRows.length > 0) {
      await admin.from('user_achievements').upsert(
        achievementsRows.map(a => ({
          user_id: studentId,
          achievement_id: a.id,
        })),
        { onConflict: 'user_id,achievement_id' }
      )
    }

    // ============================================
    // 12. 감정 리포트
    // ============================================
    await admin.from('emotion_reports').upsert({
      student_id: studentId,
      skill_tree_id: treeId,
      mood: 'confident',
      mood_score: 78,
      insights: '이 학생은 최근 퀴즈에서 평균 90점 이상을 기록하며 자신감 있게 학습을 이어가고 있습니다. 응답 속도가 빨라지고 힌트 사용도 거의 없어 이해도가 높은 상태입니다.',
      recommendation: '지금의 긍정적인 흐름을 유지하도록 격려해주시고, 도전적인 다음 단계 문제를 조금씩 제안해보세요.',
      node_emotions: [
        { node_title: 'AI란 무엇인가', emotion: '자신감 있음' },
        { node_title: '알고리즘 기초', emotion: '집중' },
      ],
      report_date: today,
    }, { onConflict: 'student_id,skill_tree_id,report_date' })

    // ============================================
    // 13. 주간 브리핑
    // ============================================
    const mondayStr = (() => {
      const d = new Date()
      const day = d.getDay()
      const diff = day === 0 ? -6 : 1 - day
      d.setDate(d.getDate() + diff)
      return d.toISOString().slice(0, 10)
    })()

    await admin.from('weekly_briefings').upsert({
      class_id: classId,
      week_start: mondayStr,
      summary: '이번 주 둘러보기반 학생은 총 4개 노드를 완료하며 평균 90점의 우수한 성적을 기록했습니다. 학습 참여도가 높고 기본 개념에 대한 이해가 잘 잡혀 있습니다. 전반적으로 학습 흐름이 안정적입니다.',
      highlights: [
        '진도율 29% 달성 (4/14 노드 완료)',
        '퀴즈 평균 90점 기록',
        '일일 미션 1개 완료',
      ],
      concerns: [
        '아직 Lv3 이상 난이도 문제 경험 부족',
      ],
      action_items: [
        '머신러닝 기초 노드로 전환 유도',
        '데모 학생에게 도전적인 응용 문제 제시',
        '학부모에게 진행 상황 공유',
      ],
    }, { onConflict: 'class_id,week_start' })

    // ============================================
    // 14. 공지사항 + 환영 메시지
    // ============================================
    // 공지사항: 스쿨의 기존 공지 + 읽음 기록 전부 삭제 후 1건만 재생성
    // 이렇게 해야 데모 진입 시 항상 깨끗한 "미읽음 1건" 상태
    const { data: existingAnnRows } = await admin
      .from('announcements')
      .select('id')
      .eq('school_id', schoolId)
    const existingAnnIds = existingAnnRows?.map(a => a.id) ?? []
    if (existingAnnIds.length > 0) {
      await admin.from('announcement_reads').delete().in('announcement_id', existingAnnIds)
      await admin.from('announcements').delete().in('id', existingAnnIds)
    }
    // 정확히 1건만 insert
    await admin.from('announcements').insert({
      school_id: schoolId,
      author_id: teacherId,
      title: '둘러보기 학교에 오신 것을 환영합니다!',
      content: 'NodeBloom 둘러보기 학교입니다. 데모 계정은 읽기 전용이므로 모든 기능을 둘러볼 수 있지만 데이터는 저장되지 않습니다. 직접 사용해보고 싶으시면 회원가입 후 이용해주세요.',
      target_role: 'all',
    })
    // 데모 계정의 모든 announcement_reads도 삭제 (항상 미읽음)
    await admin.from('announcement_reads').delete().in('user_id', demoUserIds)

    // 직접 메시지: 교사→학생 메시지 전부 삭제 후 재생성 (미읽음 상태)
    await admin
      .from('direct_messages')
      .delete()
      .or(`and(sender_id.eq.${teacherId},receiver_id.eq.${studentId}),and(sender_id.eq.${studentId},receiver_id.eq.${teacherId})`)

    await admin.from('direct_messages').insert([
      {
        school_id: schoolId,
        sender_id: teacherId,
        receiver_id: studentId,
        content: '환영합니다! NodeBloom 둘러보기 학교에 오신 것을 축하드려요. 궁금한 점이 있으면 언제든 메시지 주세요.',
      },
      {
        school_id: schoolId,
        sender_id: teacherId,
        receiver_id: studentId,
        content: '오늘 퀴즈 성적이 정말 좋네요. 이 페이스로 계속 가봅시다!',
      },
    ])

    // ============================================
    // 15. 독학러 데모 스킬트리 + 진도 + 퀴즈 + 플래시카드
    // ============================================
    if (learnerId) {
      // 스킬트리 upsert (제목 기준)
      const { data: existingLearnerTree } = await admin
        .from('skill_trees')
        .select('id')
        .eq('created_by', learnerId)
        .eq('title', 'Python 기초 독학')
        .maybeSingle()

      let learnerTreeId = existingLearnerTree?.id
      if (!learnerTreeId) {
        const { data: newTree } = await admin
          .from('skill_trees')
          .insert({
            title: 'Python 기초 독학',
            description: 'Python 프로그래밍의 기초부터 파일 입출력까지',
            subject_hint: 'default',
            created_by: learnerId,
            class_id: null,
            status: 'published',
          })
          .select('id')
          .single()
        learnerTreeId = newTree?.id
      }

      if (learnerTreeId) {
        // 기존 노드 확인
        const { data: existingLearnerNodes } = await admin
          .from('nodes')
          .select('id')
          .eq('skill_tree_id', learnerTreeId)

        if (!existingLearnerNodes || existingLearnerNodes.length === 0) {
          const pyNodes = [
            { title: 'Python 설치와 실행', description: 'Python을 설치하고 첫 Hello World를 출력합니다. REPL과 스크립트 실행 차이를 배웁니다.', difficulty: 1 },
            { title: '변수와 자료형', description: '숫자, 문자열, 불리언 등 기본 자료형과 변수 선언 방법을 배웁니다. type() 함수로 타입을 확인합니다.', difficulty: 1 },
            { title: '조건문 if-else', description: 'if, elif, else를 사용하여 조건에 따라 다른 코드를 실행합니다. 비교 연산자와 논리 연산자를 활용합니다.', difficulty: 2 },
            { title: '반복문 for-while', description: 'for 루프로 리스트를 순회하고, while 루프로 조건 반복을 합니다. range() 함수와 break/continue를 배웁니다.', difficulty: 2 },
            { title: '입출력', description: 'input()으로 사용자 입력을 받고, print()로 출력합니다. f-string 포매팅으로 깔끔한 출력을 만듭니다.', difficulty: 2 },
            { title: '리스트와 딕셔너리', description: '리스트의 추가/삭제/슬라이싱과 딕셔너리의 키-값 구조를 배웁니다. 리스트 컴프리헨션도 다룹니다.', difficulty: 3 },
            { title: '함수 정의', description: 'def 키워드로 함수를 만들고, 매개변수와 반환값을 활용합니다. 기본값 인자와 가변 인자를 배웁니다.', difficulty: 3 },
            { title: '문자열 처리', description: 'split, join, strip, replace 등 문자열 메서드를 마스터합니다. 정규표현식 기초도 다룹니다.', difficulty: 3 },
            { title: '파일 입출력', description: 'open() 함수로 파일을 읽고 쓰는 방법을 배웁니다. with 문으로 안전한 파일 처리와 CSV 파일도 다룹니다.', difficulty: 4 },
            { title: '모듈과 패키지', description: 'import로 모듈을 불러오고, pip으로 패키지를 설치합니다. __name__ 변수와 패키지 구조를 배웁니다.', difficulty: 4 },
          ]

          const nodeInserts = pyNodes.map((n, idx) => ({
            skill_tree_id: learnerTreeId!,
            title: n.title,
            description: n.description,
            difficulty: n.difficulty,
            order_index: idx,
          }))
          const { data: insertedPyNodes } = await admin.from('nodes').insert(nodeInserts).select('id, title, description, difficulty')

          if (insertedPyNodes && insertedPyNodes.length === 10) {
            // 엣지: Lv1→Lv2→Lv3→Lv4 트리 구조
            const pyEdges = [
              { source: 0, target: 2 }, { source: 0, target: 3 }, { source: 1, target: 2 },
              { source: 1, target: 4 }, { source: 2, target: 5 }, { source: 3, target: 5 },
              { source: 3, target: 6 }, { source: 4, target: 7 }, { source: 5, target: 8 },
              { source: 6, target: 8 }, { source: 7, target: 9 }, { source: 8, target: 9 },
            ]
            await admin.from('node_edges').insert(
              pyEdges.map(e => ({
                skill_tree_id: learnerTreeId!,
                source_node_id: insertedPyNodes[e.source].id,
                target_node_id: insertedPyNodes[e.target].id,
              }))
            )

            // 진도: 3 completed, 2 available, 5 locked
            const targetNodeIds = new Set(pyEdges.map(e => insertedPyNodes[e.target].id))
            const completedIds = [0, 1, 2].map(i => insertedPyNodes[i].id) // Lv1 2개 + Lv2 1개
            const progressRows = insertedPyNodes.map(n => {
              let status = 'locked'
              if (completedIds.includes(n.id)) status = 'completed'
              else if (!targetNodeIds.has(n.id)) status = 'available'
              return {
                student_id: learnerId!,
                node_id: n.id,
                skill_tree_id: learnerTreeId!,
                status,
                quiz_score: status === 'completed' ? 90 : null,
              }
            })
            // 수동으로 available 조정 (Lv2의 나머지 2개)
            progressRows[3].status = 'available' // 반복문
            progressRows[4].status = 'available' // 입출력
            await admin.from('student_progress').upsert(progressRows, { onConflict: 'student_id,node_id' })

            // 완료 노드 퀴즈 (3노드 × 3문제)
            const quizData = [
              { nodeIdx: 0, questions: [
                { question: 'Python REPL에서 바로 실행할 수 있는 것은?', type: 'multiple_choice', options: ['print("Hello")', 'System.out.println()', 'console.log()', 'echo "Hello"'], answer: 'print("Hello")', explanation: 'Python REPL은 파이썬 코드를 즉시 실행합니다.' },
                { question: 'Python 스크립트 파일의 확장자는?', type: 'multiple_choice', options: ['.py', '.js', '.java', '.cpp'], answer: '.py', explanation: 'Python 파일은 .py 확장자를 사용합니다.' },
                { question: 'Python을 설치한 후 버전을 확인하는 명령어를 쓰시오.', type: 'short_answer', options: null, answer: 'python --version', explanation: 'python --version 또는 python -V로 설치된 버전을 확인합니다.' },
              ]},
              { nodeIdx: 1, questions: [
                { question: 'x = 10일 때 type(x)의 결과는?', type: 'multiple_choice', options: ["<class 'int'>", "<class 'str'>", "<class 'float'>", "<class 'bool'>"], answer: "<class 'int'>", explanation: '정수는 int 타입입니다.' },
                { question: '문자열을 정수로 변환하는 함수는?', type: 'multiple_choice', options: ['int()', 'str()', 'float()', 'bool()'], answer: 'int()', explanation: "int('123')은 정수 123을 반환합니다." },
                { question: 'Python에서 변수 이름 규칙을 설명하시오.', type: 'short_answer', options: null, answer: '문자나 밑줄로 시작하고 숫자로 시작할 수 없다', explanation: '변수명은 문자/밑줄로 시작, 숫자로 시작 불가, 예약어 사용 불가입니다.' },
              ]},
              { nodeIdx: 2, questions: [
                { question: 'if x > 0: print("양수") 에서 x가 -1이면?', type: 'multiple_choice', options: ['아무것도 출력 안 됨', '양수', '에러', '-1'], answer: '아무것도 출력 안 됨', explanation: '조건이 False이면 if 블록은 실행되지 않습니다.' },
                { question: 'elif의 의미는?', type: 'multiple_choice', options: ['else if의 줄임말', 'else의 변형', 'if의 반복', '함수 호출'], answer: 'else if의 줄임말', explanation: 'elif는 else if를 줄인 것으로, 추가 조건을 검사합니다.' },
                { question: 'and와 or 연산자의 차이를 설명하시오.', type: 'short_answer', options: null, answer: 'and는 두 조건 모두 참일 때 참, or는 하나라도 참이면 참', explanation: 'and는 논리곱, or는 논리합입니다.' },
              ]},
            ]
            for (const qd of quizData) {
              const nodeId = insertedPyNodes[qd.nodeIdx].id
              await admin.from('quizzes').insert(
                qd.questions.map(q => ({
                  node_id: nodeId,
                  question: q.question,
                  question_type: q.type,
                  options: q.options,
                  correct_answer: q.answer,
                  explanation: q.explanation,
                  difficulty: insertedPyNodes[qd.nodeIdx].difficulty,
                }))
              )
            }

            // 플래시카드 (완료 노드 3개 × 3장)
            for (const idx of [0, 1, 2]) {
              const nodeId = insertedPyNodes[idx].id
              const cards = [
                { front: `${insertedPyNodes[idx].title}의 핵심 개념은?`, back: insertedPyNodes[idx].description ?? '' },
                { front: `${insertedPyNodes[idx].title} 관련 함수는?`, back: idx === 0 ? 'print(), input()' : idx === 1 ? 'type(), int(), str(), float()' : 'if, elif, else, and, or, not' },
                { front: `${insertedPyNodes[idx].title} 예제 코드를 떠올려보세요`, back: idx === 0 ? 'print("Hello, World!")' : idx === 1 ? 'x = 10; name = "Python"' : 'if x > 0: print("양수") elif x == 0: print("0") else: print("음수")' },
              ]
              await admin.from('flashcards').insert(
                cards.map((c, ci) => ({
                  node_id: nodeId,
                  card_index: ci,
                  front: c.front,
                  back: c.back,
                }))
              )
            }

            // 업적 부여 (first_unlock, perfect_quiz)
            const { data: achList } = await admin
              .from('achievements')
              .select('id, code')
              .in('code', ['first_unlock', 'perfect_quiz'])
            if (achList) {
              for (const ach of achList) {
                await admin.from('user_achievements').upsert(
                  { user_id: learnerId!, achievement_id: ach.id },
                  { onConflict: 'user_id,achievement_id' },
                )
              }
            }

            // 일일 미션 (1 완료 + 1 진행중)
            const today = new Date().toISOString().slice(0, 10)
            await admin.from('daily_missions').delete().eq('student_id', learnerId!).eq('mission_date', today)
            await admin.from('daily_missions').insert([
              { student_id: learnerId!, mission_type: 'unlock_node', title: '노드 1개 잠금해제하기', target: 1, progress: 1, completed: true, xp_reward: 30, mission_date: today },
              { student_id: learnerId!, mission_type: 'complete_quiz', title: '퀴즈 3개 풀기', target: 3, progress: 2, completed: false, xp_reward: 25, mission_date: today },
            ])
          }
        }
      }
    }

    return {}
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[setupDemoData]', msg)
    return { error: msg }
  }
}

// ============================================
// 데모 노드 데이터 (14개)
// ============================================
interface DemoNode {
  key: string
  title: string
  description: string
  difficulty: number
  goals: string[]
  keyPoints: string[]
}

const DEMO_NODES: DemoNode[] = [
  {
    key: 'ai_intro',
    title: 'AI란 무엇인가',
    description: '인공지능의 정의, 역사, 그리고 우리 일상에서 만나는 AI의 모습을 이해합니다. AI가 단순한 프로그램과 어떻게 다른지 배웁니다.',
    difficulty: 1,
    goals: ['AI의 정의를 설명할 수 있다', '약AI와 강AI의 차이를 안다', '일상 속 AI 사례 3가지 이상을 예시로 들 수 있다'],
    keyPoints: ['AI는 사람이 사고하는 방식을 기계가 모방하는 기술입니다', '약AI(특정 작업)와 강AI(범용 지능)의 구분', '스팸 필터, 번역기, 추천 시스템은 모두 AI 사례'],
  },
  {
    key: 'comp_history',
    title: '컴퓨터의 역사',
    description: '주판에서 현대 컴퓨터까지의 발전 과정과 핵심 인물들(튜링, 폰 노이만)을 배웁니다. 컴퓨터 아키텍처의 기본을 이해합니다.',
    difficulty: 1,
    goals: ['컴퓨터 발전의 주요 단계를 순서대로 설명할 수 있다', '튜링 머신의 개념을 안다', '폰 노이만 구조의 역할을 설명할 수 있다'],
    keyPoints: ['1940년대 ENIAC부터 오늘날 스마트폰까지', '앨런 튜링 — 현대 컴퓨터 과학의 아버지', '폰 노이만 구조 = 프로그램 내장 방식'],
  },
  {
    key: 'data_info',
    title: '데이터와 정보',
    description: '데이터, 정보, 지식의 차이를 배우고 디지털 세계에서 숫자, 문자, 이미지가 어떻게 표현되는지 이해합니다.',
    difficulty: 2,
    goals: ['데이터와 정보의 차이를 구별할 수 있다', '비트와 바이트 단위를 이해한다', '이진법 기본을 안다'],
    keyPoints: ['데이터 = 가공 전 원재료, 정보 = 의미 부여된 데이터', '1바이트 = 8비트 = 256가지 값', '컴퓨터는 모든 정보를 0과 1로 표현'],
  },
  {
    key: 'algo_basics',
    title: '알고리즘 기초',
    description: '문제를 해결하기 위한 명확한 단계들의 집합인 알고리즘을 배웁니다. 정렬, 검색 등 기본 알고리즘 개념을 이해합니다.',
    difficulty: 2,
    goals: ['알고리즘의 정의를 말할 수 있다', '일상의 알고리즘 예시를 들 수 있다', '순차/조건/반복 구조를 이해한다'],
    keyPoints: ['알고리즘 = 문제 해결 단계의 집합 (요리 레시피와 같음)', '좋은 알고리즘 = 명확성 + 효율성 + 유한성', '선형 검색 vs 이진 검색'],
  },
  {
    key: 'programming',
    title: '프로그래밍 개념',
    description: '알고리즘을 컴퓨터가 실행할 수 있게 만드는 프로그래밍 언어와 기본 개념을 배웁니다.',
    difficulty: 2,
    goals: ['프로그래밍 언어의 역할을 설명할 수 있다', '변수와 자료형 개념을 안다', '함수의 필요성을 이해한다'],
    keyPoints: ['고급 언어(Python, JS) vs 저급 언어(어셈블리)', '변수 = 값을 저장하는 이름표', '함수 = 반복 코드를 묶은 작은 프로그램'],
  },
  {
    key: 'ml_basics',
    title: '머신러닝 기초',
    description: '데이터로부터 규칙을 스스로 학습하는 머신러닝의 기본 원리를 배웁니다.',
    difficulty: 3,
    goals: ['머신러닝이 전통 프로그래밍과 어떻게 다른지 안다', '학습, 예측, 평가의 단계를 설명할 수 있다'],
    keyPoints: ['전통 프로그래밍: 규칙 입력 → 결과 출력', '머신러닝: 데이터와 결과 입력 → 규칙 학습', '훈련 데이터 / 검증 데이터 / 테스트 데이터'],
  },
  {
    key: 'supervised',
    title: '지도학습',
    description: '정답이 있는 데이터로 학습하는 지도학습을 배웁니다. 분류와 회귀의 차이를 이해합니다.',
    difficulty: 3,
    goals: ['지도학습의 개념을 설명할 수 있다', '분류와 회귀의 차이를 안다'],
    keyPoints: ['정답 레이블이 있는 데이터로 학습', '분류 = 카테고리 예측 (스팸/정상)', '회귀 = 숫자 값 예측 (집값)'],
  },
  {
    key: 'unsupervised',
    title: '비지도학습',
    description: '정답 없이 데이터의 구조를 발견하는 비지도학습을 배웁니다. 클러스터링과 차원 축소를 이해합니다.',
    difficulty: 3,
    goals: ['비지도학습의 개념을 안다', '클러스터링 예시를 들 수 있다'],
    keyPoints: ['정답 없이 데이터 속 패턴 발견', 'K-means 클러스터링', '고객 세분화, 이상 탐지에 활용'],
  },
  {
    key: 'neural_net',
    title: '신경망 구조',
    description: '인간 뇌의 신경세포를 모방한 인공 신경망의 기본 구조를 배웁니다.',
    difficulty: 4,
    goals: ['퍼셉트론의 구조를 이해한다', '입력층/은닉층/출력층의 역할을 안다'],
    keyPoints: ['생물학적 뉴런 → 인공 뉴런(퍼셉트론)', '가중치(weight)와 편향(bias)', '활성화 함수의 역할'],
  },
  {
    key: 'deep_learning',
    title: '딥러닝 원리',
    description: '깊은 신경망이 어떻게 복잡한 패턴을 학습하는지, 역전파 알고리즘의 개념을 배웁니다.',
    difficulty: 4,
    goals: ['딥러닝과 일반 머신러닝의 차이를 안다', '역전파의 개념을 설명할 수 있다'],
    keyPoints: ['여러 은닉층으로 복잡한 특징 추출', '경사하강법으로 오차 최소화', 'CNN, RNN, Transformer 등 다양한 구조'],
  },
  {
    key: 'nlp',
    title: '자연어 처리',
    description: '컴퓨터가 사람의 언어를 이해하고 생성하는 자연어 처리 기술을 배웁니다.',
    difficulty: 4,
    goals: ['NLP의 주요 작업을 안다', '언어 모델의 역할을 이해한다'],
    keyPoints: ['토큰화, 임베딩, 트랜스포머', '번역, 요약, 감정 분석, 챗봇', 'GPT, Claude 같은 대규모 언어 모델'],
  },
  {
    key: 'ai_ethics',
    title: 'AI 윤리',
    description: 'AI 개발과 사용에서 발생하는 편향, 프라이버시, 일자리 등 윤리적 이슈를 배웁니다.',
    difficulty: 5,
    goals: ['AI 편향의 원인과 영향을 안다', '데이터 프라이버시의 중요성을 이해한다'],
    keyPoints: ['훈련 데이터의 편향이 모델에 전달됨', '얼굴 인식, 신용 평가에서의 차별 사례', '설명 가능한 AI(XAI)의 필요성'],
  },
  {
    key: 'ai_usage',
    title: 'AI 활용 사례',
    description: '의료, 교육, 예술, 자율주행 등 다양한 분야에서 AI가 어떻게 활용되는지 살펴봅니다.',
    difficulty: 5,
    goals: ['다양한 산업 분야의 AI 활용 예시를 든다', 'AI가 바꾸고 있는 직업을 안다'],
    keyPoints: ['의료: 의료 영상 진단, 신약 개발', '교육: 개인화 학습 (NodeBloom 같은!)', '자율주행, 창작, 번역'],
  },
  {
    key: 'future_ai',
    title: '미래의 AI',
    description: 'AGI, 양자컴퓨팅과 AI, 인간과 AI의 공존 등 앞으로의 AI 발전 방향을 논의합니다.',
    difficulty: 5,
    goals: ['AGI의 개념을 안다', 'AI 발전의 도전 과제를 말할 수 있다'],
    keyPoints: ['AGI(범용 인공지능) — 모든 지적 작업 가능한 AI', '양자컴퓨팅 + AI의 잠재력', '인간과 AI의 협력적 공존'],
  },
]

const DEMO_EDGES: Array<{ from: string; to: string }> = [
  // Lv1 → Lv2
  { from: 'ai_intro', to: 'data_info' },
  { from: 'comp_history', to: 'data_info' },
  { from: 'ai_intro', to: 'algo_basics' },
  { from: 'comp_history', to: 'algo_basics' },
  { from: 'data_info', to: 'programming' },
  { from: 'algo_basics', to: 'programming' },
  // Lv2 → Lv3
  { from: 'data_info', to: 'ml_basics' },
  { from: 'algo_basics', to: 'ml_basics' },
  { from: 'programming', to: 'supervised' },
  { from: 'ml_basics', to: 'supervised' },
  { from: 'ml_basics', to: 'unsupervised' },
  // Lv3 → Lv4
  { from: 'supervised', to: 'neural_net' },
  { from: 'unsupervised', to: 'neural_net' },
  { from: 'neural_net', to: 'deep_learning' },
  { from: 'deep_learning', to: 'nlp' },
  // Lv4 → Lv5
  { from: 'deep_learning', to: 'ai_ethics' },
  { from: 'nlp', to: 'ai_usage' },
  { from: 'ai_ethics', to: 'future_ai' },
  { from: 'ai_usage', to: 'future_ai' },
]

/**
 * 하드코딩된 HTML 학습지 빌더 (AI 없음).
 */
function buildLearningDoc(n: DemoNode): string {
  const primary = '#6366F1'
  const secondary = '#A855F7'
  const accent = '#F0F4FF'

  return `<div class="ws-doc">
<div class="ws-banner" style="background: linear-gradient(135deg, ${primary}, ${secondary}); color: white; padding: 18px 24px; border-radius: 12px; margin-bottom: 20px;">
  <h1 style="margin: 0; font-size: 24px;">${escapeHtml(n.title)}</h1>
  <p style="margin: 4px 0 0; opacity: 0.9; font-size: 13px;">스킬트리: ${escapeHtml(DEMO_TREE_TITLE)}</p>
</div>

<div class="ws-goals" style="background: ${accent}; border-left: 4px solid ${primary}; padding: 14px 18px; border-radius: 8px; margin-bottom: 24px;">
  <h3 style="margin: 0 0 8px; color: ${primary};">🎯 학습 목표</h3>
  <ul style="margin: 0; padding-left: 20px;">
    ${n.goals.map(g => `<li>${escapeHtml(g)}</li>`).join('\n    ')}
  </ul>
</div>

<div class="ws-concept" style="margin-bottom: 22px;">
  <h2 style="display: flex; align-items: center; gap: 10px;">
    <span style="display: inline-flex; width: 28px; height: 28px; background: ${primary}; color: white; border-radius: 50%; align-items: center; justify-content: center; font-size: 14px;">1</span>
    개념 설명
  </h2>
  <p style="line-height: 1.7; color: #374151;">${escapeHtml(n.description)}</p>
  <p style="line-height: 1.7; color: #374151;">이 개념은 인공지능을 이해하는 데 매우 중요합니다. 차근차근 핵심 포인트를 짚어봅시다.</p>
</div>

<table style="width: 100%; border-collapse: collapse; margin: 18px 0;">
  <thead>
    <tr>
      <th style="background: ${primary}; color: white; padding: 10px; border: 1px solid #ddd; text-align: left;">핵심 포인트</th>
      <th style="background: ${primary}; color: white; padding: 10px; border: 1px solid #ddd; text-align: left;">설명</th>
    </tr>
  </thead>
  <tbody>
    ${n.keyPoints.map((p, i) => {
      const bg = i % 2 === 0 ? '#F9FAFB' : '#FFFFFF'
      return `<tr style="background: ${bg};">
      <td style="padding: 10px; border: 1px solid #ddd; font-weight: 600;">포인트 ${i + 1}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(p)}</td>
    </tr>`
    }).join('\n    ')}
  </tbody>
</table>

<div class="ws-problems" style="background: #FFFBEB; border: 1px dashed ${secondary}; padding: 16px; border-radius: 10px; margin: 18px 0;">
  <h3 style="margin: 0 0 10px;">📝 연습 문제</h3>
  <p><strong>Q1.</strong> 다음 빈칸을 채우세요: ${escapeHtml(n.title)}는 <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u> 를 이해하는 데 중요한 개념이다.</p>
  <p><strong>Q2.</strong> (O/X) ${escapeHtml(n.keyPoints[0] ?? '핵심 포인트 1')} ( O / X )</p>
  <p><strong>Q3.</strong> ${escapeHtml(n.title)}에 대한 설명으로 가장 적절한 것은?<br>
    ① 완전히 무관한 개념<br>
    ② 참고용 개념<br>
    ③ 스킬트리의 핵심 노드 ✓<br>
    ④ 선택 사항
  </p>
</div>

<div class="ws-summary" style="background: ${accent}; border: 2px solid ${primary}; border-radius: 12px; padding: 18px; margin: 18px 0;">
  <h3 style="margin: 0 0 10px; color: ${primary};">✨ 한눈에 정리</h3>
  <ul style="margin: 0; padding-left: 20px;">
    ${n.keyPoints.map(p => `<li>${escapeHtml(p)}</li>`).join('\n    ')}
  </ul>
</div>

<div class="ws-questions" style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 14px 18px; border-radius: 8px;">
  <h3 style="margin: 0 0 8px;">🤔 더 생각해 보기</h3>
  <ol style="margin: 0; padding-left: 20px;">
    <li>${escapeHtml(n.title)}이 우리 생활에 어떤 영향을 주는지 3가지 예를 들어보세요.</li>
    <li>이 개념을 모르는 친구에게 한 문장으로 어떻게 설명하시겠나요?</li>
    <li>이 개념과 관련된 다른 과목(수학, 과학, 사회)의 주제는 무엇이 있을까요?</li>
  </ol>
</div>
</div>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// ============================================
// 하드코딩 퀴즈 데이터 (완료 노드 4개만)
// ============================================
interface DemoQuiz {
  question: string
  type: 'multiple_choice' | 'short_answer'
  options?: string[]
  correct: string
  explanation: string
  difficulty: number
}

const DEMO_QUIZZES: Record<string, DemoQuiz[]> = {
  ai_intro: [
    {
      question: 'AI(인공지능)의 가장 핵심적인 특징은 무엇인가요?',
      type: 'multiple_choice',
      options: ['빠른 계산', '데이터로부터 학습하여 판단', '무한한 저장공간', '인터넷 연결'],
      correct: '데이터로부터 학습하여 판단',
      explanation: 'AI는 단순 계산기와 달리 데이터에서 패턴을 학습해 새로운 상황에 대응합니다.',
      difficulty: 1,
    },
    {
      question: '다음 중 약AI(Narrow AI)에 해당하는 것은?',
      type: 'multiple_choice',
      options: ['모든 작업을 할 수 있는 AI', '스팸 메일 필터', '자의식 있는 AI', '인간처럼 감정을 가진 AI'],
      correct: '스팸 메일 필터',
      explanation: '특정 작업에 특화된 AI를 약AI(Narrow AI)라고 하며, 스팸 필터는 대표적 예입니다.',
      difficulty: 1,
    },
    {
      question: 'AI가 일상에서 사용되는 예시가 아닌 것은?',
      type: 'multiple_choice',
      options: ['음성 비서(시리)', '번역기', '추천 시스템', '일반 계산기'],
      correct: '일반 계산기',
      explanation: '계산기는 정해진 연산만 수행하는 전통 프로그램이며 AI가 아닙니다.',
      difficulty: 1,
    },
    {
      question: '강AI(Strong AI)와 약AI의 차이를 한 문장으로 설명하세요.',
      type: 'short_answer',
      correct: '약AI는 특정 작업에 특화되어 있고, 강AI는 인간처럼 다양한 작업을 수행할 수 있는 범용 지능입니다.',
      explanation: '약AI는 좁은 범위의 문제만 해결하지만, 강AI는 인간 수준의 일반 지능을 목표로 합니다.',
      difficulty: 2,
    },
  ],
  comp_history: [
    {
      question: '현대 컴퓨터의 아버지로 불리는 수학자는?',
      type: 'multiple_choice',
      options: ['아이작 뉴턴', '앨런 튜링', '알버트 아인슈타인', '찰스 배비지'],
      correct: '앨런 튜링',
      explanation: '앨런 튜링은 튜링 머신 개념을 통해 현대 컴퓨터의 이론적 기반을 세웠습니다.',
      difficulty: 1,
    },
    {
      question: '폰 노이만 구조의 핵심 특징은?',
      type: 'multiple_choice',
      options: ['병렬 처리', '프로그램 내장 방식', '양자 컴퓨팅', '클라우드 기반'],
      correct: '프로그램 내장 방식',
      explanation: '폰 노이만 구조는 프로그램과 데이터를 같은 메모리에 저장하는 방식입니다.',
      difficulty: 2,
    },
    {
      question: '1940년대 개발된 최초의 범용 전자 컴퓨터 이름은?',
      type: 'multiple_choice',
      options: ['ENIAC', 'IBM PC', 'Mac', 'Apple II'],
      correct: 'ENIAC',
      explanation: 'ENIAC(1945)은 최초의 범용 전자 디지털 컴퓨터로 알려져 있습니다.',
      difficulty: 1,
    },
    {
      question: '튜링 머신이 컴퓨터 과학에서 갖는 의미를 간단히 설명하세요.',
      type: 'short_answer',
      correct: '튜링 머신은 모든 계산 가능한 문제를 풀 수 있는 이론적 모델로, 현대 컴퓨터의 수학적 기반이 됩니다.',
      explanation: '튜링 머신은 "계산 가능성"의 개념을 정의했으며, 모든 현대 컴퓨터는 이 모델을 따릅니다.',
      difficulty: 2,
    },
  ],
  data_info: [
    {
      question: '1바이트는 몇 비트인가요?',
      type: 'multiple_choice',
      options: ['4비트', '8비트', '16비트', '32비트'],
      correct: '8비트',
      explanation: '1바이트는 8비트로 구성되며, 256가지(2^8) 값을 표현할 수 있습니다.',
      difficulty: 1,
    },
    {
      question: '데이터와 정보의 차이를 가장 잘 설명한 것은?',
      type: 'multiple_choice',
      options: ['같은 의미', '데이터는 가공 전, 정보는 의미가 부여된 것', '정보가 데이터보다 크다', '데이터는 숫자만'],
      correct: '데이터는 가공 전, 정보는 의미가 부여된 것',
      explanation: '데이터는 원재료, 정보는 그것을 가공하고 의미를 부여한 결과물입니다.',
      difficulty: 2,
    },
    {
      question: '이진법에서 숫자 5를 표현하면?',
      type: 'multiple_choice',
      options: ['100', '101', '110', '111'],
      correct: '101',
      explanation: '5 = 4 + 1 = 2² + 2⁰ = 101(이진법)입니다.',
      difficulty: 2,
    },
    {
      question: '컴퓨터가 모든 정보를 0과 1로 표현하는 이유를 설명하세요.',
      type: 'short_answer',
      correct: '전기 신호의 켜짐(1)/꺼짐(0) 두 상태를 안정적으로 구분할 수 있어 신뢰성 있는 연산이 가능하기 때문입니다.',
      explanation: '트랜지스터의 ON/OFF 상태로 이진법을 구현하는 것이 가장 안정적이고 오류가 적습니다.',
      difficulty: 3,
    },
  ],
  algo_basics: [
    {
      question: '알고리즘의 정의로 가장 적절한 것은?',
      type: 'multiple_choice',
      options: ['빠른 계산 방법', '문제 해결을 위한 명확한 단계의 집합', '프로그래밍 언어', '컴퓨터 부품'],
      correct: '문제 해결을 위한 명확한 단계의 집합',
      explanation: '알고리즘은 특정 문제를 해결하기 위한 유한하고 명확한 단계들의 절차입니다.',
      difficulty: 1,
    },
    {
      question: '정렬된 배열에서 값을 찾는 가장 효율적인 알고리즘은?',
      type: 'multiple_choice',
      options: ['선형 검색', '이진 검색', '랜덤 검색', '역순 검색'],
      correct: '이진 검색',
      explanation: '이진 검색은 O(log n)의 시간 복잡도로 선형 검색(O(n))보다 훨씬 빠릅니다.',
      difficulty: 2,
    },
    {
      question: '알고리즘의 조건이 아닌 것은?',
      type: 'multiple_choice',
      options: ['명확성', '유한성', '효율성', '화려한 UI'],
      correct: '화려한 UI',
      explanation: '알고리즘은 UI와 무관하며, 명확성/유한성/효율성/입출력/유효성이 핵심 조건입니다.',
      difficulty: 2,
    },
    {
      question: '일상생활에서 알고리즘의 예시를 하나 들고 설명하세요.',
      type: 'short_answer',
      correct: '요리 레시피는 재료(입력) → 조리 단계(절차) → 완성된 음식(출력)의 알고리즘적 구조를 가집니다.',
      explanation: '레시피는 명확한 단계, 유한한 과정, 특정 입력(재료)과 출력(음식)이 있어 알고리즘의 좋은 예시입니다.',
      difficulty: 2,
    },
  ],
}

// ============================================
// 하드코딩 플래시카드 (완료 노드 4개만)
// ============================================
const DEMO_FLASHCARDS: Record<string, Array<{ front: string; back: string }>> = {
  ai_intro: [
    { front: 'AI는 무엇을 하는 기술인가요?', back: '데이터로부터 학습하여 사람처럼 판단하고 결정을 내리는 기술입니다.' },
    { front: '약AI와 강AI의 차이는?', back: '약AI는 특정 작업만 잘 하고, 강AI는 인간처럼 다양한 일을 할 수 있는 범용 지능입니다.' },
    { front: '우리 일상 속 AI 예시 3가지를 말해보세요.', back: '음성 비서(시리/빅스비), 번역기, 유튜브/넷플릭스 추천 시스템' },
    { front: 'AI와 일반 프로그램의 가장 큰 차이점은?', back: '일반 프로그램은 정해진 규칙대로만 움직이지만, AI는 데이터에서 스스로 규칙을 학습합니다.' },
    { front: 'AI가 만들 수 있는 사회적 변화는?', back: '일자리 변화, 개인화 서비스 확대, 의료 진단 정확도 향상, 교육의 개인화 등이 있습니다.' },
  ],
  comp_history: [
    { front: '앨런 튜링의 주요 업적은?', back: '튜링 머신 개념으로 현대 컴퓨터 과학의 이론적 기반을 세웠습니다.' },
    { front: '폰 노이만 구조란?', back: '프로그램과 데이터를 같은 메모리에 저장하는 컴퓨터 구조 방식입니다.' },
    { front: 'ENIAC은 무엇인가요?', back: '1945년 개발된 최초의 범용 전자 디지털 컴퓨터입니다.' },
    { front: '컴퓨터의 4가지 기본 구성요소는?', back: '입력장치, 출력장치, 기억장치, 중앙처리장치(CPU)입니다.' },
    { front: '현대 컴퓨터의 발전 방향은?', back: '작아지고(소형화), 빨라지며(고속화), 저렴해지고(대중화), 연결되는(네트워크화) 방향입니다.' },
  ],
  data_info: [
    { front: '1바이트는 몇 비트?', back: '8비트입니다. 256가지(2⁸) 값을 표현할 수 있습니다.' },
    { front: '데이터와 정보의 차이는?', back: '데이터는 가공되지 않은 원재료, 정보는 데이터를 가공해 의미를 부여한 것입니다.' },
    { front: '10진수 5를 2진수로?', back: '101입니다. 4 + 0 + 1 = 2² + 2¹×0 + 2⁰' },
    { front: '컴퓨터가 0과 1만 쓰는 이유는?', back: '전기 신호의 ON/OFF 두 상태가 가장 안정적이고 오류가 적기 때문입니다.' },
    { front: 'KB, MB, GB의 관계는?', back: '1KB=1024B, 1MB=1024KB, 1GB=1024MB 순으로 커집니다.' },
  ],
  algo_basics: [
    { front: '알고리즘이란?', back: '특정 문제를 해결하기 위한 명확하고 유한한 단계의 집합입니다.' },
    { front: '이진 검색이 선형 검색보다 빠른 이유는?', back: '매 단계마다 탐색 범위가 절반으로 줄어들기 때문에 O(log n)의 속도를 가집니다.' },
    { front: '알고리즘의 5가지 조건은?', back: '입력, 출력, 명확성, 유한성, 효율성(유효성)입니다.' },
    { front: '일상 속 알고리즘의 예는?', back: '요리 레시피 — 재료 입력, 단계별 조리, 완성된 음식 출력의 구조를 가집니다.' },
    { front: '좋은 알고리즘의 기준은?', back: '같은 결과를 더 적은 시간과 메모리로 얻는 것 — 시간 복잡도와 공간 복잡도가 낮은 것이 좋습니다.' },
  ],
}
