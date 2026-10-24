import { db } from '../lib/db';

async function main() {
  const videos = await db.video.findMany({
    include: { flashcards: true, segments: true },
  });

  console.log(`Total videos in DB: ${videos.length}`);
  for (const v of videos) {
    console.log(`\n=== VIDEO: ${v.title} (${v.youtube_video_id}) ===`);
    console.log(`Flashcards count: ${v.flashcards.length}`);
    v.flashcards.forEach((f, idx) => {
      console.log(`  [${idx + 1}] Q: ${f.front}`);
      console.log(`      A: ${f.back}`);
    });
  }

  await db.$disconnect();
}

main().catch(console.error);
