import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = req.headers.get('x-user-id') || searchParams.get('userId') || 'default_user';

    const userProgress = await db.userVideoProgress.findMany({
      where: { user_id: userId },
    });

    const attentionEvents = await db.attentionEvent.findMany({
      where: { user_id: userId },
      select: { created_at: true },
    });

    // Collect all active dates
    const activityDates = new Set<string>();
    userProgress.forEach((p) => {
      activityDates.add(p.last_watched_at.toISOString().split('T')[0]);
    });
    attentionEvents.forEach((e) => {
      activityDates.add(e.created_at.toISOString().split('T')[0]);
    });

    // Calculate contiguous streak
    const sortedDates = Array.from(activityDates).sort().reverse();
    let streakDays = 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

    if (sortedDates.includes(todayStr) || sortedDates.includes(yesterdayStr)) {
      let checkDate = new Date(sortedDates.includes(todayStr) ? todayStr : yesterdayStr);
      while (true) {
        const dateKey = checkDate.toISOString().split('T')[0];
        if (activityDates.has(dateKey)) {
          streakDays++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    return NextResponse.json({
      streakDays,
      totalWatchedLessons: userProgress.length,
      activityDates: Array.from(activityDates),
    });
  } catch (error: any) {
    console.error('[API /api/progress GET Error]:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch progress stats' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      videoId,
      userId = 'default_user',
      completedSegmentId,
      currentSegmentIndex,
    } = body;

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    const existing = await db.userVideoProgress.findUnique({
      where: {
        user_id_video_id: {
          user_id: userId,
          video_id: videoId,
        },
      },
    });

    let completedIds: string[] = [];
    if (existing && existing.completed_segment_ids) {
      try {
        completedIds = JSON.parse(existing.completed_segment_ids);
      } catch {
        completedIds = [];
      }
    }

    if (completedSegmentId && !completedIds.includes(completedSegmentId)) {
      completedIds.push(completedSegmentId);
    }

    const nextIndex =
      currentSegmentIndex !== undefined
        ? currentSegmentIndex
        : existing
        ? existing.current_segment_index
        : 0;

    const progress = await db.userVideoProgress.upsert({
      where: {
        user_id_video_id: {
          user_id: userId,
          video_id: videoId,
        },
      },
      update: {
        completed_segment_ids: JSON.stringify(completedIds),
        current_segment_index: nextIndex,
        last_watched_at: new Date(),
      },
      create: {
        user_id: userId,
        video_id: videoId,
        completed_segment_ids: JSON.stringify(completedIds),
        current_segment_index: nextIndex,
        last_watched_at: new Date(),
      },
    });

    return NextResponse.json({ progress, completedSegmentIds: completedIds });
  } catch (error: any) {
    console.error('[API /api/progress POST Error]:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update progress' }, { status: 500 });
  }
}
