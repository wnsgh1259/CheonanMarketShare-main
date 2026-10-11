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

/** 통로 노드(교차점·입구) 여부 — 상점 앞 노드는 통로가 아님 */
export function isPassageNode(node: WalkNode): boolean {
  return node.type === "junction" || node.type === "entrance";
}

export function findNearestNode(
  graph: WalkPathGraph,
  lat: number,
  lng: number,
  opts?: { excludeIds?: Set<string>; maxMeters?: number; passageOnly?: boolean },
): { node: WalkNode; meters: number } | null {
  let best: { node: WalkNode; meters: number } | null = null;
  for (const node of graph.nodes) {
    if (opts?.excludeIds?.has(node.id)) continue;
    if (opts?.passageOnly && !isPassageNode(node)) continue;
    const meters = haversineMeters(node, { lat, lng });
    if (opts?.maxMeters != null && meters > opts.maxMeters) continue;
    if (!best || meters < best.meters) best = { node, meters };
  }
  return best;
}

/** 기존 store_front 노드 좌표를 현재 상점 핀 위치로 맞춘다 (잘못된 시드 좌표 보정). */
export function syncStoreFrontPositions(
  graph: WalkPathGraph,
  pins: Array<{ id: number; lat: number; lng: number; name?: string }>,
): WalkPathGraph {
  if (pins.length === 0) return graph;
  const byId = new Map(pins.map((p) => [p.id, p]));
  let changed = false;
  const nodes = graph.nodes.map((n) => {
    if (n.type !== "store_front" || n.storeId == null) return n;
    const pin = byId.get(n.storeId);
    if (!pin) return n;
    if (n.lat === pin.lat && n.lng === pin.lng && (pin.name == null || n.label === pin.name)) {
      return n;
    }
    changed = true;
    return {
      ...n,
      lat: pin.lat,
      lng: pin.lng,
      label: pin.name ?? n.label,
    };
  });
  return changed ? { ...graph, nodes } : graph;
}

/**
 * 등록 상점마다 store_front 노드가 있도록 맞춘다.
 * - 좌표 동기화
 * - 없는 상점은 노드 추가 (통로 연결은 상점연결/연결 모드에서)
 */
export function ensureStoreFrontNodes(
  graph: WalkPathGraph,
  pins: Array<{ id: number; lat: number; lng: number; name?: string }>,
): WalkPathGraph {
  let next = syncStoreFrontPositions(graph, pins);
  if (pins.length === 0) return next;

  // 삭제/이동된 상점의 옛 store_front 노드와 중복 노드 제거
  const pinIds = new Set(pins.map((p) => p.id));
  const seenStoreIds = new Set<number>();
  const dropNodeIds = new Set<string>();
  for (const n of next.nodes) {
    if (n.type !== "store_front") continue;
    if (typeof n.storeId !== "number" || !pinIds.has(n.storeId) || seenStoreIds.has(n.storeId)) {
      dropNodeIds.add(n.id);
      continue;
    }
    seenStoreIds.add(n.storeId);
  }
  if (dropNodeIds.size > 0) {
    next = {
      ...next,
      nodes: next.nodes.filter((n) => !dropNodeIds.has(n.id)),
      edges: next.edges.filter((e) => !dropNodeIds.has(e.from) && !dropNodeIds.has(e.to)),
      updatedAt: new Date().toISOString(),
    };
  }

  const linked = new Set(
    next.nodes
      .filter((n) => n.type === "store_front" && typeof n.storeId === "number")
      .map((n) => n.storeId as number),
  );

  let changed = next !== graph;
  const additions: WalkNode[] = [];
  for (const pin of pins) {
    if (linked.has(pin.id)) continue;
    additions.push({
      id: createWalkNodeId(),
      lat: pin.lat,
      lng: pin.lng,
      type: "store_front",
      storeId: pin.id,
      label: pin.name,
    });
    changed = true;
  }
  if (additions.length > 0) {
    next = {
      ...next,
      nodes: [...next.nodes, ...additions],
      updatedAt: new Date().toISOString(),
    };
  }

  const repaired = repairStoreFrontLinks(next);
  if (repaired !== next) {
    next = repaired;
    changed = true;
  }
  return changed ? next : graph;
}

/**
 * 상점 앞 노드는 통로 노드에만 붙어야 한다.
 * - 상점↔상점 간선 제거
 * - 통로 연결이 없는 상점은 가까운 통로 노드에 자동 연결
 */
export function repairStoreFrontLinks(
  graph: WalkPathGraph,
  autoConnectMaxMeters = 45,
): WalkPathGraph {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const isStore = (id: string) => byId.get(id)?.type === "store_front";

  let edges = graph.edges.filter((e) => !(isStore(e.from) && isStore(e.to)));
  let changed = edges.length !== graph.edges.length;

  for (const node of graph.nodes) {
    if (node.type !== "store_front") continue;
    const hasPassageLink = edges.some((e) => {
      const other = e.from === node.id ? e.to : e.to === node.id ? e.from : null;
      if (!other) return false;
      const o = byId.get(other);
      return !!o && isPassageNode(o);
    });
    if (hasPassageLink) continue;
    const nearest = findNearestNode({ ...graph, edges }, node.lat, node.lng, {
      passageOnly: true,
      maxMeters: autoConnectMaxMeters,
    });
    if (!nearest) continue;
    edges = [...edges, { id: createWalkEdgeId(), from: node.id, to: nearest.node.id }];
    changed = true;
  }

  return changed ? { ...graph, edges, updatedAt: new Date().toISOString() } : graph;
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

  // 상점↔상점 간선은 허용하지 않음. 통로 노드에 연결된 간선만 연결로 인정
  let edges = graph.edges.filter((e) => {
    if (e.from !== storeNodeId && e.to !== storeNodeId) return true;
    const otherId = e.from === storeNodeId ? e.to : e.from;
    const other = nodes.find((n) => n.id === otherId);
    return !!other && isPassageNode(other);
  });
  const alreadyLinked = edges.some(
    (e) => e.from === storeNodeId || e.to === storeNodeId,
  );
  if (!alreadyLinked) {
    // 가장 가까운 "통로 노드"에만 연결 (다른 상점 노드는 제외)
    const nearest = findNearestNode(
      { ...graph, nodes },
      lat,
      lng,
      { excludeIds: new Set([storeNodeId]), maxMeters: autoMax, passageOnly: true },
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
  const a = graph.nodes.find((n) => n.id === fromId);
  const b = graph.nodes.find((n) => n.id === toId);
  // 상점 앞 노드끼리는 연결 불가 (통로 노드를 거쳐야 함)
  if (a?.type === "store_front" && b?.type === "store_front") return graph;
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
