'use client';

import React, { useState, useEffect } from 'react';
import {
  Check,
  Sparkles,
  Flame,
  Eye,
  TrendingUp,
  Award,
  Layers,
} from 'lucide-react';

interface StatCardsProps {
  totalCompletedVideos: number;
  totalVideos: number;
  masteredFlashcards: number;
  totalFlashcards: number;
  flashcardMasteryPercent: number;
  studyStreakDays?: number;
  focusScore?: number;
  activityDates?: string[];
}

export function StatCards({
  totalCompletedVideos,
  totalVideos,
  masteredFlashcards,
  totalFlashcards,
  flashcardMasteryPercent,
  studyStreakDays = 0,
  focusScore = 0,
  activityDates = [],
}: StatCardsProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const lessonsPercent =
    totalVideos > 0 ? Math.round((totalCompletedVideos / totalVideos) * 100) : 0;
  const remainingLessons = Math.max(0, totalVideos - totalCompletedVideos);

  // Derive real 7-day activity matrix from real activityDates
  const today = new Date();
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString(undefined, { weekday: 'narrow' });
    const isToday = i === 6;
    const active = activityDates.includes(dateStr);

    return {
      day: dayName,
      date: dateStr,
      active,
      isToday,
    };
  });

  const ringCircumference = 2 * Math.PI * 16;
  const flashcardStrokeOffset =
    ringCircumference - (ringCircumference * (isMounted ? flashcardMasteryPercent : 0)) / 100;
  const focusStrokeOffset =
    ringCircumference - (ringCircumference * (isMounted ? focusScore : 0)) / 100;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 w-full select-none">
      {/* CARD 1: LESSONS PROGRESS */}
      <div className="bg-[#FFFDF7] border-2 border-[#111218] p-4 rounded-2xl flex flex-col justify-between relative shadow-neo-sm h-[158px]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#636573] uppercase tracking-wider font-display">
            Lessons Completed
          </span>
          <div className="w-6 h-6 rounded-md bg-[#B8FF3D] border border-[#111218] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-[#111218]" />
          </div>
        </div>

        <div className="my-auto space-y-1.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-extrabold text-[#111218] font-display">
              {totalCompletedVideos}
            </span>
            <span className="text-sm font-semibold text-[#636573]">
              / {totalVideos}
            </span>
          </div>

          <div className="w-full h-2 bg-[#F5F3EC] border border-[#111218] rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-[#B8FF3D] rounded-full transition-all duration-700 ease-out"
              style={{ width: `${isMounted ? lessonsPercent : 0}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#636573] pt-1 border-t border-[#111218]/10 font-medium">
          <span>{remainingLessons} left to complete</span>
          <span className="font-mono font-bold text-[#111218]">{lessonsPercent}%</span>
        </div>
      </div>

      {/* CARD 2: FLASHCARD MASTERY */}
      <div className="bg-[#FFFDF7] border-2 border-[#111218] p-4 rounded-2xl flex flex-col justify-between relative shadow-neo-sm h-[158px]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#636573] uppercase tracking-wider font-display">
            Flashcards Mastered
          </span>
          <div className="w-6 h-6 rounded-md bg-[#DCEEFF] border border-[#111218] flex items-center justify-center">
            <Layers className="w-3.5 h-3.5 text-[#111218]" />
          </div>
        </div>

        <div className="my-auto flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-extrabold text-[#111218] font-display">
                {masteredFlashcards}
              </span>
              <span className="text-sm font-semibold text-[#636573]">
                / {totalFlashcards}
              </span>
            </div>
            <p className="text-[11px] text-[#636573] font-medium">Active recall</p>
          </div>

          <div className="relative w-11 h-11 flex items-center justify-center flex-shrink-0">
            <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="#F5F3EC"
                strokeWidth="3.5"
              />
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="#B8FF3D"
                strokeWidth="3.5"
                strokeDasharray={ringCircumference}
                strokeDashoffset={flashcardStrokeOffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <span className="absolute text-[10px] font-bold font-mono text-[#111218]">
              {flashcardMasteryPercent}%
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#636573] pt-1 border-t border-[#111218]/10 font-medium">
          <span>{totalFlashcards} cards in deck</span>
          <span className="font-bold text-[#111218]">Deck State</span>
        </div>
      </div>

      {/* CARD 3: STUDY STREAK */}
      <div className="bg-[#FFFDF7] border-2 border-[#111218] p-4 rounded-2xl flex flex-col justify-between relative shadow-neo-sm h-[158px]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#636573] uppercase tracking-wider font-display">
            Study Streak
          </span>
          <div className="w-6 h-6 rounded-md bg-[#FFE353] border border-[#111218] flex items-center justify-center">
            <Flame className="w-3.5 h-3.5 text-[#111218]" />
          </div>
        </div>

        <div className="my-auto space-y-1.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-extrabold text-[#111218] font-display">
              {studyStreakDays}
            </span>
            <span className="text-sm font-semibold text-[#636573]">Days</span>
          </div>

          {/* 7-Day Activity Row */}
          <div className="flex items-center justify-between gap-1 pt-0.5">
            {weekDays.map((item, idx) => {
              return (
                <div key={idx} className="flex flex-col items-center gap-0.5">
                  <span className="text-[9px] font-mono text-[#636573] uppercase">{item.day}</span>
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                      item.active
                        ? 'bg-[#B8FF3D] border-[#111218] text-[#111218]'
                        : 'bg-[#F5F3EC] border-[#111218]/30 text-transparent'
                    }`}
                  >
                    {item.active && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#636573] pt-1 border-t border-[#111218]/10 font-medium">
          <span>{studyStreakDays > 0 ? '🔥 Streak active' : 'No streak active'}</span>
          <span className="font-mono font-bold text-[#111218]">
            {studyStreakDays > 0 ? `${studyStreakDays}d` : '0d'}
          </span>
        </div>
      </div>

      {/* CARD 4: FOCUS CONSISTENCY */}
      <div className="bg-[#FFFDF7] border-2 border-[#111218] p-4 rounded-2xl flex flex-col justify-between relative shadow-neo-sm h-[158px]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#636573] uppercase tracking-wider font-display">
            Deep Focus Score
          </span>
          <div className="w-6 h-6 rounded-md bg-[#E9DFFF] border border-[#111218] flex items-center justify-center">
            <Eye className="w-3.5 h-3.5 text-[#111218]" />
          </div>
        </div>

        <div className="my-auto flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-extrabold text-[#111218] font-display">
                {focusScore > 0 ? `${focusScore}%` : 'N/A'}
              </span>
            </div>
            <p className="text-[11px] text-[#636573] font-medium">
              {focusScore > 0 ? 'On-device camera' : 'No sessions yet'}
            </p>
          </div>

          <div className="relative w-11 h-11 flex items-center justify-center flex-shrink-0">
            <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="#F5F3EC"
                strokeWidth="3.5"
              />
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="#B8FF3D"
                strokeWidth="3.5"
                strokeDasharray={ringCircumference}
                strokeDashoffset={focusStrokeOffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <span className="absolute text-[10px] font-bold font-mono text-[#111218]">
              {focusScore > 0 ? `${focusScore}%` : '0%'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#636573] pt-1 border-t border-[#111218]/10 font-medium">
          <span>Vision Attention</span>
          <span className="font-bold text-[#111218]">
            {focusScore >= 80 ? 'High' : focusScore > 0 ? 'Moderate' : 'Inactive'}
          </span>
        </div>
      </div>
    </div>
  );
}
