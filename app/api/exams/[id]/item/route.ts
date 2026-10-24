import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { itemId, status } = body;

    if (!itemId) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
    }

    if (!['pending', 'in_progress', 'completed', 'skipped'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updatedItem = await db.examPlanItem.update({
      where: { id: itemId },
      data: {
        status,
        completed_at: status === 'completed' ? new Date() : null,
      },
      include: {
        plan_day: {
          include: { items: true },
        },
      },
    });

    // Check if all items for that day are now completed
    const day = updatedItem.plan_day;
    const allCompleted = day.items.every(
      (it) => it.status === 'completed' || it.status === 'skipped'
    );

    if (allCompleted && day.status !== 'completed') {
      await db.examPlanDay.update({
        where: { id: day.id },
        data: { status: 'completed' },
      });
    } else if (!allCompleted && day.status === 'completed') {
      await db.examPlanDay.update({
        where: { id: day.id },
        data: { status: 'pending' },
      });
    }

    return NextResponse.json({ success: true, item: updatedItem });
  } catch (error: any) {
    console.error('Error updating exam plan item:', error);
    return NextResponse.json({ error: error.message || 'Failed to update plan item' }, { status: 500 });
  }
}
