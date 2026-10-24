import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'default_user';

    const tasks = await db.task.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      include: {
        linked_video: {
          select: {
            id: true,
            title: true,
            thumbnail_url: true,
          },
        },
      },
    });

    return NextResponse.json({ tasks });
  } catch (error: any) {
    console.error('[API /api/tasks GET Error]:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { label, userId = 'default_user', linked_video_id } = body;

    if (!label || typeof label !== 'string') {
      return NextResponse.json({ error: 'label is required' }, { status: 400 });
    }

    const task = await db.task.create({
      data: {
        label,
        user_id: userId,
        linked_video_id: linked_video_id || null,
        done: false,
      },
      include: {
        linked_video: {
          select: {
            id: true,
            title: true,
            thumbnail_url: true,
          },
        },
      },
    });

    return NextResponse.json({ task });
  } catch (error: any) {
    console.error('[API /api/tasks POST Error]:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create task' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, done, label } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const task = await db.task.update({
      where: { id },
      data: {
        ...(done !== undefined && { done }),
        ...(label !== undefined && { label }),
      },
      include: {
        linked_video: {
          select: {
            id: true,
            title: true,
            thumbnail_url: true,
          },
        },
      },
    });

    return NextResponse.json({ task });
  } catch (error: any) {
    console.error('[API /api/tasks PATCH Error]:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await db.task.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API /api/tasks DELETE Error]:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete task' }, { status: 500 });
  }
}
