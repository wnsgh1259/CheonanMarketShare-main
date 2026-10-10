import type { MarketId } from "../components/CartContext";
import { MARKET_VIEW_CONFIG, pickStoreDisplayLatLng } from "../map/storeMapPlacement";
import { STORES_BY_MARKET } from "./storeData";
import {
  createWalkEdgeId,
  createWalkNodeId,
  emptyWalkPathGraph,
  hasWalkPathLocalKey,
  loadWalkPathGraphLocal,
  saveWalkPathGraphLocal,
  type WalkEdge,
  type WalkNode,
  type WalkPathGraph,
} from "./walkPathGraph";

/**
 * 시장 폴리곤·상점 좌표로 초기 보행 그래프를 생성.
 * - 세로(또는 상점 분포) 스파인 + 상점 앞 노드 연결
 * - 에디터에서 다듬을 수 있는 출발점
 */
export function buildSeedWalkPath(marketId: MarketId): WalkPathGraph {
  const view = MARKET_VIEW_CONFIG[marketId];
  const stores = STORES_BY_MARKET[marketId] ?? [];
  const positions = stores.map((s) => ({
    store: s,
    ...pickStoreDisplayLatLng(marketId, s),
  }));

  // bounding box from area paths + stores
  const pts = [
    ...view.areaPaths.flat(),
    ...positions.map((p) => ({ lat: p.lat, lng: p.lng })),
  ];
  if (pts.length === 0) return emptyWalkPathGraph(marketId);

  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const midLng = (minLng + maxLng) / 2;
  const midLat = (minLat + maxLat) / 2;

  // Prefer N-S spine (traditional market alley). If market is wider than tall, use E-W.
  const latSpan = maxLat - minLat;
  const lngSpan = maxLng - minLng;
  const northSouth = latSpan >= lngSpan * 0.55;

  const spineCount = Math.max(4, Math.min(10, 3 + Math.ceil(stores.length / 3)));
  const nodes: WalkNode[] = [];
  const edges: WalkEdge[] = [];

  const spineIds: string[] = [];
  for (let i = 0; i < spineCount; i++) {
    const t = spineCount === 1 ? 0.5 : i / (spineCount - 1);
    const id = createWalkNodeId();
    spineIds.push(id);
    if (northSouth) {
      nodes.push({
        id,
        lat: minLat + latSpan * t,
        lng: midLng,
        type: i === 0 ? "entrance" : "junction",
        label: i === 0 ? "입구" : undefined,
      });
    } else {
      nodes.push({
        id,
        lat: midLat,
        lng: minLng + lngSpan * t,
        type: i === 0 ? "entrance" : "junction",
        label: i === 0 ? "입구" : undefined,
      });
    }
  }

  for (let i = 0; i < spineIds.length - 1; i++) {
    edges.push({ id: createWalkEdgeId(), from: spineIds[i], to: spineIds[i + 1] });
  }

  // mild side branches so graph isn't a single stick
  if (spineIds.length >= 3) {
    const branchAt = [Math.floor(spineIds.length * 0.35), Math.floor(spineIds.length * 0.7)];
    for (const bi of branchAt) {
      const base = nodes.find((n) => n.id === spineIds[bi]);
      if (!base) continue;
      const leftId = createWalkNodeId();
      const rightId = createWalkNodeId();
      const dLat = northSouth ? 0 : latSpan * 0.12;
      const dLng = northSouth ? lngSpan * 0.18 : 0;
      nodes.push({ id: leftId, lat: base.lat + (northSouth ? 0 : dLat), lng: base.lng - (northSouth ? dLng : 0), type: "junction" });
      nodes.push({ id: rightId, lat: base.lat - (northSouth ? 0 : dLat), lng: base.lng + (northSouth ? dLng : 0), type: "junction" });
      edges.push({ id: createWalkEdgeId(), from: base.id, to: leftId });
      edges.push({ id: createWalkEdgeId(), from: base.id, to: rightId });
    }
  }

  const junctionNodes = () => nodes.filter((n) => n.type === "junction" || n.type === "entrance");

  for (const pos of positions) {
    const sfId = createWalkNodeId();
    nodes.push({
      id: sfId,
      lat: pos.lat,
      lng: pos.lng,
      type: "store_front",
      storeId: pos.store.id,
      label: pos.store.name,
    });
    // nearest spine/junction
    let bestId = spineIds[0];
    let bestD = Infinity;
    for (const n of junctionNodes()) {
      const d = (n.lat - pos.lat) ** 2 + (n.lng - pos.lng) ** 2;
      if (d < bestD) {
        bestD = d;
        bestId = n.id;
      }
    }
    edges.push({ id: createWalkEdgeId(), from: sfId, to: bestId });
  }

  return {
    marketId,
    nodes,
    edges,
    updatedAt: new Date().toISOString(),
    isSeed: true,
  };
}

/** 로컬에 보행경로가 한 번도 없으면 시드를 채운다. 이미 저장된(빈 포함) 데이터는 건드리지 않음. */
export function ensureWalkPathSeeded(marketId: MarketId): WalkPathGraph {
  if (hasWalkPathLocalKey(marketId)) {
    return loadWalkPathGraphLocal(marketId);
  }
  const seed = buildSeedWalkPath(marketId);
  return saveWalkPathGraphLocal(seed);
}

/**
 * 다른 기기에서 저장한 보행경로를 먼저 받은 뒤, 없을 때만 시드.
 * 손님 맵/경로 추천 진입 시 호출.
 */
export async function hydrateWalkPathGraph(marketId: MarketId): Promise<WalkPathGraph> {
  const { loadWalkPathGraph } = await import("./walkPathGraph");
  const loaded = await loadWalkPathGraph(marketId);
  if (loaded.nodes.length > 0 || loaded.edges.length > 0 || hasWalkPathLocalKey(marketId)) {
    return loaded;
  }
  return ensureWalkPathSeeded(marketId);
}

/** 에디터에서 시드로 되돌릴 때 */
export function resetWalkPathToSeed(marketId: MarketId): WalkPathGraph {
  return saveWalkPathGraphLocal(buildSeedWalkPath(marketId));
}
