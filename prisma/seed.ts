import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Saras AI database seed...');

  const dataPath = path.join(__dirname, 'seedData.json');
  if (!fs.existsSync(dataPath)) {
    console.warn('⚠️ seedData.json not found, skipping seed.');
    return;
  }

  const { videos, concepts, profile } = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  // 1. Seed User Profile
  if (profile) {
    await prisma.userProfile.upsert({
      where: { user_id: profile.user_id },
      create: {
        user_id: profile.user_id,
        name: profile.name,
        email: profile.email,
        avatar_url: profile.avatar_url,
      },
      update: {
        name: profile.name,
        email: profile.email,
      },
    });
    console.log(`✓ Seeded user profile for "${profile.name}"`);
  }

  // 2. Seed Videos, Segments, Quizzes, Flashcards, Notes & Projects
  for (const v of videos) {
    const video = await prisma.video.upsert({
      where: { youtube_video_id: v.youtube_video_id },
      create: {
        id: v.id,
        youtube_video_id: v.youtube_video_id,
        title: v.title,
        channel: v.channel,
        duration_seconds: v.duration_seconds,
        thumbnail_url: v.thumbnail_url,
        status: v.status,
      },
      update: {
        title: v.title,
        channel: v.channel,
        duration_seconds: v.duration_seconds,
        thumbnail_url: v.thumbnail_url,
        status: v.status,
      },
    });

    // Segments and Quizzes
    for (const seg of v.segments || []) {
      const createdSeg = await prisma.segment.upsert({
        where: { id: seg.id },
        create: {
          id: seg.id,
          video_id: video.id,
          order_index: seg.order_index,
          title: seg.title,
          summary: seg.summary,
          start_seconds: seg.start_seconds,
          end_seconds: seg.end_seconds,
        },
        update: {
          title: seg.title,
          summary: seg.summary,
          start_seconds: seg.start_seconds,
          end_seconds: seg.end_seconds,
        },
      });

      for (const q of seg.quiz_questions || []) {
        await prisma.quizQuestion.upsert({
          where: { id: q.id },
          create: {
            id: q.id,
            segment_id: createdSeg.id,
            question: q.question,
            options: q.options,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
          },
          update: {
            question: q.question,
            options: q.options,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
          },
        });
      }
    }

    // Flashcards
    for (const fc of v.flashcards || []) {
      await prisma.flashcard.upsert({
        where: { id: fc.id },
        create: {
          id: fc.id,
          video_id: video.id,
          front: fc.front,
          back: fc.back,
          mastered: fc.mastered,
        },
        update: {
          front: fc.front,
          back: fc.back,
        },
      });
    }

    // Smart Notes
    for (const n of v.notes || []) {
      await prisma.smartNote.upsert({
        where: { id: n.id },
        create: {
          id: n.id,
          video_id: video.id,
          segment_id: n.segment_id,
          section_type: n.section_type,
          title: n.title,
          content: n.content,
          source_start_seconds: n.source_start_seconds,
          source_end_seconds: n.source_end_seconds,
          order_index: n.order_index,
        },
        update: {
          title: n.title,
          content: n.content,
        },
      });
    }

    // Projects
    for (const p of v.projects || []) {
      await prisma.projectIdea.upsert({
        where: { id: p.id },
        create: {
          id: p.id,
          video_id: video.id,
          title: p.title,
          problem_statement: p.problem_statement,
          difficulty: p.difficulty,
          why_it_fits: p.why_it_fits,
          skills_practiced: p.skills_practiced,
          requirements: p.requirements,
          milestones: p.milestones,
          expected_outcome: p.expected_outcome,
          optional_extensions: p.optional_extensions,
        },
        update: {
          title: p.title,
          problem_statement: p.problem_statement,
        },
      });
    }

    console.log(`✓ Seeded video "${video.title}" with chapters, quizzes, and notes`);
  }

  // 3. Seed Concepts & Relationships
  for (const c of concepts) {
    const concept = await prisma.concept.upsert({
      where: { name: c.name },
      create: {
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        category: c.category,
      },
      update: {
        description: c.description,
        category: c.category,
      },
    });

    // Link video segments
    for (const vs of c.video_segments || []) {
      try {
        await prisma.conceptSegment.upsert({
          where: {
            concept_id_segment_id: {
              concept_id: concept.id,
              segment_id: vs.segment_id,
            },
          },
          create: {
            concept_id: concept.id,
            segment_id: vs.segment_id,
            source_start_seconds: vs.source_start_seconds,
            source_end_seconds: vs.source_end_seconds,
          },
          update: {},
        });
      } catch (e) {
        // Skip orphaned segments
      }
    }
  }

  // Seed Concept Relationships
  for (const c of concepts) {
    for (const rel of c.outgoing_relations || []) {
      try {
        await prisma.conceptRelationship.upsert({
          where: {
            source_concept_id_target_concept_id_relationship_type: {
              source_concept_id: rel.source_concept_id,
              target_concept_id: rel.target_concept_id,
              relationship_type: rel.relationship_type,
            },
          },
          create: {
            source_concept_id: rel.source_concept_id,
            target_concept_id: rel.target_concept_id,
            relationship_type: rel.relationship_type,
            weight: rel.weight || 1.0,
          },
          update: {},
        });
      } catch (e) {
        // Skip duplicates or missing targets
      }
    }
  }

  console.log(`✓ Seeded ${concepts.length} knowledge graph concepts and relationships`);
  console.log('🎉 Saras AI database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
