import { db } from '../lib/db';
import { generateTranscriptGroundedFlashcards, validateAndFilterFlashcards } from '../lib/services/ai';
import { fetchTranscript } from '../lib/services/transcript';

async function main() {
  console.log('=== CLEANING & REGENERATING ALL FLASHCARDS IN DATABASE ===');

  const videos = await db.video.findMany({
    include: { segments: true, flashcards: true },
  });

  console.log(`Found ${videos.length} videos to verify and clean.\n`);

  for (const video of videos) {
    console.log(`Processing Video: "${video.title}" (${video.youtube_video_id})`);

    // 1. Fetch transcript items
    const { items: transcriptItems } = await fetchTranscript(video.youtube_video_id);

    // 2. Generate 100% grounded flashcards
    const rawCards = generateTranscriptGroundedFlashcards(
      video.title,
      transcriptItems,
      video.segments as any
    );

    // 3. Run validation filter
    const validatedCards = validateAndFilterFlashcards(rawCards, video.title);

    // 4. Atomic replacement in database
    await db.$transaction(async (tx) => {
      // Delete old flashcards
      const del = await tx.flashcard.deleteMany({
        where: { video_id: video.id },
      });
      console.log(`  Deleted ${del.count} old flashcard(s)`);

      // Insert new grounded flashcards
      for (const card of validatedCards) {
        await tx.flashcard.create({
          data: {
            video_id: video.id,
            front: card.front,
            back: card.back,
            mastered: false,
          },
        });
      }
    });

    console.log(`  ✅ Inserted ${validatedCards.length} video-grounded flashcard(s):`);
    validatedCards.forEach((c, idx) => {
      console.log(`     [${idx + 1}] Q: ${c.front}`);
      console.log(`         A: ${c.back}`);
    });
    console.log('');
  }

  console.log('🎉 ALL FLASHCARDS SUCCESSFULLY GROUNDED AND CLEANED!');
  await db.$disconnect();
}

main().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
