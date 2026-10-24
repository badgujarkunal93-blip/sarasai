import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { genJSON, MANDATORY_PLAIN_TEXT_RULE } from '@/lib/llm';
import { z } from 'zod';

const ImageExplainZod = z.object({
  title: z.string(),
  summary: z.string(),
  explanation: z.string(),
  key_takeaways: z.array(z.string()).optional(),
});

const imageExplainSchema = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'Clear descriptive title of the slide, diagram, or formula',
    },
    summary: {
      type: 'string',
      description: 'Concise summary of what this image demonstrates',
    },
    explanation: {
      type: 'string',
      description: 'In-depth conceptual breakdown in plain text. No LaTeX, no $ symbols.',
    },
    key_takeaways: {
      type: 'array',
      items: { type: 'string' },
      description: '2 to 4 bullet takeaways',
    },
  },
  required: ['title', 'summary', 'explanation'],
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { videoId, segmentId, imageBase64, mimeType = 'image/png', fileName = 'Uploaded Slide' } = body;

    if (!videoId || !imageBase64) {
      return NextResponse.json(
        { error: 'videoId and imageBase64 are required.' },
        { status: 400 }
      );
    }

    // Verify video and optional segment
    const video = await db.video.findUnique({
      where: { id: videoId },
      include: {
        segments: { orderBy: { order_index: 'asc' } },
      },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found.' }, { status: 404 });
    }

    const targetSegment = segmentId
      ? video.segments.find((s) => s.id === segmentId) || video.segments[0]
      : video.segments[0];

    const prompt = `Analyze this uploaded image (slide, handwritten note, or diagram) related to the lesson: "${video.title}" (Chapter: "${targetSegment?.title || 'General'}").

Deconstruct the diagram, explain all components, flow arrows, variables, and architectural concepts clearly for a student.

CRITICAL RULE: ${MANDATORY_PLAIN_TEXT_RULE}`;

    // Call Gemma 4 via task 'image_explanation' (local primary, cloud fallback)
    const { data: analysis, provider, model } = await genJSON(
      'image_explanation',
      prompt,
      imageExplainSchema,
      ImageExplainZod,
      {
        image: {
          base64: imageBase64,
          mimeType,
        },
        systemPrompt: `You are an expert pedagogical vision tutor. Explain diagrams and slides in plain text. ${MANDATORY_PLAIN_TEXT_RULE}`,
      }
    );

    // Format content into clean study note
    const takeawaysText = analysis.key_takeaways?.length
      ? `\n\n### Key Takeaways:\n${analysis.key_takeaways.map((t) => `• ${t}`).join('\n')}`
      : '';

    const formattedContent = `**Summary:** ${analysis.summary}\n\n**Detailed Breakdown:**\n${analysis.explanation}${takeawaysText}`;

    // Compute next order index for notes
    const existingNotesCount = await db.smartNote.count({
      where: { video_id: video.id },
    });

    // Save into segment's notes in Prisma
    const note = await db.smartNote.create({
      data: {
        video_id: video.id,
        segment_id: targetSegment ? targetSegment.id : null,
        section_type: 'image_explanation',
        title: analysis.title || `Visual Analysis: ${fileName}`,
        content: formattedContent,
        order_index: existingNotesCount,
      },
    });

    return NextResponse.json({
      success: true,
      note,
      provider,
      model,
      badge: `Powered by Gemma 4 (${provider}: ${model})`,
    });
  } catch (err: any) {
    console.error('[IMAGE EXPLAIN ERROR]:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to explain image.' },
      { status: 500 }
    );
  }
}
