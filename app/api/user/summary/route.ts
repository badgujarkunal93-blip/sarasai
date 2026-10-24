import { NextRequest, NextResponse } from 'next/server';
import { getUserLearningSummary, updateUserProfile } from '@/lib/services/userProfile';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = req.headers.get('x-user-id') || searchParams.get('userId') || 'default_user';
    const tzOffset = parseInt(searchParams.get('tzOffset') || '0', 10);

    const summary = await getUserLearningSummary(userId, isNaN(tzOffset) ? 0 : tzOffset);

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error: any) {
    console.error('[API /api/user/summary GET Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch user learning summary' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId = 'default_user', name, email, avatarUrl } = body;

    const updated = await updateUserProfile(userId, { name, email, avatarUrl });
    const summary = await getUserLearningSummary(userId);

    return NextResponse.json({
      success: true,
      user: updated,
      summary,
    });
  } catch (error: any) {
    console.error('[API /api/user/summary PATCH Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update user profile' },
      { status: 500 }
    );
  }
}
