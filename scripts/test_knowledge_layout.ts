import { db } from '../lib/db';
import { computeKnowledgeLayout } from '../lib/services/knowledgeLayout';

async function runKnowledgeLayoutTests() {
  console.log('======================================================================');
  console.log('=== SARAS AI KNOWLEDGE GRAPH LAYOUT & NON-OVERLAP VERIFICATION ===');
  console.log('======================================================================\n');

  // Fetch real concepts and relationships from database
  const concepts = await db.concept.findMany({
    include: {
      user_mastery: { where: { user_id: 'default_user' } },
      outgoing_relations: true,
      video_segments: { include: { segment: { include: { video: true } } } },
      flashcards: true,
      quiz_questions: true,
    },
  });

  const relationships = await db.conceptRelationship.findMany();

  console.log(`[DATA] Loaded ${concepts.length} concepts and ${relationships.length} relationships.`);

  const nodes = concepts.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    category: c.category,
    mastery_score: c.user_mastery[0]?.mastery_score || 0,
    mastery_state: c.user_mastery[0]?.mastery_score >= 80 ? 'MASTERED' : c.user_mastery[0]?.mastery_score >= 50 ? 'DEVELOPING' : c.user_mastery[0]?.exposure_count > 0 ? 'WEAK' : 'NOT_STUDIED',
    exposure_count: c.user_mastery[0]?.exposure_count || 0,
    correct_count: c.user_mastery[0]?.correct_count || 0,
    wrong_count: c.user_mastery[0]?.wrong_count || 0,
    last_seen_at: c.user_mastery[0]?.last_seen_at?.toISOString() || '',
    source_videos: c.video_segments.map((vs) => ({
      id: vs.segment.video.id,
      title: vs.segment.video.title,
      channel: vs.segment.video.channel,
      youtube_video_id: vs.segment.video.youtube_video_id,
      segment_title: vs.segment.title,
      start_seconds: vs.segment.start_seconds,
    })),
    flashcards_count: c.flashcards.length,
    quiz_count: c.quiz_questions.length,
  }));

  const edges = relationships.map((r) => ({
    id: `${r.source_concept_id}-${r.target_concept_id}`,
    source: r.source_concept_id,
    target: r.target_concept_id,
    type: r.relationship_type,
    weight: r.weight,
  }));

  // --- Test 1: Layout Computation ---
  console.log('\n--- Test 1: Layout Computation ---');
  const layout = computeKnowledgeLayout(nodes, edges);

  console.log(`✓ Generated layout with ${layout.nodes.length} nodes, ${layout.edges.length} edges, ${layout.clusters.length} domain clusters.`);
  console.log(`✓ Canvas Dimensions: ${layout.canvasWidth}px x ${layout.canvasHeight}px.`);

  if (layout.nodes.length !== nodes.length) {
    console.error('❌ Test 1 Failed: Some nodes were dropped.');
    process.exit(1);
  }

  // --- Test 2: Absolute Non-Overlap Verification ---
  console.log('\n--- Test 2: Strict Zero-Overlap Verification Across All Nodes ---');
  let overlapCount = 0;

  for (let i = 0; i < layout.nodes.length; i++) {
    for (let j = i + 1; j < layout.nodes.length; j++) {
      const a = layout.nodes[i];
      const b = layout.nodes[j];

      // Check AABB collision
      const noOverlap =
        a.x + a.width <= b.x ||
        b.x + b.width <= a.x ||
        a.y + a.height <= b.y ||
        b.y + b.height <= a.y;

      if (!noOverlap) {
        overlapCount++;
        console.error(`❌ Collision between "${a.name}" at (${a.x}, ${a.y}) and "${b.name}" at (${b.x}, ${b.y})`);
      }
    }
  }

  if (overlapCount > 0) {
    console.error(`❌ Test 2 Failed: Found ${overlapCount} overlapping node pairs.`);
    process.exit(1);
  }
  console.log(`✓ Verified: 100% of node pairs (${layout.nodes.length * (layout.nodes.length - 1) / 2} pairs) have ZERO overlap!`);

  // --- Test 3: Cluster Bounding Enclosure Verification ---
  console.log('\n--- Test 3: Domain Cluster Bounding Enclosure ---');
  layout.clusters.forEach((cluster) => {
    const memberNodes = layout.nodes.filter((n) => n.category === cluster.category);
    console.log(`  • Cluster "${cluster.category}": ${memberNodes.length} nodes, bounds: (${cluster.x}, ${cluster.y}) to (${cluster.x + cluster.width}, ${cluster.y + cluster.height})`);

    const allContained = memberNodes.every(
      (n) =>
        n.x >= cluster.x &&
        n.x + n.width <= cluster.x + cluster.width &&
        n.y >= cluster.y &&
        n.y + n.height <= cluster.y + cluster.height
    );

    if (!allContained) {
      console.error(`❌ Cluster "${cluster.category}" does not contain all its member nodes!`);
      process.exit(1);
    }
  });
  console.log(`✓ Verified: All ${layout.clusters.length} domain clusters cleanly encapsulate 100% of their member nodes.`);

  // --- Test 4: Curved Edge Path Routing ---
  console.log('\n--- Test 4: Smooth Cubic Bezier Edge Path Routing ---');
  let invalidEdgePaths = 0;
  layout.edges.forEach((edge) => {
    if (!edge.pathD.startsWith('M') || !edge.pathD.includes('C')) {
      invalidEdgePaths++;
      console.error(`❌ Invalid path: ${edge.pathD}`);
    }
  });

  if (invalidEdgePaths > 0) {
    console.error(`❌ Test 4 Failed: Found ${invalidEdgePaths} invalid edge paths.`);
    process.exit(1);
  }
  console.log(`✓ Verified: All ${layout.edges.length} edges have valid cubic Bezier path geometries.`);

  // --- Test 5: Category Focus Filter ---
  console.log('\n--- Test 5: Category Focus Filtering ---');
  if (layout.clusters.length > 0) {
    const firstCat = layout.clusters[0].category;
    const filteredLayout = computeKnowledgeLayout(nodes, edges, firstCat);
    const allMatch = filteredLayout.nodes.every((n) => n.category === firstCat);
    if (!allMatch) {
      console.error(`❌ Category filter failed for "${firstCat}".`);
      process.exit(1);
    }
    console.log(`✓ Category focus on "${firstCat}" filtered cleanly to ${filteredLayout.nodes.length} nodes and ${filteredLayout.clusters.length} cluster.`);
  }

  console.log('\n======================================================================');
  console.log('✓ All Knowledge Map Layout Verification Tests Passed Successfully!');
  console.log('======================================================================\n');
}

runKnowledgeLayoutTests()
  .catch((e) => {
    console.error('Layout Test Error:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
