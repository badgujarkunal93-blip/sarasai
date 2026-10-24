import { db } from '../lib/db';

async function testAllTables() {
  console.log('======================================================================');
  console.log('=== SARAS AI POSTGRESQL COMPLETE 24-TABLE VERIFICATION ===');
  console.log('======================================================================\n');

  const checks = [
    { name: 'Video', fn: () => db.video.count() },
    { name: 'Segment', fn: () => db.segment.count() },
    { name: 'QuizQuestion', fn: () => db.quizQuestion.count() },
    { name: 'Flashcard', fn: () => db.flashcard.count() },
    { name: 'UserVideoProgress', fn: () => db.userVideoProgress.count() },
    { name: 'Task', fn: () => db.task.count() },
    { name: 'AttentionEvent', fn: () => db.attentionEvent.count() },
    { name: 'ChatMessage', fn: () => db.chatMessage.count() },
    { name: 'ProjectIdea', fn: () => db.projectIdea.count() },
    { name: 'UserProject', fn: () => db.userProject.count() },
    { name: 'SmartNote', fn: () => db.smartNote.count() },
    { name: 'Concept', fn: () => db.concept.count() },
    { name: 'ConceptRelationship', fn: () => db.conceptRelationship.count() },
    { name: 'ConceptSegment', fn: () => db.conceptSegment.count() },
    { name: 'ConceptFlashcard', fn: () => db.conceptFlashcard.count() },
    { name: 'ConceptQuizQuestion', fn: () => db.conceptQuizQuestion.count() },
    { name: 'UserConceptMastery', fn: () => db.userConceptMastery.count() },
    { name: 'RevisionSession', fn: () => db.revisionSession.count() },
    { name: 'RevisionSessionItem', fn: () => db.revisionSessionItem.count() },
    { name: 'Exam', fn: () => db.exam.count() },
    { name: 'ExamTopic', fn: () => db.examTopic.count() },
    { name: 'ExamPlanDay', fn: () => db.examPlanDay.count() },
    { name: 'ExamPlanItem', fn: () => db.examPlanItem.count() },
    { name: 'UserProfile', fn: () => db.userProfile.count() },
  ];

  let passed = 0;
  for (const check of checks) {
    try {
      const count = await check.fn();
      console.log(`  ✅ Table [${check.name}]: Accessible (Count: ${count})`);
      passed++;
    } catch (e: any) {
      console.error(`  ❌ Table [${check.name}]: Failed to access - ${e.message}`);
    }
  }

  console.log(`\nResults: ${passed} of ${checks.length} tables verified in PostgreSQL.`);
  if (passed === checks.length) {
    console.log('✅ ALL 24 TABLES ARE PRESENT AND ACCESSIBLE IN SUPABASE POSTGRESQL!');
  } else {
    console.error('❌ Some tables failed verification.');
    process.exit(1);
  }

  await db.$disconnect();
}

testAllTables();
