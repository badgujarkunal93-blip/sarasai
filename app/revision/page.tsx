'use client';

import React, { useState, useEffect, Suspense } from 'react';
import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Sparkles,
  Zap,
  RotateCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Play,
  Layers,
  Brain,
  Network,
  HelpCircle,
  ChevronRight,
  RotateCcw,
  Clock,
  SlidersHorizontal,
  Flame,
} from 'lucide-react';
import { formatTime } from '@/lib/utils';

export interface RevisionItem {
  id: string;
  concept_id?: string | null;
  source_type: 'quiz' | 'flashcard' | 'concept_recall';
  source_id?: string | null;
  question_text: string;
  options?: string | null;
  correct_answer?: string | null;
  user_answer?: string | null;
  is_correct?: boolean | null;
  explanation?: string | null;
  order_index: number;
  source_video_title?: string | null;
  source_segment_title?: string | null;
  source_start_seconds?: number | null;
  concept?: {
    id: string;
    name: string;
    category: string;
    user_mastery?: { mastery_score: number }[];
  } | null;
}

export interface RevisionSession {
  id: string;
  user_id: string;
  mode: string;
  status: string;
  total_items: number;
  completed_items: number;
  correct_items: number;
  session_score: number;
  items: RevisionItem[];
}

function RevisionSetupView({
  mode,
  setMode,
  itemCount,
  setItemCount,
  isLoading,
  onStart,
}: {
  mode: string;
  setMode: (m: string) => void;
  itemCount: number;
  setItemCount: (c: number) => void;
  isLoading: boolean;
  onStart: () => void;
}) {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-6 sm:p-10 shadow-neo space-y-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#B8FF3D] border-2 border-[#111218] rounded-md shadow-neo-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#111218]" />
            <span className="text-xs font-black font-display uppercase tracking-wider text-[#111218]">
              Adaptive Spaced Recall
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111218] font-display uppercase tracking-tight">
            Revise What You Learned
          </h1>
          <p className="text-xs sm:text-sm text-[#636573] font-medium max-w-2xl leading-relaxed">
            Saras dynamically analyzes your Knowledge Map, weak areas, and recent mistakes to curate an intelligent, personalized revision session.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="space-y-3">
          <label className="text-xs font-bold font-display uppercase text-[#111218] tracking-wider">
            Choose Revision Focus
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: 'smart_mix',
                label: 'Smart Mix',
                badge: 'Recommended',
                detail: 'Balanced combination of weak concepts, recent lessons, and older material.',
                icon: Sparkles,
                color: 'bg-[#B8FF3D]',
              },
              {
                id: 'weak_only',
                label: 'Focus on Weak Areas',
                badge: 'High Priority',
                detail: 'Strictly targets concepts below 50% mastery with repeated mistakes.',
                icon: AlertTriangle,
                color: 'bg-[#FFD1C7]',
              },
              {
                id: 'recent',
                label: 'Recent Learning',
                badge: 'Last 7 Days',
                detail: 'Reinforces recently completed video chapters and newly acquired terms.',
                icon: Clock,
                color: 'bg-[#E9DFFF]',
              },
            ].map((m) => (
              <div
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  mode === m.id
                    ? 'bg-[#FFFDF7] border-[#111218] ring-4 ring-[#111218] shadow-neo-md -translate-y-0.5'
                    : 'bg-[#F5F3EC] border-[#111218]/40 hover:border-[#111218]'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${m.color} border border-[#111218]`}>
                      {m.badge}
                    </span>
                    <m.icon className="w-4 h-4 text-[#111218]" />
                  </div>
                  <h3 className="text-sm font-black font-display uppercase text-[#111218]">
                    {m.label}
                  </h3>
                  <p className="text-xs text-[#636573] font-medium leading-relaxed">
                    {m.detail}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#111218]/10 text-[10px] font-mono font-bold text-[#111218]">
                  <span>{mode === m.id ? '✓ Selected' : 'Click to select'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Session Size Selector */}
        <div className="space-y-3">
          <label className="text-xs font-bold font-display uppercase text-[#111218] tracking-wider">
            Session Length
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { count: 5, time: '~4 mins' },
              { count: 10, time: '~8 mins (Recommended)' },
              { count: 15, time: '~12 mins' },
              { count: 20, time: '~16 mins' },
            ].map((s) => (
              <button
                key={s.count}
                type="button"
                onClick={() => setItemCount(s.count)}
                className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                  itemCount === s.count
                    ? 'bg-[#B8FF3D] border-[#111218] shadow-neo-sm font-bold'
                    : 'bg-[#F5F3EC] border-[#111218]/30 hover:border-[#111218] text-[#636573]'
                }`}
              >
                <div className="text-base font-black font-display text-[#111218]">
                  {s.count} Items
                </div>
                <div className="text-[10px] font-mono text-[#111218]">{s.time}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Primary Start CTA */}
        <div className="pt-4 border-t-2 border-[#111218] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-[#636573] font-medium">
            💡 Grounded in real concepts & flashcards from your completed lessons.
          </div>

          <button
            onClick={onStart}
            disabled={isLoading}
            className="neo-btn-primary px-8 py-3.5 text-sm font-bold font-display uppercase inline-flex items-center justify-center gap-2 shadow-neo disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin text-[#111218]" />
                <span>Synthesizing Session...</span>
              </>
            ) : (
              <>
                <span>Start Revision →</span>
                <ArrowRight className="w-4 h-4 text-[#B8FF3D]" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function RevisionCompletionView({
  session,
  onRestart,
}: {
  session: RevisionSession;
  onRestart: () => void;
}) {
  const accuracy = session.session_score;
  const strengthened = session.items
    .filter((it) => it.is_correct === true && it.concept?.name)
    .map((it) => it.concept?.name as string);
  const uniqueStrengthened = Array.from(new Set(strengthened));

  const needsReview = session.items
    .filter((it) => it.is_correct === false && it.concept?.name)
    .map((it) => it.concept?.name as string);
  const uniqueNeedsReview = Array.from(new Set(needsReview));

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-6 sm:p-10 shadow-neo space-y-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#B8FF3D] border-2 border-[#111218] flex items-center justify-center text-[#111218] mx-auto shadow-neo-sm">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="badge-black px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider">
            Session Finished
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111218] font-display uppercase tracking-tight">
            Revision Complete!
          </h1>
          <p className="text-xs sm:text-sm text-[#636573] font-medium max-w-md mx-auto">
            Your concept mastery scores have been updated in your Knowledge Map.
          </p>
        </div>

        <div className="p-6 bg-[#F5F3EC] border-2 border-[#111218] rounded-2xl max-w-md mx-auto grid grid-cols-2 gap-4 shadow-neo-sm">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-[#636573]">
              Score
            </span>
            <div className="text-3xl font-black font-display text-[#111218]">
              {session.correct_items} / {session.total_items}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-[#636573]">
              Accuracy
            </span>
            <div className="text-3xl font-black font-display text-[#111218]">
              {accuracy}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          <div className="p-4 rounded-2xl bg-[#DDF6BD] border-2 border-[#111218] space-y-2">
            <span className="text-[10px] font-black font-display uppercase tracking-wider text-[#111218]">
              ✦ Strengthened Concepts ({uniqueStrengthened.length})
            </span>
            {uniqueStrengthened.length > 0 ? (
              <ul className="space-y-1 text-xs font-bold text-[#111218]">
                {uniqueStrengthened.map((name, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800" />
                    <span>{name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#636573]">No concepts mastered in this run.</p>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-[#FFD1C7] border-2 border-[#111218] space-y-2">
            <span className="text-[10px] font-black font-display uppercase tracking-wider text-red-950">
              ⚠️ Needs Another Look ({uniqueNeedsReview.length})
            </span>
            {uniqueNeedsReview.length > 0 ? (
              <ul className="space-y-1 text-xs font-bold text-red-950">
                {uniqueNeedsReview.map((name, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-700" />
                    <span>{name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-emerald-900 font-bold">Flawless run! Zero mistakes recorded.</p>
            )}
          </div>
        </div>

        <div className="pt-4 border-t-2 border-[#111218] flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onRestart}
            className="neo-btn-primary w-full sm:w-auto px-6 py-3 text-xs font-bold font-display uppercase inline-flex items-center justify-center gap-2"
          >
            <RotateCw className="w-4 h-4" />
            <span>Start Another Revision</span>
          </button>

          <NextLink
            href="/knowledge"
            className="neo-btn-outline w-full sm:w-auto px-6 py-3 text-xs font-bold font-display uppercase inline-flex items-center justify-center gap-2"
          >
            <Network className="w-4 h-4" />
            <span>View Knowledge Map</span>
          </NextLink>
        </div>
      </div>
    </div>
  );
}

function RevisionActiveItemView({
  session,
  currentIndex,
  onEndSession,
  onSubmitAnswer,
  onNextItem,
}: {
  session: RevisionSession;
  currentIndex: number;
  onEndSession: () => void;
  onSubmitAnswer: (ans: string, isCorrect: boolean) => void;
  onNextItem: () => void;
}) {
  const currentItem = session.items[currentIndex];
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState<boolean>(false);

  useEffect(() => {
    setSelectedOption(null);
    setIsAnswerRevealed(false);
  }, [currentIndex]);

  if (!currentItem) return null;

  const isAnswerSubmitted = currentItem.is_correct !== null && currentItem.is_correct !== undefined;

  let parsedOptions: string[] = [];
  if (currentItem.options) {
    try {
      parsedOptions = JSON.parse(currentItem.options);
    } catch {
      parsedOptions = [];
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 select-none">
      {/* 1. Header Progress Bar */}
      <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-2xl p-4 shadow-neo flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="badge-lime px-2.5 py-0.5 text-xs font-black font-display uppercase">
            Item {currentIndex + 1} / {session.total_items}
          </span>
          <span className="text-xs font-bold font-mono text-[#636573]">
            {Math.round(((currentIndex + 1) / session.total_items) * 100)}% Complete
          </span>
        </div>

        <button
          onClick={onEndSession}
          className="text-xs font-bold font-display text-[#636573] hover:text-red-700 underline"
        >
          End Session
        </button>
      </div>

      {/* 2. Main Question Card */}
      <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-6 sm:p-8 shadow-neo-lg space-y-6">
        <div className="flex items-center justify-between gap-2 pb-3 border-b-2 border-[#111218]/10">
          <div className="flex items-center gap-2">
            <span className="badge-black px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              {currentItem.source_type === 'quiz' ? 'Multiple Choice' : currentItem.source_type === 'flashcard' ? 'Flashcard Recall' : 'Concept Self-Test'}
            </span>
            {currentItem.concept && (
              <span className="text-xs font-black font-display uppercase text-[#111218]">
                ✦ {currentItem.concept.name}
              </span>
            )}
          </div>

          {currentItem.source_video_title && (
            <span className="text-[10px] text-[#636573] font-mono truncate max-w-[200px]">
              {currentItem.source_video_title}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-base sm:text-xl font-extrabold text-[#111218] font-display leading-snug">
            {currentItem.question_text}
          </h2>
        </div>

        {/* MULTIPLE CHOICE */}
        {currentItem.source_type === 'quiz' && parsedOptions.length > 0 && (
          <div className="space-y-2.5">
            {parsedOptions.map((opt, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const isSelected = selectedOption === opt || selectedOption === letter;
              const isCorrectOption =
                currentItem.correct_answer === opt ||
                currentItem.correct_answer === letter;

              let optionStyle = 'bg-[#F5F3EC] border-[#111218] hover:bg-[#EAE6DB]';
              if (isAnswerSubmitted) {
                if (isCorrectOption) {
                  optionStyle = 'bg-[#DDF6BD] border-[#111218] ring-2 ring-[#111218] text-emerald-950 font-bold';
                } else if (isSelected && !isCorrectOption) {
                  optionStyle = 'bg-[#FFD1C7] border-red-950 text-red-950';
                } else {
                  optionStyle = 'bg-[#F5F3EC] border-[#111218]/30 opacity-50';
                }
              } else if (isSelected) {
                optionStyle = 'bg-[#B8FF3D] border-[#111218] shadow-neo-sm ring-2 ring-[#111218]';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isAnswerSubmitted}
                  onClick={() => setSelectedOption(opt)}
                  className={`w-full p-4 rounded-2xl border-2 text-left flex items-center gap-3 transition-all ${optionStyle}`}
                >
                  <span className="w-7 h-7 rounded-xl bg-[#111218] text-white flex items-center justify-center text-xs font-mono font-bold flex-shrink-0">
                    {letter}
                  </span>
                  <span className="text-xs sm:text-sm font-medium leading-relaxed">
                    {opt}
                  </span>
                </button>
              );
            })}

            {!isAnswerSubmitted && (
              <div className="pt-4 flex justify-end">
                <button
                  disabled={!selectedOption}
                  onClick={() => {
                    if (!selectedOption) return;
                    const letterIndex = parsedOptions.indexOf(selectedOption);
                    const letter = String.fromCharCode(65 + letterIndex);
                    const isCorrect =
                      selectedOption === currentItem.correct_answer ||
                      letter === currentItem.correct_answer;
                    onSubmitAnswer(selectedOption, isCorrect);
                  }}
                  className="neo-btn-primary px-8 py-3 text-xs font-bold font-display uppercase disabled:opacity-40"
                >
                  Submit Answer
                </button>
              </div>
            )}
          </div>
        )}

        {/* FLASHCARD / RECALL */}
        {(currentItem.source_type === 'flashcard' || currentItem.source_type === 'concept_recall') && (
          <div className="space-y-4">
            {!isAnswerRevealed ? (
              <div className="p-8 bg-[#F5F3EC] border-2 border-dashed border-[#111218] rounded-2xl text-center space-y-4">
                <p className="text-xs text-[#636573] font-medium">
                  Try to recall the definition and mechanics in your head before revealing.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAnswerRevealed(true)}
                  className="neo-btn-lime px-6 py-2.5 text-xs font-bold font-display uppercase"
                >
                  Reveal Answer & Key Explanation
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="p-5 bg-[#E9DFFF] border-2 border-[#111218] rounded-2xl shadow-neo-sm space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase text-[#111218]">
                    ✦ Key Explanation / Flashcard Back
                  </span>
                  <p className="text-xs sm:text-sm text-[#111218] font-medium leading-relaxed">
                    {currentItem.correct_answer}
                  </p>
                </div>

                {!isAnswerSubmitted && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase text-[#636573]">
                      How well did you remember this?
                    </span>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => onSubmitAnswer('Forgot', false)}
                        className="p-3 bg-[#FFD1C7] border-2 border-[#111218] rounded-xl text-xs font-bold font-display uppercase hover:shadow-neo-sm"
                      >
                        ✕ Forgot (1)
                      </button>
                      <button
                        onClick={() => onSubmitAnswer('Hard', true)}
                        className="p-3 bg-[#FFE353] border-2 border-[#111218] rounded-xl text-xs font-bold font-display uppercase hover:shadow-neo-sm"
                      >
                        ⚠️ Hard (3)
                      </button>
                      <button
                        onClick={() => onSubmitAnswer('Got It', true)}
                        className="p-3 bg-[#B8FF3D] border-2 border-[#111218] rounded-xl text-xs font-bold font-display uppercase hover:shadow-neo-sm"
                      >
                        ✓ Got It! (5)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* FEEDBACK & SOURCE ATTRIBUTION PANEL */}
        {isAnswerSubmitted && (
          <div className="pt-4 border-t-2 border-[#111218] space-y-4 animate-in slide-in-from-bottom duration-200">
            <div
              className={`p-4 rounded-2xl border-2 flex items-start gap-3 ${
                currentItem.is_correct
                  ? 'bg-[#DDF6BD] border-[#111218]'
                  : 'bg-[#FFD1C7] border-[#111218]'
              }`}
            >
              {currentItem.is_correct ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-900 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-950 flex-shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 text-xs">
                <h4 className="font-extrabold font-display uppercase text-[#111218]">
                  {currentItem.is_correct ? '✓ Correct!' : '✕ Not quite.'}
                </h4>
                {currentItem.explanation && (
                  <p className="text-[#21232C] font-medium leading-relaxed">
                    {currentItem.explanation}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              {currentItem.source_video_title ? (
                <div className="text-xs text-[#636573]">
                  <span>Source: </span>
                  <span className="font-bold text-[#111218]">
                    {currentItem.source_video_title}
                  </span>
                  {currentItem.source_start_seconds != null && (
                    <span className="ml-1 text-[10px] font-mono text-[#636573]">
                      ({formatTime(currentItem.source_start_seconds)})
                    </span>
                  )}
                </div>
              ) : (
                <div />
              )}

              <button
                onClick={onNextItem}
                className="neo-btn-primary px-8 py-3 text-xs font-bold font-display uppercase inline-flex items-center justify-center gap-2"
              >
                <span>{currentIndex + 1 < session.total_items ? 'Next Item →' : 'View Results →'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RevisionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') || 'smart_mix';

  const [mode, setMode] = useState<string>(initialMode);
  const [itemCount, setItemCount] = useState<number>(10);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [session, setSession] = useState<RevisionSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  useEffect(() => {
    const checkActive = async () => {
      try {
        const res = await fetch('/api/revision/active');
        if (res.ok) {
          const data = await res.json();
          if (data.session) {
            setSession(data.session);
            const firstUnanswered = data.session.items.findIndex(
              (it: RevisionItem) => it.is_correct === null
            );
            setCurrentIndex(firstUnanswered !== -1 ? firstUnanswered : 0);
          }
        }
      } catch (e) {
        console.error('Failed to check active revision session:', e);
      }
    };
    checkActive();
  }, []);

  const handleStartSession = async (chosenMode = mode, chosenCount = itemCount) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/revision/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: chosenMode,
          itemCount: chosenCount,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        setCurrentIndex(0);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to start revision session');
      }
    } catch (e) {
      console.error('Error starting session:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAnswer = async (answer: string, isCorrect: boolean) => {
    if (!session) return;
    const currentItem = session.items[currentIndex];
    if (!currentItem) return;

    try {
      const res = await fetch('/api/revision/submit-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          itemId: currentItem.id,
          userAnswer: answer,
          isCorrect,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedItems = [...session.items];
        updatedItems[currentIndex] = {
          ...updatedItems[currentIndex],
          user_answer: answer,
          is_correct: isCorrect,
        };

        setSession({
          ...session,
          completed_items: data.session.completed_items,
          correct_items: data.session.correct_items,
          session_score: data.session.session_score,
          status: data.session.status,
          items: updatedItems,
        });
      }
    } catch (e) {
      console.error('Error submitting revision answer:', e);
    }
  };

  const handleNextItem = () => {
    if (!session) return;
    if (currentIndex + 1 < session.items.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setSession({
        ...session,
        status: 'completed',
      });
    }
  };

  const handleEndSession = async () => {
    if (session) {
      await fetch('/api/revision/end-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, status: 'abandoned' }),
      });
    }
    setSession(null);
    setCurrentIndex(0);
  };

  if (!session || session.status === 'abandoned') {
    return (
      <RevisionSetupView
        mode={mode}
        setMode={setMode}
        itemCount={itemCount}
        setItemCount={setItemCount}
        isLoading={isLoading}
        onStart={() => handleStartSession()}
      />
    );
  }

  if (session.status === 'completed') {
    return (
      <RevisionCompletionView
        session={session}
        onRestart={() => handleStartSession(mode, itemCount)}
      />
    );
  }

  return (
    <RevisionActiveItemView
      session={session}
      currentIndex={currentIndex}
      onEndSession={handleEndSession}
      onSubmitAnswer={handleSubmitAnswer}
      onNextItem={handleNextItem}
    />
  );
}

export default function RevisionPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto py-20 text-center space-y-3">
          <RotateCw className="w-8 h-8 animate-spin text-[#111218] mx-auto" />
          <p className="text-xs font-bold font-display uppercase text-[#111218]">
            Loading Revision Session...
          </p>
        </div>
      }
    >
      <RevisionPageContent />
    </Suspense>
  );
}
