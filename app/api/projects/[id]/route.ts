import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectIdeaId = params.id;
    const body = await req.json();
    const {
      milestoneId,
      completed,
      status,
      userId = 'default_user',
    } = body;

    const projectIdea = await db.projectIdea.findUnique({
      where: { id: projectIdeaId },
    });

    if (!projectIdea) {
      return NextResponse.json({ error: 'Project idea not found' }, { status: 404 });
    }

    const allMilestones = JSON.parse(projectIdea.milestones || '[]');

    let userProject = await db.userProject.findUnique({
      where: {
        user_id_project_idea_id: {
          user_id: userId,
          project_idea_id: projectIdeaId,
        },
      },
    });

    let completedIds: string[] = [];
    if (userProject?.completed_milestone_ids) {
      try {
        completedIds = JSON.parse(userProject.completed_milestone_ids);
      } catch {
        completedIds = [];
      }
    }

    if (milestoneId) {
      if (completed && !completedIds.includes(milestoneId)) {
        completedIds.push(milestoneId);
      } else if (!completed) {
        completedIds = completedIds.filter((id) => id !== milestoneId);
      }
    }

    // Determine status
    let nextStatus = status;
    if (!nextStatus) {
      if (completedIds.length === 0) {
        nextStatus = 'not_started';
      } else if (allMilestones.length > 0 && completedIds.length >= allMilestones.length) {
        nextStatus = 'completed';
      } else {
        nextStatus = 'in_progress';
      }
    }

    userProject = await db.userProject.upsert({
      where: {
        user_id_project_idea_id: {
          user_id: userId,
          project_idea_id: projectIdeaId,
        },
      },
      create: {
        user_id: userId,
        project_idea_id: projectIdeaId,
        status: nextStatus,
        completed_milestone_ids: JSON.stringify(completedIds),
      },
      update: {
        status: nextStatus,
        completed_milestone_ids: JSON.stringify(completedIds),
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      userProgress: {
        ...userProject,
        completed_milestone_ids: completedIds,
      },
    });
  } catch (error: any) {
    console.error('[API /api/projects/[id] PATCH Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update project progress' },
      { status: 500 }
    );
  }
}
