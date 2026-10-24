# Phase 7: Adaptive Revision & Exam Planner

> **Spec Reference:** [`SARAS_AI_MASTER_BLUEPRINT.md`](file:///c:/Users/kunal%20badgujar/Desktop/Projects/AILearningPlatform/AILearningPlatform/SARAS_AI_MASTER_BLUEPRINT.md) — Section 5.6, 5.7

## 1. Objective
Build an adaptive spaced repetition drill engine that surfaces weak and overdue concepts, plus an exam preparation planner that builds day-by-day study calendars based on exam target dates.

## 2. Deliverables & File Manifest
- [x] `lib/services/examPlanner.ts` — Deterministic exam planner using topological prerequisite sorting and daily study constraints
- [x] `app/revision/page.tsx` — AI revision drill interface with weak-only and smart-mix practice modes
- [x] `app/exam/page.tsx` — Exam creation wizard, countdown timer, readiness score, and daily checklist
- [x] `app/api/revision/route.ts` — GET/POST/PATCH endpoints for revision drill generation and answer evaluation
- [x] `app/api/exams/route.ts` — GET/POST/PATCH endpoints for exam schedule generation and replanning

## 3. Algorithmic Highlights
1. **Adaptive Revision Ranking (`rankRevisionConcepts`):**
   - Weak concepts (low mastery) and concepts not reviewed recently receive highest priority in revision drills.
2. **Topological Sort (`sortConceptsWithPrerequisites`):**
   - Ensures prerequisite foundational concepts appear on earlier days than advanced dependent concepts.
3. **Daily Workload Cap:**
   - Activities fit cleanly within the user's selected daily study duration (default 60 minutes).

## 4. Verification Tests
```bash
npx tsx scripts/test_revision_engine.ts
npx tsx scripts/test_exam_mode.ts
```

## 5. Commit Checkpoint
```bash
git commit -m "feat(exam): implement adaptive revision drill sessions and topological exam study planner"
```
