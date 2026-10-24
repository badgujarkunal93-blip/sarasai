import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateSingleSegmentContent } from '@/lib/services/ingestion';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const segmentId = params.id;
    const segment = await db.segment.findUnique({
      where: { id: segmentId },
      include: {
        quiz_questions: true,
      },
    });

    if (!segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
    }

    // Parse options in quiz questions if needed
    const parsedQuestions = segment.quiz_questions.map((q) => ({
      ...q,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
    }));

    return NextResponse.json({
      segment: {
        ...segment,
        quiz_questions: parsedQuestions,
      },
    });
  } catch (error: any) {
    console.error('[API /api/segments/[id] GET Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch segment' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const segmentId = params.id;
    const updated = await generateSingleSegmentContent(segmentId);

    if (!updated) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
    }

    const parsedQuestions = updated.quiz_questions.map((q) => ({
      ...q,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
    }));

    return NextResponse.json({
      success: true,
      segment: {
        ...updated,
        quiz_questions: parsedQuestions,
      },
    });
  } catch (error: any) {
    console.error('[API /api/segments/[id] POST Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate segment' },
      { status: 500 }
    );
  }
}
