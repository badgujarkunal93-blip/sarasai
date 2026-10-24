import { db } from '../lib/db';
import { getUserLearningSummary, updateUserProfile } from '../lib/services/userProfile';

async function runUserProfileTests() {
  console.log('======================================================================');
  console.log('=== SARAS AI USER PROFILE & ACTIVITY STREAK ENGINE TEST SUITE ===');
  console.log('======================================================================\n');

  const userA = 'test_streak_user_a';
  const userB = 'test_streak_user_b';

  // Cleanup prior test artifacts
  await db.userVideoProgress.deleteMany({ where: { user_id: { in: [userA, userB] } } });
  await db.revisionSession.deleteMany({ where: { user_id: { in: [userA, userB] } } });
  await db.userProject.deleteMany({ where: { user_id: { in: [userA, userB] } } });
  await db.userConceptMastery.deleteMany({ where: { user_id: { in: [userA, userB] } } });
  await db.userProfile.deleteMany({ where: { user_id: { in: [userA, userB] } } });

  const testVideo = await db.video.findFirst();
  if (!testVideo) {
    console.error('❌ No video found in database to associate test activity.');
    process.exit(1);
  }

  // --- Test 1: New User Clean State ---
  console.log('--- Test 1: New User Clean 0-State ---');
  const cleanSummary = await getUserLearningSummary(userA);
  console.log(`✓ Videos Watched: ${cleanSummary.metrics.videosWatched}`);
  console.log(`✓ Lessons Completed: ${cleanSummary.metrics.lessonsCompleted}`);
  console.log(`✓ Current Streak: ${cleanSummary.streak.currentStreak}`);
  console.log(`✓ Recent Activities: ${cleanSummary.recentActivity.length}`);

  if (
    cleanSummary.metrics.videosWatched !== 0 ||
    cleanSummary.metrics.lessonsCompleted !== 0 ||
    cleanSummary.streak.currentStreak !== 0 ||
    cleanSummary.recentActivity.length !== 0
  ) {
    console.error('❌ Test 1 Failed: Clean user did not start at 0.');
    process.exit(1);
  }
  console.log('✅ PASSED: New user starts strictly at 0 without fabricated stats.');

  // --- Test 2: One Qualifying Event Today -> 1 Day Streak ---
  console.log('\n--- Test 2: One Qualifying Activity Today (1 Day Streak) ---');
  const now = new Date();
  await db.userVideoProgress.create({
    data: {
      user_id: userA,
      video_id: testVideo.id,
      last_watched_at: now,
      completed_segment_ids: JSON.stringify(['seg-1']),
    },
  });

  const summaryT2 = await getUserLearningSummary(userA);
  console.log(`✓ Current Streak: ${summaryT2.streak.currentStreak}`);
  console.log(`✓ Active Today: ${summaryT2.streak.isActiveToday}`);
  console.log(`✓ Recent Activities Count: ${summaryT2.recentActivity.length}`);

  if (summaryT2.streak.currentStreak !== 1 || !summaryT2.streak.isActiveToday) {
    console.error('❌ Test 2 Failed: Expected 1 day streak for today activity.');
    process.exit(1);
  }
  console.log('✅ PASSED: Qualifying event today generates 1-day streak.');

  // --- Test 3: Activity Today + Yesterday -> 2 Day Streak ---
  console.log('\n--- Test 3: Activity Today + Yesterday (2 Day Streak) ---');
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  await db.revisionSession.create({
    data: {
      user_id: userA,
      status: 'completed',
      started_at: yesterday,
      completed_at: yesterday,
    },
  });

  const summaryT3 = await getUserLearningSummary(userA);
  console.log(`✓ Current Streak: ${summaryT3.streak.currentStreak}`);
  console.log(`✓ Revisions Completed: ${summaryT3.metrics.revisionSessions}`);

  if (summaryT3.streak.currentStreak !== 2 || summaryT3.metrics.revisionSessions !== 1) {
    console.error('❌ Test 3 Failed: Expected 2 day streak.');
    process.exit(1);
  }
  console.log('✅ PASSED: Consecutive day activity generates continuous 2-day streak.');

  // --- Test 4: Multiple Activities on Same Date (Deduplication) ---
  console.log('\n--- Test 4: Multiple Activities on Same Date (Deduplication Check) ---');
  // Add another activity today
  await db.revisionSession.create({
    data: {
      user_id: userA,
      status: 'completed',
      started_at: now,
      completed_at: now,
    },
  });

  const summaryT4 = await getUserLearningSummary(userA);
  console.log(`✓ Revisions Completed: ${summaryT4.metrics.revisionSessions}`);
  console.log(`✓ Current Streak: ${summaryT4.streak.currentStreak}`);

  if (summaryT4.streak.currentStreak !== 2) {
    console.error('❌ Test 4 Failed: Same-day multiple activities erroneously inflated streak.');
    process.exit(1);
  }
  console.log('✅ PASSED: Multiple same-day activities count as 1 active day.');

  // --- Test 5: Multi-Day Streak Extension (6 Days Consecutive) ---
  console.log('\n--- Test 5: 6 Days Consecutive Activity ---');
  for (let i = 2; i <= 5; i++) {
    const pastDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    await db.revisionSession.create({
      data: {
        user_id: userA,
        status: 'completed',
        started_at: pastDate,
        completed_at: pastDate,
      },
    });
  }

  const summaryT5 = await getUserLearningSummary(userA);
  console.log(`✓ Current Streak: ${summaryT5.streak.currentStreak}`);
  console.log(`✓ Longest Streak: ${summaryT5.streak.longestStreak}`);

  if (summaryT5.streak.currentStreak !== 6 || summaryT5.streak.longestStreak !== 6) {
    console.error('❌ Test 5 Failed: Expected 6 day streak.');
    process.exit(1);
  }
  console.log('✅ PASSED: 6 consecutive days yields exact 6-day streak.');

  // --- Test 6: Gap in Activity Breaks Streak ---
  console.log('\n--- Test 6: Activity Gap Breaks Streak ---');
  // User with activity 5 days ago and 3 days ago, but missing 4 days ago
  const userGap = 'test_user_gap';
  await db.userVideoProgress.deleteMany({ where: { user_id: userGap } });
  await db.revisionSession.deleteMany({ where: { user_id: userGap } });

  await db.userVideoProgress.create({
    data: {
      user_id: userGap,
      video_id: testVideo.id,
      last_watched_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      completed_segment_ids: '[]',
    },
  });
  await db.revisionSession.create({
    data: {
      user_id: userGap,
      status: 'completed',
      started_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      completed_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
  });

  const summaryGap = await getUserLearningSummary(userGap);
  console.log(`✓ Gap User Current Streak: ${summaryGap.streak.currentStreak}`);
  console.log(`✓ Gap User Longest Streak: ${summaryGap.streak.longestStreak}`);

  if (summaryGap.streak.currentStreak !== 0 || summaryGap.streak.longestStreak !== 1) {
    console.error('❌ Test 6 Failed: Gap did not break streak properly.');
    process.exit(1);
  }
  console.log('✅ PASSED: Inactivity gap breaks current streak to 0.');
  await db.userVideoProgress.deleteMany({ where: { user_id: userGap } });
  await db.revisionSession.deleteMany({ where: { user_id: userGap } });

  // --- Test 7: Multi-User Isolation ---
  console.log('\n--- Test 7: Multi-User Isolation ---');
  const summaryB = await getUserLearningSummary(userB);
  console.log(`✓ User B Videos Watched: ${summaryB.metrics.videosWatched}`);
  console.log(`✓ User B Current Streak: ${summaryB.streak.currentStreak}`);

  if (summaryB.metrics.videosWatched !== 0 || summaryB.streak.currentStreak !== 0) {
    console.error('❌ Test 7 Failed: User B leaked User A activity!');
    process.exit(1);
  }
  console.log('✅ PASSED: 100% User isolation verified. User B has 0 activity.');

  // --- Test 8: Custom Profile Metadata Updates ---
  console.log('\n--- Test 8: User Profile Metadata Update ---');
  await updateUserProfile(userA, { name: 'Kunal Badgujar', email: 'kunal@example.com' });
  const updatedSummary = await getUserLearningSummary(userA);

  console.log(`✓ Updated Name: ${updatedSummary.user.name}`);
  console.log(`✓ Updated Email: ${updatedSummary.user.email}`);
  console.log(`✓ Updated Initials: ${updatedSummary.user.initials}`);

  if (
    updatedSummary.user.name !== 'Kunal Badgujar' ||
    updatedSummary.user.email !== 'kunal@example.com' ||
    updatedSummary.user.initials !== 'KB'
  ) {
    console.error('❌ Test 8 Failed: User profile did not update properly.');
    process.exit(1);
  }
  console.log('✅ PASSED: User profile metadata correctly persisted and updated.');

  // Cleanup
  await db.userVideoProgress.deleteMany({ where: { user_id: { in: [userA, userB] } } });
  await db.revisionSession.deleteMany({ where: { user_id: { in: [userA, userB] } } });
  await db.userProject.deleteMany({ where: { user_id: { in: [userA, userB] } } });
  await db.userProfile.deleteMany({ where: { user_id: { in: [userA, userB] } } });

  console.log('\n======================================================================');
  console.log('✓ All 8 User Profile & Streak Engine Tests Passed Successfully!');
  console.log('======================================================================\n');
}

runUserProfileTests()
  .catch((e) => {
    console.error('Profile Test Error:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
