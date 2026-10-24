import { db } from '../lib/db';
import { extractConceptsAndRelationshipsForVideo } from '../lib/services/ai';

async function backfillKnowledgeGraph() {
  console.log('=== Saras AI Knowledge Graph Backfill Operation ===\n');

  const readyVideos = await db.video.findMany({
    where: { status: 'ready' },
    include: {
      segments: {
        orderBy: { order_index: 'asc' },
        include: {
          quiz_questions: true,
        },
      },
      flashcards: true,
      progress: true,
    },
  });

  console.log(`Found ${readyVideos.length} ready videos to index into Knowledge Graph.\n`);

  let totalConceptsCreated = 0;
  let totalRelationsCreated = 0;

  for (const video of readyVideos) {
    console.log(`Processing Video: "${video.title}"...`);

    const extracted = await extractConceptsAndRelationshipsForVideo(
      video.title,
      video.channel,
      video.segments
    );

    const conceptRecordMap = new Map<string, any>();

    for (const ec of extracted) {
      const slug = ec.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      // Upsert Concept
      const concept = await db.concept.upsert({
        where: { name: ec.name },
        create: {
          name: ec.name,
          slug: `${slug}-${Math.random().toString(36).substring(2, 6)}`,
          description: ec.description,
          category: ec.category,
        },
        update: {
          description: ec.description,
          category: ec.category,
        },
      });

      conceptRecordMap.set(ec.name.toLowerCase(), concept);
      totalConceptsCreated++;

      // Link Concept to Segments
      for (const orderIdx of ec.segment_order_indices) {
        const seg = video.segments[orderIdx] || video.segments[0];
        if (seg) {
          await db.conceptSegment.upsert({
            where: {
              concept_id_segment_id: {
                concept_id: concept.id,
                segment_id: seg.id,
              },
            },
            create: {
              concept_id: concept.id,
              segment_id: seg.id,
              source_start_seconds: seg.start_seconds,
              source_end_seconds: seg.end_seconds,
            },
            update: {},
          });

          // Also link Quiz Questions from this segment
          for (const q of seg.quiz_questions) {
            await db.conceptQuizQuestion.upsert({
              where: {
                concept_id_quiz_question_id: {
                  concept_id: concept.id,
                  quiz_question_id: q.id,
                },
              },
              create: {
                concept_id: concept.id,
                quiz_question_id: q.id,
              },
              update: {},
            });
          }
        }
      }

      // Link Concept to matching Flashcards
      for (const fc of video.flashcards) {
        const matches =
          fc.front.toLowerCase().includes(ec.name.toLowerCase()) ||
          fc.back.toLowerCase().includes(ec.name.toLowerCase());
        if (matches) {
          await db.conceptFlashcard.upsert({
            where: {
              concept_id_flashcard_id: {
                concept_id: concept.id,
                flashcard_id: fc.id,
              },
            },
            create: {
              concept_id: concept.id,
              flashcard_id: fc.id,
            },
            update: {},
          });
        }
      }

      // Compute initial user mastery from user's progress on this video
      const userProg = video.progress.find((p) => p.user_id === 'default_user');
      let completedSegIds: string[] = [];
      try {
        completedSegIds = JSON.parse(userProg?.completed_segment_ids || '[]');
      } catch {
        completedSegIds = [];
      }

      const isLearned = completedSegIds.length > 0;
      const initialScore = isLearned ? Math.min(95, 60 + completedSegIds.length * 10) : 0;
      const exposure = isLearned ? completedSegIds.length * 2 : 0;
      const correct = isLearned ? Math.round(exposure * 0.8) : 0;
      const wrong = exposure - correct;

      await db.userConceptMastery.upsert({
        where: {
          user_id_concept_id: {
            user_id: 'default_user',
            concept_id: concept.id,
          },
        },
        create: {
          user_id: 'default_user',
          concept_id: concept.id,
          mastery_score: initialScore,
          exposure_count: exposure,
          correct_count: correct,
          wrong_count: wrong,
          last_seen_at: userProg?.last_watched_at || new Date(),
        },
        update: {},
      });
    }

    // Create Concept Relationships
    for (const ec of extracted) {
      const sourceRecord = conceptRecordMap.get(ec.name.toLowerCase());
      if (!sourceRecord) continue;

      for (const rel of ec.related_concepts) {
        const targetRecord =
          conceptRecordMap.get(rel.target_name.toLowerCase()) ||
          (await db.concept.findFirst({
            where: { name: { contains: rel.target_name } },
          }));

        if (targetRecord && targetRecord.id !== sourceRecord.id) {
          try {
            await db.conceptRelationship.upsert({
              where: {
                source_concept_id_target_concept_id_relationship_type: {
                  source_concept_id: sourceRecord.id,
                  target_concept_id: targetRecord.id,
                  relationship_type: rel.relationship_type,
                },
              },
              create: {
                source_concept_id: sourceRecord.id,
                target_concept_id: targetRecord.id,
                relationship_type: rel.relationship_type,
                weight: 1.0,
              },
              update: {},
            });
            totalRelationsCreated++;
          } catch (e: any) {
            // Duplicate relation ignore
          }
        }
      }
    }

    console.log(`✓ Finished video: "${video.title}"\n`);
  }

  console.log(`=== Knowledge Graph Seeding Complete ===`);
  console.log(`• Total Concepts in Graph: ${await db.concept.count()}`);
  console.log(`• Total Relationships in Graph: ${await db.conceptRelationship.count()}`);
  console.log(`• User Mastery Records: ${await db.userConceptMastery.count()}`);
}

backfillKnowledgeGraph()
  .catch((e) => {
    console.error('Fatal Knowledge Graph backfill error:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
