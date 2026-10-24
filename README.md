# Saras AI ✦

> **Learn. Recall. Understand.**  
> Transform any educational video or topic into an active, mastery-enforced learning environment with topic segmentation, checkpoint quiz gating, grounded flashcards, interactive concept knowledge graphs, and privacy-first deep focus monitoring.

[![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.19-2D3748?logo=prisma)](https://www.prisma.io/)
[![Groq Cloud](https://img.shields.io/badge/Groq-LPU_Inference-F05A28)](https://console.groq.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

---

## ⚡ Overview

**Saras AI** is an AI-powered active learning platform designed to replace passive video consumption with an enforced retrieval loop:

- 🎬 **Smart Video Ingestion & Deduplication**: Paste any YouTube URL to extract chapters, transcripts, and core concepts. If a video has already been processed by any user, it loads instantly from cache without redundant LLM calls.
- 🔒 **Checkpoint Quiz Gating**: Enforces true understanding before allowing students to advance through subsequent video chapters using a custom seek-locked YouTube player.
- 🃏 **Grounded Flashcards & Active Recall**: Automatically extracts flashcards directly tied to video transcript definitions with spaced repetition actions.
- 🗺️ **2D Concept Knowledge Graph**: Relational map connecting prerequisites, categories, and concept dependencies across topics with real-time mastery scores (0–100%).
- 📅 **Adaptive Exam Mode**: Deterministic daily study calendar planning engine taking your exam date and study minutes to schedule high-yield revision and foundational learning.
- 🎯 **Deep Focus Workspace**: On-device privacy-first attention monitoring powered by client-side computer vision to pause playback on cognitive drift.
- 🤖 **Saras AI Companion**: Context-aware AI tutor drawer referencing active video chapters, transcripts, and weak concepts.
- 📈 **Personal Learning History & Streaks**: Automatically tracks progress, completed lessons, and study streaks with zero cross-user data leakage.

---

## 🎨 Design System

Saras AI is built with an **Editorial Neo-Brutalist** aesthetic:
- **Canvas Base**: `#F5F3EC` (Warm paper)
- **Surfaces**: `#FFFDF7` (Card white)
- **Ink**: `#111218` (Hard borders & headings)
- **Accent**: `#B8FF3D` (Electric neon lime)
- **Secondary**: Sage (`#DDF6BD`), Sky (`#DCEEFF`), Lavender (`#E9DFFF`)
- **Interactive Grid Canvas**: A subtle paper-dot grid background that reacts to pointer proximity and ripples on background clicks.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14 (App Router)](https://nextjs.org/)
- **UI & Styling**: Tailwind CSS + Neo-Brutalist Custom Utilities
- **Database & ORM**: SQLite (development) / PostgreSQL (production) with [Prisma ORM](https://www.prisma.io/)
- **AI Inference Engine**: [Groq Cloud API](https://console.groq.com/) (`qwen/qwen3.8-27b`, `openai/gpt-oss-120b`, `llama-3.3-70b-versatile`) with dynamic fallback
- **Video & Player**: YouTube IFrame API with custom seek-lock boundary enforcement
- **Vision / Attention**: Client-side MediaPipe WebAssembly Face Attention Tracking
- **Icons**: Lucide React
- **Animations**: Framer Motion

---

## 🚀 Quick Start

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/badgujarkunal93-blip/saras-ai-.git
cd saras-ai-
npm install
```

### 2. Configure Environment Variables
Copy the `.env.example` template:
```bash
cp .env.example .env
```

Add your free Groq API key in `.env`:
```env
DATABASE_URL="file:./dev.db"
GROQ_API_KEY="your_groq_api_key_here"
```

### 3. Initialize Database & Seed Lessons
```bash
npx prisma db push
npm run seed
```

### 4. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Verification & Audit Suites

Run all built-in test suites to verify system behavior:

```bash
# Typecheck
npm run typecheck

# Knowledge Graph Non-Overlap Physics Test
npx tsx scripts/test_knowledge_layout.ts

# Adaptive Exam Mode Prerequisite Test
npx tsx scripts/test_exam_mode.ts

# Chatbot Grounding & Hardening Audit
npx tsx scripts/test_chatbot_hardening.ts

# Comprehensive 30-Point Truthfulness Audit
npx tsx scripts/test_master_truthfulness_audit.ts
```

---

## 📜 Documentation

- Master Architectural Spec: [`SARAS_AI_MASTER_BLUEPRINT.md`](./SARAS_AI_MASTER_BLUEPRINT.md)
- Modular Build Roadmap: [`phases/ROADMAP.md`](./phases/ROADMAP.md)

---

## ⚖️ License
MIT License. Built for active learning & mastery.
