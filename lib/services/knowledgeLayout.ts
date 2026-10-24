import { MasteryState } from './ai';

export interface LayoutNode {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  category: string;
  mastery_score: number;
  mastery_state: MasteryState;
  exposure_count: number;
  correct_count: number;
  wrong_count: number;
  last_seen_at: string;
  source_videos: {
    id: string;
    title: string;
    channel: string;
    youtube_video_id: string;
    segment_title?: string;
    start_seconds?: number;
  }[];
  flashcards_count: number;
  quiz_count: number;
  // Computed layout attributes
  x: number;
  y: number;
  width: number;
  height: number;
  clusterId: string;
  level: number;
}

export interface LayoutEdge {
  id: string;
  source: string;
  target: string;
  type: string; // 'prerequisite' | 'related' | 'part_of' | 'subtopic'
  weight?: number;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  pathD: string;
}

export interface ClusterRegion {
  id: string;
  category: string;
  x: number;
  y: number;
  width: number;
  height: number;
  nodeCount: number;
  colorBg: string;
  colorBorder: string;
  colorAccent: string;
}

export interface GraphLayoutResult {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  clusters: ClusterRegion[];
  canvasWidth: number;
  canvasHeight: number;
  centerX: number;
  centerY: number;
}

const NODE_WIDTH = 200;
const NODE_HEIGHT = 86;
const NODE_GAP_X = 36;
const LEVEL_GAP_Y = 76;
const CLUSTER_PADDING = 32;
const CLUSTER_HEADER_HEIGHT = 56;
const CLUSTER_GAP_X = 64;
const CLUSTER_GAP_Y = 64;

// Palette for subtle cluster boundary tints
const CLUSTER_THEMES = [
  { bg: 'rgba(233, 223, 255, 0.28)', border: '#111218', accent: '#7C3AED' }, // Lavender (ML)
  { bg: 'rgba(184, 255, 61, 0.22)', border: '#111218', accent: '#4D7C0F' },  // Lime (CS)
  { bg: 'rgba(220, 238, 255, 0.35)', border: '#111218', accent: '#0369A1' }, // Sky (Web)
  { bg: 'rgba(255, 227, 83, 0.25)', border: '#111218', accent: '#B45309' },  // Amber (Math)
  { bg: 'rgba(255, 209, 199, 0.30)', border: '#111218', accent: '#BE123C' }, // Coral (Software)
];

/**
 * Computes a deterministic, hierarchical, domain-clustered layout for the Knowledge Graph.
 * Ensures:
 * 1. Zero node overlap
 * 2. Clear domain cluster bounding regions
 * 3. Topological prerequisite flow from Top to Bottom
 * 4. Clean curved Bezier edge paths
 */
export function computeKnowledgeLayout(
  nodes: any[],
  edges: any[],
  selectedCategory?: string
): GraphLayoutResult {
  if (!nodes || nodes.length === 0) {
    return {
      nodes: [],
      edges: [],
      clusters: [],
      canvasWidth: 800,
      canvasHeight: 600,
      centerX: 400,
      centerY: 300,
    };
  }

  // 1. Filter by category if specific focus topic selected
  const activeNodes =
    selectedCategory && selectedCategory !== 'All Topics'
      ? nodes.filter((n) => n.category === selectedCategory)
      : nodes;

  const activeNodeIds = new Set(activeNodes.map((n) => n.id));
  const activeEdges = edges.filter(
    (e) => activeNodeIds.has(e.source) && activeNodeIds.has(e.target)
  );

  // 2. Group nodes by Domain Category
  const categoryMap = new Map<string, any[]>();
  activeNodes.forEach((node) => {
    const cat = node.category || 'General';
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat)!.push(node);
  });

  const categories = Array.from(categoryMap.keys()).sort();

  const layoutNodes: LayoutNode[] = [];
  const clusters: ClusterRegion[] = [];

  // Determine grid layout for clusters (e.g. 2 clusters per row on desktop)
  const clustersPerRow = categories.length >= 4 ? 2 : Math.max(1, categories.length);
  
  let currentClusterX = CLUSTER_PADDING;
  let currentClusterY = CLUSTER_PADDING;
  let maxRowHeight = 0;
  let totalCanvasWidth = 0;
  let totalCanvasHeight = 0;

  let clusterIndex = 0;
  const clusterRowHeights: number[] = [];

  // Pre-calculate cluster dimensions to lay them out cleanly in an editorial grid
  const clusterLayouts = categories.map((cat, idx) => {
    const catNodes = categoryMap.get(cat)!;
    const catNodeIds = new Set(catNodes.map((n) => n.id));

    // Build intra-cluster in-degree map for topological layering
    const inDegreeMap = new Map<string, number>();
    const outgoingMap = new Map<string, string[]>();
    catNodes.forEach((n) => {
      inDegreeMap.set(n.id, 0);
      outgoingMap.set(n.id, []);
    });

    activeEdges.forEach((e) => {
      if (catNodeIds.has(e.source) && catNodeIds.has(e.target)) {
        inDegreeMap.set(e.target, (inDegreeMap.get(e.target) || 0) + 1);
        outgoingMap.get(e.source)?.push(e.target);
      }
    });

    // Assign layered topological levels (Level 0: roots/foundations -> Level 1 -> Level 2...)
    const levelMap = new Map<string, number>();
    const roots = catNodes.filter((n) => (inDegreeMap.get(n.id) || 0) === 0);

    const queue: { id: string; level: number }[] = [];
    roots.forEach((r) => {
      levelMap.set(r.id, 0);
      queue.push({ id: r.id, level: 0 });
    });

    // BFS to assign hierarchy levels safely with cycle protection
    const visited = new Set<string>();
    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);

      const children = outgoingMap.get(id) || [];
      for (const childId of children) {
        if (!visited.has(childId)) {
          const nextLevel = Math.min(level + 1, 4);
          if (!levelMap.has(childId) || levelMap.get(childId)! < nextLevel) {
            levelMap.set(childId, nextLevel);
            queue.push({ id: childId, level: nextLevel });
          }
        }
      }
    }

    // Fallback for unvisited nodes
    catNodes.forEach((n, i) => {
      if (!levelMap.has(n.id)) {
        levelMap.set(n.id, i % 2);
      }
    });

    // Group nodes by level within this cluster
    const levelsGroup: Map<number, any[]> = new Map();
    catNodes.forEach((n) => {
      const lvl = levelMap.get(n.id) || 0;
      if (!levelsGroup.has(lvl)) levelsGroup.set(lvl, []);
      levelsGroup.get(lvl)!.push(n);
    });

    const sortedLevels = Array.from(levelsGroup.keys()).sort((a, b) => a - b);
    const maxNodesInLevel = Math.max(...sortedLevels.map((lvl) => levelsGroup.get(lvl)!.length), 1);
    const numLevels = sortedLevels.length;

    const clusterWidth = Math.max(
      320,
      CLUSTER_PADDING * 2 + maxNodesInLevel * NODE_WIDTH + (maxNodesInLevel - 1) * NODE_GAP_X
    );
    const clusterHeight =
      CLUSTER_HEADER_HEIGHT +
      CLUSTER_PADDING * 2 +
      numLevels * NODE_HEIGHT +
      Math.max(0, numLevels - 1) * LEVEL_GAP_Y;

    return {
      cat,
      catNodes,
      levelsGroup,
      sortedLevels,
      clusterWidth,
      clusterHeight,
      theme: CLUSTER_THEMES[idx % CLUSTER_THEMES.length],
    };
  });

  // Position clusters in 2-column or 1-column layout
  let currentX = CLUSTER_PADDING;
  let currentY = CLUSTER_PADDING;
  let rowMaxHeight = 0;
  let colIndex = 0;

  clusterLayouts.forEach((cLayout, cIdx) => {
    // If starting a new row
    if (colIndex >= clustersPerRow) {
      currentX = CLUSTER_PADDING;
      currentY += rowMaxHeight + CLUSTER_GAP_Y;
      rowMaxHeight = 0;
      colIndex = 0;
    }

    const clusterX = currentX;
    const clusterY = currentY;

    // Create Cluster Region Box
    clusters.push({
      id: `cluster-${cIdx}`,
      category: cLayout.cat,
      x: clusterX,
      y: clusterY,
      width: cLayout.clusterWidth,
      height: cLayout.clusterHeight,
      nodeCount: cLayout.catNodes.length,
      colorBg: cLayout.theme.bg,
      colorBorder: cLayout.theme.border,
      colorAccent: cLayout.theme.accent,
    });

    // Position each node inside its level in this cluster
    cLayout.sortedLevels.forEach((levelIndex, lIdx) => {
      const nodesAtLevel = cLayout.levelsGroup.get(levelIndex)!;
      const levelWidth =
        nodesAtLevel.length * NODE_WIDTH + (nodesAtLevel.length - 1) * NODE_GAP_X;
      
      // Center-align nodes at this level relative to cluster width
      const levelStartX = clusterX + (cLayout.clusterWidth - levelWidth) / 2;
      const levelY =
        clusterY +
        CLUSTER_HEADER_HEIGHT +
        CLUSTER_PADDING +
        lIdx * (NODE_HEIGHT + LEVEL_GAP_Y);

      nodesAtLevel.forEach((node, nIdx) => {
        const nodeX = levelStartX + nIdx * (NODE_WIDTH + NODE_GAP_X);
        layoutNodes.push({
          ...node,
          x: nodeX,
          y: levelY,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          clusterId: `cluster-${cIdx}`,
          level: levelIndex,
        });
      });
    });

    currentX += cLayout.clusterWidth + CLUSTER_GAP_X;
    rowMaxHeight = Math.max(rowMaxHeight, cLayout.clusterHeight);
    totalCanvasWidth = Math.max(totalCanvasWidth, currentX);
    totalCanvasHeight = Math.max(totalCanvasHeight, currentY + cLayout.clusterHeight + CLUSTER_PADDING);
    colIndex++;
  });

  totalCanvasWidth += CLUSTER_PADDING;
  totalCanvasHeight += CLUSTER_PADDING;

  // 3. Compute Node Maps for fast edge coordinate calculation
  const nodeMap = new Map<string, LayoutNode>();
  layoutNodes.forEach((n) => nodeMap.set(n.id, n));

  // 4. Calculate Edge Coordinates and Curved Cubic Bezier Paths
  const layoutEdges: LayoutEdge[] = [];
  activeEdges.forEach((edge) => {
    const src = nodeMap.get(edge.source);
    const tgt = nodeMap.get(edge.target);
    if (!src || !tgt) return;

    // Anchor points:
    // Source: Bottom-center (if target is below) or Right-center
    // Target: Top-center (if source is above) or Left-center
    const isSameCluster = src.clusterId === tgt.clusterId;
    const isVertical = Math.abs(tgt.y - src.y) > 40;

    let sourceX: number;
    let sourceY: number;
    let targetX: number;
    let targetY: number;

    if (isVertical) {
      if (tgt.y > src.y) {
        // Target is below source
        sourceX = src.x + src.width / 2;
        sourceY = src.y + src.height;
        targetX = tgt.x + tgt.width / 2;
        targetY = tgt.y;
      } else {
        // Target is above source
        sourceX = src.x + src.width / 2;
        sourceY = src.y;
        targetX = tgt.x + tgt.width / 2;
        targetY = tgt.y + tgt.height;
      }
    } else {
      if (tgt.x > src.x) {
        // Target is to the right
        sourceX = src.x + src.width;
        sourceY = src.y + src.height / 2;
        targetX = tgt.x;
        targetY = tgt.y + tgt.height / 2;
      } else {
        // Target is to the left
        sourceX = src.x;
        sourceY = src.y + src.height / 2;
        targetX = tgt.x + tgt.width;
        targetY = tgt.y + tgt.height / 2;
      }
    }

    // Build smooth cubic Bezier curve path
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    
    let pathD: string;
    if (isVertical) {
      const cY1 = sourceY + dy * 0.45;
      const cY2 = targetY - dy * 0.45;
      pathD = `M ${sourceX} ${sourceY} C ${sourceX} ${cY1}, ${targetX} ${cY2}, ${targetX} ${targetY}`;
    } else {
      const cX1 = sourceX + dx * 0.45;
      const cX2 = targetX - dx * 0.45;
      pathD = `M ${sourceX} ${sourceY} C ${cX1} ${sourceY}, ${cX2} ${targetY}, ${targetX} ${targetY}`;
    }

    layoutEdges.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type || 'prerequisite',
      weight: edge.weight,
      sourceX,
      sourceY,
      targetX,
      targetY,
      pathD,
    });
  });

  return {
    nodes: layoutNodes,
    edges: layoutEdges,
    clusters,
    canvasWidth: Math.max(1000, totalCanvasWidth),
    canvasHeight: Math.max(700, totalCanvasHeight),
    centerX: totalCanvasWidth / 2,
    centerY: totalCanvasHeight / 2,
  };
}
