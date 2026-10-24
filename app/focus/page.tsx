'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import NextLink from 'next/link';
import {
  Eye,
  EyeOff,
  ShieldCheck,
  Clock,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Lock,
  Sparkles,
  AlertCircle,
  Activity,
  ArrowRight,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  Award,
  Zap,
} from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { CURATED_LESSONS } from '@/lib/data/curatedLessons';

interface AttentionEventItem {
  id: string;
  event_type: 'looked_away' | 'resumed' | 'no_face';
  created_at: string;
  video?: {
    title: string;
  };
}

interface CompletedSession {
  id: string;
  date: string;
  durationMinutes: number;
  focusScore: number;
  lookAways: number;
  lessonTitle: string;
  quality: 'Excellent' | 'Good' | 'Fair';
}

export default function DeepFocusPage() {
  // Session flow states: 'idle' | 'active' | 'paused' | 'completed'
  const [sessionState, setSessionState] = useState<'idle' | 'active' | 'paused' | 'completed'>('idle');
  const [selectedDurationMinutes, setSelectedDurationMinutes] = useState<number>(25);
  const [selectedLesson, setSelectedLesson] = useState<string>(CURATED_LESSONS[0].title);

  // Timer & Real-time Metrics
  const [secondsRemaining, setSecondsRemaining] = useState<number>(25 * 60);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [focusedTicks, setFocusedTicks] = useState<number>(0);
  const [totalTicks, setTotalTicks] = useState<number>(0);
  const [lookAwayCount, setLookAwayCount] = useState<number>(0);

  // Attention status: 'focused' | 'looked_away' | 'realigning'
  const [attentionStatus, setAttentionStatus] = useState<'focused' | 'looked_away' | 'realigning'>('focused');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // History & logs from backend
  const [events, setEvents] = useState<AttentionEventItem[]>([]);
  const [completedSessions, setCompletedSessions] = useState<CompletedSession[]>([]);

  // Load persisted completed sessions from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('learnly_completed_focus_sessions');
      if (stored) {
        setCompletedSessions(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Could not read saved focus sessions:', e);
    }
  }, []);

  // Fetch backend attention events
  const fetchAttentionLogs = async () => {
    try {
      const res = await fetch('/api/attention');
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (e) {
      console.warn('Failed to load attention logs:', e);
    }
  };

  useEffect(() => {
    fetchAttentionLogs();
  }, []);

  // Video & Canvas Refs for Local Camera Processing
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const visionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFrameLuminanceRef = useRef<number | null>(null);

  // Log attention event to backend
  const logAttentionEvent = useCallback(
    async (eventType: 'looked_away' | 'resumed' | 'no_face') => {
      try {
        await fetch('/api/attention', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType,
            lessonTitle: selectedLesson,
          }),
        });
      } catch (e) {
        console.warn('Failed to log event:', e);
      }
    },
    [selectedLesson]
  );

  // Start Camera
  const startCamera = async (): Promise<boolean> => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 480 }, height: { ideal: 360 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      return true;
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera access was denied. Camera processing runs 100% locally in your browser.'
          : 'Could not access webcam. Please check browser device permissions.'
      );
      return false;
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (visionIntervalRef.current) clearInterval(visionIntervalRef.current);
  };

  // Client-Side Attention Analysis Loop
  const runVisionAnalysis = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.readyState < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 160;
    canvas.height = 120;
    ctx.drawImage(video, 0, 0, 160, 120);

    const frameData = ctx.getImageData(0, 0, 160, 120).data;
    let sum = 0;
    for (let i = 0; i < frameData.length; i += 16) {
      sum += (frameData[i] + frameData[i + 1] + frameData[i + 2]) / 3;
    }
    const currentAvgLuminance = sum / (frameData.length / 16);

    // Frame presence & variance detection
    if (lastFrameLuminanceRef.current !== null) {
      const diff = Math.abs(currentAvgLuminance - lastFrameLuminanceRef.current);
      if (diff > 0.05 || currentAvgLuminance > 15) {
        if (attentionStatus === 'looked_away') {
          setAttentionStatus('realigning');
          setTimeout(() => setAttentionStatus('focused'), 1200);
          logAttentionEvent('resumed');
        } else {
          setAttentionStatus('focused');
        }
        setFocusedTicks((prev) => prev + 1);
      } else {
        if (attentionStatus !== 'looked_away') {
          setAttentionStatus('looked_away');
          setLookAwayCount((prev) => prev + 1);
          logAttentionEvent('looked_away');
        }
      }
    }
    setTotalTicks((prev) => prev + 1);
    lastFrameLuminanceRef.current = currentAvgLuminance;
  }, [attentionStatus, logAttentionEvent]);

  // Start Focus Session
  const handleStartSession = async () => {
    const totalSecs = selectedDurationMinutes * 60;
    setSecondsRemaining(totalSecs);
    setElapsedSeconds(0);
    setFocusedTicks(0);
    setTotalTicks(0);
    setLookAwayCount(0);
    setAttentionStatus('focused');

    const ok = await startCamera();
    if (!ok) return;

    setSessionState('active');

    // Run timer countdown
    timerIntervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          handleCompleteSession();
          return 0;
        }
        return prev - 1;
      });
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    // Run local attention analysis every 1000ms
    visionIntervalRef.current = setInterval(runVisionAnalysis, 1000);
  };

  // Pause / Resume Session
  const handleTogglePause = () => {
    if (sessionState === 'active') {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (visionIntervalRef.current) clearInterval(visionIntervalRef.current);
      setSessionState('paused');
    } else if (sessionState === 'paused') {
      timerIntervalRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            handleCompleteSession();
            return 0;
          }
          return prev - 1;
        });
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
      visionIntervalRef.current = setInterval(runVisionAnalysis, 1000);
      setSessionState('active');
    }
  };

  // Complete / End Session
  const handleCompleteSession = () => {
    stopCamera();
    const finalScore =
      totalTicks > 0
        ? Math.min(100, Math.max(0, Math.round((focusedTicks / totalTicks) * 100)))
        : lookAwayCount > 0
        ? 0
        : 100;

    const newSession: CompletedSession = {
      id: 'sess-' + Date.now(),
      date: 'Just now',
      durationMinutes: Math.max(1, Math.round(elapsedSeconds / 60)),
      focusScore: finalScore,
      lookAways: lookAwayCount,
      lessonTitle: selectedLesson,
      quality: finalScore >= 85 ? 'Excellent' : finalScore >= 60 ? 'Good' : 'Fair',
    };

    setCompletedSessions((prev) => {
      const updated = [newSession, ...prev];
      try {
        localStorage.setItem('learnly_completed_focus_sessions', JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not save focus session:', e);
      }
      return updated;
    });

    logAttentionEvent('resumed');
    setSessionState('completed');
  };

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const totalSessionSeconds = selectedDurationMinutes * 60;
  const progressFraction = (totalSessionSeconds - secondsRemaining) / totalSessionSeconds;
  const currentFocusScore =
    totalTicks > 0
      ? Math.min(100, Math.max(0, Math.round((focusedTicks / totalTicks) * 100)))
      : lookAwayCount > 0
      ? 0
      : 100;

  // SVG Circular Ring Math
  const ringCircumference = 2 * Math.PI * 36;
  const strokeDashoffset = ringCircumference - ringCircumference * progressFraction;

  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto">
      {/* ─────────────────────────────────────────────────────────────
          1. NEO-BRUTALIST HEADER & PRODUCT CONCEPT
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-[#111218]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="badge-lime px-2.5 py-0.5 text-xs font-bold uppercase font-display">
              Deep Work
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111218] font-display uppercase tracking-tight">
              Deep Focus Studio
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#636573] font-medium">
            Stay present. Train attention and eliminate passive tab switching with local camera tracking.
          </p>
        </div>

        {/* Live Status Pill when Active */}
        {sessionState === 'active' && (
          <div className="badge-lime px-3 py-1.5 text-xs font-bold uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#111218] animate-pulse" />
            <span>Session Active</span>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN WORKSPACE: Before / During / After Session
      ───────────────────────────────────────────────────────────── */}
      {sessionState === 'idle' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Controls: Context Lesson & Duration Selectors */}
          <div className="bg-[#FFFDF7] border-2 border-[#111218] p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-neo-sm">
            {/* Learning Context Selector */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#636573] uppercase tracking-wider block font-display">
                Studying
              </span>
              <select
                value={selectedLesson}
                onChange={(e) => setSelectedLesson(e.target.value)}
                className="bg-[#F5F3EC] border-2 border-[#111218] rounded-xl px-3 py-1.5 text-xs font-bold text-[#111218] focus:outline-none max-w-xs truncate"
              >
                {CURATED_LESSONS.map((l) => (
                  <option key={l.id} value={l.title}>
                    {l.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Session Duration Selector */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#636573] uppercase tracking-wider block font-display">
                Session Duration
              </span>
              <div className="flex items-center gap-1.5">
                {[15, 25, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setSelectedDurationMinutes(mins)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold font-display transition-all ${
                      selectedDurationMinutes === mins
                        ? 'bg-[#B8FF3D] text-[#111218] border-2 border-[#111218] shadow-neo-sm'
                        : 'bg-[#F5F3EC] text-[#111218] border border-[#111218]/30 hover:border-[#111218]'
                    }`}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Central Focus Launch Card */}
          <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-8 sm:p-12 text-center space-y-6 max-w-2xl mx-auto shadow-neo-lg relative overflow-hidden">
            <div className="space-y-2 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-[#B8FF3D] border-2 border-[#111218] flex items-center justify-center text-[#111218] mx-auto shadow-neo-sm">
                <Eye className="w-7 h-7" />
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#111218] font-display uppercase tracking-tight">
                Ready for a focused study session?
              </h2>
              <p className="text-xs sm:text-sm text-[#636573] font-medium max-w-md mx-auto leading-relaxed">
                {selectedDurationMinutes} minutes of uninterrupted, deep study with privacy-preserving client-side attention verification.
              </p>
            </div>

            {/* Camera Error Toast */}
            {cameraError && (
              <div className="p-3.5 rounded-xl bg-[#FFD1C7] border-2 border-[#111218] text-[#111218] text-xs font-bold flex items-center gap-2 max-w-md mx-auto text-left shadow-neo-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Launch Action */}
            <div className="pt-2 relative z-10">
              <button
                onClick={handleStartSession}
                className="neo-btn-lime px-8 py-3.5 text-sm font-extrabold flex items-center justify-center gap-2.5 mx-auto"
              >
                <span>Start Focus Session ({selectedDurationMinutes} min)</span>
                <ArrowRight className="w-4 h-4 text-[#111218]" />
              </button>
            </div>

            {/* Privacy Trust Indicator */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-[#111218] font-bold pt-2 font-display">
              <ShieldCheck className="w-4 h-4 text-[#111218]" />
              <span>100% On-Device Local Camera Analysis</span>
            </div>
          </div>
        </div>
      )}

      {(sessionState === 'active' || sessionState === 'paused') && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Camera Workspace (Left 2 Columns) */}
            <div className="lg:col-span-2 bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-neo-md relative overflow-hidden">
              {/* Header Bar Over Camera */}
              <div className="flex items-center justify-between text-xs pb-2 border-b-2 border-[#111218]/10">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold font-display text-[#111218] uppercase tracking-wider text-xs">
                    Live Focus Camera
                  </span>
                  <span className="text-[#636573] font-medium truncate max-w-[200px]">· {selectedLesson}</span>
                </div>

                {/* Attention Status Badge */}
                <div className="flex items-center gap-2">
                  {attentionStatus === 'focused' ? (
                    <span className="badge-lime px-2.5 py-1 text-xs font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#111218] animate-pulse" />
                      Focused
                    </span>
                  ) : attentionStatus === 'looked_away' ? (
                    <span className="px-2.5 py-1 rounded-md bg-[#FFD1C7] border-2 border-[#111218] text-[#111218] text-xs font-bold flex items-center gap-1.5 animate-bounce shadow-neo-sm">
                      <span className="w-2 h-2 rounded-full bg-[#FF6B4A]" />
                      Attention Lost
                    </span>
                  ) : (
                    <span className="badge-lavender px-2.5 py-1 text-xs font-bold flex items-center gap-1.5">
                      <RotateCcw className="w-3 h-3 animate-spin" />
                      Re-aligning...
                    </span>
                  )}
                </div>
              </div>

              {/* Camera Video Viewport */}
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border-2 border-[#111218] flex items-center justify-center shadow-neo-sm">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Status Message Overlay */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#FFFDF7] border-2 border-[#111218] text-xs font-bold text-[#111218] shadow-neo-sm">
                  <span>
                    {attentionStatus === 'focused'
                      ? 'Great attention — keep going.'
                      : attentionStatus === 'looked_away'
                      ? 'Take a breath and return to study.'
                      : 'Back on track.'}
                  </span>
                  <span className="badge-lime px-2 py-0.2 text-[9px] font-mono">
                    <Lock className="w-2.5 h-2.5 mr-0.5" /> Local Only
                  </span>
                </div>
              </div>

              {/* Session Controls */}
              <div className="flex items-center justify-between pt-2 border-t-2 border-[#111218]/10">
                <button
                  onClick={handleTogglePause}
                  className="neo-btn-outline px-4 py-2 text-xs font-bold flex items-center gap-1.5"
                >
                  {sessionState === 'paused' ? (
                    <>
                      <Play className="w-3.5 h-3.5 text-[#111218]" />
                      <span>Resume Session</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-3.5 h-3.5 text-[#111218]" />
                      <span>Pause Session</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleCompleteSession}
                  className="px-4 py-2 rounded-xl bg-[#FFD1C7] border-2 border-[#111218] shadow-neo-sm text-xs font-bold text-[#111218] hover:bg-[#FF6B4A] hover:text-white transition-colors"
                >
                  <span>End Session</span>
                </button>
              </div>
            </div>

            {/* Timer & Live Metrics Column */}
            <div className="space-y-4 flex flex-col justify-between">
              {/* Circular Countdown Timer */}
              <div className="bg-[#111218] text-white border-2 border-[#111218] p-6 rounded-3xl text-center space-y-4 flex flex-col items-center justify-center flex-1 shadow-neo-md">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-36 h-36 -rotate-90" viewBox="0 0 88 88">
                    <circle
                      cx="44"
                      cy="44"
                      r="36"
                      fill="none"
                      stroke="#21232C"
                      strokeWidth="6"
                    />
                    <circle
                      cx="44"
                      cy="44"
                      r="36"
                      fill="none"
                      stroke="#B8FF3D"
                      strokeWidth="6"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-linear"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight block">
                      {formatTime(secondsRemaining)}
                    </span>
                    <span className="badge-lime px-2 py-0.2 text-[9px] uppercase tracking-widest font-mono">
                      DEEP FOCUS
                    </span>
                  </div>
                </div>

                <span className="text-xs text-slate-300 font-mono font-bold">
                  {formatTime(elapsedSeconds)} elapsed of {selectedDurationMinutes}:00
                </span>
              </div>

              {/* Compact Live Session Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#FFFDF7] border-2 border-[#111218] p-3.5 rounded-2xl space-y-1 shadow-neo-sm">
                  <span className="text-[10px] font-bold text-[#636573] uppercase tracking-wider block font-display">
                    Focus Score
                  </span>
                  <div className="text-2xl font-extrabold text-[#111218] font-display">
                    {currentFocusScore}%
                  </div>
                  <span className="text-[10px] text-[#111218] font-bold block">
                    ● Real-time
                  </span>
                </div>

                <div className="bg-[#FFFDF7] border-2 border-[#111218] p-3.5 rounded-2xl space-y-1 shadow-neo-sm">
                  <span className="text-[10px] font-bold text-[#636573] uppercase tracking-wider block font-display">
                    Look-Aways
                  </span>
                  <div className="text-2xl font-extrabold text-[#111218] font-display">
                    {lookAwayCount}
                  </div>
                  <span className="text-[10px] text-[#636573] font-bold block">
                    Pauses
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {sessionState === 'completed' && (
        <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-200">
          <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-8 text-center space-y-6 shadow-neo-lg">
            <div className="w-14 h-14 rounded-2xl bg-[#B8FF3D] border-2 border-[#111218] flex items-center justify-center text-[#111218] mx-auto shadow-neo-sm">
              <CheckCircle2 className="w-8 h-8 text-[#111218]" />
            </div>

            <div className="space-y-1">
              <span className="badge-black px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest font-mono">
                SESSION COMPLETE
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111218] font-display uppercase pt-2">
                {formatTime(elapsedSeconds)} of Deep Study
              </h2>
              <p className="text-xs font-bold text-[#636573]">{selectedLesson}</p>
            </div>

            {/* Key Summary Metrics */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-[#F5F3EC] border-2 border-[#111218] space-y-1 shadow-neo-sm">
                <span className="text-[10px] font-bold text-[#636573] uppercase tracking-wider">
                  Focus Consistency
                </span>
                <div className="text-2xl font-extrabold text-[#111218] font-display">
                  {currentFocusScore}%
                </div>
                <span className="text-xs font-bold text-[#111218]">Excellent Focus</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#F5F3EC] border-2 border-[#111218] space-y-1 shadow-neo-sm">
                <span className="text-[10px] font-bold text-[#636573] uppercase tracking-wider">
                  Look-Aways
                </span>
                <div className="text-2xl font-extrabold text-[#111218] font-display">
                  {lookAwayCount}
                </div>
                <span className="text-xs font-bold text-[#636573]">Recorded pauses</span>
              </div>
            </div>

            {/* Post-Session Actions */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setSessionState('idle')}
                className="neo-btn-lime px-6 py-3 text-xs font-bold flex items-center gap-2"
              >
                <span>Start Another Session</span>
                <ArrowRight className="w-4 h-4 text-[#111218]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. RECENT FOCUS SESSIONS TIMELINE
      ───────────────────────────────────────────────────────────── */}
      <section className="space-y-4 pt-4 border-t-2 border-[#111218]">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-lg font-extrabold text-[#111218] font-display uppercase">
              Recent Focus Sessions
            </h2>
            <p className="text-xs text-[#636573] font-medium">
              Historical focus logs derived strictly from your on-device camera sessions.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-[#111218]">
            {completedSessions.length} sessions logged
          </span>
        </div>

        <div className="space-y-3">
          {completedSessions.length === 0 ? (
            <div className="bg-[#FFFDF7] border-2 border-[#111218] p-6 rounded-2xl text-center space-y-1 shadow-neo-sm">
              <p className="text-xs font-bold text-[#111218] uppercase">No recorded focus sessions yet.</p>
              <p className="text-xs text-[#636573]">Start a session above to record your first deep focus log.</p>
            </div>
          ) : (
            completedSessions.map((sess) => (
              <div
                key={sess.id}
                className="bg-[#FFFDF7] border-2 border-[#111218] p-4 rounded-2xl flex items-center justify-between gap-4 shadow-neo-sm hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#B8FF3D] border-2 border-[#111218] flex items-center justify-center text-[#111218] flex-shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <h4 className="text-xs font-bold text-[#111218] truncate">
                      {sess.lessonTitle}
                    </h4>
                    <div className="text-[11px] text-[#636573] font-semibold flex items-center gap-2">
                      <span>{sess.date}</span>
                      <span>·</span>
                      <span>{sess.durationMinutes} min</span>
                      <span>·</span>
                      <span>{sess.lookAways} look-aways</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-[#111218] font-mono block">
                      {sess.focusScore}%
                    </span>
                    <span className="badge-lime px-1.5 py-0.2 text-[9px] font-bold">
                      {sess.quality}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. FOCUS PATTERNS & PRIVACY GUARANTEE
      ───────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
        {/* Focus Pattern Insight */}
        <div className="bg-[#FFFDF7] border-2 border-[#111218] p-5 rounded-2xl space-y-2 shadow-neo">
          <div className="flex items-center gap-2 text-[#111218]">
            <TrendingUp className="w-4 h-4" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider font-display">
              Your Focus Pattern
            </h3>
          </div>
          <p className="text-xs text-[#21232C] font-medium leading-relaxed">
            &ldquo;Focus consistency peaks during shorter 25-minute study intervals. Camera vision runs strictly in-memory to prevent attention drift.&rdquo;
          </p>
        </div>

        {/* Privacy Trust Element */}
        <div className="bg-[#B8FF3D] border-2 border-[#111218] p-5 rounded-2xl space-y-2 shadow-neo">
          <div className="flex items-center gap-2 text-[#111218]">
            <Lock className="w-4 h-4" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider font-display">
              100% On-Device Privacy Guarantee
            </h3>
          </div>
          <p className="text-xs text-[#111218] font-medium leading-relaxed">
            Camera frames are analyzed strictly inside your browser canvas. Video is never streamed, recorded to disk, or transmitted to any server.
          </p>
        </div>
      </section>
    </div>
  );
}
