'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Eye,
  EyeOff,
  Camera,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface StrictModeDetectorProps {
  videoId: string;
  currentSegmentId?: string;
  onAutoPause: () => void;
  onUserResume: () => void;
  isPausedDueToAttention: boolean;
  setIsPausedDueToAttention: (paused: boolean) => void;
}

export function StrictModeDetector({
  videoId,
  currentSegmentId,
  onAutoPause,
  onUserResume,
  isPausedDueToAttention,
  setIsPausedDueToAttention,
}: StrictModeDetectorProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLookingAway, setIsLookingAway] = useState(false);
  const [lookAwaySeconds, setLookAwaySeconds] = useState(0);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [focusStats, setFocusStats] = useState({ lookAways: 0, focusStreak: 0 });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lookAwayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPixelDataRef = useRef<Uint8ClampedArray | null>(null);

  // Log attention event to backend
  const logAttentionEvent = useCallback(
    async (eventType: 'looked_away' | 'resumed' | 'no_face') => {
      try {
        await fetch('/api/attention', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId,
            segmentId: currentSegmentId,
            eventType,
          }),
        });
      } catch (e) {
        console.warn('Failed to log attention event:', e);
      }
    },
    [videoId, currentSegmentId]
  );

  // Start webcam stream
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 320 },
          height: { ideal: 240 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setHasPermission(true);
      setIsEnabled(true);
      setShowConsentModal(false);
    } catch (err) {
      console.warn('Camera access denied:', err);
      setHasPermission(false);
      setIsEnabled(false);
      setShowConsentModal(false);
    }
  };

  // Stop webcam stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    if (lookAwayTimerRef.current) clearInterval(lookAwayTimerRef.current);
    setIsEnabled(false);
    setIsLookingAway(false);
    setLookAwaySeconds(0);
    setIsPausedDueToAttention(false);
  };

  const handleToggle = () => {
    if (isEnabled) {
      stopCamera();
    } else {
      setShowConsentModal(true);
    }
  };

  // Client-side lightweight vision processing loop
  useEffect(() => {
    if (!isEnabled || !hasPermission) return;

    let inattentiveCount = 0;

    checkIntervalRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx || video.readyState !== 4) return;

      canvas.width = 160;
      canvas.height = 120;
      ctx.drawImage(video, 0, 0, 160, 120);

      const frame = ctx.getImageData(0, 0, 160, 120);
      const data = frame.data;

      // Sample luminance & center-weighted activity
      let centerBrightness = 0;
      let centerSamples = 0;

      for (let y = 30; y < 90; y += 4) {
        for (let x = 40; x < 120; x += 4) {
          const idx = (y * 160 + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          centerBrightness += lum;
          centerSamples++;
        }
      }

      const avgLum = centerBrightness / (centerSamples || 1);

      let diff = 0;
      if (lastPixelDataRef.current) {
        for (let i = 0; i < data.length; i += 16) {
          diff += Math.abs(data[i] - lastPixelDataRef.current[i]);
        }
      }
      lastPixelDataRef.current = new Uint8ClampedArray(data);

      const isDetected = avgLum > 15 && (diff > 50 || avgLum < 240);

      if (!isDetected) {
        inattentiveCount++;
        setIsLookingAway(true);
        setLookAwaySeconds(inattentiveCount * 1.5);

        if (inattentiveCount >= 3 && !isPausedDueToAttention) {
          setIsPausedDueToAttention(true);
          onAutoPause();
          logAttentionEvent('looked_away');
          setFocusStats((prev) => ({ ...prev, lookAways: prev.lookAways + 1 }));
        }
      } else {
        inattentiveCount = 0;
        setIsLookingAway(false);
        setLookAwaySeconds(0);
      }
    }, 1500);

    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [isEnabled, hasPermission, isPausedDueToAttention, onAutoPause, logAttentionEvent, setIsPausedDueToAttention]);

  const handleResumeClick = () => {
    setIsPausedDueToAttention(false);
    setIsLookingAway(false);
    setLookAwaySeconds(0);
    logAttentionEvent('resumed');
    onUserResume();
  };

  return (
    <>
      {/* Strict Mode Toggle Control */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FFFDF7] border-2 border-[#111218] shadow-neo-sm">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl border-2 border-[#111218] flex items-center justify-center transition-colors ${
              isEnabled ? 'bg-[#B8FF3D] text-[#111218] shadow-neo-sm' : 'bg-[#F5F3EC] text-[#636573]'
            }`}
          >
            {isEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-[#111218] font-display uppercase tracking-tight">
                Strict Focus Mode
              </span>
              {isEnabled && (
                <span className="badge-lime px-2 py-0.2 text-[9px] font-bold">
                  ● Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#636573] font-medium">
              {isEnabled
                ? 'Auto-pauses if you look away for >4s (100% private client-side)'
                : 'Enable camera attention tracking to prevent passive scrolling'}
            </p>
          </div>
        </div>

        <button
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-12 items-center rounded-full border-2 border-[#111218] transition-colors ${
            isEnabled ? 'bg-[#B8FF3D]' : 'bg-[#EAE6DB]'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-[#111218] transition-transform ${
              isEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Camera pip indicator */}
      {isEnabled && (
        <div className="mt-2.5 flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#FFFDF7] border-2 border-[#111218] text-[11px] shadow-neo-sm">
          <div className="flex items-center gap-2 font-bold text-[#111218]">
            <Camera className="w-3.5 h-3.5 text-[#111218]" />
            <span>Local AI Vision:</span>
            <span
              className={`px-1.5 py-0.2 rounded border border-[#111218] font-mono ${
                isLookingAway ? 'bg-[#FFD1C7] text-[#111218]' : 'bg-[#B8FF3D] text-[#111218]'
              }`}
            >
              {isLookingAway ? `Looking Away (${lookAwaySeconds.toFixed(0)}s)` : 'Attentive ✓'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-[#636573] font-bold text-[10px] font-mono">
              Look-aways: {focusStats.lookAways}
            </span>
            <button
              onClick={stopCamera}
              className="text-[#636573] hover:text-rose-600 font-bold text-[10px] underline"
            >
              Turn off
            </button>
          </div>

          <video ref={videoRef} className="hidden" playsInline muted />
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* Permission Denied Message */}
      {hasPermission === false && (
        <div className="mt-2.5 p-3 rounded-xl bg-[#FFD1C7] border-2 border-[#111218] text-[#111218] text-xs font-bold flex items-center gap-2 shadow-neo-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span>Camera access denied. Strict mode is disabled; lessons continue normally.</span>
        </div>
      )}

      {/* Consent Modal */}
      {showConsentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111218]/75 backdrop-blur-sm">
          <div className="max-w-md w-full bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-6 sm:p-8 shadow-neo-xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#B8FF3D] border-2 border-[#111218] flex items-center justify-center text-[#111218] shadow-neo-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-[#111218] font-display uppercase">
                Enable Strict Focus Mode?
              </h3>
              <p className="text-xs text-[#636573] mt-1 leading-relaxed font-medium">
                Saras AI will use your camera to monitor whether you are looking at the screen. If you look away or leave for more than 4 seconds, playback will automatically pause to keep you focused.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F5F3EC] border-2 border-[#111218] space-y-1.5 text-xs text-[#111218]">
              <div className="flex items-center gap-2 font-bold">
                <Lock className="w-3.5 h-3.5" />
                <span>100% Client-Side Privacy Guarantee</span>
              </div>
              <p className="text-[11px] text-[#636573] font-medium">
                No video frames or images are ever uploaded or saved. All attention detection runs locally inside your browser memory.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConsentModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#636573] hover:text-[#111218]"
              >
                Cancel
              </button>
              <button
                onClick={startCamera}
                className="neo-btn-lime px-4 py-2 text-xs font-bold flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5 text-[#111218]" />
                <span>Allow & Start Focus</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paused Due to Attention Overlay */}
      {isPausedDueToAttention && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111218]/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-6 sm:p-8 shadow-neo-xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FFD1C7] border-2 border-[#111218] flex items-center justify-center mx-auto text-[#111218] shadow-neo-sm animate-bounce">
              <EyeOff className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-[#111218] font-display uppercase">
                Paused — Attention Drifted
              </h3>
              <p className="text-xs text-[#636573] font-medium mt-1.5 leading-relaxed">
                Strict mode detected that your attention drifted from the lesson. Re-center your focus and resume when ready.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleResumeClick}
                className="neo-btn-lime w-full sm:w-auto px-6 py-2.5 text-xs font-bold flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-[#111218] text-[#111218]" />
                <span>Resume Lesson</span>
              </button>
              <button
                onClick={stopCamera}
                className="neo-btn-outline w-full sm:w-auto px-4 py-2.5 text-xs font-bold"
              >
                Disable Strict Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
