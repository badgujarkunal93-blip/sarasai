import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rankRevisionConcepts } from '@/lib/services/ai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId = 'default_user',
      mode = 'smart_mix', // 'smart_mix' | 'weak_only' | 'recent'
      itemCount = 10,
    } = body;

    // 1. Fetch concepts with user mastery, quiz questions, flashcards, and video segments
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
          include: {
            segment: {
              include: { video: true },
            },
          },
        },
      },
    });

    if (concepts.length === 0) {
      return NextResponse.json(
        { error: 'No concepts found in knowledge map. Complete a lesson first!' },
        { status: 400 }
      );
    }

    // 2. Rank candidate concepts deterministically
    const rankedCandidates = rankRevisionConcepts(concepts, mode);

    // 3. Assemble balanced items up to itemCount
    const targetSize = Math.min(Math.max(5, itemCount), 20);
    const chosenItems: any[] = [];
    const usedSourceIds = new Set<string>();

    let round = 0;
    while (chosenItems.length < targetSize && round < 4) {
      for (const candidate of rankedCandidates) {
        if (chosenItems.length >= targetSize) break;
        const c = candidate.concept;

        // Try Quiz Question first
        const availableQuizzes = c.quiz_questions.filter(
          (qq: any) => qq.quiz_question && !usedSourceIds.has(qq.quiz_question.id)
        );

        if (availableQuizzes.length > 0 && round % 2 === 0) {
          const q = availableQuizzes[0].quiz_question;
          usedSourceIds.add(q.id);

          const seg = c.video_segments?.[0]?.segment;
          chosenItems.push({
            concept_id: c.id,
            source_type: 'quiz',
            source_id: q.id,
            question_text: q.question,
            options: q.options,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            source_video_title: seg?.video?.title || null,
            source_segment_title: seg?.title || null,
            source_start_seconds: seg?.start_seconds || null,
          });
          continue;
        }

        // Try Flashcard next
        const availableFlashcards = c.flashcards.filter(
          (fc: any) => fc.flashcard && !usedSourceIds.has(fc.flashcard.id)
        );

        if (availableFlashcards.length > 0) {
          const f = availableFlashcards[0].flashcard;
          usedSourceIds.add(f.id);

          const seg = c.video_segments?.[0]?.segment;
          chosenItems.push({
            concept_id: c.id,
            source_type: 'flashcard',
            source_id: f.id,
            question_text: f.front,
            correct_answer: f.back,
            options: null,
            explanation: `Flashcard key takeaway for ${c.name}.`,
            source_video_title: seg?.video?.title || null,
            source_segment_title: seg?.title || null,
            source_start_seconds: seg?.start_seconds || null,
          });
          continue;
        }

        // Fallback: Concept Recall prompt
        if (round >= 2 && !usedSourceIds.has(`concept-${c.id}`)) {
          usedSourceIds.add(`concept-${c.id}`);
          const seg = c.video_segments?.[0]?.segment;
          chosenItems.push({
            concept_id: c.id,
            source_type: 'concept_recall',
            source_id: c.id,
            question_text: `In your own words: What is the core mechanism and purpose of "${c.name}"?`,
            correct_answer: c.description || `Core concepts and mechanics of ${c.name}.`,
            options: null,
            explanation: c.description || `Reinforce understanding of ${c.name}.`,
            source_video_title: seg?.video?.title || null,
            source_segment_title: seg?.title || null,
            source_start_seconds: seg?.start_seconds || null,
          });
        }
      }
      round++;
    }

    if (chosenItems.length === 0) {
      return NextResponse.json(
        { error: 'Could not assemble revision items. Ingest videos or lessons first.' },
        { status: 400 }
      );
    }

    // 4. Mark any previous in_progress session as abandoned to prevent dangling sessions
    await db.revisionSession.updateMany({
      where: {
        user_id: userId,
        status: 'in_progress',
      },
      data: {
        status: 'abandoned',
        updated_at: new Date(),
      },
    });

    // 5. Create new RevisionSession in transaction
    const newSession = await db.revisionSession.create({
      data: {
        user_id: userId,
        mode,
        status: 'in_progress',
        total_items: chosenItems.length,
        completed_items: 0,
        correct_items: 0,
        session_score: 0,
        items: {
          create: chosenItems.map((item, idx) => ({
            concept_id: item.concept_id,
            source_type: item.source_type,
            source_id: item.source_id,
            question_text: item.question_text,
            options: item.options,
            correct_answer: item.correct_answer,
            explanation: item.explanation,
            order_index: idx,
            source_video_title: item.source_video_title,
            source_segment_title: item.source_segment_title,
            source_start_seconds: item.source_start_seconds,
          })),
        },
      },
      include: {
        items: {
          orderBy: { order_index: 'asc' },
          include: {
            concept: {
              include: {
                user_mastery: {
                  where: { user_id: userId },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ session: newSession });
  } catch (error: any) {
    console.error('[API /api/revision/start Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to start revision session' },
      { status: 500 }
    );
  }
}
