'use client';

import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';
import {
  Network,
  Sparkles,
  Search,
  RotateCw,
  Zap,
  BookOpen,
  ArrowRight,
  AlertTriangle,
  Clock,
  Lightbulb,
  CheckCircle2,
  SlidersHorizontal,
  Flame,
  Brain,
  Layers,
  GraduationCap,
  Layers2,
} from 'lucide-react';
import {
  KnowledgeGraphCanvas,
  GraphNode,
  GraphEdge,
} from '@/components/knowledge/KnowledgeGraphCanvas';

interface KnowledgeData {
  summary: {
    total: number;
    strong: number;
    developing: number;
    weak: number;
    not_studied: number;
  };
  categories: string[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  weak_areas: GraphNode[];
  recently_learned: GraphNode[];
  suggested_next: {
    concept: GraphNode;
    prerequisite: GraphNode;
    reason: string;
  } | null;
}

export default function KnowledgeMapPage() {
  const [data, setData] = useState<KnowledgeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Topics');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  const fetchGraphData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeFilter && activeFilter !== 'ALL') params.set('filter', activeFilter);
      if (selectedCategory && selectedCategory !== 'All Topics')
        params.set('category', selectedCategory);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/knowledge?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed to fetch knowledge graph data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraphData();
  }, [activeFilter, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & HIGH-LEVEL KNOWLEDGE SUMMARY
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-6 sm:p-7 shadow-neo space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#B8FF3D] border-2 border-[#111218] rounded-md shadow-neo-sm">
              <Network className="w-3.5 h-3.5 text-[#111218]" />
              <span className="text-xs font-black font-display uppercase tracking-wider text-[#111218]">
                Intelligence Foundation
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#111218] font-display uppercase tracking-tight">
              Personal Knowledge Map
            </h1>
            <p className="text-xs sm:text-sm text-[#636573] font-medium max-w-2xl leading-relaxed">
              Hierarchical curriculum map connecting concepts from your video lessons, checkpoint quizzes, and active recall mastery.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-shrink-0 self-start">
            <NextLink
              href="/exam"
              className="neo-btn-primary px-3.5 py-2 text-xs font-bold font-display flex items-center gap-1.5 shadow-neo-sm"
            >
              <GraduationCap className="w-3.5 h-3.5 text-[#B8FF3D]" />
              <span>Exam Mode →</span>
            </NextLink>

            <NextLink
              href="/revision"
              className="neo-btn-lime px-3.5 py-2 text-xs font-bold font-display flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-[#111218]" />
              <span>AI Revision</span>
            </NextLink>

            <button
              onClick={fetchGraphData}
              className="neo-btn-outline px-3 py-2 text-xs font-bold font-display flex items-center gap-1.5"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Dynamic Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          <div className="p-3 rounded-2xl bg-[#F5F3EC] border-2 border-[#111218] shadow-neo-sm space-y-0.5">
            <span className="text-[10px] font-mono font-bold uppercase text-[#636573]">
              Total Concepts
            </span>
            <div className="text-2xl font-black font-display text-[#111218]">
              {data?.summary.total || 0}
            </div>
            <span className="text-[10px] text-[#636573] font-medium">In your graph</span>
          </div>

          <div className="p-3 rounded-2xl bg-[#B8FF3D]/30 border-2 border-[#111218] shadow-neo-sm space-y-0.5">
            <span className="text-[10px] font-mono font-bold uppercase text-[#111218]">
              Mastered (≥80%)
            </span>
            <div className="text-2xl font-black font-display text-[#111218]">
              {data?.summary.strong || 0}
            </div>
            <span className="text-[10px] text-[#21232C] font-medium">Strong recall</span>
          </div>

          <div className="p-3 rounded-2xl bg-[#E9DFFF] border-2 border-[#111218] shadow-neo-sm space-y-0.5">
            <span className="text-[10px] font-mono font-bold uppercase text-[#21232C]">
              Developing (50-79%)
            </span>
            <div className="text-2xl font-black font-display text-[#21232C]">
              {data?.summary.developing || 0}
            </div>
            <span className="text-[10px] text-[#636573] font-medium">In progress</span>
          </div>

          <div className="p-3 rounded-2xl bg-[#FFD1C7] border-2 border-[#111218] shadow-neo-sm space-y-0.5">
            <span className="text-[10px] font-mono font-bold uppercase text-red-950">
              Needs Review (&lt;50%)
            </span>
            <div className="text-2xl font-black font-display text-red-950">
              {data?.summary.weak || 0}
            </div>
            <span className="text-[10px] text-red-900 font-medium">Action required</span>
          </div>

          <div className="p-3 rounded-2xl bg-[#FFFDF7] border-2 border-[#111218] shadow-neo-sm space-y-0.5">
            <span className="text-[10px] font-mono font-bold uppercase text-[#636573]">
              Not Studied
            </span>
            <div className="text-2xl font-black font-display text-[#111218]">
              {data?.summary.not_studied || 0}
            </div>
            <span className="text-[10px] text-[#636573] font-medium">Ready to learn</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. SEARCH & DOMAIN FOCUS CONTROLS
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#636573]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search concepts across knowledge graph..."
            className="w-full pl-9 pr-4 py-2 bg-[#FFFDF7] border-2 border-[#111218] rounded-xl text-xs font-medium focus:outline-none shadow-neo-sm focus:shadow-neo"
          />
        </div>

        {/* Domain Topic Selector & Quick Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Focus Topic Selector */}
          <div className="flex items-center gap-1.5 bg-[#FFFDF7] border-2 border-[#111218] px-3 py-1.5 rounded-xl shadow-neo-sm">
            <Layers2 className="w-3.5 h-3.5 text-[#111218]" />
            <span className="text-[10px] font-bold font-mono uppercase text-[#636573]">Topic:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#111218] focus:outline-none cursor-pointer"
            >
              <option value="All Topics">All Domains ({data?.nodes.length || 0})</option>
              {data?.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Mastery Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'WEAK', label: 'Weak Areas' },
              { id: 'MASTERED', label: 'Mastered' },
              { id: 'DEVELOPING', label: 'Developing' },
              { id: 'NOT_STUDIED', label: 'Not Studied' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold font-display uppercase whitespace-nowrap transition-all ${
                  activeFilter === f.id
                    ? 'bg-[#B8FF3D] text-[#111218] border-2 border-[#111218] shadow-neo-sm'
                    : 'bg-[#FFFDF7] text-[#636573] border-2 border-[#111218]/30 hover:border-[#111218] hover:text-[#111218]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN GRAPH VISUALIZER
      ───────────────────────────────────────────────────────────── */}
      {loading && !data ? (
        <div className="w-full h-[720px] bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl flex flex-col items-center justify-center gap-3 shadow-neo">
          <RotateCw className="w-8 h-8 animate-spin text-[#111218]" />
          <p className="text-xs font-bold font-display uppercase text-[#111218]">
            Synthesizing Knowledge Map Graph...
          </p>
        </div>
      ) : data?.nodes.length === 0 ? (
        <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-12 text-center space-y-4 shadow-neo max-w-xl mx-auto my-8">
          <div className="w-14 h-14 rounded-2xl bg-[#B8FF3D] border-2 border-[#111218] flex items-center justify-center text-[#111218] mx-auto shadow-neo-sm">
            <Network className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-extrabold text-[#111218] font-display uppercase">
              Your Knowledge Map Is Just Getting Started
            </h3>
            <p className="text-xs text-[#636573] font-medium max-w-sm mx-auto">
              Complete any video lesson to begin dynamically constructing your personal knowledge map.
            </p>
          </div>
          <NextLink
            href="/discover"
            className="neo-btn-primary px-6 py-2.5 text-xs font-bold font-display inline-flex items-center gap-2"
          >
            <span>Explore Lessons</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#B8FF3D]" />
          </NextLink>
        </div>
      ) : (
        <KnowledgeGraphCanvas
          nodes={data?.nodes || []}
          edges={data?.edges || []}
          selectedCategory={selectedCategory}
          onSelectNode={(node) => setSelectedNode(node)}
          selectedNodeId={selectedNode?.id}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. THREE HIGH-YIELD BOTTOM INTELLIGENCE PANELS
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Panel 1: Weak Areas (Needs Attention) */}
        <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-5 shadow-neo space-y-3.5 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b-2 border-[#111218]">
              <span className="badge-black px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-[#FFD1C7] text-red-950">
                Needs Attention
              </span>
              <span className="text-[10px] font-mono font-bold text-[#636573]">
                Lowest Mastery
              </span>
            </div>

            {data?.weak_areas && data.weak_areas.length > 0 ? (
              <div className="space-y-2">
                {data.weak_areas.map((w) => (
                  <div
                    key={w.id}
                    onClick={() => setSelectedNode(w)}
                    className="p-2.5 rounded-xl bg-[#F5F3EC] border-2 border-[#111218] flex items-center justify-between cursor-pointer hover:bg-[#FFD1C7] transition-all"
                  >
                    <div>
                      <h5 className="text-xs font-bold font-display uppercase text-[#111218]">
                        {w.name}
                      </h5>
                      <span className="text-[10px] text-[#636573] font-mono">
                        {w.category}
                      </span>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className="text-xs font-black font-display text-red-900">
                        {w.mastery_score}%
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#111218]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#636573] font-medium py-3">
                No weak concepts identified. All studied topics are progressing well!
              </p>
            )}
          </div>

          <NextLink
            href="/revision"
            className="neo-btn-primary w-full py-2 text-xs font-bold font-display flex items-center justify-center gap-2"
          >
            <span>Revise Weak Concepts →</span>
          </NextLink>
        </div>

        {/* Panel 2: Recently Learned */}
        <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-5 shadow-neo space-y-3.5 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b-2 border-[#111218]">
              <span className="badge-lime px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                Recent Activity
              </span>
              <span className="text-[10px] font-mono font-bold text-[#636573]">
                Latest Studied
              </span>
            </div>

            {data?.recently_learned && data.recently_learned.length > 0 ? (
              <div className="space-y-2">
                {data.recently_learned.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedNode(r)}
                    className="p-2.5 rounded-xl bg-[#F5F3EC] border-2 border-[#111218] flex items-center justify-between cursor-pointer hover:bg-[#DDF6BD] transition-all"
                  >
                    <div>
                      <h5 className="text-xs font-bold font-display uppercase text-[#111218]">
                        {r.name}
                      </h5>
                      <span className="text-[10px] text-[#636573] font-mono">
                        {r.exposure_count} exposures
                      </span>
                    </div>
                    <span className="badge-black px-2 py-0.5 text-[9px] font-mono font-bold">
                      {r.mastery_score}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#636573] font-medium py-3">
                No recent study activity recorded yet.
              </p>
            )}
          </div>

          <NextLink
            href="/flashcards"
            className="neo-btn-outline w-full py-2 text-xs font-bold font-display flex items-center justify-center gap-2"
          >
            <span>Practice In Flashcards</span>
          </NextLink>
        </div>

        {/* Panel 3: Recommended Next Step (Prerequisite Driven) */}
        <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-5 shadow-neo space-y-3.5 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b-2 border-[#111218]">
              <span className="badge-black px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-[#FFE353] text-[#111218]">
                Suggested Next Step
              </span>
              <span className="text-[10px] font-mono font-bold text-[#636573]">
                Knowledge Graph
              </span>
            </div>

            {data?.suggested_next ? (
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-[#F5F3EC] border-2 border-[#111218] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-[#636573] uppercase">
                      Recommended
                    </span>
                    <span className="text-[10px] font-bold text-[#111218]">
                      {data.suggested_next.concept.category}
                    </span>
                  </div>
                  <h4 className="text-sm font-black font-display uppercase text-[#111218]">
                    {data.suggested_next.concept.name}
                  </h4>
                  <p className="text-[11px] text-[#636573] leading-snug">
                    {data.suggested_next.reason}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#636573] font-medium py-3">
                Complete more lessons to unlock graph-based recommendations.
              </p>
            )}
          </div>

          <NextLink
            href="/discover"
            className="neo-btn-lime w-full py-2 text-xs font-bold font-display flex items-center justify-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#111218]" />
            <span>Discover Lessons →</span>
          </NextLink>
        </div>
      </div>
    </div>
  );
}
