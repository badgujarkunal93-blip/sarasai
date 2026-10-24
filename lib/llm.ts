import { z } from 'zod';

export type TaskType =
  | 'segment_notes'
  | 'flashcards'
  | 'quiz'
  | 'mindmap'
  | 'flowchart'
  | 'image_explanation'
  | 'split_transcript'
  | 'concept_extraction'
  | 'tutor_chat'
  | 'exam_planner';

export type ProviderType = 'local' | 'cloud';

export interface LLMResult<T> {
  data: T;
  provider: ProviderType;
  model: string;
}

export const MANDATORY_PLAIN_TEXT_RULE =
  'Use plain text only. No LaTeX, no $ symbols. Write formulas like H2O and CO2.';

/**
 * Task routing according to requirement 2:
 * - local: segment notes, flashcards (5), quiz (4 questions with explanations),
 *          mind map JSON, flowchart JSON, image upload explanation.
 * - cloud: splitting the transcript into chapters, concept extraction for the knowledge graph,
 *          the Saras tutor chat, exam planner explanations.
 */
export function getPrimaryProviderForTask(task: TaskType): ProviderType {
  switch (task) {
    case 'segment_notes':
    case 'flashcards':
    case 'quiz':
    case 'mindmap':
    case 'flowchart':
    case 'image_explanation':
      return 'local';

    case 'split_transcript':
    case 'concept_extraction':
    case 'tutor_chat':
    case 'exam_planner':
    default:
      return 'cloud';
  }
}

/**
 * Local Ollama configuration
 */
export function getLocalConfig() {
  return {
    url: (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/+$/, ''),
    model: process.env.LLM_MODEL || 'gemma4:e4b',
    timeoutMs: 300000, // 5 minute timeout
  };
}

/**
 * Cloud Gemini configuration
 */
export function getCloudConfig() {
  return {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMMA_API_MODEL_NAME || 'gemma-4-26b-a4b-it',
    timeoutMs: 300000, // 5 minute timeout
  };
}

/**
 * Calls local Ollama at OLLAMA_URL
 */
async function callLocalOllama(
  prompt: string,
  schema: any,
  systemPrompt?: string,
  imagesBase64?: string[]
): Promise<string> {
  const cfg = getLocalConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

  try {
    const messages: Array<{ role: string; content: string; images?: string[] }> = [];

    const fullSystem = [systemPrompt, MANDATORY_PLAIN_TEXT_RULE].filter(Boolean).join('\n\n');
    if (fullSystem) {
      messages.push({ role: 'system', content: fullSystem });
    }

    const userMsg: { role: string; content: string; images?: string[] } = {
      role: 'user',
      content: `${prompt}\n\nIMPORTANT: ${MANDATORY_PLAIN_TEXT_RULE}`,
    };
    if (imagesBase64 && imagesBase64.length > 0) {
      userMsg.images = imagesBase64;
    }
    messages.push(userMsg);

    const body: Record<string, any> = {
      model: cfg.model,
      messages,
      stream: false,
      think: false,
      options: {
        temperature: 0.3,
      },
    };

    if (schema) {
      body.format = schema;
    }

    const res = await fetch(`${cfg.url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const content = data?.message?.content;
    if (!content) {
      throw new Error('Ollama returned empty response content.');
    }
    return content;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Calls Cloud Gemini API using GEMINI_API_KEY
 */
async function callCloudGemini(
  prompt: string,
  schema: any,
  systemPrompt?: string,
  image?: { base64: string; mimeType: string }
): Promise<string> {
  const cfg = getCloudConfig();
  if (!cfg.apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      cfg.model
    )}:generateContent?key=${cfg.apiKey}`;

    const parts: any[] = [];
    const fullPrompt = [
      systemPrompt ? `SYSTEM INSTRUCTIONS:\n${systemPrompt}` : null,
      `USER REQUEST:\n${prompt}`,
      `STRICT FORMATTING RULE: ${MANDATORY_PLAIN_TEXT_RULE}`,
      schema ? `YOU MUST RETURN VALID JSON MATCHING THIS SCHEMA ONLY:\n${JSON.stringify(schema)}` : null,
    ]
      .filter(Boolean)
      .join('\n\n');

    if (image?.base64) {
      parts.push({
        inline_data: {
          mime_type: image.mimeType || 'image/png',
          data: image.base64.replace(/^data:[^;]+;base64,/, ''),
        },
      });
    }

    parts.push({ text: fullPrompt });

    const body: any = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini Cloud error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Gemini Cloud returned empty response.');
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Strips markdown code blocks and extracts raw JSON string
 */
export function extractJSONString(raw: string): string {
  let cleaned = raw.trim();

  // Strip ```json ... ``` or ``` ... ```
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  // If there is preamble text before the first '{' or '[', slice from there
  const firstBrace = cleaned.search(/[\{\[]/);
  const lastBrace = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

export interface GenOptions {
  systemPrompt?: string;
  image?: { base64: string; mimeType: string };
  preferredProvider?: ProviderType;
}

/**
 * Primary Unified AI Generation Function:
 * - Picks provider by task ('local' vs 'cloud')
 * - Validates output with Zod (or custom zodParse function)
 * - Retries twice on errors
 * - Automatically falls back to the other provider on timeout or failure
 */
export async function genJSON<T>(
  task: TaskType,
  prompt: string,
  schema: any,
  zodParse?: ((raw: any) => T) | z.ZodType<T>,
  options: GenOptions = {}
): Promise<LLMResult<T>> {
  const primaryProvider = options.preferredProvider || getPrimaryProviderForTask(task);
  const secondaryProvider: ProviderType = primaryProvider === 'local' ? 'cloud' : 'local';

  const providersToAttempt: ProviderType[] = [primaryProvider, secondaryProvider];
  let lastError: Error | null = null;

  for (const provider of providersToAttempt) {
    const isLocal = provider === 'local';
    const modelName = isLocal ? getLocalConfig().model : getCloudConfig().model;

    // Retry up to 2 times (3 total attempts per provider)
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(
          `[LLM] Task="${task}" Provider="${provider}" Model="${modelName}" (Attempt ${attempt}/3)`
        );

        let rawResponse: string;
        if (isLocal) {
          const images = options.image?.base64
            ? [options.image.base64.replace(/^data:[^;]+;base64,/, '')]
            : undefined;
          rawResponse = await callLocalOllama(
            prompt,
            schema,
            options.systemPrompt,
            images
          );
        } else {
          rawResponse = await callCloudGemini(
            prompt,
            schema,
            options.systemPrompt,
            options.image
          );
        }

        const jsonStr = extractJSONString(rawResponse);
        const parsed = JSON.parse(jsonStr);

        let validatedData: T;
        if (zodParse) {
          if ('parse' in (zodParse as any)) {
            validatedData = (zodParse as z.ZodType<T>).parse(parsed);
          } else {
            validatedData = (zodParse as (raw: any) => T)(parsed);
          }
        } else {
          validatedData = parsed as T;
        }

        return {
          data: validatedData,
          provider,
          model: modelName,
        };
      } catch (err: any) {
        lastError = err;
        console.warn(
          `[LLM WARNING] Task="${task}" Provider="${provider}" Attempt ${attempt}/3 failed:`,
          err.message || err
        );
        // Small backoff before retry
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 600));
        }
      }
    }

    console.warn(
      `[LLM FAILOVER] Provider "${provider}" exhausted all retries for task "${task}". Falling back to "${secondaryProvider}"...`
    );
  }

  throw (
    lastError ||
    new Error(`All LLM providers (local and cloud) failed for task: ${task}`)
  );
}

/**
 * Text chat generation with Gemma
 */
export async function genChatReply(
  userPrompt: string,
  history: Array<{ role: string; content: string }>,
  systemContext?: string
): Promise<{ reply: string; provider: ProviderType; model: string }> {
  const schema = {
    type: 'object',
    properties: {
      reply: {
        type: 'string',
        description: 'Plain text reply addressing the student question. No LaTeX, no $ symbols.',
      },
      suggested_topics: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    required: ['reply'],
  };

  const zodChat = z.object({
    reply: z.string(),
    suggested_topics: z.array(z.string()).optional(),
  });

  const historyText = history
    .slice(-6)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n');

  const prompt = `CONVERSATION HISTORY:\n${historyText}\n\nSTUDENT: ${userPrompt}\n\nRespond as Saras AI tutor. Follow this rule: ${MANDATORY_PLAIN_TEXT_RULE}`;

  const res = await genJSON(
    'tutor_chat',
    prompt,
    schema,
    zodChat,
    { systemPrompt: systemContext }
  );

  return {
    reply: res.data.reply,
    provider: res.provider,
    model: res.model,
  };
}
