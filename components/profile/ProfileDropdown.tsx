'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Flame,
  Video,
  CheckCircle2,
  RotateCw,
  FolderGit2,
  ArrowRight,
  LogOut,
  Sparkles,
  Layers,
  Clock,
  Target,
  ExternalLink,
} from 'lucide-react';
import { UserLearningSummary } from '@/lib/services/userProfile';

interface ProfileDropdownProps {
  summary: UserLearningSummary | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export function ProfileDropdown({
  summary,
  isOpen,
  onClose,
  onRefresh,
}: ProfileDropdownProps) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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
  const currentGoals = summary?.currentGoals || { total: 0, completed: 0, items: [] };

  const handleSignOut = () => {
    if (confirm('Are you sure you want to sign out?')) {
      // Clear session / reload to initial landing
      router.push('/');
      onClose();
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute top-14 right-0 z-50 w-80 sm:w-96 rounded-3xl bg-[#FFFDF7] border-2 border-[#111218] shadow-neo-xl overflow-hidden transition-all animate-in fade-in slide-in-from-top-2 duration-150"
    >
      {/* Header: User Profile Info */}
      <div className="p-4 bg-[#111218] text-white flex items-center justify-between border-b-2 border-[#111218]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#B8FF3D] border-2 border-white flex items-center justify-center text-[#111218] text-base font-black font-display shadow-neo-sm">
            {user.initials}
          </div>
          <div className="overflow-hidden">
            <h4 className="font-extrabold text-sm text-white font-display truncate">
              {user.name}
            </h4>
            <p className="text-[11px] text-slate-300 truncate font-mono">
              {user.email}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            router.push('/profile');
            onClose();
          }}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-[#B8FF3D] hover:text-[#111218] transition-colors text-slate-300"
          title="Open Full Profile"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
        {/* Metric Counter Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl bg-[#F5F3EC] border-2 border-[#111218] space-y-0.5">
            <div className="flex items-center justify-between text-[#636573]">
              <span className="text-[10px] font-bold uppercase tracking-wider font-display">
                Watched
              </span>
              <Video className="w-3.5 h-3.5 text-[#111218]" />
            </div>
            <div className="text-lg font-black text-[#111218] font-display">
              {metrics.videosWatched} <span className="text-xs font-semibold text-[#636573]">lessons</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F5F3EC] border-2 border-[#111218] space-y-0.5">
            <div className="flex items-center justify-between text-[#636573]">
              <span className="text-[10px] font-bold uppercase tracking-wider font-display">
                Completed
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#111218]" />
            </div>
            <div className="text-lg font-black text-[#111218] font-display">
              {metrics.lessonsCompleted} <span className="text-xs font-semibold text-[#636573]">mastered</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F5F3EC] border-2 border-[#111218] space-y-0.5">
            <div className="flex items-center justify-between text-[#636573]">
              <span className="text-[10px] font-bold uppercase tracking-wider font-display">
                Revisions
              </span>
              <RotateCw className="w-3.5 h-3.5 text-[#111218]" />
            </div>
            <div className="text-lg font-black text-[#111218] font-display">
              {metrics.revisionSessions} <span className="text-xs font-semibold text-[#636573]">sessions</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F5F3EC] border-2 border-[#111218] space-y-0.5">
            <div className="flex items-center justify-between text-[#636573]">
              <span className="text-[10px] font-bold uppercase tracking-wider font-display">
                Projects
              </span>
              <FolderGit2 className="w-3.5 h-3.5 text-[#111218]" />
            </div>
            <div className="text-lg font-black text-[#111218] font-display">
              {metrics.projects} <span className="text-xs font-semibold text-[#636573]">built</span>
            </div>
          </div>
        </div>

        {/* Real Streak & 7-Day Mini Strip */}
        <div className="p-3.5 rounded-2xl bg-[#FFFDF7] border-2 border-[#111218] shadow-neo-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#B8FF3D] border-1.5 border-[#111218] flex items-center justify-center shadow-neo-sm">
                <Flame className="w-4 h-4 text-[#111218] fill-[#111218]" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-[#111218] font-display">
                  {streak.currentStreak} Day Study Streak
                </p>
                <p className="text-[10px] text-[#636573]">
                  {streak.isActiveToday
                    ? 'Streak active today!'
                    : 'Study today to continue your streak'}
                </p>
              </div>
            </div>
            <div className="text-[10px] font-mono font-bold bg-[#F5F3EC] px-2 py-0.5 rounded-md border border-[#111218]">
              Best: {streak.longestStreak}d
            </div>
          </div>

          {/* 7-Day Strip */}
          {streak.weeklyActivity.length > 0 && (
            <div className="pt-2 border-t border-[#111218]/10 flex items-center justify-between">
              {streak.weeklyActivity.map((day, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-extrabold text-[#636573] font-display">
                    {day.dayLabel}
                  </span>
                  <div
                    className={`w-5 h-5 rounded-full border-1.5 border-[#111218] flex items-center justify-center transition-all ${
                      day.active
                        ? 'bg-[#B8FF3D] shadow-neo-sm scale-105'
                        : 'bg-[#F5F3EC]'
                    }`}
                    title={`${day.date}: ${day.active ? 'Active' : 'No learning activity'}`}
                  >
                    {day.active && <div className="w-1.5 h-1.5 rounded-full bg-[#111218]" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Goals Progress if present */}
        {currentGoals.total > 0 && (
          <div className="p-3 rounded-2xl bg-[#F5F3EC] border-2 border-[#111218] space-y-2">
            <div className="flex items-center justify-between text-xs font-bold font-display text-[#111218]">
              <span className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> Study Goals
              </span>
              <span className="badge-lime text-[10px] px-1.5 py-0.5">
                {currentGoals.completed}/{currentGoals.total} done
              </span>
            </div>
            <div className="space-y-1">
              {currentGoals.items.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 text-[11px] text-[#21232C]"
                >
                  <div
                    className={`w-3.5 h-3.5 rounded border border-[#111218] flex items-center justify-center ${
                      item.done ? 'bg-[#B8FF3D]' : 'bg-white'
                    }`}
                  >
                    {item.done && <CheckCircle2 className="w-3 h-3 text-[#111218]" />}
                  </div>
                  <span className={`truncate ${item.done ? 'line-through text-[#636573]' : 'font-medium'}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity Timeline */}
        <div className="space-y-2">
          <p className="text-[11px] font-extrabold text-[#111218] font-display uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#111218]" /> Your Learning Activity
          </p>

          {recentActivity.length === 0 ? (
            <div className="p-3 rounded-xl bg-[#F5F3EC] border border-[#111218]/20 text-center text-[11px] text-[#636573]">
              No learning activity recorded yet. Start your first lesson to build your streak!
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentActivity.slice(0, 4).map((act) => (
                <div
                  key={act.id}
                  className="p-2 rounded-xl bg-[#FFFDF7] border border-[#111218]/30 flex items-center justify-between text-xs gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-[#B8FF3D] border border-[#111218] flex-shrink-0" />
                    <span className="truncate font-semibold text-[#111218] text-[11px]">
                      {act.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#636573] font-mono whitespace-nowrap">
                    {act.relativeDay}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-3 bg-[#F5F3EC] border-t-2 border-[#111218] flex items-center justify-between gap-2">
        <button
          onClick={() => {
            router.push('/profile');
            onClose();
          }}
          className="flex-1 py-2 px-3 neo-btn-primary text-white text-xs font-bold flex items-center justify-center gap-1.5"
        >
          <span>View Profile</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#B8FF3D]" />
        </button>
        <button
          onClick={handleSignOut}
          className="py-2 px-3 neo-btn-secondary text-[#111218] text-xs font-bold flex items-center justify-center gap-1.5"
          title="Sign Out"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
