# Phase 4: Segmented Player & Checkpoint Quiz Gating

> **Spec Reference:** [`SARAS_AI_MASTER_BLUEPRINT.md`](file:///c:/Users/kunal%20badgujar/Desktop/Projects/AILearningPlatform/AILearningPlatform/SARAS_AI_MASTER_BLUEPRINT.md) — Section 6.1, 6.2

## 1. Objective
Build the YouTube IFrame-powered segmented player with seek-lock boundary enforcement, segment progression tracking, and interactive checkpoint quiz gating.

## 2. Deliverables & File Manifest
- [x] `components/player/SegmentedPlayer.tsx` — YouTube IFrame controller with timestamp tracking and boundary triggers
- [x] `components/player/QuizModal.tsx` — Checkpoint modal with MCQ options, immediate explanation feedback, and unlock logic
- [x] `app/video/[id]/page.tsx` — Video detail page integrating player, chapter navigation, smart notes, flashcard deck, and quiz bank
- [x] `app/api/progress/route.ts` — GET/POST endpoints persisting user video progression

## 3. Core Mechanics
1. **Seek-Lock Enforcement:**
   - Learners cannot skip ahead into locked segments.
   - If player time crosses `activeSegment.end_seconds`, player immediately pauses and opens `QuizModal`.
2. **Passing Standard:**
   - 60% correct answers required to pass and unlock next chapter.
3. **No-Block Fallback:**
   - After 2 failed attempts (`attemptCount >= 2`), display `"Review & Continue"` fallback button so learners are never permanently blocked.
4. **Persistence:**
   - Completed segment IDs are stored in `UserVideoProgress.completed_segment_ids`.

## 4. Verification Tests
```bash
npx tsx scripts/test_routing_behavior.ts
```

## 5. Commit Checkpoint
```bash
git commit -m "feat(player): implement segmented youtube player, seek-lock enforcement, and quiz gating modal"
```
