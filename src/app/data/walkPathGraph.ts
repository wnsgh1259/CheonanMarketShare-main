import type { MarketId } from "../components/CartContext";
import { loadSharedOwnerDraftById, saveSharedOwnerDraftById } from "./ownerSharedStore";

export type WalkNodeType = "junction" | "entrance" | "store_front";

export type WalkNode = {
  id: string;
  lat: number;
  lng: number;
  type: WalkNodeType;
  /** store_front 일 때 연결 상점 */
  storeId?: number;
  label?: string;
};

export type WalkEdge = {
  id: string;
  from: string;
  to: string;
};

export type WalkPathGraph = {
  marketId: MarketId;
  nodes: WalkNode[];
  edges: WalkEdge[];
  updatedAt: string;
  /** 자동 시드면 true — 서버에 수동 저장본이 있으면 시드를 덮어쓰지 않음 */
  isSeed?: boolean;
};

const LOCAL_KEY_PREFIX = "walk-path-graph-v2:";

function remoteId(marketId: MarketId) {
  return `walk_path_${marketId}`;
}

function localKey(marketId: MarketId) {
  return `${LOCAL_KEY_PREFIX}${marketId}`;
}

export function emptyWalkPathGraph(marketId: MarketId): WalkPathGraph {
  return {
    marketId,
    nodes: [],
    edges: [],
    updatedAt: new Date().toISOString(),
  };
}

export function createWalkNodeId() {
  return `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createWalkEdgeId() {
  return `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Haversine distance in metres */
export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function edgeLengthMeters(graph: WalkPathGraph, edge: WalkEdge): number {
  const from = graph.nodes.find((n) => n.id === edge.from);
  const to = graph.nodes.find((n) => n.id === edge.to);
  if (!from || !to) return 0;
  return haversineMeters(from, to);
}

export function findNearestNode(
  graph: WalkPathGraph,
  lat: number,
  lng: number,
  opts?: { excludeIds?: Set<string>; maxMeters?: number },
): { node: WalkNode; meters: number } | null {
  let best: { node: WalkNode; meters: number } | null = null;
  for (const node of graph.nodes) {
    if (opts?.excludeIds?.has(node.id)) continue;
    const meters = haversineMeters(node, { lat, lng });
    if (opts?.maxMeters != null && meters > opts.maxMeters) continue;
    if (!best || meters < best.meters) best = { node, meters };
  }
  return best;
}

/** 상점 좌표를 그래프에 붙일 때 사용. 기존 store_front가 있으면 위치만 갱신. */
export function upsertStoreFrontNode(
  graph: WalkPathGraph,
  storeId: number,
  lat: number,
  lng: number,
  opts?: { label?: string; autoConnectMaxMeters?: number },
): WalkPathGraph {
  const autoMax = opts?.autoConnectMaxMeters ?? 40;
  const existing = graph.nodes.find((n) => n.type === "store_front" && n.storeId === storeId);
  let nodes: WalkNode[];
  let storeNodeId: string;

  if (existing) {
    storeNodeId = existing.id;
    nodes = graph.nodes.map((n) =>
      n.id === existing.id
        ? { ...n, lat, lng, label: opts?.label ?? n.label }
        : n,
    );
  } else {
    storeNodeId = createWalkNodeId();
    nodes = [
      ...graph.nodes,
      {
        id: storeNodeId,
        lat,
        lng,
        type: "store_front",
        storeId,
        label: opts?.label,
      },
    ];
  }

  let edges = [...graph.edges];
  const alreadyLinked = edges.some(
    (e) => e.from === storeNodeId || e.to === storeNodeId,
  );
  if (!alreadyLinked) {
    const nearest = findNearestNode(
      { ...graph, nodes },
      lat,
      lng,
      { excludeIds: new Set([storeNodeId]), maxMeters: autoMax },
    );
    if (nearest) {
      const dup = edges.some(
        (e) =>
          (e.from === storeNodeId && e.to === nearest.node.id) ||
          (e.to === storeNodeId && e.from === nearest.node.id),
      );
      if (!dup) {
        edges.push({
          id: createWalkEdgeId(),
          from: storeNodeId,
          to: nearest.node.id,
        });
      }
    }
  }

  return {
    ...graph,
    nodes,
    edges,
    updatedAt: new Date().toISOString(),
  };
}

export function removeNode(graph: WalkPathGraph, nodeId: string): WalkPathGraph {
  return {
    ...graph,
    nodes: graph.nodes.filter((n) => n.id !== nodeId),
    edges: graph.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
    updatedAt: new Date().toISOString(),
  };
}

export function removeEdge(graph: WalkPathGraph, edgeId: string): WalkPathGraph {
  return {
    ...graph,
    edges: graph.edges.filter((e) => e.id !== edgeId),
    updatedAt: new Date().toISOString(),
  };
}

export function addEdgeBetween(
  graph: WalkPathGraph,
  fromId: string,
  toId: string,
): WalkPathGraph {
  if (fromId === toId) return graph;
  const exists = graph.edges.some(
    (e) =>
      (e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId),
  );
  if (exists) return graph;
  return {
    ...graph,
    edges: [...graph.edges, { id: createWalkEdgeId(), from: fromId, to: toId }],
    updatedAt: new Date().toISOString(),
  };
}

function normalizeGraph(marketId: MarketId, raw: unknown): WalkPathGraph | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Partial<WalkPathGraph>;
  if (!Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) return null;
  return {
    marketId,
    nodes: obj.nodes.filter(
      (n): n is WalkNode =>
        !!n &&
        typeof n.id === "string" &&
        typeof n.lat === "number" &&
        typeof n.lng === "number" &&
        (n.type === "junction" || n.type === "entrance" || n.type === "store_front"),
    ),
    edges: obj.edges.filter(
      (e): e is WalkEdge =>
        !!e &&
        typeof e.id === "string" &&
        typeof e.from === "string" &&
        typeof e.to === "string",
    ),
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : new Date().toISOString(),
    isSeed: obj.isSeed === true,
  };
}

export function loadWalkPathGraphLocal(marketId: MarketId): WalkPathGraph {
  try {
    const raw = localStorage.getItem(localKey(marketId));
    if (!raw) return emptyWalkPathGraph(marketId);
    const parsed = normalizeGraph(marketId, JSON.parse(raw));
    return parsed ?? emptyWalkPathGraph(marketId);
  } catch {
    return emptyWalkPathGraph(marketId);
  }
}

/** localStorage 키가 아예 없을 때만 true (빈 그래프 저장과는 구분) */
export function hasWalkPathLocalKey(marketId: MarketId): boolean {
  return localStorage.getItem(localKey(marketId)) != null;
}

export function saveWalkPathGraphLocal(graph: WalkPathGraph) {
  const next = { ...graph, updatedAt: new Date().toISOString() };
  localStorage.setItem(localKey(graph.marketId), JSON.stringify(next));
  return next;
}

export async function loadWalkPathGraph(marketId: MarketId): Promise<WalkPathGraph> {
  const local = loadWalkPathGraphLocal(marketId);
  try {
    const remote = await loadSharedOwnerDraftById(remoteId(marketId));
    const remoteGraph = normalizeGraph(marketId, remote);
    if (!remoteGraph) return local;

    const remoteHasData = remoteGraph.nodes.length > 0 || remoteGraph.edges.length > 0;
    const localEmpty = !local.nodes.length && !local.edges.length;
    const localIsSeed = local.isSeed === true;
    const remoteNewer =
      (Date.parse(remoteGraph.updatedAt) || 0) > (Date.parse(local.updatedAt) || 0);

    // 서버 데이터가 있고, 로컬이 비었거나 시드이거나 서버가 더 최신이면 서버 사용
    if (remoteHasData && (localEmpty || localIsSeed || remoteNewer)) {
      const cleaned = { ...remoteGraph, isSeed: false };
      saveWalkPathGraphLocal(cleaned);
      return cleaned;
    }
  } catch {
    // keep local
  }
  return local;
}

export async function saveWalkPathGraph(graph: WalkPathGraph): Promise<WalkPathGraph> {
  const saved = saveWalkPathGraphLocal({ ...graph, isSeed: false, updatedAt: new Date().toISOString() });
  void saveSharedOwnerDraftById(remoteId(graph.marketId), saved);
  return saved;
}

export function totalPathLengthMeters(graph: WalkPathGraph): number {
  return graph.edges.reduce((sum, e) => sum + edgeLengthMeters(graph, e), 0);
}
