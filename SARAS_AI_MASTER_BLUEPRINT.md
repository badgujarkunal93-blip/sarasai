# Saras AI — Complete Master Architecture & Implementation Blueprint
> **Version:** 2.0 (Production Grade)  
> **Philosophy:** Learn. Recall. Understand.  
> **Purpose:** Step-by-step master guide to build the complete platform from scratch without any mistakes, maintaining the exact Neo-Brutalist / Editorial design aesthetic, database models, and all active-learning features.

---

## Table of Contents
1. [Core Product Vision & Mental Model](#1-core-product-vision--mental-model)
2. [Complete Tech Stack & Dependencies](#2-complete-tech-stack--dependencies)
3. [Design System & UI Tokens (Pixel-Perfect)](#3-design-system--ui-tokens-pixel-perfect)
4. [Complete Database Schema (Prisma ORM)](#4-complete-database-schema-prisma-orm)
5. [Core Services & Algorithmic Engines](#5-core-services--algorithmic-engines)
   - 5.1 Ingestion Pipeline & Global Deduplication
   - 5.2 Transcript Extraction & Fallbacks
   - 5.3 AI Generation & Prompt Engineering (Groq LLaMA 3.3)
   - 5.4 Anti-Hallucination & Flashcard Grounding Filter
   - 5.5 Knowledge Graph Layout Engine
   - 5.6 Spaced-Repetition Revision Ranking Engine
   - 5.7 Adaptive Exam Planner Algorithm
6. [Interactive Components & Client-Side Systems](#6-interactive-components--client-side-systems)
   - 6.1 Segmented YouTube Player & Seek-Lock Boundary
   - 6.2 Quiz Gating Modal & Fallback Mechanics
   - 6.3 Strict Mode Attention Tracker (Client-Side MediaPipe)
   - 6.4 Interactive Paper Dot Grid Canvas
   - 6.5 Saras AI Tutor Drawer & In-Context Grounding
7. [Complete Project Directory Structure](#7-complete-project-directory-structure)
8. [Step-by-Step Implementation Roadmap (Phases 1–8)](#8-step-by-step-implementation-roadmap-phases-18)
9. [Verification Suites & Production Readiness](#9-verification-suites--production-readiness)

---

## 1. Core Product Vision & Mental Model

### The Problem
Traditional online learning (especially YouTube) is **passive**. Learners watch hours of tutorials with high cognitive drift and zero retention. There is no friction, no accountability, and no enforced recall.

### The Solution: Saras AI
Saras AI converts any educational video into an **enforced active retrieval loop**:
1. **Video Ingestion:** Ingests any YouTube URL, fetches transcripts, and deduplicates globally.
2. **Pedagogical Segmentation:** Slices the video into 3–6 logical topic chapters with clear boundaries.
3. **Checkpoint Quiz Gating:** Locks subsequent chapters until the student passes a 2–3 question checkpoint quiz verifying comprehension.
4. **Active Recall Flashcards:** Automatically extracts transcript-grounded definitions into flashcard decks.
5. **Knowledge Graph & Mastery:** Maps extracted concepts into a prerequisite dependency graph with real-time mastery scores (0–100%).
6. **Adaptive Revision & Exam Mode:** Calculates day-by-day study schedules based on exam dates and available study minutes.
7. **Privacy-First Strict Focus:** Client-side computer vision monitors attention and auto-pauses playback if the learner drifts away.

---

## 2. Complete Tech Stack & Dependencies

```json
{
  "name": "saras-ai",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "next lint",
    "postinstall": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^5.19.1",
    "clsx": "^2.1.1",
    "framer-motion": "^11.5.4",
    "lucide-react": "^0.439.0",
    "next": "^14.2.10",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwind-merge": "^2.5.2",
    "youtube-transcript": "^1.2.1"
  },
  "devDependencies": {
    "@types/node": "^20.16.5",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.20",
    "eslint": "^8.57.1",
    "eslint-config-next": "^14.2.10",
    "postcss": "^8.4.45",
    "prisma": "^5.19.1",
    "tailwindcss": "^3.4.11",
    "tsx": "^4.23.12",
    "typescript": "^5.6.2"
  }
}
```

---

## 3. Design System & UI Tokens (Pixel-Perfect)

Saras AI uses an **Editorial Neo-Brutalist** design aesthetic: warm paper canvas, crisp `#111218` borders, hard offset drop shadows, and high-energy neon lime accents.

### 3.1 Color Palette (`tailwind.config.js`)
```javascript
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}', './lib/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#F5F3EC', // Warm editorial cream background
          warm: '#FAF8F2',
          card: '#FFFDF7',   // Clean card surface
          muted: '#EAE6DB',  // Dividers & tracks
        },
        ink: {
          DEFAULT: '#111218', // Deep brutalist ink border & text
          soft: '#21232C',
          muted: '#636573',
          faint: '#8E909F',
        },
        lime: {
          DEFAULT: '#B8FF3D', // Electric signature accent
          bright: '#C6FF57',
          dark: '#8ECC24',
          faint: '#EEFFCC',
        },
        sage: { DEFAULT: '#DDF6BD', soft: '#EAFAD3' },
        sky: { DEFAULT: '#DCEEFF', soft: '#EEF7FF' },
        lavender: { DEFAULT: '#E9DFFF', soft: '#F4EFFF' },
        coral: { DEFAULT: '#FFD1C7', bright: '#FF6B4A' },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      },
      boxShadow: {
        'neo': '3px 3px 0 #111218',
        'neo-sm': '2px 2px 0 #111218',
        'neo-md': '4px 4px 0 #111218',
        'neo-lg': '6px 6px 0 #111218',
        'neo-xl': '8px 8px 0 #111218',
        'neo-lime': '4px 4px 0 #B8FF3D',
      },
      borderWidth: {
        'neo': '1.5px',
        'neo-thick': '2px',
      },
    },
  },
  plugins: [],
};
```

### 3.2 Core CSS Utilities (`app/globals.css`)
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700;800&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #F5F3EC;
  color: #111218;
  font-family: 'Inter', sans-serif;
  overflow-x: hidden;
}

/* Neo-Brutalist Reusable Card */
.neo-card {
  background-color: #FFFDF7;
  border: 2px solid #111218;
  border-radius: 16px;
  box-shadow: 4px 4px 0 #111218;
  transition: all 180ms cubic-bezier(0.16, 1, 0.3, 1);
}
.neo-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 #111218;
}

/* Primary Brutalist Button */
.neo-btn-primary {
  background-color: #111218;
  color: #FFFFFF;
  border: 2px solid #111218;
  border-radius: 12px;
  box-shadow: 3px 3px 0 #B8FF3D;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 600;
  transition: all 160ms cubic-bezier(0.16, 1, 0.3, 1);
}
.neo-btn-primary:hover {
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0 #B8FF3D;
}
.neo-btn-primary:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 #B8FF3D;
}
```

---

## 4. Complete Database Schema (Prisma ORM)

Save to `prisma/schema.prisma`. Works seamlessly on SQLite (dev) and PostgreSQL / Supabase (prod).

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

// 1. VIDEOS & INGESTION
model Video {
  id               String              @id @default(cuid())
  youtube_video_id String              @unique
  title            String
  channel          String              @default("YouTube Creator")
  duration_seconds Int                 @default(0)
  thumbnail_url    String?
  status           String              @default("processing") // 'processing' | 'ready' | 'failed'
  error_reason     String?
  created_at       DateTime            @default(now())

  segments         Segment[]
  flashcards       Flashcard[]
  progress         UserVideoProgress[]
  tasks            Task[]
  attention_events AttentionEvent[]
  projects         ProjectIdea[]
  notes            SmartNote[]

  @@index([youtube_video_id])
}

// 2. SEGMENTS & CHECKPOINT QUIZZES
model Segment {
  id               String           @id @default(cuid())
  video_id         String
  video            Video            @relation(fields: [video_id], references: [id], onDelete: Cascade)
  order_index      Int
  title            String
  summary          String?
  start_seconds    Int
  end_seconds      Int

  quiz_questions   QuizQuestion[]
  attention_events AttentionEvent[]
  notes            SmartNote[]
  concept_segments ConceptSegment[]

  @@index([video_id])
}

model QuizQuestion {
  id               String                @id @default(cuid())
  segment_id       String
  segment          Segment               @relation(fields: [segment_id], references: [id], onDelete: Cascade)
  question         String
  options          String                // JSON array string: ["A", "B", "C", "D"]
  correct_answer   String
  explanation      String?
  concept_quizzes  ConceptQuizQuestion[]

  @@index([segment_id])
}

// 3. FLASHCARDS (Active Recall)
model Flashcard {
  id                 String             @id @default(cuid())
  video_id           String
  video              Video              @relation(fields: [video_id], references: [id], onDelete: Cascade)
  front              String
  back               String
  mastered           Boolean            @default(false)
  created_at         DateTime           @default(now())
  concept_flashcards ConceptFlashcard[]

  @@index([video_id])
}

// 4. USER PROGRESS & ATTENTION
model UserVideoProgress {
  id                    String   @id @default(cuid())
  user_id               String   @default("default_user")
  video_id              String
  video                 Video    @relation(fields: [video_id], references: [id], onDelete: Cascade)
  current_segment_index Int      @default(0)
  completed_segment_ids String   @default("[]") // JSON string array of segment IDs
  last_watched_at       DateTime @default(now())

  @@unique([user_id, video_id])
  @@index([video_id])
}

model AttentionEvent {
  id         String   @id @default(cuid())
  user_id    String   @default("default_user")
  video_id   String?
  video      Video?   @relation(fields: [video_id], references: [id], onDelete: Cascade)
  segment_id String?
  segment    Segment? @relation(fields: [segment_id], references: [id], onDelete: SetNull)
  event_type String   // 'looked_away' | 'resumed' | 'no_face'
  created_at DateTime @default(now())

  @@index([video_id])
  @@index([user_id])
}

// 5. TASKS & AI CHAT
model Task {
  id              String   @id @default(cuid())
  user_id         String   @default("default_user")
  label           String
  done            Boolean  @default(false)
  linked_video_id String?
  linked_video    Video?   @relation(fields: [linked_video_id], references: [id], onDelete: SetNull)
  created_at      DateTime @default(now())

  @@index([user_id])
}

model ChatMessage {
  id                  String   @id @default(cuid())
  user_id             String   @default("default_user")
  role                String   // 'user' | 'assistant'
  content             String
  suggested_video_ids String?  // JSON string array
  created_at          DateTime @default(now())

  @@index([user_id])
}

// 6. SMART STUDY NOTES & HANDS-ON PROJECTS
model SmartNote {
  id                   String   @id @default(cuid())
  video_id             String
  video                Video    @relation(fields: [video_id], references: [id], onDelete: Cascade)
  segment_id           String?
  segment              Segment? @relation(fields: [segment_id], references: [id], onDelete: SetNull)
  section_type         String   // 'overview' | 'key_concepts' | 'definitions' | 'examples' | 'takeaways'
  title                String
  content              String
  source_start_seconds Int?
  source_end_seconds   Int?
  order_index          Int      @default(0)
  created_at           DateTime @default(now())
  updated_at           DateTime @default(now())

  @@index([video_id])
}

model ProjectIdea {
  id                  String        @id @default(cuid())
  video_id            String
  video               Video         @relation(fields: [video_id], references: [id], onDelete: Cascade)
  title               String
  problem_statement   String
  difficulty          String        @default("Intermediate")
  why_it_fits         String
  skills_practiced    String        // JSON string array
  requirements        String        // JSON string array
  milestones          String        // JSON string array of {id, label, detail}
  expected_outcome    String
  optional_extensions String        @default("[]")
  created_at          DateTime      @default(now())
  user_projects       UserProject[]

  @@index([video_id])
}

model UserProject {
  id                      String      @id @default(cuid())
  user_id                 String      @default("default_user")
  project_idea_id         String
  project_idea            ProjectIdea @relation(fields: [project_idea_id], references: [id], onDelete: Cascade)
  status                  String      @default("not_started")
  completed_milestone_ids String      @default("[]")
  notes                   String?
  created_at              DateTime    @default(now())
  updated_at              DateTime    @default(now())

  @@unique([user_id, project_idea_id])
}

// 7. KNOWLEDGE GRAPH & CONCEPT MASTERY
model Concept {
  id                 String                @id @default(cuid())
  name               String                @unique
  slug               String                @unique
  description        String?
  category           String?
  created_at         DateTime              @default(now())
  updated_at         DateTime              @default(now())

  outgoing_relations ConceptRelationship[] @relation("SourceConcept")
  incoming_relations ConceptRelationship[] @relation("TargetConcept")

  video_segments     ConceptSegment[]
  flashcards         ConceptFlashcard[]
  quiz_questions     ConceptQuizQuestion[]
  user_mastery       UserConceptMastery[]
  revision_items     RevisionSessionItem[]
  exam_topics        ExamTopic[]
  exam_plan_items    ExamPlanItem[]

  @@index([category])
  @@index([name])
}

model ConceptRelationship {
  id                String   @id @default(cuid())
  source_concept_id String
  source_concept    Concept  @relation("SourceConcept", fields: [source_concept_id], references: [id], onDelete: Cascade)
  target_concept_id String
  target_concept    Concept  @relation("TargetConcept", fields: [target_concept_id], references: [id], onDelete: Cascade)
  relationship_type String   // 'prerequisite' | 'related' | 'subtopic'
  weight            Float    @default(1.0)
  created_at        DateTime @default(now())

  @@unique([source_concept_id, target_concept_id, relationship_type])
}

model ConceptSegment {
  id                   String   @id @default(cuid())
  concept_id           String
  concept              Concept  @relation(fields: [concept_id], references: [id], onDelete: Cascade)
  segment_id           String
  segment              Segment  @relation(fields: [segment_id], references: [id], onDelete: Cascade)
  source_start_seconds Int?
  source_end_seconds   Int?
  created_at           DateTime @default(now())

  @@unique([concept_id, segment_id])
}

model ConceptFlashcard {
  id           String    @id @default(cuid())
  concept_id   String
  concept      Concept   @relation(fields: [concept_id], references: [id], onDelete: Cascade)
  flashcard_id String
  flashcard    Flashcard @relation(fields: [flashcard_id], references: [id], onDelete: Cascade)

  @@unique([concept_id, flashcard_id])
}

model ConceptQuizQuestion {
  id               String       @id @default(cuid())
  concept_id       String
  concept          Concept      @relation(fields: [concept_id], references: [id], onDelete: Cascade)
  quiz_question_id String
  quiz_question    QuizQuestion @relation(fields: [quiz_question_id], references: [id], onDelete: Cascade)

  @@unique([concept_id, quiz_question_id])
}

model UserConceptMastery {
  id             String   @id @default(cuid())
  user_id        String   @default("default_user")
  concept_id     String
  concept        Concept  @relation(fields: [concept_id], references: [id], onDelete: Cascade)
  mastery_score  Int      @default(0) // 0 to 100
  correct_count  Int      @default(0)
  wrong_count    Int      @default(0)
  exposure_count Int      @default(0)
  last_seen_at   DateTime @default(now())
  created_at     DateTime @default(now())
  updated_at     DateTime @default(now())

  @@unique([user_id, concept_id])
}

// 8. ADAPTIVE REVISION ENGINE
model RevisionSession {
  id              String                @id @default(cuid())
  user_id         String                @default("default_user")
  mode            String                @default("smart_mix") // 'smart_mix' | 'weak_only' | 'recent'
  status          String                @default("in_progress")
  total_items     Int                   @default(10)
  completed_items Int                   @default(0)
  correct_items   Int                   @default(0)
  session_score   Int                   @default(0)
  started_at      DateTime              @default(now())
  completed_at    DateTime?
  updated_at      DateTime              @default(now())
  items           RevisionSessionItem[]
}

model RevisionSessionItem {
  id                   String          @id @default(cuid())
  session_id           String
  session              RevisionSession @relation(fields: [session_id], references: [id], onDelete: Cascade)
  concept_id           String?
  concept              Concept?        @relation(fields: [concept_id], references: [id], onDelete: SetNull)
  source_type          String          // 'quiz' | 'flashcard'
  source_id            String?
  question_text        String
  options              String?         // JSON string array for MCQ
  correct_answer       String?
  user_answer          String?
  is_correct           Boolean?
  explanation          String?
  order_index          Int             @default(0)
  source_video_title   String?
  source_segment_title String?
  source_start_seconds Int?
  answered_at          DateTime?

  @@index([session_id])
}

// 9. EXAM MODE & STUDY CALENDAR
model Exam {
  id                String        @id @default(cuid())
  user_id           String        @default("default_user")
  name              String
  exam_date         DateTime
  daily_minutes     Int           @default(60)
  goal              String?
  status            String        @default("active")
  plan_version      Int           @default(1)
  last_replanned_at DateTime      @default(now())
  replan_reason     String?
  created_at        DateTime      @default(now())
  updated_at        DateTime      @default(now())

  topics            ExamTopic[]
  plan_days         ExamPlanDay[]
}

model ExamTopic {
  id         String   @id @default(cuid())
  exam_id    String
  exam       Exam     @relation(fields: [exam_id], references: [id], onDelete: Cascade)
  concept_id String?
  concept    Concept? @relation(fields: [concept_id], references: [id], onDelete: SetNull)
  topic_name String
  priority   Int      @default(1)
  created_at DateTime @default(now())

  @@index([exam_id])
}

model ExamPlanDay {
  id         String         @id @default(cuid())
  exam_id    String
  exam       Exam           @relation(fields: [exam_id], references: [id], onDelete: Cascade)
  day_number Int
  date       DateTime
  status     String         @default("pending")
  created_at DateTime       @default(now())
  items      ExamPlanItem[]

  @@unique([exam_id, day_number])
}

model ExamPlanItem {
  id                   String      @id @default(cuid())
  plan_day_id          String
  plan_day             ExamPlanDay @relation(fields: [plan_day_id], references: [id], onDelete: Cascade)
  concept_id           String?
  concept              Concept?    @relation(fields: [concept_id], references: [id], onDelete: SetNull)
  activity_type        String      // 'learn' | 'revision' | 'flashcards' | 'focus' | 'mock_exam'
  title                String
  description          String?
  duration_minutes     Int         @default(30)
  priority             Int         @default(1)
  status               String      @default("pending")
  linked_resource_type String?
  linked_resource_id   String?
  order_index          Int         @default(0)
  completed_at         DateTime?

  @@index([plan_day_id])
}

// 10. USER PROFILE & STREAKS
model UserProfile {
  id         String   @id @default(cuid())
  user_id    String   @unique
  name       String   @default("Student")
  email      String   @default("student@saras.ai")
  avatar_url String?
  created_at DateTime @default(now())
  updated_at DateTime @default(now())

  @@index([user_id])
}
```

---

## 5. Core Services & Algorithmic Engines

### 5.1 Ingestion Pipeline & Global Deduplication (`lib/services/ingestion.ts`)
```typescript
import { db } from '@/lib/db';
import { extractYouTubeId, getYouTubeThumbnail } from '@/lib/utils';
import { fetchTranscript, fetchYouTubeMetadata } from './transcript';
import { generateSegmentsAndQuizzes, generateSmartNotesForVideo, extractConceptsAndRelationshipsForVideo } from './ai';

export async function ingestVideo(youtubeUrl: string, options = { userId: 'default_user' }) {
  const videoId = extractYouTubeId(youtubeUrl);
  if (!videoId) throw new Error('Invalid YouTube URL');

  // Step 1: Global Deduplication Cache Check
  const existing = await db.video.findUnique({
    where: { youtube_video_id: videoId },
    include: { segments: { include: { quiz_questions: true } }, flashcards: true }
  });

  if (existing && existing.status === 'ready') {
    // Return cached record immediately across all users
    await ensureUserProgress(existing.id, options.userId);
    return { video: existing, cached: true };
  }

  // Step 2: Atomic lock to avoid race conditions
  const video = await db.video.upsert({
    where: { youtube_video_id: videoId },
    create: { youtube_video_id: videoId, title: 'Processing...', status: 'processing', thumbnail_url: getYouTubeThumbnail(videoId) },
    update: { status: 'processing', error_reason: null }
  });

  try {
    // Step 3: Fetch oEmbed Metadata & Transcripts
    const meta = await fetchYouTubeMetadata(videoId);
    const { items: transcriptItems, fullText, estimatedDuration } = await fetchTranscript(videoId);
    const duration = estimatedDuration || 600;

    // Step 4: AI Pedagogy Extraction
    const aiResult = await generateSegmentsAndQuizzes(meta.title, transcriptItems, duration);
    const smartNotes = await generateSmartNotesForVideo(meta.title, meta.channel, aiResult.segments, transcriptItems);
    const extractedConcepts = await extractConceptsAndRelationshipsForVideo(meta.title, meta.channel, aiResult.segments, fullText);

    // Step 5: Atomic Transaction Persistence
    const saved = await db.$transaction(async (tx) => {
      // Clean partial states
      await tx.segment.deleteMany({ where: { video_id: video.id } });
      await tx.flashcard.deleteMany({ where: { video_id: video.id } });
      await tx.smartNote.deleteMany({ where: { video_id: video.id } });

      const updated = await tx.video.update({
        where: { id: video.id },
        data: { title: meta.title, channel: meta.channel, duration_seconds: duration, status: 'ready' }
      });

      // Insert segments and quizzes
      for (const seg of aiResult.segments) {
        const createdSeg = await tx.segment.create({
          data: {
            video_id: updated.id,
            order_index: seg.order_index,
            title: seg.title,
            summary: seg.summary,
            start_seconds: seg.start_seconds,
            end_seconds: seg.end_seconds,
          }
        });
        for (const q of seg.quiz_questions) {
          await tx.quizQuestion.create({
            data: {
              segment_id: createdSeg.id,
              question: q.question,
              options: JSON.stringify(q.options),
              correct_answer: q.correct_answer,
              explanation: q.explanation
            }
          });
        }
      }

      // Insert flashcards
      for (const fc of aiResult.flashcards) {
        await tx.flashcard.create({
          data: { video_id: updated.id, front: fc.front, back: fc.back, mastered: false }
        });
      }

      return updated;
    });

    return { video: saved, cached: false };
  } catch (err: any) {
    await db.video.update({ where: { id: video.id }, data: { status: 'failed', error_reason: err.message } });
    throw err;
  }
}
```

### 5.2 Anti-Hallucination & Flashcard Grounding Filter
Critical rule to prevent platform jargon ("Learnly", "quiz gating", "strict mode") from contaminating flashcards:
```typescript
export function validateAndFilterFlashcards(rawCards: FlashcardProposal[], videoTitle: string): FlashcardProposal[] {
  const forbiddenTerms = ['learnly', 'saras', 'quiz gating', 'strict focus', 'checkpoint quiz', 'active retrieval testing'];
  const seen = new Set<string>();
  const validated: FlashcardProposal[] = [];

  for (const card of rawCards) {
    if (!card.front || !card.back || card.front.length < 5 || card.back.length < 10) continue;
    const norm = card.front.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seen.has(norm)) continue;

    const combined = `${card.front.toLowerCase()} ${card.back.toLowerCase()}`;
    if (forbiddenTerms.some(term => combined.includes(term))) continue;

    seen.add(norm);
    validated.push(card);
  }
  return validated;
}
```

---

## 6. Interactive Components & Client-Side Systems

### 6.1 Segmented YouTube Player (`components/player/SegmentedPlayer.tsx`)
- Embeds YouTube iframe with JS API enabled (`enablejsapi=1`).
- Polling timer checks `player.getCurrentTime()` every 250ms.
- **Seek-Lock Logic**: If `currentTime >= activeSegment.end_seconds`, player automatically calls `player.pauseVideo()`, enters modal state, and opens `QuizModal`.
- Disallows user from seeking into future segments until prior segments are in `completed_segment_ids`.

### 6.2 Quiz Gating Modal (`components/player/QuizModal.tsx`)
- Presents 2–3 questions with 4 multiple-choice options.
- **60% Passing Score**: User must get at least 60% correct to unlock next chapter.
- **Graceful Fallback**: If user fails twice (`attemptCount >= 2`), display `"Review & Unlock Chapter"` fallback button so student is never permanently blocked.

### 6.3 Strict Mode Attention Tracker (`components/player/StrictModeDetector.tsx`)
- Zero frames uploaded to server; computed in browser via WebAssembly.
- Requests `navigator.mediaDevices.getUserMedia({ video: true, audio: false })`.
- Monitors frame luminosity / face bounding drift. If no face or looking away > 4 seconds, triggers `onAutoPause()` and displays brutalist pause overlay: `"Paused — You looked away. Resume when ready."`

---

## 7. Complete Project Directory Structure

```text
├── app/
│   ├── api/
│   │   ├── attention/route.ts       # POST attention events
│   │   ├── chat/route.ts            # POST AI companion replies
│   │   ├── exams/route.ts           # GET/POST/PATCH exam planner
│   │   ├── flashcards/route.ts      # GET/PATCH flashcard mastery
│   │   ├── knowledge/route.ts      # GET knowledge graph nodes & edges
│   │   ├── notes/route.ts           # GET/POST smart notes
│   │   ├── progress/route.ts        # GET/POST user video progress
│   │   ├── projects/route.ts        # GET/POST portfolio project milestones
│   │   ├── revision/route.ts        # GET/POST adaptive drill sessions
│   │   ├── tasks/route.ts           # CRUD study checklist tasks
│   │   ├── user/route.ts            # GET/PATCH user profile & streaks
│   │   └── videos/
│   │       ├── route.ts             # POST ingest & GET all videos
│   │       └── [id]/route.ts        # GET single video with relations
│   ├── discover/page.tsx            # Main dashboard, search, curated lessons
│   ├── exam/page.tsx                # Exam readiness & daily study plan
│   ├── flashcards/page.tsx          # Full-screen active recall flashcard studio
│   ├── focus/page.tsx               # Distraction-free strict focus workspace
│   ├── knowledge/page.tsx           # Interactive 2D concept knowledge graph
│   ├── landing/page.tsx             # Interactive 8-step pipeline showcase
│   ├── profile/page.tsx             # Study stats, activity heatmap & streaks
│   ├── revision/page.tsx            # Adaptive drill session interface
│   ├── video/[id]/page.tsx          # Segmented player, quiz modal, notes, cards
│   ├── globals.css                  # Neo-brutalist custom utilities & fonts
│   ├── layout.tsx                   # Root navigation, sidebar, chat drawer
│   └── page.tsx                     # Landing page export
├── components/
│   ├── background/
│   │   └── InteractiveGridBackground.tsx # Canvas paper dot grid with ripple
│   ├── chat/
│   │   └── ChatAssistant.tsx        # In-context AI tutor drawer
│   ├── dashboard/
│   │   └── StatCards.tsx            # Neo-brutalist metric cards
│   ├── knowledge/
│   │   └── KnowledgeGraphViewer.tsx # Canvas/SVG force-directed concept graph
│   ├── navbar/
│   │   └── Navbar.tsx               # Top navigation bar with URL ingestion input
│   ├── notes/
│   │   └── SmartNotesView.tsx       # Structured timestamped study notes
│   ├── player/
│   │   ├── QuizModal.tsx            # Checkpoint quiz gating modal
│   │   ├── SegmentedPlayer.tsx      # YouTube IFrame controller & seek-lock
│   │   └── StrictModeDetector.tsx   # Client-side attention monitoring
│   ├── projects/
│   │   └── ProjectRoadmapView.tsx   # Milestone portfolio project tracker
│   └── tasks/
│       └── TasksPanel.tsx           # Slide-out study goals checklist
├── lib/
│   ├── data/
│   │   └── curatedLessons.ts        # Pre-seeded starter lessons
│   ├── services/
│   │   ├── ai.ts                    # Groq API LLaMA 3.3 generation prompts
│   │   ├── examPlanner.ts           # Daily study plan calculation engine
│   │   ├── ingestion.ts             # End-to-end video ingestion & dedupe
│   │   ├── knowledgeLayout.ts       # Graph force-directed layout coordinates
│   │   ├── transcript.ts            # YouTube transcript & oEmbed fetcher
│   │   └── userProfile.ts           # Streak tracking & profile aggregation
│   ├── db.ts                        # Prisma client singleton
│   └── utils.ts                     # formatTime, extractYouTubeId, cn
├── prisma/
│   └── schema.prisma                # Complete relational schema
├── tailwind.config.js               # Neo-brutalist theme configuration
├── package.json
└── README.md
```

---

## 8. Step-by-Step Implementation Roadmap (Phases 1–8)

### Phase 1: Foundation & Design System Setup
1. Initialize Next.js 14 App Router project with TypeScript and Tailwind CSS.
2. Install dependencies: `@prisma/client`, `framer-motion`, `lucide-react`, `youtube-transcript`, `clsx`, `tailwind-merge`.
3. Configure `tailwind.config.js` and `app/globals.css` with editorial colors (`#F5F3EC`, `#B8FF3D`, `#111218`) and neo-brutalist shadows.
4. Implement `InteractiveGridBackground.tsx` to provide the subtle interactive paper dot grid canvas.

### Phase 2: Database Modeling & Prisma Setup
1. Define the 10 core model groups in `prisma/schema.prisma`.
2. Run `npx prisma db push` to initialize SQLite database (`dev.db`).
3. Create `lib/db.ts` to export the Prisma client singleton.

### Phase 3: Ingestion Pipeline & Groq AI Engine
1. Implement `lib/services/transcript.ts` with oEmbed metadata fetching and `youtube-transcript`.
2. Implement `lib/services/ai.ts` using Groq SDK (`llama-3.3-70b-versatile`) with structured JSON schema outputs.
3. Implement `lib/services/ingestion.ts` with global cache check by `youtube_video_id` and atomic `$transaction` writes.
4. Wire `/api/videos` to process incoming links.

### Phase 4: Segmented Player & Checkpoint Quiz Gating
1. Build `SegmentedPlayer.tsx` using YouTube IFrame API with timestamp bounds.
2. Implement seek-lock prevention to guard future segments.
3. Build `QuizModal.tsx` with 60% pass threshold, explanation reveal, and 2-attempt fallback unlock.
4. Wire `/api/progress` to persist completed segments per user.

### Phase 5: Deep Focus (Strict Mode) Client-Side Attention
1. Build `StrictModeDetector.tsx` with webcam permission request and canvas processing.
2. Add cognitive drift timer (4s lookaway grace period).
3. Connect auto-pause event listener to `SegmentedPlayer`.
4. Log attention events to `/api/attention`.

### Phase 6: Knowledge Graph & Concept Mastery
1. Build `lib/services/knowledgeLayout.ts` with force-directed cluster math.
2. Implement `app/knowledge/page.tsx` with zoom, pan, and prerequisite edges.
3. Wire mastery updates whenever quizzes and flashcards are completed.

### Phase 7: Adaptive Revision & Exam Planner
1. Build `lib/services/examPlanner.ts` with topological sort for prerequisite-aware daily plans.
2. Implement `app/exam/page.tsx` allowing students to pick an exam date and daily minutes.
3. Build `app/revision/page.tsx` for adaptive spaced repetition drills.

### Phase 8: Saras AI Co-Pilot & UI Polish
1. Implement `ChatAssistant.tsx` drawer with in-context lesson grounding.
2. Implement `TasksPanel.tsx` and `StatCards.tsx`.
3. Add seed script in `lib/data/curatedLessons.ts` so the platform comes with pre-loaded high-quality lessons.

---

## 9. Verification Suites & Production Readiness

Run these quick checks after building to guarantee 100% fidelity:
- **Deduplication Check:** Paste the same YouTube URL twice. Second request must complete in <100ms with `cached: true`.
- **Seek-Lock Check:** Attempt to click Segment 3 when Segment 1 is active. The player must prevent seeking and display locked notice.
- **Strict Mode Check:** Enable camera in strict mode. Cover camera or look away for 5 seconds; player must pause.
- **Typecheck & Build:** Run `npm run typecheck` and `npm run build` to ensure zero compilation errors.
