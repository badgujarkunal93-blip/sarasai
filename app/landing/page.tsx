'use client';

import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';
import {
  Sparkles,
  ArrowRight,
  Play,
  Check,
  Cpu,
  Layers,
  Eye,
  ShieldCheck,
  Zap,
  RotateCw,
  Search,
  BookOpen,
  ArrowUpRight,
  Database,
  Code2,
  Terminal,
  Activity,
  ChevronDown,
  Lock,
  Flame,
  CheckCircle2,
  ListFilter,
  BarChart3,
  Lightbulb,
  Workflow,
  Share2,
  ExternalLink,
  GraduationCap,
  Hammer,
  Network,
  RotateCcw,
  SlidersHorizontal,
  FolderGit2,
} from 'lucide-react';

export default function SarasLandingPage() {
  const [activePipelineStage, setActivePipelineStage] = useState<string>('knowledge');
  const [activeLoopStep, setActiveLoopStep] = useState<number>(0);
  const [simulationState, setSimulationState] = useState<'idle' | 'running' | 'completed'>('idle');
  const [simStep, setSimStep] = useState<number>(0);
  const [simUrl, setSimUrl] = useState<string>('https://www.youtube.com/watch?v=kqtD5dpn9C8');

  // Loop through signature learning loop steps automatically
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveLoopStep((prev) => (prev + 1) % 8);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  // Run interactive pipeline simulator
  const handleRunSimulation = () => {
    if (simulationState === 'running') return;
    setSimulationState('running');
    setSimStep(1);

    setTimeout(() => setSimStep(2), 800);
    setTimeout(() => setSimStep(3), 1600);
    setTimeout(() => setSimStep(4), 2400);
    setTimeout(() => setSimStep(5), 3200);
    setTimeout(() => setSimStep(6), 4000);
    setTimeout(() => setSimStep(7), 4800);
    setTimeout(() => {
      setSimStep(8);
      setSimulationState('completed');
    }, 5600);
  };

  const agentCards = [
    {
      id: 'ingest',
      title: 'Ingestion Agent',
      badge: '01 / INPUT',
      input: 'YouTube Video URL / Stream',
      output: 'Clean Transcript & Chapters',
      color: '#B8FF3D',
      desc: 'Extracts video ID, checks deterministic SQLite/Prisma cache, and parses timestamped transcript tokens for downstream LLM processing.',
    },
    {
      id: 'segment',
      title: 'Segmentation Agent',
      badge: '02 / STRUCTURE',
      input: 'Timestamped Transcript Stream',
      output: 'Topic-Bounded Learning Checkpoints',
      color: '#E9DFFF',
      desc: 'Applies pedagogical prompt heuristics to detect semantic topic transitions and partition raw video captions into structured chapters.',
    },
    {
      id: 'quiz',
      title: 'Quiz Agent',
      badge: '03 / VERIFY',
      input: 'Segment Transcript Slices',
      output: 'Grounded Checkpoint Quizzes',
      color: '#DCEEFF',
      desc: 'Synthesizes 4-option diagnostic multiple-choice questions strictly from the current video segment, gating progress until answered correctly.',
    },
    {
      id: 'recall',
      title: 'Recall Agent',
      badge: '04 / RETENTION',
      input: 'Video Transcript & Terms',
      output: 'Spaced Repetition Flashcards',
      color: '#DDF6BD',
      desc: 'Extracts core definitions and active recall pairs directly taught in the video and structures them into persistent study decks.',
    },
    {
      id: 'concept',
      title: 'Concept Engine',
      badge: '05 / GRAPH',
      input: 'Processed Lesson Content',
      output: 'Concepts + Prerequisite DAG',
      color: '#B8FF3D',
      desc: 'Identifies atomic technical concepts and extracts prerequisite and hierarchical relationships to construct a data-driven Knowledge Map.',
    },
    {
      id: 'revision',
      title: 'Revision Engine',
      badge: '06 / ADAPTATION',
      input: 'Mastery Scores + Past Mistakes',
      output: 'Personalized Revision Session',
      color: '#E9DFFF',
      desc: 'Ranks revision candidates using a multi-factor priority formula (weakness, mistake frequency, age, recency) to curate focused study runs.',
    },
    {
      id: 'exam',
      title: 'Exam Planner',
      badge: '07 / PLANNING',
      input: 'Mastery + Target Date + Daily Budget',
      output: 'Adaptive Multi-Day Roadmap',
      color: '#FFE353',
      desc: 'Applies topological sorting on concept prerequisites to build a strict daily study timetable that automatically replans upon performance changes.',
    },
    {
      id: 'project',
      title: 'Project Generator',
      badge: '08 / APPLICATION',
      input: 'Learned Concepts + Source Transcript',
      output: 'Practical Project Milestone Spec',
      color: '#FFD1C7',
      desc: 'Transforms technical concepts actually taught in the video into a grounded software project roadmap with requirements and milestone tracking.',
    },
    {
      id: 'focus',
      title: 'Deep Focus Engine',
      badge: 'MONITORING',
      input: 'In-Browser Camera Stream',
      output: 'Real-Time Attention Analytics',
      color: '#111218',
      desc: 'Analyzes face landmarks entirely on-device with MediaPipe & WebAssembly. Automatically pauses playback if gaze leaves the viewport.',
    },
  ];

  const learningLoopSteps = [
    { title: 'Watch', desc: 'Stream video chapters with timestamped captions' },
    { title: 'Understand', desc: 'Read AI-synthesized Smart Notes with key definitions' },
    { title: 'Verify', desc: 'Solve checkpoint quizzes before unlocking next part' },
    { title: 'Recall', desc: 'Drill active recall cards with spaced repetition' },
    { title: 'Connect', desc: 'Explore knowledge graph & prerequisite relationships' },
    { title: 'Revise', desc: 'Run personalized revision sessions on weak concepts' },
    { title: 'Apply', desc: 'Build grounded projects mapped directly to video skills' },
    { title: 'Master', desc: 'Track readiness toward your exam target date' },
  ];

  return (
    <div className="min-h-screen bg-[#F5F3EC] text-[#111218] selection:bg-[#B8FF3D] selection:text-[#111218]">
      {/* ─────────────────────────────────────────────────────────────
          1. DEDICATED LANDING NAVBAR
      ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full bg-[#F5F3EC]/90 backdrop-blur-md border-b-2 border-[#111218] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <NextLink href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-[#B8FF3D] border-2 border-[#111218] shadow-neo-sm flex items-center justify-center group-hover:-translate-y-0.5 transition-transform">
              <Sparkles className="w-4 h-4 text-[#111218] fill-[#111218]" />
            </div>
            <span className="font-display font-black text-lg tracking-tight text-[#111218] flex items-center">
              Saras
              <span className="text-[#111218] bg-[#B8FF3D] px-1.5 py-0.2 rounded ml-1 border border-[#111218] text-xs font-black">
                AI
              </span>
            </span>
          </NextLink>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-5 text-[11px] font-bold font-display uppercase tracking-wider text-[#111218]">
            <a href="#how-it-works" className="hover:text-[#636573] transition-colors">
              How It Works
            </a>
            <a href="#intelligence" className="hover:text-[#636573] transition-colors">
              Intelligence
            </a>
            <a href="#knowledge-map" className="hover:text-[#636573] transition-colors">
              Knowledge Map
            </a>
            <a href="#revision" className="hover:text-[#636573] transition-colors">
              AI Revision
            </a>
            <a href="#exam-mode" className="hover:text-[#636573] transition-colors">
              Exam Mode
            </a>
            <a href="#tech-stack" className="hover:text-[#636573] transition-colors">
              Tech Stack
            </a>
            <a href="#privacy" className="hover:text-[#636573] transition-colors">
              Focus & Privacy
            </a>
            <a href="#status" className="hover:text-[#636573] transition-colors">
              Status
            </a>
          </nav>

          {/* App Entry CTA */}
          <div className="flex items-center gap-3">
            <NextLink
              href="/discover"
              className="neo-btn-primary px-4 py-2 text-xs font-bold font-display uppercase flex items-center gap-1.5 shadow-neo-sm"
            >
              <span>Start Learning →</span>
            </NextLink>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. HERO: "TURN ANY VIDEO INTO A PERSONAL LEARNING SYSTEM"
      ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 border-b-2 border-[#111218]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="max-w-4xl space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FFFDF7] border-2 border-[#111218] rounded-full shadow-neo-sm">
              <span className="w-2 h-2 rounded-full bg-[#B8FF3D] border border-[#111218] animate-pulse" />
              <span className="text-[11px] font-bold font-mono uppercase tracking-widest text-[#111218]">
                AI-Powered Active Learning Platform
              </span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black font-display uppercase tracking-tight text-[#111218] leading-[1.05]">
              Turn Any{' '}
              <span className="bg-[#B8FF3D] px-2 py-0.5 border-2 border-[#111218] shadow-neo-sm inline-block">
                Video
              </span>{' '}
              Into A Personal{' '}
              <span className="bg-[#E9DFFF] px-2 py-0.5 border-2 border-[#111218] shadow-neo-sm inline-block">
                Learning
              </span>{' '}
              System.
            </h1>

            <p className="text-base sm:text-lg text-[#21232C] font-medium max-w-2xl leading-relaxed">
              Saras AI transforms educational content into structured lessons, grounded recall, personalized knowledge maps, adaptive revision, exam plans, and practical projects.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <NextLink
                href="/discover"
                className="neo-btn-primary px-7 py-3.5 text-sm font-black font-display uppercase flex items-center gap-2 shadow-neo hover:shadow-neo-lg"
              >
                <span>Start Learning →</span>
                <Sparkles className="w-4 h-4 text-[#B8FF3D]" />
              </NextLink>

              <a
                href="#intelligence-loop"
                className="neo-btn-outline px-6 py-3.5 text-sm font-bold font-display uppercase flex items-center gap-2"
              >
                <span>Explore the Intelligence ↓</span>
              </a>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              3. HERO VISUAL: THE SARAS INTELLIGENCE LOOP
          ───────────────────────────────────────────────────────────── */}
          <div
            id="intelligence-loop"
            className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-6 sm:p-8 shadow-neo-lg space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b-2 border-[#111218]">
              <div className="space-y-0.5">
                <span className="badge-black px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest font-mono">
                  FULL SYSTEM ARCHITECTURE
                </span>
                <h3 className="text-lg sm:text-xl font-black font-display uppercase tracking-tight text-[#111218]">
                  The Saras Intelligence Loop
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-[#636573]">
                8 Connected Intelligence Layers
              </span>
            </div>

            {/* Architecture Node DAG Flow */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {[
                { stage: '1. Ingest', icon: Play, label: 'YouTube Video', color: 'bg-[#B8FF3D]' },
                { stage: '2. Segment', icon: Workflow, label: 'Topic Chapters', color: 'bg-[#E9DFFF]' },
                { stage: '3. Quiz', icon: CheckCircle2, label: 'Checkpoint Gating', color: 'bg-[#DCEEFF]' },
                { stage: '4. Recall', icon: Layers, label: 'Flashcards', color: 'bg-[#DDF6BD]' },
                { stage: '5. Graph', icon: Network, label: 'Knowledge Map', color: 'bg-[#B8FF3D]' },
                { stage: '6. Revise', icon: RotateCw, label: 'Adaptive Recall', color: 'bg-[#E9DFFF]' },
                { stage: '7. Exam', icon: GraduationCap, label: 'Study Roadmap', color: 'bg-[#FFE353]' },
                { stage: '8. Build', icon: Hammer, label: 'Project Roadmap', color: 'bg-[#FFD1C7]' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => setActivePipelineStage(item.stage.split('.')[1].trim().toLowerCase())}
                  className={`p-3 rounded-2xl border-2 border-[#111218] flex flex-col justify-between h-28 cursor-pointer transition-all shadow-neo-sm hover:-translate-y-1 hover:shadow-neo ${
                    item.color
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-black uppercase tracking-wider text-[#111218]">
                      {item.stage}
                    </span>
                    <item.icon className="w-3.5 h-3.5 text-[#111218]" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs font-black font-display uppercase tracking-tight text-[#111218] block leading-tight">
                      {item.label}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-[#111218]/15 rounded-full overflow-hidden">
                    <div className="h-full bg-[#111218] w-full" />
                  </div>
                </div>
              ))}
            </div>

            {/* Pipeline Statement */}
            <div className="p-4 rounded-2xl bg-[#F5F3EC] border-2 border-[#111218] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 font-medium text-[#21232C]">
                <Sparkles className="w-4 h-4 text-[#111218] flex-shrink-0" />
                <span>
                  <strong>Deterministic & Grounded:</strong> Every question, flashcard, and project milestone originates strictly from the video transcript and your verified mastery.
                </span>
              </div>
              <NextLink
                href="/discover#explore-section"
                className="neo-btn-primary px-4 py-2 text-xs font-bold font-display uppercase flex items-center gap-1.5 flex-shrink-0"
              >
                <span>Try In Live App →</span>
              </NextLink>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. FROM CONTENT TO MASTERY: 7 STAGE BREAKDOWN
      ───────────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 border-b-2 border-[#111218]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="max-w-3xl space-y-3">
            <span className="badge-lime px-2.5 py-0.5 text-xs font-bold uppercase font-display">
              Pedagogical Engine
            </span>
            <h2 className="text-3xl sm:text-5xl font-black font-display uppercase tracking-tight text-[#111218]">
              From Content to Mastery
            </h2>
            <p className="text-sm sm:text-base text-[#636573] font-medium leading-relaxed">
              Watching a video is passive. Saras wraps video content into an active, verified loop: Watch → Understand → Verify → Remember → Connect → Revise → Prepare → Build.
            </p>
          </div>

          <div className="space-y-12">
            {/* STAGE 01: SMART VIDEO INGESTION */}
            <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-6 sm:p-8 shadow-neo grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="text-xs font-mono font-black uppercase tracking-widest text-[#636573]">
                  STAGE 01
                </span>
                <h3 className="text-2xl sm:text-3xl font-black font-display uppercase tracking-tight text-[#111218]">
                  01 / Turn a Video Into Structure
                </h3>
                <p className="text-xs sm:text-sm text-[#21232C] font-medium leading-relaxed">
                  Paste any YouTube URL and Saras transforms the raw caption stream into meaningful topic chapters with timestamp boundaries, caching them permanently for deterministic recall.
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <span className="badge-black px-2.5 py-0.5 text-[10px] font-bold uppercase font-mono">
                    Gemma 4 (Local + Cloud)
                  </span>
                  <span className="badge-lime px-2.5 py-0.5 text-[10px] font-bold uppercase font-mono">
                    Deterministic Cache
                  </span>
                </div>
              </div>

              {/* Visual Demo Card */}
              <div className="bg-[#F5F3EC] border-2 border-[#111218] rounded-2xl p-5 space-y-3 font-mono text-xs shadow-neo-sm">
                <div className="flex items-center justify-between pb-2 border-b border-[#111218]/20 text-[10px] text-[#636573]">
                  <span>RAW STREAM → CHAPTERS</span>
                  <span>3Blue1Brown Neural Networks</span>
                </div>
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-[#FFFDF7] border border-[#111218] flex items-center justify-between">
                    <span className="font-bold text-[#111218]">Part 01: Foundations of Neurons</span>
                    <span className="text-[10px] text-[#636573]">00:00 - 04:15</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FFFDF7] border border-[#111218] flex items-center justify-between">
                    <span className="font-bold text-[#111218]">Part 02: Layer Architecture & Weights</span>
                    <span className="text-[10px] text-[#636573]">04:15 - 09:30</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FFFDF7] border border-[#111218] flex items-center justify-between">
                    <span className="font-bold text-[#111218]">Part 03: Activation & Matrix Math</span>
                    <span className="text-[10px] text-[#636573]">09:30 - 15:45</span>
                  </div>
                </div>
              </div>
            </div>

            {/* STAGE 02: CHECKPOINT LEARNING & QUIZ GATING */}
            <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-6 sm:p-8 shadow-neo grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="text-xs font-mono font-black uppercase tracking-widest text-[#636573]">
                  STAGE 02
                </span>
                <h3 className="text-2xl sm:text-3xl font-black font-display uppercase tracking-tight text-[#111218]">
                  02 / Don&apos;t Just Watch. Verify.
                </h3>
                <p className="text-xs sm:text-sm text-[#21232C] font-medium leading-relaxed">
                  Saras automatically pauses playback at chapter boundaries and challenges you with diagnostic checkpoint questions. Future video chapters remain locked until understanding is verified.
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <span className="badge-black px-2.5 py-0.5 text-[10px] font-bold uppercase font-mono">
                    Gated Player
                  </span>
                  <span className="badge-lime px-2.5 py-0.5 text-[10px] font-bold uppercase font-mono">
                    Zero Seek Bypass
                  </span>
                </div>
              </div>

              {/* Visual Demo Card */}
              <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-2xl p-5 space-y-3 shadow-neo-sm">
                <div className="flex items-center justify-between pb-2 border-b-2 border-[#111218]">
                  <span className="badge-black px-2 py-0.5 text-[9px] font-mono font-bold">
                    CHECKPOINT 01 / VERIFICATION
                  </span>
                  <span className="text-xs font-bold text-red-800 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                </div>
                <p className="text-xs font-bold text-[#111218]">
                  What role does an activation function serve in an artificial neuron?
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="p-2 rounded-xl bg-[#F5F3EC] border border-[#111218]/30 font-medium">
                    A. Increases physical RAM usage
                  </div>
                  <div className="p-2 rounded-xl bg-[#B8FF3D] border-2 border-[#111218] font-bold text-[#111218] flex items-center justify-between">
                    <span>B. Introduces non-linearity to the network</span>
                    <Check className="w-3.5 h-3.5 text-[#111218]" />
                  </div>
                </div>
              </div>
            </div>

            {/* STAGE 03: SMART NOTES + RECALL FLASHCARDS */}
            <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-6 sm:p-8 shadow-neo grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="text-xs font-mono font-black uppercase tracking-widest text-[#636573]">
                  STAGE 03
                </span>
                <h3 className="text-2xl sm:text-3xl font-black font-display uppercase tracking-tight text-[#111218]">
                  03 / Turn Watching Into Memory
                </h3>
                <p className="text-xs sm:text-sm text-[#21232C] font-medium leading-relaxed">
                  Every video generates persistent Smart Notes organized into Overview, Key Concepts, Definitions, and Common Mistakes alongside interactive spaced repetition flashcard decks.
                </p>
              </div>

              {/* Side by Side Modules */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-[#F5F3EC] border-2 border-[#111218] space-y-2 shadow-neo-sm">
                  <span className="badge-black px-2 py-0.5 text-[9px] font-mono font-bold">
                    SMART NOTES
                  </span>
                  <h5 className="text-xs font-black uppercase font-display text-[#111218]">
                    Key Concepts & Takeaways
                  </h5>
                  <p className="text-[11px] text-[#636573] leading-snug">
                    Synthesized key definitions linked directly to source video timestamps.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#E9DFFF] border-2 border-[#111218] space-y-2 shadow-neo-sm">
                  <span className="badge-black px-2 py-0.5 text-[9px] font-mono font-bold">
                    FLASHCARDS
                  </span>
                  <h5 className="text-xs font-black uppercase font-display text-[#111218]">
                    Active Spaced Recall
                  </h5>
                  <p className="text-[11px] text-[#21232C] leading-snug font-medium">
                    Drill definitions, toggle mastery, and review cards directly in Flashcards Studio.
                  </p>
                </div>
              </div>
            </div>

            {/* STAGE 04: KNOWLEDGE MAP */}
            <div id="knowledge-map" className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-6 sm:p-8 shadow-neo grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="text-xs font-mono font-black uppercase tracking-widest text-[#636573]">
                  STAGE 04
                </span>
                <h3 className="text-2xl sm:text-3xl font-black font-display uppercase tracking-tight text-[#111218]">
                  04 / See What You Actually Know
                </h3>
                <p className="text-xs sm:text-sm text-[#21232C] font-medium leading-relaxed">
                  Saras connects concepts across all your completed lessons into an interactive, hierarchical Knowledge Map. Colors clearly reflect your verified retention: Lime for Mastered, Lavender for Developing, Coral for Needs Review, and Cream for Not Studied.
                </p>
                <div className="pt-2">
                  <NextLink
                    href="/knowledge"
                    className="neo-btn-primary px-5 py-2.5 text-xs font-bold font-display uppercase inline-flex items-center gap-1.5 shadow-neo-sm"
                  >
                    <span>Explore Knowledge Map →</span>
                  </NextLink>
                </div>
              </div>

              {/* Visual Knowledge Tree */}
              <div className="bg-[#F5F3EC] border-2 border-[#111218] rounded-2xl p-5 space-y-3 shadow-neo-sm">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[#636573] pb-2 border-b border-[#111218]/20">
                  <span>HIERARCHICAL DOMAIN CLUSTER</span>
                  <span>MACHINE LEARNING</span>
                </div>
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-[#B8FF3D] border-2 border-[#111218] flex items-center justify-between text-xs font-bold text-[#111218]">
                    <span>Artificial Neuron</span>
                    <span className="text-[10px]">90% · MASTERED</span>
                  </div>
                  <div className="flex justify-center">
                    <span className="text-[#111218] text-xs">↓</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#E9DFFF] border-2 border-[#111218] flex items-center justify-between text-xs font-bold text-[#111218]">
                    <span>Activation Function</span>
                    <span className="text-[10px]">65% · DEVELOPING</span>
                  </div>
                  <div className="flex justify-center">
                    <span className="text-[#111218] text-xs">↓</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FFD1C7] border-2 border-[#111218] flex items-center justify-between text-xs font-bold text-red-950">
                    <span>Backpropagation & Loss</span>
                    <span className="text-[10px]">35% · NEEDS REVIEW</span>
                  </div>
                </div>
              </div>
            </div>

            {/* STAGE 05: AI REVISION SESSIONS */}
            <div id="revision" className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-6 sm:p-8 shadow-neo grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="text-xs font-mono font-black uppercase tracking-widest text-[#636573]">
                  STAGE 05
                </span>
                <h3 className="text-2xl sm:text-3xl font-black font-display uppercase tracking-tight text-[#111218]">
                  05 / Saras Chooses What You Should Revise
                </h3>
                <p className="text-xs sm:text-sm text-[#21232C] font-medium leading-relaxed">
                  Start an adaptive revision session and Saras automatically curates questions targeting weak concepts, recent mistakes, and older material using a deterministic ranking formula.
                </p>
                <div className="pt-2">
                  <NextLink
                    href="/revision"
                    className="neo-btn-lime px-5 py-2.5 text-xs font-bold font-display uppercase inline-flex items-center gap-1.5 shadow-neo-sm"
                  >
                    <span>Launch AI Revision →</span>
                  </NextLink>
                </div>
              </div>

              {/* Visual Revision Card */}
              <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-2xl p-5 space-y-3 shadow-neo-sm">
                <div className="flex items-center justify-between pb-2 border-b-2 border-[#111218]">
                  <span className="badge-black px-2.5 py-0.5 text-[9px] font-mono font-bold">
                    SMART MIX · 10 ITEMS
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-800">
                    Auto-Recoverable
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-[#FFD1C7] border border-[#111218]">
                    <span className="text-[10px] text-red-900 block font-mono">Weak Areas</span>
                    <span className="font-extrabold text-red-950">4 items</span>
                  </div>
                  <div className="p-2 rounded-xl bg-[#E9DFFF] border border-[#111218]">
                    <span className="text-[10px] text-[#636573] block font-mono">Recent</span>
                    <span className="font-extrabold text-[#111218]">3 items</span>
                  </div>
                  <div className="p-2 rounded-xl bg-[#DDF6BD] border border-[#111218]">
                    <span className="text-[10px] text-[#21232C] block font-mono">Review</span>
                    <span className="font-extrabold text-[#111218]">3 items</span>
                  </div>
                </div>
              </div>
            </div>

            {/* STAGE 06: ADAPTIVE EXAM MODE */}
            <div id="exam-mode" className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-6 sm:p-8 shadow-neo grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="text-xs font-mono font-black uppercase tracking-widest text-[#636573]">
                  STAGE 06
                </span>
                <h3 className="text-2xl sm:text-3xl font-black font-display uppercase tracking-tight text-[#111218]">
                  06 / Turn Knowledge Into a Study Plan
                </h3>
                <p className="text-xs sm:text-sm text-[#21232C] font-medium leading-relaxed">
                  Tell Saras what you&apos;re preparing for, when your exam is, and how much time you have. Saras topologically schedules prerequisites first, guarantees daily time budgets, and dynamically replans if mistakes occur.
                </p>
                <div className="pt-2">
                  <NextLink
                    href="/exam"
                    className="neo-btn-primary px-5 py-2.5 text-xs font-bold font-display uppercase inline-flex items-center gap-1.5 shadow-neo-sm"
                  >
                    <span>Create Exam Plan →</span>
                  </NextLink>
                </div>
              </div>

              {/* Visual Exam Card */}
              <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-2xl p-5 space-y-3 shadow-neo-sm">
                <div className="flex items-center justify-between pb-2 border-b-2 border-[#111218]">
                  <div>
                    <h5 className="text-xs font-black font-display uppercase text-[#111218]">
                      Machine Learning Midterm
                    </h5>
                    <span className="text-[10px] text-[#636573] font-mono">7 Days Remaining · 60m / Day</span>
                  </div>
                  <span className="badge-lime px-2 py-0.5 text-[9px] font-bold">
                    68% READY
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="p-2 rounded-xl bg-[#F5F3EC] border border-[#111218] flex items-center justify-between">
                    <span className="font-bold text-[#111218]">Day 1: Learn Neural Foundations (30m)</span>
                    <span className="text-[10px] text-emerald-700 font-bold">✓ Done</span>
                  </div>
                  <div className="p-2 rounded-xl bg-[#FFFDF7] border border-[#111218] flex items-center justify-between">
                    <span className="font-bold text-[#111218]">Day 2: AI Revision on Activations (30m)</span>
                    <span className="text-[10px] text-[#636573]">Pending</span>
                  </div>
                </div>
              </div>
            </div>

            {/* STAGE 07: BUILD PROJECT GENERATOR */}
            <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-6 sm:p-8 shadow-neo grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="text-xs font-mono font-black uppercase tracking-widest text-[#636573]">
                  STAGE 07
                </span>
                <h3 className="text-2xl sm:text-3xl font-black font-display uppercase tracking-tight text-[#111218]">
                  07 / Learn Something. Then Build It.
                </h3>
                <p className="text-xs sm:text-sm text-[#21232C] font-medium leading-relaxed">
                  When a technical video concludes, Saras transforms the concepts into an actionable software project with requirements and milestone tracking grounded directly in taught skills.
                </p>
                <div className="flex items-center gap-2 pt-1 text-[10px] font-mono text-[#636573]">
                  <span className="badge-black px-2 py-0.5 text-[9px] font-bold">
                    Grounded Skills
                  </span>
                  <span>Grounded in video concepts</span>
                </div>
              </div>

              {/* Visual Project Spec */}
              <div className="bg-[#F5F3EC] border-2 border-[#111218] rounded-2xl p-5 space-y-2.5 shadow-neo-sm">
                <div className="flex items-center justify-between pb-2 border-b border-[#111218]/20">
                  <span className="badge-black px-2 py-0.5 text-[9px] font-mono font-bold">
                    PROJECT ROADMAP
                  </span>
                  <span className="text-[10px] font-mono font-bold text-[#111218]">
                    Intermediate
                  </span>
                </div>
                <h4 className="text-xs font-black font-display uppercase text-[#111218]">
                  Neural Network Simulator in Python
                </h4>
                <div className="flex flex-wrap gap-1 text-[9px] font-mono font-bold">
                  <span className="px-1.5 py-0.5 bg-[#B8FF3D] border border-[#111218] rounded">
                    Matrix Representation
                  </span>
                  <span className="px-1.5 py-0.5 bg-[#E9DFFF] border border-[#111218] rounded">
                    Activation Functions
                  </span>
                  <span className="px-1.5 py-0.5 bg-[#DCEEFF] border border-[#111218] rounded">
                    Layer Architecture
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. SIGNATURE ANIMATED LEARNING LOOP
      ───────────────────────────────────────────────────────────── */}
      <section className="py-20 border-b-2 border-[#111218] bg-[#FFFDF7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
          <div className="max-w-2xl mx-auto space-y-3">
            <span className="badge-lime px-2.5 py-0.5 text-xs font-bold uppercase font-display">
              Continuous Loop
            </span>
            <h2 className="text-3xl sm:text-5xl font-black font-display uppercase tracking-tight text-[#111218]">
              The Saras Learning Cycle
            </h2>
            <p className="text-xs sm:text-sm text-[#636573] font-medium">
              Every lesson strengthens recall, updates your map, and powers personalized revision.
            </p>
          </div>

          {/* Circular 8-Step Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 max-w-6xl mx-auto">
            {learningLoopSteps.map((step, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-2xl border-2 border-[#111218] flex flex-col justify-between h-32 text-left transition-all ${
                  activeLoopStep === idx
                    ? 'bg-[#B8FF3D] shadow-neo scale-105 z-10'
                    : 'bg-[#F5F3EC] shadow-neo-sm opacity-80'
                }`}
              >
                <span className="text-[10px] font-mono font-black uppercase text-[#111218]">
                  0{idx + 1}
                </span>
                <div>
                  <h4 className="text-xs font-black font-display uppercase text-[#111218]">
                    {step.title}
                  </h4>
                  <p className="text-[9px] text-[#21232C] leading-tight font-medium mt-0.5 line-clamp-2">
                    {step.desc}
                  </p>
                </div>
                <span className="text-[10px] font-bold text-[#111218]">→</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. AGENT ARCHITECTURE & "WHY SPECIALIZED AGENTS?"
      ───────────────────────────────────────────────────────────── */}
      <section id="intelligence" className="py-20 border-b-2 border-[#111218]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="max-w-3xl space-y-3">
            <span className="badge-black px-2.5 py-0.5 text-xs font-bold uppercase font-display text-white">
              Multi-Agent System
            </span>
            <h2 className="text-3xl sm:text-5xl font-black font-display uppercase tracking-tight text-[#111218]">
              Why Specialized Agents?
            </h2>
            <p className="text-sm sm:text-base text-[#636573] font-medium">
              One unified pipeline with 8 distinct, deterministic jobs. Rather than relying on a single monolithic prompt, each agent solves one specific pedagogical task.
            </p>
          </div>

          {/* 9 Agent Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agentCards.map((agent) => (
              <div
                key={agent.id}
                className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-6 shadow-neo flex flex-col justify-between space-y-4 hover:-translate-y-1 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b-2 border-[#111218]">
                    <span className="badge-lime px-2 py-0.5 text-[9px] font-mono font-bold">
                      {agent.badge}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-[#636573]">
                      LLaMA 3.3 70B
                    </span>
                  </div>

                  <h3 className="text-lg font-black font-display uppercase text-[#111218]">
                    {agent.title}
                  </h3>

                  <p className="text-xs text-[#21232C] font-medium leading-relaxed">
                    {agent.desc}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#F5F3EC] border border-[#111218]/30 space-y-1 text-[10px] font-mono">
                  <div className="text-[#636573]">
                    <strong className="text-[#111218]">INPUT:</strong> {agent.input}
                  </div>
                  <div className="text-[#636573]">
                    <strong className="text-[#111218]">OUTPUT:</strong> {agent.output}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. LIVE PIPELINE SIMULATOR
      ───────────────────────────────────────────────────────────── */}
      <section className="py-20 border-b-2 border-[#111218] bg-[#FFFDF7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="max-w-3xl space-y-2">
            <span className="badge-lime px-2.5 py-0.5 text-xs font-bold uppercase font-display">
              Interactive Showcase
            </span>
            <h2 className="text-3xl sm:text-4xl font-black font-display uppercase tracking-tight text-[#111218]">
              Live Pipeline Execution
            </h2>
            <p className="text-xs sm:text-sm text-[#636573] font-medium">
              Simulate the 8-stage transformation from YouTube video URL to grounded learning curriculum.
            </p>
          </div>

          <div className="bg-[#F5F3EC] border-2 border-[#111218] rounded-3xl p-6 sm:p-8 shadow-neo space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                value={simUrl}
                onChange={(e) => setSimUrl(e.target.value)}
                placeholder="Paste any YouTube URL..."
                className="flex-1 w-full bg-[#FFFDF7] border-2 border-[#111218] rounded-xl px-4 py-2.5 text-xs font-medium text-[#111218] focus:outline-none shadow-neo-sm"
              />
              <button
                onClick={handleRunSimulation}
                disabled={simulationState === 'running'}
                className="neo-btn-primary px-6 py-2.5 text-xs font-bold font-display uppercase whitespace-nowrap shadow-neo-sm hover:shadow-neo disabled:opacity-50"
              >
                {simulationState === 'running' ? 'Processing Pipeline...' : 'Run Pipeline Demo →'}
              </button>
            </div>

            {/* Step Progress Visualizer */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-center text-xs font-mono">
              {[
                { label: '1. Ingest', activeAt: 1, out: 'Transcript' },
                { label: '2. Segment', activeAt: 2, out: '3 Chapters' },
                { label: '3. Quiz', activeAt: 3, out: '6 Quizzes' },
                { label: '4. Recall', activeAt: 4, out: '8 Cards' },
                { label: '5. Graph', activeAt: 5, out: '7 Concepts' },
                { label: '6. Revise', activeAt: 6, out: 'Smart Mix' },
                { label: '7. Exam', activeAt: 7, out: 'Study Plan' },
                { label: '8. Build', activeAt: 8, out: 'Project Spec' },
              ].map((step, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border-2 border-[#111218] transition-all ${
                    simStep >= step.activeAt
                      ? 'bg-[#B8FF3D] font-bold text-[#111218] shadow-neo-sm scale-102'
                      : 'bg-[#FFFDF7] text-[#636573]'
                  }`}
                >
                  <span className="block text-[10px]">{step.label}</span>
                  <span className="text-[9px] font-bold text-[#111218] mt-1 block">
                    {simStep >= step.activeAt ? `✓ ${step.out}` : '···'}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-[#636573] font-mono text-center">
              * Note: Sample metrics above are an illustrative simulation of pipeline outputs.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          8. TECH STACK (Truthful Architecture)
      ───────────────────────────────────────────────────────────── */}
      <section id="tech-stack" className="py-20 border-b-2 border-[#111218]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-3xl space-y-2">
            <span className="badge-black px-2.5 py-0.5 text-xs font-bold uppercase font-display text-white">
              Engineering Architecture
            </span>
            <h2 className="text-3xl sm:text-5xl font-black font-display uppercase tracking-tight text-[#111218]">
              The Core Tech Stack
            </h2>
            <p className="text-sm text-[#636573] font-medium">
              Built on production-grade web technologies, local in-browser vision models, and dual-provider Gemma 4 intelligence.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { title: 'Next.js 14', category: 'App Router', desc: 'Hybrid SSR & React Server Actions' },
              { title: 'Tailwind CSS', category: 'Design System', desc: 'Neo-brutalist custom tokens' },
              { title: 'Prisma + SQLite', category: 'Data Layer', desc: 'Normalized relational storage' },
              { title: 'Gemma 4 Client', category: 'AI Inference', desc: 'Local Ollama & Cloud Gemini' },
              { title: 'YouTube IFrame', category: 'Video Engine', desc: 'Precision timestamp gating' },
              { title: 'MediaPipe WASM', category: 'Computer Vision', desc: '100% on-device attention' },
            ].map((tech, idx) => (
              <div
                key={idx}
                className="bg-[#FFFDF7] border-2 border-[#111218] p-4 rounded-2xl space-y-1 shadow-neo-sm"
              >
                <span className="text-[9px] font-mono font-bold uppercase text-[#636573]">
                  {tech.category}
                </span>
                <h4 className="text-sm font-black font-display text-[#111218] uppercase">
                  {tech.title}
                </h4>
                <p className="text-[10px] text-[#21232C] font-medium">{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          9. DEEP FOCUS & PRIVACY GUARANTEE
      ───────────────────────────────────────────────────────────── */}
      <section id="privacy" className="py-20 border-b-2 border-[#111218] bg-[#FFFDF7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <span className="badge-lime px-2.5 py-0.5 text-xs font-bold uppercase font-display">
                Deep Work & Privacy
              </span>
              <h2 className="text-3xl sm:text-5xl font-black font-display uppercase tracking-tight text-[#111218]">
                100% On-Device Attention Tracking
              </h2>
              <p className="text-xs sm:text-sm text-[#21232C] font-medium leading-relaxed">
                Deep Focus runs entirely inside your browser canvas using WebAssembly. Camera frames are processed in-memory and discarded instantly. Video is never streamed, recorded to disk, or sent to any server.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <NextLink
                  href="/focus"
                  className="neo-btn-primary px-5 py-2.5 text-xs font-bold font-display uppercase flex items-center gap-1.5 shadow-neo-sm"
                >
                  <Eye className="w-3.5 h-3.5 text-[#B8FF3D]" />
                  <span>Try Deep Focus Studio →</span>
                </NextLink>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-[#B8FF3D] border-2 border-[#111218] space-y-3 shadow-neo">
              <div className="flex items-center gap-2 text-[#111218]">
                <Lock className="w-5 h-5 text-[#111218]" />
                <h4 className="text-sm font-black font-display uppercase">
                  Privacy Trust Guarantee
                </h4>
              </div>
              <div className="p-4 rounded-2xl bg-[#FFFDF7] border-2 border-[#111218] font-mono text-xs space-y-1 text-[#111218]">
                <div>CAMERA STREAM → BROWSER CANVAS</div>
                <div>↳ MEDIAPIPE FACE MESH (WASM)</div>
                <div>↳ ATTENTION DRIFT DETECTED (&gt;4s)</div>
                <div>↳ PLAYBACK AUTO-PAUSED</div>
                <div className="text-emerald-800 font-bold pt-1">✓ 0 FRAMES TRANSMITTED</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          10. PRODUCT STATUS SECTION
      ───────────────────────────────────────────────────────────── */}
      <section id="status" className="py-20 border-b-2 border-[#111218]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="space-y-2">
            <span className="badge-black px-2.5 py-0.5 text-xs font-bold uppercase font-display text-white">
              System Health
            </span>
            <h2 className="text-3xl sm:text-4xl font-black font-display uppercase tracking-tight text-[#111218]">
              Product Implementation Status
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {[
              { name: 'Video Ingestion & Deduplication', status: 'Working', desc: 'Transcript extraction and SQLite caching' },
              { name: 'Segmentation & Checkpoints', status: 'Working', desc: 'Topic-bounded chapters with quiz gating' },
              { name: 'Smart Notes & Flashcards', status: 'Working', desc: 'Structured notes and active recall decks' },
              { name: 'Hierarchical Knowledge Map', status: 'Working', desc: 'Domain clustering and prerequisite DAG' },
              { name: 'Adaptive AI Revision Engine', status: 'Working', desc: 'Smart mix and weak area candidate selection' },
              { name: 'Adaptive Exam Mode', status: 'Working', desc: 'Prerequisite study roadmap with replanning' },
              { name: 'Deep Focus Studio', status: 'Working', desc: 'Local attention monitoring & auto-pause' },
              { name: 'Video → Project Generator', status: 'Working', desc: 'Grounded software project specs' },
              { name: 'Multi-User Isolation', status: 'Working', desc: 'Scoped progress, mastery, and exam plans' },
            ].map((feat, idx) => (
              <div
                key={idx}
                className="bg-[#FFFDF7] border-2 border-[#111218] p-4 rounded-2xl flex items-start justify-between gap-3 shadow-neo-sm"
              >
                <div className="space-y-0.5">
                  <h4 className="font-black font-display uppercase text-[#111218]">{feat.name}</h4>
                  <p className="text-[11px] text-[#636573]">{feat.desc}</p>
                </div>
                <span className="badge-lime px-2 py-0.5 text-[9px] font-mono font-bold flex-shrink-0">
                  {feat.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          11. FINAL HERO CTA
      ───────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-[#B8FF3D] border-b-2 border-[#111218] text-[#111218]">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <span className="badge-black px-3 py-1 text-xs font-bold uppercase font-mono tracking-widest text-white">
            SARAS AI LEARNING SYSTEM
          </span>

          <h2 className="text-4xl sm:text-6xl font-black font-display uppercase tracking-tight text-[#111218] leading-[1.05]">
            Don&apos;t Just Watch. <br /> Build Knowledge.
          </h2>

          <p className="text-base sm:text-lg text-[#111218] font-medium max-w-xl mx-auto leading-relaxed">
            Give Saras a video. Let it structure the lesson, challenge your understanding, map what you know, help you revise, prepare, and build.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <NextLink
              href="/discover"
              className="px-8 py-4 bg-[#111218] text-white hover:bg-black font-black font-display uppercase text-sm rounded-2xl border-2 border-[#111218] shadow-neo hover:shadow-neo-lg hover:-translate-y-0.5 transition-all flex items-center gap-2"
            >
              <span>Open Saras AI →</span>
              <Sparkles className="w-4 h-4 text-[#B8FF3D]" />
            </NextLink>

            <a
              href="#how-it-works"
              className="px-6 py-4 bg-[#FFFDF7] text-[#111218] font-bold font-display uppercase text-sm rounded-2xl border-2 border-[#111218] shadow-neo-sm hover:shadow-neo transition-all"
            >
              <span>Explore How It Works</span>
            </a>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          12. FOOTER
      ───────────────────────────────────────────────────────────── */}
      <footer className="py-12 bg-[#F5F3EC] text-xs text-[#636573] border-t-2 border-[#111218]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
          <div className="flex items-center gap-2">
            <span className="font-black text-[#111218] font-display uppercase">Saras AI</span>
            <span>· Learn. Recall. Understand.</span>
          </div>
          <div>All video content, transcripts & mastery grounded deterministically.</div>
        </div>
      </footer>
    </div>
  );
}
