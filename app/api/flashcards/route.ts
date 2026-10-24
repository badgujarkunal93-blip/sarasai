import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('videoId');

    const flashcards = await db.flashcard.findMany({
      where: videoId ? { video_id: videoId } : undefined,
      orderBy: { created_at: 'desc' },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            channel: true,
            thumbnail_url: true,
          },
        },
      },
    });

    return NextResponse.json({ flashcards });
  } catch (error: any) {
    console.error('[API /api/flashcards GET Error]:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch flashcards' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { videoId, front, back, action } = body;

    if (action === 'regenerate' && videoId) {
      const { regenerateVideoFlashcards } = await import('@/lib/services/ingestion');
      const flashcards = await regenerateVideoFlashcards(videoId);
      return NextResponse.json({ success: true, flashcards });
    }

    if (!videoId || !front || !back) {
      return NextResponse.json({ error: 'videoId, front, and back are required' }, { status: 400 });
    }

    const flashcard = await db.flashcard.create({
      data: {
        video_id: videoId,
        front,
        back,
        mastered: false,
      },
    });

    return NextResponse.json({ flashcard });
  } catch (error: any) {
    console.error('[API /api/flashcards POST Error]:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create flashcard' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, mastered, front, back } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const flashcard = await db.flashcard.update({
      where: { id },
      data: {
        ...(mastered !== undefined && { mastered }),
        ...(front !== undefined && { front }),
        ...(back !== undefined && { back }),
      },
    });

    return NextResponse.json({ flashcard });
  } catch (error: any) {
    console.error('[API /api/flashcards PATCH Error]:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update flashcard' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await db.flashcard.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API /api/flashcards DELETE Error]:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete flashcard' }, { status: 500 });
  }
}
