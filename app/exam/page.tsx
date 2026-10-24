'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  GraduationCap,
  Calendar,
  Clock,
  Sparkles,
  Zap,
  RotateCw,
  CheckCircle2,
  Circle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Layers,
  Eye,
  Check,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Flame,
  Award,
  BarChart3,
  TrendingUp,
  X,
} from 'lucide-react';
import { formatTime } from '@/lib/utils';

interface ConceptMasteryItem {
  id: string;
  name: string;
  category: string | null;
  mastery_score: number;
  exposure_count: number;
  wrong_count: number;
}

interface ExamPlanItemData {
  id: string;
  concept_id?: string | null;
  activity_type: 'learn' | 'revision' | 'flashcards' | 'focus' | 'mock_exam';
  title: string;
  description?: string | null;
  duration_minutes: number;
  priority: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  linked_resource_type?: string | null;
  linked_resource_id?: string | null;
  order_index: number;
  concept?: {
    id: string;
    name: string;
    user_mastery?: { mastery_score: number }[];
  } | null;
}

interface ExamPlanDayData {
  id: string;
  day_number: number;
  date: string;
  status: string;
  items: ExamPlanItemData[];
}

interface ExamData {
  id: string;
  name: string;
  exam_date: string;
  daily_minutes: number;
  goal?: string | null;
  status: 'active' | 'completed' | 'archived';
  plan_version: number;
  last_replanned_at: string;
  replan_reason?: string | null;
  topics: {
    id: string;
    topic_name: string;
    concept_id?: string | null;
    concept?: {
      id: string;
      name: string;
      user_mastery?: { mastery_score: number; wrong_count: number }[];
    } | null;
  }[];
  plan_days: ExamPlanDayData[];
  readiness: {
    readinessPercentage: number;
    strongCount: number;
    developingCount: number;
    weakCount: number;
    unseenCount: number;
  };
  weakTopics?: {
    id?: string | null;
    name: string;
    mastery_score: number;
    wrong_count: number;
    video_id?: string;
  }[];
}

function ExamPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [exams, setExams] = useState<ExamData[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isReplanning, setIsReplanning] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Available Saras concepts for selection
  const [availableConcepts, setAvailableConcepts] = useState<ConceptMasteryItem[]>([]);

  // Create Form State
  const [formName, setFormName] = useState<string>('');
  const [formDate, setFormDate] = useState<string>('');
  const [formDailyMinutes, setFormDailyMinutes] = useState<number>(60);
  const [formGoal, setFormGoal] = useState<string>('');
  const [formSelectedConceptIds, setFormSelectedConceptIds] = useState<Set<string>>(new Set());
  const [formCustomTopics, setFormCustomTopics] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Expanded days in roadmap
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));

  // 1. Fetch available concepts from Knowledge Map API
  const fetchAvailableConcepts = async () => {
    try {
      const res = await fetch('/api/knowledge');
      if (res.ok) {
        const data = await res.json();
        const concepts = (data.nodes || []).map((n: any) => ({
          id: n.id,
          name: n.name,
          category: n.category,
          mastery_score: n.mastery_score,
          exposure_count: n.exposure_count,
          wrong_count: n.wrong_count,
        }));
        setAvailableConcepts(concepts);
      }
    } catch (e) {
      console.error('Failed to fetch available concepts:', e);
    }
  };

  // 2. Fetch list of exams
  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/exams');
      if (res.ok) {
        const data = await res.json();
        setExams(data.exams || []);
        if (data.exams && data.exams.length > 0) {
          const targetId = selectedExamId || data.exams[0].id;
          setSelectedExamId(targetId);
          fetchSingleExam(targetId);
        } else {
          setSelectedExam(null);
        }
      }
    } catch (e) {
      console.error('Failed to fetch exams:', e);
    } finally {
      setLoading(false);
    }
  };

  // 3. Fetch full details for a single selected exam
  const fetchSingleExam = async (examId: string) => {
    try {
      const res = await fetch(`/api/exams/${examId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedExam(data.exam);
      }
    } catch (e) {
      console.error('Failed to fetch single exam:', e);
    }
  };

  useEffect(() => {
    fetchExams();
    fetchAvailableConcepts();
  }, []);

  useEffect(() => {
    if (selectedExamId) {
      fetchSingleExam(selectedExamId);
    }
  }, [selectedExamId]);

  // 4. Calculate Countdown
  const countdown = useMemo(() => {
    if (!selectedExam) return { days: 0, hours: 0, isPast: false };

    const examDate = new Date(selectedExam.exam_date);
    const now = new Date();
    const diffMs = examDate.getTime() - now.getTime();

    if (diffMs <= 0) {
      return { days: 0, hours: 0, isPast: true };
    }

    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    return { days, hours, isPast: false };
  }, [selectedExam]);

  // 5. Handle Toggle Item Completion
  const handleToggleItem = async (itemId: string, currentStatus: string) => {
    if (!selectedExam) return;
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';

    // Optimistic update
    setSelectedExam((prev) => {
      if (!prev) return prev;
      const updatedDays = prev.plan_days.map((d) => ({
        ...d,
        items: d.items.map((it) => (it.id === itemId ? { ...it, status: newStatus as any } : it)),
      }));
      return { ...prev, plan_days: updatedDays };
    });

    try {
      await fetch(`/api/exams/${selectedExam.id}/item`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, status: newStatus }),
      });
      fetchSingleExam(selectedExam.id);
    } catch (e) {
      console.error('Failed to update item status:', e);
    }
  };

  // 6. Handle Adaptive Replan
  const handleReplan = async () => {
    if (!selectedExam) return;
    try {
      setIsReplanning(true);
      const res = await fetch(`/api/exams/${selectedExam.id}/replan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Manual adaptive optimization based on recent mastery',
        }),
      });

      if (res.ok) {
        await fetchSingleExam(selectedExam.id);
      }
    } catch (e) {
      console.error('Error replanning exam:', e);
    } finally {
      setIsReplanning(false);
    }
  };

  // 7. Handle Create Exam Submit
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formDate) {
      alert('Please provide an exam name and date.');
      return;
    }

    if (formSelectedConceptIds.size === 0 && !formCustomTopics.trim()) {
      alert('Please select at least one concept or enter custom topics.');
      return;
    }

    try {
      setIsCreating(true);
      const customTopicsArray = formCustomTopics
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          examDate: formDate,
          dailyMinutes: formDailyMinutes,
          goal: formGoal,
          conceptIds: Array.from(formSelectedConceptIds),
          customTopics: customTopicsArray,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setShowCreateModal(false);
        setFormName('');
        setFormDate('');
        setFormGoal('');
        setFormSelectedConceptIds(new Set());
        setFormCustomTopics('');
        await fetchExams();
        if (data.exam?.id) {
          setSelectedExamId(data.exam.id);
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create exam plan');
      }
    } catch (e) {
      console.error('Error creating exam:', e);
    } finally {
      setIsCreating(false);
    }
  };

  // 8. Handle Mark Exam Complete
  const handleCompleteExam = async () => {
    if (!selectedExam) return;
    if (!confirm('Are you sure you want to mark this exam as completed?')) return;

    try {
      await fetch(`/api/exams/${selectedExam.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      fetchSingleExam(selectedExam.id);
    } catch (e) {
      console.error('Failed to complete exam:', e);
    }
  };

  // 9. Activity Color/Icon Helper
  const getActivityBadge = (type: string) => {
    switch (type) {
      case 'learn':
        return { label: 'Learn & Quiz', bg: 'bg-[#B8FF3D]', text: 'text-[#111218]', icon: BookOpen };
      case 'revision':
        return { label: 'AI Revision', bg: 'bg-[#FFD1C7]', text: 'text-red-950', icon: RotateCw };
      case 'flashcards':
        return { label: 'Flashcards', bg: 'bg-[#DCEEFF]', text: 'text-[#111218]', icon: Layers };
      case 'focus':
        return { label: 'Deep Focus', bg: 'bg-[#E9DFFF]', text: 'text-[#111218]', icon: Eye };
      case 'mock_exam':
        return { label: 'Mock Exam', bg: 'bg-[#111218]', text: 'text-[#B8FF3D]', icon: Zap };
      default:
        return { label: 'Study Drill', bg: 'bg-[#F5F3EC]', text: 'text-[#111218]', icon: Clock };
    }
  };

  // ─── EMPTY STATE: NO EXAMS EXIST ─────────────────────────────────────────
  if (!loading && (!selectedExam || exams.length === 0)) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-8 sm:p-12 shadow-neo space-y-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#B8FF3D] border-2 border-[#111218] flex items-center justify-center text-[#111218] mx-auto shadow-neo-sm">
            <GraduationCap className="w-8 h-8" />
          </div>

          <div className="space-y-3 max-w-xl mx-auto">
            <span className="badge-lime px-3 py-1 text-xs font-black font-display uppercase tracking-wider">
              Adaptive Study Planner
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-[#111218] font-display uppercase tracking-tight">
              Adaptive Exam Mode
            </h1>
            <p className="text-xs sm:text-sm text-[#636573] font-medium leading-relaxed">
              Tell Saras what you&apos;re preparing for, how much time you have, and when the exam is. Saras dynamically builds and continuously adapts your study plan using your real Knowledge Map mastery.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="neo-btn-primary px-8 py-3.5 text-sm font-bold font-display uppercase inline-flex items-center gap-2 shadow-neo"
            >
              <Plus className="w-4 h-4" />
              <span>Create Exam Plan →</span>
            </button>
          </div>
        </div>

        {/* Modal */}
        {showCreateModal && (
          <CreateExamModal
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateExam}
            name={formName}
            setName={setFormName}
            date={formDate}
            setDate={setFormDate}
            dailyMinutes={formDailyMinutes}
            setDailyMinutes={setFormDailyMinutes}
            goal={formGoal}
            setGoal={setFormGoal}
            selectedConcepts={formSelectedConceptIds}
            setSelectedConcepts={setFormSelectedConceptIds}
            customTopics={formCustomTopics}
            setCustomTopics={setFormCustomTopics}
            availableConcepts={availableConcepts}
            isCreating={isCreating}
          />
        )}
      </div>
    );
  }

  if (loading || !selectedExam) {
    return (
      <div className="max-w-4xl mx-auto py-24 text-center space-y-3">
        <RotateCw className="w-8 h-8 animate-spin text-[#111218] mx-auto" />
        <p className="text-xs font-bold font-display uppercase text-[#111218]">
          Loading Exam Plan...
        </p>
      </div>
    );
  }

  // Today's plan day (Day 1 by default or current day)
  const todayPlanDay = selectedExam.plan_days[0];
  const readiness = selectedExam.readiness;
  const isExamCompleted = selectedExam.status === 'completed';

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & READINESS HERO BANNER
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-6 sm:p-8 shadow-neo space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="badge-lime px-2.5 py-0.5 text-xs font-bold uppercase font-display">
                Exam Mode
              </span>
              <span className="text-xs font-mono font-bold text-[#636573]">
                Plan v{selectedExam.plan_version}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111218] font-display uppercase tracking-tight">
              {selectedExam.name}
            </h1>

            {selectedExam.goal && (
              <p className="text-xs text-[#636573] font-medium max-w-xl">
                Goal: {selectedExam.goal}
              </p>
            )}
          </div>

          {/* Countdown & Action Bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Real Countdown Card */}
            <div className="bg-[#111218] text-white px-5 py-3 rounded-2xl border-2 border-[#111218] shadow-neo-sm flex items-center gap-3">
              <Calendar className="w-5 h-5 text-[#B8FF3D]" />
              <div>
                <div className="text-[10px] font-mono font-bold uppercase text-slate-400">
                  Target Date: {new Date(selectedExam.exam_date).toLocaleDateString()}
                </div>
                <div className="text-sm font-black font-display text-white">
                  {countdown.isPast ? (
                    <span className="text-[#FFD1C7]">Exam Date Reached</span>
                  ) : (
                    <span>
                      {countdown.days} Days, {countdown.hours} Hours Left
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Replan Action */}
            <button
              onClick={handleReplan}
              disabled={isReplanning || isExamCompleted}
              className="neo-btn-outline px-4 py-3 text-xs font-bold font-display uppercase flex items-center gap-2 disabled:opacity-50"
            >
              <RotateCw className={`w-4 h-4 ${isReplanning ? 'animate-spin' : ''}`} />
              <span>{isReplanning ? 'Adapting Plan...' : 'Replan Plan'}</span>
            </button>

            {/* Complete or New Exam */}
            {!isExamCompleted ? (
              <button
                onClick={handleCompleteExam}
                className="neo-btn-primary px-4 py-3 text-xs font-bold font-display uppercase flex items-center gap-2 shadow-neo-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-[#B8FF3D]" />
                <span>Mark Complete</span>
              </button>
            ) : (
              <span className="bg-[#DDF6BD] px-4 py-3 rounded-2xl border-2 border-[#111218] text-xs font-bold font-display uppercase text-emerald-950">
                ✓ Exam Completed
              </span>
            )}

            <button
              onClick={() => setShowCreateModal(true)}
              className="neo-btn-lime px-4 py-3 text-xs font-bold font-display uppercase flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-[#111218]" />
              <span>New Plan</span>
            </button>
          </div>
        </div>

        {/* ── LEARNING READINESS BAR ── */}
        <div className="p-5 bg-[#F5F3EC] border-2 border-[#111218] rounded-2xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-[#636573]">
                Current Preparation Level
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-display text-[#111218]">
                  {readiness.readinessPercentage}%
                </span>
                <span className="text-xs text-[#636573] font-medium">
                  across {selectedExam.topics.length} topics
                </span>
              </div>
            </div>

            {/* Pill Metrics */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold">
              <span className="bg-[#DDF6BD] px-2.5 py-1 rounded border border-[#111218] text-emerald-950">
                {readiness.strongCount} Strong
              </span>
              <span className="bg-[#FFE353] px-2.5 py-1 rounded border border-[#111218] text-[#111218]">
                {readiness.developingCount} Developing
              </span>
              <span className="bg-[#FFD1C7] px-2.5 py-1 rounded border border-[#111218] text-red-950">
                {readiness.weakCount} Weak
              </span>
              <span className="bg-[#FFFDF7] px-2.5 py-1 rounded border border-[#111218] text-[#636573]">
                {readiness.unseenCount} Unseen
              </span>
            </div>
          </div>

          {/* Progress Visual Bar */}
          <div className="w-full h-4 bg-[#FFFDF7] border-2 border-[#111218] rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-[#B8FF3D] rounded-full transition-all duration-500 border border-[#111218]/40"
              style={{ width: `${Math.max(5, readiness.readinessPercentage)}%` }}
            />
          </div>

          {selectedExam.replan_reason && (
            <div className="text-[11px] font-mono text-[#636573] pt-1">
              💡 {selectedExam.replan_reason}
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. TWO-COLUMN ADAPTIVE STUDY WORKSPACE
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* ── LEFT 2 COLS: TODAY'S PLAN & MULTI-DAY ROADMAP ── */}
        <div className="lg:col-span-2 space-y-8">
          {/* Today's Focus Card */}
          {todayPlanDay && (
            <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-6 sm:p-8 shadow-neo space-y-6">
              <div className="flex items-center justify-between border-b-2 border-[#111218]/10 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="badge-black px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      Day {todayPlanDay.day_number}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#636573]">
                      {new Date(todayPlanDay.date).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-[#111218] font-display uppercase tracking-tight">
                    Today&apos;s Study Plan
                  </h2>
                </div>

                <div className="text-xs font-mono font-bold text-[#111218]">
                  {todayPlanDay.items.filter((it) => it.status === 'completed').length} / {todayPlanDay.items.length} Tasks
                </div>
              </div>

              {/* Task Cards Checklist */}
              <div className="space-y-3">
                {todayPlanDay.items.map((item) => {
                  const badge = getActivityBadge(item.activity_type);
                  const isDone = item.status === 'completed';

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isDone
                          ? 'bg-[#F5F3EC] border-[#111218]/40 opacity-75'
                          : 'bg-[#FFFDF7] border-[#111218] shadow-neo-sm'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleItem(item.id, item.status)}
                          className={`w-6 h-6 rounded-lg border-2 border-[#111218] flex items-center justify-center mt-0.5 flex-shrink-0 transition-all ${
                            isDone ? 'bg-[#B8FF3D]' : 'bg-[#FFFDF7]'
                          }`}
                        >
                          {isDone && <Check className="w-4 h-4 text-[#111218] stroke-[3]" />}
                        </button>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${badge.bg} ${badge.text} border border-[#111218]`}>
                              {badge.label}
                            </span>
                            <span className="text-[10px] font-mono text-[#636573]">
                              {item.duration_minutes} mins
                            </span>
                          </div>

                          <h3
                            className={`text-sm font-bold text-[#111218] font-display ${
                              isDone ? 'line-through text-[#636573]' : ''
                            }`}
                          >
                            {item.title}
                          </h3>

                          {item.description && (
                            <p className="text-xs text-[#636573] font-medium leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Direct CTA Action Button */}
                      <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                        {item.activity_type === 'learn' && (
                          <NextLink
                            href={item.linked_resource_id ? `/video/${item.linked_resource_id}` : '/#explore-section'}
                            className="neo-btn-primary px-3.5 py-1.5 text-xs font-bold font-display uppercase flex items-center gap-1.5 shadow-neo-sm"
                          >
                            <span>Learn →</span>
                          </NextLink>
                        )}

                        {item.activity_type === 'revision' && (
                          <NextLink
                            href="/revision?mode=weak_only"
                            className="neo-btn-primary px-3.5 py-1.5 text-xs font-bold font-display uppercase flex items-center gap-1.5 shadow-neo-sm"
                          >
                            <span>Revise →</span>
                          </NextLink>
                        )}

                        {item.activity_type === 'flashcards' && (
                          <NextLink
                            href="/flashcards"
                            className="neo-btn-lime px-3.5 py-1.5 text-xs font-bold font-display uppercase flex items-center gap-1.5"
                          >
                            <span>Recall →</span>
                          </NextLink>
                        )}

                        {item.activity_type === 'focus' && (
                          <NextLink
                            href="/focus"
                            className="neo-btn-outline px-3.5 py-1.5 text-xs font-bold font-display uppercase flex items-center gap-1.5"
                          >
                            <span>Focus →</span>
                          </NextLink>
                        )}

                        {item.activity_type === 'mock_exam' && (
                          <NextLink
                            href="/revision?mode=smart_mix"
                            className="neo-btn-primary px-3.5 py-1.5 text-xs font-bold font-display uppercase flex items-center gap-1.5 shadow-neo-sm"
                          >
                            <Zap className="w-3.5 h-3.5 text-[#B8FF3D]" />
                            <span>Mock Test →</span>
                          </NextLink>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Multi-Day Roadmap Accordion */}
          <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-6 sm:p-8 shadow-neo space-y-6">
            <div className="space-y-1">
              <span className="badge-black px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                Full Curriculum
              </span>
              <h2 className="text-2xl font-extrabold text-[#111218] font-display uppercase tracking-tight">
                Study Roadmap
              </h2>
            </div>

            <div className="space-y-3">
              {selectedExam.plan_days.map((day) => {
                const isExpanded = expandedDays.has(day.day_number);
                const completedCount = day.items.filter((it) => it.status === 'completed').length;
                const isDayComplete = completedCount === day.items.length && day.items.length > 0;

                return (
                  <div
                    key={day.id}
                    className="border-2 border-[#111218] rounded-2xl overflow-hidden transition-all bg-[#F5F3EC]"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        const next = new Set(expandedDays);
                        if (next.has(day.day_number)) next.delete(day.day_number);
                        else next.add(day.day_number);
                        setExpandedDays(next);
                      }}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-[#EAE6DB] transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-xl border-2 border-[#111218] flex items-center justify-center text-xs font-mono font-bold ${
                            isDayComplete ? 'bg-[#B8FF3D]' : 'bg-[#FFFDF7]'
                          }`}
                        >
                          {isDayComplete ? '✓' : day.day_number}
                        </div>

                        <div>
                          <div className="text-xs font-black font-display uppercase text-[#111218]">
                            Day {day.day_number} · {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </div>
                          <div className="text-[10px] font-mono text-[#636573]">
                            {day.items.length} tasks · {day.items.reduce((acc, it) => acc + it.duration_minutes, 0)} mins
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-[#636573]">
                          {completedCount}/{day.items.length}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-[#111218]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[#111218]" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-4 bg-[#FFFDF7] border-t-2 border-[#111218] space-y-2">
                        {day.items.map((it) => {
                          const badge = getActivityBadge(it.activity_type);
                          return (
                            <div
                              key={it.id}
                              className="p-3 bg-[#F5F3EC] border border-[#111218]/30 rounded-xl flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase font-mono ${badge.bg} ${badge.text}`}>
                                  {badge.label}
                                </span>
                                <span className="font-bold text-[#111218]">{it.title}</span>
                              </div>
                              <span className="font-mono text-[10px] text-[#636573]">
                                {it.duration_minutes}m
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── RIGHT 1 COL: WEAK CONCEPTS & EXAM STATS ── */}
        <div className="space-y-8">
          {/* Needs Attention Panel */}
          <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-6 shadow-neo space-y-5">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#FFD1C7] border border-[#111218] rounded-md text-red-950 text-[10px] font-mono font-bold uppercase">
                <AlertTriangle className="w-3 h-3 text-red-700" />
                <span>Needs Attention</span>
              </div>
              <h3 className="text-lg font-black font-display uppercase tracking-tight text-[#111218]">
                Weak Concepts
              </h3>
            </div>

            {selectedExam.weakTopics && selectedExam.weakTopics.length > 0 ? (
              <div className="space-y-3">
                {selectedExam.weakTopics.map((topic, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-[#FFFDF7] border-2 border-[#111218] rounded-2xl shadow-neo-sm flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-black font-display uppercase text-[#111218]">
                        {topic.name}
                      </h4>
                      <div className="text-[10px] font-mono font-bold text-[#636573]">
                        Mastery: {topic.mastery_score}% {topic.wrong_count > 0 && `· ${topic.wrong_count} mistakes`}
                      </div>
                    </div>

                    <NextLink
                      href="/revision?mode=weak_only"
                      className="neo-btn-primary px-3 py-1 text-[10px] font-bold font-display uppercase"
                    >
                      Review →
                    </NextLink>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-[#DDF6BD] border-2 border-[#111218] rounded-2xl text-xs font-bold text-emerald-950 text-center">
                ✓ No weak concepts recorded! All topics are developing or mastered.
              </div>
            )}
          </div>

          {/* Exam Summary / Target Study Budget */}
          <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-6 shadow-neo space-y-4">
            <h3 className="text-base font-black font-display uppercase tracking-tight text-[#111218]">
              Study Configuration
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#F5F3EC] border border-[#111218] rounded-xl flex items-center justify-between">
                <span className="font-medium text-[#636573]">Daily Time Budget</span>
                <span className="font-bold font-mono text-[#111218]">
                  {selectedExam.daily_minutes} mins/day
                </span>
              </div>

              <div className="p-3 bg-[#F5F3EC] border border-[#111218] rounded-xl flex items-center justify-between">
                <span className="font-medium text-[#636573]">Total Roadmap Duration</span>
                <span className="font-bold font-mono text-[#111218]">
                  {selectedExam.plan_days.length} Days
                </span>
              </div>

              <div className="p-3 bg-[#F5F3EC] border border-[#111218] rounded-xl flex items-center justify-between">
                <span className="font-medium text-[#636573]">Exam Topics</span>
                <span className="font-bold font-mono text-[#111218]">
                  {selectedExam.topics.length} Concepts
                </span>
              </div>
            </div>

            <div className="pt-2">
              <NextLink
                href="/knowledge"
                className="neo-btn-outline w-full py-2.5 text-xs font-bold font-display uppercase flex items-center justify-center gap-1.5"
              >
                <span>View in Knowledge Map</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </NextLink>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showCreateModal && (
        <CreateExamModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateExam}
          name={formName}
          setName={setFormName}
          date={formDate}
          setDate={setFormDate}
          dailyMinutes={formDailyMinutes}
          setDailyMinutes={setFormDailyMinutes}
          goal={formGoal}
          setGoal={setFormGoal}
          selectedConcepts={formSelectedConceptIds}
          setSelectedConcepts={setFormSelectedConceptIds}
          customTopics={formCustomTopics}
          setCustomTopics={setFormCustomTopics}
          availableConcepts={availableConcepts}
          isCreating={isCreating}
        />
      )}
    </div>
  );
}

function CreateExamModal({
  onClose,
  onSubmit,
  name,
  setName,
  date,
  setDate,
  dailyMinutes,
  setDailyMinutes,
  goal,
  setGoal,
  selectedConcepts,
  setSelectedConcepts,
  customTopics,
  setCustomTopics,
  availableConcepts,
  isCreating,
}: {
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  name: string;
  setName: (s: string) => void;
  date: string;
  setDate: (s: string) => void;
  dailyMinutes: number;
  setDailyMinutes: (n: number) => void;
  goal: string;
  setGoal: (s: string) => void;
  selectedConcepts: Set<string>;
  setSelectedConcepts: (s: Set<string>) => void;
  customTopics: string;
  setCustomTopics: (s: string) => void;
  availableConcepts: ConceptMasteryItem[];
  isCreating: boolean;
}) {
  const toggleConcept = (id: string) => {
    const next = new Set(selectedConcepts);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedConcepts(next);
  };

  const selectAll = () => {
    setSelectedConcepts(new Set(availableConcepts.map((c) => c.id)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-neo-lg space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b-2 border-[#111218]/10 pb-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#111218]" />
            <h2 className="text-xl font-extrabold font-display uppercase tracking-tight text-[#111218]">
              Create Exam Study Plan
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg border-2 border-[#111218] hover:bg-[#F5F3EC]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Exam Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold font-display uppercase text-[#111218]">
              Exam Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Deep Learning Midterm, Data Structures Final"
              className="w-full p-3 bg-[#F5F3EC] border-2 border-[#111218] rounded-xl text-xs font-medium text-[#111218] placeholder-slate-400 focus:outline-none"
            />
          </div>

          {/* Exam Date & Daily Minutes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold font-display uppercase text-[#111218]">
                Exam Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 bg-[#F5F3EC] border-2 border-[#111218] rounded-xl text-xs font-medium text-[#111218] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold font-display uppercase text-[#111218]">
                Daily Study Time
              </label>
              <select
                value={dailyMinutes}
                onChange={(e) => setDailyMinutes(Number(e.target.value))}
                className="w-full p-3 bg-[#F5F3EC] border-2 border-[#111218] rounded-xl text-xs font-bold text-[#111218] focus:outline-none"
              >
                <option value={30}>30 mins / day</option>
                <option value={45}>45 mins / day</option>
                <option value={60}>60 mins / day (Recommended)</option>
                <option value={90}>90 mins / day</option>
                <option value={120}>120 mins / day</option>
              </select>
            </div>
          </div>

          {/* Option A: Select from Saras Concepts */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold font-display uppercase text-[#111218]">
                Select Concepts from Knowledge Map
              </label>
              {availableConcepts.length > 0 && (
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[10px] font-bold font-mono text-[#111218] underline"
                >
                  Select All ({availableConcepts.length})
                </button>
              )}
            </div>

            {availableConcepts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-[#F5F3EC] border-2 border-[#111218] rounded-xl">
                {availableConcepts.map((c) => {
                  const isChecked = selectedConcepts.has(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleConcept(c.id)}
                      className={`p-2 rounded-lg border text-left transition-all text-xs flex flex-col justify-between ${
                        isChecked
                          ? 'bg-[#B8FF3D] border-[#111218] font-bold shadow-neo-sm'
                          : 'bg-[#FFFDF7] border-[#111218]/30 hover:border-[#111218]'
                      }`}
                    >
                      <span className="truncate">{c.name}</span>
                      <span className="text-[9px] font-mono text-[#636573]">
                        {c.mastery_score}% mastery
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[#636573] p-3 bg-[#F5F3EC] rounded-xl border border-[#111218]/30">
                No concepts in Knowledge Map yet. Add custom topics below.
              </p>
            )}
          </div>

          {/* Option B: Custom Topics */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold font-display uppercase text-[#111218]">
              Or Add Custom Topics (Comma-separated)
            </label>
            <input
              type="text"
              value={customTopics}
              onChange={(e) => setCustomTopics(e.target.value)}
              placeholder="e.g. Dynamic Programming, Graph Traversal, Binary Search"
              className="w-full p-3 bg-[#F5F3EC] border-2 border-[#111218] rounded-xl text-xs font-medium text-[#111218] placeholder-slate-400 focus:outline-none"
            />
          </div>

          {/* Optional Goal */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold font-display uppercase text-[#111218]">
              Optional Target Goal
            </label>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Score >90%, Master all weak concepts"
              className="w-full p-3 bg-[#F5F3EC] border-2 border-[#111218] rounded-xl text-xs font-medium text-[#111218] placeholder-slate-400 focus:outline-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-3 border-t-2 border-[#111218] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="neo-btn-outline px-4 py-2.5 text-xs font-bold font-display uppercase"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="neo-btn-primary px-6 py-2.5 text-xs font-bold font-display uppercase flex items-center gap-2 shadow-neo-sm disabled:opacity-50"
            >
              {isCreating ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Plan...</span>
                </>
              ) : (
                <>
                  <span>Create Plan →</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#B8FF3D]" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ExamPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto py-24 text-center space-y-3">
          <RotateCw className="w-8 h-8 animate-spin text-[#111218] mx-auto" />
          <p className="text-xs font-bold font-display uppercase text-[#111218]">
            Loading Exam Mode...
          </p>
        </div>
      }
    >
      <ExamPageContent />
    </Suspense>
  );
}
