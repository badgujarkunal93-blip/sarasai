'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  SegmentedPlayer,
  SegmentItem,
} from '@/components/player/SegmentedPlayer';
import {
  Sparkles,
  Layers,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Share2,
  RotateCw,
  Plus,
  Trash2,
  Loader2,
  HelpCircle,
  Eye,
  Lock,
  Hammer,
  ArrowRight,
  FileText,
  Network,
} from 'lucide-react';
import NextLink from 'next/link';
import { ProjectRoadmapView } from '@/components/projects/ProjectRoadmapView';
import { SmartNotesView } from '@/components/notes/SmartNotesView';
import { MermaidViewer } from '@/components/diagrams/MermaidViewer';
import { convertFlowchartToMermaid, convertMindMapToMermaid } from '@/lib/diagrams';

interface VideoDetail {
  id: string;
  youtube_video_id: string;
  title: string;
  channel: string;
  duration_seconds: number;
  thumbnail_url?: string;
  status: string;
  error_reason?: string | null;
  segments: SegmentItem[];
  flashcards: {
    id: string;
    front: string;
    back: string;
    mastered: boolean;
  }[];
  userProgress?: {
    current_segment_index: number;
    completed_segment_ids: string;
  };
}

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;

  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'segments' | 'diagrams' | 'notes' | 'flashcards' | 'quiz_bank' | 'projects'>('segments');
  const [selectedDiagramIndex, setSelectedDiagramIndex] = useState(0);
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [revealedQuizIds, setRevealedQuizIds] = useState<Set<string>>(new Set());
  const [isSegmentGenerating, setIsSegmentGenerating] = useState(false);

  const toggleQuizReveal = (qId: string) => {
    setRevealedQuizIds((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const fetchVideo = async () => {
    try {
      const res = await fetch(`/api/videos/${videoId}`);
      if (res.ok) {
        const data = await res.json();
        setVideo(data.video);
      } else {
        setVideo(null);
      }
    } catch (e) {
      console.error('Failed to load video:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (videoId) fetchVideo();
  }, [videoId]);

  // Progressive generation poller for currently viewed segment if not ready
  useEffect(() => {
    if (!video || !video.segments || video.segments.length === 0) return;
    const currentSeg = video.segments[selectedDiagramIndex];
    if (!currentSeg) return;

    if (currentSeg.generation_status === 'pending' || currentSeg.generation_status === 'generating') {
      setIsSegmentGenerating(true);
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/segments/${currentSeg.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.segment && data.segment.generation_status === 'ready') {
              setVideo((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  segments: prev.segments.map((s) =>
                    s.id === data.segment.id ? { ...s, ...data.segment } : s
                  ),
                };
              });
              setIsSegmentGenerating(false);
              clearInterval(interval);
            }
          }
        } catch (err) {
          console.warn('[SEGMENT POLL ERROR]:', err);
        }
      }, 2000);

      return () => clearInterval(interval);
    } else {
      setIsSegmentGenerating(false);
    }
  }, [video, selectedDiagramIndex]);

  const handleToggleCardMastered = async (cardId: string, current: boolean) => {
    if (!video) return;
    setVideo({
      ...video,
      flashcards: video.flashcards.map((f) =>
        f.id === cardId ? { ...f, mastered: !current } : f
      ),
    });

    try {
      await fetch('/api/flashcards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cardId, mastered: !current }),
      });
    } catch (e) {
      console.error('Failed to update flashcard:', e);
    }
  };

  const handleAddFlashcard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardFront.trim() || !newCardBack.trim() || !video) return;

    setIsAddingCard(true);
    try {
      const res = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: video.id,
          front: newCardFront.trim(),
          back: newCardBack.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setVideo({
          ...video,
          flashcards: [data.flashcard, ...video.flashcards],
        });
        setNewCardFront('');
        setNewCardBack('');
      }
    } catch (e) {
      console.error('Failed to add card:', e);
    } finally {
      setIsAddingCard(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!video) return;
    setVideo({
      ...video,
      flashcards: video.flashcards.filter((f) => f.id !== cardId),
    });

    try {
      await fetch(`/api/flashcards?id=${cardId}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Failed to delete flashcard:', e);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-[#636573]">
        <Loader2 className="w-6 h-6 animate-spin text-[#111218]" />
        <p className="text-xs font-bold font-display uppercase">Loading lesson workspace...</p>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="bg-[#FFFDF7] border-2 border-[#111218] p-10 rounded-3xl text-center space-y-4 shadow-neo max-w-lg mx-auto my-12">
        <h2 className="text-lg font-extrabold text-[#111218] font-display uppercase">Lesson Not Found</h2>
        <p className="text-xs text-[#636573] font-medium">The requested video course could not be loaded.</p>
        <NextLink
          href="/discover"
          className="neo-btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs font-bold"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#B8FF3D]" />
          Back to Dashboard
        </NextLink>
      </div>
    );
  }

  let completedIds: string[] = [];
  try {
    completedIds = JSON.parse(video.userProgress?.completed_segment_ids || '[]');
  } catch {
    completedIds = [];
  }

  const activeSegment = video.segments[selectedDiagramIndex] || video.segments[0];

  // Parse diagram Mermaid strings from cached JSON
  let flowchartMermaid = 'graph TD\n  empty["No process flowchart available"]';
  let mindmapMermaid = 'mindmap\n  root((Topic Overview))';

  if (activeSegment?.flowchart_json) {
    try {
      const parsedFlowchart = JSON.parse(activeSegment.flowchart_json);
      flowchartMermaid = convertFlowchartToMermaid(parsedFlowchart);
    } catch {
      // fallback
    }
  }

  if (activeSegment?.mindmap_json) {
    try {
      const parsedMindmap = JSON.parse(activeSegment.mindmap_json);
      mindmapMermaid = convertMindMapToMermaid(parsedMindmap);
    } catch {
      // fallback
    }
  }

  const providerType = (activeSegment?.llm_provider === 'cloud' ? 'cloud' : 'local') as 'local' | 'cloud';

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between pb-2">
        <NextLink
          href="/discover"
          className="neo-btn-outline inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Catalog</span>
        </NextLink>

        <span className="badge-black px-2.5 py-1 text-[11px] font-mono font-bold">
          ID: {video.youtube_video_id}
        </span>
      </div>

      {/* Lesson Title */}
      <div className="space-y-1">
        <span className="badge-lime px-2.5 py-0.5 text-[10px] font-extrabold uppercase font-display">
          {video.channel}
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111218] font-display uppercase tracking-tight pt-1">
          {video.title}
        </h1>
      </div>

      {/* Segmented Player - Seek-Lock and Quiz Gating 100% Intact */}
      <SegmentedPlayer
        videoId={video.id}
        youtubeVideoId={video.youtube_video_id}
        title={video.title}
        channel={video.channel}
        durationSeconds={video.duration_seconds}
        segments={video.segments}
        initialSegmentIndex={video.userProgress?.current_segment_index || 0}
        initialCompletedSegmentIds={completedIds}
      />

      {/* Turn This Lesson Into A Hands-on Project Banner */}
      <div className="bg-[#E9DFFF] border-2 border-[#111218] rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-neo">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#B8FF3D] border-2 border-[#111218] flex items-center justify-center flex-shrink-0 shadow-neo-sm">
            <Hammer className="w-5 h-5 text-[#111218]" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black font-display uppercase text-[#111218]">
              Turn This Lesson Into A Hands-on Project
            </h4>
            <p className="text-xs text-[#21232C] font-medium">
              Apply concepts taught in this video to a structured implementation roadmap.
            </p>
          </div>
        </div>
        <button
          onClick={() => setActiveTab('projects')}
          className="neo-btn-primary px-4 py-2.5 text-xs font-bold font-display flex items-center gap-2 flex-shrink-0 shadow-neo-sm"
        >
          <span>Build Something With This</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#B8FF3D]" />
        </button>
      </div>

      {/* Tabs Container */}
      <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-5 sm:p-6 space-y-6 shadow-neo">
        <div className="flex items-center gap-2 border-b-2 border-[#111218]/10 pb-3.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('segments')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold font-display uppercase transition-all ${
              activeTab === 'segments'
                ? 'bg-[#B8FF3D] text-[#111218] border-2 border-[#111218] shadow-neo-sm'
                : 'text-[#111218] hover:bg-[#F5F3EC]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Chapter Summaries ({video.segments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('diagrams')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold font-display uppercase transition-all ${
              activeTab === 'diagrams'
                ? 'bg-[#B8FF3D] text-[#111218] border-2 border-[#111218] shadow-neo-sm'
                : 'text-[#111218] hover:bg-[#F5F3EC]'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Diagrams (Gemma 4)</span>
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold font-display uppercase transition-all ${
              activeTab === 'notes'
                ? 'bg-[#B8FF3D] text-[#111218] border-2 border-[#111218] shadow-neo-sm'
                : 'text-[#111218] hover:bg-[#F5F3EC]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Smart Notes & Slides 📝</span>
          </button>

          <button
            onClick={() => setActiveTab('flashcards')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold font-display uppercase transition-all ${
              activeTab === 'flashcards'
                ? 'bg-[#B8FF3D] text-[#111218] border-2 border-[#111218] shadow-neo-sm'
                : 'text-[#111218] hover:bg-[#F5F3EC]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Flashcards ({video.flashcards.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('quiz_bank')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold font-display uppercase transition-all ${
              activeTab === 'quiz_bank'
                ? 'bg-[#B8FF3D] text-[#111218] border-2 border-[#111218] shadow-neo-sm'
                : 'text-[#111218] hover:bg-[#F5F3EC]'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Checkpoint Review</span>
          </button>

          <button
            onClick={() => setActiveTab('projects')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold font-display uppercase transition-all ${
              activeTab === 'projects'
                ? 'bg-[#B8FF3D] text-[#111218] border-2 border-[#111218] shadow-neo-sm'
                : 'text-[#111218] hover:bg-[#F5F3EC]'
            }`}
          >
            <Hammer className="w-3.5 h-3.5" />
            <span>Build Project</span>
          </button>
        </div>

        {/* Tab Content 1: Chapter Summaries */}
        {activeTab === 'segments' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {video.segments.map((seg, idx) => {
              const isCompleted = completedIds.includes(seg.id);
              const isPending = seg.generation_status === 'pending' || seg.generation_status === 'generating';

              return (
                <div
                  key={seg.id}
                  className={`p-4 rounded-2xl border-2 border-[#111218] transition-all flex flex-col justify-between ${
                    isCompleted
                      ? 'bg-[#DDF6BD] shadow-neo-sm'
                      : 'bg-[#F5F3EC] shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="badge-black px-2 py-0.2 text-[9px] font-mono font-bold">
                      Part {idx + 1}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isPending && (
                        <span className="px-2 py-0.2 text-[9px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 animate-pulse">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" /> In Background
                        </span>
                      )}
                      {isCompleted && (
                        <span className="badge-lime px-2 py-0.2 text-[9px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-[#111218]" /> Cleared
                        </span>
                      )}
                    </div>
                  </div>
                  <h4 className="text-xs font-extrabold text-[#111218] font-display">{seg.title}</h4>
                  <p className="text-xs text-[#21232C] mt-1.5 leading-relaxed font-medium">
                    {seg.summary || 'Summary generated for this chapter.'}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab Content 2: Visual Diagrams (Flowchart & Mind Map with Gemma 4) */}
        {activeTab === 'diagrams' && (
          <div className="space-y-6">
            {/* Chapter Selection Bar */}
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-[#111218]/10 overflow-x-auto">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#111218] mr-1 uppercase font-display">Chapter:</span>
                {video.segments.map((seg, idx) => (
                  <button
                    key={seg.id}
                    onClick={() => setSelectedDiagramIndex(idx)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold font-display whitespace-nowrap transition-all ${
                      selectedDiagramIndex === idx
                        ? 'bg-[#111218] text-white shadow-neo-sm'
                        : 'bg-[#F5F3EC] text-[#111218] border border-[#111218]/20 hover:bg-[#EAE8E0]'
                    }`}
                  >
                    Part {idx + 1}
                  </button>
                ))}
              </div>

              {/* Provider Badge */}
              <div className="flex-shrink-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono border-2 border-[#111218] bg-[#DDF6BD] text-[#111218] shadow-neo-sm">
                  <Sparkles className="w-3 h-3 text-[#111218]" />
                  <span>Powered by Gemma 4 ({providerType})</span>
                </span>
              </div>
            </div>

            {/* Skeleton Loader if chapter still generating */}
            {activeSegment?.generation_status === 'pending' || activeSegment?.generation_status === 'generating' || isSegmentGenerating ? (
              <div className="space-y-4 p-6 bg-[#FAF8F2] border-2 border-[#111218] rounded-2xl animate-pulse">
                <div className="flex items-center gap-2 text-xs font-bold text-[#111218]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#111218]" />
                  <span>Generating chapter flowchart and mind map with Gemma 4...</span>
                </div>
                <div className="h-44 bg-white/70 rounded-xl border border-[#111218]/10"></div>
                <div className="h-44 bg-white/70 rounded-xl border border-[#111218]/10"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {/* 1. Process Flowchart */}
                <MermaidViewer
                  title={`${activeSegment?.title || 'Chapter'} - Process Flowchart`}
                  chartDefinition={flowchartMermaid}
                  type="flowchart"
                  providerBadge={{
                    provider: providerType,
                    model: activeSegment?.llm_provider === 'cloud' ? 'gemma-4-26b-a4b-it' : 'gemma4:e4b',
                  }}
                />

                {/* 2. Conceptual Mind Map */}
                <MermaidViewer
                  title={`${activeSegment?.title || 'Chapter'} - Conceptual Mind Map`}
                  chartDefinition={mindmapMermaid}
                  type="mindmap"
                  providerBadge={{
                    provider: providerType,
                    model: activeSegment?.llm_provider === 'cloud' ? 'gemma-4-26b-a4b-it' : 'gemma4:e4b',
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Tab Content 3: Smart Notes & Slide Upload */}
        {activeTab === 'notes' && (
          <div className="pt-2">
            <SmartNotesView
              videoId={video.id}
              videoTitle={video.title}
              activeSegmentId={activeSegment?.id}
              activeSegmentTitle={activeSegment?.title}
            />
          </div>
        )}

        {/* Tab Content 4: Flashcards */}
        {activeTab === 'flashcards' && (
          <div className="space-y-5">
            {/* Quick Add Custom Card */}
            <form
              onSubmit={handleAddFlashcard}
              className="p-4 rounded-2xl bg-[#F5F3EC] border-2 border-[#111218] space-y-3 shadow-neo-sm"
            >
              <span className="text-xs font-extrabold text-[#111218] font-display uppercase flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-[#111218]" /> Add Custom Recall Card
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newCardFront}
                  onChange={(e) => setNewCardFront(e.target.value)}
                  placeholder="Front: Concept or question..."
                  className="bg-[#FFFDF7] border-2 border-[#111218] rounded-xl px-3.5 py-2 text-xs font-medium text-[#111218] placeholder-slate-400 focus:outline-none"
                />
                <input
                  type="text"
                  value={newCardBack}
                  onChange={(e) => setNewCardBack(e.target.value)}
                  placeholder="Back: Answer or mechanism..."
                  className="bg-[#FFFDF7] border-2 border-[#111218] rounded-xl px-3.5 py-2 text-xs font-medium text-[#111218] placeholder-slate-400 focus:outline-none"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isAddingCard || !newCardFront.trim() || !newCardBack.trim()}
                  className="neo-btn-primary px-4 py-2 text-xs font-bold font-display uppercase disabled:opacity-50"
                >
                  {isAddingCard ? 'Adding...' : 'Add Flashcard'}
                </button>
              </div>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {video.flashcards.map((card) => (
                <div
                  key={card.id}
                  className={`p-4 rounded-2xl border-2 border-[#111218] flex flex-col justify-between space-y-3 shadow-neo-sm transition-all ${
                    card.mastered ? 'bg-[#DDF6BD]' : 'bg-[#FFFDF7]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[#636573]">
                      <span>Active Recall Card</span>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Delete card"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs font-black font-display text-[#111218]">
                      Q: {card.front}
                    </p>
                    <p className="text-xs text-[#21232C] font-medium leading-relaxed pt-1 border-t border-[#111218]/15">
                      A: {card.back}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] font-mono font-bold text-[#636573]">
                      {card.mastered ? '✓ Mastered' : '○ Reviewing'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleCardMastered(card.id, card.mastered)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border border-[#111218] transition-colors ${
                        card.mastered
                          ? 'bg-white text-[#111218]'
                          : 'bg-[#B8FF3D] text-[#111218] hover:bg-[#A6F024]'
                      }`}
                    >
                      {card.mastered ? 'Mark as Unmastered' : 'Mark as Mastered'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content 5: Checkpoint Review (4 Questions per Segment) */}
        {activeTab === 'quiz_bank' && (
          <div className="space-y-6">
            {video.segments.map((seg, sIdx) => {
              const isCleared = completedIds.includes(seg.id);
              const isPending = seg.generation_status === 'pending' || seg.generation_status === 'generating';

              if (!isCleared) {
                return (
                  <div
                    key={seg.id}
                    className="p-5 rounded-2xl bg-[#F5F3EC] border-2 border-dashed border-[#111218]/30 flex items-center justify-between opacity-80"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#111218]/10 flex items-center justify-center">
                        <Lock className="w-4 h-4 text-[#636573]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="badge-black px-2 py-0.2 text-[9px] font-mono font-bold">
                            Part {sIdx + 1}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#FFFDF7] border border-[#111218]/30 font-bold text-[#636573]">
                            Locked Checkpoint
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-[#111218] mt-0.5 font-display">{seg.title}</h4>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-[#636573] font-bold flex items-center gap-1.5 justify-end">
                        <Lock className="w-3 h-3" /> Gated until passed
                      </span>
                    </div>
                  </div>
                );
              }

              return (
                <div key={seg.id} className="p-5 rounded-2xl bg-[#FFFDF7] border-2 border-[#111218] space-y-4 shadow-neo-sm">
                  <div className="flex items-center justify-between border-b-2 border-[#111218]/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="badge-black px-2 py-0.2 text-[9px] font-mono font-bold">
                        Part {sIdx + 1}
                      </span>
                      <span className="badge-lime px-2 py-0.2 text-[9px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-[#111218]" /> Checkpoint Cleared
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-[#DDF6BD] border border-[#111218]">
                        Powered by Gemma 4
                      </span>
                      <h4 className="text-xs font-extrabold text-[#111218] font-display">{seg.title}</h4>
                    </div>
                  </div>

                  {isPending ? (
                    <div className="p-4 bg-[#FAF8F2] rounded-xl border border-[#111218]/20 animate-pulse space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#111218]">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating 4 checkpoint questions with Gemma 4...</span>
                      </div>
                      <div className="h-10 bg-white rounded border border-[#111218]/10"></div>
                      <div className="h-10 bg-white rounded border border-[#111218]/10"></div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {seg.quiz_questions?.map((q, qIdx) => {
                        const isRevealed = revealedQuizIds.has(q.id || `${sIdx}-${qIdx}`);
                        return (
                          <div
                            key={q.id || qIdx}
                            className="p-4 rounded-xl bg-[#F5F3EC] border-2 border-[#111218] space-y-2.5 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-xs font-extrabold text-[#111218] font-display">
                                Q{qIdx + 1}: {q.question}
                              </p>
                              <button
                                type="button"
                                onClick={() => toggleQuizReveal(q.id || `${sIdx}-${qIdx}`)}
                                className="text-[11px] font-bold text-[#111218] hover:underline flex-shrink-0"
                              >
                                {isRevealed ? 'Hide Explanation' : 'Show Answer & Explanation'}
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                              {q.options.map((opt, oIdx) => {
                                const isCorrect = opt.trim() === q.correct_answer.trim();
                                return (
                                  <div
                                    key={oIdx}
                                    className={`p-2.5 rounded-lg border-2 font-medium transition-colors ${
                                      isRevealed && isCorrect
                                        ? 'bg-[#B8FF3D] border-[#111218] text-[#111218] font-bold shadow-sm'
                                        : 'bg-[#FFFDF7] border-[#111218]/30 text-[#111218]'
                                    }`}
                                  >
                                    {opt} {isRevealed && isCorrect && ' ✓ (Correct)'}
                                  </div>
                                );
                              })}
                            </div>

                            {isRevealed && q.explanation && (
                              <div className="p-3 rounded-lg bg-[#E9DFFF] border-2 border-[#111218] text-[11px] text-[#111218] font-medium mt-2">
                                <span className="font-bold">Explanation: </span>
                                {q.explanation}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tab Content 6: Build Project Roadmap */}
        {activeTab === 'projects' && (
          <div className="pt-2">
            <ProjectRoadmapView videoId={video.id} videoTitle={video.title} />
          </div>
        )}
      </div>
    </div>
  );
}
