import { db } from '../lib/db';
import { generateSmartNotesForVideo } from '../lib/services/ai';

async function backfillSmartNotes() {
  console.log('=== Saras AI Smart Notes Backfill Operation ===\n');

  const readyVideos = await db.video.findMany({
    where: { status: 'ready' },
    include: {
      segments: {
        orderBy: { order_index: 'asc' },
      },
      notes: true,
    },
  });

  console.log(`Found ${readyVideos.length} ready videos in database.`);

  let backfilledCount = 0;
  let skippedCount = 0;

  for (const video of readyVideos) {
    if (video.notes.length > 0) {
      console.log(`[SKIP] "${video.title}" already has ${video.notes.length} Smart Notes.`);
      skippedCount++;
      continue;
    }

    console.log(`\n[GENERATING] Smart Notes for "${video.title}" (${video.segments.length} segments)...`);

    try {
      const generatedNotes = await generateSmartNotesForVideo(
        video.title,
        video.channel,
        video.segments
      );

      for (let i = 0; i < generatedNotes.length; i++) {
        const note = generatedNotes[i];
        const matchedSeg =
          note.segment_order_index != null && video.segments[note.segment_order_index]
            ? video.segments[note.segment_order_index]
            : null;

        await db.smartNote.create({
          data: {
            video_id: video.id,
            segment_id: matchedSeg ? matchedSeg.id : null,
            section_type: note.section_type,
            title: note.title,
            content: note.content,
            source_start_seconds: note.source_start_seconds ?? null,
            source_end_seconds: note.source_end_seconds ?? null,
            order_index: i,
          },
        });
      }

      console.log(`✓ Saved ${generatedNotes.length} Smart Notes for "${video.title}"`);
      backfilledCount++;
    } catch (err: any) {
      console.error(`❌ Failed to backfill notes for "${video.title}":`, err.message);
    }
  }

  console.log(`\n=== Backfill Completed ===`);
  console.log(`• Backfilled: ${backfilledCount} videos`);
  console.log(`• Skipped (Already Present): ${skippedCount} videos`);
}

backfillSmartNotes()
  .catch((e) => {
    console.error('Fatal backfill error:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
