import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'default_user';
    const videoId = params.id;

    const video = await db.video.findFirst({
      where: {
        OR: [{ id: videoId }, { youtube_video_id: videoId }],
      },
      include: {
        segments: {
          orderBy: { order_index: 'asc' },
          include: {
            quiz_questions: true,
          },
        },
        flashcards: {
          orderBy: { created_at: 'asc' },
        },
        progress: {
          where: { user_id: userId },
        },
      },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Parse options JSON strings in quiz_questions
    const formattedSegments = video.segments.map((seg) => ({
      ...seg,
      quiz_questions: seg.quiz_questions.map((q) => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      })),
    }));

    return NextResponse.json({
      video: {
        ...video,
        segments: formattedSegments,
        userProgress: video.progress[0] || {
          current_segment_index: 0,
          completed_segment_ids: '[]',
        },
      },
    });
  } catch (error: any) {
    console.error('[API /api/videos/[id] GET Error]:', error);
    return NextResponse.json({ error: error?.message || 'Failed to get video' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const videoId = params.id;
    await db.video.delete({
      where: { id: videoId },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API /api/videos/[id] DELETE Error]:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete video' }, { status: 500 });
  }
}
