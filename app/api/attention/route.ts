import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'default_user';
    const videoId = searchParams.get('videoId');

    const whereClause: any = { user_id: userId };
    if (videoId) whereClause.video_id = videoId;

    const events = await db.attentionEvent.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      take: 50,
      include: {
        video: { select: { title: true } },
      },
    });

    const lookAwayCount = await db.attentionEvent.count({
      where: { ...whereClause, event_type: 'looked_away' },
    });

    const noFaceCount = await db.attentionEvent.count({
      where: { ...whereClause, event_type: 'no_face' },
    });

    const resumeCount = await db.attentionEvent.count({
      where: { ...whereClause, event_type: 'resumed' },
    });

    return NextResponse.json({
      events,
      stats: {
        totalLookAways: lookAwayCount,
        totalNoFace: noFaceCount,
        totalResumes: resumeCount,
      },
    });
  } catch (error: any) {
    console.error('[API /api/attention GET Error]:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch attention stats' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId = 'default_user',
      videoId,
      segmentId,
      eventType, // 'looked_away' | 'resumed' | 'no_face'
    } = body;

    if (!eventType) {
      return NextResponse.json(
        { error: 'eventType is required' },
        { status: 400 }
      );
    }

    const event = await db.attentionEvent.create({
      data: {
        user_id: userId,
        video_id: videoId || null,
        segment_id: segmentId || null,
        event_type: eventType,
      },
    });

    return NextResponse.json({ event });
  } catch (error: any) {
    console.error('[API /api/attention POST Error]:', error);
    return NextResponse.json({ error: error?.message || 'Failed to log attention event' }, { status: 500 });
  }
}
