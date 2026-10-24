import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'default_user';

    const videos = await db.video.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        segments: {
          orderBy: { order_index: 'asc' },
          select: {
            id: true,
            order_index: true,
            title: true,
            start_seconds: true,
            end_seconds: true,
          },
        },
        flashcards: {
          select: { id: true, mastered: true },
        },
        progress: {
          where: { user_id: userId },
        },
      },
    });

    return NextResponse.json({ videos });
  } catch (error: any) {
    console.error('[API /api/videos GET Error]:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch videos' }, { status: 500 });
  }
}
