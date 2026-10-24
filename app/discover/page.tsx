'use client';

import React, { useState, useEffect, useMemo } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ArrowRight,
  PlaySquare,
  BookOpen,
  Layers,
  Eye,
  Bot,
  Loader2,
  Clock,
  Compass,
  Zap,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  MessageSquare,
  Search,
  Play,
  Flame,
  ArrowUpRight,
  Check,
  History,
  X,
  SlidersHorizontal,
  RotateCcw,
  Hammer,
  GraduationCap,
} from 'lucide-react';
import {
  CURATED_LESSONS,
  TOPIC_CATEGORIES,
  QUICK_PRACTICE_DECKS,
  CuratedLesson,
} from '@/lib/data/curatedLessons';
import { formatTime } from '@/lib/utils';

export interface DBVideo {
  id: string;
  youtube_video_id: string;
  title: string;
  channel: string;
  duration_seconds: number;
  thumbnail_url?: string;
  status: string;
  segments: {
    id: string;
    order_index: number;
    title: string;
    start_seconds: number;
    end_seconds: number;
  }[];
  flashcards: { id: string; mastered: boolean }[];
  progress: {
    id: string;
    current_segment_index: number;
    completed_segment_ids: string;
    last_watched_at: string;
  }[];
}

// Alternating card styles inspired by Positivus / Editorial Neo-Brutalism
const CARD_COLOR_THEMES = [
  {
    bg: 'bg-[#FFFDF7]',
    border: 'border-2 border-[#111218]',
    text: 'text-[#111218]',
    subtext: 'text-[#636573]',
    badgeBg: 'bg-[#B8FF3D]',
    badgeText: 'text-[#111218]',
    arrowBg: 'bg-[#111218]',
    arrowColor: 'text-[#B8FF3D]',
  },
  {
    bg: 'bg-[#B8FF3D]',
    border: 'border-2 border-[#111218]',
    text: 'text-[#111218]',
    subtext: 'text-[#21232C]',
    badgeBg: 'bg-[#FFFDF7]',
    badgeText: 'text-[#111218]',
    arrowBg: 'bg-[#111218]',
    arrowColor: 'text-white',
  },
  {
    bg: 'bg-[#111218]',
    border: 'border-2 border-[#111218]',
    text: 'text-white',
    subtext: 'text-slate-300',
    badgeBg: 'bg-[#B8FF3D]',
    badgeText: 'text-[#111218]',
    arrowBg: 'bg-[#B8FF3D]',
    arrowColor: 'text-[#111218]',
  },
  {
    bg: 'bg-[#DCEEFF]',
    border: 'border-2 border-[#111218]',
    text: 'text-[#111218]',
    subtext: 'text-[#21232C]',
    badgeBg: 'bg-[#FFFDF7]',
    badgeText: 'text-[#111218]',
    arrowBg: 'bg-[#111218]',
    arrowColor: 'text-[#DCEEFF]',
  },
  {
    bg: 'bg-[#E9DFFF]',
    border: 'border-2 border-[#111218]',
    text: 'text-[#111218]',
    subtext: 'text-[#21232C]',
    badgeBg: 'bg-[#B8FF3D]',
    badgeText: 'text-[#111218]',
    arrowBg: 'bg-[#111218]',
    arrowColor: 'text-[#E9DFFF]',
  },
  {
    bg: 'bg-[#DDF6BD]',
    border: 'border-2 border-[#111218]',
    text: 'text-[#111218]',
    subtext: 'text-[#21232C]',
    badgeBg: 'bg-[#111218]',
    badgeText: 'text-white',
    arrowBg: 'bg-[#111218]',
    arrowColor: 'text-[#B8FF3D]',
  },
];

// Helper to format relative time
function formatRelativeTime(dateStr: string) {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 2) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

// Helper to derive video progress
function getVideoProgressInfo(v: DBVideo) {
  const prog = v.progress?.[0];
  const total = v.segments?.length || 1;

  if (!prog) {
    return {
      percent: 0,
      completedCount: 0,
      totalSegments: total,
      currentChapterTitle: v.segments?.[0]?.title || 'Part 1',
      currentChapterIndex: 1,
      isCompleted: false,
      lastWatchedAt: '',
    };
  }

  let completed: string[] = [];
  try {
    completed = JSON.parse(prog.completed_segment_ids || '[]');
  } catch {
    completed = [];
  }

  const completedCount = completed.length;
  const isCompleted = total > 0 && completedCount >= total;
  const percent = isCompleted
    ? 100
    : total > 0
    ? Math.round((completedCount / total) * 100)
    : 0;

  const curIdx = prog.current_segment_index || 0;
  const currentChapterTitle = v.segments?.[curIdx]?.title || `Part ${curIdx + 1}`;
  const currentChapterIndex = curIdx + 1;

  return {
    percent,
    completedCount,
    totalSegments: total,
    currentChapterTitle,
    currentChapterIndex,
    isCompleted,
    lastWatchedAt: prog.last_watched_at || '',
  };
}

export default function DiscoverHomePage() {
  const router = useRouter();
  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All Topics');
  const [dbVideos, setDbVideos] = useState<DBVideo[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);

  // Full History Modal View State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyFilterTab, setHistoryFilterTab] = useState<
    'all' | 'in_progress' | 'completed' | 'recent'
  >('all');

  // Fetch real database videos for current user
  const fetchDbVideos = async () => {
    try {
      const res = await fetch('/api/videos');
      if (res.ok) {
        const data = await res.json();
        setDbVideos(data.videos || []);
      }
    } catch (e) {
      console.warn('Could not fetch DB videos:', e);
    } finally {
      setLoadingDb(false);
    }
  };

  useEffect(() => {
    fetchDbVideos();
  }, []);

  // ─────────────────────────────────────────────────────────────
  // DERIVED DATA: User Learning History & In-Progress Content
  // ─────────────────────────────────────────────────────────────

  // 1. All videos with progress records for the current user, sorted newest activity first
  const userHistoryVideos = useMemo(() => {
    return dbVideos
      .filter((v) => v.progress && v.progress.length > 0)
      .sort((a, b) => {
        const timeA = new Date(a.progress[0]?.last_watched_at || 0).getTime();
        const timeB = new Date(b.progress[0]?.last_watched_at || 0).getTime();
        return timeB - timeA;
      });
  }, [dbVideos]);

  // 2. Videos with unfinished progress (Continue Learning)
  const inProgressVideos = useMemo(() => {
    return userHistoryVideos.filter((v) => {
      const info = getVideoProgressInfo(v);
      return !info.isCompleted;
    });
  }, [userHistoryVideos]);

  // Filtered History for "View all History" modal
  const modalFilteredHistory = useMemo(() => {
    return userHistoryVideos.filter((v) => {
      const info = getVideoProgressInfo(v);

      if (historyFilterTab === 'in_progress' && info.isCompleted) return false;
      if (historyFilterTab === 'completed' && !info.isCompleted) return false;

      if (historySearchQuery.trim()) {
        const q = historySearchQuery.toLowerCase().trim();
        const matchTitle = v.title.toLowerCase().includes(q);
        const matchChannel = v.channel.toLowerCase().includes(q);
        if (!matchTitle && !matchChannel) return false;
      }

      return true;
    });
  }, [userHistoryVideos, historyFilterTab, historySearchQuery]);

  // Handle Main Input Submission (YouTube URL or Topic Search)
  const handleStartLearning = async (query: string) => {
    if (!query.trim()) return;
    setIsProcessing(true);
    setErrorMessage(null);

    const trimmed = query.trim();

    // 1. If it looks like a YouTube link
    if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
      try {
        const res = await fetch('/api/videos/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ youtubeUrl: trimmed }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to generate lesson');

        if (data.video?.id) {
          router.push(`/video/${data.video.id}`);
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Could not process YouTube URL');
        setIsProcessing(false);
      }
      return;
    }

    // 2. If it's a topic query: match curated lessons first
    const matchedLesson = CURATED_LESSONS.find(
      (l) =>
        l.title.toLowerCase().includes(trimmed.toLowerCase()) ||
        l.category.toLowerCase().includes(trimmed.toLowerCase()) ||
        l.categoryTag.toLowerCase().includes(trimmed.toLowerCase())
    );

    if (matchedLesson) {
      try {
        const res = await fetch('/api/videos/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ youtubeUrl: matchedLesson.url }),
        });
        const data = await res.json();
        if (data.video?.id) {
          router.push(`/video/${data.video.id}`);
          return;
        }
      } catch (err: any) {
        console.warn('Direct topic ingest fallback:', err);
      }
    }

    // 3. Fallback: Trigger AI Assistant for the requested topic
    window.dispatchEvent(
      new CustomEvent('open-learnly-ai', {
        detail: {
          prompt: `Create a structured learning breakdown and recommend videos for topic: "${trimmed}"`,
        },
      })
    );
    window.dispatchEvent(new CustomEvent('open-chat-drawer'));
    setIsProcessing(false);
  };

  // Launch a curated lesson directly
  const handleLaunchCuratedLesson = async (lesson: CuratedLesson) => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/videos/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl: lesson.url }),
      });
      const data = await res.json();
      if (data.video?.id) {
        router.push(`/video/${data.video.id}`);
      } else {
        setErrorMessage(data.error || 'Failed to initialize this curated lesson.');
      }
    } catch (e: any) {
      console.warn('Could not launch curated lesson:', e);
      setErrorMessage(e.message || 'Could not connect to video ingestion service. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Open AI Assistant with a specific prompt chip
  const handleTriggerAI = (promptText: string) => {
    window.dispatchEvent(
      new CustomEvent('open-learnly-ai', {
        detail: { prompt: promptText },
      })
    );
    window.dispatchEvent(new CustomEvent('open-chat-drawer'));
  };

  // Filter lessons by active category
  const filteredLessons =
    selectedCategory === 'All Topics'
      ? CURATED_LESSONS
      : CURATED_LESSONS.filter((l) => l.category === selectedCategory);

  const totalFlashcardCount = dbVideos.reduce(
    (acc, v) => acc + (v.flashcards?.length || 0),
    0
  );

  return (
    <div className="space-y-12 pb-24 max-w-5xl mx-auto">
      {/* ─────────────────────────────────────────────────────────────
          1. HERO & DISCOVER SECTION: FIND SOMETHING TO LEARN
      ───────────────────────────────────────────────────────────── */}
      <section className="relative pt-4 pb-2">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Left Text & Input */}
          <div className="flex-1 space-y-6 text-left">
            {/* Small Category Highlight */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#B8FF3D] border-2 border-[#111218] rounded-md shadow-neo-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#111218] fill-[#111218]" />
              <span className="text-xs font-bold font-display uppercase tracking-wider text-[#111218]">
                AI-Powered Active Learning
              </span>
            </div>

            {/* Bold Editorial Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#111218] font-display tracking-tight leading-[1.08] uppercase">
              {inProgressVideos.length > 0 ? (
                <>
                  Pick up <span className="bg-[#B8FF3D] px-2 py-0.5 rounded-lg border-2 border-[#111218]">where you</span> left off.
                </>
              ) : (
                <>
                  What do you <br className="hidden sm:inline" />
                  <span className="bg-[#B8FF3D] px-2 py-0.5 rounded-lg border-2 border-[#111218]">want to learn</span> <br className="hidden sm:inline" />
                  today?
                </>
              )}
            </h1>

            <p className="text-sm sm:text-base text-[#636573] font-medium leading-relaxed max-w-xl">
              Turn any YouTube lesson into an interactive active-study session with checkpoint quizzes, physical-style recall cards, and distraction-free deep focus.
            </p>

            {/* Central Learning Input Component */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleStartLearning(inputQuery);
              }}
              className="w-full pt-1"
            >
              <div className="relative flex items-center rounded-2xl bg-[#FFFDF7] border-2 border-[#111218] shadow-neo-md focus-within:shadow-neo-lg focus-within:-translate-y-0.5 transition-all p-1.5 group">
                <div className="pl-3.5 pr-2 text-[#111218] flex items-center">
                  <Play className="w-4 h-4 text-[#111218] fill-[#B8FF3D]" />
                </div>

                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="Paste a YouTube URL or type what you want to learn..."
                  disabled={isProcessing}
                  className="flex-1 bg-transparent border-0 px-2 py-2.5 text-xs sm:text-sm font-medium text-[#111218] placeholder-slate-400 focus:outline-none focus:ring-0 disabled:opacity-50"
                />

                <button
                  type="submit"
                  disabled={isProcessing || !inputQuery.trim()}
                  className={`px-5 py-2.5 text-xs sm:text-sm font-black font-display uppercase tracking-wider rounded-xl border-2 border-[#111218] transition-all flex items-center gap-1.5 flex-shrink-0 ${
                    !inputQuery.trim() || isProcessing
                      ? 'bg-slate-200 text-slate-400 opacity-50 cursor-not-allowed'
                      : 'bg-[#B8FF3D] hover:bg-[#C6FF57] text-[#111218] shadow-neo hover:-translate-y-0.5 animate-pulse cursor-pointer'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#111218]" />
                      <span>Segmenting...</span>
                    </>
                  ) : (
                    <>
                      <span>Start</span>
                      <ArrowRight className="w-4 h-4 text-[#111218]" />
                    </>
                  )}
                </button>
              </div>

              {errorMessage && (
                <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-[#FFD1C7] border-2 border-[#111218] shadow-neo-sm text-xs font-bold text-[#111218] inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF6B4A]" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </form>
          </div>

          {/* Right Playful Geometric Illustration Inspired by Positivus */}
          <div className="hidden lg:flex w-72 h-72 rounded-3xl bg-[#FFFDF7] border-2 border-[#111218] shadow-neo-lg p-6 flex-col justify-between relative overflow-hidden flex-shrink-0">
            {/* Background geometric accents */}
            <div className="absolute top-2 right-2 w-24 h-24 rounded-full bg-[#B8FF3D] border-2 border-[#111218] -z-0 opacity-80" />
            <div className="absolute bottom-4 left-4 w-16 h-16 rounded-xl bg-[#E9DFFF] border-2 border-[#111218] rotate-12 -z-0 opacity-80" />

            <div className="relative z-10 space-y-1">
              <span className="badge-black px-2 py-0.5 text-[10px] uppercase tracking-wider">
                Active Recall Mode
              </span>
              <h3 className="text-xl font-extrabold font-display text-[#111218] uppercase leading-tight pt-2">
                Learn.<br />Verify.<br />Remember.
              </h3>
            </div>

            <div className="relative z-10 flex items-center justify-between pt-4 border-t-2 border-[#111218]">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#B8FF3D] border border-[#111218]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#DCEEFF] border border-[#111218]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#E9DFFF] border border-[#111218]" />
              </div>
              <div className="circle-arrow-btn">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          AI REVISION BANNER CTA
      ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-6 sm:p-7 shadow-neo flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="badge-lime px-2.5 py-0.5 text-xs font-bold uppercase font-display">
              Adaptive Recall Engine
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black font-display uppercase tracking-tight text-[#111218]">
            Revise What You Learned
          </h3>
          <p className="text-xs sm:text-sm text-[#636573] font-medium max-w-xl">
            Let Saras automatically curate candidate questions from your Knowledge Map, weak areas, and recent mistakes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
          <NextLink
            href="/exam"
            className="neo-btn-primary px-5 py-3 text-xs sm:text-sm font-bold font-display uppercase flex items-center justify-center gap-2 shadow-neo-sm hover:shadow-neo"
          >
            <GraduationCap className="w-4 h-4 text-[#B8FF3D]" />
            <span>Exam Mode →</span>
          </NextLink>

          <NextLink
            href="/revision"
            className="neo-btn-lime px-5 py-3 text-xs sm:text-sm font-bold font-display uppercase flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4 text-[#111218]" />
            <span>Revise What I Learned</span>
          </NextLink>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. FOUR EDITORIAL ENTRY TILES (Watch, Topic, Recall, Build)
      ───────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Entry 1: Watch a Video (Lime Accent) */}
        <button
          onClick={() => {
            const inputEl = document.querySelector('input') as HTMLInputElement;
            inputEl?.focus();
          }}
          className="bg-[#B8FF3D] border-2 border-[#111218] rounded-2xl p-5 text-left flex flex-col justify-between space-y-4 shadow-neo hover:-translate-y-1 hover:shadow-neo-lg transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="badge-black px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              Step 01
            </span>
            <div className="circle-arrow-btn">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[#111218] font-display uppercase tracking-tight">
              Watch a Video
            </h3>
            <p className="text-xs text-[#21232C] font-medium mt-1 leading-snug">
              Paste any YouTube URL to break it into topic chapters with checkpoint quizzes.
            </p>
          </div>
        </button>

        {/* Entry 2: Learn a Topic (Lavender Accent) */}
        <button
          onClick={() => handleTriggerAI('Help me understand deep learning foundations and suggest where to start.')}
          className="bg-[#E9DFFF] border-2 border-[#111218] rounded-2xl p-5 text-left flex flex-col justify-between space-y-4 shadow-neo hover:-translate-y-1 hover:shadow-neo-lg transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="badge-black px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              Step 02
            </span>
            <div className="circle-arrow-btn">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[#111218] font-display uppercase tracking-tight">
              Explore a Topic
            </h3>
            <p className="text-xs text-[#21232C] font-medium mt-1 leading-snug">
              Let AI generate structured curriculum pathways and recommended video sets.
            </p>
          </div>
        </button>

        {/* Entry 3: Practice Recall (Sky Blue Accent) */}
        <NextLink
          href="/flashcards"
          className="bg-[#DCEEFF] border-2 border-[#111218] rounded-2xl p-5 text-left flex flex-col justify-between space-y-4 shadow-neo hover:-translate-y-1 hover:shadow-neo-lg transition-all group block"
        >
          <div className="flex items-center justify-between">
            <span className="badge-black px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              Step 03
            </span>
            <div className="circle-arrow-btn">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[#111218] font-display uppercase tracking-tight">
              Practice Recall
            </h3>
            <p className="text-xs text-[#21232C] font-medium mt-1 leading-snug">
              Strengthen memory retention with physical-style flashcard drills & questions.
            </p>
          </div>
        </NextLink>

        {/* Entry 4: Build Projects (Mint / Sage Accent) */}
        <button
          onClick={() => {
            const firstVideo = userHistoryVideos[0] || dbVideos[0];
            if (firstVideo) {
              router.push(`/video/${firstVideo.id}`);
            } else {
              const inputEl = document.querySelector('input') as HTMLInputElement;
              inputEl?.focus();
            }
          }}
          className="bg-[#DDF6BD] border-2 border-[#111218] rounded-2xl p-5 text-left flex flex-col justify-between space-y-4 shadow-neo hover:-translate-y-1 hover:shadow-neo-lg transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="badge-black px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              Step 04
            </span>
            <div className="circle-arrow-btn">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[#111218] font-display uppercase tracking-tight">
              Build Projects
            </h3>
            <p className="text-xs text-[#21232C] font-medium mt-1 leading-snug">
              Turn what you learned into structured, actionable real-world project roadmaps.
            </p>
          </div>
        </button>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. CONTINUE LEARNING (Videos with unfinished progress)
      ───────────────────────────────────────────────────────────── */}
      {inProgressVideos.length > 0 && (
        <section className="space-y-4 pt-1">
          <div className="flex items-center justify-between pb-2 border-b-2 border-[#111218]">
            <div className="flex items-center gap-2">
              <span className="badge-lime px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                Active Study
              </span>
              <h2 className="text-lg font-extrabold text-[#111218] uppercase tracking-wider font-display">
                Continue Learning
              </h2>
            </div>
            <span className="text-xs font-bold text-[#636573] font-mono">
              {inProgressVideos.length} unfinished {inProgressVideos.length === 1 ? 'lesson' : 'lessons'}
            </span>
          </div>

          <div className="space-y-3.5">
            {inProgressVideos.map((video) => {
              const info = getVideoProgressInfo(video);

              return (
                <div
                  key={video.id}
                  className="bg-[#FFFDF7] border-2 border-[#111218] rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-neo-md hover:-translate-y-0.5 hover:shadow-neo-lg transition-all group"
                >
                  <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
                    <div className="relative aspect-video w-32 sm:w-44 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 border-2 border-[#111218] shadow-neo-sm">
                      <img
                        src={
                          video.thumbnail_url ||
                          `https://img.youtube.com/vi/${video.youtube_video_id}/hqdefault.jpg`
                        }
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-[#B8FF3D] border-2 border-[#111218] flex items-center justify-center text-[#111218]">
                          <Play className="w-3.5 h-3.5 fill-[#111218] ml-0.5" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold font-display uppercase tracking-wider text-[#636573]">
                          {video.channel}
                        </span>
                        {info.lastWatchedAt && (
                          <span className="text-[10px] text-[#636573] font-mono">
                            · {formatRelativeTime(info.lastWatchedAt)}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm sm:text-base font-extrabold text-[#111218] truncate font-display">
                        {video.title}
                      </h3>

                      <p className="text-xs text-[#636573] truncate font-medium">
                        Active Chapter: <span className="text-[#111218] font-bold">{info.currentChapterTitle}</span>
                        <span className="ml-1 text-[11px] font-mono">
                          (Part {info.currentChapterIndex} of {info.totalSegments})
                        </span>
                      </p>

                      {/* Real Progress Bar */}
                      <div className="w-full max-w-sm flex items-center gap-2.5 pt-1">
                        <div className="flex-1 h-2 rounded-full bg-[#EAE6DB] border border-[#111218] overflow-hidden">
                          <div
                            className="h-full bg-[#B8FF3D] transition-all duration-300"
                            style={{ width: `${Math.max(12, info.percent)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono font-bold text-[#111218] flex-shrink-0">
                          {info.percent}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <NextLink
                    href={`/video/${video.id}`}
                    className="neo-btn-primary w-full sm:w-auto px-5 py-2.5 text-xs font-bold flex items-center justify-center gap-2 flex-shrink-0"
                  >
                    <span>Continue Lesson</span>
                    <ArrowRight className="w-4 h-4 text-[#B8FF3D]" />
                  </NextLink>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. YOUR LEARNING HISTORY (All videos previously watched)
      ───────────────────────────────────────────────────────────── */}
      <section className="space-y-4 pt-1">
        <div className="flex items-center justify-between pb-2 border-b-2 border-[#111218]">
          <div className="flex items-center gap-2.5">
            <span className="badge-black px-2.5 py-0.5 text-xs font-bold uppercase font-display flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              Personal Library
            </span>
            <h2 className="text-xl font-extrabold text-[#111218] font-display uppercase tracking-tight">
              Your Learning History
            </h2>
          </div>

          {userHistoryVideos.length > 0 && (
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="text-xs font-bold text-[#111218] hover:underline flex items-center gap-1 font-display"
            >
              <span>View all ({userHistoryVideos.length})</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#111218]" />
            </button>
          )}
        </div>

        {/* Dynamic History Cards or Empty State */}
        {userHistoryVideos.length === 0 ? (
          <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-2xl p-8 text-center space-y-3 shadow-neo-sm">
            <div className="w-10 h-10 rounded-xl bg-[#B8FF3D] border-2 border-[#111218] flex items-center justify-center text-[#111218] mx-auto shadow-neo-sm">
              <History className="w-5 h-5" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-sm font-extrabold text-[#111218] uppercase font-display">
                You haven&apos;t watched a lesson yet
              </h3>
              <p className="text-xs text-[#636573] font-medium leading-relaxed">
                Start your first interactive lesson below and it will automatically be recorded in your personal learning history.
              </p>
            </div>
            <a
              href="#explore-section"
              className="neo-btn-lime inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold"
            >
              <span>Explore Lessons</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {userHistoryVideos.slice(0, 6).map((video) => {
              const info = getVideoProgressInfo(video);

              return (
                <div
                  key={video.id}
                  className="bg-[#FFFDF7] border-2 border-[#111218] rounded-2xl overflow-hidden flex flex-col justify-between shadow-neo hover:-translate-y-1 hover:shadow-neo-lg transition-all group"
                >
                  {/* Thumbnail Banner */}
                  <div className="relative aspect-video w-full bg-slate-900 border-b-2 border-[#111218] overflow-hidden">
                    <img
                      src={
                        video.thumbnail_url ||
                        `https://img.youtube.com/vi/${video.youtube_video_id}/hqdefault.jpg`
                      }
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Completion / Status Badge */}
                    <div className="absolute top-2 left-2">
                      {info.isCompleted ? (
                        <span className="badge-lime px-2 py-0.5 text-[9px] font-extrabold uppercase flex items-center gap-1">
                          <Check className="w-3 h-3" /> Completed
                        </span>
                      ) : (
                        <span className="bg-[#111218] text-white border border-[#111218] px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider font-mono">
                          Chapter {info.currentChapterIndex}/{info.totalSegments}
                        </span>
                      )}
                    </div>

                    {/* Duration / Last Watched */}
                    {info.lastWatchedAt && (
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-[#111218] text-[10px] font-mono font-bold text-white border border-[#111218]">
                        {formatRelativeTime(info.lastWatchedAt)}
                      </div>
                    )}
                  </div>

                  {/* Body Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold font-display uppercase tracking-wider text-[#636573]">
                        {video.channel}
                      </span>
                      <h4 className="text-xs sm:text-sm font-extrabold text-[#111218] line-clamp-2 leading-snug font-display">
                        {video.title}
                      </h4>
                    </div>

                    {/* Progress Bar & Status */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                        <span className="text-[#636573]">Progress</span>
                        <span className={info.isCompleted ? 'text-[#8ECC24]' : 'text-[#111218]'}>
                          {info.percent}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#EAE6DB] border border-[#111218] overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            info.isCompleted ? 'bg-[#8ECC24]' : 'bg-[#B8FF3D]'
                          }`}
                          style={{ width: `${Math.max(8, info.percent)}%` }}
                        />
                      </div>
                    </div>

                    {/* Card Action Link */}
                    <div className="pt-2 border-t-2 border-[#111218]/10 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#636573]">
                        {info.isCompleted ? 'Finished course' : info.currentChapterTitle}
                      </span>

                      <NextLink
                        href={`/video/${video.id}`}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold font-display transition-all ${
                          info.isCompleted
                            ? 'neo-btn-outline'
                            : 'neo-btn-lime'
                        }`}
                      >
                        <span>{info.isCompleted ? 'Review →' : 'Continue →'}</span>
                      </NextLink>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. EXPLORE LESSONS: Alternating Positivus-Style Cards
      ───────────────────────────────────────────────────────────── */}
      <section id="explore-section" className="space-y-5 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b-2 border-[#111218]">
          <div className="flex items-center gap-2.5">
            <span className="badge-lime px-3 py-1 text-xs font-extrabold uppercase font-display">
              Curated Catalog
            </span>
            <h2 className="text-xl font-extrabold text-[#111218] font-display uppercase tracking-tight">
              Find Something to Learn
            </h2>
          </div>
          <span className="text-xs font-bold text-[#636573] font-mono">
            {filteredLessons.length} recommended lessons
          </span>
        </div>

        {/* Category Navigation Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {TOPIC_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-display font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-[#B8FF3D] text-[#111218] border-2 border-[#111218] shadow-neo-sm'
                    : 'bg-[#FFFDF7] text-[#111218] border-2 border-[#111218]/30 hover:border-[#111218]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Alternating Editorial Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredLessons.map((lesson, idx) => {
            const theme = CARD_COLOR_THEMES[idx % CARD_COLOR_THEMES.length];
            return (
              <div
                key={lesson.id}
                onClick={() => handleLaunchCuratedLesson(lesson)}
                className={`${theme.bg} ${theme.border} rounded-2xl overflow-hidden cursor-pointer group flex flex-col justify-between shadow-neo hover:-translate-y-1 hover:shadow-neo-lg transition-all relative`}
              >
                {/* 16:9 Thumbnail Banner with Black Outline */}
                <div className="relative aspect-video w-full bg-slate-900 border-b-2 border-[#111218] overflow-hidden">
                  <img
                    src={lesson.thumbnail}
                    alt={lesson.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Duration Badge */}
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-[#111218] text-[10px] font-mono font-bold text-white border border-[#111218]">
                    {lesson.duration}
                  </div>

                  {/* Category Badge */}
                  <div
                    className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold font-display uppercase tracking-wider border border-[#111218] ${theme.badgeBg} ${theme.badgeText}`}
                  >
                    ✦ {lesson.categoryTag}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
                  <div className="space-y-1">
                    <span className={`text-[10px] font-bold font-display uppercase tracking-wider ${theme.subtext}`}>
                      {lesson.creator}
                    </span>
                    <h4 className={`text-sm font-extrabold ${theme.text} line-clamp-2 leading-snug font-display`}>
                      {lesson.title}
                    </h4>
                    <p className={`text-xs ${theme.subtext} line-clamp-2 pt-0.5 leading-relaxed font-medium`}>
                      {lesson.summary}
                    </p>
                  </div>

                  <div className="pt-3 border-t-2 border-[#111218]/15 flex items-center justify-between">
                    <span className={`text-xs font-bold ${theme.text}`}>{lesson.difficulty}</span>
                    <div className={theme.arrowBg === 'bg-[#111218]' ? 'circle-arrow-btn' : 'circle-arrow-btn-light'}>
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. QUICK PRACTICE DRILLS
      ───────────────────────────────────────────────────────────── */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between pb-2 border-b-2 border-[#111218]">
          <div className="flex items-center gap-2">
            <span className="badge-black px-2.5 py-0.5 text-xs font-bold uppercase font-display">
              Active Recall
            </span>
            <h2 className="text-lg font-extrabold text-[#111218] font-display uppercase">
              Quick Practice Sets
            </h2>
          </div>
          <NextLink
            href="/flashcards"
            className="text-xs font-bold text-[#111218] hover:underline flex items-center gap-1 font-display"
          >
            <span>All Question Banks</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </NextLink>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {QUICK_PRACTICE_DECKS.map((deck) => (
            <div
              key={deck.id}
              className="bg-[#FFFDF7] border-2 border-[#111218] p-4 rounded-2xl flex flex-col justify-between space-y-3.5 shadow-neo hover:-translate-y-1 hover:shadow-neo-lg transition-all group"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{deck.emoji}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#B8FF3D] text-[#111218] border border-[#111218]">
                    {deck.difficulty}
                  </span>
                </div>
                <h4 className="text-xs font-extrabold text-[#111218] font-display group-hover:text-black transition-colors">
                  {deck.topic}
                </h4>
                <p className="text-xs text-[#636573] font-medium">
                  {deck.questionCount} diagnostic questions · ~{deck.estimatedMinutes} min
                </p>
              </div>

              <NextLink
                href="/flashcards"
                className="neo-btn-outline w-full py-2 px-3 text-xs font-bold text-center flex items-center justify-center gap-1.5"
              >
                <span>Start Practice</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#111218]" />
              </NextLink>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. RECALL & STRICT FOCUS PROMO TILES
      ───────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
        {/* Flashcards Recall Tile */}
        <div className="bg-[#E9DFFF] border-2 border-[#111218] p-6 rounded-2xl flex flex-col justify-between space-y-4 shadow-neo">
          <div className="space-y-2">
            <span className="badge-black px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              Flashcards Studio
            </span>
            <h3 className="text-lg font-extrabold text-[#111218] font-display uppercase leading-tight">
              Ready for an active recall session?
            </h3>
            <p className="text-xs text-[#21232C] font-medium leading-relaxed">
              {totalFlashcardCount > 0
                ? `${totalFlashcardCount} flashcards extracted from your lessons ready for spaced repetition review.`
                : '12 interactive flashcards ready for active recall practice.'}
            </p>
          </div>

          <NextLink
            href="/flashcards"
            className="neo-btn-primary px-4 py-2.5 text-xs font-bold w-fit flex items-center gap-2"
          >
            <span>Review Flashcards</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#B8FF3D]" />
          </NextLink>
        </div>

        {/* Strict Focus Tile */}
        <div className="bg-[#B8FF3D] border-2 border-[#111218] p-6 rounded-2xl flex flex-col justify-between space-y-4 shadow-neo">
          <div className="space-y-2">
            <span className="badge-black px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              Deep Work Space
            </span>
            <h3 className="text-lg font-extrabold text-[#111218] font-display uppercase leading-tight">
              Need deep, uninterrupted focus?
            </h3>
            <p className="text-xs text-[#21232C] font-medium leading-relaxed">
              Block cognitive drift with 25-minute Deep Focus intervals and client-side attention monitoring.
            </p>
          </div>

          <NextLink
            href="/focus"
            className="neo-btn-primary px-4 py-2.5 text-xs font-bold w-fit flex items-center gap-2"
          >
            <span>Start Focus Session</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#B8FF3D]" />
          </NextLink>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          8. ASK LEARNLY: Neo-Brutalist Black Panel
      ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#111218] text-white border-2 border-[#111218] p-6 sm:p-8 rounded-3xl space-y-5 shadow-neo-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#B8FF3D] border-2 border-[#111218] flex items-center justify-center text-[#111218]">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white font-display uppercase tracking-tight">
                Ask Saras AI
              </h3>
              <p className="text-xs text-slate-300 font-medium">What topic are you trying to master?</p>
            </div>
          </div>
          <span className="badge-lime px-2.5 py-0.5 text-[10px] font-black uppercase">
            ● Gemma 4 Online
          </span>
        </div>

        {/* Clickable AI Prompt Chips */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {[
            'Explain backpropagation simply',
            'Quiz me on Python fundamentals',
            'Give me an intuitive example of recursion',
            'Help me understand React Server Components',
          ].map((promptText, idx) => (
            <button
              key={idx}
              onClick={() => handleTriggerAI(promptText)}
              className="text-left px-4 py-3 rounded-xl bg-[#21232C] hover:bg-[#B8FF3D] hover:text-[#111218] border-2 border-white/10 hover:border-[#111218] text-xs font-semibold text-slate-200 flex items-center justify-between group transition-all"
            >
              <span>&ldquo;{promptText}&rdquo;</span>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-[#111218] transition-colors flex-shrink-0" />
            </button>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          9. FULL LEARNING HISTORY MODAL OVERLAY ("View all →")
      ───────────────────────────────────────────────────────────── */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111218]/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-3xl w-full bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-6 sm:p-8 shadow-neo-xl space-y-5 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b-2 border-[#111218]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#B8FF3D] border-2 border-[#111218] flex items-center justify-center text-[#111218] shadow-neo-sm">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#111218] font-display uppercase tracking-tight flex items-center gap-2">
                    Your Complete Learning History
                    <span className="badge-lime px-2 py-0.2 text-[10px] font-mono">
                      {userHistoryVideos.length} Lessons
                    </span>
                  </h3>
                  <p className="text-xs text-[#636573] font-medium">
                    All videos and curriculum sessions you have previously started or completed.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1.5 rounded-lg text-[#111218] hover:bg-[#F5F3EC] border border-transparent hover:border-[#111218] transition-colors"
                title="Close history"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Search Field */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-[#111218] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Search your watched lessons..."
                  className="w-full bg-[#F5F3EC] border-2 border-[#111218] rounded-xl pl-9 pr-3.5 py-1.5 text-xs font-medium text-[#111218] placeholder-slate-400 focus:outline-none focus:bg-[#FFFDF7]"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5">
                {[
                  { key: 'all', label: `All (${userHistoryVideos.length})` },
                  { key: 'in_progress', label: `In Progress (${inProgressVideos.length})` },
                  {
                    key: 'completed',
                    label: `Completed (${userHistoryVideos.length - inProgressVideos.length})`,
                  },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setHistoryFilterTab(tab.key as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-display font-bold uppercase transition-all ${
                      historyFilterTab === tab.key
                        ? 'bg-[#B8FF3D] text-[#111218] border-2 border-[#111218] shadow-neo-sm'
                        : 'text-[#111218] hover:bg-[#F5F3EC] border border-transparent'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal History List */}
            <div className="space-y-3 overflow-y-auto pr-1 flex-1 no-scrollbar">
              {modalFilteredHistory.length === 0 ? (
                <div className="py-12 text-center space-y-2 bg-[#F5F3EC] rounded-2xl border-2 border-dashed border-[#111218]/30 p-6">
                  <p className="text-xs font-bold text-[#111218] uppercase">
                    No matching lessons found in your history.
                  </p>
                  <p className="text-xs text-[#636573]">Try a different search keyword or filter.</p>
                </div>
              ) : (
                modalFilteredHistory.map((video) => {
                  const info = getVideoProgressInfo(video);

                  return (
                    <div
                      key={video.id}
                      className="bg-[#FFFDF7] border-2 border-[#111218] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-neo-sm hover:-translate-y-0.5 transition-all"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 w-full sm:w-auto">
                        <div className="relative aspect-video w-24 sm:w-32 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 border border-[#111218]">
                          <img
                            src={
                              video.thumbnail_url ||
                              `https://img.youtube.com/vi/${video.youtube_video_id}/hqdefault.jpg`
                            }
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#636573]">
                              {video.channel}
                            </span>
                            {info.isCompleted ? (
                              <span className="badge-lime px-1.5 py-0.2 text-[8px] font-bold">
                                ✓ Completed
                              </span>
                            ) : (
                              <span className="bg-[#111218] text-white px-1.5 py-0.2 rounded text-[8px] font-mono">
                                Chapter {info.currentChapterIndex}/{info.totalSegments}
                              </span>
                            )}
                          </div>

                          <h4 className="text-xs font-bold text-[#111218] truncate font-display">
                            {video.title}
                          </h4>

                          <div className="text-[10px] text-[#636573] font-mono flex items-center gap-2">
                            <span>{info.percent}% progress</span>
                            {info.lastWatchedAt && (
                              <>
                                <span>·</span>
                                <span>Watched {formatRelativeTime(info.lastWatchedAt)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <NextLink
                        href={`/video/${video.id}`}
                        onClick={() => setIsHistoryModalOpen(false)}
                        className={`w-full sm:w-auto px-4 py-2 text-xs font-bold flex items-center justify-center gap-1.5 flex-shrink-0 ${
                          info.isCompleted ? 'neo-btn-outline' : 'neo-btn-lime'
                        }`}
                      >
                        <span>{info.isCompleted ? 'Review Lesson' : 'Continue Lesson'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </NextLink>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
