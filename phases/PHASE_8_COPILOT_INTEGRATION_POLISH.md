# Phase 8: Saras AI Co-Pilot & Workspace Polish

> **Spec Reference:** [`SARAS_AI_MASTER_BLUEPRINT.md`](file:///c:/Users/kunal%20badgujar/Desktop/Projects/AILearningPlatform/AILearningPlatform/SARAS_AI_MASTER_BLUEPRINT.md) — Section 5.3, 6.5

## 1. Objective
Complete the platform with the persistent Saras AI companion tutor drawer, collapsible tasks checklist panel, user profile with persistent study streak tracking, and end-to-end integration polish.

## 2. Deliverables & File Manifest
- [x] `components/chat/ChatAssistant.tsx` — Grounded AI tutor drawer with one-click video recommendation ingestion
- [x] `components/tasks/TasksPanel.tsx` — Study goals checklist panel linked to specific lessons
- [x] `components/navbar/Navbar.tsx` — Sticky top bar with quick link ingestion, user avatar, and modal triggers
- [x] `app/layout.tsx` — Root layout tying together sidebar, navbar, assistant drawer, and tasks modal
- [x] `app/profile/page.tsx` — User profile, study activity heatmap, streak engine, and learning history
- [x] `app/api/chat/route.ts` — Streaming AI chat completion with real-time video context injection
- [x] `app/api/tasks/route.ts` — Task CRUD endpoints
- [x] `app/api/user/route.ts` — User profile and learning summary aggregation

## 3. Grounded Co-Pilot Behavior
The Saras AI companion is aware of:
- Currently active lesson title and chapter
- Current segment transcript text
- User's weak concepts and exam deadline
- Can recommend YouTube videos and directly trigger `ingestVideo()` via one shared pipeline

## 4. Verification Tests
```bash
npx tsx scripts/test_chatbot_hardening.ts
npx tsx scripts/test_user_profile_system.ts
npx tsx scripts/test_master_truthfulness_audit.ts
```

## 5. Commit Checkpoint
```bash
git commit -m "feat(copilot): implement grounded ai chat companion, tasks panel, and study streak system"
```
