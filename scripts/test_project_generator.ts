import { db } from '../lib/db';
import { generateProjectForVideo } from '../lib/services/ai';

async function testProjectGenerator() {
  console.log('--- Testing Video -> Project Generator ---');

  const videos = await db.video.findMany({
    include: { segments: true },
  });

  console.log(`Found ${videos.length} videos in database.`);

  for (const video of videos.slice(0, 2)) {
    console.log(`\nTesting project generation for: "${video.title}"`);
    const project = await generateProjectForVideo(
      video.title,
      video.channel,
      video.segments.map((s) => ({ title: s.title, summary: s.summary }))
    );

    console.log(`✓ Project Title: "${project.title}"`);
    console.log(`✓ Difficulty: ${project.difficulty}`);
    console.log(`✓ Why It Fits: "${project.why_it_fits}"`);
    console.log(`✓ Skills Practiced:`, project.skills_practiced);
    console.log(`✓ Milestones Count:`, project.milestones.length);
    console.log(`✓ Sample Milestone 1:`, project.milestones[0]?.label);
  }

  console.log('\n--- All Project Generation Tests Passed ---');
}

testProjectGenerator()
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
