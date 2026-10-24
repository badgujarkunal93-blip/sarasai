'use client';

import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sparkles,
  Compass,
  Plus,
  Layers,
  Eye,
  Flame,
  Loader2,
  Check,
  AlertCircle,
  Youtube,
  User,
} from 'lucide-react';
import { UserLearningSummary } from '@/lib/services/userProfile';
import { ProfileDropdown } from '@/components/profile/ProfileDropdown';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [urlInput, setUrlInput] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestStatus, setIngestStatus] = useState<{
    type: 'idle' | 'success' | 'error';
    message?: string;
  }>({ type: 'idle' });

  const [summary, setSummary] = useState<UserLearningSummary | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const fetchSummary = async () => {
    try {
      const tzOffset = typeof window !== 'undefined' ? new Date().getTimezoneOffset() : 0;
      const res = await fetch(`/api/user/summary?tzOffset=${tzOffset}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
      }
    } catch (e) {
      console.warn('Failed to fetch user summary:', e);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [pathname]);

  const handleIngestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setIsIngesting(true);
    setIngestStatus({ type: 'idle' });

    try {
      const res = await fetch('/api/videos/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl: urlInput.trim(), source: 'manual' }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to ingest video');
      }

      setIngestStatus({
        type: 'success',
        message: data.cached ? 'Loaded from library' : 'Lesson segmented successfully',
      });
      setUrlInput('');
      fetchSummary();

      if (data.video?.id) {
        setTimeout(() => {
          router.push(`/video/${data.video.id}`);
          setIngestStatus({ type: 'idle' });
        }, 500);
      }
    } catch (err: any) {
      setIngestStatus({
        type: 'error',
        message: err.message || 'Could not process video URL',
      });
    } finally {
      setIsIngesting(false);
    }
  };

  const navLinks = [
    { href: '/discover', label: 'Discover', icon: Compass },
    { href: '/flashcards', label: 'Flashcards', icon: Layers },
    { href: '/focus', label: 'Deep Focus', icon: Eye },
  ];

  const streakDays = summary?.streak?.currentStreak || 0;
  const userInitials = summary?.user?.initials || 'S';
  const userName = summary?.user?.name || 'Student';

  return (
    <header className="sticky top-0 z-40 w-full bg-[#F5F3EC] border-b-2 border-[#111218] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Identity + Navigation */}
        <div className="flex items-center gap-7">
          {/* Logo */}
          <NextLink href="/discover" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#B8FF3D] border-2 border-[#111218] shadow-neo-sm flex items-center justify-center group-hover:-translate-y-0.5 group-hover:shadow-neo transition-all">
              <Sparkles className="w-4 h-4 text-[#111218] fill-[#111218]" />
            </div>
            <div className="flex items-center">
              <span className="font-display font-extrabold text-base tracking-tight text-[#111218] flex items-center">
                Saras<span className="text-[#111218] bg-[#B8FF3D] px-1.5 py-0.5 rounded ml-1 border border-[#111218] text-xs font-black">AI</span>
              </span>
            </div>
          </NextLink>

          {/* Editorial Navigation Links */}
          <nav className="hidden md:flex items-center gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <NextLink
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-display transition-all ${
                    isActive
                      ? 'bg-[#B8FF3D] text-[#111218] border-2 border-[#111218] shadow-neo-sm font-bold'
                      : 'text-[#111218] font-semibold hover:bg-[#FFFDF7] border-2 border-transparent hover:border-[#111218]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {link.label}
                </NextLink>
              );
            })}
          </nav>
        </div>

        {/* Center Floating Ingestion Input */}
        <div className="flex-1 max-w-md hidden lg:block">
          <form onSubmit={handleIngestSubmit} className="relative">
            <div className="relative flex items-center rounded-xl bg-[#FFFDF7] border-2 border-[#111218] shadow-neo-sm focus-within:shadow-neo focus-within:-translate-y-0.5 transition-all overflow-hidden">
              <div className="pl-3 pr-2 text-[#111218] flex items-center">
                <Youtube className="w-4 h-4 text-[#111218]" />
              </div>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste YouTube video to segment..."
                disabled={isIngesting}
                className="w-full bg-transparent border-0 py-2 pr-24 text-xs font-medium text-[#111218] placeholder-slate-500 focus:outline-none focus:ring-0 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isIngesting || !urlInput.trim()}
                className="absolute right-1 px-3 py-1 bg-[#B8FF3D] hover:bg-[#C6FF57] text-[#111218] border-1.5 border-[#111218] text-xs font-bold font-display rounded-lg flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {isIngesting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Segment</span>
                  </>
                )}
              </button>
            </div>

            {/* Notification Toast */}
            {ingestStatus.type !== 'idle' && (
              <div
                className={`absolute top-full left-0 right-0 mt-2 px-3.5 py-2 rounded-xl text-xs font-bold border-2 border-[#111218] shadow-neo flex items-center gap-2 z-50 ${
                  ingestStatus.type === 'success'
                    ? 'bg-[#B8FF3D] text-[#111218]'
                    : 'bg-[#FFD1C7] text-[#111218]'
                }`}
              >
                {ingestStatus.type === 'success' ? (
                  <Check className="w-4 h-4 text-[#111218] flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-[#111218] flex-shrink-0" />
                )}
                <span>{ingestStatus.message}</span>
              </div>
            )}
          </form>
        </div>

        {/* Right Actions: Real Dynamic Streak & Functional Profile Dropdown */}
        <div className="relative flex items-center gap-3">
          {/* Motivation: Real Dynamic Study Streak */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFFDF7] border-2 border-[#111218] shadow-neo-sm text-[#111218] text-xs font-bold font-display cursor-default"
            title={`${streakDays} active study day${streakDays === 1 ? '' : 's'} recorded`}
          >
            <Flame
              className={`w-4 h-4 ${
                streakDays > 0 ? 'text-[#111218] fill-[#B8FF3D]' : 'text-slate-400 fill-slate-200'
              }`}
            />
            <span className="text-[#111218]">{streakDays}</span>
            <span className="text-[#636573] font-medium text-[11px]">
              {streakDays === 1 ? 'day' : 'days'}
            </span>
          </div>

          {/* Functional User Profile Avatar Button */}
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="w-9 h-9 rounded-2xl bg-[#B8FF3D] border-2 border-[#111218] shadow-neo-sm flex items-center justify-center text-[#111218] text-xs font-black font-display cursor-pointer hover:-translate-y-0.5 hover:shadow-neo transition-all"
            title={`Logged in as ${userName}`}
          >
            {userInitials}
          </button>

          {/* Profile Menu Dropdown */}
          <ProfileDropdown
            summary={summary}
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
            onRefresh={fetchSummary}
          />
        </div>
      </div>
    </header>
  );
}
