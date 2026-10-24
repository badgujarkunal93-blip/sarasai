import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chatAssistantReply, ChatContext } from '@/lib/services/ai';
import { ingestVideo } from '@/lib/services/ingestion';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'default_user';

    const messages = await db.chatMessage.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'asc' },
      take: 100,
    });

    const parsed = messages.map((m) => ({
      ...m,
      suggested_video_ids: m.suggested_video_ids
        ? JSON.parse(m.suggested_video_ids)
        : null,
    }));

    return NextResponse.json({ messages: parsed });
  } catch (error: any) {
    console.error('[API /api/chat GET Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch chat messages' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'default_user';

    await db.chatMessage.deleteMany({
      where: { user_id: userId },
    });

    return NextResponse.json({ success: true, message: 'Chat history cleared' });
  } catch (error: any) {
    console.error('[API /api/chat DELETE Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to clear chat history' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message,
      userId = 'default_user',
      action, // 'ingest_suggested' | 'create_flashcards'
      videoUrl,
      videoId,
      segmentId,
    } = body;

    // Action 1: Add video directly from chat assistant suggestions
    if (action === 'ingest_suggested' && videoUrl) {
      const ingestRes = await ingestVideo(videoUrl, { source: 'chat', userId });

      const confirmationMsg = await db.chatMessage.create({
        data: {
          user_id: userId,
          role: 'assistant',
          content: `✅ Added **${ingestRes.video.title}** to your library! It's partitioned into ${
            (ingestRes.video as any).segments?.length || 3
          } topic checkpoints ready for learning.`,
          suggested_video_ids: JSON.stringify([
            {
              id: ingestRes.video.id,
              title: ingestRes.video.title,
              channel: ingestRes.video.channel,
              thumbnail_url: ingestRes.video.thumbnail_url,
              status: ingestRes.video.status,
            },
          ]),
        },
      });

      return NextResponse.json({
        success: true,
        video: ingestRes.video,
        reply: {
          ...confirmationMsg,
          suggested_video_ids: JSON.parse(confirmationMsg.suggested_video_ids || '[]'),
        },
        provider: 'Saras Ingestion Agent',
      });
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const trimmedMessage = message.trim();

    // Action 2: Direct YouTube URL pasted into chat input
    const isYouTubeUrl =
      trimmedMessage.includes('youtube.com/watch') ||
      trimmedMessage.includes('youtu.be/') ||
      trimmedMessage.includes('youtube.com/shorts');

    if (isYouTubeUrl) {
      // Record user's URL message
      await db.chatMessage.create({
        data: {
          user_id: userId,
          role: 'user',
          content: trimmedMessage,
        },
      });

      // Ingest via shared deterministic pipeline
      const ingestRes = await ingestVideo(trimmedMessage, { source: 'chat', userId });

      const assistantMsg = await db.chatMessage.create({
        data: {
          user_id: userId,
          role: 'assistant',
          content: `🎥 **${ingestRes.video.title}**\n\nI processed this video and extracted **${
            (ingestRes.video as any).segments?.length || 3
          } topic chapters** with checkpoint quizzes, smart notes, and recall cards. You can jump in right now!`,
          suggested_video_ids: JSON.stringify([
            {
              id: ingestRes.video.id,
              title: ingestRes.video.title,
              channel: ingestRes.video.channel,
              thumbnail_url: ingestRes.video.thumbnail_url,
              status: ingestRes.video.status,
            },
          ]),
        },
      });

      return NextResponse.json({
        reply: {
          ...assistantMsg,
          suggested_video_ids: JSON.parse(assistantMsg.suggested_video_ids || '[]'),
        },
        video: ingestRes.video,
        provider: 'Saras Ingestion Agent',
      });
    }

    // Save user's message to chat history
    await db.chatMessage.create({
      data: {
        user_id: userId,
        role: 'user',
        content: trimmedMessage,
      },
    });

    // ─────────────────────────────────────────────────────────────
    // CONTEXT GATHERING: Load video, chapter, transcript, mastery
    // ─────────────────────────────────────────────────────────────
    const chatContext: ChatContext = {
      userId,
    };

    // A. Resolve video context if on a lesson or recent progress
    let targetVideoId = videoId;
    if (!targetVideoId) {
      const recentProg = await db.userVideoProgress.findFirst({
        where: { user_id: userId },
        orderBy: { last_watched_at: 'desc' },
      });
      if (recentProg) targetVideoId = recentProg.video_id;
    }

    if (targetVideoId) {
      const videoRecord = await db.video.findUnique({
        where: { id: targetVideoId },
        include: {
          segments: {
            orderBy: { order_index: 'asc' },
            include: { concept_segments: { include: { concept: true } } },
          },
          notes: { where: { section_type: 'overview' }, take: 1 },
        },
      });

      if (videoRecord) {
        chatContext.videoTitle = videoRecord.title;
        chatContext.channel = videoRecord.channel;
        chatContext.smartNotesOverview = videoRecord.notes[0]?.content;

        // Find active segment
        let activeSegment = videoRecord.segments[0];
        if (segmentId) {
          const matched = videoRecord.segments.find((s) => s.id === segmentId);
          if (matched) activeSegment = matched;
        }

        if (activeSegment) {
          chatContext.segmentTitle = activeSegment.title;
          chatContext.conceptNames = activeSegment.concept_segments?.map((c) => c.concept.name) || [];

          // Use segment summary and notes for grounded context
          const segmentNotes = videoRecord.notes.filter((n) => n.segment_id === activeSegment.id);
          chatContext.segmentTranscript =
            activeSegment.summary ||
            segmentNotes.map((n) => `${n.title}: ${n.content}`).join('\n') ||
            chatContext.smartNotesOverview ||
            '';
        }
      }
    }

    // B. Resolve User Mastery & Weak Concepts
    const userMasteries = await db.userConceptMastery.findMany({
      where: { user_id: userId },
      include: { concept: true },
      orderBy: { mastery_score: 'asc' },
      take: 6,
    });

    if (userMasteries.length > 0) {
      chatContext.userWeakConcepts = userMasteries
        .filter((m) => m.mastery_score < 50 || m.wrong_count > 0)
        .map((m) => `${m.concept.name} (${m.mastery_score}%)`);

      chatContext.userMasteredConcepts = userMasteries
        .filter((m) => m.mastery_score >= 80)
        .map((m) => m.concept.name);
    }

    // C. Resolve Active Exam
    const activeExam = await db.exam.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    if (activeExam) {
      const now = new Date();
      const examDate = new Date(activeExam.exam_date);
      const daysLeft = Math.max(0, Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      chatContext.activeExamTitle = activeExam.name;
      chatContext.activeExamDaysLeft = daysLeft;
    }

    // Fetch prior history (up to last 10 messages for conversation continuity)
    const history = await db.chatMessage.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'asc' },
      take: 10,
    });

    // ─────────────────────────────────────────────────────────────
    // AI GENERATION: Call Groq LLaMA 3.3 70B with Claude Fallback
    // ─────────────────────────────────────────────────────────────
    const aiResponse = await chatAssistantReply(
      trimmedMessage,
      history.map((h) => ({ role: h.role, content: h.content })),
      chatContext
    );

    let finalReplyText = aiResponse.reply;

    // ─────────────────────────────────────────────────────────────
    // PERSISTENCE ACTION: Flashcard Generation & Insertion
    // ─────────────────────────────────────────────────────────────
    if (aiResponse.generatedFlashcards && aiResponse.generatedFlashcards.length > 0) {
      // Find a video to associate the flashcards with
      let cardVideoId = targetVideoId;
      if (!cardVideoId) {
        const anyVideo = await db.video.findFirst();
        if (anyVideo) cardVideoId = anyVideo.id;
      }

      if (cardVideoId) {
        try {
          const cardsToInsert = aiResponse.generatedFlashcards.map((c) => ({
            video_id: cardVideoId,
            front: c.front,
            back: c.back,
            mastered: false,
          }));

          await db.flashcard.createMany({
            data: cardsToInsert,
          });

          finalReplyText += `\n\n✅ *Persisted ${cardsToInsert.length} new flashcards to your Flashcards Studio!*`;
        } catch (cardErr) {
          console.error('[CHAT FLASHCARD INSERT ERROR]:', cardErr);
          finalReplyText += `\n\n⚠️ *I generated the cards, but could not save them to the database.*`;
        }
      }
    }

    // Save assistant response
    const assistantMsg = await db.chatMessage.create({
      data: {
        user_id: userId,
        role: 'assistant',
        content: finalReplyText,
        suggested_video_ids: aiResponse.suggestedVideos
          ? JSON.stringify(aiResponse.suggestedVideos)
          : null,
      },
    });

    return NextResponse.json({
      reply: {
        ...assistantMsg,
        suggested_video_ids: aiResponse.suggestedVideos || null,
      },
      provider: aiResponse.provider,
    });
  } catch (error: any) {
    console.error('[API /api/chat POST Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
