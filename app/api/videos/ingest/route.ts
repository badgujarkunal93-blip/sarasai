import { NextRequest, NextResponse } from 'next/server';
import { ingestVideo } from '@/lib/services/ingestion';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { youtubeUrl, source = 'manual', userId = 'default_user' } = body;

    if (!youtubeUrl || typeof youtubeUrl !== 'string') {
      return NextResponse.json(
        { error: 'A valid youtubeUrl string is required.' },
        { status: 400 }
      );
    }

    const result = await ingestVideo(youtubeUrl, { source, userId });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API /api/videos/ingest Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to ingest video.' },
      { status: 500 }
    );
  }
}
