import { db } from '@/lib/db';

export interface UserLearningSummary {
  user: {
    userId: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    initials: string;
  };
  metrics: {
    videosWatched: number;
    lessonsCompleted: number;
    revisionSessions: number;
    projects: number;
    flashcardsReviewed: number;
    conceptsPracticed: number;
  };
  streak: {
    currentStreak: number;
    longestStreak: number;
    isActiveToday: boolean;
    weeklyActivity: {
      dayLabel: string;
      date: string;
      active: boolean;
    }[];
  };
  recentActivity: {
    id: string;
    type: 'video_watched' | 'lesson_completed' | 'revision_completed' | 'project_started' | 'concept_practiced';
    title: string;
    timestamp: string;
    formattedTime: string;
    relativeDay: string;
  }[];
  recentlyLearned: {
    id: string;
    title: string;
    channel: string;
    lastWatchedAt: string;
    progressPercent: number;
  }[];
  currentGoals: {
    total: number;
    completed: number;
    items: {
      id: string;
      label: string;
      done: boolean;
    }[];
  };
}

/**
 * Get or initialize user profile metadata
 */
export async function getUserProfile(userId: string = 'default_user') {
  let profile = await db.userProfile.findUnique({
    where: { user_id: userId },
  });

  if (!profile) {
    profile = await db.userProfile.create({
      data: {
        user_id: userId,
        name: userId === 'default_user' ? 'Kunal' : 'Student',
        email: userId === 'default_user' ? 'kunal@saras.ai' : `${userId}@saras.ai`,
      },
    });
  }

  const name = profile.name || 'Student';
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'S';

  return {
    userId: profile.user_id,
    name: profile.name,
    email: profile.email,
    avatarUrl: profile.avatar_url,
    initials,
  };
}

/**
 * Update user profile metadata
 */
export async function updateUserProfile(
  userId: string = 'default_user',
  data: { name?: string; email?: string; avatarUrl?: string }
) {
  return db.userProfile.upsert({
    where: { user_id: userId },
    update: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.avatarUrl !== undefined ? { avatar_url: data.avatarUrl } : {}),
      updated_at: new Date(),
    },
    create: {
      user_id: userId,
      name: data.name || 'Student',
      email: data.email || `${userId}@saras.ai`,
      avatar_url: data.avatarUrl,
    },
  });
}

/**
 * Single source of truth for user learning activity, summary stats, and streak calculations.
 */
export async function getUserLearningSummary(
  userId: string = 'default_user',
  timezoneOffsetMinutes: number = 0
): Promise<UserLearningSummary> {
  // 1. Fetch user profile
  const user = await getUserProfile(userId);

  // 2. Fetch Video Progress
  const videoProgressList = await db.userVideoProgress.findMany({
    where: { user_id: userId },
    include: {
      video: {
        include: {
          segments: { select: { id: true } },
        },
      },
    },
    orderBy: { last_watched_at: 'desc' },
  });

  const videosWatched = videoProgressList.length;
  let lessonsCompleted = 0;

  const recentlyLearned: UserLearningSummary['recentlyLearned'] = [];

  for (const prog of videoProgressList) {
    let completedIds: string[] = [];
    try {
      completedIds = JSON.parse(prog.completed_segment_ids || '[]');
    } catch {
      completedIds = [];
    }

    const totalSegs = prog.video.segments?.length || 1;
    const isCompleted = completedIds.length >= totalSegs && totalSegs > 0;
    if (isCompleted) {
      lessonsCompleted++;
    }

    if (recentlyLearned.length < 4) {
      const progressPercent = Math.min(100, Math.round((completedIds.length / totalSegs) * 100));
      recentlyLearned.push({
        id: prog.video_id,
        title: prog.video.title,
        channel: prog.video.channel,
        lastWatchedAt: prog.last_watched_at.toISOString(),
        progressPercent,
      });
    }
  }

  // 3. Fetch Completed Revision Sessions
  const revisionSessionsList = await db.revisionSession.findMany({
    where: { user_id: userId, status: 'completed' },
    orderBy: { completed_at: 'desc' },
  });
  const revisionSessionsCount = revisionSessionsList.length;

  // 4. Fetch User Projects
  const userProjectsList = await db.userProject.findMany({
    where: { user_id: userId },
    include: { project_idea: { select: { title: true } } },
    orderBy: { created_at: 'desc' },
  });
  const projectsCount = userProjectsList.length;

  // 5. Fetch Concept Mastery & Flashcards
  const conceptMasteryList = await db.userConceptMastery.findMany({
    where: { user_id: userId },
    include: { concept: { select: { name: true } } },
    orderBy: { last_seen_at: 'desc' },
  });
  const conceptsPracticed = conceptMasteryList.length;

  const flashcardsReviewed = await db.flashcard.count({
    where: { mastered: true },
  });

  // 6. Fetch Study Goals / Tasks
  const tasksList = await db.task.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
  });
  const completedTasks = tasksList.filter((t) => t.done).length;

  // 7. Aggregate Timeline Events for Streak & Activity Feed
  type RawActivity = {
    id: string;
    type: 'video_watched' | 'lesson_completed' | 'revision_completed' | 'project_started' | 'concept_practiced';
    title: string;
    date: Date;
  };

  const rawActivities: RawActivity[] = [];

  videoProgressList.forEach((p) => {
    let completedIds: string[] = [];
    try {
      completedIds = JSON.parse(p.completed_segment_ids || '[]');
    } catch {
      completedIds = [];
    }
    const totalSegs = p.video.segments?.length || 1;
    const isCompleted = completedIds.length >= totalSegs && totalSegs > 0;

    rawActivities.push({
      id: `vid-${p.id}`,
      type: isCompleted ? 'lesson_completed' : 'video_watched',
      title: p.video.title,
      date: p.last_watched_at,
    });
  });

  revisionSessionsList.forEach((r) => {
    rawActivities.push({
      id: `rev-${r.id}`,
      type: 'revision_completed',
      title: 'Revision Session',
      date: r.completed_at || r.started_at,
    });
  });

  userProjectsList.forEach((prj) => {
    rawActivities.push({
      id: `prj-${prj.id}`,
      type: 'project_started',
      title: prj.project_idea.title,
      date: prj.created_at,
    });
  });

  conceptMasteryList.forEach((c) => {
    rawActivities.push({
      id: `con-${c.id}`,
      type: 'concept_practiced',
      title: c.concept.name,
      date: c.last_seen_at || c.updated_at,
    });
  });

  // Sort activities newest first
  rawActivities.sort((a, b) => b.date.getTime() - a.date.getTime());

  // 8. Streak & Daily Grouping Calculation
  // Helper to get local date string YYYY-MM-DD
  const toLocalDateKey = (d: Date): string => {
    // Apply client timezone offset in milliseconds if provided
    const localMs = d.getTime() - timezoneOffsetMinutes * 60 * 1000;
    const localDate = new Date(localMs);
    return localDate.toISOString().split('T')[0];
  };

  const activeDatesSet = new Set<string>();
  rawActivities.forEach((act) => {
    activeDatesSet.add(toLocalDateKey(act.date));
  });

  const now = new Date();
  const todayKey = toLocalDateKey(now);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayKey = toLocalDateKey(yesterday);

  const isActiveToday = activeDatesSet.has(todayKey);

  // Calculate current consecutive streak
  let currentStreak = 0;
  if (activeDatesSet.has(todayKey) || activeDatesSet.has(yesterdayKey)) {
    let checkDay = new Date(activeDatesSet.has(todayKey) ? now.getTime() : yesterday.getTime());
    while (true) {
      const key = toLocalDateKey(checkDay);
      if (activeDatesSet.has(key)) {
        currentStreak++;
        checkDay.setTime(checkDay.getTime() - 24 * 60 * 60 * 1000);
      } else {
        break;
      }
    }
  }

  // Calculate longest streak in history
  const sortedDatesAsc = Array.from(activeDatesSet).sort();
  let longestStreak = 0;
  let runningStreak = 0;
  let prevDateTime: number | null = null;

  for (const dateStr of sortedDatesAsc) {
    const currentDateTime = new Date(`${dateStr}T00:00:00Z`).getTime();
    if (prevDateTime === null) {
      runningStreak = 1;
    } else {
      const diffDays = Math.round((currentDateTime - prevDateTime) / (24 * 60 * 60 * 1000));
      if (diffDays === 1) {
        runningStreak++;
      } else if (diffDays > 1) {
        runningStreak = 1;
      }
    }
    if (runningStreak > longestStreak) {
      longestStreak = runningStreak;
    }
    prevDateTime = currentDateTime;
  }

  // Generate 7-Day Weekly Strip (Mon..Sun or past 7 days)
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const weeklyActivity: UserLearningSummary['streak']['weeklyActivity'] = [];

  for (let i = 6; i >= 0; i--) {
    const dayDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayKey = toLocalDateKey(dayDate);
    const dayLabel = dayNames[dayDate.getDay()];
    weeklyActivity.push({
      dayLabel,
      date: dayKey,
      active: activeDatesSet.has(dayKey),
    });
  }

  // 9. Format Recent Activities (up to 8 events)
  const recentActivity: UserLearningSummary['recentActivity'] = rawActivities
    .slice(0, 8)
    .map((act) => {
      const actDateKey = toLocalDateKey(act.date);
      let relativeDay = actDateKey;
      if (actDateKey === todayKey) {
        relativeDay = 'Today';
      } else if (actDateKey === yesterdayKey) {
        relativeDay = 'Yesterday';
      } else {
        const diffDays = Math.round(
          (new Date(`${todayKey}T00:00:00Z`).getTime() -
            new Date(`${actDateKey}T00:00:00Z`).getTime()) /
            (24 * 60 * 60 * 1000)
        );
        relativeDay = `${diffDays} days ago`;
      }

      const formattedTime = act.date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      return {
        id: act.id,
        type: act.type,
        title: act.title,
        timestamp: act.date.toISOString(),
        formattedTime,
        relativeDay,
      };
    });

  return {
    user,
    metrics: {
      videosWatched,
      lessonsCompleted,
      revisionSessions: revisionSessionsCount,
      projects: projectsCount,
      flashcardsReviewed,
      conceptsPracticed,
    },
    streak: {
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      isActiveToday,
      weeklyActivity,
    },
    recentActivity,
    recentlyLearned,
    currentGoals: {
      total: tasksList.length,
      completed: completedTasks,
      items: tasksList.slice(0, 5).map((t) => ({
        id: t.id,
        label: t.label,
        done: t.done,
      })),
    },
  };
}
