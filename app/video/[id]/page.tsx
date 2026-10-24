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
} from 'lucide-react';
import NextLink from 'next/link';
import { ProjectRoadmapView } from '@/components/projects/ProjectRoadmapView';
import { SmartNotesView } from '@/components/notes/SmartNotesView';

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
  const [activeTab, setActiveTab] = useState<'segments' | 'notes' | 'flashcards' | 'quiz_bank' | 'projects'>('segments');
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [revealedQuizIds, setRevealedQuizIds] = useState<Set<string>>(new Set());

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
      console.error('Failed to delete card:', e);
    }
  };

  const [isRegeneratingCards, setIsRegeneratingCards] = useState(false);

  const handleRegenerateFlashcards = async () => {
    if (!video) return;
    setIsRegeneratingCards(true);
    try {
      const res = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerate',
          videoId: video.id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setVideo({
          ...video,
          flashcards: data.flashcards || [],
        });
      }
    } catch (e) {
      console.error('Failed to regenerate flashcards:', e);
    } finally {
      setIsRegeneratingCards(false);
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

      {/* Segmented Player */}
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
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold font-display uppercase transition-all ${
              activeTab === 'notes'
                ? 'bg-[#B8FF3D] text-[#111218] border-2 border-[#111218] shadow-neo-sm'
                : 'text-[#111218] hover:bg-[#F5F3EC]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Smart Notes 📝</span>
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
                    {isCompleted && (
                      <span className="badge-lime px-2 py-0.2 text-[9px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-[#111218]" /> Cleared
                      </span>
                    )}
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

        {/* Tab Content 2: Flashcards */}
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
                  placeholder="Back: Definition or recall answer..."
                  className="bg-[#FFFDF7] border-2 border-[#111218] rounded-xl px-3.5 py-2 text-xs font-medium text-[#111218] placeholder-slate-400 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleRegenerateFlashcards}
                  disabled={isRegeneratingCards}
                  className="neo-btn-outline inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold disabled:opacity-40"
                  title="Regenerate all flashcards strictly from the video transcript"
                >
                  <RotateCw className={`w-3.5 h-3.5 text-[#111218] ${isRegeneratingCards ? 'animate-spin' : ''}`} />
                  <span>{isRegeneratingCards ? 'Regenerating...' : 'Regenerate from Transcript'}</span>
                </button>

                <button
                  type="submit"
                  disabled={isAddingCard || !newCardFront.trim() || !newCardBack.trim()}
                  className="neo-btn-lime px-4 py-1.5 text-xs font-bold disabled:opacity-40"
                >
                  {isAddingCard ? 'Saving...' : 'Save Card'}
                </button>
              </div>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {video.flashcards.map((card) => (
                <div
                  key={card.id}
                  className={`p-4 rounded-2xl border-2 border-[#111218] flex flex-col justify-between space-y-3 shadow-neo-sm ${
                    card.mastered ? 'bg-[#F7FDF0] border-[#8ECC24]' : 'bg-[#FFFDF7]'
                  }`}
                >
                  <div className="space-y-1.5">
                    <span className="badge-black px-1.5 py-0.2 text-[8px] uppercase tracking-widest font-mono">
                      Concept
                    </span>
                    <p className="text-xs font-extrabold text-[#111218] font-display">{card.front}</p>
                    <div className="border-t-2 border-[#111218]/10 pt-2 mt-2">
                      <span className="badge-lime px-1.5 py-0.2 text-[8px] uppercase tracking-widest font-mono">
                        Recall
                      </span>
                      <p className="text-xs text-[#21232C] mt-1 font-medium leading-relaxed">{card.back}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t-2 border-[#111218]/10">
                    <button
                      onClick={() => handleToggleCardMastered(card.id, card.mastered)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold font-display transition-all ${
                        card.mastered
                          ? 'bg-[#B8FF3D] text-[#111218] border-2 border-[#111218] shadow-neo-sm'
                          : 'bg-[#F5F3EC] text-[#111218] border-2 border-[#111218]'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#111218]" />
                      {card.mastered ? 'Mastered' : 'Mark Mastered'}
                    </button>

                    <button
                      onClick={() => handleDeleteCard(card.id)}
                      className="p-1.5 text-[#636573] hover:text-rose-600 rounded-lg hover:bg-[#F5F3EC] transition-colors"
                      title="Delete card"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content 3: Checkpoint Review */}
        {activeTab === 'quiz_bank' && (
          <div className="space-y-4">
            {video.segments.map((seg, sIdx) => {
              const isCompleted = completedIds.includes(seg.id);

              if (!isCompleted) {
                return (
                  <div
                    key={seg.id}
                    className="p-4 rounded-2xl bg-[#EAE6DB] border-2 border-[#111218]/40 flex items-center justify-between opacity-70"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#FFFDF7] border-2 border-[#111218]/40 flex items-center justify-center text-[#636573]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#636573]">
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
                    <h4 className="text-xs font-extrabold text-[#111218] font-display">{seg.title}</h4>
                  </div>

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
                </div>
              );
            })}
          </div>
        )}

        {/* Tab Content 2: Smart Notes */}
        {activeTab === 'notes' && (
          <div className="pt-2">
            <SmartNotesView videoId={video.id} videoTitle={video.title} />
          </div>
        )}

        {/* Tab Content 4: Build Project Roadmap */}
        {activeTab === 'projects' && (
          <div className="pt-2">
            <ProjectRoadmapView videoId={video.id} videoTitle={video.title} />
          </div>
        )}
      </div>
    </div>
  );
}
