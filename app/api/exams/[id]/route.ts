import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateExamReadiness } from '@/lib/services/examPlanner';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = req.headers.get('x-user-id') || 'default_user';
    const examId = params.id;

    const exam = await db.exam.findUnique({
      where: { id: examId },
      include: {
        topics: {
          include: {
            concept: {
              include: {
                user_mastery: { where: { user_id: userId } },
                video_segments: {
                  include: { segment: { include: { video: true } } },
                },
              },
            },
          },
        },
        plan_days: {
          include: {
            items: {
              include: {
                concept: {
                  include: {
                    user_mastery: { where: { user_id: userId } },
                  },
                },
              },
              orderBy: { order_index: 'asc' },
            },
          },
          orderBy: { day_number: 'asc' },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 400 });
    }

    // Calculate live readiness from current concept masteries
    const conceptsForReadiness = exam.topics
      .filter((t) => t.concept)
      .map((t) => {
        const mastery = t.concept!.user_mastery[0];
        return {
          mastery_score: mastery ? mastery.mastery_score : 0,
          exposure_count: mastery ? mastery.exposure_count : 0,
        };
      });

    const readiness = calculateExamReadiness(conceptsForReadiness);

    // Identify weak concepts (< 40% or wrong answers)
    const weakTopics = exam.topics
      .filter((t) => {
        if (!t.concept) return false;
        const mastery = t.concept.user_mastery[0];
        if (!mastery) return true; // unseen or 0 mastery
        return mastery.mastery_score < 50 || mastery.wrong_count > 0;
      })
      .map((t) => {
        const mastery = t.concept?.user_mastery[0];
        return {
          id: t.concept_id,
          name: t.topic_name,
          mastery_score: mastery ? mastery.mastery_score : 0,
          wrong_count: mastery ? mastery.wrong_count : 0,
          video_id: t.concept?.video_segments[0]?.segment?.video_id,
        };
      });

    return NextResponse.json({
      exam: {
        ...exam,
        readiness,
        weakTopics,
      },
    });
  } catch (error: any) {
    console.error('Error fetching exam:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch exam' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const examId = params.id;
    const body = await req.json();

    const updateData: any = {};
    if (body.status !== undefined) updateData.status = body.status;
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.goal !== undefined) updateData.goal = body.goal.trim();
    if (body.dailyMinutes !== undefined) updateData.daily_minutes = Number(body.dailyMinutes);

    const updated = await db.exam.update({
      where: { id: examId },
      data: updateData,
    });

    return NextResponse.json({ success: true, exam: updated });
  } catch (error: any) {
    console.error('Error updating exam:', error);
    return NextResponse.json({ error: error.message || 'Failed to update exam' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const examId = params.id;
    await db.exam.delete({
      where: { id: examId },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting exam:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete exam' }, { status: 500 });
  }
}
