import { db } from '../lib/db';
import { MASTERY_THRESHOLDS, getMasteryState } from '../lib/services/ai';

async function testKnowledgeGraph() {
  console.log('=== Saras AI Knowledge Graph Verification & Isolation Audit ===\n');

  // Test 1: Query concepts and relationships
  const concepts = await db.concept.findMany({
    include: {
      outgoing_relations: {
        include: { target_concept: true },
      },
      incoming_relations: {
        include: { source_concept: true },
      },
      video_segments: {
        include: {
          segment: {
            include: { video: true },
          },
        },
      },
      user_mastery: true,
    },
  });

  const totalRelationships = await db.conceptRelationship.count();

  console.log(`[GRAPH INTEGRITY] Total Concepts: ${concepts.length}`);
  console.log(`[GRAPH INTEGRITY] Total Relationships: ${totalRelationships}\n`);

  if (concepts.length === 0 || totalRelationships === 0) {
    console.error('❌ Error: Empty graph or missing relationships!');
    process.exit(1);
  }

  // Print sample relationships
  console.log('Sample Concept Relationships:');
  const sampleWithRelations = concepts.filter((c) => c.outgoing_relations.length > 0).slice(0, 4);
  for (const c of sampleWithRelations) {
    for (const rel of c.outgoing_relations) {
      console.log(`  • "${c.name}" --[${rel.relationship_type}]--> "${rel.target_concept.name}"`);
    }
  }

  // Test 2: User Mastery & Grounding
  console.log('\nTesting Mastery Thresholds:');
  const stateCounts: Record<string, number> = {
    MASTERED: 0,
    DEVELOPING: 0,
    WEAK: 0,
    NOT_STUDIED: 0,
  };

  for (const c of concepts) {
    const mastery = c.user_mastery.find((m) => m.user_id === 'default_user');
    const score = mastery?.mastery_score ?? 0;
    const exposure = mastery?.exposure_count ?? 0;
    const state = getMasteryState(score, exposure);
    stateCounts[state]++;
  }

  console.log('User Mastery Distribution:', stateCounts);

  // Test 3: User Isolation Test (User A vs User B)
  console.log('\nTesting Multi-User Isolation:');
  const testConcept = concepts[0];
  
  // Set User A to 90% (MASTERED)
  await db.userConceptMastery.upsert({
    where: {
      user_id_concept_id: {
        user_id: 'user_alice',
        concept_id: testConcept.id,
      },
    },
    create: {
      user_id: 'user_alice',
      concept_id: testConcept.id,
      mastery_score: 90,
      exposure_count: 5,
      correct_count: 9,
      wrong_count: 1,
    },
    update: {
      mastery_score: 90,
      exposure_count: 5,
    },
  });

  // Set User B to 20% (WEAK)
  await db.userConceptMastery.upsert({
    where: {
      user_id_concept_id: {
        user_id: 'user_bob',
        concept_id: testConcept.id,
      },
    },
    create: {
      user_id: 'user_bob',
      concept_id: testConcept.id,
      mastery_score: 20,
      exposure_count: 5,
      correct_count: 1,
      wrong_count: 4,
    },
    update: {
      mastery_score: 20,
      exposure_count: 5,
    },
  });

  const aliceRecord = await db.userConceptMastery.findUnique({
    where: {
      user_id_concept_id: {
        user_id: 'user_alice',
        concept_id: testConcept.id,
      },
    },
  });

  const bobRecord = await db.userConceptMastery.findUnique({
    where: {
      user_id_concept_id: {
        user_id: 'user_bob',
        concept_id: testConcept.id,
      },
    },
  });

  console.log(`  • Concept: "${testConcept.name}"`);
  console.log(`  • User Alice Mastery: ${aliceRecord?.mastery_score}% (${getMasteryState(aliceRecord?.mastery_score || 0, aliceRecord?.exposure_count || 0)})`);
  console.log(`  • User Bob Mastery: ${bobRecord?.mastery_score}% (${getMasteryState(bobRecord?.mastery_score || 0, bobRecord?.exposure_count || 0)})`);

  if (aliceRecord?.mastery_score === bobRecord?.mastery_score) {
    console.error('❌ User isolation failed!');
    process.exit(1);
  }

  console.log('✓ Multi-user isolation verified: Alice and Bob have independent mastery scores.');

  console.log('\n==================================================');
  console.log('✓ All Knowledge Graph Verification Tests Passed!');
}

testKnowledgeGraph()
  .catch((e) => {
    console.error('Test error:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
