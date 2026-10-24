import { YoutubeTranscript } from 'youtube-transcript';
import { fetchTranscript } from '../lib/services/transcript';

async function test() {
  const videoId = 'fGVfqA_Iv6s'; // Every PC Component Explained in 10 minutes
  console.log(`Fetching transcript for ${videoId}...`);
  try {
    const res = await fetchTranscript(videoId);
    console.log(`Fetched ${res.items.length} transcript items, duration: ${res.estimatedDuration}s`);
    console.log('Sample items:');
    res.items.slice(0, 15).forEach((t) => console.log(`[${t.offset}s]: ${t.text}`));
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
