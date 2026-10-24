import { db } from '@/lib/db';
import { extractYouTubeId, getYouTubeThumbnail } from '@/lib/utils';
import { fetchTranscript, fetchYouTubeMetadata } from './transcript';
import {
  generateSegmentsAndQuizzes,
  generateTranscriptGroundedFlashcards,
  validateAndFilterFlashcards,
  generateSmartNotesForVideo,
  extractConceptsAndRelationshipsForVideo,
  generateQuizForSegment,
  generateSegmentFlashcards,
  generateSegmentDiagrams,
} from './ai';
import { FlowchartJSON, MindMapJSON } from '../diagrams';
import { ProviderType } from '../llm';

export interface IngestOptions {
  source?: 'manual' | 'chat';
  userId?: string;
  forceReingest?: boolean;
}

/**
 * Unified Shared Ingestion Pipeline with Progressive Generation:
 * - Divides transcript into chapters with Gemma 4 (task: split_transcript).
 * - Generates Segment 1 completely first (4 quiz questions, mind map JSON, flowchart JSON).
 * - Caches content in Prisma per segment.
 * - Processes subsequent segments in the background one at a time.
 */
export async function ingestVideo(youtubeUrl: string, options: IngestOptions = {}) {
  const userId = options.userId || 'default_user';
  const videoId = extractYouTubeId(youtubeUrl);

  if (!videoId) {
    throw new Error('Invalid YouTube URL or Video ID provided. Please check the URL format.');
  }

  console.log(`[INGEST] video_id=${videoId} source=${options.source || 'manual'}`);

  // 1. Deduplication / Cache check
  const existingVideo = await db.video.findUnique({
    where: { youtube_video_id: videoId },
    include: {
      segments: {
        orderBy: { order_index: 'asc' },
        include: { quiz_questions: true },
      },
      flashcards: true,
      notes: {
        orderBy: { order_index: 'asc' },
      },
    },
  });

  // Cache hit: already processed with valid chapters and stored in database
  if (
    existingVideo &&
    existingVideo.status === 'ready' &&
    !options.forceReingest &&
    (existingVideo.duration_seconds < 180 || existingVideo.segments.length >= 3)
  ) {
    console.log(`[CACHE] hit (loaded ${existingVideo.segments.length} segments, ${existingVideo.flashcards.length} flashcards from database for video_id=${videoId})`);
    await ensureUserProgress(existingVideo.id, userId);
    return {
      video: existingVideo,
      cached: true,
    };
  }

  // Concurrent lock: currently being processed
  if (existingVideo && existingVideo.status === 'processing' && !options.forceReingest) {
    console.log(`[CACHE] pending (video_id=${videoId} is currently processing)`);
    return {
      video: existingVideo,
      cached: true,
    };
  }

  console.log(`[CACHE] miss (starting fresh ingestion for video_id=${videoId})`);

  // 2. Create or Reset video record to 'processing'
  let video = existingVideo
    ? await db.video.update({
        where: { id: existingVideo.id },
        data: {
          status: 'processing',
          error_reason: null,
        },
      })
    : await db.video.create({
        data: {
          youtube_video_id: videoId,
          title: `Processing Video: ${videoId}...`,
          channel: 'YouTube Creator',
          duration_seconds: 0,
          thumbnail_url: getYouTubeThumbnail(videoId),
          status: 'processing',
        },
      });

  // 3. Process video pipeline
  try {
    const meta = await fetchYouTubeMetadata(videoId);
    console.log(`[METADATA] fetched title="${meta.title}" channel="${meta.channel}"`);

    const { items: transcriptItems, fullText, estimatedDuration } = await fetchTranscript(videoId);
    console.log(`[TRANSCRIPT] fetched ${transcriptItems.length} transcript items, estimatedDuration=${estimatedDuration}s`);

    const totalDuration = estimatedDuration > 0 ? estimatedDuration : 480;

    // Step A: Split transcript into chapters via Gemma 4 (cloud: split_transcript)
    const aiResult = await generateSegmentsAndQuizzes(meta.title, transcriptItems, totalDuration);
    console.log(`[AI] split into ${aiResult.segments.length} segments`);

    // Step B: Generate Segment 1 diagrams & 4 quiz questions immediately
    const segment1Proposal = aiResult.segments[0];
    let seg1Diagrams: {
      flowchart: FlowchartJSON;
      mindmap: MindMapJSON;
      provider: ProviderType;
      model: string;
    } = {
      flowchart: {
        nodes: [{ id: 's1', label: segment1Proposal?.title || 'Chapter 1' }],
        edges: [],
      },
      mindmap: {
        topic: segment1Proposal?.title || 'Chapter 1',
        children: [{ topic: 'Core Concept' }],
      },
      provider: 'local',
      model: 'gemma4:e4b',
    };

    if (segment1Proposal) {
      try {
        seg1Diagrams = await generateSegmentDiagrams(
          segment1Proposal.title,
          segment1Proposal.summary
        );
      } catch (err: any) {
        console.warn('[SEG 1 DIAGRAM GEN WARN]:', err.message);
      }
    }

    // Ensure 4 questions for segment 1
    let seg1Questions = segment1Proposal?.quiz_questions || [];
    if (seg1Questions.length < 4 && segment1Proposal) {
      try {
        const qRes = await generateQuizForSegment(
          segment1Proposal.title,
          segment1Proposal.summary
        );
        if (qRes.questions.length >= 4) {
          seg1Questions = qRes.questions;
        }
      } catch (e: any) {
        console.warn('[SEG 1 QUIZ EXPANSION WARN]:', e.message);
      }
    }

    // Step C: Generate 5 video-grounded flashcards
    let flashcardsToPersist = aiResult.flashcards;
    try {
      const fcRes = await generateSegmentFlashcards(
        meta.title,
        aiResult.segments
      );
      if (fcRes.flashcards.length >= 5) {
        flashcardsToPersist = fcRes.flashcards;
      }
    } catch (e: any) {
      console.warn('[FLASHCARD GEN WARN]:', e.message);
    }

    // Step D: Run AI Smart Notes Synthesis
    let smartNotes: any[] = [];
    try {
      smartNotes = await generateSmartNotesForVideo(meta.title, meta.channel, aiResult.segments, transcriptItems);
    } catch (e: any) {
      console.warn(`[AI] Smart Notes generation non-fatal error:`, e.message);
    }

    // Step E: Run AI Knowledge Graph Concept Extraction
    let extractedConcepts: any[] = [];
    try {
      extractedConcepts = await extractConceptsAndRelationshipsForVideo(
        meta.title,
        meta.channel,
        aiResult.segments,
        fullText
      );
    } catch (e: any) {
      console.warn(`[AI] Concept extraction non-fatal error:`, e.message);
    }

    // Step F: Persist everything to database in atomic transaction
    const updatedVideo = await db.$transaction(async (tx) => {
      // Clear any prior partial records if retrying
      await tx.quizQuestion.deleteMany({
        where: { segment: { video_id: video.id } },
      });
      await tx.segment.deleteMany({
        where: { video_id: video.id },
      });
      await tx.flashcard.deleteMany({
        where: { video_id: video.id },
      });
      await tx.smartNote.deleteMany({
        where: { video_id: video.id },
      });

      // Update Video metadata & status
      const savedVideo = await tx.video.update({
        where: { id: video.id },
        data: {
          title: meta.title,
          channel: meta.channel,
          duration_seconds: totalDuration,
          thumbnail_url: meta.thumbnailUrl || getYouTubeThumbnail(videoId),
          status: 'ready',
          error_reason: null,
        },
      });

      const createdSegments: any[] = [];

      // Insert Segments: Segment 1 is 'ready' with diagrams; Segments 2..N are 'pending'
      for (let idx = 0; idx < aiResult.segments.length; idx++) {
        const seg = aiResult.segments[idx];
        const isSegment1 = idx === 0;

        const createdSeg = await tx.segment.create({
          data: {
            video_id: savedVideo.id,
            order_index: seg.order_index,
            title: seg.title,
            summary: seg.summary,
            start_seconds: seg.start_seconds,
            end_seconds: seg.end_seconds,
            generation_status: isSegment1 ? 'ready' : 'pending',
            llm_provider: isSegment1 ? seg1Diagrams.provider : null,
            flowchart_json: isSegment1 ? JSON.stringify(seg1Diagrams.flowchart) : null,
            mindmap_json: isSegment1 ? JSON.stringify(seg1Diagrams.mindmap) : null,
          },
        });
        createdSegments.push(createdSeg);

        // If Segment 1, persist its quiz questions immediately
        if (isSegment1) {
          for (const q of seg1Questions) {
            await tx.quizQuestion.create({
              data: {
                segment_id: createdSeg.id,
                question: q.question,
                options: JSON.stringify(q.options),
                correct_answer: q.correct_answer,
                explanation: q.explanation,
              },
            });
          }
        }
      }

      // Insert Flashcards (5 items)
      for (const fc of flashcardsToPersist.slice(0, 5)) {
        await tx.flashcard.create({
          data: {
            video_id: savedVideo.id,
            front: fc.front,
            back: fc.back,
            mastered: false,
          },
        });
      }

      // Insert Smart Notes
      for (let i = 0; i < smartNotes.length; i++) {
        const note = smartNotes[i];
        const matchedSeg =
          note.segment_order_index != null && createdSegments[note.segment_order_index]
            ? createdSegments[note.segment_order_index]
            : null;

        await tx.smartNote.create({
          data: {
            video_id: savedVideo.id,
            segment_id: matchedSeg ? matchedSeg.id : null,
            section_type: note.section_type,
            title: note.title,
            content: note.content,
            source_start_seconds: note.source_start_seconds,
            source_end_seconds: note.source_end_seconds,
            order_index: i,
          },
        });
      }

      // Link Knowledge Graph Concepts
      for (const rawConcept of extractedConcepts) {
        let concept = await tx.concept.findUnique({
          where: { name: rawConcept.name },
        });

        if (!concept) {
          const slug = String(rawConcept.name)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

          concept = await tx.concept.create({
            data: {
              name: rawConcept.name,
              slug,
              category: rawConcept.category,
              description: rawConcept.description,
            },
          });
        }

        for (const orderIdx of rawConcept.segment_order_indices) {
          const targetSeg = createdSegments[orderIdx];
          if (targetSeg) {
            await tx.conceptSegment.upsert({
              where: {
                concept_id_segment_id: {
                  concept_id: concept.id,
                  segment_id: targetSeg.id,
                },
              },
              create: {
                concept_id: concept.id,
                segment_id: targetSeg.id,
              },
              update: {},
            });
          }
        }
      }

      return savedVideo;
    });

    // Ensure User Video Progress record exists
    await ensureUserProgress(updatedVideo.id, userId);

    // Step G: Trigger background generation for remaining segments (segments 2..N)
    triggerBackgroundSegmentGeneration(updatedVideo.id);

    // Reload complete video object
    const finalVideo = await db.video.findUnique({
      where: { id: updatedVideo.id },
      include: {
        segments: {
          orderBy: { order_index: 'asc' },
          include: { quiz_questions: true },
        },
        flashcards: true,
        notes: { orderBy: { order_index: 'asc' } },
      },
    });

    return {
      video: finalVideo,
      cached: false,
    };
  } catch (err: any) {
    console.error(`[INGEST ERROR] video_id=${videoId}:`, err);

    await db.video.update({
      where: { id: video.id },
      data: {
        status: 'failed',
        error_reason: err?.message || 'Processing failed unexpectedly.',
      },
    });

    throw err;
  }
}

/**
 * Generates content for a single segment (4 quiz questions + flowchart + mindmap JSON)
 * and updates its status in Prisma to 'ready'.
 */
export async function generateSingleSegmentContent(segmentId: string) {
  const segment = await db.segment.findUnique({
    where: { id: segmentId },
    include: { video: true, quiz_questions: true },
  });

  if (!segment) return null;

  // If already ready with flowchart and 4 questions, return immediately
  if (
    segment.generation_status === 'ready' &&
    segment.flowchart_json &&
    segment.quiz_questions.length >= 4
  ) {
    return segment;
  }

  // Mark generating
  await db.segment.update({
    where: { id: segment.id },
    data: { generation_status: 'generating' },
  });

  try {
    // 1. Generate 4 quiz questions
    const quizRes = await generateQuizForSegment(
      segment.title,
      segment.summary || ''
    );

    // 2. Generate diagrams (flowchart & mind map JSON)
    const diagramRes = await generateSegmentDiagrams(
      segment.title,
      segment.summary || ''
    );

    // 3. Persist in transaction
    await db.$transaction(async (tx) => {
      // Clear any partial quiz questions
      await tx.quizQuestion.deleteMany({
        where: { segment_id: segment.id },
      });

      for (const q of quizRes.questions) {
        await tx.quizQuestion.create({
          data: {
            segment_id: segment.id,
            question: q.question,
            options: JSON.stringify(q.options),
            correct_answer: q.correct_answer,
            explanation: q.explanation,
          },
        });
      }

      await tx.segment.update({
        where: { id: segment.id },
        data: {
          flowchart_json: JSON.stringify(diagramRes.flowchart),
          mindmap_json: JSON.stringify(diagramRes.mindmap),
          generation_status: 'ready',
          llm_provider: diagramRes.provider,
        },
      });
    });

    return await db.segment.findUnique({
      where: { id: segmentId },
      include: { quiz_questions: true },
    });
  } catch (err: any) {
    console.error(`[SEGMENT PROGRESSIVE GEN ERROR ${segmentId}]:`, err);
    await db.segment.update({
      where: { id: segment.id },
      data: { generation_status: 'ready' },
    });
    return segment;
  }
}

/**
 * Processes pending segments sequentially in the background.
 */
export function triggerBackgroundSegmentGeneration(videoId: string) {
  setTimeout(async () => {
    try {
      const pendingSegments = await db.segment.findMany({
        where: {
          video_id: videoId,
          generation_status: 'pending',
        },
        orderBy: { order_index: 'asc' },
      });

      if (pendingSegments.length === 0) return;

      console.log(`[BACKGROUND GEN] Starting progressive generation for ${pendingSegments.length} pending segments of video ${videoId}`);

      for (const seg of pendingSegments) {
        console.log(`[BACKGROUND GEN] Generating segment ${seg.order_index + 1}: "${seg.title}"...`);
        await generateSingleSegmentContent(seg.id);
        // Throttle slightly between segments to be gentle with local Ollama
        await new Promise((r) => setTimeout(r, 1200));
      }

      console.log(`[BACKGROUND GEN] Finished all segments for video ${videoId}`);
    } catch (err: any) {
      console.warn(`[BACKGROUND GEN ERROR]:`, err.message);
    }
  }, 200);
}

/**
 * Explicitly regenerates flashcards from the transcript for a video
 */
export async function regenerateVideoFlashcards(videoId: string) {
  const video = await db.video.findUnique({
    where: { id: videoId },
    include: { segments: true },
  });

  if (!video) throw new Error('Video not found');

  const { items: transcriptItems } = await fetchTranscript(video.youtube_video_id);
  const rawCards = generateTranscriptGroundedFlashcards(
    video.title,
    transcriptItems,
    video.segments as any
  );
  const validatedCards = validateAndFilterFlashcards(rawCards, video.title);

  await db.$transaction(async (tx) => {
    await tx.flashcard.deleteMany({
      where: { video_id: video.id },
    });

    for (const fc of validatedCards.slice(0, 5)) {
      await tx.flashcard.create({
        data: {
          video_id: video.id,
          front: fc.front,
          back: fc.back,
          mastered: false,
        },
      });
    }
  });

  return await db.flashcard.findMany({ where: { video_id: video.id } });
}

/**
 * Helper to ensure a UserVideoProgress record exists
 */
async function ensureUserProgress(videoId: string, userId: string) {
  try {
    await db.userVideoProgress.upsert({
      where: {
        user_id_video_id: {
          user_id: userId,
          video_id: videoId,
        },
      },
      create: {
        user_id: userId,
        video_id: videoId,
        current_segment_index: 0,
        completed_segment_ids: JSON.stringify([]),
      },
      update: {
        last_watched_at: new Date(),
      },
    });
  } catch (e) {
    console.warn('[DB] User progress check error:', e);
  }
}
