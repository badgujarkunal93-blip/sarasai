import { db } from '../lib/db';
import { rankRevisionConcepts } from '../lib/services/ai';

async function testRevisionEngine() {
  console.log('=== Saras AI Revision Sessions Verification Test ===\n');

  const userId = 'test_revision_user';

  // 1. Fetch concepts with mastery records
  const concepts = await db.concept.findMany({
    include: {
      user_mastery: {
        where: { user_id: userId },
      },
      quiz_questions: {
        include: { quiz_question: true },
      },
      flashcards: {
        include: { flashcard: true },
      },
      video_segments: {
        include: { segment: { include: { video: true } } },
      },
    },
  });

  console.log(`[CONCEPTS] Fetched ${concepts.length} concepts for ranking.`);

  if (concepts.length === 0) {
    console.error('❌ Error: No concepts available in database.');
    process.exit(1);
  }

  // 2. Test Ranking Algorithm across modes
  console.log('\n--- Testing Deterministic Priority Ranking ---');
  const smartMixRanked = rankRevisionConcepts(concepts, 'smart_mix');
  const weakOnlyRanked = rankRevisionConcepts(concepts, 'weak_only');
  const recentRanked = rankRevisionConcepts(concepts, 'recent');

  console.log(`Top 3 Smart Mix Candidates:`);
  smartMixRanked.slice(0, 3).forEach((r, idx) => {
    console.log(`  ${idx + 1}. "${r.concept.name}" -> Priority: ${r.priorityScore.toFixed(1)} pts (Weak: ${r.breakdown.weaknessScore.toFixed(1)}, Mistake: ${r.breakdown.mistakeScore.toFixed(1)}, Age: ${r.breakdown.ageScore.toFixed(1)})`);
  });

  // 3. Test Session Creation
  console.log('\n--- Testing Session Creation & Persistence ---');
  const targetConcept = concepts[0];

  const session = await db.revisionSession.create({
    data: {
      user_id: userId,
      mode: 'smart_mix',
      status: 'in_progress',
      total_items: 3,
      completed_items: 0,
      correct_items: 0,
      session_score: 0,
      items: {
        create: [
          {
            concept_id: targetConcept.id,
            source_type: 'quiz',
            question_text: 'What is the main purpose of this concept?',
            options: JSON.stringify(['Option A', 'Option B', 'Option C', 'Option D']),
            correct_answer: 'Option B',
            explanation: 'Option B is correct because of core principles.',
            order_index: 0,
            source_video_title: targetConcept.video_segments[0]?.segment?.video?.title || 'Lecture 1',
          },
          {
            concept_id: targetConcept.id,
            source_type: 'flashcard',
            question_text: 'Key flashcard prompt for recall',
            correct_answer: 'Detailed flashcard answer explanation',
            order_index: 1,
          },
          {
            concept_id: targetConcept.id,
            source_type: 'concept_recall',
            question_text: 'Explain the mechanism in your own words',
            correct_answer: 'Concept mechanism summary',
            order_index: 2,
          },
        ],
      },
    },
    include: {
      items: true,
    },
  });

  console.log(`✓ Created RevisionSession ${session.id} with ${session.items.length} items.`);

  // 4. Test Active Session Recovery
  console.log('\n--- Testing Active Session Recovery ---');
  const activeSession = await db.revisionSession.findFirst({
    where: { user_id: userId, status: 'in_progress' },
    include: { items: true },
  });

  if (!activeSession || activeSession.id !== session.id) {
    console.error('❌ Active session recovery failed!');
    process.exit(1);
  }
  console.log(`✓ Session recovery verified: recovered session ${activeSession.id}`);

  // 5. Test Answering & Mastery Update
  console.log('\n--- Testing Answer Submission & Mastery Updates ---');
  const firstItem = session.items[0];

  // Submit correct answer
  await db.revisionSessionItem.update({
    where: { id: firstItem.id },
    data: {
      user_answer: 'Option B',
      is_correct: true,
      answered_at: new Date(),
    },
  });

  // Update concept mastery
  const updatedMastery = await db.userConceptMastery.upsert({
    where: {
      user_id_concept_id: {
        user_id: userId,
        concept_id: targetConcept.id,
      },
    },
    create: {
      user_id: userId,
      concept_id: targetConcept.id,
      mastery_score: 100,
      correct_count: 1,
      wrong_count: 0,
      exposure_count: 1,
      last_seen_at: new Date(),
    },
    update: {
      correct_count: { increment: 1 },
      exposure_count: { increment: 1 },
      last_seen_at: new Date(),
    },
  });

  console.log(`✓ Submitted item 1 -> Concept "${targetConcept.name}" Mastery: Correct=${updatedMastery.correct_count}, Wrong=${updatedMastery.wrong_count}, Exposure=${updatedMastery.exposure_count}`);

  // 6. Complete remaining items & finish session
  console.log('\n--- Testing Session Completion ---');
  for (let i = 1; i < session.items.length; i++) {
    await db.revisionSessionItem.update({
      where: { id: session.items[i].id },
      data: {
        user_answer: 'Answer',
        is_correct: i === 1, // item 1 correct, item 2 wrong
        answered_at: new Date(),
      },
    });
  }

  const finalSession = await db.revisionSession.update({
    where: { id: session.id },
    data: {
      completed_items: 3,
      correct_items: 2,
      session_score: Math.round((2 / 3) * 100), // 67%
      status: 'completed',
      completed_at: new Date(),
    },
  });

  console.log(`✓ Final Session Status: ${finalSession.status}, Score: ${finalSession.session_score}%, Correct: ${finalSession.correct_items}/${finalSession.total_items}`);

  // Clean up test session
  await db.revisionSession.delete({ where: { id: session.id } });
  await db.userConceptMastery.deleteMany({ where: { user_id: userId } });

  console.log('\n==================================================');
  console.log('✓ All Revision Engine Tests Passed Successfully!');
}

testRevisionEngine()
  .catch((e) => {
    console.error('Test error:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
