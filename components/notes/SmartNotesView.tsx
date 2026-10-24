'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Search,
  RotateCw,
  Clock,
  Play,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  FileText,
  HelpCircle,
  Tag,
  ArrowRight,
  ListOrdered,
  Layers,
  Share2,
  SlidersHorizontal,
} from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { ImageExplainUpload } from './ImageExplainUpload';

export interface SmartNoteData {
  id: string;
  video_id: string;
  segment_id?: string | null;
  section_type:
    | 'overview'
    | 'key_concepts'
    | 'definitions'
    | 'core_explanations'
    | 'examples'
    | 'takeaways'
    | 'common_mistakes'
    | 'quick_revision'
    | 'image_explanation';
  title: string;
  content: string;
  source_start_seconds?: number | null;
  source_end_seconds?: number | null;
  order_index: number;
  segment?: {
    id: string;
    order_index: number;
    title: string;
    start_seconds: number;
    end_seconds: number;
  } | null;
}

interface SmartNotesViewProps {
  videoId: string;
  videoTitle: string;
  activeSegmentId?: string;
  activeSegmentTitle?: string;
}

export function SmartNotesView({ videoId, videoTitle, activeSegmentId, activeSegmentTitle }: SmartNotesViewProps) {
  const [notes, setNotes] = useState<SmartNoteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('all');

  const fetchNotes = async (forceRegenerate = false) => {
    try {
      if (forceRegenerate) {
        setIsRegenerating(true);
        const res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId }),
        });
        if (res.ok) {
          const data = await res.json();
          setNotes(data.notes || []);
        }
      } else {
        setLoading(true);
        const res = await fetch(`/api/notes?videoId=${videoId}`);
        if (res.ok) {
          const data = await res.json();
          setNotes(data.notes || []);
        }
      }
    } catch (e) {
      console.error('Failed to load smart notes:', e);
    } finally {
      setLoading(false);
      setIsRegenerating(false);
    }
  };

  useEffect(() => {
    if (videoId) fetchNotes();
  }, [videoId]);

  // Clickable timestamp seek
  const handleSeek = (seconds?: number | null) => {
    if (seconds == null || isNaN(seconds)) return;
    window.dispatchEvent(
      new CustomEvent('seek-video-player', { detail: { seconds } })
    );
  };

  // Group notes by section type
  const overviewNotes = useMemo(
    () => notes.filter((n) => n.section_type === 'overview'),
    [notes]
  );
  const keyConceptNotes = useMemo(
    () => notes.filter((n) => n.section_type === 'key_concepts'),
    [notes]
  );
  const definitionNotes = useMemo(
    () => notes.filter((n) => n.section_type === 'definitions'),
    [notes]
  );
  const explanationNotes = useMemo(
    () => notes.filter((n) => n.section_type === 'core_explanations'),
    [notes]
  );
  const exampleNotes = useMemo(
    () => notes.filter((n) => n.section_type === 'examples'),
    [notes]
  );
  const takeawayNotes = useMemo(
    () => notes.filter((n) => n.section_type === 'takeaways'),
    [notes]
  );
  const commonMistakeNotes = useMemo(
    () => notes.filter((n) => n.section_type === 'common_mistakes'),
    [notes]
  );
  const quickRevisionNotes = useMemo(
    () => notes.filter((n) => n.section_type === 'quick_revision'),
    [notes]
  );
  const imageExplanationNotes = useMemo(
    () => notes.filter((n) => n.section_type === 'image_explanation'),
    [notes]
  );

  // Filter notes by search query
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.section_type.toLowerCase().includes(q)
    );
  }, [notes, searchQuery]);

  if (loading) {
    return (
      <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-8 shadow-neo text-center space-y-4 my-4">
        <div className="w-12 h-12 rounded-2xl bg-[#B8FF3D] border-2 border-[#111218] flex items-center justify-center text-[#111218] mx-auto shadow-neo-sm">
          <RotateCw className="w-6 h-6 animate-spin" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-[#111218] font-display uppercase">
            Synthesizing Smart Notes...
          </h3>
          <p className="text-xs text-[#636573] max-w-sm mx-auto font-medium">
            Extracting core concepts, definitions, and key takeaways directly from the video transcript.
          </p>
        </div>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-8 shadow-neo text-center space-y-4 my-4">
        <div className="w-12 h-12 rounded-2xl bg-[#E9DFFF] border-2 border-[#111218] flex items-center justify-center text-[#111218] mx-auto shadow-neo-sm">
          <FileText className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-[#111218] font-display uppercase">
            No Smart Notes Available Yet
          </h3>
          <p className="text-xs text-[#636573] max-w-sm mx-auto font-medium">
            Generate persistent, structured study notes from this lesson.
          </p>
        </div>
        <button
          onClick={() => fetchNotes(true)}
          className="neo-btn-lime px-5 py-2.5 text-xs font-bold font-display inline-flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>Generate Smart Notes</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Slide & Diagram Image Upload Widget */}
      <ImageExplainUpload
        videoId={videoId}
        segmentId={activeSegmentId}
        segmentTitle={activeSegmentTitle}
        onNoteCreated={() => fetchNotes(false)}
      />

      {/* 1. Top Controls Bar: Search + Filter Pills + Regenerate Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-[#111218]">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#636573]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search concepts, terms, or definitions..."
            className="w-full pl-9 pr-3 py-2 bg-[#F5F3EC] border-2 border-[#111218] rounded-xl text-xs font-medium focus:outline-none focus:bg-[#FFFDF7] transition-colors"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => fetchNotes(true)}
            disabled={isRegenerating}
            className="neo-btn-outline px-3 py-1.5 text-xs font-bold font-display flex items-center gap-1.5 disabled:opacity-50"
            title="Regenerate notes from transcript"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span>Regenerate</span>
          </button>
        </div>
      </div>

      {/* 2. Section Navigation Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {[
          { key: 'all', label: 'All Sections', count: notes.length },
          { key: 'image_explanation', label: 'Slide Explanations', count: imageExplanationNotes.length },
          { key: 'overview', label: 'Overview', count: overviewNotes.length },
          { key: 'key_concepts', label: 'Key Concepts', count: keyConceptNotes.length },
          { key: 'definitions', label: 'Definitions', count: definitionNotes.length },
          { key: 'core_explanations', label: 'Explanations', count: explanationNotes.length },
          { key: 'examples', label: 'Examples', count: exampleNotes.length },
          { key: 'takeaways', label: 'Takeaways', count: takeawayNotes.length },
          { key: 'quick_revision', label: 'Quick Revision', count: quickRevisionNotes.length },
        ]
          .filter((tab) => tab.key === 'all' || tab.count > 0)
          .map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedSection(tab.key)}
              className={`px-3 py-1 rounded-xl text-xs font-display font-bold whitespace-nowrap transition-all ${
                selectedSection === tab.key
                  ? 'bg-[#B8FF3D] text-[#111218] border-2 border-[#111218] shadow-neo-sm'
                  : 'text-[#636573] hover:text-[#111218] hover:bg-[#F5F3EC]'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
      </div>

      {/* 3. Search Active Notice */}
      {searchQuery.trim() && (
        <div className="p-3 bg-[#DCEEFF] border-2 border-[#111218] rounded-xl flex items-center justify-between text-xs font-bold">
          <span>Found {filteredNotes.length} matching notes for &ldquo;{searchQuery}&rdquo;</span>
          <button onClick={() => setSearchQuery('')} className="underline hover:text-black">
            Clear Search
          </button>
        </div>
      )}

      {/* 4. Notes Content Display */}
      <div className="space-y-6">
        {/* SECTION 0: Slide & Diagram Image Explanations */}
        {(selectedSection === 'all' || selectedSection === 'image_explanation') &&
          imageExplanationNotes.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="badge-lime px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                  Vision Analysis
                </span>
                <h3 className="text-sm font-extrabold text-[#111218] font-display uppercase">
                  Slide & Diagram Explanations ({imageExplanationNotes.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                {imageExplanationNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-5 rounded-2xl bg-[#FFFDF7] border-2 border-[#111218] shadow-neo space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#111218]/15">
                      <h4 className="text-sm font-black font-display text-[#111218]">
                        {note.title}
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-[#DDF6BD] border border-[#111218] text-[#111218]">
                        Powered by Gemma 4 (local)
                      </span>
                    </div>
                    <div className="text-xs text-[#21232C] font-medium leading-relaxed whitespace-pre-wrap">
                      {note.content}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        {/* SECTION A: Overview */}
        {(selectedSection === 'all' || selectedSection === 'overview') &&
          overviewNotes.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="badge-lime px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                  Overview
                </span>
                <h3 className="text-sm font-extrabold text-[#111218] font-display uppercase">
                  Lesson Objective & Summary
                </h3>
              </div>

              {overviewNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-5 rounded-2xl bg-[#FFFDF7] border-2 border-[#111218] shadow-neo space-y-2"
                >
                  <p className="text-xs sm:text-sm text-[#111218] font-medium leading-relaxed">
                    {note.content}
                  </p>
                </div>
              ))}
            </section>
          )}

        {/* SECTION B: Key Concepts */}
        {(selectedSection === 'all' || selectedSection === 'key_concepts') &&
          keyConceptNotes.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="badge-black px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    Core Concepts
                  </span>
                  <h3 className="text-sm font-extrabold text-[#111218] font-display uppercase">
                    Key Concepts Covered ({keyConceptNotes.length})
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {keyConceptNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-4 rounded-2xl bg-[#FFFDF7] border-2 border-[#111218] shadow-neo flex flex-col justify-between space-y-3 group hover:-translate-y-0.5 transition-all"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-black font-display text-[#111218] uppercase">
                          {note.title}
                        </h4>
                        {note.source_start_seconds != null && (
                          <button
                            onClick={() => handleSeek(note.source_start_seconds)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#B8FF3D] hover:bg-[#A6F024] border border-[#111218] text-[10px] font-mono font-bold text-[#111218] transition-colors"
                            title={`Jump to ${formatTime(note.source_start_seconds)}`}
                          >
                            <Play className="w-2.5 h-2.5 fill-[#111218]" />
                            <span>{formatTime(note.source_start_seconds)}</span>
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-[#21232C] font-medium leading-relaxed">
                        {note.content}
                      </p>
                    </div>

                    {note.segment && (
                      <div className="pt-2 border-t border-[#111218]/15 flex items-center justify-between text-[10px] text-[#636573] font-mono">
                        <span>Chapter {note.segment.order_index + 1}: {note.segment.title}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

        {/* SECTION C: Definitions */}
        {(selectedSection === 'all' || selectedSection === 'definitions') &&
          definitionNotes.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="badge-black px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#E9DFFF]">
                  Glossary
                </span>
                <h3 className="text-sm font-extrabold text-[#111218] font-display uppercase">
                  Important Terms & Definitions
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {definitionNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3.5 rounded-xl bg-[#F5F3EC] border-2 border-[#111218] shadow-neo-sm space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black font-display uppercase text-[#111218]">
                        ✦ {note.title}
                      </span>
                      {note.source_start_seconds != null && (
                        <button
                          onClick={() => handleSeek(note.source_start_seconds)}
                          className="text-[10px] font-mono font-bold text-[#111218] underline hover:text-[#8ECC24]"
                        >
                          {formatTime(note.source_start_seconds)} →
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-[#636573] font-medium leading-snug">
                      {note.content}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

        {/* SECTION D: Core Explanations & Mechanisms */}
        {(selectedSection === 'all' || selectedSection === 'core_explanations') &&
          explanationNotes.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="badge-black px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#DCEEFF]">
                  Mechanisms
                </span>
                <h3 className="text-sm font-extrabold text-[#111218] font-display uppercase">
                  Step-by-Step Mechanisms & Processes
                </h3>
              </div>

              <div className="space-y-3">
                {explanationNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-4 rounded-2xl bg-[#FFFDF7] border-2 border-[#111218] shadow-neo space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black font-display text-[#111218] uppercase">
                        {note.title}
                      </h4>
                      {note.source_start_seconds != null && (
                        <button
                          onClick={() => handleSeek(note.source_start_seconds)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#DCEEFF] hover:bg-[#C2E3FF] border border-[#111218] text-[10px] font-mono font-bold text-[#111218]"
                        >
                          <Play className="w-2.5 h-2.5 fill-[#111218]" />
                          <span>{formatTime(note.source_start_seconds)}</span>
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-[#21232C] font-medium leading-relaxed whitespace-pre-line">
                      {note.content}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

        {/* SECTION E: Examples & Analogies */}
        {(selectedSection === 'all' || selectedSection === 'examples') &&
          exampleNotes.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="badge-black px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#DDF6BD]">
                  Examples
                </span>
                <h3 className="text-sm font-extrabold text-[#111218] font-display uppercase">
                  Concrete Examples & Analogies
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {exampleNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-4 rounded-2xl bg-[#DDF6BD] border-2 border-[#111218] shadow-neo-sm space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black font-display uppercase text-[#111218]">
                        {note.title}
                      </h4>
                      {note.source_start_seconds != null && (
                        <button
                          onClick={() => handleSeek(note.source_start_seconds)}
                          className="text-[10px] font-mono font-bold text-[#111218] underline"
                        >
                          {formatTime(note.source_start_seconds)} →
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-[#21232C] font-medium leading-relaxed">
                      {note.content}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

        {/* SECTION F: Important Takeaways */}
        {(selectedSection === 'all' || selectedSection === 'takeaways') &&
          takeawayNotes.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="badge-lime px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                  Takeaways
                </span>
                <h3 className="text-sm font-extrabold text-[#111218] font-display uppercase">
                  Core Rules & Mental Models
                </h3>
              </div>

              {takeawayNotes.map((note) => {
                let items: string[] = [];
                try {
                  items = JSON.parse(note.content);
                } catch {
                  items = [note.content];
                }

                return (
                  <div
                    key={note.id}
                    className="p-5 rounded-2xl bg-[#FFFDF7] border-2 border-[#111218] shadow-neo space-y-2.5"
                  >
                    <ul className="space-y-2 text-xs font-medium text-[#111218]">
                      {items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#8ECC24] flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </section>
          )}

        {/* SECTION G: Common Mistakes */}
        {(selectedSection === 'all' || selectedSection === 'common_mistakes') &&
          commonMistakeNotes.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="badge-black px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#FFD1C7] text-red-900">
                  Pitfalls
                </span>
                <h3 className="text-sm font-extrabold text-[#111218] font-display uppercase">
                  Common Misconceptions Addressed
                </h3>
              </div>

              {commonMistakeNotes.map((note) => {
                let items: string[] = [];
                try {
                  items = JSON.parse(note.content);
                } catch {
                  items = [note.content];
                }

                return (
                  <div
                    key={note.id}
                    className="p-4 rounded-2xl bg-[#FFFDF7] border-2 border-red-900/30 shadow-neo space-y-2"
                  >
                    <ul className="space-y-2 text-xs font-medium text-[#111218]">
                      {items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </section>
          )}

        {/* SECTION H: Quick Revision Sheet */}
        {(selectedSection === 'all' || selectedSection === 'quick_revision') &&
          quickRevisionNotes.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="badge-lime px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                  Quick Revision
                </span>
                <h3 className="text-sm font-extrabold text-[#111218] font-display uppercase">
                  High-Density Recap Sheet
                </h3>
              </div>

              {quickRevisionNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-5 rounded-2xl bg-[#111218] text-white border-2 border-[#111218] shadow-neo-lg space-y-2"
                >
                  <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                    {note.content}
                  </p>
                </div>
              ))}
            </section>
          )}
      </div>
    </div>
  );
}
