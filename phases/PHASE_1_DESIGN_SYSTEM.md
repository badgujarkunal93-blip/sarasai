# Phase 1: Design System & Foundation Setup

> **Spec Reference:** [`SARAS_AI_MASTER_BLUEPRINT.md`](file:///c:/Users/kunal%20badgujar/Desktop/Projects/AILearningPlatform/AILearningPlatform/SARAS_AI_MASTER_BLUEPRINT.md) — Section 3

## 1. Objective
Establish the complete Neo-Brutalist / Editorial design system, theme tokens, color palette, typography, utility classes, and the interactive paper dot grid canvas background.

## 2. Deliverables & File Manifest
- [x] `tailwind.config.js` — Extended colors, fonts, shadows, borders
- [x] `app/globals.css` — Inter + Space Grotesk fonts, `.neo-card`, `.neo-btn-primary`, custom scrollbars
- [x] `components/background/InteractiveGridBackground.tsx` — Canvas dot grid with mouse proximity displacement and click ripple effect
- [x] `lib/utils.ts` — `cn` class merger helper, `extractYouTubeId`, `formatTime`, `getYouTubeThumbnail`

## 3. Design Tokens
- Canvas background: `#F5F3EC`
- Card background: `#FFFDF7`
- Ink borders & text: `#111218`
- Accent Neon Lime: `#B8FF3D`
- Sage, Sky, Lavender secondary tints
- Border width: `2px solid #111218`
- Box shadow: `3px 3px 0 #111218` (neo), `4px 4px 0 #111218` (neo-md), `8px 8px 0 #111218` (neo-xl)

## 4. Acceptance Criteria
1. Background displays subtle paper dot grid that gently displaces near pointer without lag.
2. Clicking empty background creates a smooth outward ripple; clicking interactive elements does not trigger unwanted ripples.
3. Typography renders Inter for body copy and Space Grotesk for headings and buttons.
4. Neo-brutalist buttons have crisp offset shadow hover and active pressed states.

## 5. Verification
```bash
npm run typecheck
```

## 6. Commit Checkpoint
```bash
git commit -m "feat(ui): implement neo-brutalist design tokens, typography, and interactive grid canvas"
```
