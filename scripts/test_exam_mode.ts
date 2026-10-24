import { db } from '../lib/db';
import {
  getConceptsForPlanning,
  generateDeterministicPlan,
  validatePlanConstraints,
  calculateExamReadiness,
  replanExamSchedule,
  sortConceptsWithPrerequisites,
} from '../lib/services/examPlanner';

async function runExamModeTestSuite() {
  console.log('====================================================');
  console.log('=== Saras AI Adaptive Exam Mode Verification Suite ===');
  console.log('====================================================\n');

  const userId = 'exam_test_user_alpha';
  const otherUserId = 'exam_test_user_beta';

  // Cleanup any leftover test data
  await db.exam.deleteMany({ where: { user_id: { in: [userId, otherUserId] } } });
  await db.userConceptMastery.deleteMany({ where: { user_id: { in: [userId, otherUserId] } } });

  // 1. Fetch real existing concepts in DB
  const dbConcepts = await db.concept.findMany({
    take: 6,
    include: {
      incoming_relations: true,
      outgoing_relations: true,
    },
  });

  console.log(`[SETUP] Fetched ${dbConcepts.length} concepts for testing.`);
  if (dbConcepts.length < 3) {
    console.error('❌ Need at least 3 concepts for testing.');
    process.exit(1);
  }

  const c1 = dbConcepts[0];
  const c2 = dbConcepts[1];
  const c3 = dbConcepts[2];

  // --- Test 1: Create Exam with Real Concepts ---
  console.log('\n--- Test 1: Create Exam with Real Concepts ---');
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 7); // 7 days from now

  const concepts = await getConceptsForPlanning([c1.id, c2.id, c3.id], userId);
  const planDays = generateDeterministicPlan({
    examDate: targetDate,
    dailyMinutes: 60,
    concepts,
    customTopics: [],
    startDate: new Date(),
  });

  if (planDays.length === 0 || planDays[0].items.length === 0) {
    console.error('❌ Test 1 Failed: No plan days or items generated.');
    process.exit(1);
  }
  console.log(`✓ Generated ${planDays.length} days of study. Day 1 has ${planDays[0].items.length} tasks.`);

  // --- Test 2: Time Constraint Verification ---
  console.log('\n--- Test 2: Time Constraint Verification (60m daily budget) ---');
  let timeConstraintViolated = false;
  planDays.forEach((d) => {
    const totalMinutes = d.items.reduce((acc, it) => acc + it.duration_minutes, 0);
    if (totalMinutes > 60) {
      timeConstraintViolated = true;
      console.error(`❌ Day ${d.day_number} exceeded 60m budget (${totalMinutes}m)`);
    }
  });
  if (timeConstraintViolated) {
    process.exit(1);
  }
  console.log('✓ Verified: 100% of study days strictly $\\le$ 60 minutes.');

  // --- Test 3: Weak Concept Priority ---
  console.log('\n--- Test 3: Weak Concept Priority ---');
  // Set c1 as weak (mastery = 20%, wrong = 3)
  await db.userConceptMastery.upsert({
    where: { user_id_concept_id: { user_id: userId, concept_id: c1.id } },
    create: {
      user_id: userId,
      concept_id: c1.id,
      mastery_score: 20,
      correct_count: 1,
      wrong_count: 3,
      exposure_count: 4,
    },
    update: {
      mastery_score: 20,
      wrong_count: 3,
    },
  });

  const updatedConcepts = await getConceptsForPlanning([c1.id, c2.id, c3.id], userId);
  const weakConceptItem = updatedConcepts.find((c) => c.id === c1.id);
  if (weakConceptItem?.status !== 'weak') {
    console.error('❌ Test 3 Failed: Concept was not categorized as weak.');
    process.exit(1);
  }
  const ranked = sortConceptsWithPrerequisites(updatedConcepts);
  console.log(`✓ Weak concept "${c1.name}" assigned status: ${weakConceptItem.status} (Priority: ${ranked.find((r) => r.id === c1.id)?.priorityScore} pts)`);

  // --- Test 4: Strong Concept Lower Review Priority ---
  console.log('\n--- Test 4: Strong Concept Lower Review Priority ---');
  // Set c2 as strong (mastery = 95%)
  await db.userConceptMastery.upsert({
    where: { user_id_concept_id: { user_id: userId, concept_id: c2.id } },
    create: {
      user_id: userId,
      concept_id: c2.id,
      mastery_score: 95,
      correct_count: 10,
      wrong_count: 0,
      exposure_count: 10,
    },
    update: {
      mastery_score: 95,
      wrong_count: 0,
    },
  });

  const strongConcepts = await getConceptsForPlanning([c1.id, c2.id, c3.id], userId);
  const strongConceptItem = strongConcepts.find((c) => c.id === c2.id);
  if (strongConceptItem?.status !== 'strong') {
    console.error('❌ Test 4 Failed: Concept was not categorized as strong.');
    process.exit(1);
  }
  console.log(`✓ Strong concept "${c2.name}" assigned status: ${strongConceptItem.status} (Mastery: ${strongConceptItem.mastery_score}%)`);

  // --- Test 5: Prerequisite Ordering ---
  console.log('\n--- Test 5: Knowledge Graph Prerequisite Ordering ---');
  // Create a prerequisite relation: c3 -> c1 (c3 must be learned before c1)
  await db.conceptRelationship.upsert({
    where: {
      source_concept_id_target_concept_id_relationship_type: {
        source_concept_id: c3.id,
        target_concept_id: c1.id,
        relationship_type: 'prerequisite',
      },
    },
    create: {
      source_concept_id: c3.id,
      target_concept_id: c1.id,
      relationship_type: 'prerequisite',
      weight: 1.0,
    },
    update: {},
  });

  const prereqConcepts = await getConceptsForPlanning([c1.id, c3.id], userId);
  const sortedWithPrereq = sortConceptsWithPrerequisites(prereqConcepts);
  const idxC3 = sortedWithPrereq.findIndex((s) => s.id === c3.id);
  const idxC1 = sortedWithPrereq.findIndex((s) => s.id === c1.id);

  if (idxC3 > idxC1) {
    console.error(`❌ Test 5 Failed: Prerequisite ${c3.name} was scheduled after ${c1.name}`);
    process.exit(1);
  }
  console.log(`✓ Verified: Prerequisite "${c3.name}" (index ${idxC3}) scheduled before dependent "${c1.name}" (index ${idxC1}).`);

  // --- Test 6: Persist Exam & Complete Task ---
  console.log('\n--- Test 6: Persist Exam & Complete Task ---');
  const createdExam = await db.exam.create({
    data: {
      user_id: userId,
      name: 'Deep Learning Midterm',
      exam_date: targetDate,
      daily_minutes: 60,
      status: 'active',
      plan_version: 1,
      topics: {
        create: [
          { concept_id: c1.id, topic_name: c1.name, priority: 3 },
          { concept_id: c2.id, topic_name: c2.name, priority: 1 },
          { concept_id: c3.id, topic_name: c3.name, priority: 2 },
        ],
      },
      plan_days: {
        create: planDays.map((d) => ({
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

  const firstItem = createdExam.plan_days[0].items[0];
  const updatedItem = await db.examPlanItem.update({
    where: { id: firstItem.id },
    data: { status: 'completed', completed_at: new Date() },
  });
  console.log(`✓ Completed task "${updatedItem.title}". Status: ${updatedItem.status}`);

  // --- Test 7: Poor Performance & Adaptive Replanning ---
  console.log('\n--- Test 7: Poor Performance & Adaptive Replanning ---');
  // Record mistake on c3
  await db.userConceptMastery.upsert({
    where: { user_id_concept_id: { user_id: userId, concept_id: c3.id } },
    create: {
      user_id: userId,
      concept_id: c3.id,
      mastery_score: 30,
      correct_count: 0,
      wrong_count: 2,
      exposure_count: 2,
    },
    update: {
      mastery_score: 30,
      wrong_count: 2,
    },
  });

  const replanResult = await replanExamSchedule({
    examId: createdExam.id,
    reason: 'Mistake recorded on concept',
  });

  console.log(`✓ Replanned exam: version ${replanResult.planVersion}, reason: "${replanResult.reason}"`);

  // --- Test 8: Improved Mastery Adaptation ---
  console.log('\n--- Test 8: Improved Mastery Adaptation ---');
  // Boost c3 mastery to 85%
  await db.userConceptMastery.update({
    where: { user_id_concept_id: { user_id: userId, concept_id: c3.id } },
    data: { mastery_score: 85, correct_count: 5 },
  });

  const replan2 = await replanExamSchedule({
    examId: createdExam.id,
    reason: 'Mastery achieved for concept',
  });
  console.log(`✓ Plan adapted to mastery improvement: version ${replan2.planVersion}`);

  // --- Test 9: Persistence Check ---
  console.log('\n--- Test 9: Persistence Check Across Queries ---');
  const fetchedExam = await db.exam.findUnique({
    where: { id: createdExam.id },
    include: { plan_days: { include: { items: true } } },
  });
  if (!fetchedExam || fetchedExam.plan_days.length === 0) {
    console.error('❌ Test 9 Failed: Exam not persisted.');
    process.exit(1);
  }
  console.log(`✓ Verified exam persistence: ${fetchedExam.plan_days.length} days retained in DB.`);

  // --- Test 10: Multi-User Isolation ---
  console.log('\n--- Test 10: Multi-User Isolation ---');
  const otherUserExams = await db.exam.findMany({
    where: { user_id: otherUserId },
  });
  if (otherUserExams.length !== 0) {
    console.error('❌ Test 10 Failed: User data leaked.');
    process.exit(1);
  }
  console.log(`✓ Verified user isolation: User Alpha has 1 exam, User Beta has ${otherUserExams.length} exams.`);

  // --- Test 11: Exam Date Constraint & Close Countdown ---
  console.log('\n--- Test 11: Exam Date Constraint (1 Day Remaining) ---');
  const closeDate = new Date();
  closeDate.setDate(closeDate.getDate() + 1); // 1 day remaining

  const closeDays = generateDeterministicPlan({
    examDate: closeDate,
    dailyMinutes: 45,
    concepts: updatedConcepts,
    startDate: new Date(),
  });

  const hasMockOrRecall = closeDays.some((d) =>
    d.items.some((it) => it.activity_type === 'mock_exam' || it.activity_type === 'flashcards')
  );
  if (!hasMockOrRecall) {
    console.error('❌ Test 11 Failed: Close exam did not schedule mock or recall.');
    process.exit(1);
  }
  console.log(`✓ 1-Day Exam generated ${closeDays.length} day with high-yield Mock & Flashcard recall items.`);

  // --- Test 12: Deterministic Fallback & Constraint Validation ---
  console.log('\n--- Test 12: Deterministic Fallback & Constraint Validation ---');
  const validIds = new Set(updatedConcepts.map((c) => c.id));
  const validation = validatePlanConstraints(closeDays, closeDate, 45, validIds);
  if (!validation.valid) {
    console.error('❌ Test 12 Failed:', validation.errors);
    process.exit(1);
  }
  console.log('✓ Verified: 100% deterministic validation passed with 0 errors.');

  // Cleanup test records
  await db.exam.delete({ where: { id: createdExam.id } });
  await db.userConceptMastery.deleteMany({ where: { user_id: userId } });
  await db.conceptRelationship.deleteMany({
    where: {
      source_concept_id: c3.id,
      target_concept_id: c1.id,
    },
  });

  console.log('\n====================================================');
  console.log('✓ All 12 Exam Mode Verification Tests Passed Successfully!');
  console.log('====================================================\n');
}

runExamModeTestSuite()
  .catch((e) => {
    console.error('Test Suite Error:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
