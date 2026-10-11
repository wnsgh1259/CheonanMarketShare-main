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
  /** 상점을 길 막대에 붙이려고 자동으로 만든 분기점 */
  auto?: boolean;
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

/** 점 p 에서 선분 a-b 까지의 최단 지점 (미터 근사 평면) */
function projectOnSegment(
  p: { lat: number; lng: number },
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): { lat: number; lng: number; t: number; meters: number } {
  const kLat = 110540;
  const kLng = 111320 * Math.cos((p.lat * Math.PI) / 180);
  const ax = (a.lng - p.lng) * kLng;
  const ay = (a.lat - p.lat) * kLat;
  const bx = (b.lng - p.lng) * kLng;
  const by = (b.lat - p.lat) * kLat;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : (-(ax * dx + ay * dy)) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = ax + dx * t;
  const py = ay + dy * t;
  return {
    lat: p.lat + py / kLat,
    lng: p.lng + px / kLng,
    t,
    meters: Math.sqrt(px * px + py * py),
  };
}

const SNAP_ENDPOINT_METERS = 2;
/** 현재 연결보다 이만큼(m) 이상 더 가까운 길이 있으면 다시 붙인다 */
const RESNAP_GAIN_METERS = 3;

/** 상점 위치에서 가장 가까운 길(간선 위 점 또는 통로 노드)까지의 거리 */
function nearestRoadMeters(graph: WalkPathGraph, store: { lat: number; lng: number }): number {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  let best = Infinity;
  for (const e of graph.edges) {
    const a = nodeById.get(e.from);
    const b = nodeById.get(e.to);
    if (!a || !b || !isPassageNode(a) || !isPassageNode(b)) continue;
    best = Math.min(best, projectOnSegment(store, a, b).meters);
  }
  for (const n of graph.nodes) {
    if (isPassageNode(n)) best = Math.min(best, haversineMeters(n, store));
  }
  return best;
}

/**
 * 상점 앞 노드를 "가장 가까운 길(간선) 위의 점"에 연결한다.
 * 길 중간이 가장 가까우면 그 자리에 분기점을 만들어 간선을 둘로 쪼갠 뒤 붙인다.
 * 상점의 기존 연결은 모두 지우고 새로 붙인다.
 */
export function attachStoreToNearestRoad(
  graph: WalkPathGraph,
  storeNodeId: string,
  maxMeters = 60,
): WalkPathGraph {
  const store = graph.nodes.find((n) => n.id === storeNodeId && n.type === "store_front");
  if (!store) return graph;

  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const roadEdges = graph.edges.filter((e) => {
    const a = nodeById.get(e.from);
    const b = nodeById.get(e.to);
    return !!a && !!b && isPassageNode(a) && isPassageNode(b);
  });

  type Best =
    | { kind: "node"; node: WalkNode; meters: number }
    | { kind: "edge"; edge: WalkEdge; lat: number; lng: number; t: number; meters: number };
  let best: Best | null = null;

  for (const e of roadEdges) {
    const a = nodeById.get(e.from)!;
    const b = nodeById.get(e.to)!;
    const pr = projectOnSegment(store, a, b);
    if (!best || pr.meters < best.meters) {
      best = { kind: "edge", edge: e, lat: pr.lat, lng: pr.lng, t: pr.t, meters: pr.meters };
    }
  }
  // 간선이 없는 통로 노드(고립 노드)도 후보
  for (const n of graph.nodes) {
    if (!isPassageNode(n)) continue;
    const m = haversineMeters(n, store);
    if (!best || m < best.meters) best = { kind: "node", node: n, meters: m };
  }
  if (!best || best.meters > maxMeters) return graph;

  // 기존 상점 연결 제거
  let nodes = graph.nodes;
  let edges = graph.edges.filter((e) => e.from !== storeNodeId && e.to !== storeNodeId);
  let targetId: string;

  if (best.kind === "node") {
    targetId = best.node.id;
  } else {
    const a = nodeById.get(best.edge.from)!;
    const b = nodeById.get(best.edge.to)!;
    const distA = haversineMeters(a, best);
    const distB = haversineMeters(b, best);
    if (distA <= SNAP_ENDPOINT_METERS) {
      targetId = a.id;
    } else if (distB <= SNAP_ENDPOINT_METERS) {
      targetId = b.id;
    } else {
      const mid: WalkNode = {
        id: createWalkNodeId(),
        lat: best.lat,
        lng: best.lng,
        type: "junction",
        auto: true,
      };
      nodes = [...nodes, mid];
      edges = edges.filter((e) => e.id !== best!.edge.id);
      edges.push(
        { id: createWalkEdgeId(), from: a.id, to: mid.id },
        { id: createWalkEdgeId(), from: mid.id, to: b.id },
      );
      targetId = mid.id;
    }
  }

  edges.push({ id: createWalkEdgeId(), from: storeNodeId, to: targetId });
  return { ...graph, nodes, edges, updatedAt: new Date().toISOString() };
}

/** 상점이 붙어 있지 않은 자동 분기점은 지우고 원래 한 줄 간선으로 되돌린다. */
function mergeUnusedAutoJunctions(graph: WalkPathGraph): WalkPathGraph {
  let nodes = graph.nodes;
  let edges = graph.edges;
  let changed = false;
  for (const n of graph.nodes) {
    if (!n.auto) continue;
    const inc = edges.filter((e) => e.from === n.id || e.to === n.id);
    const hasStore = inc.some((e) => {
      const other = e.from === n.id ? e.to : e.from;
      return nodes.find((x) => x.id === other)?.type === "store_front";
    });
    if (hasStore) continue;
    if (inc.length === 2) {
      const others = inc.map((e) => (e.from === n.id ? e.to : e.from));
      const dup = edges.some(
        (e) =>
          (e.from === others[0] && e.to === others[1]) ||
          (e.from === others[1] && e.to === others[0]),
      );
      edges = edges.filter((e) => !inc.includes(e));
      if (!dup && others[0] !== others[1]) {
        edges = [...edges, { id: createWalkEdgeId(), from: others[0], to: others[1] }];
      }
      nodes = nodes.filter((x) => x.id !== n.id);
      changed = true;
    } else if (inc.length === 0) {
      nodes = nodes.filter((x) => x.id !== n.id);
      changed = true;
    }
  }
  return changed ? { ...graph, nodes, edges, updatedAt: new Date().toISOString() } : graph;
}

/** 모든 상점을 각자 가장 가까운 길 위의 점에 다시 연결한다. */
export function snapAllStoresToRoads(graph: WalkPathGraph, maxMeters = 60): WalkPathGraph {
  let next = graph;
  const storeIds = graph.nodes.filter((n) => n.type === "store_front").map((n) => n.id);
  // 먼저 상점 연결을 모두 끊고 자동 분기점을 정리한 뒤 다시 붙인다.
  const sset = new Set(storeIds);
  next = {
    ...next,
    edges: next.edges.filter((e) => !sset.has(e.from) && !sset.has(e.to)),
  };
  next = mergeUnusedAutoJunctions(next);
  for (const id of storeIds) {
    next = attachStoreToNearestRoad(next, id, maxMeters);
  }
  return { ...next, updatedAt: new Date().toISOString() };
}

/**
 * 상점 앞 노드는 통로(길)에만 붙어야 한다.
 * - 상점↔상점 간선 제거
 * - 통로 연결이 없는 상점은 가장 가까운 길 막대 위의 점에 자동 연결
 */
export function repairStoreFrontLinks(
  graph: WalkPathGraph,
  autoConnectMaxMeters = 45,
): WalkPathGraph {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const isStore = (id: string) => byId.get(id)?.type === "store_front";

  const edges0 = graph.edges.filter((e) => !(isStore(e.from) && isStore(e.to)));
  let next: WalkPathGraph =
    edges0.length !== graph.edges.length ? { ...graph, edges: edges0 } : graph;
  let changed = next !== graph;

  for (const node of graph.nodes) {
    if (node.type !== "store_front") continue;
    const hasPassageLink = next.edges.some((e) => {
      const other = e.from === node.id ? e.to : e.to === node.id ? e.from : null;
      if (!other) return false;
      const o = byId.get(other) ?? next.nodes.find((n) => n.id === other);
      return !!o && isPassageNode(o);
    });
    if (hasPassageLink) {
      // 이미 노드에 붙어 있어도, 더 가까운 길 막대가 있으면 그쪽으로 다시 붙인다.
      const cur = next.nodes.find((n) => n.id === node.id) ?? node;
      let linkedMeters = Infinity;
      for (const e of next.edges) {
        const otherId = e.from === cur.id ? e.to : e.to === cur.id ? e.from : null;
        if (!otherId) continue;
        const o = next.nodes.find((n) => n.id === otherId);
        if (o && isPassageNode(o)) linkedMeters = Math.min(linkedMeters, haversineMeters(cur, o));
      }
      const roadMeters = nearestRoadMeters(next, cur);
      if (!(linkedMeters - roadMeters > RESNAP_GAIN_METERS)) continue;
    }
    const attached = attachStoreToNearestRoad(next, node.id, autoConnectMaxMeters);
    if (attached !== next) {
      next = attached;
      changed = true;
    }
  }

  return changed ? { ...next, updatedAt: new Date().toISOString() } : graph;
}

/** 상점 좌표를 그래프에 붙일 때 사용. 기존 store_front가 있으면 위치만 갱신. */
export function upsertStoreFrontNode(
  graph: WalkPathGraph,
  storeId: number,
  lat: number,
  lng: number,
  opts?: { label?: string; autoConnectMaxMeters?: number },
): WalkPathGraph {
  const autoMax = opts?.autoConnectMaxMeters ?? 60;
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
  const edges = graph.edges.filter((e) => {
    if (e.from !== storeNodeId && e.to !== storeNodeId) return true;
    const otherId = e.from === storeNodeId ? e.to : e.from;
    const other = nodes.find((n) => n.id === otherId);
    return !!other && isPassageNode(other);
  });

  // 가장 가까운 "길 막대 위의 점"에 다시 연결 (길 중간이면 분기점 생성)
  const attached = attachStoreToNearestRoad({ ...graph, nodes, edges }, storeNodeId, autoMax);
  const cleaned = mergeUnusedAutoJunctions(attached);
  return { ...cleaned, updatedAt: new Date().toISOString() };
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
