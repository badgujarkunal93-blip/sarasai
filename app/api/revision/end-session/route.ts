import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, status = 'completed' } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const session = await db.revisionSession.update({
      where: { id: sessionId },
      data: {
        status,
        completed_at: new Date(),
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ session });
  } catch (error: any) {
    console.error('[API /api/revision/end-session Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to end session' },
      { status: 500 }
    );
  }
}
