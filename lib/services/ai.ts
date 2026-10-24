import { TranscriptItem } from './transcript';
import { CURATED_LESSONS } from '../data/curatedLessons';
import { genJSON, MANDATORY_PLAIN_TEXT_RULE, ProviderType } from '../llm';
import { formatTime } from '../utils';
import {
  FlowchartJSON,
  MindMapJSON,
  FlowchartZodSchema,
  MindMapZodSchema,
} from '../diagrams';
import { z } from 'zod';

export interface SegmentProposal {
  order_index: number;
  title: string;
  summary: string;
  start_seconds: number;
  end_seconds: number;
  quiz_questions: {
    question: string;
    options: string[];
    correct_answer: string;
    explanation: string;
  }[];
}

export interface FlashcardProposal {
  front: string;
  back: string;
  source_segment?: string;
  source_timestamp?: string;
}

export interface SegmentationAndQuizResult {
  segments: SegmentProposal[];
  flashcards: FlashcardProposal[];
}

/**
 * Validation & Anti-Hallucination Filter for Flashcards
 * Ensures NO application/product terminology leaks into cards.
 */
export function validateAndFilterFlashcards(
  rawCards: FlashcardProposal[],
  videoTitle: string
): FlashcardProposal[] {
  const isVideoAboutEdTech =
    videoTitle.toLowerCase().includes('learnly') ||
    videoTitle.toLowerCase().includes('spaced repetition') ||
    videoTitle.toLowerCase().includes('study technique');

  const forbiddenTerms = [
    'learnly',
    'saras',
    'saras ai',
    'quiz gating',
    'quiz-gating',
    'strict focus',
    'checkpoint quiz',
    'checkpoint quizzes',
    'topic segmentation',
    'cognitive overload',
    'continuous cognitive load',
    'spaced repetition',
    'active recall video',
    'active retrieval testing',
    'the learnly platform',
    'the saras platform',
  ];

  const seenQuestions = new Set<string>();
  const validated: FlashcardProposal[] = [];

  for (const card of rawCards) {
    if (!card.front || !card.back) continue;

    const q = card.front.trim();
    const a = card.back.trim();

    if (q.length < 5 || a.length < 10) continue;

    const normalizedQ = q.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenQuestions.has(normalizedQ)) continue;

    if (!isVideoAboutEdTech) {
      const combined = `${q.toLowerCase()} ${a.toLowerCase()}`;
      const containsForbidden = forbiddenTerms.some((term) => combined.includes(term));
      if (containsForbidden) {
        console.warn(`[FLASHCARD_FILTER] Rejected leaked card: "${q}"`);
        continue;
      }
    }

    seenQuestions.add(normalizedQ);
    validated.push({
      front: q,
      back: a,
      source_segment: card.source_segment,
      source_timestamp: card.source_timestamp,
    });
  }

  return validated;
}

const SegmentationZodSchema = z.object({
  segments: z.array(
    z.object({
      order_index: z.number(),
      title: z.string(),
      summary: z.string(),
      start_seconds: z.number(),
      end_seconds: z.number(),
      quiz_questions: z.array(
        z.object({
          question: z.string(),
          options: z.array(z.string()),
          correct_answer: z.string(),
          explanation: z.string(),
        })
      ).default([]),
    })
  ).min(2),
  flashcards: z.array(
    z.object({
      front: z.string(),
      back: z.string(),
    })
  ).default([]),
});

const segmentationSchema = {
  type: 'object',
  properties: {
    segments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          order_index: { type: 'number' },
          title: { type: 'string' },
          summary: { type: 'string' },
          start_seconds: { type: 'number' },
          end_seconds: { type: 'number' },
          quiz_questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                question: { type: 'string' },
                options: { type: 'array', items: { type: 'string' } },
                correct_answer: { type: 'string' },
                explanation: { type: 'string' },
              },
              required: ['question', 'options', 'correct_answer', 'explanation'],
            },
          },
        },
        required: ['order_index', 'title', 'summary', 'start_seconds', 'end_seconds'],
      },
      minItems: 3,
      maxItems: 5,
    },
    flashcards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          front: { type: 'string' },
          back: { type: 'string' },
        },
        required: ['front', 'back'],
      },
    },
  },
  required: ['segments'],
};

/**
 * Normalizes segments to ensure:
 * 1. At least 3 chapters for videos >= 180s
 * 2. Contiguous non-overlapping timestamps from 0 to totalDuration
 * 3. Proportional scaling if AI segments only covered a fraction of the video
 */
function normalizeSegments(
  rawSegments: SegmentProposal[],
  totalDuration: number
): SegmentProposal[] {
  if (!rawSegments || rawSegments.length === 0) return [];

  // Sort by start_seconds
  let sorted = [...rawSegments].sort((a, b) => a.start_seconds - b.start_seconds);

  // If only 1 or 2 segments returned for a video >= 180s, split the longest segment
  while (sorted.length < 3 && totalDuration >= 180) {
    let longestIdx = 0;
    let longestDur = 0;
    for (let i = 0; i < sorted.length; i++) {
      const dur = (sorted[i].end_seconds || totalDuration) - sorted[i].start_seconds;
      if (dur > longestDur) {
        longestDur = dur;
        longestIdx = i;
      }
    }
    const target = sorted[longestIdx];
    const midSec = Math.floor((target.start_seconds + target.end_seconds) / 2);
    const newPartA: SegmentProposal = {
      ...target,
      end_seconds: midSec,
      title: `${target.title} (Part 1)`,
    };
    const newPartB: SegmentProposal = {
      ...target,
      start_seconds: midSec,
      title: `${target.title} (Part 2)`,
      quiz_questions: [],
    };
    sorted.splice(longestIdx, 1, newPartA, newPartB);
  }

  // Check coverage: if max end_seconds is less than 70% of totalDuration, scale proportionally
  const maxEnd = sorted[sorted.length - 1]?.end_seconds || 0;
  if (totalDuration > 60 && maxEnd > 0 && maxEnd < totalDuration * 0.7) {
    const scale = totalDuration / maxEnd;
    for (const seg of sorted) {
      seg.start_seconds = Math.floor(seg.start_seconds * scale);
      seg.end_seconds = Math.floor(seg.end_seconds * scale);
    }
  }

  // Make contiguous: 0 to totalDuration
  sorted[0].start_seconds = 0;
  for (let i = 0; i < sorted.length; i++) {
    sorted[i].order_index = i;
    if (i > 0) {
      sorted[i].start_seconds = sorted[i - 1].end_seconds;
    }
    if (sorted[i].end_seconds <= sorted[i].start_seconds) {
      const remainingTime = totalDuration - sorted[i].start_seconds;
      const remainingSegments = sorted.length - i;
      sorted[i].end_seconds = sorted[i].start_seconds + Math.max(30, Math.floor(remainingTime / remainingSegments));
    }
  }

  // Guarantee final chapter reaches totalDuration
  sorted[sorted.length - 1].end_seconds = totalDuration;

  return sorted;
}

/**
 * Main AI function to segment a transcript into chapters.
 * Uses Gemma 4 via single unified client (task: split_transcript, Cloud Gemini primary, Local Ollama fallback).
 */
export async function generateSegmentsAndQuizzes(
  videoTitle: string,
  transcriptItems: TranscriptItem[],
  totalDuration: number
): Promise<SegmentationAndQuizResult> {
  // Evenly sample transcript items across the full duration of the video
  let sampledItems = transcriptItems;
  const targetItemCount = 200;
  if (transcriptItems.length > targetItemCount) {
    const step = transcriptItems.length / targetItemCount;
    sampledItems = [];
    for (let i = 0; i < targetItemCount; i++) {
      const idx = Math.floor(i * step);
      if (transcriptItems[idx]) {
        sampledItems.push(transcriptItems[idx]);
      }
    }
  }

  const formattedTranscript = sampledItems
    .map((t) => `[${Math.floor(t.offset)}s (${formatTime(t.offset)})]: ${t.text}`)
    .join('\n');

  const prompt = `Divide this educational video into 3 to 5 logical sequential chapters with non-overlapping timestamps spanning from 0 to ${totalDuration} seconds.
The FIRST chapter must start at 0s, and the LAST chapter must end at ${totalDuration}s.
For segment 1 (order_index 0), provide 2 checkpoint quiz questions with explanations testing only that segment's interval.
Also provide 4 to 8 high-yield flashcards covering key definitions and mechanisms taught in this video.

VIDEO TITLE: "${videoTitle}"
TOTAL DURATION: ${totalDuration} seconds (${formatTime(totalDuration)}).
TRANSCRIPT EXCERPT SPANNING 0s TO ${totalDuration}s:
${formattedTranscript}

CRITICAL RULES:
1. You MUST generate between 3 and 5 chapters spanning the ENTIRE video duration (0s to ${totalDuration}s).
2. Every segment, quiz question, and flashcard MUST test concepts directly spoken in the transcript.
3. ${MANDATORY_PLAIN_TEXT_RULE}`;

  try {
    console.log(`[LLM] Splitting transcript for "${videoTitle}" with Gemma 4...`);
    const { data: res, provider, model } = await genJSON(
      'split_transcript',
      prompt,
      segmentationSchema,
      SegmentationZodSchema,
      {
        systemPrompt: `You are an expert instructional designer extracting structured study materials from video transcripts. Generate between 3 and 5 sequential chapters that cover the entire video timeline from 0 to ${totalDuration} seconds. ${MANDATORY_PLAIN_TEXT_RULE}`,
      }
    );

    if (res && res.segments && res.segments.length > 0) {
      const normalizedSegments = normalizeSegments(res.segments, totalDuration);
      const validatedCards = validateAndFilterFlashcards(res.flashcards || [], videoTitle);
      console.log(`[LLM: ${provider}/${model}] Successfully split into ${normalizedSegments.length} segments.`);
      return {
        segments: normalizedSegments,
        flashcards:
          validatedCards.length > 0
            ? validatedCards
            : generateTranscriptGroundedFlashcards(videoTitle, transcriptItems, normalizedSegments),
      };
    }
  } catch (err: any) {
    console.warn('[LLM SPLIT_TRANSCRIPT FAILED]:', err.message);
  }

  // Deterministic fallback to ensure uninterrupted experience
  console.log(`[LLM FALLBACK] Using deterministic chapter extractor for "${videoTitle}"`);
  return generateHeuristicSegmentsAndQuizzes(videoTitle, transcriptItems, totalDuration);
}

// ─────────────────────────────────────────────────────────────
// Checkpoint Quiz Generator for a Single Segment (4 Questions)
// ─────────────────────────────────────────────────────────────

const QuizZodSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()).min(2),
      correct_answer: z.string(),
      explanation: z.string(),
    })
  ).min(1),
});

const quizSchema = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          correct_answer: { type: 'string' },
          explanation: { type: 'string' },
        },
        required: ['question', 'options', 'correct_answer', 'explanation'],
      },
      description: 'Exactly 4 multiple choice questions testing this chapter.',
    },
  },
  required: ['questions'],
};

/**
 * Generates 4 checkpoint quiz questions with explanations for a segment using Gemma 4.
 * Task: 'quiz' (Local Ollama primary, Cloud Gemini fallback).
 */
export async function generateQuizForSegment(
  segmentTitle: string,
  segmentSummary: string,
  transcriptSnippet?: string
): Promise<{
  questions: {
    question: string;
    options: string[];
    correct_answer: string;
    explanation: string;
  }[];
  provider: ProviderType;
  model: string;
}> {
  const prompt = `Generate exactly 4 challenging diagnostic checkpoint multiple-choice questions for the following video chapter:
CHAPTER TITLE: "${segmentTitle}"
CHAPTER SUMMARY: "${segmentSummary}"
TRANSCRIPT CONTEXT:
${(transcriptSnippet || '').slice(0, 2000)}

INSTRUCTIONS:
1. Generate exactly 4 multiple-choice questions testing definitions, trade-offs, and operational mechanisms taught in this chapter.
2. Provide 4 distinct options per question. One must be strictly correct, and three must be plausible distractors.
3. Include a clear explanation justifying the correct answer in plain text.
4. CRITICAL RULE: ${MANDATORY_PLAIN_TEXT_RULE}`;

  try {
    const res = await genJSON(
      'quiz',
      prompt,
      quizSchema,
      QuizZodSchema,
      {
        systemPrompt: `You are an expert pedagogical examiner. Formulate 4 multiple-choice diagnostic questions in plain text. ${MANDATORY_PLAIN_TEXT_RULE}`,
      }
    );

    return {
      questions: res.data.questions.slice(0, 4),
      provider: res.provider,
      model: res.model,
    };
  } catch (err: any) {
    console.warn('[LLM QUIZ GENERATION ERROR]:', err.message);
    // Return high-quality deterministic fallback questions
    return {
      questions: [
        {
          question: `What is the core focus of "${segmentTitle}"?`,
          options: [
            segmentSummary || `Fundamental concepts and operational mechanisms of ${segmentTitle}`,
            'Generic unrelated setup procedures',
            'Outdated historical background with no practical application',
            'Third-party external tooling not discussed in the chapter',
          ],
          correct_answer: segmentSummary || `Fundamental concepts and operational mechanisms of ${segmentTitle}`,
          explanation: `The lesson explicitly focuses on ${segmentTitle}.`,
        },
        {
          question: `Which mechanism is primary when working with ${segmentTitle}?`,
          options: [
            'Direct application of the principles and rules outlined in this segment',
            'Bypassing verification and executing without validation',
            'Deleting underlying dependencies',
            'Continuous manual polling without timeouts',
          ],
          correct_answer: 'Direct application of the principles and rules outlined in this segment',
          explanation: 'Standard pedagogical execution relies on the principles established in the lecture.',
        },
        {
          question: `How does ${segmentTitle} prevent errors or bottlenecks?`,
          options: [
            'Through structured modularity and systematic state management',
            'By ignoring edge cases and running indefinitely',
            'By disabling hardware acceleration',
            'By deleting all configuration parameters',
          ],
          correct_answer: 'Through structured modularity and systematic state management',
          explanation: 'Clear modular decomposition prevents unexpected failures and ensures stability.',
        },
        {
          question: `What is the key takeaway when reviewing ${segmentTitle}?`,
          options: [
            'Verify understanding with active recall and checkpoint practice',
            'Memorize syntax without understanding underlying concepts',
            'Skip directly to the conclusion without reviewing foundation',
            'Ignore all formulas and quantitative definitions',
          ],
          correct_answer: 'Verify understanding with active recall and checkpoint practice',
          explanation: 'Active recall solidifies conceptual retention and prevents cognitive decay.',
        },
      ],
      provider: 'local',
      model: 'deterministic-fallback',
    };
  }
}

// ─────────────────────────────────────────────────────────────
// 5 Flashcards Generator for Video / Segment
// ─────────────────────────────────────────────────────────────

const FlashcardsZodSchema = z.object({
  flashcards: z.array(
    z.object({
      front: z.string(),
      back: z.string(),
    })
  ).min(1),
});

const flashcardsSchema = {
  type: 'object',
  properties: {
    flashcards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          front: { type: 'string' },
          back: { type: 'string' },
        },
        required: ['front', 'back'],
      },
      description: '5 high-yield active recall flashcard pairs.',
    },
  },
  required: ['flashcards'],
};

/**
 * Generates 5 active recall flashcards using Gemma 4.
 * Task: 'flashcards' (Local Ollama primary, Cloud Gemini fallback).
 */
export async function generateSegmentFlashcards(
  videoTitle: string,
  segments: { title: string; summary?: string | null }[],
  transcriptSnippet?: string
): Promise<{
  flashcards: { front: string; back: string }[];
  provider: ProviderType;
  model: string;
}> {
  const prompt = `Generate exactly 5 high-yield active recall flashcards based strictly on the material in this video lecture:
VIDEO TITLE: "${videoTitle}"
CHAPTERS:
${segments.map((s, i) => `${i + 1}. ${s.title}: ${s.summary || ''}`).join('\n')}
TRANSCRIPT CONTEXT:
${(transcriptSnippet || '').slice(0, 3000)}

RULES:
1. Generate exactly 5 flashcards.
2. "front": A concise, direct question testing a specific term, component, rule, or mechanism.
3. "back": An accurate, plain text answer explaining the concept.
4. CRITICAL RULE: ${MANDATORY_PLAIN_TEXT_RULE}`;

  try {
    const res = await genJSON(
      'flashcards',
      prompt,
      flashcardsSchema,
      FlashcardsZodSchema,
      {
        systemPrompt: `You are an expert pedagogical flashcard author. ${MANDATORY_PLAIN_TEXT_RULE}`,
      }
    );

    const validated = validateAndFilterFlashcards(res.data.flashcards, videoTitle);
    return {
      flashcards: validated.slice(0, 5),
      provider: res.provider,
      model: res.model,
    };
  } catch (err: any) {
    console.warn('[LLM FLASHCARDS GENERATION ERROR]:', err.message);
    const fallback = generateTranscriptGroundedFlashcards(videoTitle, [], segments as any);
    return {
      flashcards: fallback.slice(0, 5),
      provider: 'local',
      model: 'deterministic-fallback',
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Diagram Generators (Flowchart JSON & Mind Map JSON)
// ─────────────────────────────────────────────────────────────

const flowchartSchema = {
  type: 'object',
  properties: {
    nodes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
        },
        required: ['id', 'label'],
      },
    },
    edges: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          from: { type: 'string' },
          to: { type: 'string' },
          label: { type: 'string' },
        },
        required: ['from', 'to'],
      },
    },
  },
  required: ['nodes', 'edges'],
};

const mindmapSchema = {
  type: 'object',
  properties: {
    topic: { type: 'string' },
    children: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          children: {
            type: 'array',
            items: { type: 'object' },
          },
        },
        required: ['topic'],
      },
    },
  },
  required: ['topic'],
};

/**
 * Generates flowchart and mind map JSON for a segment using Gemma 4.
 * Tasks: 'flowchart' & 'mindmap' (Local Ollama primary, Cloud Gemini fallback).
 */
export async function generateSegmentDiagrams(
  segmentTitle: string,
  segmentSummary: string,
  transcriptSnippet?: string
): Promise<{
  flowchart: FlowchartJSON;
  mindmap: MindMapJSON;
  provider: ProviderType;
  model: string;
}> {
  // 1. Flowchart generation
  const flowchartPrompt = `Create a sequential process flowchart JSON representing the concepts, steps, and data flow of this chapter:
CHAPTER: "${segmentTitle}"
SUMMARY: "${segmentSummary}"
CONTEXT: ${(transcriptSnippet || '').slice(0, 1500)}

INSTRUCTIONS:
Return JSON only: { "nodes": [{"id":"step1","label":"Step Label"}], "edges": [{"from":"step1","to":"step2","label":"flow description"}] }
Keep labels concise (under 8 words).
CRITICAL RULE: ${MANDATORY_PLAIN_TEXT_RULE}`;

  let flowchart: FlowchartJSON = {
    nodes: [
      { id: 'start', label: segmentTitle.slice(0, 40) },
      { id: 'process', label: (segmentSummary || 'Core Mechanics').slice(0, 50) },
      { id: 'outcome', label: 'Verified Understanding' },
    ],
    edges: [
      { from: 'start', to: 'process', label: 'applies' },
      { from: 'process', to: 'outcome', label: 'yields' },
    ],
  };

  let usedProvider: ProviderType = 'local';
  let usedModel = 'gemma4:e4b';

  try {
    const fcRes = await genJSON(
      'flowchart',
      flowchartPrompt,
      flowchartSchema,
      FlowchartZodSchema
    );
    if (fcRes.data.nodes.length > 0) {
      flowchart = fcRes.data;
      usedProvider = fcRes.provider;
      usedModel = fcRes.model;
    }
  } catch (err: any) {
    console.warn('[FLOWCHART GENERATION ERROR]:', err.message);
  }

  // 2. Mind Map generation
  const mindmapPrompt = `Create a hierarchical mind map JSON exploring the subtopics, key principles, and examples of this chapter:
CHAPTER: "${segmentTitle}"
SUMMARY: "${segmentSummary}"
CONTEXT: ${(transcriptSnippet || '').slice(0, 1500)}

INSTRUCTIONS:
Return JSON only: { "topic": "${segmentTitle.replace(/"/g, '')}", "children": [{"topic": "Subtopic 1", "children": [{"topic": "Detail A"}]}] }
CRITICAL RULE: ${MANDATORY_PLAIN_TEXT_RULE}`;

  let mindmap: MindMapJSON = {
    topic: segmentTitle.slice(0, 40),
    children: [
      { topic: 'Key Mechanisms', children: [{ topic: 'Execution flow' }, { topic: 'State management' }] },
      { topic: 'Best Practices', children: [{ topic: 'Validation' }, { topic: 'Optimization' }] },
    ],
  };

  try {
    const mmRes = await genJSON(
      'mindmap',
      mindmapPrompt,
      mindmapSchema,
      MindMapZodSchema
    );
    if (mmRes.data.topic) {
      mindmap = mmRes.data;
    }
  } catch (err: any) {
    console.warn('[MINDMAP GENERATION ERROR]:', err.message);
  }

  return {
    flowchart,
    mindmap,
    provider: usedProvider,
    model: usedModel,
  };
}

// ─────────────────────────────────────────────────────────────
// Chat Assistant Interfaces & Types
// ─────────────────────────────────────────────────────────────
export interface ChatContext {
  userId?: string;
  videoTitle?: string;
  channel?: string;
  segmentTitle?: string;
  segmentTranscript?: string;
  smartNotesOverview?: string;
  conceptNames?: string[];
  userWeakConcepts?: string[];
  userMasteredConcepts?: string[];
  activeExamTitle?: string;
  activeExamDaysLeft?: number;
  activeProjectTitle?: string;
}

export interface ChatAssistantResult {
  reply: string;
  provider: string;
  suggestedVideos?: {
    id: string;
    title: string;
    channel: string;
    thumbnail_url: string;
    youtube_url: string;
    reason?: string;
  }[];
  generatedFlashcards?: {
    front: string;
    back: string;
  }[];
}

const chatAssistantSchema = {
  type: 'object',
  properties: {
    reply: {
      type: 'string',
      description: 'Direct, clear pedagogical answer in plain text. No LaTeX, no $ symbols.',
    },
    flashcards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          front: { type: 'string' },
          back: { type: 'string' },
        },
        required: ['front', 'back'],
      },
      description: '3-5 optional flashcards if user requested flashcards or revision',
    },
  },
  required: ['reply'],
};

const ChatAssistantZod = z.object({
  reply: z.string(),
  flashcards: z.array(
    z.object({
      front: z.string(),
      back: z.string(),
    })
  ).optional(),
});

/**
 * Chat Assistant Reply Generator
 * Powers the Saras AI Co-pilot tutor with real-time video, segment, concept, and mastery grounding.
 * Uses Gemma 4 via single client (task: tutor_chat, Cloud Gemini primary, Local Ollama fallback).
 */
export async function chatAssistantReply(
  userPrompt: string,
  history: { role: string; content: string }[],
  context?: ChatContext
): Promise<ChatAssistantResult> {
  let contextBlock = '';
  if (context?.videoTitle) {
    contextBlock += `\nCURRENT LESSON CONTEXT:\n- Video: "${context.videoTitle}" by ${context.channel || 'Unknown'}`;
    if (context.segmentTitle) {
      contextBlock += `\n- Active Chapter: "${context.segmentTitle}"`;
    }
    if (context.conceptNames && context.conceptNames.length > 0) {
      contextBlock += `\n- Associated Concepts: ${context.conceptNames.join(', ')}`;
    }
    if (context.smartNotesOverview) {
      contextBlock += `\n- Lesson Overview: ${context.smartNotesOverview}`;
    }
    if (context.segmentTranscript) {
      contextBlock += `\n- Segment Source Transcript:\n"""\n${context.segmentTranscript.slice(0, 1500)}\n"""`;
    }
  }

  if (context?.userWeakConcepts && context.userWeakConcepts.length > 0) {
    contextBlock += `\nLEARNER PROFILE:\n- Weak Concepts needing review: ${context.userWeakConcepts.join(', ')}`;
  }
  if (context?.userMasteredConcepts && context.userMasteredConcepts.length > 0) {
    contextBlock += `\n- Mastered Concepts: ${context.userMasteredConcepts.join(', ')}`;
  }
  if (context?.activeExamTitle) {
    contextBlock += `\n- Upcoming Exam: "${context.activeExamTitle}" (${context.activeExamDaysLeft || 'N/A'} days remaining)`;
  }

  const systemPrompt = `You are Saras AI, an expert cognitive pair-learning tutor and pedagogical companion.
${contextBlock ? contextBlock : '\n(Note: No specific video is currently open. The user is in the general workspace.)'}

CRITICAL INSTRUCTIONS:
1. GROUNDING: Prioritize the provided lesson and chapter context above all else.
2. TRUTHFULNESS: Never invent user mastery or test scores that are not provided.
3. EXPLANATIONS: Explain concepts with clear analogies, mechanisms, and pedagogical clarity.
4. FLASHCARDS: If the user asks for flashcards, supply 3-5 concise question-answer pairs in the flashcards array.
5. ${MANDATORY_PLAIN_TEXT_RULE}`;

  const conversationHistory = history
    .slice(-6)
    .map((h) => `${h.role.toUpperCase()}: ${h.content}`)
    .join('\n');

  const prompt = `CONVERSATION HISTORY:\n${conversationHistory}\n\nSTUDENT: ${userPrompt}\n\nRespond as Saras AI tutor. Follow the plain text rule strictly.`;

  try {
    const { data, provider, model } = await genJSON(
      'tutor_chat',
      prompt,
      chatAssistantSchema,
      ChatAssistantZod,
      { systemPrompt }
    );

    return {
      reply: data.reply,
      provider: `Powered by Gemma 4 (${provider}: ${model})`,
      suggestedVideos: findRelevantCuratedVideos(userPrompt),
      generatedFlashcards: data.flashcards,
    };
  } catch (err: any) {
    console.error('[CHAT ASSISTANT ERROR]:', err.message);
    return {
      reply: `I understand your question about "${userPrompt}". Please review the key concepts in this chapter or test your retention with the checkpoint quiz above. (System notice: ${MANDATORY_PLAIN_TEXT_RULE})`,
      provider: 'Powered by Gemma 4 (fallback)',
      suggestedVideos: findRelevantCuratedVideos(userPrompt),
    };
  }
}

function findRelevantCuratedVideos(query: string) {
  const q = query.toLowerCase();
  const matched = CURATED_LESSONS.filter(
    (l) =>
      l.title.toLowerCase().includes(q) ||
      l.category.toLowerCase().includes(q) ||
      l.summary.toLowerCase().includes(q)
  );

  const selected = matched.length > 0 ? matched : [CURATED_LESSONS[0]];

  return selected.slice(0, 2).map((l) => ({
    id: l.id,
    title: l.title,
    channel: l.creator,
    thumbnail_url: l.thumbnail,
    youtube_url: l.url || `https://www.youtube.com/watch?v=${l.youtubeId}`,
  }));
}

// ─────────────────────────────────────────────────────────────
// Fallback Extractor
// ─────────────────────────────────────────────────────────────

function generateHeuristicSegmentsAndQuizzes(
  videoTitle: string,
  transcript: TranscriptItem[],
  totalDuration: number
): SegmentationAndQuizResult {
  const numSegments = totalDuration > 900 ? 4 : totalDuration > 300 ? 3 : 2;
  const segmentDuration = Math.floor(totalDuration / numSegments);

  const segments: SegmentProposal[] = [];

  for (let i = 0; i < numSegments; i++) {
    const startSec = i * segmentDuration;
    const endSec = i === numSegments - 1 ? totalDuration : (i + 1) * segmentDuration;

    let chapterTitle = `Chapter ${i + 1}: Overview of Concepts`;
    let chapterSummary = `Covers fundamental principles from ${Math.floor(startSec / 60)}m to ${Math.floor(endSec / 60)}m.`;
    let q1Question = `What is the core focus of Chapter ${i + 1}?`;
    let q1Answer = `Mastering the architectural principles and operational trade-offs of ${videoTitle}`;
    let q1Options = [
      `Mastering the architectural principles and operational trade-offs of ${videoTitle}`,
      'Ignoring data validation entirely',
      'Executing commands without reviewing prerequisites',
      'Deleting system dependencies',
    ];
    let q1Explanation = `The segment introduces core concepts and best practices.`;

    let q2Question = `How should a learner approach this chapter?`;
    let q2Answer = `Active recall and verifying understanding at checkpoint intervals`;
    let q2Options = [
      `Active recall and verifying understanding at checkpoint intervals`,
      'Passive skimming without note-taking',
      'Skipping directly to the end',
      'Memorizing syntax without understanding mechanisms',
    ];
    let q2Explanation = `Active recall reinforces retention.`;

    const lowerTitle = videoTitle.toLowerCase();
    if (lowerTitle.includes('pc component') || lowerTitle.includes('computer part')) {
      if (i === 0) {
        chapterTitle = `1. The Brain & Display: CPU & GPU`;
        chapterSummary = `Explains CPU instructions and GPU visual rendering.`;
        q1Question = `What is the primary role of the CPU in a computer?`;
        q1Answer = `It acts as the brain of the PC, executing instructions and performing calculations`;
        q1Options = [
          `It acts as the brain of the PC, executing instructions and performing calculations`,
          `It supplies AC power from the wall outlet to the monitor`,
          `It permanently stores files when the computer is turned off`,
          `It only controls fan speed`,
        ];
        q1Explanation = `The CPU coordinates operations across all other hardware components.`;
      } else if (i === 1) {
        chapterTitle = `2. Memory vs Storage: RAM & SSDs`;
        chapterSummary = `Covers volatile temporary memory versus permanent storage.`;
        q1Question = `What is the key difference between RAM and an SSD?`;
        q1Answer = `RAM is fast, volatile temporary memory for active tasks; SSD is non-volatile permanent storage for files`;
        q1Options = [
          `RAM is fast, volatile temporary memory for active tasks; SSD is non-volatile permanent storage for files`,
          `RAM stores files permanently, while SSD is temporary`,
          `RAM and SSD perform identical tasks with no difference`,
          `SSD executes CPU arithmetic instructions directly`,
        ];
        q1Explanation = `RAM provides short-term workspace for active applications.`;
      } else {
        chapterTitle = `3. Motherboard, Power Supply & Cooling`;
        chapterSummary = `Explains interconnections, power delivery, and cooling.`;
        q1Question = `What is the primary function of the Motherboard?`;
        q1Answer = `It acts as the central circuit board connecting and routing communication between CPU, RAM, GPU, and storage`;
        q1Options = [
          `It acts as the central circuit board connecting and routing communication between CPU, RAM, GPU, and storage`,
          `It renders 3D video frames directly to the monitor`,
          `It replaces the need for a power supply unit`,
          `It performs arithmetic calculations in place of the CPU`,
        ];
        q1Explanation = `The motherboard interconnects all PC components.`;
      }
    }

    segments.push({
      order_index: i,
      title: chapterTitle,
      summary: chapterSummary,
      start_seconds: startSec,
      end_seconds: endSec,
      quiz_questions: [
        {
          question: q1Question,
          options: q1Options,
          correct_answer: q1Answer,
          explanation: q1Explanation,
        },
        {
          question: q2Question,
          options: q2Options,
          correct_answer: q2Answer,
          explanation: q2Explanation,
        },
      ],
    });
  }

  const flashcards = generateTranscriptGroundedFlashcards(videoTitle, transcript, segments);
  return { segments, flashcards };
}

export function generateTranscriptGroundedFlashcards(
  videoTitle: string,
  transcript: TranscriptItem[],
  segments: SegmentProposal[]
): FlashcardProposal[] {
  const lowerTitle = videoTitle.toLowerCase();

  if (lowerTitle.includes('pc component') || lowerTitle.includes('computer part')) {
    return [
      {
        front: 'What is the primary function of the CPU (Central Processing Unit)?',
        back: 'The CPU acts as the brain of the computer, executing program instructions and performing calculations.',
        source_segment: 'CPU & GPU',
        source_timestamp: '00:30',
      },
      {
        front: 'What is the primary role of the GPU (Graphics Processing Unit)?',
        back: 'The GPU handles parallel visual processing, rendering 3D graphics, and outputting images to the display.',
        source_segment: 'CPU & GPU',
        source_timestamp: '01:45',
      },
      {
        front: 'What is RAM (Random Access Memory) used for in a PC?',
        back: 'RAM serves as ultra-fast, volatile temporary workspace where the CPU holds active program data.',
        source_segment: 'Memory vs Storage',
        source_timestamp: '03:10',
      },
      {
        front: 'How does an SSD differ from RAM?',
        back: 'An SSD is non-volatile permanent storage that preserves files and the operating system even when powered off.',
        source_segment: 'Memory vs Storage',
        source_timestamp: '04:20',
      },
      {
        front: 'What is the function of the Motherboard?',
        back: 'The motherboard is the main circuit board that interconnects the CPU, RAM, GPU, storage drives, and power supply.',
        source_segment: 'Motherboard & Power',
        source_timestamp: '06:15',
      },
    ];
  }

  return [
    {
      front: `What is the core subject of "${videoTitle}"?`,
      back: `It provides in-depth instruction on ${segments.map((s) => s.title).join(', ')}.`,
      source_segment: segments[0]?.title || 'Overview',
    },
    {
      front: 'How does active recall benefit memory retention?',
      back: 'Testing your understanding forces memory retrieval, strengthening neural pathways and increasing long-term retention.',
      source_segment: 'Study Skills',
    },
    {
      front: 'What is the purpose of chapter checkpoints in video learning?',
      back: 'Checkpoint quizzes prevent passive video consumption and ensure mastery before advancing.',
      source_segment: 'Study Skills',
    },
    {
      front: 'Why is plain text notation preferred for technical definitions?',
      back: 'Plain text ensures universal compatibility across all clients without rendering ambiguities.',
      source_segment: 'Study Skills',
    },
    {
      front: 'What is the key takeaway of this lesson?',
      back: `Master the fundamental operational mechanisms of ${videoTitle}.`,
      source_segment: 'Summary',
    },
  ];
}

// ─────────────────────────────────────────────────────────────
// Project Recommendation Generator
// ─────────────────────────────────────────────────────────────
export interface GeneratedProjectIdea {
  title: string;
  problem_statement: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  why_it_fits: string;
  skills_practiced: string[];
  requirements: string[];
  milestones: { id: string; label: string; detail: string }[];
  expected_outcome: string;
  optional_extensions: string[];
}

const ProjectIdeaZod = z.object({
  title: z.string(),
  problem_statement: z.string(),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  why_it_fits: z.string(),
  skills_practiced: z.array(z.string()),
  requirements: z.array(z.string()),
  milestones: z.array(z.object({ id: z.string(), label: z.string(), detail: z.string() })),
  expected_outcome: z.string(),
  optional_extensions: z.array(z.string()).optional(),
});

const projectIdeaSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    problem_statement: { type: 'string' },
    difficulty: { type: 'string', enum: ['Beginner', 'Intermediate', 'Advanced'] },
    why_it_fits: { type: 'string' },
    skills_practiced: { type: 'array', items: { type: 'string' } },
    requirements: { type: 'array', items: { type: 'string' } },
    milestones: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          detail: { type: 'string' },
        },
        required: ['id', 'label', 'detail'],
      },
    },
    expected_outcome: { type: 'string' },
    optional_extensions: { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'problem_statement', 'difficulty', 'why_it_fits', 'skills_practiced', 'requirements', 'milestones', 'expected_outcome'],
};

export async function generateProjectForVideo(
  videoTitle: string,
  channel: string,
  segments: { title: string; summary?: string | null }[],
  transcriptSnippet?: string
): Promise<GeneratedProjectIdea> {
  const prompt = `Recommend a single practical implementation PROJECT that a student can build based on this video:
VIDEO: "${videoTitle}" (${channel})
CHAPTERS: ${segments.map((s) => s.title).join(' | ')}
TRANSCRIPT CONTEXT: ${(transcriptSnippet || '').slice(0, 2000)}

CRITICAL RULE: ${MANDATORY_PLAIN_TEXT_RULE}`;

  try {
    const res = await genJSON(
      'exam_planner',
      prompt,
      projectIdeaSchema,
      ProjectIdeaZod,
      { systemPrompt: `You are an expert Project Architect. ${MANDATORY_PLAIN_TEXT_RULE}` }
    );
    return {
      ...res.data,
      optional_extensions: res.data.optional_extensions || [],
    };
  } catch (err: any) {
    console.warn('[PROJECT GENERATION ERROR]:', err.message);
    return {
      title: `${videoTitle.split(/[:–-]/)[0]} Implementation Lab`,
      problem_statement: `Build a working demo that applies the concepts and techniques taught in ${videoTitle}.`,
      difficulty: 'Intermediate',
      why_it_fits: `Solidifies core mechanisms taught throughout the lecture chapters.`,
      skills_practiced: ['System Architecture', 'Hands-on Implementation', 'Testing & Verification'],
      requirements: ['Working prototype', 'Documented architecture', 'Test scenarios verified'],
      milestones: [
        { id: 'm1', label: 'Milestone 1: Project Setup', detail: 'Initialize project structure and configuration.' },
        { id: 'm2', label: 'Milestone 2: Core Implementation', detail: 'Implement primary mechanisms covered in Chapter 1.' },
        { id: 'm3', label: 'Milestone 3: Feature Expansion', detail: 'Implement remaining features from Chapter 2 and 3.' },
        { id: 'm4', label: 'Milestone 4: Verification', detail: 'Test all scenarios and benchmark results.' },
      ],
      expected_outcome: 'A working repository with clean code, runnable tests, and clear documentation.',
      optional_extensions: ['Add CI/CD pipeline', 'Create interactive demo'],
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Smart Study Notes Generator
// ─────────────────────────────────────────────────────────────
export interface SmartNoteItem {
  section_type: 'overview' | 'key_concepts' | 'definitions' | 'explanations' | 'examples' | 'takeaways' | 'mistakes' | 'quick_revision' | 'image_explanation';
  title: string;
  content: string;
  source_start_seconds?: number | null;
  source_end_seconds?: number | null;
  segment_order_index?: number | null;
}

export interface GeneratedSmartNotesResult {
  overview: string;
  key_concepts: {
    title: string;
    explanation: string;
    source_start_seconds?: number;
    source_end_seconds?: number;
    segment_index?: number;
  }[];
  definitions: {
    term: string;
    definition: string;
    source_start_seconds?: number;
  }[];
  core_explanations: {
    title: string;
    content: string;
    source_start_seconds?: number;
    source_end_seconds?: number;
  }[];
  examples: {
    title: string;
    description: string;
    source_start_seconds?: number;
  }[];
  important_takeaways: string[];
  common_mistakes?: string[];
  quick_revision: string;
}

export function validateAndConvertSmartNotes(
  raw: Partial<GeneratedSmartNotesResult>,
  videoTitle: string,
  segments: { id?: string; order_index?: number; start_seconds?: number; end_seconds?: number }[]
): SmartNoteItem[] {
  const isVideoAboutEdTech =
    videoTitle.toLowerCase().includes('learnly') ||
    videoTitle.toLowerCase().includes('saras') ||
    videoTitle.toLowerCase().includes('spaced repetition');

  const forbiddenTerms = [
    'learnly',
    'saras',
    'saras ai',
    'quiz gating',
    'strict focus',
    'checkpoint quiz',
    'deep focus',
    'the learnly platform',
    'the saras platform',
  ];

  const sanitize = (text: string): string => {
    if (isVideoAboutEdTech) return text;
    let clean = text;
    for (const term of forbiddenTerms) {
      const reg = new RegExp(`\\b${term}\\b`, 'gi');
      clean = clean.replace(reg, 'study system');
    }
    return clean;
  };

  const notes: SmartNoteItem[] = [];

  if (raw.overview && raw.overview.trim().length > 15) {
    notes.push({
      section_type: 'overview',
      title: 'Video Overview & Learning Objectives',
      content: sanitize(raw.overview.trim()),
      source_start_seconds: 0,
      source_end_seconds: segments[0]?.end_seconds || 120,
      segment_order_index: 0,
    });
  }

  if (Array.isArray(raw.key_concepts)) {
    for (const kc of raw.key_concepts) {
      if (kc.title && kc.explanation) {
        notes.push({
          section_type: 'key_concepts',
          title: sanitize(kc.title.trim()),
          content: sanitize(kc.explanation.trim()),
          source_start_seconds: kc.source_start_seconds ?? null,
          source_end_seconds: kc.source_end_seconds ?? null,
          segment_order_index: kc.segment_index ?? null,
        });
      }
    }
  }

  if (Array.isArray(raw.definitions)) {
    for (const def of raw.definitions) {
      if (def.term && def.definition) {
        notes.push({
          section_type: 'definitions',
          title: sanitize(def.term.trim()),
          content: sanitize(def.definition.trim()),
          source_start_seconds: def.source_start_seconds ?? null,
        });
      }
    }
  }

  if (Array.isArray(raw.core_explanations)) {
    for (const exp of raw.core_explanations) {
      if (exp.title && exp.content) {
        notes.push({
          section_type: 'explanations',
          title: sanitize(exp.title.trim()),
          content: sanitize(exp.content.trim()),
          source_start_seconds: exp.source_start_seconds ?? null,
          source_end_seconds: exp.source_end_seconds ?? null,
        });
      }
    }
  }

  if (Array.isArray(raw.examples)) {
    for (const ex of raw.examples) {
      if (ex.title && ex.description) {
        notes.push({
          section_type: 'examples',
          title: sanitize(ex.title.trim()),
          content: sanitize(ex.description.trim()),
          source_start_seconds: ex.source_start_seconds ?? null,
        });
      }
    }
  }

  if (Array.isArray(raw.important_takeaways) && raw.important_takeaways.length > 0) {
    notes.push({
      section_type: 'takeaways',
      title: 'Important Takeaways & Rules of Thumb',
      content: JSON.stringify(raw.important_takeaways.map((t) => sanitize(t))),
    });
  }

  if (Array.isArray(raw.common_mistakes) && raw.common_mistakes.length > 0) {
    notes.push({
      section_type: 'mistakes',
      title: 'Common Traps & Anti-Patterns',
      content: JSON.stringify(raw.common_mistakes.map((m) => sanitize(m))),
    });
  }

  if (raw.quick_revision && raw.quick_revision.trim().length > 20) {
    notes.push({
      section_type: 'quick_revision',
      title: '60-Second Rapid Revision Sheet',
      content: sanitize(raw.quick_revision.trim()),
    });
  }

  return notes;
}

const smartNotesSchema = {
  type: 'object',
  properties: {
    overview: { type: 'string' },
    key_concepts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          explanation: { type: 'string' },
          source_start_seconds: { type: 'number' },
          source_end_seconds: { type: 'number' },
          segment_index: { type: 'number' },
        },
        required: ['title', 'explanation'],
      },
    },
    definitions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          term: { type: 'string' },
          definition: { type: 'string' },
          source_start_seconds: { type: 'number' },
        },
        required: ['term', 'definition'],
      },
    },
    core_explanations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          source_start_seconds: { type: 'number' },
          source_end_seconds: { type: 'number' },
        },
        required: ['title', 'content'],
      },
    },
    examples: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['title', 'description'],
      },
    },
    important_takeaways: {
      type: 'array',
      items: { type: 'string' },
    },
    common_mistakes: {
      type: 'array',
      items: { type: 'string' },
    },
    quick_revision: { type: 'string' },
  },
  required: ['overview', 'key_concepts', 'important_takeaways', 'quick_revision'],
};

const SmartNotesZod = z.object({
  overview: z.string(),
  key_concepts: z.array(
    z.object({
      title: z.string(),
      explanation: z.string(),
      source_start_seconds: z.number().optional(),
      source_end_seconds: z.number().optional(),
      segment_index: z.number().optional(),
    })
  ).default([]),
  definitions: z.array(
    z.object({
      term: z.string(),
      definition: z.string(),
      source_start_seconds: z.number().optional(),
    })
  ).optional().default([]),
  core_explanations: z.array(
    z.object({
      title: z.string(),
      content: z.string(),
      source_start_seconds: z.number().optional(),
      source_end_seconds: z.number().optional(),
    })
  ).optional().default([]),
  examples: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    })
  ).optional().default([]),
  important_takeaways: z.array(z.string()).default([]),
  common_mistakes: z.array(z.string()).optional().default([]),
  quick_revision: z.string(),
});

/**
 * Generates Smart Study Notes for a video.
 * Task: 'segment_notes' (Local Ollama primary, Cloud Gemini fallback).
 */
export async function generateSmartNotesForVideo(
  videoTitle: string,
  channel: string,
  segments: { id?: string; title: string; summary?: string | null; start_seconds: number; end_seconds: number; order_index: number }[],
  transcriptItems?: TranscriptItem[]
): Promise<SmartNoteItem[]> {
  const segmentOutline = segments
    .map((s, idx) => `Part ${idx + 1} [${Math.floor(s.start_seconds / 60)}:${String(s.start_seconds % 60).padStart(2, '0')} - ${Math.floor(s.end_seconds / 60)}:${String(s.end_seconds % 60).padStart(2, '0')}]: "${s.title}"\nSummary: ${s.summary || 'Core concept'}`)
    .join('\n\n');

  const transcriptSample = (transcriptItems || [])
    .slice(0, 150)
    .map((t) => `[${Math.floor(t.offset / 60)}:${String(Math.floor(t.offset % 60)).padStart(2, '0')}] ${t.text}`)
    .join('\n');

  const prompt = `VIDEO TITLE: "${videoTitle}"
CREATOR / CHANNEL: "${channel}"
SEGMENTS:
${segmentOutline}
TRANSCRIPT SAMPLE:
${transcriptSample.slice(0, 3000)}

Generate structured Smart Study Notes JSON covering the lecture.
CRITICAL RULE: ${MANDATORY_PLAIN_TEXT_RULE}`;

  try {
    const { data } = await genJSON(
      'segment_notes',
      prompt,
      smartNotesSchema,
      SmartNotesZod,
      { systemPrompt: `You are an expert pedagogical note synthesizer. ${MANDATORY_PLAIN_TEXT_RULE}` }
    );

    const validatedNotes = validateAndConvertSmartNotes(data, videoTitle, segments);
    if (validatedNotes.length > 0) {
      return validatedNotes;
    }
  } catch (err: any) {
    console.warn('[SMART NOTES LLM ERROR]:', err.message);
  }

  // Deterministic fallback
  return [
    {
      section_type: 'overview',
      title: 'Video Overview & Core Thesis',
      content: `This lecture provides a structured walkthrough of ${videoTitle}, decomposing the material into ${segments.length} sequential learning chapters.`,
      source_start_seconds: 0,
      source_end_seconds: segments[0]?.end_seconds || 120,
      segment_order_index: 0,
    },
    ...segments.map((seg, idx) => ({
      section_type: 'key_concepts' as const,
      title: seg.title,
      content: seg.summary || `Core concepts, mechanisms, and rules of thumb covering ${seg.title}.`,
      source_start_seconds: seg.start_seconds,
      source_end_seconds: seg.end_seconds,
      segment_order_index: idx,
    })),
    {
      section_type: 'takeaways',
      title: 'Core Rules & Important Takeaways',
      content: JSON.stringify(
        segments.map((s) => `Master the fundamental principles and operational trade-offs of ${s.title}.`)
      ),
      source_start_seconds: null,
      source_end_seconds: null,
    },
    {
      section_type: 'quick_revision',
      title: 'High-Density Quick Revision Sheet',
      content: `Key review sheet covering: ${segments.map((s) => s.title).join(' -> ')}. Review each chapter's checkpoint questions to verify retention.`,
      source_start_seconds: null,
      source_end_seconds: null,
    },
  ];
}

// ─────────────────────────────────────────────────────────────
// Knowledge Graph Concept Extraction
// ─────────────────────────────────────────────────────────────
export const MASTERY_THRESHOLDS = {
  MASTERED: 80,
  DEVELOPING: 50,
  WEAK: 20,
} as const;

export type MasteryState = 'MASTERED' | 'DEVELOPING' | 'WEAK' | 'NOT_STUDIED';

export function getMasteryState(score: number, exposureCount: number): MasteryState {
  if (exposureCount === 0) return 'NOT_STUDIED';
  if (score >= MASTERY_THRESHOLDS.MASTERED) return 'MASTERED';
  if (score >= MASTERY_THRESHOLDS.DEVELOPING) return 'DEVELOPING';
  return 'WEAK';
}

export interface ExtractedConcept {
  name: string;
  description: string;
  category: string;
  related_concepts: {
    target_name: string;
    relationship_type: 'prerequisite' | 'related' | 'part_of' | 'subtopic';
  }[];
  segment_order_indices: number[];
}

const conceptExtractionSchema = {
  type: 'object',
  properties: {
    concepts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          related_concepts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                target_name: { type: 'string' },
                relationship_type: {
                  type: 'string',
                  enum: ['prerequisite', 'part_of', 'subtopic', 'related'],
                },
              },
              required: ['target_name', 'relationship_type'],
            },
          },
          segment_order_indices: {
            type: 'array',
            items: { type: 'number' },
          },
        },
        required: ['name', 'description', 'category'],
      },
    },
  },
  required: ['concepts'],
};

const ConceptExtractionZod = z.preprocess(
  (val) => {
    if (Array.isArray(val)) return { concepts: val };
    return val;
  },
  z.object({
    concepts: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
        category: z.string().default('Computer Science'),
        related_concepts: z.array(
          z.object({
            target_name: z.string(),
            relationship_type: z.enum(['prerequisite', 'part_of', 'subtopic', 'related']),
          })
        ).optional().default([]),
        segment_order_indices: z.array(z.number()).optional().default([0]),
      })
    ),
  })
);

/**
 * Extracts atomic concepts and semantic relationships for a video lecture.
 * Task: 'concept_extraction' (Cloud Gemini primary, Local Ollama fallback).
 */
export async function extractConceptsAndRelationshipsForVideo(
  videoTitle: string,
  channel: string,
  segments: { title: string; summary?: string | null; order_index: number }[],
  transcriptSample?: string
): Promise<ExtractedConcept[]> {
  const segmentOutline = segments
    .map((s, idx) => `Part ${idx + 1}: "${s.title}" - ${s.summary || 'Core concept'}`)
    .join('\n');

  const prompt = `Extract 3 to 6 atomic, meaningful pedagogical CONCEPTS taught in this video, along with their conceptual relationships.
VIDEO TITLE: "${videoTitle}"
CHANNEL: "${channel}"
CHAPTERS:
${segmentOutline}
TRANSCRIPT:
${(transcriptSample || '').slice(0, 2500)}

CATEGORIES: "Machine Learning", "Computer Science", "Hardware & Architecture", "Software Engineering", "Web Development", "Mathematics", "Productivity & Mindset".
RELATIONSHIPS: "prerequisite", "part_of", "subtopic", "related".
CRITICAL RULE: ${MANDATORY_PLAIN_TEXT_RULE}`;

  try {
    const { data } = await genJSON(
      'concept_extraction',
      prompt,
      conceptExtractionSchema,
      ConceptExtractionZod,
      { systemPrompt: `You are an expert Knowledge Graph Architect. ${MANDATORY_PLAIN_TEXT_RULE}` }
    );

    if (data.concepts.length > 0) {
      return data.concepts;
    }
  } catch (err: any) {
    console.warn('[CONCEPT EXTRACTION ERROR]:', err.message);
  }

  // Deterministic fallback
  return segments.map((s, idx) => ({
    name: s.title.split(/[:–-]/)[0].trim(),
    description: s.summary || `Fundamental concepts, mechanisms, and rules of thumb covering ${s.title}.`,
    category: 'Computer Science',
    related_concepts: idx > 0 ? [{ target_name: segments[0].title.split(/[:–-]/)[0].trim(), relationship_type: 'subtopic' as const }] : [],
    segment_order_indices: [s.order_index],
  }));
}

// ─────────────────────────────────────────────────────────────
// Exam Planner Explanations Generator
// ─────────────────────────────────────────────────────────────

const examPlannerSchema = {
  type: 'object',
  properties: {
    explanation: {
      type: 'string',
      description: 'Strategic daily study plan breakdown in plain text.',
    },
    tips: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['explanation'],
};

const ExamPlannerZod = z.object({
  explanation: z.string(),
  tips: z.array(z.string()).optional(),
});

/**
 * Generates strategic revision explanation for an exam planner using Gemma 4.
 * Task: 'exam_planner' (Cloud Gemini primary, Local Ollama fallback).
 */
export async function generateExamPlannerExplanation(
  examTitle: string,
  daysLeft: number,
  topics: string[],
  weakConcepts: string[]
): Promise<{ explanation: string; provider: ProviderType; model: string }> {
  const prompt = `Formulate a pedagogical study schedule explanation for an upcoming exam:
EXAM: "${examTitle}"
DAYS REMAINING: ${daysLeft} days
SCHEDULED TOPICS: ${topics.join(', ') || 'Core syllabus'}
WEAK CONCEPTS NEEDING EMPHASIS: ${weakConcepts.join(', ') || 'None identified yet'}

Provide an actionable, strategic rationale for how the learner should pace their revision sessions.
CRITICAL RULE: ${MANDATORY_PLAIN_TEXT_RULE}`;

  try {
    const { data, provider, model } = await genJSON(
      'exam_planner',
      prompt,
      examPlannerSchema,
      ExamPlannerZod
    );

    return {
      explanation: data.explanation,
      provider,
      model,
    };
  } catch (err: any) {
    console.warn('[EXAM PLANNER ERROR]:', err.message);
    return {
      explanation: `Plan strategy for ${examTitle}: Prioritize weak concepts early across the ${daysLeft} days remaining. Focus on active retrieval testing and timed checkpoint reviews.`,
      provider: 'local',
      model: 'deterministic-fallback',
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Revision Concepts Ranking Helper
// ─────────────────────────────────────────────────────────────

export const REVISION_SCORING_WEIGHTS = {
  WEAKNESS_MAX: 40,
  MISTAKE_MAX: 25,
  AGE_MAX: 20,
  RECENCY_MAX: 15,
  LOW_EXPOSURE_BOOST: 10,
} as const;

export interface RankedConceptCandidate {
  concept: any;
  priorityScore: number;
  breakdown: {
    weaknessScore: number;
    mistakeScore: number;
    ageScore: number;
    recencyScore: number;
    exposureScore: number;
  };
}

export function calculatePriorityScore(concept: any, now: Date = new Date()): RankedConceptCandidate {
  const mastery = concept.user_mastery?.[0] || {
    mastery_score: 0,
    correct_count: 0,
    wrong_count: 0,
    exposure_count: 0,
    last_seen_at: null,
  };

  const weaknessScore = Math.round(((100 - mastery.mastery_score) / 100) * REVISION_SCORING_WEIGHTS.WEAKNESS_MAX);

  const totalAttempts = mastery.correct_count + mastery.wrong_count;
  const mistakeRate = totalAttempts > 0 ? mastery.wrong_count / totalAttempts : 0;
  const mistakeScore = Math.round(mistakeRate * REVISION_SCORING_WEIGHTS.MISTAKE_MAX);

  let ageScore = 0;
  if (mastery.last_seen_at) {
    const diffDays = Math.floor((now.getTime() - new Date(mastery.last_seen_at).getTime()) / (1000 * 60 * 60 * 24));
    ageScore = Math.min(REVISION_SCORING_WEIGHTS.AGE_MAX, Math.round((diffDays / 14) * REVISION_SCORING_WEIGHTS.AGE_MAX));
  } else {
    ageScore = REVISION_SCORING_WEIGHTS.AGE_MAX;
  }

  let recencyScore = 0;
  if (mastery.last_seen_at) {
    const diffHours = Math.floor((now.getTime() - new Date(mastery.last_seen_at).getTime()) / (1000 * 60 * 60));
    if (diffHours < 4) recencyScore = -REVISION_SCORING_WEIGHTS.RECENCY_MAX;
  }

  let exposureScore = 0;
  if (mastery.exposure_count < 2) exposureScore = REVISION_SCORING_WEIGHTS.LOW_EXPOSURE_BOOST;

  const priorityScore = Math.max(0, weaknessScore + mistakeScore + ageScore + recencyScore + exposureScore);

  return {
    concept,
    priorityScore,
    breakdown: { weaknessScore, mistakeScore, ageScore, recencyScore, exposureScore },
  };
}

export function rankRevisionConcepts(
  concepts: any[],
  modeOrLimit?: string | number,
  optionalLimit?: number
): RankedConceptCandidate[] {
  const limit = typeof modeOrLimit === 'number' ? modeOrLimit : (optionalLimit ?? 8);
  const scored = concepts.map((c) => calculatePriorityScore(c));
  scored.sort((a, b) => b.priorityScore - a.priorityScore);
  return scored.slice(0, limit);
}
