import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'default_user';

    const activeSession = await db.revisionSession.findFirst({
      where: {
        user_id: userId,
        status: 'in_progress',
      },
      include: {
        items: {
          orderBy: { order_index: 'asc' },
          include: {
            concept: {
              include: {
                user_mastery: {
                  where: { user_id: userId },
                },
              },
            },
          },
        },
      },
      orderBy: { started_at: 'desc' },
    });

    return NextResponse.json({ session: activeSession });
  } catch (error: any) {
    console.error('[API /api/revision/active Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch active session' },
      { status: 500 }
    );
  }
}
