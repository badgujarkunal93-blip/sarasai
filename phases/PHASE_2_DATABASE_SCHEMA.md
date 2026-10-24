# Phase 2: Database Modeling & Prisma Relational Layer

> **Spec Reference:** [`SARAS_AI_MASTER_BLUEPRINT.md`](file:///c:/Users/kunal%20badgujar/Desktop/Projects/AILearningPlatform/AILearningPlatform/SARAS_AI_MASTER_BLUEPRINT.md) — Section 4

## 1. Objective
Define and generate the complete relational database schema with Prisma ORM, supporting both SQLite in local development and PostgreSQL / Supabase in production.

## 2. Deliverables & File Manifest
- [x] `prisma/schema.prisma` — Complete 10 model groups (24 relational tables)
- [x] `lib/db.ts` — Prisma client singleton preventing connection exhaustion during hot-reloads
- [x] `.env.example` & `.env` — Environment configurations for local SQLite (`dev.db`) and remote PostgreSQL

## 3. Core Models
1. **Video & Segment**: `Video`, `Segment`, `QuizQuestion`
2. **Flashcards**: `Flashcard`
3. **Progress & Attention**: `UserVideoProgress`, `AttentionEvent`
4. **Tasks & Chat**: `Task`, `ChatMessage`
5. **Smart Notes & Projects**: `SmartNote`, `ProjectIdea`, `UserProject`
6. **Knowledge Graph**: `Concept`, `ConceptRelationship`, `ConceptSegment`, `ConceptFlashcard`, `ConceptQuizQuestion`, `UserConceptMastery`
7. **Revision Engine**: `RevisionSession`, `RevisionSessionItem`
8. **Exam Mode**: `Exam`, `ExamTopic`, `ExamPlanDay`, `ExamPlanItem`
9. **User Profile**: `UserProfile`

## 4. Key Constraints & Indexes
- `Video.youtube_video_id`: Unique and indexed (critical deduplication key)
- `Concept.name` & `Concept.slug`: Unique and indexed
- `UserVideoProgress`: Composite unique `[user_id, video_id]`
- `UserConceptMastery`: Composite unique `[user_id, concept_id]`
- Foreign key cascade deletions on child records (`Segment`, `QuizQuestion`, `Flashcard`, `SmartNote`)

## 5. Verification Commands
```bash
npx prisma validate
npx prisma generate
npx prisma db push
```

## 6. Commit Checkpoint
```bash
git commit -m "feat(db): establish complete prisma relational schema for all platform modules"
```
