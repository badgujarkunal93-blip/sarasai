import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateProjectForVideo } from '@/lib/services/ai';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('videoId');
    const userId = searchParams.get('userId') || 'default_user';

    if (videoId) {
      const project = await db.projectIdea.findFirst({
        where: { video_id: videoId },
        include: {
          user_projects: {
            where: { user_id: userId },
          },
        },
      });

      if (!project) {
        return NextResponse.json({ project: null });
      }

      return NextResponse.json({
        project: {
          ...project,
          skills_practiced: JSON.parse(project.skills_practiced || '[]'),
          requirements: JSON.parse(project.requirements || '[]'),
          milestones: JSON.parse(project.milestones || '[]'),
          optional_extensions: JSON.parse(project.optional_extensions || '[]'),
          userProgress: project.user_projects[0]
            ? {
                ...project.user_projects[0],
                completed_milestone_ids: JSON.parse(
                  project.user_projects[0].completed_milestone_ids || '[]'
                ),
              }
            : null,
        },
      });
    }

    // Get all user projects
    const userProjects = await db.userProject.findMany({
      where: { user_id: userId },
      include: {
        project_idea: {
          include: {
            video: {
              select: {
                id: true,
                title: true,
                thumbnail_url: true,
                youtube_video_id: true,
                channel: true,
              },
            },
          },
        },
      },
      orderBy: { updated_at: 'desc' },
    });

    const formatted = userProjects.map((up) => ({
      ...up,
      completed_milestone_ids: JSON.parse(up.completed_milestone_ids || '[]'),
      project_idea: {
        ...up.project_idea,
        skills_practiced: JSON.parse(up.project_idea.skills_practiced || '[]'),
        requirements: JSON.parse(up.project_idea.requirements || '[]'),
        milestones: JSON.parse(up.project_idea.milestones || '[]'),
        optional_extensions: JSON.parse(up.project_idea.optional_extensions || '[]'),
      },
    }));

    return NextResponse.json({ projects: formatted });
  } catch (error: any) {
    console.error('[API /api/projects GET Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { videoId, userId = 'default_user', forceRegenerate = false } = body;

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    // Fetch video and its segments
    const video = await db.video.findFirst({
      where: {
        OR: [{ id: videoId }, { youtube_video_id: videoId }],
      },
      include: {
        segments: {
          orderBy: { order_index: 'asc' },
        },
        projects: {
          include: {
            user_projects: {
              where: { user_id: userId },
            },
          },
        },
      },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Check if project idea already exists and not forced
    if (video.projects.length > 0 && !forceRegenerate) {
      const project = video.projects[0];
      return NextResponse.json({
        project: {
          ...project,
          skills_practiced: JSON.parse(project.skills_practiced || '[]'),
          requirements: JSON.parse(project.requirements || '[]'),
          milestones: JSON.parse(project.milestones || '[]'),
          optional_extensions: JSON.parse(project.optional_extensions || '[]'),
          userProgress: project.user_projects[0]
            ? {
                ...project.user_projects[0],
                completed_milestone_ids: JSON.parse(
                  project.user_projects[0].completed_milestone_ids || '[]'
                ),
              }
            : null,
        },
      });
    }

    // Generate grounded project recommendation using AI
    const projectIdea = await generateProjectForVideo(
      video.title,
      video.channel,
      video.segments.map((s) => ({ title: s.title, summary: s.summary }))
    );

    // Save to database
    const createdProject = await db.projectIdea.create({
      data: {
        video_id: video.id,
        title: projectIdea.title,
        problem_statement: projectIdea.problem_statement,
        difficulty: projectIdea.difficulty,
        why_it_fits: projectIdea.why_it_fits,
        skills_practiced: JSON.stringify(projectIdea.skills_practiced),
        requirements: JSON.stringify(projectIdea.requirements),
        milestones: JSON.stringify(projectIdea.milestones),
        expected_outcome: projectIdea.expected_outcome,
        optional_extensions: JSON.stringify(projectIdea.optional_extensions),
      },
    });

    // Initialize user project record
    const userProgress = await db.userProject.create({
      data: {
        user_id: userId,
        project_idea_id: createdProject.id,
        status: 'not_started',
        completed_milestone_ids: '[]',
      },
    });

    return NextResponse.json({
      project: {
        ...createdProject,
        skills_practiced: projectIdea.skills_practiced,
        requirements: projectIdea.requirements,
        milestones: projectIdea.milestones,
        optional_extensions: projectIdea.optional_extensions,
        userProgress: {
          ...userProgress,
          completed_milestone_ids: [],
        },
      },
    });
  } catch (error: any) {
    console.error('[API /api/projects POST Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate project' },
      { status: 500 }
    );
  }
}
