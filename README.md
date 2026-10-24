# Saras AI ✦

> **Learn. Recall. Understand.**  
> Transform any educational video or topic into an active, mastery-enforced learning environment with topic segmentation, checkpoint quiz gating, grounded flashcards, interactive concept knowledge graphs, visual flowcharts & mind maps, slide vision analysis, and privacy-first deep focus monitoring.

[![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.19-2D3748?logo=prisma)](https://www.prisma.io/)
[![Gemma 4](https://img.shields.io/badge/Gemma_4-Local_%2B_Cloud-B8FF3D)](https://ai.google.dev/gemma)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

---

## ⚡ Overview

**Saras AI** is an AI-powered active learning platform designed to replace passive video consumption with an enforced retrieval loop powered exclusively by **Gemma 4**:

- 🎬 **Smart Video Ingestion & Deduplication**: Paste any YouTube URL to extract chapters, transcripts, and core concepts. If a video has already been processed by any user, it loads instantly from cache without redundant LLM calls.
- ⚡ **Gemma 4 Unified AI Engine**: All AI calls run through a single client (`lib/llm.ts`) utilizing two providers with automatic retry (2x) and seamless failover:
  - **Local Provider**: Ollama at `OLLAMA_URL` (default `http://localhost:11434`), model `LLM_MODEL` (default `gemma4:e4b`), `POST /api/chat`, `stream:false`, `"think": false`, temperature 0.3, 5-minute timeout.
  - **Cloud Provider**: Gemini API using `GEMINI_API_KEY`, model `GEMMA_API_MODEL_NAME` (`gemma-4-26b-a4b-it`) with structured JSON output.
- 🧭 **Task Routing**:
  - **Local**: Segment notes, 5 active recall flashcards, checkpoint quizzes (4 questions with explanations), mind map JSON, flowchart JSON, slide image upload explanation.
  - **Cloud**: Splitting transcript into chapters, concept extraction for knowledge graph, Saras tutor co-pilot chat, exam planner explanations.
- 📊 **Visual Flowcharts & Mind Maps**: Gemma 4 outputs strict JSON definitions converted to Mermaid.js on the client with Download SVG/PNG buttons and graceful fallback rendering.
- 🖼️ **Slide & Note Vision Analysis**: Upload lecture slides or handwritten notes on the lesson page; Gemma 4 performs visual deconstruction and saves the result directly into that chapter's smart notes.
- ⏳ **Progressive Segment Generation**: Segment 1 is generated immediately so students can start learning without waiting; subsequent segments are generated sequentially in the background with skeleton loaders.
- 🔒 **Checkpoint Quiz Gating**: Enforces true understanding before allowing students to advance through subsequent video chapters using a custom seek-locked YouTube player.
- 🗺️ **2D Concept Knowledge Graph**: Relational map connecting prerequisites, categories, and concept dependencies across topics with real-time mastery scores (0–100%).
- 📅 **Adaptive Exam Mode**: Strategic daily study calendar planning engine taking your exam date and study minutes to pace high-yield revision and foundational learning.
- 🎯 **Deep Focus Workspace**: On-device privacy-first attention monitoring powered by client-side computer vision to pause playback on cognitive drift.

---

## 🎨 Design System

Saras AI is built with an **Editorial Neo-Brutalist** aesthetic:
- **Canvas Base**: `#F5F3EC` (Warm paper)
- **Surfaces**: `#FFFDF7` (Card white)
- **Ink**: `#111218` (Hard borders & headings)
- **Accent**: `#B8FF3D` (Electric neon lime)
- **Secondary**: Sage (`#DDF6BD`), Sky (`#DCEEFF`), Lavender (`#E9DFFF`)
- **Badge**: Every AI-generated component features a "Powered by Gemma 4 (local / cloud)" provenance badge.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14 (App Router)](https://nextjs.org/)
- **UI & Styling**: Tailwind CSS + Neo-Brutalist Custom Utilities
- **Database & ORM**: SQLite (development) / PostgreSQL (production) with [Prisma ORM](https://www.prisma.io/)
- **AI Inference Client**: Single unified `lib/llm.ts` driving Gemma 4 across:
  - Local Ollama (`gemma4:e4b`)
  - Cloud Gemini API (`gemma-4-26b-a4b-it`)
- **Diagrams**: Mermaid.js dynamic client rendering with SVG & high-res PNG export
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
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Set up your Gemma 4 providers in `.env`:
```env
DATABASE_URL="file:./dev.db"

# Local Ollama Provider (Runs Gemma 4 locally)
OLLAMA_URL="http://localhost:11434"
LLM_MODEL="gemma4:e4b"

# Cloud Gemini Provider (Calls Gemma 4 via Gemini API)
GEMINI_API_KEY="your_gemini_api_key_here"
GEMMA_API_MODEL_NAME="gemma-4-26b-a4b-it"
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

# Production build verification
npm run build
```
