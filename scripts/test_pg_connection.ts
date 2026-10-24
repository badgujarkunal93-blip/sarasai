import { db } from '../lib/db';

async function testPostgreSqlConnection() {
  console.log('======================================================================');
  console.log('=== SARAS AI POSTGRESQL & SUPABASE CONNECTIVITY AUDIT ===');
  console.log('======================================================================\n');

  const rawUrl = process.env.DATABASE_URL || '';
  if (!rawUrl) {
    console.error('❌ DATABASE_URL is not set in process.env!');
    process.exit(1);
  }

  // Mask credentials for audit logging
  const maskedUrl = rawUrl.replace(/\/\/[^@]+@/, '//postgres:****@');
  console.log(`[DATABASE_URL]: ${maskedUrl}`);

  const isPostgres = rawUrl.startsWith('postgresql://') || rawUrl.startsWith('postgres://');
  console.log(`[PROTOCOL CHECK]: ${isPostgres ? '✅ Valid PostgreSQL Protocol' : '❌ Invalid Protocol (Not PostgreSQL)'}`);

  if (!isPostgres) {
    console.error('❌ DATABASE_URL is not configured as a PostgreSQL connection string!');
    process.exit(1);
  }

  try {
    console.log('\n[CONNECTING] Connecting to database via Prisma...');
    await db.$connect();
    console.log('✅ Connection established successfully!');

    console.log('\n[QUERY TEST] Running simple query (SELECT 1)...');
    const result = await db.$queryRaw`SELECT 1 as connected;`;
    console.log('✅ Query executed successfully:', result);

    console.log('\n[TABLE EXISTENCE CHECK] Verifying core tables...');
    const videoCount = await db.video.count();
    const segmentCount = await db.segment.count();
    const conceptCount = await db.concept.count();
    const userProfileCount = await db.userProfile.count();

    console.log(`  • Video records: ${videoCount}`);
    console.log(`  • Segment records: ${segmentCount}`);
    console.log(`  • Concept records: ${conceptCount}`);
    console.log(`  • UserProfile records: ${userProfileCount}`);

    console.log('\n✅ ALL DATABASE CHECKS PASSED: PostgreSQL is fully operational with Prisma!');
  } catch (err: any) {
    console.error('❌ Database Connection Error:', err?.message || err);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

testPostgreSqlConnection();
