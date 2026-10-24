import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId = 'default_user',
      sessionId,
      itemId,
      userAnswer,
      isCorrect,
    } = body;

    if (!sessionId || !itemId) {
      return NextResponse.json(
        { error: 'sessionId and itemId are required' },
        { status: 400 }
      );
    }

    // 1. Update the RevisionSessionItem
    const item = await db.revisionSessionItem.update({
      where: { id: itemId },
      data: {
        user_answer: userAnswer,
        is_correct: isCorrect,
        answered_at: new Date(),
      },
      include: {
        concept: true,
      },
    });

    // 2. Count progress on this session
    const sessionItems = await db.revisionSessionItem.findMany({
      where: { session_id: sessionId },
    });

    const completedItems = sessionItems.filter((it) => it.is_correct !== null).length;
    const correctItems = sessionItems.filter((it) => it.is_correct === true).length;
    const isFinished = completedItems === sessionItems.length;
    const sessionScore = Math.round((correctItems / sessionItems.length) * 100);

    // 3. Update the RevisionSession
    const session = await db.revisionSession.update({
      where: { id: sessionId },
      data: {
        completed_items: completedItems,
        correct_items: correctItems,
        session_score: sessionScore,
        status: isFinished ? 'completed' : 'in_progress',
        completed_at: isFinished ? new Date() : null,
        updated_at: new Date(),
      },
    });

    // 4. Update User Concept Mastery for the linked concept
    let updatedMastery = null;
    if (item.concept_id) {
      const existingMastery = await db.userConceptMastery.findUnique({
        where: {
          user_id_concept_id: {
            user_id: userId,
            concept_id: item.concept_id,
          },
        },
      });

      const deltaCorrect = isCorrect ? 1 : 0;
      const deltaWrong = isCorrect ? 0 : 1;

      const newCorrect = (existingMastery?.correct_count || 0) + deltaCorrect;
      const newWrong = (existingMastery?.wrong_count || 0) + deltaWrong;
      const newExposure = (existingMastery?.exposure_count || 0) + 1;
      const totalAnswers = newCorrect + newWrong;
      const newMasteryScore =
        totalAnswers > 0 ? Math.round((newCorrect / totalAnswers) * 100) : 0;

      updatedMastery = await db.userConceptMastery.upsert({
        where: {
          user_id_concept_id: {
            user_id: userId,
            concept_id: item.concept_id,
          },
        },
        create: {
          user_id: userId,
          concept_id: item.concept_id,
          mastery_score: newMasteryScore,
          correct_count: newCorrect,
          wrong_count: newWrong,
          exposure_count: newExposure,
          last_seen_at: new Date(),
        },
        update: {
          mastery_score: newMasteryScore,
          correct_count: newCorrect,
          wrong_count: newWrong,
          exposure_count: newExposure,
          last_seen_at: new Date(),
          updated_at: new Date(),
        },
      });
    }

    return NextResponse.json({
      item,
      session,
      updatedMastery,
      isFinished,
    });
  } catch (error: any) {
    console.error('[API /api/revision/submit-item Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to submit revision item' },
      { status: 500 }
    );
  }
}
