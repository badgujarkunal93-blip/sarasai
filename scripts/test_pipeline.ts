import { ingestVideo } from '../lib/services/ingestion';
import { db } from '../lib/db';

async function runTest() {
  console.log('--- Testing Ingestion Pipeline ---');

  const testUrl = 'https://www.youtube.com/watch?v=kqtD5dpn9C8'; // Python in 100 Seconds
  console.log(`Ingesting URL: ${testUrl}`);

  const start1 = Date.now();
  const res1 = await ingestVideo(testUrl, { source: 'manual', userId: 'test_user' });
  const dur1 = Date.now() - start1;

  console.log(`Result 1: Video ID = ${res1.video?.id}, cached = ${res1.cached} (took ${dur1}ms)`);
  console.log(`Segments count = ${(res1.video as any)?.segments?.length}`);
  console.log(`Flashcards count = ${(res1.video as any)?.flashcards?.length}`);

  // Test Deduplication / Cache hit
  console.log('\n--- Testing Cache Check Deduplication ---');
  const start2 = Date.now();
  const res2 = await ingestVideo(testUrl, { source: 'chat', userId: 'test_user' });
  const dur2 = Date.now() - start2;

  console.log(`Result 2: Video ID = ${res2.video?.id}, cached = ${res2.cached} (took ${dur2}ms)`);

  if (res2.cached && res1.video?.id === res2.video?.id) {
    console.log('✅ Deduplication verification PASSED: Cached video returned instantly without reprocessing!');
  } else {
    console.error('❌ Deduplication FAILED');
  }

  await db.$disconnect();
}

runTest().catch((e) => {
  console.error('Test execution error:', e);
  process.exit(1);
});
