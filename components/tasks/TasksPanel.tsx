'use client';

import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Loader2,
  ListTodo,
  X,
  ArrowRight,
} from 'lucide-react';

export interface TaskItem {
  id: string;
  label: string;
  done: boolean;
  linked_video_id?: string | null;
  linked_video?: {
    id: string;
    title: string;
    thumbnail_url?: string | null;
  } | null;
  created_at: string;
}

interface TasksPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TasksPanel({ isOpen, onClose }: TasksPanelProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (e) {
      console.warn('Failed to load tasks:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTasks();
    }
  }, [isOpen]);

  const handleToggleTask = async (taskId: string, currentDone: boolean) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, done: !currentDone } : t))
    );

    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, done: !currentDone }),
      });
    } catch (e) {
      console.error('Failed to update task:', e);
      fetchTasks();
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    setIsAdding(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.task) {
          setTasks((prev) => [data.task, ...prev]);
          setNewLabel('');
        }
      }
    } catch (e) {
      console.error('Failed to add task:', e);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await fetch(`/api/tasks?id=${taskId}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Failed to delete task:', e);
      fetchTasks();
    }
  };

  if (!isOpen) return null;

  const completedCount = tasks.filter((t) => t.done).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111218]/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="max-w-lg w-full bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-6 shadow-neo-xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b-2 border-[#111218]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#B8FF3D] border-2 border-[#111218] flex items-center justify-center text-[#111218] shadow-neo-sm">
              <ListTodo className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#111218] font-display uppercase tracking-tight flex items-center gap-2">
                Study Goals & Tasks
                <span className="badge-lime px-2 py-0.2 text-[10px] font-mono font-bold">
                  {completedCount}/{tasks.length} done
                </span>
              </h3>
              <p className="text-xs text-[#636573] font-medium">Keep track of your active study milestones</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#111218] hover:bg-[#F5F3EC] border border-transparent hover:border-[#111218] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Add Task Input */}
        <form onSubmit={handleAddTask} className="flex items-center gap-2">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Add a new study goal or task..."
            className="flex-1 bg-[#F5F3EC] border-2 border-[#111218] rounded-xl px-3.5 py-2 text-xs font-medium text-[#111218] placeholder-slate-400 focus:outline-none focus:bg-[#FFFDF7]"
          />
          <button
            type="submit"
            disabled={isAdding || !newLabel.trim()}
            className="neo-btn-lime px-4 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
          >
            {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>Add</span>
          </button>
        </form>

        {/* Tasks List */}
        <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1 no-scrollbar">
          {loading ? (
            <div className="py-8 text-center text-xs text-[#636573] flex items-center justify-center gap-2 font-medium">
              <Loader2 className="w-4 h-4 animate-spin text-[#111218]" />
              <span>Loading your study tasks...</span>
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-8 text-center space-y-1.5 bg-[#F5F3EC] rounded-2xl border-2 border-dashed border-[#111218]/30 p-4">
              <p className="text-xs font-bold text-[#111218] uppercase">No active study goals yet.</p>
              <p className="text-[11px] text-[#636573]">Add milestones above to track your daily progress.</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className={`p-3.5 rounded-xl border-2 border-[#111218] flex items-center justify-between gap-3 transition-all ${
                  task.done
                    ? 'bg-[#EAE6DB] text-[#636573] shadow-none'
                    : 'bg-[#FFFDF7] text-[#111218] shadow-neo-sm hover:-translate-y-0.5'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => handleToggleTask(task.id, task.done)}
                    className="flex-shrink-0 text-[#111218] hover:scale-110 transition-transform"
                  >
                    {task.done ? (
                      <CheckSquare className="w-4 h-4 text-[#111218] fill-[#B8FF3D]" />
                    ) : (
                      <Square className="w-4 h-4 text-[#111218]" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-bold ${
                        task.done ? 'line-through text-[#636573]' : 'text-[#111218]'
                      }`}
                    >
                      {task.label}
                    </p>

                    {task.linked_video && (
                      <NextLink
                        href={`/video/${task.linked_video.id}`}
                        onClick={onClose}
                        className="text-[10px] font-bold text-[#111218] hover:underline flex items-center gap-1 mt-0.5 truncate"
                      >
                        <span className="badge-lime px-1.5 py-0.2 text-[9px]">Lesson</span>
                        <span>{task.linked_video.title}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </NextLink>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteTask(task.id)}
                  className="p-1 text-[#636573] hover:text-rose-600 transition-colors flex-shrink-0"
                  title="Delete task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
