'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import NextLink from 'next/link';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sparkles,
  Award,
  ChevronRight,
  BookOpen,
  AlertCircle,
  RotateCw,
  Check,
} from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { QuizModal, QuizQuestionItem } from './QuizModal';
import { StrictModeDetector } from './StrictModeDetector';

export interface SegmentItem {
  id: string;
  order_index: number;
  title: string;
  summary?: string | null;
  start_seconds: number;
  end_seconds: number;
  quiz_questions: QuizQuestionItem[];
}

interface SegmentedPlayerProps {
  videoId: string;
  youtubeVideoId: string;
  title: string;
  channel: string;
  durationSeconds: number;
  segments: SegmentItem[];
  initialSegmentIndex?: number;
  initialCompletedSegmentIds?: string[];
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export function SegmentedPlayer({
  videoId,
  youtubeVideoId,
  title,
  channel,
  durationSeconds,
  segments,
  initialSegmentIndex = 0,
  initialCompletedSegmentIds = [],
}: SegmentedPlayerProps) {
  const [player, setPlayer] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentSegmentIdx, setCurrentSegmentIdx] = useState(initialSegmentIndex);
  const [completedSegmentIds, setCompletedSegmentIds] = useState<string[]>(
    initialCompletedSegmentIds
  );
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [isPausedDueToAttention, setIsPausedDueToAttention] = useState(false);
  const [allCompleted, setAllCompleted] = useState(false);
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const timeTrackerRef = useRef<NodeJS.Timeout | null>(null);
  const lastValidTimeRef = useRef<number>(0);
  const lockedNoticeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeSegment = segments[currentSegmentIdx] || segments[0];

  // Helper to show locked notice
  const triggerLockedNotice = (msg: string) => {
    setLockedNotice(msg);
    if (lockedNoticeTimeoutRef.current) clearTimeout(lockedNoticeTimeoutRef.current);
    lockedNoticeTimeoutRef.current = setTimeout(() => {
      setLockedNotice(null);
    }, 3500);
  };

  // Register or touch video progress on load so it appears in Learning History with latest last_watched_at
  useEffect(() => {
    const touchProgress = async () => {
      try {
        await fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId,
            currentSegmentIndex: initialSegmentIndex,
          }),
        });
      } catch (e) {
        console.warn('Failed to register initial progress:', e);
      }
    };
    touchProgress();
  }, [videoId, initialSegmentIndex]);

  // 1. Initialize YouTube IFrame Player with Controls & Native Seeking Disabled
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) return;

      const safeStartTime = activeSegment?.start_seconds || 0;

      const newPlayer = new window.YT.Player(`yt-player-${youtubeVideoId}`, {
        videoId: youtubeVideoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          rel: 0,
          fs: 0,
          iv_load_policy: 3,
          playsinline: 1,
          enablejsapi: 1,
          origin: typeof window !== 'undefined' ? window.location.origin : '',
          start: safeStartTime,
        },
        events: {
          onReady: (event: any) => {
            setPlayer(event.target);
            playerRef.current = event.target;
            lastValidTimeRef.current = safeStartTime;
          },
          onStateChange: (event: any) => {
            setIsPlaying(event.data === 1);
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }
    };
  }, [youtubeVideoId]);

  // Listen for external seek requests (e.g. from Smart Notes timestamp links)
  useEffect(() => {
    const handleSeekEvent = (e: any) => {
      const targetSeconds = e.detail?.seconds;
      if (
        typeof targetSeconds === 'number' &&
        playerRef.current &&
        typeof playerRef.current.seekTo === 'function'
      ) {
        // Find which segment this timestamp belongs to
        const segIdx = segments.findIndex(
          (s) => targetSeconds >= s.start_seconds && targetSeconds <= s.end_seconds
        );

        if (segIdx !== -1) {
          const targetSeg = segments[segIdx];
          const isCompleted = completedSegmentIds.includes(targetSeg.id);
          const isCurrent = segIdx === currentSegmentIdx;

          if (isCompleted || isCurrent || segIdx <= currentSegmentIdx) {
            setCurrentSegmentIdx(segIdx);
            lastValidTimeRef.current = targetSeconds;
            playerRef.current.seekTo(targetSeconds, true);
            playerRef.current.playVideo();
            setIsPlaying(true);
            containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            triggerLockedNotice(`🔒 Chapter ${segIdx + 1} is locked! Complete current quiz to unlock.`);
          }
        } else {
          lastValidTimeRef.current = targetSeconds;
          playerRef.current.seekTo(targetSeconds, true);
          playerRef.current.playVideo();
          setIsPlaying(true);
          containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    };

    window.addEventListener('seek-video-player', handleSeekEvent);
    return () => window.removeEventListener('seek-video-player', handleSeekEvent);
  }, [segments, completedSegmentIds, currentSegmentIdx]);

  // 2. Programmatic Enforcement & Boundary Monitoring Loop
  useEffect(() => {
    if (timeTrackerRef.current) clearInterval(timeTrackerRef.current);

    timeTrackerRef.current = setInterval(() => {
      if (!playerRef.current || typeof playerRef.current.getCurrentTime !== 'function') return;

      const time = playerRef.current.getCurrentTime();
      setCurrentTime(time);

      if (!activeSegment) return;

      const isSegmentAlreadyDone = completedSegmentIds.includes(activeSegment.id);

      // A. Check if user illegally scrubbed forward into locked territory
      if (time > activeSegment.end_seconds + 0.5) {
        if (!isSegmentAlreadyDone) {
          console.warn(`[SEEK_LOCK] Blocked illegal seek to ${time}s (max allowed: ${activeSegment.end_seconds}s)`);
          playerRef.current.pauseVideo();
          playerRef.current.seekTo(activeSegment.start_seconds, true);
          setIsPlaying(false);
          triggerLockedNotice(`🔒 Complete the checkpoint for Part ${currentSegmentIdx + 1} first to unlock future chapters.`);
          return;
        }
      }

      // B. Check if playback reached current segment boundary
      if (time >= activeSegment.end_seconds - 0.4) {
        if (!isSegmentAlreadyDone && activeSegment.quiz_questions?.length > 0) {
          playerRef.current.pauseVideo();
          playerRef.current.seekTo(activeSegment.end_seconds - 0.1, true);
          setIsPlaying(false);

          if (!showQuizModal) {
            setShowQuizModal(true);
          }
          return;
        } else if (isSegmentAlreadyDone) {
          if (currentSegmentIdx < segments.length - 1) {
            const nextIdx = currentSegmentIdx + 1;
            const nextSeg = segments[nextIdx];
            const isNextUnlocked =
              completedSegmentIds.includes(activeSegment.id) ||
              completedSegmentIds.includes(nextSeg.id);

            if (isNextUnlocked) {
              setCurrentSegmentIdx(nextIdx);
            }
          }
        }
      }

      // C. Update last safe valid time
      if (time >= activeSegment.start_seconds && time <= activeSegment.end_seconds) {
        lastValidTimeRef.current = time;
      }
    }, 200);

    return () => {
      if (timeTrackerRef.current) clearInterval(timeTrackerRef.current);
    };
  }, [activeSegment, completedSegmentIds, currentSegmentIdx, segments, showQuizModal]);

  // 3. Custom Playback Controls
  const togglePlayPause = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      if (showQuizModal) return;

      const isDone = completedSegmentIds.includes(activeSegment.id);
      if (currentTime >= activeSegment.end_seconds - 0.5 && !isDone) {
        setShowQuizModal(true);
        return;
      }
      playerRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  const handleMuteToggle = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setVolume(val);
    if (playerRef.current) {
      playerRef.current.setVolume(val);
      if (val === 0) {
        setIsMuted(true);
      } else if (isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch((err) => {
        console.warn('Fullscreen error:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // 4. Custom Seeking within Current Segment
  const handleSeekWithinSegment = (targetTime: number) => {
    if (!playerRef.current || !activeSegment) return;

    const isCompleted = completedSegmentIds.includes(activeSegment.id);
    const maxTime = isCompleted ? activeSegment.end_seconds : activeSegment.end_seconds - 0.2;
    const clampedTime = Math.max(activeSegment.start_seconds, Math.min(targetTime, maxTime));

    playerRef.current.seekTo(clampedTime, true);
    setCurrentTime(clampedTime);
    lastValidTimeRef.current = clampedTime;
  };

  // 5. Jump to Completed / Unlocked Segment
  const handleSelectSegment = (index: number) => {
    const targetSegment = segments[index];
    if (!targetSegment) return;

    const isUnlocked =
      index === 0 ||
      completedSegmentIds.includes(segments[index - 1]?.id) ||
      completedSegmentIds.includes(targetSegment.id);

    if (!isUnlocked) {
      triggerLockedNotice(
        `🔒 Part ${index + 1} is locked. Complete the checkpoint for Part ${index} to unlock this section.`
      );
      return;
    }

    setCurrentSegmentIdx(index);
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(targetSegment.start_seconds, true);
      playerRef.current.playVideo();
      setIsPlaying(true);
      setCurrentTime(targetSegment.start_seconds);
      lastValidTimeRef.current = targetSegment.start_seconds;
    }
  };

  // 6. Checkpoint Quiz Completion Handler
  const handleQuizComplete = async (passed: boolean) => {
    setShowQuizModal(false);

    const updatedCompleted = Array.from(
      new Set([...completedSegmentIds, activeSegment.id])
    );
    setCompletedSegmentIds(updatedCompleted);

    const nextIndex = currentSegmentIdx + 1;
    const isLessonFinished = nextIndex >= segments.length;

    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          completedSegmentId: activeSegment.id,
          currentSegmentIndex: isLessonFinished ? currentSegmentIdx : nextIndex,
        }),
      });
    } catch (err) {
      console.warn('Failed to save progress to backend:', err);
    }

    if (isLessonFinished) {
      setAllCompleted(true);
      if (playerRef.current) playerRef.current.pauseVideo();
    } else {
      setCurrentSegmentIdx(nextIndex);
      const nextSegment = segments[nextIndex];
      if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
        playerRef.current.seekTo(nextSegment.start_seconds, true);
        playerRef.current.playVideo();
        setIsPlaying(true);
        setCurrentTime(nextSegment.start_seconds);
        lastValidTimeRef.current = nextSegment.start_seconds;
      }
    }
  };

  const handleRetrySegment = () => {
    setShowQuizModal(false);
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(activeSegment.start_seconds, true);
      playerRef.current.playVideo();
      setIsPlaying(true);
      setCurrentTime(activeSegment.start_seconds);
      lastValidTimeRef.current = activeSegment.start_seconds;
    }
  };

  const handleAutoPause = () => {
    if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
    }
  };

  const handleUserResume = () => {
    if (playerRef.current && typeof playerRef.current.playVideo === 'function' && !showQuizModal) {
      playerRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  const segmentDuration = activeSegment ? activeSegment.end_seconds - activeSegment.start_seconds : 1;
  const segmentElapsed = Math.max(0, currentTime - (activeSegment?.start_seconds || 0));
  const activeSegmentFraction = Math.min(1, Math.max(0, segmentElapsed / (segmentDuration || 1)));

  return (
    <div className="space-y-6" ref={containerRef}>
      {/* ─────────────────────────────────────────────────────────────
          1. VIDEO PLAYER CONTAINER WITH NEO-BRUTALIST FRAME
      ───────────────────────────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden bg-black border-2 border-[#111218] shadow-neo-lg group">
        {/* YouTube IFrame Embed */}
        <div className="relative aspect-video w-full">
          <div
            id={`yt-player-${youtubeVideoId}`}
            className="w-full h-full object-cover pointer-events-none"
          />
        </div>

        {/* Click-to-Play/Pause Invisible Overlay Layer */}
        <div
          onClick={togglePlayPause}
          className="absolute inset-0 z-10 cursor-pointer bg-transparent"
        />

        {/* Locked Notice Notification Toast */}
        {lockedNotice && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-[#FFFDF7] border-2 border-[#111218] text-[#111218] text-xs font-bold flex items-center gap-2 shadow-neo animate-in fade-in">
            <Lock className="w-4 h-4 text-[#111218] flex-shrink-0" />
            <span>{lockedNotice}</span>
          </div>
        )}

        {/* Lesson Finished Full Overlay */}
        {allCompleted && (
          <div className="absolute inset-0 z-30 bg-[#FFFDF7]/95 backdrop-blur-sm flex items-center justify-center p-6 text-center animate-in fade-in">
            <div className="max-w-md space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#B8FF3D] border-2 border-[#111218] flex items-center justify-center mx-auto text-[#111218] shadow-neo-sm">
                <Award className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-extrabold text-[#111218] font-display uppercase">Lesson Completed! 🎓</h3>
              <p className="text-xs text-[#636573] font-medium leading-relaxed">
                You passed all {segments.length} checkpoints in this course. Your recall questions are now in your active study deck.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <NextLink
                  href="/flashcards"
                  className="neo-btn-lime px-5 py-2.5 text-xs font-bold"
                >
                  Review Flashcards →
                </NextLink>
                <button
                  onClick={() => {
                    setAllCompleted(false);
                    handleSelectSegment(0);
                  }}
                  className="neo-btn-outline px-4 py-2 text-xs font-bold"
                >
                  Replay Lesson
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            2. CUSTOM CONTROLS BAR
        ───────────────────────────────────────────────────────────── */}
        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/95 via-black/75 to-transparent flex flex-col gap-3">
          {/* Custom Segmented Timeline */}
          <div className="flex items-center gap-1.5 w-full">
            {segments.map((seg, idx) => {
              const isSegActive = idx === currentSegmentIdx;
              const isSegDone = completedSegmentIds.includes(seg.id);
              const isUnlocked =
                idx === 0 ||
                completedSegmentIds.includes(segments[idx - 1]?.id) ||
                isSegDone;

              let fillPercent = 0;
              if (isSegDone && !isSegActive) {
                fillPercent = 100;
              } else if (isSegActive) {
                fillPercent = activeSegmentFraction * 100;
              }

              return (
                <div
                  key={seg.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isUnlocked) {
                      handleSelectSegment(idx);
                    } else {
                      triggerLockedNotice(
                        `🔒 Complete Part ${idx} checkpoint first to unlock Part ${idx + 1}.`
                      );
                    }
                  }}
                  className={`relative flex-1 h-2 rounded-full overflow-hidden transition-all cursor-pointer border border-[#111218] ${
                    isUnlocked
                      ? 'bg-white/20 hover:bg-white/40'
                      : 'bg-white/10 cursor-not-allowed opacity-50'
                  }`}
                  title={
                    isUnlocked
                      ? `${seg.title} (${formatTime(seg.start_seconds)} – ${formatTime(seg.end_seconds)})`
                      : `Locked: Complete prior checkpoints to unlock`
                  }
                >
                  <div
                    className={`h-full rounded-full transition-all duration-150 ${
                      isSegDone
                        ? 'bg-[#B8FF3D]'
                        : isSegActive
                        ? 'bg-[#B8FF3D]'
                        : 'bg-transparent'
                    }`}
                    style={{ width: `${fillPercent}%` }}
                  />

                  {!isUnlocked && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <Lock className="w-2 h-2 text-slate-400" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Controls Row */}
          <div className="flex items-center justify-between text-xs text-white">
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlayPause();
                }}
                className="p-2 rounded-xl bg-[#B8FF3D] hover:bg-[#C6FF57] text-[#111218] border border-[#111218] transition-colors shadow-sm"
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-[#111218]" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-[#111218] ml-0.5" />
                )}
              </button>

              <div className="font-mono text-xs text-white font-bold flex items-center gap-1.5">
                <span>{formatTime(currentTime)}</span>
                <span className="text-slate-400">/</span>
                <span className="text-slate-300">
                  {formatTime(activeSegment?.end_seconds || durationSeconds)}
                </span>
                <span className="badge-lime px-2 py-0.2 text-[9px] font-display ml-1">
                  Part {currentSegmentIdx + 1}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMuteToggle();
                  }}
                  className="text-slate-300 hover:text-white transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  onClick={(e) => e.stopPropagation()}
                  className="w-16 h-1 accent-[#B8FF3D] bg-white/20 rounded-lg cursor-pointer"
                />
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title="Fullscreen"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. STRICT FOCUS ATTENTION MONITOR INTEGRATION
      ───────────────────────────────────────────────────────────── */}
      <StrictModeDetector
        videoId={videoId}
        currentSegmentId={activeSegment?.id}
        onAutoPause={handleAutoPause}
        onUserResume={handleUserResume}
        isPausedDueToAttention={isPausedDueToAttention}
        setIsPausedDueToAttention={setIsPausedDueToAttention}
      />

      {/* ─────────────────────────────────────────────────────────────
          4. TOPIC CHECKPOINTS TIMELINE GRID
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-[#FFFDF7] border-2 border-[#111218] p-5 rounded-3xl space-y-4 shadow-neo-sm">
        <div className="flex items-center justify-between pb-2 border-b-2 border-[#111218]/10">
          <div className="flex items-center gap-2">
            <span className="badge-lime px-2 py-0.5 text-[10px] uppercase font-bold">
              Roadmap
            </span>
            <h3 className="text-xs font-extrabold text-[#111218] uppercase tracking-wider font-display">
              Topic Checkpoints
            </h3>
          </div>
          <span className="text-xs font-bold text-[#636573] font-mono">
            {completedSegmentIds.length}/{segments.length} Cleared
          </span>
        </div>

        {/* Checkpoint Part Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {segments.map((seg, idx) => {
            const isActive = idx === currentSegmentIdx;
            const isCompleted = completedSegmentIds.includes(seg.id);
            const isUnlocked =
              idx === 0 ||
              completedSegmentIds.includes(segments[idx - 1]?.id) ||
              isCompleted;

            return (
              <button
                key={seg.id}
                onClick={() => handleSelectSegment(idx)}
                className={`p-3.5 rounded-2xl border-2 border-[#111218] text-left transition-all relative flex flex-col justify-between min-h-[90px] ${
                  isActive
                    ? 'bg-[#B8FF3D] text-[#111218] shadow-neo font-bold'
                    : isCompleted
                    ? 'bg-[#DDF6BD] text-[#111218] shadow-neo-sm'
                    : isUnlocked
                    ? 'bg-[#FFFDF7] text-[#111218] shadow-neo-sm hover:-translate-y-0.5'
                    : 'bg-[#EAE6DB] text-[#636573] opacity-60 cursor-not-allowed shadow-none'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider font-display">
                    Part {idx + 1}
                  </span>

                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#111218]" />
                  ) : !isUnlocked ? (
                    <Lock className="w-3 h-3 text-[#636573]" />
                  ) : isActive ? (
                    <span className="w-2 h-2 rounded-full bg-[#111218] animate-pulse" />
                  ) : null}
                </div>

                <p className="text-xs font-bold text-[#111218] line-clamp-1 my-1 font-display">
                  {seg.title}
                </p>

                <span className="text-[10px] text-[#636573] font-mono font-semibold">
                  {formatTime(seg.start_seconds)} – {formatTime(seg.end_seconds)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Current Segment Overview */}
        {activeSegment && (
          <div className="p-4 rounded-2xl bg-[#F5F3EC] border-2 border-[#111218] flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-[#B8FF3D] border border-[#111218] text-[#111218] flex-shrink-0 mt-0.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-extrabold text-[#111218] font-display">
                Active Topic: {activeSegment.title}
              </h4>
              <p className="text-xs text-[#636573] font-medium leading-relaxed">
                {activeSegment.summary ||
                  'Watch through this chapter to unlock the verification quiz.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. CHECKPOINT QUIZ MODAL
      ───────────────────────────────────────────────────────────── */}
      {activeSegment && (
        <QuizModal
          segmentTitle={activeSegment.title}
          segmentIndex={currentSegmentIdx}
          totalSegments={segments.length}
          questions={activeSegment.quiz_questions}
          isOpen={showQuizModal}
          onComplete={handleQuizComplete}
          onRetrySegment={handleRetrySegment}
        />
      )}
    </div>
  );
}
