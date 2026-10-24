'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Circle,
  Hammer,
  ArrowRight,
  RotateCw,
  Award,
  Layers,
  ChevronRight,
  ListTodo,
  ExternalLink,
  Flame,
  Check,
  Zap,
} from 'lucide-react';

export interface ProjectData {
  id: string;
  video_id: string;
  title: string;
  problem_statement: string;
  difficulty: string;
  why_it_fits: string;
  skills_practiced: string[];
  requirements: string[];
  milestones: { id: string; label: string; detail: string }[];
  expected_outcome: string;
  optional_extensions: string[];
  userProgress?: {
    id: string;
    status: string;
    completed_milestone_ids: string[];
    notes?: string;
  } | null;
}

interface ProjectRoadmapViewProps {
  videoId: string;
  videoTitle: string;
  onClose?: () => void;
}

export function ProjectRoadmapView({
  videoId,
  videoTitle,
  onClose,
}: ProjectRoadmapViewProps) {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [completedMilestones, setCompletedMilestones] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'roadmap' | 'requirements' | 'extensions'>('roadmap');

  // Fetch or generate project for this video
  const loadProject = async (forceRegenerate = false) => {
    try {
      if (forceRegenerate) {
        setIsRegenerating(true);
      } else {
        setIsLoading(true);
      }

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, forceRegenerate }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.project) {
          setProject(data.project);
          setCompletedMilestones(
            data.project.userProgress?.completed_milestone_ids || []
          );
        }
      }
    } catch (e) {
      console.warn('Failed to load project recommendation:', e);
    } finally {
      setIsLoading(false);
      setIsRegenerating(false);
    }
  };

  useEffect(() => {
    if (videoId) {
      loadProject();
    }
  }, [videoId]);

  // Toggle milestone completion
  const handleToggleMilestone = async (milestoneId: string) => {
    if (!project) return;

    const isAlreadyCompleted = completedMilestones.includes(milestoneId);
    const newCompleted = isAlreadyCompleted
      ? completedMilestones.filter((id) => id !== milestoneId)
      : [...completedMilestones, milestoneId];

    setCompletedMilestones(newCompleted);

    try {
      await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestoneId,
          completed: !isAlreadyCompleted,
        }),
      });
    } catch (e) {
      console.warn('Failed to update milestone progress:', e);
    }
  };

  const totalMilestones = project?.milestones?.length || 1;
  const progressPct = Math.round(
    ((completedMilestones?.length || 0) / totalMilestones) * 100
  );
  const isFullyCompleted =
    project && completedMilestones.length >= (project.milestones?.length || 1);

  if (isLoading) {
    return (
      <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-8 shadow-neo text-center space-y-4 my-6">
        <div className="w-12 h-12 rounded-2xl bg-[#B8FF3D] border-2 border-[#111218] flex items-center justify-center text-[#111218] mx-auto shadow-neo-sm">
          <RotateCw className="w-6 h-6 animate-spin" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-[#111218] font-display uppercase">
            Architecting Hands-on Project...
          </h3>
          <p className="text-xs text-[#636573] max-w-sm mx-auto font-medium">
            Analyzing video transcript concepts to synthesize an actionable implementation roadmap.
          </p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-8 shadow-neo text-center space-y-4 my-6">
        <div className="w-12 h-12 rounded-2xl bg-[#E9DFFF] border-2 border-[#111218] flex items-center justify-center text-[#111218] mx-auto shadow-neo-sm">
          <Hammer className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-[#111218] font-display uppercase">
            Build With What You Learned
          </h3>
          <p className="text-xs text-[#636573] max-w-sm mx-auto font-medium">
            Generate a personalized practical project to apply the skills from this lesson.
          </p>
        </div>
        <button
          onClick={() => loadProject(true)}
          className="neo-btn-lime px-5 py-2.5 text-xs font-bold font-display inline-flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>Generate Project Roadmap</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-6 sm:p-8 shadow-neo-lg space-y-6">
      {/* 1. Header & Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b-2 border-[#111218]">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="badge-lime px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <Hammer className="w-3 h-3" />
              Hands-on Project
            </span>
            <span className="bg-[#111218] text-white px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase">
              {project.difficulty}
            </span>
            {isFullyCompleted && (
              <span className="badge-lime px-2 py-0.5 text-[10px] font-black uppercase flex items-center gap-1">
                <Award className="w-3 h-3" /> Completed!
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-[#111218] font-display uppercase tracking-tight">
            {project.title}
          </h2>

          <p className="text-xs text-[#636573] font-medium leading-relaxed max-w-2xl">
            {project.problem_statement}
          </p>
        </div>

        <button
          onClick={() => loadProject(true)}
          disabled={isRegenerating}
          className="neo-btn-outline px-3.5 py-2 text-xs font-bold font-display flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50 self-start"
          title="Generate alternative project"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
          <span>New Idea</span>
        </button>
      </div>

      {/* 2. Pedagogical Grounding Box ("Why this fits what you learned") */}
      <div className="p-4 rounded-2xl bg-[#F5F3EC] border-2 border-[#111218] space-y-2 shadow-neo-sm">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold font-display uppercase tracking-wider text-[#111218] px-2 py-0.5 bg-[#B8FF3D] rounded border border-[#111218]">
            Concept Grounding
          </span>
          <span className="text-xs font-bold text-[#111218] font-display">
            Why This Fits What You Learned:
          </span>
        </div>
        <p className="text-xs text-[#21232C] font-medium leading-relaxed">
          {project.why_it_fits}
        </p>

        {/* Skills Practiced Badges */}
        <div className="pt-2 flex flex-wrap items-center gap-1.5 border-t border-[#111218]/15">
          <span className="text-[10px] font-bold font-mono text-[#636573] uppercase mr-1">
            Skills Practiced:
          </span>
          {project.skills_practiced.map((skill, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-md bg-[#FFFDF7] border border-[#111218] text-[10px] font-bold text-[#111218] font-display"
            >
              ✦ {skill}
            </span>
          ))}
        </div>
      </div>

      {/* 3. Progress Overview Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold font-display uppercase">
          <span className="flex items-center gap-1.5 text-[#111218]">
            <ListTodo className="w-3.5 h-3.5" />
            Project Milestone Roadmap
          </span>
          <span className="font-mono text-[#111218]">
            {completedMilestones.length} / {project.milestones.length} Milestones ({progressPct}%)
          </span>
        </div>

        <div className="w-full h-2.5 rounded-full bg-[#EAE6DB] border-2 border-[#111218] overflow-hidden">
          <div
            className="h-full bg-[#B8FF3D] transition-all duration-300"
            style={{ width: `${Math.max(6, progressPct)}%` }}
          />
        </div>
      </div>

      {/* 4. Tab Navigation */}
      <div className="flex items-center gap-2 border-b-2 border-[#111218] pb-1">
        {[
          { key: 'roadmap', label: 'Milestone Roadmap', count: project.milestones.length },
          { key: 'requirements', label: 'Requirements', count: project.requirements.length },
          { key: 'extensions', label: 'Optional Challenges', count: project.optional_extensions?.length || 0 },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-display font-bold transition-all ${
              activeTab === tab.key
                ? 'bg-[#B8FF3D] text-[#111218] border-2 border-[#111218] shadow-neo-sm'
                : 'text-[#636573] hover:text-[#111218]'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* 5. Tab Contents */}
      {activeTab === 'roadmap' && (
        <div className="space-y-3">
          {project.milestones.map((m, idx) => {
            const isDone = completedMilestones.includes(m.id);

            return (
              <div
                key={m.id}
                onClick={() => handleToggleMilestone(m.id)}
                className={`p-4 rounded-2xl border-2 border-[#111218] cursor-pointer transition-all flex items-start gap-3.5 group select-none ${
                  isDone
                    ? 'bg-[#DDF6BD] shadow-neo-sm'
                    : 'bg-[#FFFDF7] hover:bg-[#F5F3EC] shadow-neo-sm'
                }`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {isDone ? (
                    <div className="w-5 h-5 rounded-md bg-[#111218] text-[#B8FF3D] flex items-center justify-center border border-[#111218]">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-md bg-[#FFFDF7] border-2 border-[#111218] group-hover:border-[#B8FF3D] flex items-center justify-center text-[10px] font-mono font-bold text-[#636573]">
                      {idx + 1}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4
                      className={`text-xs font-bold font-display uppercase ${
                        isDone ? 'line-through text-[#111218]/70' : 'text-[#111218]'
                      }`}
                    >
                      {m.label}
                    </h4>
                    <span className="text-[10px] font-mono font-bold text-[#636573]">
                      {isDone ? '✓ Completed' : 'Click to complete'}
                    </span>
                  </div>
                  <p className="text-xs text-[#636573] leading-relaxed font-medium">
                    {m.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'requirements' && (
        <div className="bg-[#F5F3EC] border-2 border-[#111218] rounded-2xl p-5 space-y-3">
          <h4 className="text-xs font-bold font-display uppercase tracking-wider text-[#111218]">
            Core Implementation Requirements
          </h4>
          <ul className="space-y-2 text-xs font-medium text-[#111218]">
            {project.requirements.map((req, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#111218] flex-shrink-0 mt-1.5" />
                <span>{req}</span>
              </li>
            ))}
          </ul>

          <div className="pt-3 border-t border-[#111218]/15 mt-3 space-y-1">
            <span className="text-[10px] font-bold font-mono uppercase text-[#636573]">
              Expected Outcome:
            </span>
            <p className="text-xs text-[#21232C] font-semibold">
              {project.expected_outcome}
            </p>
          </div>
        </div>
      )}

      {activeTab === 'extensions' && (
        <div className="bg-[#E9DFFF] border-2 border-[#111218] rounded-2xl p-5 space-y-3">
          <h4 className="text-xs font-bold font-display uppercase tracking-wider text-[#111218]">
            Advanced Stretch Goals
          </h4>
          {project.optional_extensions.length === 0 ? (
            <p className="text-xs text-[#636573]">No optional extensions for this project.</p>
          ) : (
            <ul className="space-y-2 text-xs font-medium text-[#111218]">
              {project.optional_extensions.map((ext, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#111218] flex-shrink-0 mt-1.5" />
                  <span>{ext}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 6. Success Completion Card */}
      {isFullyCompleted && (
        <div className="p-4 bg-[#B8FF3D] text-[#111218] border-2 border-[#111218] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-neo animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#111218] text-[#B8FF3D] flex items-center justify-center flex-shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black font-display uppercase">
                Project Roadmap Completed!
              </h4>
              <p className="text-xs font-medium">
                You have successfully implemented all milestone requirements for &ldquo;{project.title}&rdquo;.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
