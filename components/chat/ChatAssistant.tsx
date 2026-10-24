'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bot,
  User,
  Send,
  Loader2,
  Plus,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  X,
  Maximize2,
  Minimize2,
  Trash2,
  HelpCircle,
  BookOpen,
  ArrowRight,
  ArrowUpRight,
  RotateCw,
} from 'lucide-react';

interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggested_video_ids?: any;
  created_at: string;
}

interface ChatAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatAssistant({ isOpen, onClose }: ChatAssistantProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ingestingUrl, setIngestingUrl] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [runtimeProvider, setRuntimeProvider] = useState<string>('Groq (LLaMA 3.3 70B)');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const isVideoPage = pathname.startsWith('/video/');
  const currentVideoId = isVideoPage ? pathname.split('/')[2] : undefined;
  const isFlashcardsPage = pathname.includes('/flashcards');
  const isKnowledgePage = pathname.includes('/knowledge');

  const suggestedPrompts = isVideoPage
    ? [
        'Explain what I just learned',
        'Give me a harder question',
        'Create flashcards for this lesson',
        'Explain the core mechanism',
      ]
    : isFlashcardsPage
    ? [
        'Explain this flashcard concept',
        'Make this question harder',
        'Give me an intuitive analogy',
        'Quiz me on this topic',
      ]
    : isKnowledgePage
    ? [
        'What should I revise today?',
        'Explain the prerequisite connections',
        'Give me a harder question',
        'Recommend a video for my weak areas',
      ]
    : [
        'Explain what I just learned',
        'Give me a harder question',
        'What should I revise today?',
        'Explain backpropagation simply',
      ];

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/chat');
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (e) {
      console.warn('Failed to load chat history:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  // Listen for global open-learnly-ai events from anywhere in the app
  useEffect(() => {
    const handleGlobalPrompt = (e: any) => {
      const prompt = e.detail?.prompt;
      if (prompt) {
        sendMessage(prompt);
      }
    };
    window.addEventListener('open-learnly-ai', handleGlobalPrompt as EventListener);
    return () => {
      window.removeEventListener('open-learnly-ai', handleGlobalPrompt as EventListener);
    };
  }, [currentVideoId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userText = textToSend.trim();
    setInput('');

    const tempUserMsg: ChatMessageItem = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: userText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          videoId: currentVideoId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.reply]);
        if (data.provider) {
          setRuntimeProvider(data.provider);
        }
        if (data.video?.id && !isVideoPage) {
          router.push(`/video/${data.video.id}`);
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to get response');
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'assistant',
          content: `⚠️ ${e.message || 'I encountered an issue connecting to the AI service. Please try again.'}`,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleClearChat = async () => {
    if (confirm('Clear your conversation history?')) {
      try {
        await fetch('/api/chat', { method: 'DELETE' });
        setMessages([]);
      } catch (e) {
        console.error('Failed to clear chat:', e);
      }
    }
  };

  const handleAddVideoFromChat = async (youtubeUrl: string) => {
    setIngestingUrl(youtubeUrl);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ingest_suggested',
          videoUrl: youtubeUrl,
        }),
      });

      const data = await res.json();
      if (res.ok && data.reply) {
        setMessages((prev) => [...prev, data.reply]);
        if (data.video?.id) {
          router.push(`/video/${data.video.id}`);
        }
      }
    } catch (e) {
      console.error('Failed to add video from chat:', e);
    } finally {
      setIngestingUrl(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex flex-col bg-[#111218] border-2 border-[#111218] rounded-3xl shadow-neo-xl transition-all duration-200 overflow-hidden ${
        isExpanded
          ? 'w-[95vw] sm:w-[600px] h-[85vh]'
          : 'w-[92vw] sm:w-[440px] h-[560px]'
      }`}
    >
      {/* Header: Neo-Brutalist Black + Electric Lime */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b-2 border-white/10 bg-[#111218]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#B8FF3D] border-2 border-[#111218] flex items-center justify-center shadow-neo-sm">
            <Sparkles className="w-4 h-4 text-[#111218] fill-[#111218]" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-white font-display uppercase tracking-tight flex items-center gap-1.5">
              Saras AI
              <span className="badge-lime px-1.5 py-0.2 text-[9px] font-mono font-bold">
                {runtimeProvider.includes('Groq') ? 'Groq LLaMA 3.3' : runtimeProvider.includes('Claude') ? 'Claude 3.5' : 'AI Online'}
              </span>
            </h3>
            <p className="text-[10px] text-slate-300 font-medium">
              {isVideoPage ? 'Grounded in current lesson' : 'Your learning companion'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-white/10 transition-colors"
              title="Clear chat history"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            title={isExpanded ? 'Minimize' : 'Expand'}
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="px-3 py-2 border-b-2 border-white/10 bg-[#1A1B22] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {suggestedPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => sendMessage(prompt)}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-lg bg-[#21232C] hover:bg-[#B8FF3D] hover:text-[#111218] border border-white/10 hover:border-[#111218] text-[10px] font-semibold text-slate-200 whitespace-nowrap flex-shrink-0 transition-colors disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#1A1B22]/50">
        {messages.length === 0 && !isLoading && (
          <div className="text-center py-10 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#B8FF3D] border-2 border-[#111218] flex items-center justify-center mx-auto text-[#111218] shadow-neo-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-white uppercase font-display">
                How can I assist your study session?
              </p>
              <p className="text-[11px] text-slate-300 max-w-xs mx-auto">
                Ask any question, request harder conceptual quizzes, create study flashcards, or paste a YouTube URL to ingest a new course.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-lg bg-[#B8FF3D] border-1.5 border-[#111218] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-neo-sm">
                  <Bot className="w-4 h-4 text-[#111218]" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-[#B8FF3D] text-[#111218] font-semibold border-2 border-[#111218] shadow-neo-sm rounded-tr-none'
                    : 'bg-[#FFFDF7] text-[#111218] font-medium border-2 border-[#111218] shadow-neo-sm rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Candidate Video Recommendations */}
                {msg.suggested_video_ids &&
                  Array.isArray(msg.suggested_video_ids) &&
                  msg.suggested_video_ids.length > 0 && (
                    <div className="mt-3 space-y-2 border-t-2 border-[#111218]/10 pt-2.5">
                      <p className="text-[11px] font-extrabold text-[#111218] font-display uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-[#111218]" /> Recommended Lessons:
                      </p>
                      {msg.suggested_video_ids.map((sug: any, idx: number) => {
                        const isIngestingThis = ingestingUrl === sug.youtube_url;

                        return (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-[#F5F3EC] border-2 border-[#111218] space-y-1.5"
                          >
                            <p className="font-extrabold text-[#111218] text-xs truncate font-display">
                              {sug.title}
                            </p>
                            <p className="text-[10px] text-[#636573] font-semibold">
                              {sug.channel}
                            </p>
                            {sug.reason && (
                              <p className="text-[10px] text-[#21232C] italic line-clamp-2">
                                {sug.reason}
                              </p>
                            )}

                            {sug.id && !sug.id.startsWith('curated-') ? (
                              <button
                                onClick={() => router.push(`/video/${sug.id}`)}
                                className="mt-2 w-full py-1.5 px-3 neo-btn-primary text-white text-[11px] flex items-center justify-center gap-1"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-[#B8FF3D]" />
                                Open Lesson
                              </button>
                            ) : sug.youtube_url ? (
                              <button
                                onClick={() => handleAddVideoFromChat(sug.youtube_url)}
                                disabled={isIngestingThis}
                                className="mt-2 w-full py-1.5 px-3 neo-btn-lime text-[#111218] text-[11px] flex items-center justify-center gap-1.5 disabled:opacity-50"
                              >
                                {isIngestingThis ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Segmenting Lesson...
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3.5 h-3.5" />
                                    Add & Segment Lesson
                                  </>
                                )}
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded-lg bg-[#21232C] border-1.5 border-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-2.5 items-center text-slate-300 text-xs">
            <div className="w-7 h-7 rounded-lg bg-[#B8FF3D] border-1.5 border-[#111218] flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-[#111218] animate-pulse" />
            </div>
            <div className="p-3 bg-[#FFFDF7] text-[#111218] border-2 border-[#111218] shadow-neo-sm rounded-2xl rounded-tl-none flex items-center gap-2 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#111218]" />
              <span>Analyzing context & synthesizing answer...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 border-t-2 border-white/10 bg-[#111218] flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          placeholder="Ask Saras or paste a YouTube URL..."
          className="flex-1 bg-[#FFFDF7] text-[#111218] border-2 border-[#111218] rounded-xl px-3.5 py-2 text-xs font-medium placeholder-slate-400 focus:outline-none focus:border-[#B8FF3D] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="p-2 neo-btn-lime rounded-xl disabled:opacity-40 flex items-center justify-center flex-shrink-0"
        >
          <Send className="w-4 h-4 text-[#111218]" />
        </button>
      </form>
    </div>
  );
}
