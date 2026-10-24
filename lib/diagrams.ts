import { z } from 'zod';

export interface FlowchartNode {
  id: string;
  label: string;
}

export interface FlowchartEdge {
  from: string;
  to: string;
  label?: string;
}

export interface FlowchartJSON {
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
}

export interface MindMapNode {
  topic: string;
  children?: MindMapNode[];
}

export interface MindMapJSON {
  topic: string;
  children?: MindMapNode[];
}

export const FlowchartZodSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
    })
  ),
  edges: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      label: z.string().optional(),
    })
  ),
});

export const MindMapZodSchema: z.ZodType<MindMapJSON> = z.lazy(() =>
  z.object({
    topic: z
      .any()
      .optional()
      .transform((val) => {
        if (typeof val === 'string' && val.trim()) return val.trim();
        if (val && typeof val === 'object') {
          return val.topic || val.title || val.name || val.label || 'Key Concept';
        }
        return 'Key Concept';
      }),
    children: z.array(MindMapZodSchema).optional().default([]),
  })
);

/**
 * Sanitizes labels so they do not break Mermaid syntax.
 * Removes quotes, brackets, angle brackets, LaTeX, and special delimiters.
 */
export function sanitizeMermaidLabel(raw: string): string {
  if (!raw) return 'Concept';
  return raw
    .replace(/["'`]/g, "'")
    .replace(/[<>{}\[\]\(\)]/g, ' ')
    .replace(/[$]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

export function sanitizeMermaidId(raw: string, fallbackIndex: number): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned || /^[0-9]/.test(cleaned)) {
    return `node_${fallbackIndex}`;
  }
  return cleaned;
}

/**
 * Converts a structured Flowchart JSON into a Mermaid graph definition
 */
export function convertFlowchartToMermaid(json: FlowchartJSON): string {
  if (!json || !Array.isArray(json.nodes) || json.nodes.length === 0) {
    return 'graph TD\n  empty["No process flowchart available"]';
  }

  const lines: string[] = ['graph TD'];
  const idMap = new Map<string, string>();

  // Declare nodes
  json.nodes.forEach((n, idx) => {
    const validId = sanitizeMermaidId(n.id, idx);
    idMap.set(n.id, validId);
    const label = sanitizeMermaidLabel(n.label || `Step ${idx + 1}`);
    lines.push(`  ${validId}["${label}"]`);
  });

  // Declare edges
  if (Array.isArray(json.edges)) {
    json.edges.forEach((e) => {
      const fromId = idMap.get(e.from) || sanitizeMermaidId(e.from, 0);
      const toId = idMap.get(e.to) || sanitizeMermaidId(e.to, 1);
      if (fromId && toId && fromId !== toId) {
        if (e.label && e.label.trim()) {
          const edgeLabel = sanitizeMermaidLabel(e.label);
          lines.push(`  ${fromId} -->|"${edgeLabel}"| ${toId}`);
        } else {
          lines.push(`  ${fromId} --> ${toId}`);
        }
      }
    });
  }

  return lines.join('\n');
}

/**
 * Converts a structured Mind Map JSON into a Mermaid mindmap definition
 */
export function convertMindMapToMermaid(json: MindMapJSON): string {
  if (!json || !json.topic) {
    return 'mindmap\n  root((Topic Overview))';
  }

  const lines: string[] = ['mindmap'];
  const rootTopic = sanitizeMermaidLabel(json.topic);
  lines.push(`  root(("${rootTopic}"))`);

  function appendChildren(nodes: MindMapNode[], depth: number) {
    const indent = '  '.repeat(depth);
    for (const node of nodes) {
      if (!node.topic) continue;
      const cleanTopic = sanitizeMermaidLabel(node.topic);
      lines.push(`${indent}${cleanTopic}`);
      if (Array.isArray(node.children) && node.children.length > 0) {
        appendChildren(node.children, depth + 1);
      }
    }
  }

  if (Array.isArray(json.children) && json.children.length > 0) {
    appendChildren(json.children, 2);
  }

  return lines.join('\n');
}
