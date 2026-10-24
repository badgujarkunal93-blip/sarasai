'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Flame,
  Video,
  CheckCircle2,
  RotateCw,
  FolderGit2,
  Layers,
  Sparkles,
  Clock,
  Target,
  ArrowRight,
  Edit3,
  LogOut,
  ChevronRight,
  BookOpen,
  Loader2,
  Check,
} from 'lucide-react';
import { UserLearningSummary } from '@/lib/services/userProfile';

export default function ProfilePage() {
  const router = useRouter();
  const [summary, setSummary] = useState<UserLearningSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchSummary = async () => {
    try {
      const tzOffset = new Date().getTimezoneOffset();
      const res = await fetch(`/api/user/summary?tzOffset=${tzOffset}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setEditName(data.summary.user.name);
        setEditEmail(data.summary.user.email);
      }
    } catch (e) {
      console.warn('Failed to fetch profile summary:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/user/summary', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setIsEditing(false);
      }
    } catch (e) {
      console.error('Failed to update profile:', e);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#111218]" />
        <p className="text-xs font-bold text-[#111218] font-display uppercase tracking-wider">
          Loading learning profile...
        </p>
      </div>
    );
  }

  const user = summary?.user || {
    name: 'Student',
    email: 'student@saras.ai',
    initials: 'S',
  };

  const metrics = summary?.metrics || {
    videosWatched: 0,
    lessonsCompleted: 0,
    revisionSessions: 0,
    projects: 0,
    flashcardsReviewed: 0,
    conceptsPracticed: 0,
  };

  const streak = summary?.streak || {
    currentStreak: 0,
    longestStreak: 0,
    isActiveToday: false,
    weeklyActivity: [],
  };

  const recentActivity = summary?.recentActivity || [];
  const recentlyLearned = summary?.recentlyLearned || [];
  const currentGoals = summary?.currentGoals || { total: 0, completed: 0, items: [] };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Profile Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#111218] text-white border-2 border-[#111218] shadow-neo-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-[#B8FF3D] border-2 border-white flex items-center justify-center text-[#111218] text-2xl md:text-3xl font-black font-display shadow-neo">
            {user.initials}
          </div>
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-black text-white font-display tracking-tight flex items-center gap-2">
              {user.name}
              <span className="badge-lime px-2 py-0.5 text-[10px] font-mono">
                PRO LEARNER
              </span>
            </h1>
            <p className="text-xs md:text-sm text-slate-300 font-mono">
              {user.email}
            </p>
            <p className="text-xs text-slate-400 font-medium">
              Member of Saras AI Cognitive Pair-Learning Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="py-2.5 px-4 neo-btn-secondary text-[#111218] text-xs font-bold font-display flex items-center gap-2"
          >
            <Edit3 className="w-4 h-4" />
            <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
          </button>
          <button
            onClick={() => {
              if (confirm('Sign out of your session?')) {
                router.push('/');
              }
            }}
            className="py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white border-2 border-[#111218] rounded-xl text-xs font-bold font-display shadow-neo-sm hover:-translate-y-0.5 transition-all flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Edit Profile Form */}
      {isEditing && (
        <form
          onSubmit={handleSaveProfile}
          className="p-6 rounded-3xl bg-[#FFFDF7] border-2 border-[#111218] shadow-neo space-y-4 animate-in slide-in-from-top-2 duration-150"
        >
          <h3 className="text-sm font-extrabold text-[#111218] font-display uppercase tracking-wider">
            Edit Account Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#111218]">Display Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white border-2 border-[#111218] text-xs font-bold focus:outline-none focus:border-[#B8FF3D]"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#111218]">Email Address</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white border-2 border-[#111218] text-xs font-bold focus:outline-none focus:border-[#B8FF3D]"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="py-2 px-4 neo-btn-secondary text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="py-2 px-5 neo-btn-lime text-[#111218] text-xs font-bold flex items-center gap-1.5"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-[#FFFDF7] border-2 border-[#111218] shadow-neo-sm space-y-1">
          <div className="flex items-center justify-between text-[#636573]">
            <span className="text-[10px] font-bold uppercase tracking-wider font-display">
              Watched
            </span>
            <Video className="w-4 h-4 text-[#111218]" />
          </div>
          <div className="text-2xl font-black text-[#111218] font-display">
            {metrics.videosWatched}
          </div>
          <p className="text-[10px] text-[#636573] font-medium">Unique lessons</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#FFFDF7] border-2 border-[#111218] shadow-neo-sm space-y-1">
          <div className="flex items-center justify-between text-[#636573]">
            <span className="text-[10px] font-bold uppercase tracking-wider font-display">
              Completed
            </span>
            <CheckCircle2 className="w-4 h-4 text-[#111218]" />
          </div>
          <div className="text-2xl font-black text-[#111218] font-display">
            {metrics.lessonsCompleted}
          </div>
          <p className="text-[10px] text-[#636573] font-medium">Fully mastered</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#FFFDF7] border-2 border-[#111218] shadow-neo-sm space-y-1">
          <div className="flex items-center justify-between text-[#636573]">
            <span className="text-[10px] font-bold uppercase tracking-wider font-display">
              Revisions
            </span>
            <RotateCw className="w-4 h-4 text-[#111218]" />
          </div>
          <div className="text-2xl font-black text-[#111218] font-display">
            {metrics.revisionSessions}
          </div>
          <p className="text-[10px] text-[#636573] font-medium">Sessions finished</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#FFFDF7] border-2 border-[#111218] shadow-neo-sm space-y-1">
          <div className="flex items-center justify-between text-[#636573]">
            <span className="text-[10px] font-bold uppercase tracking-wider font-display">
              Projects
            </span>
            <FolderGit2 className="w-4 h-4 text-[#111218]" />
          </div>
          <div className="text-2xl font-black text-[#111218] font-display">
            {metrics.projects}
          </div>
          <p className="text-[10px] text-[#636573] font-medium">Hands-on builds</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#FFFDF7] border-2 border-[#111218] shadow-neo-sm space-y-1">
          <div className="flex items-center justify-between text-[#636573]">
            <span className="text-[10px] font-bold uppercase tracking-wider font-display">
              Flashcards
            </span>
            <Layers className="w-4 h-4 text-[#111218]" />
          </div>
          <div className="text-2xl font-black text-[#111218] font-display">
            {metrics.flashcardsReviewed}
          </div>
          <p className="text-[10px] text-[#636573] font-medium">Cards mastered</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#FFFDF7] border-2 border-[#111218] shadow-neo-sm space-y-1">
          <div className="flex items-center justify-between text-[#636573]">
            <span className="text-[10px] font-bold uppercase tracking-wider font-display">
              Concepts
            </span>
            <Sparkles className="w-4 h-4 text-[#111218]" />
          </div>
          <div className="text-2xl font-black text-[#111218] font-display">
            {metrics.conceptsPracticed}
          </div>
          <p className="text-[10px] text-[#636573] font-medium">In Knowledge Map</p>
        </div>
      </div>

      {/* Two Column Layout: Streak & Goals / Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Streak Matrix & Study Goals */}
        <div className="space-y-6">
          {/* Study Streak Box */}
          <div className="p-6 rounded-3xl bg-[#FFFDF7] border-2 border-[#111218] shadow-neo space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#B8FF3D] border-2 border-[#111218] flex items-center justify-center shadow-neo-sm">
                  <Flame className="w-5 h-5 text-[#111218] fill-[#111218]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#111218] font-display">
                    {streak.currentStreak} Day Streak
                  </h3>
                  <p className="text-xs text-[#636573]">
                    {streak.isActiveToday
                      ? 'You completed a learning action today!'
                      : 'Complete a lesson or revision to extend!'}
                  </p>
                </div>
              </div>
              <div className="text-xs font-mono font-bold bg-[#F5F3EC] px-2.5 py-1 rounded-lg border border-[#111218]">
                Best: {streak.longestStreak}d
              </div>
            </div>

            {/* 7-Day Activity Strip */}
            <div className="pt-3 border-t border-[#111218]/10">
              <p className="text-[10px] font-bold text-[#636573] uppercase tracking-wider mb-2 font-display">
                7-Day Activity Matrix
              </p>
              <div className="grid grid-cols-7 gap-1 text-center">
                {streak.weeklyActivity.map((day, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-extrabold text-[#636573] font-display">
                      {day.dayLabel}
                    </span>
                    <div
                      className={`w-7 h-7 rounded-xl border-2 border-[#111218] flex items-center justify-center transition-all ${
                        day.active
                          ? 'bg-[#B8FF3D] shadow-neo-sm scale-105'
                          : 'bg-[#F5F3EC]'
                      }`}
                      title={`${day.date}: ${day.active ? 'Qualifying activity completed' : 'No activity'}`}
                    >
                      {day.active && (
                        <div className="w-2 h-2 rounded-full bg-[#111218]" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Current Goals / Tasks */}
          <div className="p-6 rounded-3xl bg-[#FFFDF7] border-2 border-[#111218] shadow-neo space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[#111218] font-display uppercase tracking-wider flex items-center gap-2">
                <Target className="w-4 h-4 text-[#111218]" /> Study Goals
              </h3>
              <span className="badge-lime text-xs px-2 py-0.5">
                {currentGoals.completed} / {currentGoals.total} Done
              </span>
            </div>

            {currentGoals.items.length === 0 ? (
              <p className="text-xs text-[#636573]">No study tasks set.</p>
            ) : (
              <div className="space-y-2">
                {currentGoals.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-[#F5F3EC] border border-[#111218]/30 flex items-center gap-2.5 text-xs"
                  >
                    <div
                      className={`w-4 h-4 rounded border border-[#111218] flex items-center justify-center ${
                        item.done ? 'bg-[#B8FF3D]' : 'bg-white'
                      }`}
                    >
                      {item.done && <CheckCircle2 className="w-3.5 h-3.5 text-[#111218]" />}
                    </div>
                    <span
                      className={`truncate ${
                        item.done ? 'line-through text-[#636573]' : 'font-semibold text-[#111218]'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (2 cols): Recently Learned & Activity Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recently Learned */}
          <div className="p-6 rounded-3xl bg-[#FFFDF7] border-2 border-[#111218] shadow-neo space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[#111218] font-display uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#111218]" /> Recently Learned
              </h3>
              <button
                onClick={() => router.push('/discover')}
                className="text-xs font-bold text-[#111218] hover:underline flex items-center gap-1"
              >
                Catalog <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentlyLearned.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#F5F3EC] border border-[#111218]/20 text-center space-y-2">
                <p className="text-xs text-[#636573]">
                  You haven&apos;t started any video lessons yet.
                </p>
                <button
                  onClick={() => router.push('/discover')}
                  className="py-1.5 px-4 neo-btn-lime text-xs font-bold text-[#111218]"
                >
                  Explore Lessons →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentlyLearned.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="p-4 rounded-2xl bg-[#F5F3EC] border-2 border-[#111218] space-y-2.5 flex flex-col justify-between"
                  >
                    <div>
                      <h4 className="font-extrabold text-xs text-[#111218] font-display line-clamp-2">
                        {lesson.title}
                      </h4>
                      <p className="text-[10px] text-[#636573] font-medium">
                        {lesson.channel}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-bold text-[#111218]">
                        <span>Progress</span>
                        <span>{lesson.progressPercent}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white border border-[#111218] overflow-hidden">
                        <div
                          className="h-full bg-[#B8FF3D]"
                          style={{ width: `${lesson.progressPercent}%` }}
                        />
                      </div>
                      <button
                        onClick={() => router.push(`/video/${lesson.id}`)}
                        className="w-full mt-1 py-1 px-3 neo-btn-primary text-white text-[11px] font-bold flex items-center justify-center gap-1"
                      >
                        <span>Continue</span>
                        <ArrowRight className="w-3 h-3 text-[#B8FF3D]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Timeline */}
          <div className="p-6 rounded-3xl bg-[#FFFDF7] border-2 border-[#111218] shadow-neo space-y-4">
            <h3 className="text-sm font-extrabold text-[#111218] font-display uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#111218]" /> Chronological Learning Activity
            </h3>

            {recentActivity.length === 0 ? (
              <p className="text-xs text-[#636573] p-4 bg-[#F5F3EC] rounded-xl border border-[#111218]/20 text-center">
                No learning events recorded yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {recentActivity.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-2xl bg-[#F5F3EC] border-2 border-[#111218] flex items-center justify-between text-xs gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-[#B8FF3D] border border-[#111218] flex items-center justify-center flex-shrink-0 shadow-neo-sm">
                        {act.type === 'revision_completed' ? (
                          <RotateCw className="w-3.5 h-3.5 text-[#111218]" />
                        ) : act.type === 'project_started' ? (
                          <FolderGit2 className="w-3.5 h-3.5 text-[#111218]" />
                        ) : act.type === 'lesson_completed' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#111218]" />
                        ) : (
                          <Video className="w-3.5 h-3.5 text-[#111218]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-[#111218] truncate text-xs font-display">
                          {act.title}
                        </p>
                        <p className="text-[10px] text-[#636573] font-medium capitalize">
                          {act.type.replace('_', ' ')} • {act.formattedTime}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-[#111218] bg-white px-2 py-0.5 rounded-md border border-[#111218] whitespace-nowrap">
                      {act.relativeDay}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
