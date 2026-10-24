'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Sparkles,
  Search,
  SlidersHorizontal,
  X,
  Layers,
  ArrowRight,
  Network,
} from 'lucide-react';
import {
  computeKnowledgeLayout,
  LayoutNode,
  LayoutEdge,
  ClusterRegion,
} from '@/lib/services/knowledgeLayout';
import { ConceptDetailDrawer } from './ConceptDetailDrawer';
import { MasteryState } from '@/lib/services/ai';

export interface GraphNode {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  category: string;
  mastery_score: number;
  mastery_state: MasteryState;
  exposure_count: number;
  correct_count: number;
  wrong_count: number;
  last_seen_at: string;
  source_videos: {
    id: string;
    title: string;
    channel: string;
    youtube_video_id: string;
    segment_title?: string;
    start_seconds?: number;
  }[];
  flashcards_count: number;
  quiz_count: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight?: number;
}

interface KnowledgeGraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedCategory?: string;
  onSelectNode?: (node: LayoutNode | null) => void;
  selectedNodeId?: string | null;
}

export function KnowledgeGraphCanvas({
  nodes,
  edges,
  selectedCategory,
  onSelectNode,
  selectedNodeId,
}: KnowledgeGraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Layout Computation
  const layout = useMemo(() => {
    return computeKnowledgeLayout(nodes, edges, selectedCategory);
  }, [nodes, edges, selectedCategory]);

  // Viewport Pan & Zoom State
  const [zoom, setZoom] = useState(0.9);
  const [pan, setPan] = useState({ x: 40, y: 30 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Selected node state
  const [activeNode, setActiveNode] = useState<LayoutNode | null>(null);

  // Sync external selectedNodeId if provided
  useEffect(() => {
    if (selectedNodeId) {
      const match = layout.nodes.find((n) => n.id === selectedNodeId);
      if (match) setActiveNode(match);
    }
  }, [selectedNodeId, layout.nodes]);

  // Connected neighbors calculation for Focus Mode
  const focusNodeId = activeNode?.id || hoveredNodeId;
  const connectedNodeIds = useMemo(() => {
    if (!focusNodeId) return null;
    const set = new Set<string>([focusNodeId]);
    for (const edge of layout.edges) {
      if (edge.source === focusNodeId) set.add(edge.target);
      if (edge.target === focusNodeId) set.add(edge.source);
    }
    return set;
  }, [focusNodeId, layout.edges]);

  // Auto-fit initial view
  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current || layout.canvasWidth === 0) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const scaleX = (clientWidth - 80) / layout.canvasWidth;
    const scaleY = (clientHeight - 80) / layout.canvasHeight;
    const fitScale = Math.max(0.45, Math.min(1.1, Math.min(scaleX, scaleY)));

    setZoom(fitScale);
    setPan({
      x: (clientWidth - layout.canvasWidth * fitScale) / 2,
      y: (clientHeight - layout.canvasHeight * fitScale) / 2,
    });
  }, [layout.canvasWidth, layout.canvasHeight]);

  useEffect(() => {
    handleFitToScreen();
  }, [handleFitToScreen]);

  // Mouse Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest('.graph-node') ||
      (e.target as HTMLElement).closest('.graph-controls') ||
      (e.target as HTMLElement).closest('.graph-drawer')
    ) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.max(0.4, Math.min(1.5, prev * zoomFactor)));
  };

  // Zoom Button Controls
  const handleZoomIn = () => setZoom((z) => Math.min(1.5, z + 0.15));
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, z - 0.15));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 40, y: 30 });
  };

  // Node Selection Handler
  const handleNodeClick = (node: LayoutNode) => {
    setActiveNode(node);
    onSelectNode?.(node);
  };

  // Color Styles per Mastery State
  const getNodeStyles = (state: MasteryState, isSelected: boolean) => {
    switch (state) {
      case 'MASTERED':
        return {
          bg: 'bg-[#B8FF3D]',
          border: 'border-[#111218]',
          bar: 'bg-[#111218]',
          badge: 'bg-[#111218] text-[#B8FF3D]',
          label: '✓ Mastered',
        };
      case 'DEVELOPING':
        return {
          bg: 'bg-[#E9DFFF]',
          border: 'border-[#111218]',
          bar: 'bg-[#7C3AED]',
          badge: 'bg-[#111218] text-white',
          label: 'Developing',
        };
      case 'WEAK':
        return {
          bg: 'bg-[#FFD1C7]',
          border: 'border-[#111218]',
          bar: 'bg-[#DC2626]',
          badge: 'bg-red-950 text-white',
          label: 'Needs Review',
        };
      default:
        return {
          bg: 'bg-[#FFFDF7]',
          border: 'border-[#111218]/60',
          bar: 'bg-[#A3A3A3]',
          badge: 'bg-[#EAE6DB] text-[#636573]',
          label: 'Not Studied',
        };
    }
  };

  return (
    <div className="relative w-full h-[720px] bg-[#F5F3EC] border-2 border-[#111218] rounded-3xl overflow-hidden shadow-neo-lg select-none">
      {/* ─────────────────────────────────────────────────────────────
          1. INTERACTIVE CANVAS VIEWPORT
      ───────────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          backgroundImage:
            'radial-gradient(rgba(17, 18, 24, 0.12) 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
        }}
        className={`w-full h-full cursor-${
          isDragging ? 'grabbing' : 'grab'
        } relative overflow-hidden`}
      >
        {/* World Container transformed by Pan & Zoom */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'top left',
            width: `${layout.canvasWidth}px`,
            height: `${layout.canvasHeight}px`,
            position: 'absolute',
            top: 0,
            left: 0,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          {/* SVG LAYER: Cluster Backgrounds, Relationship Edges & Arrowheads */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={layout.canvasWidth}
            height={layout.canvasHeight}
          >
            <defs>
              <marker
                id="arrow-prereq"
                viewBox="0 0 10 10"
                refX="14"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#111218" />
              </marker>
            </defs>

            {/* A. Render Domain Cluster Bounding Regions */}
            {layout.clusters.map((cluster) => (
              <g key={cluster.id}>
                {/* Cluster Bounding Box */}
                <rect
                  x={cluster.x}
                  y={cluster.y}
                  width={cluster.width}
                  height={cluster.height}
                  rx="24"
                  ry="24"
                  fill={cluster.colorBg}
                  stroke={cluster.colorBorder}
                  strokeWidth="2"
                  strokeDasharray="6 4"
                />

                {/* Cluster Header Label */}
                <g transform={`translate(${cluster.x + 20}, ${cluster.y + 32})`}>
                  <text
                    className="font-mono font-black uppercase text-xs"
                    fill="#111218"
                    letterSpacing="1.5px"
                  >
                    {cluster.category}
                  </text>
                  <text
                    x={cluster.width - 40}
                    textAnchor="end"
                    className="font-mono font-bold text-[10px]"
                    fill="#636573"
                  >
                    {cluster.nodeCount} concepts
                  </text>
                </g>
              </g>
            ))}

            {/* B. Render Relationship Edges */}
            {layout.edges.map((edge) => {
              const isConnected =
                connectedNodeIds &&
                connectedNodeIds.has(edge.source) &&
                connectedNodeIds.has(edge.target);
              const isDimmed = connectedNodeIds && !isConnected;

              const isPrereq = edge.type === 'prerequisite';
              const isRelated = edge.type === 'related';

              return (
                <path
                  key={edge.id}
                  d={edge.pathD}
                  fill="none"
                  stroke="#111218"
                  strokeWidth={isConnected ? 3 : 1.5}
                  strokeDasharray={isRelated ? '5,4' : undefined}
                  markerEnd={isPrereq ? 'url(#arrow-prereq)' : undefined}
                  opacity={isDimmed ? 0.12 : isConnected ? 1 : 0.35}
                  className="transition-all duration-300"
                />
              );
            })}
          </svg>

          {/* HTML LAYER: Compact Concept Nodes */}
          {layout.nodes.map((node) => {
            const isSelected = activeNode?.id === node.id;
            const isHovered = hoveredNodeId === node.id;
            const isDimmed = connectedNodeIds && !connectedNodeIds.has(node.id);
            const style = getNodeStyles(node.mastery_state, isSelected);

            return (
              <div
                key={node.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleNodeClick(node);
                }}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: `${node.width}px`,
                  height: `${node.height}px`,
                }}
                className={`graph-node absolute pointer-events-auto cursor-pointer p-3 rounded-2xl border-2 transition-all duration-200 select-none flex flex-col justify-between ${
                  style.bg
                } ${style.border} ${
                  isSelected
                    ? 'ring-3 ring-[#111218] shadow-[4px_4px_0px_#B8FF3D] scale-105 z-30'
                    : isHovered
                    ? 'shadow-neo-md scale-102 z-20'
                    : 'shadow-neo-sm z-10'
                } ${isDimmed ? 'opacity-25 grayscale-[0.5]' : 'opacity-100'}`}
              >
                {/* 1. Top Row: Category Tag + Status Dot */}
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#636573] truncate">
                    {node.category}
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full border border-[#111218] ${
                      node.mastery_state === 'MASTERED'
                        ? 'bg-[#111218]'
                        : node.mastery_state === 'DEVELOPING'
                        ? 'bg-[#7C3AED]'
                        : node.mastery_state === 'WEAK'
                        ? 'bg-[#DC2626]'
                        : 'bg-[#A3A3A3]'
                    }`}
                  />
                </div>

                {/* 2. Middle Row: Concept Name */}
                <h4 className="text-[12px] font-black font-display uppercase tracking-tight text-[#111218] leading-tight line-clamp-2">
                  {node.name}
                </h4>

                {/* 3. Bottom Row: Thin Mastery Bar & Score */}
                <div className="space-y-1">
                  <div className="w-full h-1 bg-[#111218]/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${style.bar} transition-all duration-500`}
                      style={{ width: `${Math.max(4, node.mastery_score)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[9px] font-mono font-bold">
                    <span className="text-[#111218]">
                      {node.mastery_state === 'NOT_STUDIED' ? 'New' : `${node.mastery_score}%`}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase ${style.badge}`}
                    >
                      {style.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. COMPACT LEGEND (Top Left)
      ───────────────────────────────────────────────────────────── */}
      <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2 p-2 bg-[#FFFDF7]/95 backdrop-blur-sm border-2 border-[#111218] rounded-xl text-[10px] font-bold font-display uppercase tracking-wider shadow-neo-sm z-20">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#B8FF3D] border border-[#111218]" />
          <span>Mastered (≥80%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E9DFFF] border border-[#111218]" />
          <span>Developing (50-79%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FFD1C7] border border-[#111218]" />
          <span>Needs Review</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FFFDF7] border border-[#111218]/50" />
          <span>Not Studied</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. COMPACT FLOATING VIEWPORT TOOLBAR (Bottom Left)
      ───────────────────────────────────────────────────────────── */}
      <div className="graph-controls absolute bottom-4 left-4 flex items-center gap-1.5 p-1.5 bg-[#FFFDF7] border-2 border-[#111218] rounded-2xl shadow-neo z-20">
        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded-lg text-[#111218] hover:bg-[#F5F3EC] transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded-lg text-[#111218] hover:bg-[#F5F3EC] transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-[#111218]/20" />
        <button
          onClick={handleFitToScreen}
          className="p-1.5 rounded-lg text-[#111218] hover:bg-[#F5F3EC] transition-colors"
          title="Fit Graph to Screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleReset}
          className="p-1.5 rounded-lg text-[#111218] hover:bg-[#F5F3EC] transition-colors"
          title="Reset Pan & Zoom"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <span className="text-[10px] font-mono font-bold px-1 text-[#636573]">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. RIGHT-SIDE CONCEPT DETAIL DRAWER / SLIDE-OVER PANEL
      ───────────────────────────────────────────────────────────── */}
      <ConceptDetailDrawer
        node={activeNode}
        allNodes={layout.nodes}
        onClose={() => setActiveNode(null)}
        onSelectConcept={(n) => setActiveNode(n)}
      />
    </div>
  );
}
