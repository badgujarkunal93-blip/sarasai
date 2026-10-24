'use client';

import React, { useState, useEffect, useMemo } from 'react';
import NextLink from 'next/link';
import {
  Layers,
  Sparkles,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Search,
  Trash2,
  BookOpen,
  Eye,
  EyeOff,
  RotateCw,
  X,
  ArrowRight,
  SlidersHorizontal,
  Flame,
  HelpCircle,
  ArrowUpRight,
} from 'lucide-react';

interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  mastered: boolean;
  video_id: string;
  video: {
    id: string;
    title: string;
    channel: string;
    thumbnail_url?: string;
  };
}

export default function FlashcardsStudioPage() {
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unmastered' | 'mastered'>('all');
  const [selectedVideo, setSelectedVideo] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'mastered' | 'unmastered'>('newest');

  // Study Mode State
  const [studyMode, setStudyMode] = useState(false);
  const [studyIndex, setStudyIndex] = useState(0);
  const [studyRevealed, setStudyRevealed] = useState(false);

  // In-grid individual revealed answers tracker
  const [revealedCardIds, setRevealedCardIds] = useState<Set<string>>(new Set());

  const fetchCards = async () => {
    try {
      const res = await fetch('/api/flashcards');
      if (res.ok) {
        const data = await res.json();
        setCards(data.flashcards || []);
      }
    } catch (e) {
      console.error('Failed to fetch flashcards:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleToggleMastered = async (cardId: string, current: boolean) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, mastered: !current } : c))
    );

    try {
      await fetch('/api/flashcards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cardId, mastered: !current }),
      });
    } catch (e) {
      console.error('Failed to toggle card:', e);
      fetchCards();
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Are you sure you want to delete this recall card?')) return;
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    try {
      await fetch(`/api/flashcards?id=${cardId}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Failed to delete card:', e);
      fetchCards();
    }
  };

  const toggleRevealCard = (id: string) => {
    setRevealedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Keyboard navigation for Study Mode
  useEffect(() => {
    if (!studyMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setStudyRevealed((prev) => !prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNextStudyCard();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrevStudyCard();
      } else if (e.code === 'Escape') {
        setStudyMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [studyMode, studyIndex, cards.length]);

  const uniqueVideos = useMemo(() => {
    const map = new Map<string, string>();
    cards.forEach((c) => {
      if (c.video?.id && c.video?.title) {
        map.set(c.video.id, c.video.title);
      }
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [cards]);

  const filteredCards = useMemo(() => {
    return cards
      .filter((c) => {
        if (filter === 'mastered' && !c.mastered) return false;
        if (filter === 'unmastered' && c.mastered) return false;
        if (selectedVideo !== 'all' && c.video_id !== selectedVideo) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchFront = c.front.toLowerCase().includes(q);
          const matchBack = c.back.toLowerCase().includes(q);
          const matchSource = c.video?.title?.toLowerCase().includes(q);
          if (!matchFront && !matchBack && !matchSource) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'mastered') return Number(b.mastered) - Number(a.mastered);
        if (sortBy === 'unmastered') return Number(a.mastered) - Number(b.mastered);
        return 0;
      });
  }, [cards, filter, selectedVideo, searchQuery, sortBy]);

  const masteredCount = cards.filter((c) => c.mastered).length;
  const toReviewCount = cards.length - masteredCount;

  const currentStudyCard = filteredCards[studyIndex] || filteredCards[0];

  const handleNextStudyCard = () => {
    setStudyRevealed(false);
    setStudyIndex((prev) => (prev < filteredCards.length - 1 ? prev + 1 : 0));
  };

  const handlePrevStudyCard = () => {
    setStudyRevealed(false);
    setStudyIndex((prev) => (prev > 0 ? prev - 1 : filteredCards.length - 1));
  };

  const handleStudyResponse = async (status: 'forgot' | 'hard' | 'got_it') => {
    if (!currentStudyCard) return;
    if (status === 'got_it' && !currentStudyCard.mastered) {
      await handleToggleMastered(currentStudyCard.id, false);
    } else if (status === 'forgot' && currentStudyCard.mastered) {
      await handleToggleMastered(currentStudyCard.id, true);
    }
    handleNextStudyCard();
  };

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      {/* ─────────────────────────────────────────────────────────────
          1. NEO-BRUTALIST EDITORIAL HEADER & DECK INDICATOR
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-[#111218]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="badge-lime px-2.5 py-0.5 text-xs font-bold uppercase font-display">
              Active Recall
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111218] font-display uppercase tracking-tight">
              Flashcards Studio
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#636573] font-medium">
            Physical-style recall cards automatically generated and grounded in your video lessons.
          </p>

          {/* Compact Deck Summary */}
          <div className="flex items-center gap-2 text-xs font-mono font-bold pt-1">
            <span className="bg-[#FFFDF7] px-2 py-0.5 rounded border border-[#111218] text-[#111218]">
              {cards.length} Total Cards
            </span>
            <span className="bg-[#B8FF3D] px-2 py-0.5 rounded border border-[#111218] text-[#111218]">
              {masteredCount} Mastered
            </span>
            <span className="bg-[#FFD1C7] px-2 py-0.5 rounded border border-[#111218] text-[#111218]">
              {toReviewCount} To Review
            </span>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center gap-2.5">
          <NextLink
            href="/revision"
            className="neo-btn-primary px-4 py-2.5 text-xs sm:text-sm flex items-center gap-2 shadow-neo-sm"
          >
            <RotateCw className="w-4 h-4 text-[#B8FF3D]" />
            <span>Revise What I Learned →</span>
          </NextLink>

          <button
            onClick={() => {
              setStudyMode(!studyMode);
              setStudyIndex(0);
              setStudyRevealed(false);
            }}
            disabled={filteredCards.length === 0}
            className="neo-btn-lime px-4 py-2.5 text-xs sm:text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4 text-[#111218]" />
            <span>{studyMode ? 'Exit Study Mode' : 'Start Study Mode →'}</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. DECK CONTROL BAR
      ───────────────────────────────────────────────────────────── */}
      {!studyMode && (
        <div className="bg-[#FFFDF7] border-2 border-[#111218] p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-neo-sm">
          {/* Pill-Style Filter Segmented Control */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold uppercase transition-all ${
                filter === 'all'
                  ? 'bg-[#B8FF3D] text-[#111218] border-2 border-[#111218] shadow-neo-sm'
                  : 'text-[#111218] hover:bg-[#F5F3EC] border border-transparent'
              }`}
            >
              ALL ({cards.length})
            </button>
            <button
              onClick={() => setFilter('unmastered')}
              className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold uppercase transition-all ${
                filter === 'unmastered'
                  ? 'bg-[#FFD1C7] text-[#111218] border-2 border-[#111218] shadow-neo-sm'
                  : 'text-[#111218] hover:bg-[#F5F3EC] border border-transparent'
              }`}
            >
              NEED REVIEW ({toReviewCount})
            </button>
            <button
              onClick={() => setFilter('mastered')}
              className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold uppercase transition-all ${
                filter === 'mastered'
                  ? 'bg-[#DDF6BD] text-[#111218] border-2 border-[#111218] shadow-neo-sm'
                  : 'text-[#111218] hover:bg-[#F5F3EC] border border-transparent'
              }`}
            >
              MASTERED ({masteredCount})
            </button>
          </div>

          {/* Search Field + Selectors */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 max-w-xl justify-end">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search className="w-4 h-4 text-[#111218] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search flashcards..."
                className="w-full bg-[#F5F3EC] border-2 border-[#111218] rounded-xl pl-9 pr-3 py-1.5 text-xs font-medium text-[#111218] placeholder-slate-400 focus:outline-none focus:bg-[#FFFDF7]"
              />
            </div>

            {/* Lesson Filter Dropdown */}
            <select
              value={selectedVideo}
              onChange={(e) => setSelectedVideo(e.target.value)}
              className="bg-[#F5F3EC] border-2 border-[#111218] rounded-xl px-3 py-1.5 text-xs font-bold text-[#111218] focus:outline-none max-w-[190px] truncate"
            >
              <option value="all">All Lessons ({cards.length})</option>
              {uniqueVideos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. IMMERSIVE SINGLE-CARD STUDY MODE (Neo-Brutalist)
      ───────────────────────────────────────────────────────────── */}
      {studyMode && currentStudyCard ? (
        <div className="max-w-2xl mx-auto space-y-5 animate-in fade-in duration-200">
          {/* Study Mode Progress Header */}
          <div className="flex items-center justify-between text-xs font-mono font-bold bg-[#FFFDF7] border-2 border-[#111218] px-4 py-2.5 rounded-xl shadow-neo-sm">
            <span className="text-[#111218]">
              Card {studyIndex + 1} of {filteredCards.length}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[#636573] hidden sm:inline text-[11px]">
                Space to reveal · ← → to navigate
              </span>
              <button
                onClick={() => setStudyMode(false)}
                className="p-1 rounded hover:bg-[#F5F3EC] text-[#111218]"
                title="Exit Study Mode"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Large Central Physical Study Card */}
          <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-6 sm:p-8 min-h-[400px] flex flex-col justify-between space-y-6 shadow-neo-lg">
            {/* Card Top Metadata */}
            <div className="flex items-center justify-between border-b-2 border-[#111218]/10 pb-3">
              <span className="text-xs font-bold text-[#636573] uppercase tracking-wider truncate max-w-[280px] font-display">
                {currentStudyCard.video?.title || 'Active Lesson'}
              </span>
              <span className="badge-lime px-2.5 py-0.5 text-[10px] uppercase">
                CONCEPT
              </span>
            </div>

            {/* Question */}
            <div className="space-y-2 text-center my-auto py-3">
              <span className="badge-black px-2 py-0.5 text-[9px] uppercase tracking-widest font-mono">
                QUESTION
              </span>
              <h2 className="text-lg sm:text-2xl font-extrabold text-[#111218] leading-snug max-w-xl mx-auto font-display pt-2">
                {currentStudyCard.front}
              </h2>
            </div>

            {/* Inset Answer Reveal Section */}
            {studyRevealed ? (
              <div className="p-5 rounded-2xl bg-[#F5F3EC] border-2 border-[#111218] space-y-2 animate-in fade-in duration-200">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#111218] font-mono block">
                  RECALL ANSWER
                </span>
                <p className="text-sm sm:text-base font-semibold text-[#111218] leading-relaxed">
                  {currentStudyCard.back}
                </p>
              </div>
            ) : (
              <button
                onClick={() => setStudyRevealed(true)}
                className="w-full py-3.5 rounded-2xl neo-btn-lime text-sm font-bold flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4 text-[#111218]" />
                <span>Reveal Answer</span>
                <span className="text-[11px] font-mono text-[#636573] font-normal ml-1">
                  (Space)
                </span>
              </button>
            )}

            {/* Study Mode Bottom Action Outcomes */}
            <div className="pt-3 border-t-2 border-[#111218]/10 flex items-center justify-between gap-3">
              <button
                onClick={handlePrevStudyCard}
                className="neo-btn-outline px-3.5 py-2 text-xs font-bold flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>

              {/* Spaced Repetition Feedback Buttons */}
              {studyRevealed ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStudyResponse('forgot')}
                    className="px-3.5 py-2 rounded-xl bg-[#FFD1C7] border-2 border-[#111218] shadow-neo-sm text-xs font-bold text-[#111218] hover:bg-[#FF6B4A] hover:text-white transition-colors"
                  >
                    Forgot
                  </button>
                  <button
                    onClick={() => handleStudyResponse('hard')}
                    className="px-3.5 py-2 rounded-xl bg-[#FFFDF7] border-2 border-[#111218] shadow-neo-sm text-xs font-bold text-[#111218] hover:bg-[#F5F3EC] transition-colors"
                  >
                    Hard
                  </button>
                  <button
                    onClick={() => handleStudyResponse('got_it')}
                    className="px-4 py-2 neo-btn-lime text-xs font-bold flex items-center gap-1"
                  >
                    <Check className="w-4 h-4 text-[#111218]" />
                    <span>Got it</span>
                  </button>
                </div>
              ) : (
                <div className="text-xs font-semibold text-[#636573] italic">
                  Review the question, then reveal answer
                </div>
              )}

              <button
                onClick={handleNextStudyCard}
                className="neo-btn-outline px-3.5 py-2 text-xs font-bold flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────
            4. BROWSE MODE: PHYSICAL FLASHCARD GRID
        ───────────────────────────────────────────────────────────── */
        <div>
          {filteredCards.length === 0 ? (
            <div className="bg-[#FFFDF7] border-2 border-[#111218] p-12 rounded-3xl text-center max-w-lg mx-auto space-y-4 my-8 shadow-neo">
              <div className="w-12 h-12 rounded-2xl bg-[#B8FF3D] border-2 border-[#111218] flex items-center justify-center text-[#111218] mx-auto shadow-neo-sm">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-[#111218] font-display uppercase">
                  No flashcards yet
                </h3>
                <p className="text-xs text-[#636573] font-medium leading-relaxed max-w-sm mx-auto">
                  Complete a video lesson and Saras AI will automatically extract recall cards grounded in the transcript.
                </p>
              </div>
              <NextLink
                href="/discover"
                className="neo-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold"
              >
                <span>Explore Lessons</span>
                <ArrowRight className="w-4 h-4 text-[#B8FF3D]" />
              </NextLink>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCards.map((card, idx) => {
                const isRevealed = revealedCardIds.has(card.id);

                return (
                  <div
                    key={card.id}
                    className={`bg-[#FFFDF7] border-2 border-[#111218] rounded-2xl p-5 flex flex-col justify-between min-h-[380px] shadow-neo hover:-translate-y-1 hover:shadow-neo-lg transition-all relative overflow-hidden group ${
                      card.mastered ? 'border-[#8ECC24] bg-[#F7FDF0]' : ''
                    }`}
                  >
                    {/* Top Row: Source Label + Type Badge */}
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b-2 border-[#111218]/10">
                      <span className="text-[11px] font-bold font-display text-[#636573] uppercase tracking-wider truncate max-w-[190px]">
                        {card.video?.title || 'Key Concept'}
                      </span>
                      <span className="badge-lime px-2 py-0.2 text-[9px] uppercase">
                        CONCEPT
                      </span>
                    </div>

                    {/* Question */}
                    <div className="space-y-1.5 py-3 flex-1 flex flex-col justify-center">
                      <span className="badge-black px-1.5 py-0.2 text-[8px] uppercase tracking-widest font-mono w-fit">
                        QUESTION
                      </span>
                      <h3 className="text-sm sm:text-[15px] font-extrabold text-[#111218] leading-snug font-display pt-1">
                        {card.front}
                      </h3>
                    </div>

                    {/* Inset Answer Reveal Section */}
                    <div className="p-3.5 rounded-xl bg-[#F5F3EC] border-2 border-[#111218] space-y-2 mt-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-[#111218] font-mono">
                          RECALL
                        </span>
                        <button
                          onClick={() => toggleRevealCard(card.id)}
                          className="text-[10px] font-bold text-[#111218] hover:underline flex items-center gap-1"
                        >
                          {isRevealed ? (
                            <>
                              <EyeOff className="w-3 h-3" /> Hide
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3" /> Reveal Answer
                            </>
                          )}
                        </button>
                      </div>

                      {isRevealed ? (
                        <p className="text-xs font-semibold text-[#111218] leading-relaxed animate-in fade-in duration-150">
                          {card.back}
                        </p>
                      ) : (
                        <p className="text-[11px] text-[#636573] font-medium italic">
                          Click reveal to test your active retrieval.
                        </p>
                      )}
                    </div>

                    {/* Bottom Action Row */}
                    <div className="flex items-center justify-between pt-3 border-t-2 border-[#111218]/10 mt-3.5">
                      <button
                        onClick={() => handleToggleMastered(card.id, card.mastered)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold font-display transition-all ${
                          card.mastered
                            ? 'bg-[#B8FF3D] text-[#111218] border-2 border-[#111218] shadow-neo-sm'
                            : 'bg-[#FFFDF7] text-[#111218] border-2 border-[#111218] hover:bg-[#B8FF3D]'
                        }`}
                      >
                        {card.mastered ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#111218]" />
                            <span>Mastered</span>
                          </>
                        ) : (
                          <>
                            <span className="w-2.5 h-2.5 rounded-full border border-[#111218]" />
                            <span>Mark Mastered</span>
                          </>
                        )}
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
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
