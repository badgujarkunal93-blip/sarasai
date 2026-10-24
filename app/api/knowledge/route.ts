import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { MASTERY_THRESHOLDS, getMasteryState } from '@/lib/services/ai';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'default_user';
    const category = searchParams.get('category');
    const filter = searchParams.get('filter'); // 'ALL' | 'STRONG' | 'DEVELOPING' | 'WEAK' | 'NOT_STUDIED'
    const search = searchParams.get('search');

    // 1. Query all concepts with relationships and user mastery
    const concepts = await db.concept.findMany({
      where: {
        ...(category && category !== 'All Topics' ? { category } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { description: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        user_mastery: {
          where: { user_id: userId },
        },
        video_segments: {
          include: {
            segment: {
              include: {
                video: {
                  select: {
                    id: true,
                    title: true,
                    channel: true,
                    thumbnail_url: true,
                    youtube_video_id: true,
                  },
                },
              },
            },
          },
        },
        flashcards: {
          include: {
            flashcard: true,
          },
        },
        quiz_questions: {
          include: {
            quiz_question: true,
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    // 2. Fetch all relationships between existing concepts
    const conceptIds = concepts.map((c) => c.id);
    const relationships = await db.conceptRelationship.findMany({
      where: {
        source_concept_id: { in: conceptIds },
        target_concept_id: { in: conceptIds },
      },
    });

    // 3. Transform nodes with mastery statistics
    const nodes = concepts.map((c, idx) => {
      const masteryRecord = c.user_mastery[0];
      const score = masteryRecord?.mastery_score ?? 0;
      const exposureCount = masteryRecord?.exposure_count ?? 0;
      const correctCount = masteryRecord?.correct_count ?? 0;
      const wrongCount = masteryRecord?.wrong_count ?? 0;
      const lastSeenAt = masteryRecord?.last_seen_at ?? c.created_at;
      const state = getMasteryState(score, exposureCount);

      // Collect source videos and segments
      const sourceVideosMap = new Map<string, any>();
      for (const cs of c.video_segments) {
        if (cs.segment?.video) {
          const v = cs.segment.video;
          if (!sourceVideosMap.has(v.id)) {
            sourceVideosMap.set(v.id, {
              id: v.id,
              title: v.title,
              channel: v.channel,
              youtube_video_id: v.youtube_video_id,
              segment_title: cs.segment.title,
              start_seconds: cs.source_start_seconds ?? cs.segment.start_seconds,
            });
          }
        }
      }

      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        category: c.category || 'Computer Science',
        mastery_score: score,
        mastery_state: state,
        exposure_count: exposureCount,
        correct_count: correctCount,
        wrong_count: wrongCount,
        last_seen_at: lastSeenAt,
        source_videos: Array.from(sourceVideosMap.values()),
        flashcards_count: c.flashcards.length,
        quiz_count: c.quiz_questions.length,
      };
    });

    // Apply mastery state filter if requested
    let filteredNodes = nodes;
    if (filter && filter !== 'ALL') {
      filteredNodes = nodes.filter((n) => n.mastery_state === filter);
    }

    // 4. Calculate summary metrics
    const totalCount = nodes.length;
    const strongCount = nodes.filter((n) => n.mastery_state === 'MASTERED').length;
    const developingCount = nodes.filter((n) => n.mastery_state === 'DEVELOPING').length;
    const weakCount = nodes.filter((n) => n.mastery_state === 'WEAK').length;
    const notStudiedCount = nodes.filter((n) => n.mastery_state === 'NOT_STUDIED').length;

    // 5. Weak areas (needs attention)
    const weakAreas = nodes
      .filter((n) => n.mastery_state === 'WEAK' || (n.mastery_score > 0 && n.mastery_score < 50))
      .sort((a, b) => a.mastery_score - b.mastery_score)
      .slice(0, 5);

    // 6. Recently learned
    const recentlyLearned = [...nodes]
      .filter((n) => n.exposure_count > 0)
      .sort((a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime())
      .slice(0, 5);

    // 7. Suggested next concept (deterministic based on prerequisite graph)
    let suggestedNext: any = null;
    for (const rel of relationships) {
      if (rel.relationship_type === 'prerequisite') {
        const sourceNode = nodes.find((n) => n.id === rel.source_concept_id);
        const targetNode = nodes.find((n) => n.id === rel.target_concept_id);
        if (
          sourceNode &&
          targetNode &&
          sourceNode.mastery_score >= 50 &&
          targetNode.mastery_score < 50
        ) {
          suggestedNext = {
            concept: targetNode,
            prerequisite: sourceNode,
            reason: `Because you understand ${sourceNode.name} (${sourceNode.mastery_score}%), studying ${targetNode.name} is your natural next step.`,
          };
          break;
        }
      }
    }

    // 8. Distinct available categories
    const allCategories = Array.from(
      new Set(nodes.map((n) => n.category).filter(Boolean))
    );

    return NextResponse.json({
      summary: {
        total: totalCount,
        strong: strongCount,
        developing: developingCount,
        weak: weakCount,
        not_studied: notStudiedCount,
      },
      categories: allCategories,
      nodes: filteredNodes,
      edges: relationships.map((r) => ({
        id: r.id,
        source: r.source_concept_id,
        target: r.target_concept_id,
        type: r.relationship_type,
        weight: r.weight,
      })),
      weak_areas: weakAreas,
      recently_learned: recentlyLearned,
      suggested_next: suggestedNext,
    });
  } catch (error: any) {
    console.error('[API /api/knowledge GET Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch knowledge map' },
      { status: 500 }
    );
  }
}
