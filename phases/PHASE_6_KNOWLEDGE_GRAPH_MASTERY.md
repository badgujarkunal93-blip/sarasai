# Phase 6: Knowledge Graph & Concept Mastery Engine

> **Spec Reference:** [`SARAS_AI_MASTER_BLUEPRINT.md`](file:///c:/Users/kunal%20badgujar/Desktop/Projects/AILearningPlatform/AILearningPlatform/SARAS_AI_MASTER_BLUEPRINT.md) — Section 4 (Group 7), 5.5

## 1. Objective
Create an interactive 2D knowledge graph connecting concepts across all ingested videos, calculate user concept mastery (0–100%), and map prerequisite learning pathways.

## 2. Deliverables & File Manifest
- [x] `lib/services/knowledgeLayout.ts` — Force-directed physics layout engine calculating node coordinates and edge curves
- [x] `components/knowledge/KnowledgeGraphViewer.tsx` — Canvas/SVG graph viewer with zoom, pan, category filters, and node selection
- [x] `app/knowledge/page.tsx` — Full knowledge map page with mastery summary and topic drawer
- [x] `app/api/knowledge/route.ts` — Endpoint returning nodes, edges, category clusters, and mastery states

## 3. Mastery Calculation Engine
Concepts are categorized into 4 mastery states:
- `MASTERED` (score ≥ 80%, exposure ≥ 2)
- `DEVELOPING` (score 40–79%)
- `WEAK` (score < 40%, exposure ≥ 1)
- `NOT_STUDIED` (exposure === 0)

Quiz completions and flashcard reviews update `UserConceptMastery` atomically.

## 4. Verification Tests
```bash
npx tsx scripts/test_knowledge_graph.ts
npx tsx scripts/test_knowledge_layout.ts
```

## 5. Commit Checkpoint
```bash
git commit -m "feat(knowledge): implement concept knowledge graph, force layout algorithm, and mastery tracker"
```
