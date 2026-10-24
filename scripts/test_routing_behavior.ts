import http from 'http';

function fetchPath(path: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    http
      .get(`http://localhost:3000${path}`, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode || 500, body }));
      })
      .on('error', (err) => reject(err));
  });
}

async function runRoutingVerification() {
  console.log('======================================================================');
  console.log('=== SARAS AI ROUTING & DEPLOYMENT ARCHITECTURE VERIFICATION ===');
  console.log('======================================================================\n');

  // Test 1: Root Route /
  console.log('--- Test 1: Root URL (/) ---');
  const rootRes = await fetchPath('/');
  console.log(`HTTP Status: ${rootRes.status}`);
  if (rootRes.status !== 200) {
    console.error('❌ Test 1 Failed: Root route did not return 200.');
    process.exit(1);
  }
  if (!rootRes.body.includes('Saras AI transforms educational content') || !rootRes.body.includes('The Saras Intelligence Loop')) {
    console.error('❌ Test 1 Failed: Root route did not render the Landing Page content.');
    process.exit(1);
  }
  if (!rootRes.body.includes('href="/discover"')) {
    console.error('❌ Test 1 Failed: Landing page CTA does not link to /discover.');
    process.exit(1);
  }
  console.log('✅ PASSED: Root URL (/) renders the Saras AI public landing page with CTAs linking to /discover.');

  // Test 2: /landing Route
  console.log('\n--- Test 2: /landing Route ---');
  const landingRes = await fetchPath('/landing');
  console.log(`HTTP Status: ${landingRes.status}`);
  if (landingRes.status !== 200) {
    console.error('❌ Test 2 Failed: /landing route did not return 200.');
    process.exit(1);
  }
  if (!landingRes.body.includes('The Saras Intelligence Loop')) {
    console.error('❌ Test 2 Failed: /landing did not render architecture loop.');
    process.exit(1);
  }
  console.log('✅ PASSED: /landing route renders cleanly without redirects or loops.');

  // Test 3: /discover Route (Main App Workspace)
  console.log('\n--- Test 3: Main App Workspace (/discover) ---');
  const discoverRes = await fetchPath('/discover');
  console.log(`HTTP Status: ${discoverRes.status}`);
  if (discoverRes.status !== 200) {
    console.error('❌ Test 3 Failed: /discover route did not return 200.');
    process.exit(1);
  }
  if (!discoverRes.body.includes('Find Something to Learn') && !discoverRes.body.includes('Curated Catalog')) {
    console.error('❌ Test 3 Failed: /discover did not render the main app discover workspace.');
    process.exit(1);
  }
  console.log('✅ PASSED: /discover renders the complete Saras AI Main Workspace.');

  // Test 4: Deep Link /knowledge
  console.log('\n--- Test 4: Deep Link /knowledge ---');
  const knowledgeRes = await fetchPath('/knowledge');
  if (knowledgeRes.status !== 200 || !knowledgeRes.body.includes('Knowledge Map')) {
    console.error('❌ Test 4 Failed: /knowledge route failed.');
    process.exit(1);
  }
  console.log('✅ PASSED: /knowledge deep link works directly with full workspace layout.');

  // Test 5: Deep Link /revision
  console.log('\n--- Test 5: Deep Link /revision ---');
  const revisionRes = await fetchPath('/revision');
  if (revisionRes.status !== 200 || !revisionRes.body.includes('AI Revision')) {
    console.error('❌ Test 5 Failed: /revision route failed.');
    process.exit(1);
  }
  console.log('✅ PASSED: /revision deep link works directly.');

  // Test 6: Deep Link /exam
  console.log('\n--- Test 6: Deep Link /exam ---');
  const examRes = await fetchPath('/exam');
  if (examRes.status !== 200 || !examRes.body.includes('Exam Mode')) {
    console.error('❌ Test 6 Failed: /exam route failed.');
    process.exit(1);
  }
  console.log('✅ PASSED: /exam deep link works directly.');

  // Test 7: Deep Link /flashcards
  console.log('\n--- Test 7: Deep Link /flashcards ---');
  const flashcardsRes = await fetchPath('/flashcards');
  if (flashcardsRes.status !== 200 || !flashcardsRes.body.includes('Flashcards')) {
    console.error('❌ Test 7 Failed: /flashcards route failed.');
    process.exit(1);
  }
  console.log('✅ PASSED: /flashcards deep link works directly.');

  // Test 8: Deep Link /focus
  console.log('\n--- Test 8: Deep Link /focus ---');
  const focusRes = await fetchPath('/focus');
  if (focusRes.status !== 200 || !focusRes.body.includes('Deep Focus')) {
    console.error('❌ Test 8 Failed: /focus route failed.');
    process.exit(1);
  }
  console.log('✅ PASSED: /focus deep link works directly.');

  console.log('\n======================================================================');
  console.log('=== ALL ROUTING & DEPLOYMENT CHECKS PASSED (8/8) ===');
  console.log('======================================================================\n');
}

runRoutingVerification().catch((e) => {
  console.error('Routing Verification Error:', e);
  process.exit(1);
});
