import { db } from '../lib/db';
import { generateSegmentsAndQuizzes } from '../lib/services/ai';
import { fetchTranscript } from '../lib/services/transcript';

async function updatePCVideo() {
  console.log('=== UPDATING PC COMPONENTS VIDEO TO ACCURATE HARDWARE CHAPTERS & QUIZZES ===');

  const video = await db.video.findUnique({
    where: { youtube_video_id: 'fGVfqA_Iv6s' },
  });

  if (!video) {
    console.log('Video fGVfqA_Iv6s not found in DB.');
    return;
  }

  const { items: transcriptItems, estimatedDuration } = await fetchTranscript('fGVfqA_Iv6s');
  const totalDuration = estimatedDuration > 0 ? estimatedDuration : 623;

  const aiResult = await generateSegmentsAndQuizzes(video.title, transcriptItems, totalDuration);

  await db.$transaction(async (tx) => {
    // Delete existing segments & quizzes
    await tx.quizQuestion.deleteMany({
      where: { segment: { video_id: video.id } },
    });
    await tx.segment.deleteMany({
      where: { video_id: video.id },
    });
    await tx.flashcard.deleteMany({
      where: { video_id: video.id },
    });

    // Update video
    await tx.video.update({
      where: { id: video.id },
      data: {
        title: 'Every PC Component Explained in 10 minutes',
        channel: 'YouTube Creator',
        duration_seconds: totalDuration,
      },
    });

    // Create chapters
    for (const seg of aiResult.segments) {
      const createdSeg = await tx.segment.create({
        data: {
          video_id: video.id,
          order_index: seg.order_index,
          title: seg.title,
          summary: seg.summary,
          start_seconds: seg.start_seconds,
          end_seconds: seg.end_seconds,
        },
      });

      for (const q of seg.quiz_questions) {
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

    // Create flashcards
    for (const fc of aiResult.flashcards) {
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

  console.log('✅ Successfully updated PC Component Video chapters & quizzes!');
  await db.$disconnect();
}

updatePCVideo().catch(console.error);
