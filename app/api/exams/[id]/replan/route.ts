import { NextRequest, NextResponse } from 'next/server';
import { replanExamSchedule } from '@/lib/services/examPlanner';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const examId = params.id;
    const body = await req.json().catch(() => ({}));
    const reason = body.reason || 'User requested adaptive plan optimization';

    const result = await replanExamSchedule({
      examId,
      reason,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error replanning exam:', error);
    return NextResponse.json({ error: error.message || 'Failed to replan exam' }, { status: 500 });
  }
}
