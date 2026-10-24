import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  calculateExamReadiness,
  getConceptsForPlanning,
  generateDeterministicPlan,
  validatePlanConstraints,
} from '@/lib/services/examPlanner';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'default_user';

    const exams = await db.exam.findMany({
      where: { user_id: userId },
      include: {
        topics: {
          include: {
            concept: {
              include: {
                user_mastery: { where: { user_id: userId } },
              },
            },
          },
        },
        plan_days: {
          include: { items: true },
          orderBy: { day_number: 'asc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const enrichedExams = exams.map((exam) => {
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

      const totalItems = exam.plan_days.reduce((acc, d) => acc + d.items.length, 0);
      const completedItems = exam.plan_days.reduce(
        (acc, d) => acc + d.items.filter((it) => it.status === 'completed').length,
        0
      );

      return {
        ...exam,
        readiness,
        totalItems,
        completedItems,
      };
    });

    return NextResponse.json({ exams: enrichedExams });
  } catch (error: any) {
    console.error('Error fetching exams:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch exams' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'default_user';
    const body = await req.json();

    const {
      name,
      examDate,
      dailyMinutes = 60,
      goal,
      conceptIds = [],
      customTopics = [],
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Exam name is required' }, { status: 400 });
    }

    if (!examDate) {
      return NextResponse.json({ error: 'Exam date is required' }, { status: 400 });
    }

    const parsedExamDate = new Date(examDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(parsedExamDate.getTime())) {
      return NextResponse.json({ error: 'Invalid exam date' }, { status: 400 });
    }

    if (conceptIds.length === 0 && customTopics.length === 0) {
      return NextResponse.json({ error: 'Please select at least one concept or topic' }, { status: 400 });
    }

    // 1. Fetch concepts with mastery and prerequisites
    const concepts = await getConceptsForPlanning(conceptIds, userId);

    // 2. Generate multi-day study plan
    const generatedDays = generateDeterministicPlan({
      examDate: parsedExamDate,
      dailyMinutes: Number(dailyMinutes),
      concepts,
      customTopics,
      startDate: new Date(),
    });

    // 3. Deterministic Validation
    const validConceptIds = new Set(concepts.map((c) => c.id));
    const validation = validatePlanConstraints(
      generatedDays,
      parsedExamDate,
      Number(dailyMinutes),
      validConceptIds
    );

    if (!validation.valid) {
      console.warn('[EXAM PLANNER] Validation warnings:', validation.errors);
    }

    // 4. Save Exam & Multi-Day Plan in DB
    const exam = await db.exam.create({
      data: {
        user_id: userId,
        name: name.trim(),
        exam_date: parsedExamDate,
        daily_minutes: Number(dailyMinutes),
        goal: goal?.trim() || null,
        status: 'active',
        plan_version: 1,
        replan_reason: 'Initial study plan generation',
        topics: {
          create: [
            ...concepts.map((c) => ({
              concept_id: c.id,
              topic_name: c.name,
              priority: c.status === 'weak' ? 3 : c.status === 'unseen' ? 2 : 1,
            })),
            ...customTopics.map((t: string) => ({
              concept_id: null,
              topic_name: t.trim(),
              priority: 2,
            })),
          ],
        },
        plan_days: {
          create: generatedDays.map((d) => ({
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
                linked_resource_type: it.linked_resource_type,
                linked_resource_id: it.linked_resource_id,
                order_index: it.order_index,
              })),
            },
          })),
        },
      },
      include: {
        topics: {
          include: {
            concept: {
              include: { user_mastery: { where: { user_id: userId } } },
            },
          },
        },
        plan_days: {
          include: { items: true },
          orderBy: { day_number: 'asc' },
        },
      },
    });

    const readiness = calculateExamReadiness(
      concepts.map((c) => ({
        mastery_score: c.mastery_score,
        exposure_count: c.exposure_count,
      }))
    );

    return NextResponse.json({
      success: true,
      exam: {
        ...exam,
        readiness,
      },
    });
  } catch (error: any) {
    console.error('Error creating exam:', error);
    return NextResponse.json({ error: error.message || 'Failed to create exam plan' }, { status: 500 });
  }
}
