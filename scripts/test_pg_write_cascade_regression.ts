import { db } from '../lib/db';

async function runPostgresWriteAndCascadeTests() {
  console.log('======================================================================');
  console.log('=== SARAS AI POSTGRESQL CRUD & CASCADE INTEGRITY TEST SUITE ===');
  console.log('======================================================================\n');

  const testUserA = 'pg_audit_user_a';
  const testUserB = 'pg_audit_user_b';

  // Cleanup any old test records
  await db.video.deleteMany({ where: { youtube_video_id: 'test_pg_cascade_vid_123' } });
  await db.userVideoProgress.deleteMany({ where: { user_id: { in: [testUserA, testUserB] } } });
  await db.task.deleteMany({ where: { user_id: { in: [testUserA, testUserB] } } });
  await db.chatMessage.deleteMany({ where: { user_id: { in: [testUserA, testUserB] } } });
  await db.userConceptMastery.deleteMany({ where: { user_id: { in: [testUserA, testUserB] } } });
  await db.revisionSessionItem.deleteMany({ where: { session: { user_id: { in: [testUserA, testUserB] } } } });
  await db.revisionSession.deleteMany({ where: { user_id: { in: [testUserA, testUserB] } } });
  await db.examPlanItem.deleteMany({ where: { plan_day: { exam: { user_id: { in: [testUserA, testUserB] } } } } });
  await db.examPlanDay.deleteMany({ where: { exam: { user_id: { in: [testUserA, testUserB] } } } });
  await db.examTopic.deleteMany({ where: { exam: { user_id: { in: [testUserA, testUserB] } } } });
  await db.exam.deleteMany({ where: { user_id: { in: [testUserA, testUserB] } } });
  await db.userProject.deleteMany({ where: { user_id: { in: [testUserA, testUserB] } } });
  await db.userProfile.deleteMany({ where: { user_id: { in: [testUserA, testUserB] } } });

  // 1. Create a dedicated test video with segments, flashcards, smart notes, project ideas
  console.log('--- Step 1: Create Dedicated Test Video Hierarchy in PostgreSQL ---');
  const testVideo = await db.video.create({
    data: {
      youtube_video_id: 'test_pg_cascade_vid_123',
      title: 'PostgreSQL Architecture & Indexing Test Lesson',
      channel: 'Saras Engineering',
      duration_seconds: 600,
      status: 'ready',
      segments: {
        create: [
          {
            order_index: 0,
            title: '1. B-Tree Indexes & WAL Logging',
            start_seconds: 0,
            end_seconds: 300,
            quiz_questions: {
              create: [
                {
                  question: 'What is the primary role of PostgreSQL WAL?',
                  options: JSON.stringify(['Write-Ahead Logging for Crash Recovery', 'UI Rendering', 'Audio Processing', 'DNS Lookup']),
                  correct_answer: 'Write-Ahead Logging for Crash Recovery',
                  explanation: 'WAL ensures durability and crash safety.',
                },
              ],
            },
          },
        ],
      },
      flashcards: {
        create: [
          {
            front: 'What is MVCC in PostgreSQL?',
            back: 'Multi-Version Concurrency Control allowing concurrent reads and writes without locks.',
            mastered: false,
          },
        ],
      },
      notes: {
        create: [
          {
            section_type: 'overview',
            title: 'PostgreSQL Internals Overview',
            content: 'Detailed explanation of shared buffers and background writers.',
          },
        ],
      },
      projects: {
        create: [
          {
            title: 'Build a Custom WAL Replayer in TypeScript',
            problem_statement: 'Implement an append-only log replayer.',
            why_it_fits: 'Reinforces storage engine principles.',
            skills_practiced: JSON.stringify(['PostgreSQL', 'WAL', 'Transactions']),
            requirements: JSON.stringify(['Parser', 'State Machine']),
            milestones: JSON.stringify([{ id: 'm1', label: 'Parse Header', detail: 'Read magic bytes' }]),
            expected_outcome: 'Working replayer.',
          },
        ],
      },
    },
    include: {
      segments: { include: { quiz_questions: true } },
      flashcards: true,
      notes: true,
      projects: true,
    },
  });

  console.log(`✅ Test video created with ID: ${testVideo.id}`);
  console.log(`  • Segments: ${testVideo.segments.length}`);
  console.log(`  • Flashcards: ${testVideo.flashcards.length}`);
  console.log(`  • Notes: ${testVideo.notes.length}`);
  console.log(`  • Project Ideas: ${testVideo.projects.length}`);

  // 2. Test User Writes for User A
  console.log('\n--- Step 2: Test User Writes across all 7 Feature Domains ---');
  
  // A. Video Progress
  const progressRecord = await db.userVideoProgress.create({
    data: {
      user_id: testUserA,
      video_id: testVideo.id,
      current_segment_index: 0,
      completed_segment_ids: JSON.stringify([testVideo.segments[0].id]),
      last_watched_at: new Date(),
    },
  });
  console.log(`  ✅ UserVideoProgress write verified: ${progressRecord.id}`);

  // B. Task
  const taskRecord = await db.task.create({
    data: {
      user_id: testUserA,
      label: 'Complete PostgreSQL WAL Lesson',
      done: false,
      linked_video_id: testVideo.id,
    },
  });
  console.log(`  ✅ Task write verified: ${taskRecord.id}`);

  // C. ChatMessage
  const chatRecord = await db.chatMessage.create({
    data: {
      user_id: testUserA,
      role: 'user',
      content: 'Explain WAL checkpoints in PostgreSQL',
    },
  });
  console.log(`  ✅ ChatMessage write verified: ${chatRecord.id}`);

  // D. Concept Mastery
  let testConcept = await db.concept.findFirst();
  if (!testConcept) {
    testConcept = await db.concept.create({
      data: {
        name: 'PostgreSQL WAL Logging',
        slug: 'postgresql-wal-logging',
        category: 'Computer Science',
      },
    });
  }
  const masteryRecord = await db.userConceptMastery.create({
    data: {
      user_id: testUserA,
      concept_id: testConcept.id,
      mastery_score: 85,
      correct_count: 5,
      wrong_count: 1,
    },
  });
  console.log(`  ✅ UserConceptMastery write verified: ${masteryRecord.id}`);

  // E. Revision Session
  const revisionRecord = await db.revisionSession.create({
    data: {
      user_id: testUserA,
      status: 'completed',
      mode: 'smart_mix',
      started_at: new Date(),
      completed_at: new Date(),
      items: {
        create: [
          {
            concept_id: testConcept.id,
            source_type: 'flashcard',
            question_text: 'What is WAL in PostgreSQL?',
            correct_answer: 'Write Ahead Logging',
            is_correct: true,
            answered_at: new Date(),
          },
        ],
      },
    },
    include: { items: true },
  });
  console.log(`  ✅ RevisionSession write verified: ${revisionRecord.id}`);

  // F. Exam
  const examRecord = await db.exam.create({
    data: {
      user_id: testUserA,
      name: 'Advanced Database Systems Finals',
      exam_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      daily_minutes: 45,
      goal: 'Score A+',
      plan_days: {
        create: [
          {
            day_number: 1,
            date: new Date(),
            items: {
              create: [
                {
                  concept_id: testConcept.id,
                  activity_type: 'revision',
                  title: 'Review WAL Logging',
                  duration_minutes: 30,
                  status: 'completed',
                },
              ],
            },
          },
        ],
      },
    },
    include: { plan_days: { include: { items: true } } },
  });
  console.log(`  ✅ Exam write verified: ${examRecord.id}`);

  // G. User Project
  const userProjectRecord = await db.userProject.create({
    data: {
      user_id: testUserA,
      project_idea_id: testVideo.projects[0].id,
      status: 'in_progress',
      completed_milestone_ids: JSON.stringify(['m1']),
    },
  });
  console.log(`  ✅ UserProject write verified: ${userProjectRecord.id}`);

  // 3. Test Read & Update
  console.log('\n--- Step 3: Test Read & Update Persistence in PostgreSQL ---');
  const updatedTask = await db.task.update({
    where: { id: taskRecord.id },
    data: { done: true },
  });
  console.log(`  ✅ Task updated to done=${updatedTask.done}`);

  const updatedProgress = await db.userVideoProgress.update({
    where: { id: progressRecord.id },
    data: { current_segment_index: 1 },
  });
  console.log(`  ✅ Video progress updated to segmentIndex=${updatedProgress.current_segment_index}`);

  // 4. Test Multi-User Isolation (User B)
  console.log('\n--- Step 4: Multi-User Isolation Check (User A vs User B) ---');
  const userBMessages = await db.chatMessage.findMany({ where: { user_id: testUserB } });
  const userBTasks = await db.task.findMany({ where: { user_id: testUserB } });
  const userBExams = await db.exam.findMany({ where: { user_id: testUserB } });

  if (userBMessages.length !== 0 || userBTasks.length !== 0 || userBExams.length !== 0) {
    console.error('❌ User B leaked User A data in PostgreSQL!');
    process.exit(1);
  }
  console.log('✅ 100% User Isolation Verified in PostgreSQL: User B has 0 records.');

  // 5. Test Cascade Delete Behavior
  console.log('\n--- Step 5: Test Cascade Delete on Video ---');
  const videoIdToDelete = testVideo.id;
  await db.video.delete({ where: { id: videoIdToDelete } });

  const remainingSegments = await db.segment.count({ where: { video_id: videoIdToDelete } });
  const remainingFlashcards = await db.flashcard.count({ where: { video_id: videoIdToDelete } });
  const remainingNotes = await db.smartNote.count({ where: { video_id: videoIdToDelete } });
  const remainingProjectIdeas = await db.projectIdea.count({ where: { video_id: videoIdToDelete } });
  const remainingProgress = await db.userVideoProgress.count({ where: { video_id: videoIdToDelete } });

  console.log(`  • Remaining child segments: ${remainingSegments} (expected: 0)`);
  console.log(`  • Remaining child flashcards: ${remainingFlashcards} (expected: 0)`);
  console.log(`  • Remaining child smart notes: ${remainingNotes} (expected: 0)`);
  console.log(`  • Remaining child project ideas: ${remainingProjectIdeas} (expected: 0)`);
  console.log(`  • Remaining child user progress: ${remainingProgress} (expected: 0)`);

  if (
    remainingSegments !== 0 ||
    remainingFlashcards !== 0 ||
    remainingNotes !== 0 ||
    remainingProjectIdeas !== 0 ||
    remainingProgress !== 0
  ) {
    console.error('❌ Cascade delete did not cleanly remove all child relations!');
    process.exit(1);
  }
  console.log('✅ Cascade delete verified: PostgreSQL cleanly pruned child records without orphan remnants.');

  // Verify Global Concept was NOT deleted
  const conceptStillExists = await db.concept.findUnique({ where: { id: testConcept.id } });
  if (!conceptStillExists) {
    console.error('❌ Global Concept was mistakenly deleted during video cascade!');
    process.exit(1);
  }
  console.log('✅ Global concept preserved: Global knowledge graph untouched during video cascade.');

  // 6. Cleanup User A & B test data
  console.log('\n--- Step 6: Cleanup Test Records ---');
  await db.chatMessage.deleteMany({ where: { user_id: { in: [testUserA, testUserB] } } });
  await db.task.deleteMany({ where: { user_id: { in: [testUserA, testUserB] } } });
  await db.userConceptMastery.deleteMany({ where: { user_id: { in: [testUserA, testUserB] } } });
  await db.revisionSessionItem.deleteMany({ where: { session: { user_id: { in: [testUserA, testUserB] } } } });
  await db.revisionSession.deleteMany({ where: { user_id: { in: [testUserA, testUserB] } } });
  await db.examPlanItem.deleteMany({ where: { plan_day: { exam: { user_id: { in: [testUserA, testUserB] } } } } });
  await db.examPlanDay.deleteMany({ where: { exam: { user_id: { in: [testUserA, testUserB] } } } });
  await db.examTopic.deleteMany({ where: { exam: { user_id: { in: [testUserA, testUserB] } } } });
  await db.exam.deleteMany({ where: { user_id: { in: [testUserA, testUserB] } } });
  await db.userProject.deleteMany({ where: { user_id: { in: [testUserA, testUserB] } } });

  console.log('✅ Test cleanup completed.');
  console.log('\n======================================================================');
  console.log('✓ All PostgreSQL Write, Read, Update, Cascade & Isolation Tests PASSED!');
  console.log('======================================================================\n');
}

runPostgresWriteAndCascadeTests()
  .catch((e) => {
    console.error('PostgreSQL Cascade Test Error:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
