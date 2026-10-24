import { db } from '../db';
import { MASTERY_THRESHOLDS, getMasteryState } from './ai';

export interface ConceptWithDetails {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  mastery_score: number;
  correct_count: number;
  wrong_count: number;
  exposure_count: number;
  last_seen_at: Date | null;
  status: 'strong' | 'developing' | 'weak' | 'unseen';
  prerequisites: string[]; // IDs of concepts that must be learned before this one
  video_segments: {
    segment_id: string;
    video_id: string;
    video_title: string;
    start_seconds: number | null;
  }[];
  flashcard_ids: string[];
  quiz_question_ids: string[];
}

export interface GeneratedPlanItem {
  concept_id: string | null;
  topic_name: string;
  activity_type: 'learn' | 'revision' | 'flashcards' | 'focus' | 'mock_exam';
  title: string;
  description: string;
  duration_minutes: number;
  priority: number;
  linked_resource_type?: string;
  linked_resource_id?: string;
  order_index: number;
}

export interface GeneratedPlanDay {
  day_number: number;
  date: Date;
  items: GeneratedPlanItem[];
}

/**
 * 1. Calculate Exam Readiness Percentage (0-100%)
 */
export function calculateExamReadiness(concepts: { mastery_score: number; exposure_count: number }[]): {
  readinessPercentage: number;
  strongCount: number;
  developingCount: number;
  weakCount: number;
  unseenCount: number;
} {
  if (concepts.length === 0) {
    return {
      readinessPercentage: 0,
      strongCount: 0,
      developingCount: 0,
      weakCount: 0,
      unseenCount: 0,
    };
  }

  let strongCount = 0;
  let developingCount = 0;
  let weakCount = 0;
  let unseenCount = 0;
  let totalScore = 0;

  for (const c of concepts) {
    totalScore += c.mastery_score;
    if (c.exposure_count === 0) {
      unseenCount++;
    } else if (c.mastery_score >= MASTERY_THRESHOLDS.MASTERED) {
      strongCount++;
    } else if (c.mastery_score >= MASTERY_THRESHOLDS.DEVELOPING) {
      developingCount++;
    } else {
      weakCount++;
    }
  }

  const readinessPercentage = Math.round(totalScore / concepts.length);

  return {
    readinessPercentage: Math.min(100, Math.max(0, readinessPercentage)),
    strongCount,
    developingCount,
    weakCount,
    unseenCount,
  };
}

/**
 * 2. Fetch and build rich concept details for planning
 */
export async function getConceptsForPlanning(
  conceptIds: string[],
  userId: string
): Promise<ConceptWithDetails[]> {
  if (conceptIds.length === 0) return [];

  const concepts = await db.concept.findMany({
    where: { id: { in: conceptIds } },
    include: {
      user_mastery: {
        where: { user_id: userId },
      },
      incoming_relations: {
        where: { relationship_type: 'prerequisite' },
      },
      video_segments: {
        include: { segment: { include: { video: true } } },
      },
      flashcards: true,
      quiz_questions: true,
    },
  });

  return concepts.map((c) => {
    const mastery = c.user_mastery[0];
    const score = mastery ? mastery.mastery_score : 0;
    const exposure = mastery ? mastery.exposure_count : 0;
    const correct = mastery ? mastery.correct_count : 0;
    const wrong = mastery ? mastery.wrong_count : 0;
    const lastSeen = mastery ? mastery.last_seen_at : null;

    let status: 'strong' | 'developing' | 'weak' | 'unseen' = 'unseen';
    if (exposure > 0) {
      if (score >= MASTERY_THRESHOLDS.MASTERED) status = 'strong';
      else if (score >= MASTERY_THRESHOLDS.DEVELOPING) status = 'developing';
      else status = 'weak';
    }

    const prerequisites = c.incoming_relations.map((r) => r.source_concept_id);
    const videoSegments = c.video_segments.map((vs) => ({
      segment_id: vs.segment_id,
      video_id: vs.segment.video_id,
      video_title: vs.segment.video.title,
      start_seconds: vs.source_start_seconds ?? vs.segment.start_seconds,
    }));

    return {
      id: c.id,
      name: c.name,
      category: c.category,
      description: c.description,
      mastery_score: score,
      correct_count: correct,
      wrong_count: wrong,
      exposure_count: exposure,
      last_seen_at: lastSeen,
      status,
      prerequisites,
      video_segments: videoSegments,
      flashcard_ids: c.flashcards.map((f) => f.flashcard_id),
      quiz_question_ids: c.quiz_questions.map((q) => q.quiz_question_id),
    };
  });
}

/**
 * 3. Topological Sort with Priority Scoring
 * Orders concepts such that prerequisites always appear before dependent concepts,
 * while weak and unseen concepts are scheduled earlier.
 */
export function sortConceptsWithPrerequisites(
  concepts: ConceptWithDetails[],
  customTopics: string[] = []
): Array<{ id: string | null; name: string; concept?: ConceptWithDetails; priorityScore: number }> {
  const conceptMap = new Map<string, ConceptWithDetails>();
  concepts.forEach((c) => conceptMap.set(c.id, c));

  // Compute priority score for each concept:
  // Weak: 100 - mastery + (wrong * 5)
  // Unseen: 80
  // Developing: 50
  // Strong: 20
  const priorityScores = new Map<string, number>();
  concepts.forEach((c) => {
    let base = 20;
    if (c.status === 'weak') {
      base = 100 - c.mastery_score + Math.min(25, c.wrong_count * 5);
    } else if (c.status === 'unseen') {
      base = 80;
    } else if (c.status === 'developing') {
      base = 50 + (100 - c.mastery_score) * 0.3;
    } else {
      base = 20;
    }
    priorityScores.set(c.id, base);
  });

  // Kahn's Algorithm / Dependency Resolution for Known Prerequisites
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  concepts.forEach((c) => {
    inDegree.set(c.id, 0);
    adj.set(c.id, []);
  });

  concepts.forEach((c) => {
    c.prerequisites.forEach((prereqId) => {
      if (conceptMap.has(prereqId)) {
        adj.get(prereqId)!.push(c.id);
        inDegree.set(c.id, (inDegree.get(c.id) || 0) + 1);
      }
    });
  });

  // Ready queue of concepts with 0 unresolved prerequisites
  const ready: ConceptWithDetails[] = [];
  concepts.forEach((c) => {
    if ((inDegree.get(c.id) || 0) === 0) {
      ready.push(c);
    }
  });

  const sorted: Array<{ id: string | null; name: string; concept?: ConceptWithDetails; priorityScore: number }> = [];

  while (ready.length > 0) {
    // Sort ready queue by priority score descending
    ready.sort((a, b) => (priorityScores.get(b.id) || 0) - (priorityScores.get(a.id) || 0));
    const current = ready.shift()!;

    sorted.push({
      id: current.id,
      name: current.name,
      concept: current,
      priorityScore: priorityScores.get(current.id) || 0,
    });

    // Reduce in-degree for dependents
    const dependents = adj.get(current.id) || [];
    for (const depId of dependents) {
      const remaining = (inDegree.get(depId) || 1) - 1;
      inDegree.set(depId, remaining);
      if (remaining === 0) {
        ready.push(conceptMap.get(depId)!);
      }
    }
  }

  // If any concepts were left due to cycles, append them
  concepts.forEach((c) => {
    if (!sorted.some((s) => s.id === c.id)) {
      sorted.push({
        id: c.id,
        name: c.name,
        concept: c,
        priorityScore: priorityScores.get(c.id) || 0,
      });
    }
  });

  // Append custom topics as unseen
  customTopics.forEach((t) => {
    sorted.push({
      id: null,
      name: t,
      priorityScore: 75,
    });
  });

  return sorted;
}

/**
 * 4. Generate Multi-Day Study Schedule
 * Respects daily time budget, exam date, prerequisites, and high-yield final days.
 */
export function generateDeterministicPlan({
  examDate,
  dailyMinutes,
  concepts,
  customTopics = [],
  startDate = new Date(),
}: {
  examDate: Date;
  dailyMinutes: number;
  concepts: ConceptWithDetails[];
  customTopics?: string[];
  startDate?: Date;
}): GeneratedPlanDay[] {
  const maxDailyTime = Math.max(20, Math.min(300, dailyMinutes));

  // Calculate days remaining
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(examDate);
  end.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - start.getTime();
  let totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (totalDays <= 0) totalDays = 1;
  totalDays = Math.min(30, totalDays); // Cap at 30 days max for roadmap

  // Sort concepts with prerequisites respected
  const sortedTopics = sortConceptsWithPrerequisites(concepts, customTopics);

  const days: GeneratedPlanDay[] = [];
  let topicPointer = 0;

  for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
    const dayDate = new Date(start);
    dayDate.setDate(dayDate.getDate() + (dayNum - 1));

    const isLastDay = dayNum === totalDays;
    const isPenultimateDay = dayNum === totalDays - 1 && totalDays > 2;

    const dayItems: GeneratedPlanItem[] = [];
    let minutesLeft = maxDailyTime;
    let orderIndex = 0;

    // ── FINAL 1-2 DAYS: MOCK EXAM & HIGH-YIELD RECALL ────────────────────────
    if (isLastDay) {
      // Final Day: Quick Recall + Mock Exam Drill + Smart Notes
      const mockDuration = Math.min(minutesLeft, Math.max(20, Math.floor(maxDailyTime * 0.5)));
      dayItems.push({
        concept_id: null,
        topic_name: 'Full Scope Mock Exam',
        activity_type: 'mock_exam',
        title: 'Full Scope Mock Exam Drill',
        description: 'Comprehensive adaptive test covering all exam concepts with real-time scoring.',
        duration_minutes: mockDuration,
        priority: 3,
        order_index: orderIndex++,
      });
      minutesLeft -= mockDuration;

      if (minutesLeft >= 15) {
        dayItems.push({
          concept_id: null,
          topic_name: 'Flashcard Rapid Drill',
          activity_type: 'flashcards',
          title: 'Final High-Yield Recall Drill',
          description: 'Rapid physical-style flashcard sweeps across all key definitions.',
          duration_minutes: minutesLeft,
          priority: 2,
          order_index: orderIndex++,
        });
        minutesLeft = 0;
      }
    } else if (isPenultimateDay) {
      // Penultimate Day: Weak Concepts Review + Mixed Revision
      const weakConcept = concepts.find((c) => c.status === 'weak');
      if (weakConcept) {
        const weakDuration = Math.min(minutesLeft, Math.max(15, Math.floor(maxDailyTime * 0.5)));
        dayItems.push({
          concept_id: weakConcept.id,
          topic_name: weakConcept.name,
          activity_type: 'revision',
          title: `Reinforce Weak Area: ${weakConcept.name}`,
          description: `Targeted revision session to address recorded mistakes in ${weakConcept.name}.`,
          duration_minutes: weakDuration,
          priority: 3,
          linked_resource_type: weakConcept.video_segments[0] ? 'video' : undefined,
          linked_resource_id: weakConcept.video_segments[0]?.video_id,
          order_index: orderIndex++,
        });
        minutesLeft -= weakDuration;
      }

      if (minutesLeft >= 15) {
        dayItems.push({
          concept_id: null,
          topic_name: 'Mixed Recall Drill',
          activity_type: 'revision',
          title: 'Comprehensive Knowledge Map Revision',
          description: 'Cross-topic synthesis to bridge connections across modules.',
          duration_minutes: minutesLeft,
          priority: 2,
          order_index: orderIndex++,
        });
        minutesLeft = 0;
      }
    } else {
      // ── NORMAL DAYS: CORE LEARNING, REVISION, AND PRACTICE ──────────────────
      while (minutesLeft >= 15 && topicPointer < sortedTopics.length) {
        const item = sortedTopics[topicPointer];
        const c = item.concept;

        if (!c) {
          // Custom topic
          const dur = Math.min(minutesLeft, 30);
          dayItems.push({
            concept_id: null,
            topic_name: item.name,
            activity_type: 'learn',
            title: `Study Topic: ${item.name}`,
            description: `Core conceptual deep dive and fundamentals review for ${item.name}.`,
            duration_minutes: dur,
            priority: 2,
            order_index: orderIndex++,
          });
          minutesLeft -= dur;
          topicPointer++;
          continue;
        }

        // Determine activity based on concept status
        if (c.status === 'unseen') {
          // Learn + Checkpoint Quiz
          const learnDur = Math.min(minutesLeft, Math.max(20, Math.floor(maxDailyTime * 0.6)));
          dayItems.push({
            concept_id: c.id,
            topic_name: c.name,
            activity_type: 'learn',
            title: `Learn Foundation: ${c.name}`,
            description: `Watch lesson chapters, study Smart Notes, and clear checkpoint quizzes for ${c.name}.`,
            duration_minutes: learnDur,
            priority: 2,
            linked_resource_type: c.video_segments[0] ? 'video' : undefined,
            linked_resource_id: c.video_segments[0]?.video_id,
            order_index: orderIndex++,
          });
          minutesLeft -= learnDur;
        } else if (c.status === 'weak') {
          // Revision Session + Focus
          const revDur = Math.min(minutesLeft, Math.max(20, Math.floor(maxDailyTime * 0.5)));
          dayItems.push({
            concept_id: c.id,
            topic_name: c.name,
            activity_type: 'revision',
            title: `AI Revision: ${c.name}`,
            description: `Adaptive drill specifically targeting low-mastery questions in ${c.name}.`,
            duration_minutes: revDur,
            priority: 3,
            linked_resource_type: c.video_segments[0] ? 'video' : undefined,
            linked_resource_id: c.video_segments[0]?.video_id,
            order_index: orderIndex++,
          });
          minutesLeft -= revDur;
        } else if (c.status === 'developing') {
          // Flashcards Recall
          const recallDur = Math.min(minutesLeft, Math.max(15, Math.floor(maxDailyTime * 0.4)));
          dayItems.push({
            concept_id: c.id,
            topic_name: c.name,
            activity_type: 'flashcards',
            title: `Active Recall: ${c.name}`,
            description: `Spaced repetition flashcard drill to build memory retention for ${c.name}.`,
            duration_minutes: recallDur,
            priority: 1,
            linked_resource_type: c.flashcard_ids.length > 0 ? 'flashcard_deck' : undefined,
            order_index: orderIndex++,
          });
          minutesLeft -= recallDur;
        } else {
          // Strong: Quick maintenance drill
          const maintDur = Math.min(minutesLeft, 15);
          dayItems.push({
            concept_id: c.id,
            topic_name: c.name,
            activity_type: 'flashcards',
            title: `Quick Maintenance: ${c.name}`,
            description: `Rapid memory check to keep ${c.name} in long-term recall.`,
            duration_minutes: maintDur,
            priority: 1,
            order_index: orderIndex++,
          });
          minutesLeft -= maintDur;
        }

        topicPointer++;
      }

      // If we finished topics or have remaining daily time, add focused practice
      if (minutesLeft >= 15) {
        dayItems.push({
          concept_id: null,
          topic_name: 'Deep Focus Drill',
          activity_type: 'focus',
          title: 'Deep Focus Study Session',
          description: 'Distraction-free focus timer session to reinforce today\'s concepts.',
          duration_minutes: minutesLeft,
          priority: 1,
          order_index: orderIndex++,
        });
        minutesLeft = 0;
      }
    }

    days.push({
      day_number: dayNum,
      date: dayDate,
      items: dayItems,
    });
  }

  return days;
}

/**
 * 5. Deterministic Validation of Generated Plan
 * Enforces:
 * - No item scheduled after examDate
 * - Total daily minutes <= dailyMinutes
 * - Valid concept IDs
 * - Valid activity types
 */
export function validatePlanConstraints(
  days: GeneratedPlanDay[],
  examDate: Date,
  dailyMinutes: number,
  validConceptIds: Set<string>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const validActivities = new Set(['learn', 'revision', 'flashcards', 'focus', 'mock_exam']);
  const examMidnight = new Date(examDate);
  examMidnight.setHours(23, 59, 59, 999);

  for (const day of days) {
    if (day.date.getTime() > examMidnight.getTime()) {
      errors.push(`Day ${day.day_number} (${day.date.toISOString()}) is scheduled after exam date.`);
    }

    let dayTotalMinutes = 0;
    for (const item of day.items) {
      dayTotalMinutes += item.duration_minutes;

      if (!validActivities.has(item.activity_type)) {
        errors.push(`Item "${item.title}" has invalid activity_type: ${item.activity_type}`);
      }

      if (item.concept_id && !validConceptIds.has(item.concept_id)) {
        errors.push(`Item "${item.title}" references non-existent concept_id: ${item.concept_id}`);
      }
    }

    if (dayTotalMinutes > dailyMinutes) {
      errors.push(`Day ${day.day_number} duration (${dayTotalMinutes}m) exceeds daily budget (${dailyMinutes}m).`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 6. Adaptive Replanning Engine
 * Updates future uncompleted days without modifying historical completed tasks.
 */
export async function replanExamSchedule({
  examId,
  reason = 'User mastery update',
}: {
  examId: string;
  reason?: string;
}): Promise<{ success: boolean; planVersion: number; reason: string }> {
  const exam = await db.exam.findUnique({
    where: { id: examId },
    include: {
      topics: true,
      plan_days: {
        include: { items: true },
        orderBy: { day_number: 'asc' },
      },
    },
  });

  if (!exam) throw new Error('Exam not found');

  const conceptIds = exam.topics
    .map((t) => t.concept_id)
    .filter((id): id is string => id !== null);

  const customTopicNames = exam.topics
    .filter((t) => !t.concept_id)
    .map((t) => t.topic_name);

  // Fetch updated concept mastery
  const concepts = await getConceptsForPlanning(conceptIds, exam.user_id);

  // Identify completed plan items and days
  const completedDayNumbers = new Set(
    exam.plan_days
      .filter((d) => d.status === 'completed' || d.items.every((it) => it.status === 'completed'))
      .map((d) => d.day_number)
  );

  const completedConceptIds = new Set(
    exam.plan_days
      .flatMap((d) => d.items)
      .filter((it) => it.status === 'completed' && it.concept_id)
      .map((it) => it.concept_id!)
  );

  // Generate new schedule starting from tomorrow or remaining days
  const today = new Date();
  const startDayNumber = completedDayNumbers.size + 1;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + completedDayNumbers.size);

  const newDays = generateDeterministicPlan({
    examDate: exam.exam_date,
    dailyMinutes: exam.daily_minutes,
    concepts,
    customTopics: customTopicNames,
    startDate,
  });

  // Delete pending/in_progress days after completed days
  const daysToDelete = exam.plan_days
    .filter((d) => !completedDayNumbers.has(d.day_number))
    .map((d) => d.id);

  if (daysToDelete.length > 0) {
    await db.examPlanItem.deleteMany({
      where: { plan_day_id: { in: daysToDelete } },
    });
    await db.examPlanDay.deleteMany({
      where: { id: { in: daysToDelete } },
    });
  }

  // Insert newly adapted days
  for (let i = 0; i < newDays.length; i++) {
    const nd = newDays[i];
    const dayNumber = startDayNumber + i;

    await db.examPlanDay.create({
      data: {
        exam_id: exam.id,
        day_number: dayNumber,
        date: nd.date,
        status: 'pending',
        items: {
          create: nd.items.map((it) => ({
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
      },
    });
  }

  // Update exam plan version & timestamp
  const updatedExam = await db.exam.update({
    where: { id: exam.id },
    data: {
      plan_version: { increment: 1 },
      last_replanned_at: new Date(),
      replan_reason: reason,
    },
  });

  return {
    success: true,
    planVersion: updatedExam.plan_version,
    reason,
  };
}
