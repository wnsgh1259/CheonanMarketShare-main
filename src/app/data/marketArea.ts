import type { MarketId } from "../components/CartContext";
import { MARKET_VIEW_CONFIG } from "../map/storeMapPlacement";
import { loadSharedOwnerDraftById, saveSharedOwnerDraftById } from "./ownerSharedStore";

export type LatLngPoint = { lat: number; lng: number };

export type MarketAreaDoc = {
  marketId: MarketId;
  /** 닫힌 다각형 링들 (첫 점 ≠ 마지막 점 권장, 렌더 시 닫음) */
  rings: LatLngPoint[][];
  fillColor?: string;
  updatedAt: string;
};

const LOCAL_KEY_PREFIX = "market-area-v1:";

function remoteId(marketId: MarketId) {
  return `market_area_${marketId}`;
}

function localKey(marketId: MarketId) {
  return `${LOCAL_KEY_PREFIX}${marketId}`;
}

export function emptyMarketArea(marketId: MarketId): MarketAreaDoc {
  return {
    marketId,
    rings: [],
    fillColor: MARKET_VIEW_CONFIG[marketId].fillColor,
    updatedAt: new Date().toISOString(),
  };
}

export function seedMarketArea(marketId: MarketId): MarketAreaDoc {
  const base = MARKET_VIEW_CONFIG[marketId];
  return {
    marketId,
    rings: base.areaPaths.map((ring) => ring.map((p) => ({ ...p }))),
    fillColor: base.fillColor,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeDoc(marketId: MarketId, raw: unknown): MarketAreaDoc | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Partial<MarketAreaDoc>;
  if (!Array.isArray(obj.rings)) return null;
  const rings = obj.rings
    .filter((ring): ring is LatLngPoint[] => Array.isArray(ring))
    .map((ring) =>
      ring.filter(
        (p): p is LatLngPoint =>
          !!p && typeof p.lat === "number" && typeof p.lng === "number" && Number.isFinite(p.lat) && Number.isFinite(p.lng),
      ),
    )
    .filter((ring) => ring.length >= 3);
  return {
    marketId,
    rings,
    fillColor: typeof obj.fillColor === "string" ? obj.fillColor : MARKET_VIEW_CONFIG[marketId].fillColor,
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : new Date().toISOString(),
  };
}

export function loadMarketAreaLocal(marketId: MarketId): MarketAreaDoc | null {
  try {
    const raw = localStorage.getItem(localKey(marketId));
    if (!raw) return null;
    return normalizeDoc(marketId, JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveMarketAreaLocal(doc: MarketAreaDoc) {
  const next = { ...doc, updatedAt: new Date().toISOString() };
  localStorage.setItem(localKey(doc.marketId), JSON.stringify(next));
  return next;
}

export async function loadMarketArea(marketId: MarketId): Promise<MarketAreaDoc> {
  const local = loadMarketAreaLocal(marketId);
  try {
    const remote = await loadSharedOwnerDraftById(remoteId(marketId));
    const remoteDoc = normalizeDoc(marketId, remote);
    if (!remoteDoc) {
      return local ?? seedMarketArea(marketId);
    }
    if (!local) {
      saveMarketAreaLocal(remoteDoc);
      return remoteDoc;
    }
    const localTs = Date.parse(local.updatedAt) || 0;
    const remoteTs = Date.parse(remoteDoc.updatedAt) || 0;
    if (remoteTs > localTs) {
      saveMarketAreaLocal(remoteDoc);
      return remoteDoc;
    }
  } catch {
    // keep local/seed
  }
  return local ?? seedMarketArea(marketId);
}

export async function saveMarketArea(doc: MarketAreaDoc): Promise<MarketAreaDoc> {
  const saved = saveMarketAreaLocal(doc);
  void saveSharedOwnerDraftById(remoteId(doc.marketId), saved);
  return saved;
}

/** 저장된 영역 문서가 있으면 그걸(빈 영역 포함), 없으면 시드 사각형을 씀 */
export function resolveMarketView(marketId: MarketId) {
  const base = MARKET_VIEW_CONFIG[marketId];
  const local = loadMarketAreaLocal(marketId);
  if (local) {
    return {
      ...base,
      areaPaths: local.rings,
      fillColor: local.fillColor ?? base.fillColor,
    };
  }
  return base;
}

export async function hydrateMarketArea(marketId: MarketId) {
  return loadMarketArea(marketId);
}

/** 맵에 올릴 때: 테두리 없이 연한 면만 */
export const MARKET_AREA_DISPLAY = {
  fillOpacity: 0.14,
  strokeWeight: 0,
  strokeOpacity: 0,
} as const;

export function ringCentroid(ring: LatLngPoint[]): LatLngPoint {
  if (ring.length === 0) return { lat: 0, lng: 0 };
  let lat = 0;
  let lng = 0;
  for (const p of ring) {
    lat += p.lat;
    lng += p.lng;
  }
  return { lat: lat / ring.length, lng: lng / ring.length };
}
