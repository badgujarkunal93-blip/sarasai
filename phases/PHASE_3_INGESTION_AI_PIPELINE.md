# Phase 3: Video Ingestion & Groq AI Pipeline

> **Spec Reference:** [`SARAS_AI_MASTER_BLUEPRINT.md`](file:///c:/Users/kunal%20badgujar/Desktop/Projects/AILearningPlatform/AILearningPlatform/SARAS_AI_MASTER_BLUEPRINT.md) — Section 5.1, 5.2, 5.3, 5.4

## 1. Objective
Implement the unified video ingestion pipeline that extracts YouTube metadata and transcripts, performs global deduplication caching, executes AI pedagogical segmentation via Groq LLaMA 3.3, and writes all records in an atomic transaction.

## 2. Deliverables & File Manifest
- [x] `lib/services/transcript.ts` — YouTube oEmbed metadata extraction and transcript timestamp fetching
- [x] `lib/services/ai.ts` — Groq Cloud API inference (`llama-3.3-70b-versatile`), segmentation, checkpoint quizzes, smart notes, concept extraction
- [x] `lib/services/ai.ts` (`validateAndFilterFlashcards`) — Strict anti-hallucination and product-jargon filter
- [x] `lib/services/ingestion.ts` — Unified ingestion pipeline with deduplication cache checks and atomic database transactions
- [x] `app/api/videos/route.ts` — POST route handling URL ingest and GET route listing all videos

## 3. Critical Pipeline Logic
1. **Deduplication Check:** Query `Video` by `youtube_video_id`. If `status === 'ready'`, return immediately without querying transcript or LLM APIs.
2. **Concurrent Lock:** If `status === 'processing'`, return existing record to prevent duplicate concurrent jobs.
3. **Atomic Transaction:** Clean prior partial states and write video, segments, quiz questions, flashcards, smart notes, and concepts in `db.$transaction`.
4. **Anti-Leakage Filter:** Reject flashcards containing words like `learnly`, `saras`, `quiz gating`, or `checkpoint quiz`.

## 4. Verification Tests
```bash
npx tsx scripts/test_transcript.ts
npx tsx scripts/test_pipeline.ts
```

## 5. Commit Checkpoint
```bash
git commit -m "feat(ingestion): implement unified ingestion pipeline, groq ai segmentation, and cache deduplication"
```
