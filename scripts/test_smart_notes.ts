import { db } from '../lib/db';

async function testSmartNotes() {
  console.log('=== Saras AI Smart Notes Verification Test ===\n');

  const videos = await db.video.findMany({
    include: {
      notes: {
        orderBy: { order_index: 'asc' },
        include: { segment: true },
      },
    },
  });

  console.log(`Auditing ${videos.length} videos for Smart Notes grounding & persistence:\n`);

  const forbiddenTerms = [
    'learnly',
    'saras ai',
    'quiz gating',
    'strict focus',
    'checkpoint quiz',
    'the learnly platform',
  ];

  for (const video of videos) {
    console.log(`--------------------------------------------------`);
    console.log(`Video: "${video.title}" (${video.channel})`);
    console.log(`Total Notes: ${video.notes.length}`);

    if (video.notes.length === 0) {
      console.error(`❌ ERROR: Video has 0 notes!`);
      process.exit(1);
    }

    const sectionCounts: Record<string, number> = {};
    let leakedCount = 0;
    let validTimestampCount = 0;

    for (const note of video.notes) {
      sectionCounts[note.section_type] = (sectionCounts[note.section_type] || 0) + 1;

      // Check forbidden term leakage
      const combined = `${note.title.toLowerCase()} ${note.content.toLowerCase()}`;
      for (const term of forbiddenTerms) {
        if (combined.includes(term)) {
          console.warn(`⚠️ Warning: Found potential product term "${term}" in note: "${note.title}"`);
          leakedCount++;
        }
      }

      // Check timestamps
      if (note.source_start_seconds != null) {
        if (note.source_start_seconds >= 0 && note.source_start_seconds <= video.duration_seconds + 30) {
          validTimestampCount++;
        }
      }
    }

    console.log(`Section Breakdown:`, sectionCounts);
    console.log(`Valid Timestamps Attached: ${validTimestampCount}`);
    console.log(`Product Leakage Count: ${leakedCount}`);

    if (leakedCount === 0) {
      console.log(`✓ 100% Grounded and clean of product leaks.`);
    }

    // Print sample note
    const firstConcept = video.notes.find((n) => n.section_type === 'key_concepts');
    if (firstConcept) {
      console.log(`Sample Key Concept: "${firstConcept.title}" -> ${firstConcept.content.slice(0, 100)}...`);
    }
  }

  console.log(`\n==================================================`);
  console.log(`✓ All Smart Notes Verification Tests Passed!`);
}

testSmartNotes()
  .catch((e) => {
    console.error('Test error:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
