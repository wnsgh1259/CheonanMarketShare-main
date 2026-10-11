import type { MarketId } from "../components/CartContext";
import { MARKET_VIEW_CONFIG } from "../map/storeMapPlacement";
import {
  haversineMeters,
  loadWalkPathGraphLocal,
  type WalkNode,
  type WalkPathGraph,
} from "./walkPathGraph";

export type LatLng = { lat: number; lng: number };

export type StartSource = "gps" | "nearest_entrance" | "default_entrance";

const WALK_SPEED_M_PER_MIN = 70;
/** GPS가 시장 그래프에서 이보다 멀면 실패로 보고 입구로 폴백 */
const GPS_MAX_SNAP_METERS = 800;

export function walkMinutes(meters: number) {
  return Math.max(1, Math.ceil(meters / WALK_SPEED_M_PER_MIN));
}

export function getUserLatLng(timeoutMs = 6000): Promise<LatLng | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 20_000 },
    );
  });
}

function buildAdj(graph: WalkPathGraph): Map<string, Array<{ to: string; w: number }>> {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const adj = new Map<string, Array<{ to: string; w: number }>>();
  for (const n of graph.nodes) adj.set(n.id, []);
  for (const e of graph.edges) {
    const a = nodeById.get(e.from);
    const b = nodeById.get(e.to);
    if (!a || !b) continue;
    const w = haversineMeters(a, b);
    adj.get(e.from)?.push({ to: e.to, w });
    adj.get(e.to)?.push({ to: e.from, w });
  }
  return adj;
}

export function dijkstraMeters(
  graph: WalkPathGraph,
  fromId: string,
  toId: string,
): { meters: number; nodeIds: string[] } | null {
  if (fromId === toId) return { meters: 0, nodeIds: [fromId] };
  const adj = buildAdj(graph);
  if (!adj.has(fromId) || !adj.has(toId)) return null;
  const storeNodeIds = new Set(graph.nodes.filter((n) => n.type === "store_front").map((n) => n.id));

  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const used = new Set<string>();
  for (const id of adj.keys()) {
    dist.set(id, Infinity);
    prev.set(id, null);
  }
  dist.set(fromId, 0);

  while (used.size < adj.size) {
    let u: string | null = null;
    let best = Infinity;
    for (const [id, d] of dist) {
      if (used.has(id) || d >= best) continue;
      best = d;
      u = id;
    }
    if (u == null || best === Infinity) break;
    if (u === toId) break;
    used.add(u);
    // 상점 앞 노드는 출발/도착으로만 쓰고, 다른 상점으로 가는 통로로는 쓰지 않음
    if (storeNodeIds.has(u) && u !== fromId) continue;
    for (const { to, w } of adj.get(u) ?? []) {
      const nd = best + w;
      if (nd < (dist.get(to) ?? Infinity)) {
        dist.set(to, nd);
        prev.set(to, u);
      }
    }
  }

  const end = dist.get(toId);
  if (end == null || !Number.isFinite(end)) return null;

  const nodeIds: string[] = [];
  let cur: string | null = toId;
  while (cur) {
    nodeIds.push(cur);
    cur = prev.get(cur) ?? null;
  }
  nodeIds.reverse();
  return { meters: end, nodeIds };
}

export function listEntranceNodes(graph: WalkPathGraph): WalkNode[] {
  return graph.nodes.filter((n) => n.type === "entrance");
}

/** 기본 입구: 입구 중 가장 남쪽, 없으면 전체 남쪽 */
export function findDefaultEntranceNode(graph: WalkPathGraph): WalkNode | null {
  const entrances = listEntranceNodes(graph);
  if (entrances.length > 0) {
    return [...entrances].sort((a, b) => a.lat - b.lat)[0];
  }
  if (graph.nodes.length === 0) return null;
  return [...graph.nodes].sort((a, b) => a.lat - b.lat)[0];
}

export function findNearestEntranceNode(graph: WalkPathGraph, focus: LatLng): WalkNode | null {
  const entrances = listEntranceNodes(graph);
  if (entrances.length === 0) return null;
  return [...entrances].sort(
    (a, b) => haversineMeters(a, focus) - haversineMeters(b, focus),
  )[0];
}

/** @deprecated use findDefaultEntranceNode */
export function findEntranceNode(graph: WalkPathGraph): WalkNode | null {
  return findDefaultEntranceNode(graph);
}

export function findStoreNode(graph: WalkPathGraph, storeId: number, storePos: LatLng): WalkNode | null {
  const linked = graph.nodes.find((n) => n.type === "store_front" && n.storeId === storeId);
  if (linked) return linked;
  let best: WalkNode | null = null;
  let bestD = Infinity;
  for (const n of graph.nodes) {
    const d = haversineMeters(n, storePos);
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best;
}

export function findNearestGraphNode(
  graph: WalkPathGraph,
  point: LatLng,
): { node: WalkNode; meters: number } | null {
  if (graph.nodes.length === 0) return null;
  let best: WalkNode | null = null;
  let bestD = Infinity;
  for (const n of graph.nodes) {
    const d = haversineMeters(n, point);
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best ? { node: best, meters: bestD } : null;
}

export type RoutingContext = {
  marketId: MarketId;
  graph: WalkPathGraph | null;
  hasGraph: boolean;
  /** 실제 출발 좌표 (GPS 또는 입구) */
  entrance: LatLng;
  /** 그래프 스냅 노드 — 경로 탐색용 */
  entranceNodeId: string | null;
  startSource: StartSource;
  startLabel: string;
};

export type CreateRoutingOptions = {
  /** 기기 GPS. null/undefined면 입구 폴백 */
  gps?: LatLng | null;
  /** 가까운 입구 판정용 (장바구니 상점 좌표 등). 없으면 시장 중심 */
  focusPoints?: LatLng[];
};

function focusFromPoints(marketId: MarketId, focusPoints?: LatLng[]): LatLng {
  if (focusPoints && focusPoints.length > 0) {
    const lat = focusPoints.reduce((s, p) => s + p.lat, 0) / focusPoints.length;
    const lng = focusPoints.reduce((s, p) => s + p.lng, 0) / focusPoints.length;
    return { lat, lng };
  }
  const view = MARKET_VIEW_CONFIG[marketId];
  return { lat: view.center.lat, lng: view.center.lng };
}

function startLabelOf(source: StartSource): string {
  if (source === "gps") return "내 위치";
  if (source === "nearest_entrance") return "가까운 입구";
  return "기본 입구";
}

/**
 * 출발점 우선순위:
 * 1) GPS (시장 근처로 스냅 가능)
 * 2) 가장 가까운 입구 (focusPoints 기준)
 * 3) 기본 입구
 */
export function createRoutingContext(
  marketId: MarketId,
  opts?: CreateRoutingOptions,
): RoutingContext {
  // 시드는 hydrateWalkPathGraph가 서버 확인 후에만 채움 (다른 기기 저장본 덮어쓰기 방지)
  const graph = loadWalkPathGraphLocal(marketId);
  const usable = graph.nodes.length > 0 && graph.edges.length > 0 ? graph : null;
  const view = MARKET_VIEW_CONFIG[marketId];
  const focus = focusFromPoints(marketId, opts?.focusPoints);
  const fallbackCenter = { lat: view.center.lat - 0.00035, lng: view.center.lng };

  if (!usable) {
    const gps = opts?.gps;
    if (gps) {
      return {
        marketId,
        graph: null,
        hasGraph: false,
        entrance: gps,
        entranceNodeId: null,
        startSource: "gps",
        startLabel: startLabelOf("gps"),
      };
    }
    return {
      marketId,
      graph: null,
      hasGraph: false,
      entrance: fallbackCenter,
      entranceNodeId: null,
      startSource: "default_entrance",
      startLabel: startLabelOf("default_entrance"),
    };
  }

  // 1) GPS
  const gps = opts?.gps ?? null;
  if (gps) {
    const nearest = findNearestGraphNode(usable, gps);
    if (nearest && nearest.meters <= GPS_MAX_SNAP_METERS) {
      return {
        marketId,
        graph: usable,
        hasGraph: true,
        entrance: gps,
        entranceNodeId: nearest.node.id,
        startSource: "gps",
        startLabel: startLabelOf("gps"),
      };
    }
  }

  const entrances = listEntranceNodes(usable);

  // 2) 가장 가까운 입구 (입구가 2개 이상일 때 focus 기준)
  if (entrances.length > 1) {
    const nearestEntrance = findNearestEntranceNode(usable, focus) ?? entrances[0];
    return {
      marketId,
      graph: usable,
      hasGraph: true,
      entrance: { lat: nearestEntrance.lat, lng: nearestEntrance.lng },
      entranceNodeId: nearestEntrance.id,
      startSource: "nearest_entrance",
      startLabel: startLabelOf("nearest_entrance"),
    };
  }

  // 3) 기본 입구 (입구 1개 또는 입구 없음 → 남쪽 노드)
  const defaultEntrance = findDefaultEntranceNode(usable);
  if (defaultEntrance) {
    return {
      marketId,
      graph: usable,
      hasGraph: true,
      entrance: { lat: defaultEntrance.lat, lng: defaultEntrance.lng },
      entranceNodeId: defaultEntrance.id,
      startSource: "default_entrance",
      startLabel: startLabelOf("default_entrance"),
    };
  }

  return {
    marketId,
    graph: usable,
    hasGraph: true,
    entrance: fallbackCenter,
    entranceNodeId: null,
    startSource: "default_entrance",
    startLabel: startLabelOf("default_entrance"),
  };
}

/** 두 좌표(또는 상점) 사이 보행 거리. 그래프 없으면 직선. */
export function routeDistanceMeters(
  ctx: RoutingContext,
  from: LatLng & { storeId?: number },
  to: LatLng & { storeId?: number },
): number {
  if (!ctx.graph || !ctx.hasGraph) {
    return haversineMeters(from, to);
  }

  let fromNode: WalkNode | null =
    from.storeId != null
      ? findStoreNode(ctx.graph, from.storeId, from)
      : ctx.entranceNodeId
        ? ctx.graph.nodes.find((n) => n.id === ctx.entranceNodeId) ?? null
        : null;
  const toNode =
    to.storeId != null
      ? findStoreNode(ctx.graph, to.storeId, to)
      : findStoreNode(ctx.graph, -1, to);

  let fromId = fromNode?.id;
  if (!fromId && from.storeId == null && ctx.entranceNodeId) {
    fromId = ctx.entranceNodeId;
    fromNode = ctx.graph.nodes.find((n) => n.id === fromId) ?? null;
  }
  if (!fromId) {
    const nearest = findNearestGraphNode(ctx.graph, from);
    fromId = nearest?.node.id;
    fromNode = nearest?.node ?? null;
  }
  const toId =
    toNode?.id ??
    findNearestGraphNode(ctx.graph, to)?.node.id;

  if (!fromId || !toId) return haversineMeters(from, to);

  const path = dijkstraMeters(ctx.graph, fromId, toId);
  if (!path) {
    return haversineMeters(from, to);
  }
  const fromNodePos = ctx.graph.nodes.find((n) => n.id === fromId)!;
  const toNodePos = ctx.graph.nodes.find((n) => n.id === toId)!;
  const fromExtra = haversineMeters(from, fromNodePos);
  const toExtra = haversineMeters(to, toNodePos);
  return path.meters + fromExtra + toExtra;
}

export function distanceFromEntrance(
  ctx: RoutingContext,
  store: LatLng & { storeId: number },
): number {
  return routeDistanceMeters(
    ctx,
    { lat: ctx.entrance.lat, lng: ctx.entrance.lng },
    store,
  );
}

function resolveEndpointNodeId(
  ctx: RoutingContext,
  point: LatLng & { storeId?: number },
): string | null {
  if (!ctx.graph) return null;
  if (point.storeId != null) {
    return findStoreNode(ctx.graph, point.storeId, point)?.id ?? null;
  }
  if (ctx.entranceNodeId) return ctx.entranceNodeId;
  return findNearestGraphNode(ctx.graph, point)?.node.id ?? null;
}

/** 두 지점 사이 보행 폴리라인 (그래프 없으면 직선 2점) */
export function buildSegmentLatLngPath(
  ctx: RoutingContext,
  from: LatLng & { storeId?: number },
  to: LatLng & { storeId?: number },
): LatLng[] {
  if (!ctx.graph || !ctx.hasGraph) {
    return [
      { lat: from.lat, lng: from.lng },
      { lat: to.lat, lng: to.lng },
    ];
  }
  const fromId = resolveEndpointNodeId(ctx, from);
  const toId = resolveEndpointNodeId(ctx, to);
  if (!fromId || !toId) {
    return [
      { lat: from.lat, lng: from.lng },
      { lat: to.lat, lng: to.lng },
    ];
  }
  const path = dijkstraMeters(ctx.graph, fromId, toId);
  if (!path) {
    return [
      { lat: from.lat, lng: from.lng },
      { lat: to.lat, lng: to.lng },
    ];
  }
  const nodeById = new Map(ctx.graph.nodes.map((n) => [n.id, n]));
  const pts: LatLng[] = path.nodeIds
    .map((id) => nodeById.get(id))
    .filter((n): n is WalkNode => !!n)
    .map((n) => ({ lat: n.lat, lng: n.lng }));

  if (pts.length === 0) {
    return [
      { lat: from.lat, lng: from.lng },
      { lat: to.lat, lng: to.lng },
    ];
  }
  const start = { lat: from.lat, lng: from.lng };
  const end = { lat: to.lat, lng: to.lng };
  if (haversineMeters(start, pts[0]) > 1) pts.unshift(start);
  if (haversineMeters(end, pts[pts.length - 1]) > 1) pts.push(end);
  return pts;
}

/** 출발점 → 상점1 → 상점2 … 전체 투어 폴리라인 */
export function buildTourLatLngPath(
  ctx: RoutingContext,
  stops: Array<LatLng & { storeId: number }>,
): LatLng[] {
  if (stops.length === 0) return [{ lat: ctx.entrance.lat, lng: ctx.entrance.lng }];
  let path: LatLng[] = [];
  let cur: LatLng & { storeId?: number } = { lat: ctx.entrance.lat, lng: ctx.entrance.lng };
  for (const stop of stops) {
    const seg = buildSegmentLatLngPath(ctx, cur, stop);
    if (path.length === 0) path = seg;
    else path = path.concat(seg.slice(1));
    cur = stop;
  }
  return path;
}
