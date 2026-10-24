import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId = 'default_user',
      conceptId,
      conceptName,
      deltaCorrect = 0,
      deltaWrong = 0,
    } = body;

    let targetConcept = null;
    if (conceptId) {
      targetConcept = await db.concept.findUnique({ where: { id: conceptId } });
    } else if (conceptName) {
      targetConcept = await db.concept.findUnique({ where: { name: conceptName } });
    }

    if (!targetConcept) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 });
    }

    // Upsert user mastery
    const existing = await db.userConceptMastery.findUnique({
      where: {
        user_id_concept_id: {
          user_id: userId,
          concept_id: targetConcept.id,
        },
      },
    });

    const newCorrect = (existing?.correct_count || 0) + deltaCorrect;
    const newWrong = (existing?.wrong_count || 0) + deltaWrong;
    const newExposure = (existing?.exposure_count || 0) + deltaCorrect + deltaWrong;

    const totalAnswers = newCorrect + newWrong;
    const newMasteryScore =
      totalAnswers > 0 ? Math.round((newCorrect / totalAnswers) * 100) : 0;

    const updated = await db.userConceptMastery.upsert({
      where: {
        user_id_concept_id: {
          user_id: userId,
          concept_id: targetConcept.id,
        },
      },
      create: {
        user_id: userId,
        concept_id: targetConcept.id,
        mastery_score: newMasteryScore,
        correct_count: newCorrect,
        wrong_count: newWrong,
        exposure_count: newExposure > 0 ? newExposure : 1,
        last_seen_at: new Date(),
      },
      update: {
        mastery_score: newMasteryScore,
        correct_count: newCorrect,
        wrong_count: newWrong,
        exposure_count: newExposure > 0 ? newExposure : { increment: 1 },
        last_seen_at: new Date(),
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ mastery: updated });
  } catch (error: any) {
    console.error('[API /api/knowledge/mastery POST Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update concept mastery' },
      { status: 500 }
    );
  }
}
