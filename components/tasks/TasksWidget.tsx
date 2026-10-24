'use client';

import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Video,
  Loader2,
} from 'lucide-react';

export interface TaskItem {
  id: string;
  label: string;
  done: boolean;
  linked_video_id?: string | null;
  linked_video?: {
    id: string;
    title: string;
    thumbnail_url?: string;
  } | null;
}

interface TasksWidgetProps {
  compact?: boolean;
}

export function TasksWidget({ compact = true }: TasksWidgetProps) {
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
      console.warn('Failed to fetch tasks:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleToggleDone = async (id: string, currentDone: boolean) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !currentDone } : t))
    );

    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, done: !currentDone }),
      });
    } catch (e) {
      console.error('Failed to update task done:', e);
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
        setTasks((prev) => [data.task, ...prev]);
        setNewLabel('');
      }
    } catch (e) {
      console.error('Failed to create task:', e);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await fetch(`/api/tasks?id=${id}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.error('Failed to delete task:', e);
      fetchTasks();
    }
  };

  const completedCount = tasks.filter((t) => t.done).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Header & Mini Progress (Section 12) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Study Tasks
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            {completedCount}/{tasks.length}
          </span>
        </div>

        {/* Tiny Progress Bar beneath section title */}
        {tasks.length > 0 && (
          <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full progress-gradient-mint rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Quick Add Form */}
      <form onSubmit={handleAddTask} className="flex items-center gap-1.5">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="New study goal..."
          className="flex-1 bg-[rgba(11,17,32,0.8)] border border-white/[0.08] hover:border-white/[0.14] rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[rgba(139,124,255,0.4)]"
        />
        <button
          type="submit"
          disabled={isAdding || !newLabel.trim()}
          className="p-1 bg-[rgba(20,27,48,0.8)] hover:bg-[#8B7CFF] border border-white/[0.08] hover:border-[rgba(139,124,255,0.4)] text-slate-300 hover:text-white rounded-lg disabled:opacity-40 transition-colors"
          title="Add task"
        >
          {isAdding ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
        </button>
      </form>

      {/* Task List (Compact Rows) */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1 max-h-56">
        {loading ? (
          <div className="flex items-center justify-center py-4 text-slate-500 text-xs gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8B7CFF]" />
            <span>Loading tasks...</span>
          </div>
        ) : tasks.length === 0 ? (
          <p className="text-slate-500 text-[11px] text-center py-3 italic">
            No active tasks.
          </p>
        ) : (
          tasks.map((task, idx) => {
            const isCompleted = task.done;
            const isActiveFirst = !task.done && idx === tasks.findIndex((t) => !t.done);

            return (
              <div
                key={task.id}
                className="group flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] transition-colors"
              >
                {/* Status Indicator Icon (Section 12) */}
                <button
                  onClick={() => handleToggleDone(task.id, task.done)}
                  className="text-slate-500 hover:text-[#8B7CFF] transition-colors flex-shrink-0"
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#4ADEB5]" />
                  ) : isActiveFirst ? (
                    <div className="w-3.5 h-3.5 rounded-full border border-[#8B7CFF] flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#8B7CFF]" />
                    </div>
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                  )}
                </button>

                {/* Title */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs leading-tight truncate ${
                      isCompleted ? 'text-slate-500 line-through opacity-70' : 'text-slate-200'
                    }`}
                  >
                    {task.label}
                  </p>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-rose-400 transition-opacity flex-shrink-0"
                  title="Delete task"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
