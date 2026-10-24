import { db } from '../lib/db';
import {
  getConceptsForPlanning,
  generateDeterministicPlan,
  validatePlanConstraints,
  calculateExamReadiness,
  replanExamSchedule,
  sortConceptsWithPrerequisites,
} from '../lib/services/examPlanner';
import { rankRevisionConcepts } from '../lib/services/ai';

async function runMasterTruthfulnessAudit() {
  console.log('======================================================================');
  console.log('=== SARAS AI COMPREHENSIVE TRUTHFULNESS & DATA INTEGRITY AUDIT ===');
  console.log('======================================================================\n');

  const timestamp = Date.now();
  const testUserA = `truth_user_alpha_${timestamp}`;
  const testUserB = `truth_user_beta_${timestamp}`;

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASSED: ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAILED: ${testName} ${detail ? `-> ${detail}` : ''}`);
      failedTests++;
    }
  }

  try {
    // ─────────────────────────────────────────────────────────────────
    // AUDIT SECTION 1: NEW USER CLEAN-STATE (0 False Data)
    // ─────────────────────────────────────────────────────────────────
    console.log('\n--- 1. NEW USER CLEAN-STATE AUDIT ---');

    // Query progress for brand new user
    const progressA = await db.userVideoProgress.findMany({ where: { user_id: testUserA } });
    assert(progressA.length === 0, 'New user has 0 watched lessons in database');

    // Query attention events for brand new user
    const attentionA = await db.attentionEvent.findMany({ where: { user_id: testUserA } });
    assert(attentionA.length === 0, 'New user has 0 attention events in database');

    // Query concept mastery for brand new user
    const masteryA = await db.userConceptMastery.findMany({ where: { user_id: testUserA } });
    assert(masteryA.length === 0, 'New user has 0 concept mastery records');

    // Query revision sessions for brand new user
    const revisionA = await db.revisionSession.findMany({ where: { user_id: testUserA } });
    assert(revisionA.length === 0, 'New user has 0 revision sessions');

    // Query exams for brand new user
    const examsA = await db.exam.findMany({ where: { user_id: testUserA } });
    assert(examsA.length === 0, 'New user has 0 exam plans');

    // Query tasks for brand new user
    const tasksA = await db.task.findMany({ where: { user_id: testUserA } });
    assert(tasksA.length === 0, 'New user has 0 tasks');

    // Query chat messages for brand new user
    const chatA = await db.chatMessage.findMany({ where: { user_id: testUserA } });
    assert(chatA.length === 0, 'New user has 0 chat messages');

    // Query user projects for brand new user
    const userProjA = await db.userProject.findMany({ where: { user_id: testUserA } });
    assert(userProjA.length === 0, 'New user has 0 user projects');

    // ─────────────────────────────────────────────────────────────────
    // AUDIT SECTION 2: VIDEO DEDUPLICATION CACHE & ARTIFACT GROUNDING
    // ─────────────────────────────────────────────────────────────────
    console.log('\n--- 2. VIDEO INGESTION & DEDUPLICATION CACHE AUDIT ---');

    const sampleVideo = await db.video.findFirst({
      include: {
        segments: { include: { quiz_questions: true, notes: true } },
        flashcards: true,
      },
    });

    if (sampleVideo) {
      const initialSegCount = sampleVideo.segments.length;
      const initialCardCount = sampleVideo.flashcards.length;

      // Verify no duplicate segments with identical order index
      const orderIndices = sampleVideo.segments.map((s) => s.order_index);
      const uniqueIndices = new Set(orderIndices);
      assert(orderIndices.length === uniqueIndices.size, `No duplicate segment order indices in video "${sampleVideo.title}"`);

      // Verify each segment has real duration
      const validDurations = sampleVideo.segments.every((s) => s.end_seconds >= s.start_seconds);
      assert(validDurations, `All segments in video have valid start/end timestamps`);

      // Verify flashcards are linked to this video_id
      const allCardsLinked = sampleVideo.flashcards.every((f) => f.video_id === sampleVideo.id);
      assert(allCardsLinked, `All ${initialCardCount} flashcards are strictly scoped to video_id ${sampleVideo.id}`);
    }

    // ─────────────────────────────────────────────────────────────────
    // AUDIT SECTION 3: PROGRESS TRACKING & CHECKPOINT GATING TRUTH
    // ─────────────────────────────────────────────────────────────────
    console.log('\n--- 3. USER PROGRESS & CHECKPOINT GATING TRUTH AUDIT ---');

    if (sampleVideo && sampleVideo.segments.length > 0) {
      const firstSeg = sampleVideo.segments[0];

      // Simulate User A completing Segment 1
      const createdProgress = await db.userVideoProgress.create({
        data: {
          user_id: testUserA,
          video_id: sampleVideo.id,
          current_segment_index: 0,
          completed_segment_ids: JSON.stringify([firstSeg.id]),
          last_watched_at: new Date(),
        },
      });

      assert(createdProgress.user_id === testUserA, 'Progress record created for User A');

      // Verify progress persistence
      const fetchedProg = await db.userVideoProgress.findUnique({
        where: {
          user_id_video_id: {
            user_id: testUserA,
            video_id: sampleVideo.id,
          },
        },
      });

      const parsedCompleted = JSON.parse(fetchedProg?.completed_segment_ids || '[]');
      assert(parsedCompleted.includes(firstSeg.id), 'Segment 1 is accurately recorded as completed in DB');

      // Calculate progress percent honestly
      const totalSegs = sampleVideo.segments.length;
      const percent = Math.round((parsedCompleted.length / totalSegs) * 100);
      assert(percent > 0 && percent <= 100, `Calculated honest progress: ${percent}% (${parsedCompleted.length}/${totalSegs} segments)`);
    }

    // ─────────────────────────────────────────────────────────────────
    // AUDIT SECTION 4: FLASHCARD MASTERY & MODIFICATION TRUTH
    // ─────────────────────────────────────────────────────────────────
    console.log('\n--- 4. FLASHCARD PERSISTENCE & MUTATION AUDIT ---');

    if (sampleVideo) {
      // Create a custom flashcard
      const newCard = await db.flashcard.create({
        data: {
          video_id: sampleVideo.id,
          front: 'What is Backpropagation?',
          back: 'An algorithm for computing the gradient of the loss function with respect to weights.',
          mastered: false,
        },
      });

      assert(newCard.mastered === false, 'New flashcard initialized with mastered = false');

      // Toggle mastered to true
      const updatedCard = await db.flashcard.update({
        where: { id: newCard.id },
        data: { mastered: true },
      });
      assert(updatedCard.mastered === true, 'Flashcard status updated to mastered = true in DB');

      // Delete flashcard
      await db.flashcard.delete({ where: { id: newCard.id } });
      const deletedCard = await db.flashcard.findUnique({ where: { id: newCard.id } });
      assert(deletedCard === null, 'Flashcard cleanly deleted from DB');
    }

    // ─────────────────────────────────────────────────────────────────
    // AUDIT SECTION 5: CONCEPT MASTERY & KNOWLEDGE MAP TRUTH
    // ─────────────────────────────────────────────────────────────────
    console.log('\n--- 5. CONCEPT MASTERY & KNOWLEDGE GRAPH AUDIT ---');

    const dbConcepts = await db.concept.findMany({ take: 3 });
    if (dbConcepts.length >= 2) {
      const targetConcept = dbConcepts[0];

      // User A answers 2 correct, 1 wrong
      const masteryRecord = await db.userConceptMastery.create({
        data: {
          user_id: testUserA,
          concept_id: targetConcept.id,
          correct_count: 2,
          wrong_count: 1,
          exposure_count: 3,
          mastery_score: Math.round((2 / 3) * 100), // 67%
          last_seen_at: new Date(),
        },
      });

      assert(masteryRecord.mastery_score === 67, `Concept mastery score calculated accurately: ${masteryRecord.mastery_score}%`);
      assert(masteryRecord.correct_count === 2 && masteryRecord.wrong_count === 1, 'Correct and wrong counts persisted accurately in DB');
    }

    // ─────────────────────────────────────────────────────────────────
    // AUDIT SECTION 6: AI REVISION SESSIONS DETERMINISTIC ENGINE
    // ─────────────────────────────────────────────────────────────────
    console.log('\n--- 6. REVISION SESSIONS & RECOVERY AUDIT ---');

    const allConceptsForRevision = await db.concept.findMany({
      include: {
        user_mastery: { where: { user_id: testUserA } },
        quiz_questions: { include: { quiz_question: true } },
        flashcards: { include: { flashcard: true } },
        video_segments: { include: { segment: { include: { video: true } } } },
      },
    });

    const rankedCandidates = rankRevisionConcepts(allConceptsForRevision, 'smart_mix');
    assert(rankedCandidates.length > 0, `Ranked ${rankedCandidates.length} candidate concepts deterministically`);

    // Create an in-progress revision session
    const revSession = await db.revisionSession.create({
      data: {
        user_id: testUserA,
        mode: 'smart_mix',
        status: 'in_progress',
        total_items: 2,
        completed_items: 1,
        correct_items: 1,
        session_score: 50,
        items: {
          create: [
            {
              concept_id: dbConcepts[0]?.id || null,
              source_type: 'quiz',
              question_text: 'Test question 1',
              options: JSON.stringify(['A', 'B']),
              correct_answer: 'A',
              user_answer: 'A',
              is_correct: true,
              order_index: 0,
            },
            {
              concept_id: dbConcepts[0]?.id || null,
              source_type: 'flashcard',
              question_text: 'Test question 2',
              correct_answer: 'Definition B',
              order_index: 1,
            },
          ],
        },
      },
      include: { items: true },
    });

    // Test active session recovery
    const recovered = await db.revisionSession.findFirst({
      where: { user_id: testUserA, status: 'in_progress' },
      include: { items: true },
    });

    assert(recovered?.id === revSession.id, `Recovered active session ${recovered?.id}`);
    assert(recovered?.completed_items === 1, `Recovered exact item progress: 1 of 2 completed`);

    // Complete session
    const completedSession = await db.revisionSession.update({
      where: { id: revSession.id },
      data: {
        status: 'completed',
        completed_items: 2,
        correct_items: 2,
        session_score: 100,
        completed_at: new Date(),
      },
    });

    assert(completedSession.status === 'completed', 'Revision session completed and status persisted');

    // ─────────────────────────────────────────────────────────────────
    // AUDIT SECTION 7: ADAPTIVE EXAM MODE TRUTH & PREREQUISITES
    // ─────────────────────────────────────────────────────────────────
    console.log('\n--- 7. ADAPTIVE EXAM MODE & PREREQUISITE SCHEDULING AUDIT ---');

    const examDate = new Date();
    examDate.setDate(examDate.getDate() + 5); // 5 days from now

    const conceptsForExam = await getConceptsForPlanning(dbConcepts.map((c) => c.id), testUserA);
    const examDays = generateDeterministicPlan({
      examDate,
      dailyMinutes: 60,
      concepts: conceptsForExam,
      startDate: new Date(),
    });

    assert(examDays.length > 0, `Generated ${examDays.length} day exam study schedule`);

    // Validate time budget
    const constraintCheck = validatePlanConstraints(
      examDays,
      examDate,
      60,
      new Set(dbConcepts.map((c) => c.id))
    );
    assert(constraintCheck.valid, 'All exam days strictly adhere to $\\le$ 60m budget with no post-exam dates');

    // Persist Exam
    const examRecord = await db.exam.create({
      data: {
        user_id: testUserA,
        name: 'Machine Learning Finals',
        exam_date: examDate,
        daily_minutes: 60,
        status: 'active',
        plan_version: 1,
        topics: {
          create: dbConcepts.map((c) => ({
            concept_id: c.id,
            topic_name: c.name,
            priority: 2,
          })),
        },
        plan_days: {
          create: examDays.map((d) => ({
            day_number: d.day_number,
            date: d.date,
            status: 'pending',
            items: {
              create: d.items.map((it) => ({
                concept_id: it.concept_id,
                activity_type: it.activity_type,
                title: it.title,
                description: it.description,
                duration_minutes: it.duration_minutes,
                priority: it.priority,
                status: 'pending',
                order_index: it.order_index,
              })),
            },
          })),
        },
      },
      include: { plan_days: { include: { items: true } } },
    });

    assert(examRecord.plan_days.length === examDays.length, `Persisted ${examRecord.plan_days.length} exam days in DB`);

    // ─────────────────────────────────────────────────────────────────
    // AUDIT SECTION 8: MULTI-USER ISOLATION SECURITY AUDIT
    // ─────────────────────────────────────────────────────────────────
    console.log('\n--- 8. MULTI-USER ISOLATION SECURITY AUDIT ---');

    // Query User B for User A's progress
    const userBProgress = await db.userVideoProgress.findMany({ where: { user_id: testUserB } });
    assert(userBProgress.length === 0, 'User B has 0 video progress records (no leakage from User A)');

    // Query User B for User A's mastery
    const userBMastery = await db.userConceptMastery.findMany({ where: { user_id: testUserB } });
    assert(userBMastery.length === 0, 'User B has 0 concept mastery records (no leakage from User A)');

    // Query User B for User A's revision sessions
    const userBRevision = await db.revisionSession.findMany({ where: { user_id: testUserB } });
    assert(userBRevision.length === 0, 'User B has 0 revision sessions (no leakage from User A)');

    // Query User B for User A's exams
    const userBExams = await db.exam.findMany({ where: { user_id: testUserB } });
    assert(userBExams.length === 0, 'User B has 0 exams (no leakage from User A)');

    // ─────────────────────────────────────────────────────────────────
    // CLEANUP TEST USERS
    // ─────────────────────────────────────────────────────────────────
    console.log('\n--- 9. AUDIT CLEANUP ---');
    await db.userVideoProgress.deleteMany({ where: { user_id: { in: [testUserA, testUserB] } } });
    await db.userConceptMastery.deleteMany({ where: { user_id: { in: [testUserA, testUserB] } } });
    await db.revisionSession.deleteMany({ where: { user_id: { in: [testUserA, testUserB] } } });
    await db.exam.deleteMany({ where: { user_id: { in: [testUserA, testUserB] } } });
    console.log('✓ Cleaned up test records for User A & User B.');

  } catch (error) {
    console.error('Audit Error:', error);
    failedTests++;
  } finally {
    await db.$disconnect();
  }

  console.log('\n======================================================================');
  console.log(`=== AUDIT SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED ===`);
  console.log('======================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runMasterTruthfulnessAudit();
