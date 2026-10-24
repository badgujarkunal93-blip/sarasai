'use client';

import React, { useEffect } from 'react';
import NextLink from 'next/link';
import {
  X,
  Zap,
  BookOpen,
  Layers,
  Clock,
  Play,
  ArrowRight,
  ExternalLink,
  Award,
  TrendingUp,
  Brain,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { LayoutNode } from '@/lib/services/knowledgeLayout';
import { formatTime } from '@/lib/utils';

interface ConceptDetailDrawerProps {
  node: LayoutNode | null;
  allNodes: LayoutNode[];
  onClose: () => void;
  onSelectConcept: (node: LayoutNode) => void;
}

export function ConceptDetailDrawer({
  node,
  allNodes,
  onClose,
  onSelectConcept,
}: ConceptDetailDrawerProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!node) return null;

  // Find related nodes in the same category or related
  const relatedConcepts = allNodes
    .filter((n) => n.id !== node.id && n.category === node.category)
    .slice(0, 4);

  const getStatusColor = () => {
    switch (node.mastery_state) {
      case 'MASTERED':
        return {
          bg: 'bg-[#B8FF3D]',
          text: 'text-[#111218]',
          badge: 'bg-[#111218] text-[#B8FF3D]',
          border: 'border-[#111218]',
          label: 'Mastered',
        };
      case 'DEVELOPING':
        return {
          bg: 'bg-[#E9DFFF]',
          text: 'text-[#111218]',
          badge: 'bg-[#111218] text-white',
          border: 'border-[#111218]',
          label: 'Developing',
        };
      case 'WEAK':
        return {
          bg: 'bg-[#FFD1C7]',
          text: 'text-red-950',
          badge: 'bg-red-950 text-white',
          border: 'border-red-950',
          label: 'Needs Review',
        };
      default:
        return {
          bg: 'bg-[#FFFDF7]',
          text: 'text-[#636573]',
          badge: 'bg-[#EAE6DB] text-[#636573]',
          border: 'border-[#111218]/40',
          label: 'Not Studied',
        };
    }
  };

  const status = getStatusColor();

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#FFFDF7] border-l-2 border-[#111218] shadow-[-10px_0px_30px_rgba(0,0,0,0.15)] flex flex-col justify-between animate-in slide-in-from-right duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Header with Close Button */}
      <div className="p-6 border-b-2 border-[#111218] bg-[#F5F3EC] flex items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="badge-black px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider font-mono">
              {node.category}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono ${status.badge}`}
            >
              {status.label}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black font-display uppercase tracking-tight text-[#111218] leading-tight">
            {node.name}
          </h2>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-xl border-2 border-[#111218] bg-[#FFFDF7] hover:bg-[#FFD1C7] text-[#111218] transition-colors shadow-neo-sm flex-shrink-0"
          title="Close details (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Scrollable Body Content */}
      <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
        {/* Mastery Overview Card */}
        <div className="p-4 rounded-2xl bg-[#FFFDF7] border-2 border-[#111218] shadow-neo-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#636573] uppercase tracking-wider font-display">
              Mastery Progress
            </span>
            <span className="text-lg font-black font-display text-[#111218]">
              {node.mastery_score}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-[#F5F3EC] border border-[#111218] rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                node.mastery_state === 'MASTERED'
                  ? 'bg-[#B8FF3D]'
                  : node.mastery_state === 'DEVELOPING'
                  ? 'bg-[#E9DFFF]'
                  : node.mastery_state === 'WEAK'
                  ? 'bg-[#FFD1C7]'
                  : 'bg-[#EAE6DB]'
              }`}
              style={{ width: `${Math.max(4, node.mastery_score)}%` }}
            />
          </div>

          {/* Metric Tiles */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="p-2 rounded-xl bg-[#F5F3EC] border border-[#111218]/30">
              <span className="text-[10px] text-[#636573] block font-mono">Exposures</span>
              <span className="text-sm font-extrabold text-[#111218] font-display">
                {node.exposure_count}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-[#F5F3EC] border border-[#111218]/30">
              <span className="text-[10px] text-emerald-800 block font-mono">Correct</span>
              <span className="text-sm font-extrabold text-emerald-900 font-display">
                {node.correct_count}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-[#F5F3EC] border border-[#111218]/30">
              <span className="text-[10px] text-red-800 block font-mono">Incorrect</span>
              <span className="text-sm font-extrabold text-red-900 font-display">
                {node.wrong_count}
              </span>
            </div>
          </div>
        </div>

        {/* Concept Definition & Summary */}
        <div className="space-y-2">
          <h4 className="text-[11px] font-bold text-[#636573] uppercase tracking-wider font-display">
            Core Concept Definition
          </h4>
          <p className="p-3.5 rounded-2xl bg-[#F5F3EC] border-2 border-[#111218] text-[#21232C] leading-relaxed font-medium">
            {node.description ||
              `Fundamental topic in ${node.category}. Synthesized and tracked across your video lessons and checkpoint quizzes.`}
          </p>
        </div>

        {/* Learned From: Video Lessons with Timestamps */}
        {node.source_videos && node.source_videos.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-[#636573] uppercase tracking-wider font-display">
              Learned From Video Lessons
            </h4>
            <div className="space-y-2">
              {node.source_videos.map((vid, idx) => (
                <NextLink
                  key={idx}
                  href={`/video/${vid.youtube_video_id || vid.id}${
                    vid.start_seconds ? `?t=${Math.floor(vid.start_seconds)}` : ''
                  }`}
                  className="p-3 rounded-2xl bg-[#FFFDF7] border-2 border-[#111218] flex items-center justify-between gap-3 shadow-neo-sm hover:-translate-y-0.5 transition-all group"
                >
                  <div className="min-w-0 space-y-0.5">
                    <h5 className="font-bold text-[#111218] truncate group-hover:text-black">
                      {vid.title}
                    </h5>
                    <div className="flex items-center gap-2 text-[10px] text-[#636573] font-mono">
                      <span>{vid.channel}</span>
                      {vid.start_seconds !== undefined && (
                        <span>· At {formatTime(vid.start_seconds)}</span>
                      )}
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-[#B8FF3D] border border-[#111218] flex items-center justify-center flex-shrink-0">
                    <Play className="w-3.5 h-3.5 text-[#111218] fill-[#111218]" />
                  </div>
                </NextLink>
              ))}
            </div>
          </div>
        )}

        {/* Connected Concepts within Domain */}
        {relatedConcepts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-[#636573] uppercase tracking-wider font-display">
              Connected Domain Concepts
            </h4>
            <div className="flex flex-wrap gap-2">
              {relatedConcepts.map((rel) => (
                <button
                  key={rel.id}
                  onClick={() => onSelectConcept(rel)}
                  className="px-3 py-1.5 rounded-xl bg-[#F5F3EC] border-2 border-[#111218] text-xs font-bold text-[#111218] hover:bg-[#B8FF3D] transition-colors shadow-neo-sm"
                >
                  {rel.name} →
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Action Footer CTAs */}
      <div className="p-6 border-t-2 border-[#111218] bg-[#F5F3EC] space-y-2">
        <NextLink
          href="/revision"
          className="neo-btn-primary w-full py-2.5 text-xs font-bold font-display uppercase flex items-center justify-center gap-2 shadow-neo-sm"
        >
          <Zap className="w-4 h-4 text-[#B8FF3D]" />
          <span>Revise In AI Session →</span>
        </NextLink>

        <NextLink
          href="/flashcards"
          className="neo-btn-outline w-full py-2.5 text-xs font-bold font-display uppercase flex items-center justify-center gap-2"
        >
          <Layers className="w-4 h-4 text-[#111218]" />
          <span>Practice Flashcards</span>
        </NextLink>
      </div>
    </div>
  );
}
