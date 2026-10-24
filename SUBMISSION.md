## SARAS AI: Learn any YouTube video, one chapter at a time

Long YouTube lessons are easy to watch and easy to forget. SARAS AI turns any YouTube link into a structured, active-learning course.

### How it works
1. **Paste a YouTube link.** The app fetches the transcript.
2. **Gemma 4 splits the video into 3-4 minute chapters**, cutting at natural topic breaks.
3. **Watch one chapter at a time.** The player is locked to the current chapter.
4. **Pass a short quiz to unlock the next chapter.** No skipping ahead.
5. **Every chapter gets its own study kit:** smart notes, flashcards, quiz questions, a mind map, and a flowchart.

### How we use Gemma 4
- **Local Gemma 4 (gemma4:e4b via Ollama):** notes, flashcards, quizzes, mind map and flowchart generation, and explaining uploaded slides or diagrams (multimodal). It runs on a normal 16 GB laptop with no GPU and no API key.
- **Gemma 4 through the Cloud API (gemma-4-26b-a4b-it):** chapter splitting, concept extraction, the Saras tutor chat, and exam planning.
- **Automatic fallback:** if one provider is slow or fails, the other takes over.
- Gemma returns structured JSON, and the app turns it into Mermaid mind maps and flowcharts that can be downloaded as SVG or PNG.

### More features
- Knowledge map of concepts and how they connect
- Exam mode with a day-by-day study plan
- AI revision sessions that target weak topics
- Deep Focus mode with private, on-device attention tracking
- Study streaks and an activity heatmap

### Why open models matter
Students shouldn't need paid APIs or send their study data to a third party. Because Gemma 4 is open, SARAS AI can run fully on a student's own laptop, and it makes personalised learning available to anyone.

### Tech stack
Next.js 14, Prisma + SQLite, Ollama, Gemma 4, Cloud AI API, Mermaid.js, YouTube IFrame API, MediaPipe

### Links
- **Live demo:** [https://sarasai.vercel.app](https://sarasai.vercel.app)
- **Source code:** [https://github.com/badgujarkunal93-blip/sarasai](https://github.com/badgujarkunal93-blip/sarasai)
