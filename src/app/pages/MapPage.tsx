import { useEffect, useMemo, useRef, useState, useCallback, useLayoutEffect } from "react";
import { Link, useNavigate } from "react-router";
import {
  ChevronLeft, Search, X, MapPin, Heart, ShoppingCart,
  Clock, Phone, Star, Plus, MessageCircle, ChevronRight, ChevronUp,
} from "lucide-react";
import { useCart, type CartItem } from "../components/CartContext";
import type { MarketId } from "../components/CartContext";
import { MarketConflictModal } from "../components/MarketConflictModal";
import { BottomNav } from "../components/BottomNav";
import { Drawer, DrawerContent, DrawerTitle } from "../components/ui/drawer";
import { cn } from "../components/ui/utils";
import {
  STORES_BY_MARKET, MARKET_INFO,
  type CategoryKey, type StoreData, type MenuItem,
} from "../data/storeData";
import {
  loadOwnerCatalog,
  loadOwnerCatalogRemote,
  migrateLegacyOwnerDraftIfNeeded,
  saveOwnerCatalog,
} from "../data/ownerStoreData";
import { syntheticSeedStoreId } from "../data/seedStoreIds";
import { buildFacilityMarkerIcon, buildStoreMarkerIcon } from "../map/naverMarkerIcons";
import { MARKET_VIEW_CONFIG, pickStoreDisplayLatLng, toStoreLatLng } from "../map/storeMapPlacement";

const CATEGORIES: CategoryKey[] = [
  "전체", "먹거리·분식", "정육·계란", "채소", "과일", "채소·과일", "수산물", "반찬·건어물", "기타·생활",
];

/** BottomNav 상단과 동일 선상 — 상점바 `fixed` 하단을 여기에 두면 탭에 가리지 않음 (BottomNav: bottom-0 + h-14 + safe-area) */
const STORE_SHEET_BOTTOM_CLASS = "bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))]";

/** Vaul: snapPoints가 string이면 parseInt로 px 처리됨. 비율은 반드시 number(0~1). 최대값은 헤더 높이로 동적 계산. */
/** 최소 스냅 비율 기본값 — 하단을 네비 선상에 붙인 뒤에는 핸들만 보이게 작은 비율 가능 */
const LIST_SNAP_MIN_FALLBACK = 0.07;
/** 중간 스냅: 목록 스크롤 ↔ 지도 하이라이트·패닝 연동 */
const LIST_SNAP_MID = 0.4;

/** Vaul이 activeSnapPoint를 부동소수로 줄 수 있어 근접 비교 */
const SNAP_MATCH_EPS = 0.06;
function isSnapNearTarget(snap: number | null | undefined, target: number): boolean {
  return typeof snap === "number" && Number.isFinite(snap) && Math.abs(snap - target) < SNAP_MATCH_EPS;
}


type NaverMapRef = {
  setCenter: (latLng: unknown) => void;
  panTo: (latLng: unknown) => void;
  setSize: (size: unknown) => void;
  setZoom: (zoom: number) => void;
  getZoom: () => number;
};

type NaverPolygonRef = {
  setMap: (map: unknown) => void;
  setPath: (path: unknown) => void;
  setOptions: (options: Record<string, unknown>) => void;
};

type NaverMarkerRef = {
  setMap: (map: unknown) => void;
};

type DraftStorePin = {
  id?: number;
  name: string;
  lat: number;
  lng: number;
  marketId?: MarketId;
  hours?: string;
  image?: string;
  description?: string;
  location?: string;
  phone?: string;
  category?: string;
  menus?: Array<{ id: number; name: string; price: string }>;
};

type DraftFacilityPin = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  color: string;
  size?: number;
  hours?: string;
  image?: string;
  marketId?: MarketId;
};

declare global {
  interface Window {
    naver?: any;
  }
}

function clearMarketPolygons(polygons: NaverPolygonRef[]) {
  polygons.forEach((polygon) => polygon.setMap(null));
}

function createMarketPolygons(map: unknown, view: (typeof MARKET_VIEW_CONFIG)[MarketId]) {
  const naver = window.naver;
  return view.areaPaths.map(
    (path) =>
      new naver.maps.Polygon({
        map,
        paths: path.map((point) => new naver.maps.LatLng(point.lat, point.lng)),
        fillColor: view.fillColor,
        fillOpacity: 0.28,
        strokeColor: view.fillColor,
        strokeOpacity: 0,
        strokeWeight: 0,
        zIndex: 10,
        clickable: false,
      }),
  );
}

function clearStoreMarkers(markers: NaverMarkerRef[]) {
  markers.forEach((marker) => marker.setMap(null));
}

type DraftOverrides = {
  byId: Map<number, DraftStorePin>;
  byName: Map<string, DraftStorePin>;
};

function emptyDraftOverrides(): DraftOverrides {
  return { byId: new Map(), byName: new Map() };
}

function buildDraftOverridesForMarket(stores: DraftStorePin[], marketId: MarketId): DraftOverrides {
  const byId = new Map<number, DraftStorePin>();
  const byName = new Map<string, DraftStorePin>();
  for (const store of stores) {
    if (
      store.marketId !== marketId ||
      typeof store.lat !== "number" ||
      typeof store.lng !== "number" ||
      !store.name
    ) {
      continue;
    }
    if (typeof store.id === "number" && Number.isFinite(store.id)) {
      byId.set(store.id, store);
    }
    byName.set(store.name, store);
  }
  return { byId, byName };
}

function readStoredDraftOverrides(marketId: MarketId): DraftOverrides {
  try {
    const parsed = loadOwnerCatalog();
    return buildDraftOverridesForMarket(parsed.stores ?? [], marketId);
  } catch {
    return emptyDraftOverrides();
  }
}

/** localStorage에서 특정 시장의 모든 draft 상점을 반환 (신규 포함) */
function readAllRawDraftStores(marketId: MarketId): DraftStorePin[] {
  try {
    const parsed = loadOwnerCatalog();
    return (parsed.stores ?? []).filter(
      (s) => s.marketId === marketId && typeof s.lat === "number" && typeof s.lng === "number" && s.name,
    );
  } catch {
    return [];
  }
}

/** 관리자에서 새로 추가한 상점(시드에 없는 상점)을 StoreData로 변환 */
function draftOnlyToStoreData(drafts: DraftStorePin[], marketId: MarketId): import("../data/storeData").StoreData[] {
  const seedSyntheticIds = new Set(
    STORES_BY_MARKET[marketId].map((s) => syntheticSeedStoreId(marketId, s.id)),
  );
  const seedNames = new Set(STORES_BY_MARKET[marketId].map((s) => s.name));

  return drafts
    .filter((d) => {
      if (typeof d.id !== "number") return false;
      if (seedSyntheticIds.has(d.id)) return false;
      if (seedNames.has(d.name)) return false;
      return true;
    })
    .map((d) => ({
      id: d.id!,
      name: d.name,
      category: (d.category as import("../data/storeData").CategoryKey) || "기타·생활",
      location: d.location || "",
      hours: d.hours || "",
      phone: d.phone || "",
      rating: 0,
      bookmark: false,
      image: d.image || "https://images.unsplash.com/photo-1594021113115-f1b48e63ef06?w=400",
      mx: 50,
      my: 50,
      lat: d.lat,
      lng: d.lng,
      description: d.description || "",
      menus: d.menus?.map((m) => ({
        id: String(m.id),
        name: m.name,
        price: Number(m.price) || 0,
      })) ?? [],
    }));
}

function resolveDraftOverride(
  marketId: MarketId,
  seedStore: StoreData,
  maps: DraftOverrides,
): DraftStorePin | undefined {
  const syntheticId = syntheticSeedStoreId(marketId, seedStore.id);
  return maps.byId.get(syntheticId) ?? maps.byName.get(seedStore.name);
}

function getStoreLatLng(store: StoreData, center: { lat: number; lng: number }) {
  if (typeof store.lat === "number" && typeof store.lng === "number") {
    return { lat: store.lat, lng: store.lng };
  }
  return toStoreLatLng(center, store.mx, store.my);
}

function NaverMarketMap({
  selectedMarket,
  visibleStores,
  facilities,
  highlightedStore,
  highlightBandCenterY,
  onSelectStore,
  onSelectFacility,
  onMapDragStart,
  onMapDragEnd,
  onDeselect,
  suppressHighlightPanRef,
  customLocationPin,
  onCustomPinClick,
}: {
  selectedMarket: MarketId;
  visibleStores: StoreData[];
  facilities: DraftFacilityPin[];
  highlightedStore: StoreData | null;
  /** 뷰포트 기준(px): 지도에 보이는 띠의 세로 중앙. 없으면 하이라이트만 하고 패닝 보정 없음 */
  highlightBandCenterY?: number | null;
  onSelectStore: (store: StoreData) => void;
  onSelectFacility: (facility: DraftFacilityPin) => void;
  onMapDragStart?: () => void;
  onMapDragEnd?: () => void;
  onDeselect?: () => void;
  /** 지도 드래그 직후 pan 억제 플래그 */
  suppressHighlightPanRef?: React.RefObject<boolean>;
  customLocationPin?: { name: string; lat: number; lng: number } | null;
  onCustomPinClick?: () => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<NaverMapRef | null>(null);
  const marketPolygonsRef = useRef<NaverPolygonRef[]>([]);
  const storeMarkersRef = useRef<NaverMarkerRef[]>([]);
  const facilityMarkersRef = useRef<NaverMarkerRef[]>([]);
  const customPinMarkerRef = useRef<NaverMarkerRef | null>(null);
  const onCustomPinClickRef = useRef(onCustomPinClick);
  onCustomPinClickRef.current = onCustomPinClick;
  const customLocationPinRef = useRef(customLocationPin);
  customLocationPinRef.current = customLocationPin;
  /** 첫 번째 selectedMarket effect 실행 여부 추적 (초기 마운트 판별) */
  const isInitialMarketEffectRef = useRef(true);
  const onMapDragStartRef = useRef(onMapDragStart);
  onMapDragStartRef.current = onMapDragStart;
  const onMapDragEndRef = useRef(onMapDragEnd);
  onMapDragEndRef.current = onMapDragEnd;
  const onDeselectRef = useRef(onDeselect);
  onDeselectRef.current = onDeselect;
  const selectedMarketRef = useRef(selectedMarket);
  selectedMarketRef.current = selectedMarket;
  const [mapInstanceEpoch, setMapInstanceEpoch] = useState(0);
  const [mapLoadError, setMapLoadError] = useState(false);
  const [mapInitError, setMapInitError] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(MARKET_VIEW_CONFIG[selectedMarket].zoom);
  const centerRef = useRef(MARKET_VIEW_CONFIG[selectedMarket].center);
  const getScaledMarkerSize = (baseSize: number) => {
    const baseZoom = MARKET_VIEW_CONFIG[selectedMarket].zoom;
    const z = Number.isFinite(zoomLevel) ? zoomLevel : baseZoom;
    const zoomGap = z - baseZoom;
    // 줌 아웃(음수 갭)일수록 작게, 줌 인일수록 크게 — 화면 비율에 더 가깝게
    const scaled = Math.round(baseSize * 1.12 ** zoomGap);
    return Math.max(5, Math.min(32, scaled));
  };

  const clientId = import.meta.env.VITE_NAVER_MAP_CLIENT_ID as string | undefined;
  const isPlaceholderClientId = !clientId || clientId === "your_naver_map_client_id";

  useEffect(() => {
    if (!clientId || !mapContainerRef.current) return;
    let rafId: number | null = null;
    let cancelled = false;

    const initMap = () => {
      if (!window.naver?.maps || !mapContainerRef.current) {
        setMapInitError(true);
        return;
      }
      const { clientWidth, clientHeight } = mapContainerRef.current;
      if (clientWidth === 0 || clientHeight === 0) {
        if (!cancelled) rafId = window.requestAnimationFrame(initMap);
        return;
      }
      const view = MARKET_VIEW_CONFIG[selectedMarketRef.current];
      centerRef.current = view.center;
      const naver = window.naver;
      setMapLoadError(false);
      setMapInitError(false);

      // 커스텀 핀이 있으면 핀 위치에서 지도 시작 (시장 중심 대신)
      const pinForInit = customLocationPinRef.current;
      const initCenter = pinForInit
        ? { lat: pinForInit.lat, lng: pinForInit.lng }
        : view.center;

      mapRef.current = new naver.maps.Map(mapContainerRef.current, {
        center: new naver.maps.LatLng(initCenter.lat, initCenter.lng),
        zoom: view.zoom,
        mapTypeId: naver.maps.MapTypeId.NORMAL,
        scaleControl: false,
        logoControl: false,
        mapDataControl: false,
      });
      setZoomLevel(view.zoom);
      naver.maps.Event.addListener(mapRef.current, "zoom_changed", () => {
        const map = mapRef.current;
        if (!map || typeof map.getZoom !== "function") return;
        const next = Number(map.getZoom());
        if (Number.isFinite(next)) setZoomLevel(next);
      });

      const notifyDragStart = () => onMapDragStartRef.current?.();
      const notifyDragEnd = () => onMapDragEndRef.current?.();
      naver.maps.Event.addListener(mapRef.current, "dragstart", notifyDragStart);
      naver.maps.Event.addListener(mapRef.current, "dragend", notifyDragEnd);

      marketPolygonsRef.current = createMarketPolygons(mapRef.current, view);
      setMapInstanceEpoch((n) => n + 1);
    };

    if (window.naver?.maps) {
      initMap();
      return () => {
        cancelled = true;
        if (rafId !== null) window.cancelAnimationFrame(rafId);
      };
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-naver-map-sdk="true"]');
    if (existingScript) {
      if (window.naver?.maps) initMap();
      else existingScript.addEventListener("load", initMap, { once: true });
      return () => {
        existingScript.removeEventListener("load", initMap);
        cancelled = true;
        if (rafId !== null) window.cancelAnimationFrame(rafId);
      };
    }

    const script = document.createElement("script");
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`;
    script.async = true;
    script.dataset.naverMapSdk = "true";
    script.onload = initMap;
    script.onerror = () => setMapLoadError(true);
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      clearMarketPolygons(marketPolygonsRef.current);
      marketPolygonsRef.current = [];
      clearStoreMarkers(storeMarkersRef.current);
      storeMarkersRef.current = [];
      clearStoreMarkers(facilityMarkersRef.current);
      facilityMarkersRef.current = [];
      script.onload = null;
      script.onerror = null;
    };
  }, []);

  useEffect(() => {
    if (!window.naver?.maps || !mapRef.current) return;
    const view = MARKET_VIEW_CONFIG[selectedMarket];
    centerRef.current = view.center;
    const naver = window.naver;
    const map = mapRef.current;

    const isInitial = isInitialMarketEffectRef.current;
    isInitialMarketEffectRef.current = false;

    // 초기 마운트이고 커스텀 핀이 있으면 시장 중심으로 이동하지 않음
    // (initMap에서 이미 핀 위치로 지도를 초기화했기 때문)
    if (!(isInitial && customLocationPinRef.current)) {
      map.setCenter(new naver.maps.LatLng(view.center.lat, view.center.lng));
      map.setZoom(view.zoom);
      setZoomLevel(view.zoom);
    }

    clearMarketPolygons(marketPolygonsRef.current);
    marketPolygonsRef.current = createMarketPolygons(map, view);
  }, [selectedMarket]);

  useEffect(() => {
    if (!window.naver?.maps || !mapRef.current) return;
    const naver = window.naver;
    const map = mapRef.current;
    const center = centerRef.current;

    clearStoreMarkers(storeMarkersRef.current);
    storeMarkersRef.current = visibleStores.map((store) => {
      const point = getStoreLatLng(store, center);
      const isHighlighted = highlightedStore?.id === store.id;
      const circleSize = getScaledMarkerSize(isHighlighted ? 16 : 12);
      const icon = buildStoreMarkerIcon(naver, store, { highlighted: isHighlighted, circleSize });
      const marker = new naver.maps.Marker({
        map,
        position: new naver.maps.LatLng(point.lat, point.lng),
        title: store.name,
        zIndex: isHighlighted ? 80 : 20,
        icon: {
          content: icon.content,
          size: icon.size,
          anchor: icon.anchor,
        },
      });
      naver.maps.Event.addListener(marker, "click", () => {
        onSelectStore(store);
      });
      return marker;
    });
  }, [visibleStores, highlightedStore, onSelectStore, zoomLevel, selectedMarket, mapInstanceEpoch]);

  useEffect(() => {
    if (!window.naver?.maps || !mapRef.current) return;
    const naver = window.naver;
    const map = mapRef.current;

    clearStoreMarkers(facilityMarkersRef.current);
    facilityMarkersRef.current = facilities.map((facility) => {
      const markerSize = getScaledMarkerSize(15);
      const icon = buildFacilityMarkerIcon(naver, facility.color || "#2563eb", markerSize);
      const marker = new naver.maps.Marker({
        map,
        position: new naver.maps.LatLng(facility.lat, facility.lng),
        title: facility.name,
        zIndex: 15,
        icon: {
          content: icon.content,
          size: icon.size,
          anchor: icon.anchor,
        },
      });
      naver.maps.Event.addListener(marker, "click", () => {
        onSelectFacility(facility);
      });
      return marker;
    });
  }, [facilities, zoomLevel, selectedMarket, onSelectFacility, mapInstanceEpoch]);

  useEffect(() => {
    if (!window.naver?.maps || !mapRef.current) return;
    const naver = window.naver;
    const map = mapRef.current;
    const el = mapContainerRef.current;
    if (!el) return;

    const resizeMap = () => {
      naver.maps.Event.trigger(map, "resize");
      map.setSize(new naver.maps.Size(el.clientWidth, el.clientHeight));
      // 커스텀 핀 표시 중에는 pinRef 위치를 유지 (시장 중심으로 리셋하지 않음)
      const pin = customLocationPinRef.current;
      const center = pin ? { lat: pin.lat, lng: pin.lng } : centerRef.current;
      map.setCenter(new naver.maps.LatLng(center.lat, center.lng));
    };

    resizeMap();
    const t = window.setTimeout(resizeMap, 350);

    const ro = new ResizeObserver(() => {
      window.requestAnimationFrame(resizeMap);
    });
    ro.observe(el);

    return () => {
      window.clearTimeout(t);
      ro.disconnect();
    };
  }, [selectedMarket, mapInstanceEpoch]);

  useEffect(() => {
    const handler = (event: Event) => {
      if (!window.naver?.maps || !mapRef.current) return;
      const custom = event as CustomEvent<{ lat: number; lng: number }>;
      const detail = custom.detail;
      if (!detail) return;
      mapRef.current.panTo(new window.naver.maps.LatLng(detail.lat, detail.lng));
    };

    window.addEventListener("move-to-current-location", handler);
    return () => window.removeEventListener("move-to-current-location", handler);
  }, []);

  /** 하이라이트 상점을 목표 Y(highlightBandCenterY)에 정확히 표시
   * fromCoordToOffset → 핀의 현재 컨테이너 좌표 측정
   * fromOffsetToCoord → 핀이 desiredY에 오도록 새 맵 중심 계산
   * 단일 panTo로 타이밍 이슈 없이 이동
   */
  useEffect(() => {
    if (!window.naver?.maps || !mapRef.current || !highlightedStore) return;
    if (highlightBandCenterY == null || !Number.isFinite(highlightBandCenterY)) return;
    // 지도 드래그 직후에는 pan 억제 (사용자가 보던 위치 유지)
    if (suppressHighlightPanRef?.current) return;
    const map = mapRef.current;
    const naver = window.naver;
    const center = centerRef.current;
    const { lat, lng } = getStoreLatLng(highlightedStore, center);
    const latlng = new naver.maps.LatLng(lat, lng);

    const proj = map.getProjection?.();
    const el = mapContainerRef.current;

    // projection 미지원 시 단순 panTo fallback
    if (
      !proj ||
      typeof proj.fromCoordToOffset !== "function" ||
      typeof proj.fromOffsetToCoord !== "function" ||
      !el
    ) {
      map.panTo(latlng);
      return;
    }

    try {
      const offset = proj.fromCoordToOffset(latlng) as { x: number; y: number };
      const mapTop = el.getBoundingClientRect().top;
      const desiredY = highlightBandCenterY - mapTop; // 컨테이너 기준 목표 Y
      const W = el.clientWidth;
      const H = el.clientHeight;
      const dy = offset.y - desiredY;   // 세로: 핀을 desiredY로
      const dx = offset.x - W / 2;     // 가로: 핀을 화면 중앙(X)으로

      if (!Number.isFinite(dy) || !Number.isFinite(dx)) { map.panTo(latlng); return; }

      // 새 맵 중심 = (핀 X 중앙 정렬 + 핀 Y를 desiredY로) 위치
      const newCenter = proj.fromOffsetToCoord(
        new naver.maps.Point(W / 2 + dx, H / 2 + dy)
      ) as naver.maps.LatLng;
      map.panTo(newCenter);
    } catch {
      map.panTo(latlng);
    }
  }, [highlightedStore?.id, highlightBandCenterY, mapInstanceEpoch]);

  /** 커스텀 빨간 핀 마커 (포스트에서 직접 찍은 장소) */
  useEffect(() => {
    if (!window.naver?.maps || !mapRef.current) return;
    const naver = window.naver;
    let timerId: ReturnType<typeof setTimeout> | undefined;

    if (customPinMarkerRef.current) {
      customPinMarkerRef.current.setMap(null);
      customPinMarkerRef.current = null;
    }

    if (customLocationPin) {
      const pinHtml = `<div style="width:28px;height:36px;display:flex;justify-content:center;align-items:flex-start;cursor:pointer;">
        <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 0C8.477 0 4 4.477 4 10c0 7.18 10 22 10 22s10-14.82 10-22c0-5.523-4.477-10-10-10z" fill="#EF4444"/>
          <circle cx="14" cy="10" r="4" fill="white"/>
        </svg>
      </div>`;
      const marker = new naver.maps.Marker({
        map: mapRef.current,
        position: new naver.maps.LatLng(customLocationPin.lat, customLocationPin.lng),
        icon: { content: pinHtml, anchor: new naver.maps.Point(14, 36) },
        zIndex: 120,
      });
      naver.maps.Event.addListener(marker, "click", () => {
        onCustomPinClickRef.current?.();
      });
      customPinMarkerRef.current = marker;
      // highlightedStore 방식과 동일: 직접 panTo (resizeMap의 setCenter 버그 수정으로 타이밍 이슈 해소)
      mapRef.current.panTo(new naver.maps.LatLng(customLocationPin.lat, customLocationPin.lng));
    }

    return () => {
      if (timerId !== undefined) clearTimeout(timerId);
    };
  }, [customLocationPin, mapInstanceEpoch]);

  if (isPlaceholderClientId) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[12px] text-gray-500">
        네이버 지도 키를 `.env`에 실제 값으로 넣어주세요.
      </div>
    );
  }

  if (mapLoadError || mapInitError) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[12px] text-gray-500">
        네이버 지도 로딩에 실패했어요. 키 또는 도메인 등록을 확인해주세요.
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}

type CustomMapPin = {
  name: string;
  description: string;
  lat: number;
  lng: number;
  postId: number;
};

export function MapPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMarket, setSelectedMarket] = useState<MarketId>(() => {
    const param = new URLSearchParams(window.location.search).get("market");
    if (param === "jungang" || param === "byeongcheon" || param === "seonghwan") return param;
    return "byeongcheon";
  });

  /** URL ?store=<이름> 으로 진입 시 자동으로 해당 상점 상세를 열기 위한 초기값 */
  const initialStoreNameRef = useRef<string | null>(
    new URLSearchParams(window.location.search).get("store"),
  );
  const initialStoreOpenedRef = useRef(false);

  /** URL ?customPin=... 으로 진입 시 커스텀 핀 표시 */
  const [customMapPin, setCustomMapPin] = useState<CustomMapPin | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const name = params.get("customPin");
    const lat = parseFloat(params.get("lat") || "");
    const lng = parseFloat(params.get("lng") || "");
    const desc = params.get("desc") || "";
    const postId = parseInt(params.get("postId") || "0", 10);
    if (name && Number.isFinite(lat) && Number.isFinite(lng) && postId) {
      return { name: decodeURIComponent(name), description: decodeURIComponent(desc), lat, lng, postId };
    }
    return null;
  });
  /** 카드 열림 여부 (핀 자체와 분리 — X는 카드만 닫고 핀은 유지) */
  const [customPinCardOpen, setCustomPinCardOpen] = useState<boolean>(() => {
    return !!new URLSearchParams(window.location.search).get("customPin");
  });
  /** 매 렌더마다 새 객체 생성 방지 → customLocationPin 동일성 보장 (드래그 시 재팬 방지) */
  const customLocationPinForMap = useMemo(
    () => customMapPin ? { name: customMapPin.name, lat: customMapPin.lat, lng: customMapPin.lng } : null,
    [customMapPin],
  );

  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>("전체");
  const [selectedStore, setSelectedStore] = useState<StoreData | null>(null);
  /** 지도·목록에서 고른 뒤 상세 시트 열기 전 단계(상점바 미리보기 카드) */
  const [barPreviewStore, setBarPreviewStore] = useState<StoreData | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<DraftFacilityPin | null>(null);
  const [storeSheetOpen, setStoreSheetOpen] = useState(false);
  const [facilitySheetOpen, setFacilitySheetOpen] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [pendingCartItem, setPendingCartItem] = useState<CartItem | null>(null);
  const [likedStores, setLikedStores] = useState<Set<number>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sharedStores, setSharedStores] = useState<DraftStorePin[] | null>(null);
  const [sharedFacilities, setSharedFacilities] = useState<DraftFacilityPin[] | null>(null);
  const [listActiveSnap, setListActiveSnap] = useState<number | null>(LIST_SNAP_MIN_FALLBACK);
  /** 지도 드래그 중: 상점 목록·헤더줄 숨기고 핸들(위로 당기기)만 표시 */
  const [isMapDragging, setIsMapDragging] = useState(false);
  /** 3단계(최대)에서 지도 드래그 중: 시트 전체 숨김(투명·클릭 통과), 끝나면 다시 최대로 */
  const [mapDragHideFullSheet, setMapDragHideFullSheet] = useState(false);
  const [scrollFocusedStoreId, setScrollFocusedStoreId] = useState<number | null>(null);
  /** 지도 드래그 직후 자동 pan 억제 — 목록 재스크롤 시 해제 */
  const suppressHighlightPanRef = useRef(false);
  /** 드래그 중 실시간 시트 높이(px). null이면 스냅 기반 높이 사용 */
  const [sheetDragH, setSheetDragH] = useState<number | null>(null);
  const listScrollRef = useRef<HTMLDivElement | null>(null);
  const listActiveSnapRef = useRef<number | null>(LIST_SNAP_MIN_FALLBACK);
  const listSnapMinRef = useRef(LIST_SNAP_MIN_FALLBACK);
  const listSnapMaxRef = useRef(0.9);
  const preMapDragSnapRef = useRef<number | null>(null);
  const listScrollRafRef = useRef<number | null>(null);
  const sheetDragRef = useRef<{ startY: number; startH: number; pointerId: number } | null>(null);
  const pageHeaderRef = useRef<HTMLDivElement | null>(null);
  const [headerBottomPx, setHeaderBottomPx] = useState(0);
  const [viewportH, setViewportH] = useState(() =>
    typeof window !== "undefined" ? window.visualViewport?.height ?? window.innerHeight : 640,
  );

  const { addItem, switchMarketAndAdd, totalCount } = useCart();

  useLayoutEffect(() => {
    const readVh = () => window.visualViewport?.height ?? window.innerHeight;
    const sync = () => setViewportH(readVh());
    sync();
    window.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("resize", sync);
    };
  }, []);

  useLayoutEffect(() => {
    const el = pageHeaderRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setHeaderBottomPx(r.bottom);
    };
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [selectedMarket, searchQuery, showFavoritesOnly, selectedCategory]);

  useEffect(() => {
    migrateLegacyOwnerDraftIfNeeded();
    let cancelled = false;
    const load = async () => {
      const remote = await loadOwnerCatalogRemote();
      if (!remote || cancelled) return;
      setSharedStores((remote.stores ?? []) as DraftStorePin[]);
      setSharedFacilities((remote.facilities ?? []) as DraftFacilityPin[]);
      saveOwnerCatalog(remote);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const allStores = useMemo(() => {
    const rawDrafts = sharedStores
      ? sharedStores.filter(
          (s) => s.marketId === selectedMarket && typeof s.lat === "number" && typeof s.lng === "number" && s.name,
        )
      : readAllRawDraftStores(selectedMarket);

    const maps = buildDraftOverridesForMarket(rawDrafts, selectedMarket);

    // 기존 시드 상점 (draft 오버라이드 적용)
    const seedStores = STORES_BY_MARKET[selectedMarket].map((store) => {
      const override = resolveDraftOverride(selectedMarket, store, maps);
      if (!override) {
        const pos = pickStoreDisplayLatLng(selectedMarket, store);
        return { ...store, lat: pos.lat, lng: pos.lng };
      }
      const nextName = override.name?.trim();
      const pos = pickStoreDisplayLatLng(selectedMarket, store, override);
      return {
        ...store,
        name: nextName || store.name,
        lat: pos.lat,
        lng: pos.lng,
        image: override.image || store.image,
        description: override.description || store.description,
        location: override.location || store.location,
        hours: override.hours || store.hours,
        phone: override.phone || store.phone,
        category: (override.category as CategoryKey) || store.category,
        menus:
          override.menus?.length
            ? override.menus.map((menu) => ({
                id: String(menu.id),
                name: menu.name,
                price: Number(menu.price) || 0,
              }))
            : store.menus,
      };
    });

    // 관리자에서 새로 추가한 상점 (시드에 없는 상점) 추가
    const newStores = draftOnlyToStoreData(rawDrafts, selectedMarket);

    return [...seedStores, ...newStores];
  }, [selectedMarket, sharedStores]);
  const marketInfo = MARKET_INFO[selectedMarket];
  const facilities = useMemo(() => {
    const source = sharedFacilities ?? loadOwnerCatalog().facilities ?? [];
    return source.filter((facility) => facility.marketId === selectedMarket);
  }, [selectedMarket, sharedFacilities]);

  const filteredStores = useMemo(
    () =>
      allStores.filter((s) => {
        const matchFav = !showFavoritesOnly || likedStores.has(s.id);
        const matchCat = showFavoritesOnly || selectedCategory === "전체" || s.category === selectedCategory;
        const matchSearch =
          !searchQuery || s.name.includes(searchQuery) || s.category.includes(searchQuery) || s.location.includes(searchQuery);
        return matchFav && matchCat && matchSearch;
      }),
    [allStores, showFavoritesOnly, likedStores, selectedCategory, searchQuery],
  );

  /** URL ?store=<이름>으로 진입했을 때 allStores가 준비되면
   *  해당 핀을 하이라이트하고 미리보기 카드만 표시한다 (상세 시트는 열지 않음) */
  useEffect(() => {
    const targetName = initialStoreNameRef.current;
    if (!targetName || initialStoreOpenedRef.current || allStores.length === 0) return;
    const found = allStores.find((s) => s.name === decodeURIComponent(targetName));
    if (found) {
      initialStoreOpenedRef.current = true;
      setBarPreviewStore(found);
      setSelectedStore(null);
      setStoreSheetOpen(false);
      setFacilitySheetOpen(false);
      setListActiveSnap(listSnapMinRef.current);
    }
  }, [allStores]);

  /** 최소 스냅: 핸들 + 시장명·개수 한 줄 — 픽셀 확보 후 비율로 변환(짧은 뷰포트에서 상한만으로 잘리지 않게) */
  const listSnapMin = useMemo(() => {
    const vh = Math.max(360, viewportH);
    const minBarPx = 80;
    const ratio = minBarPx / vh;
    return Math.min(0.24, Math.max(0.085, ratio));
  }, [viewportH]);

  /**
   * 최대 스냅: 카테고리 바로 아래까지 (뷰포트 기준 비율)
   * 공식: (뷰포트 - 헤더하단 - 네비바 - 여백) / 뷰포트
   * 네비바 56px(3.5rem) + 안전마진 8px = 64px
   */
  const listSnapMax = useMemo(() => {
    const vh = Math.max(360, viewportH);
    const hb = headerBottomPx > 12 ? headerBottomPx : Math.min(220, vh * 0.26);
    const navH = 64; // 3.5rem + safe-area buffer
    const gap = 8;
    const availableH = vh - hb - navH - gap;
    const next = availableH / vh;
    return Math.max(LIST_SNAP_MID + 0.04, Math.min(0.85, next));
  }, [viewportH, headerBottomPx]);

  listSnapMinRef.current = listSnapMin;
  listSnapMaxRef.current = listSnapMax;

  const isStoreSheetCollapsed = isSnapNearTarget(listActiveSnap, listSnapMin);

  useLayoutEffect(() => {
    listActiveSnapRef.current = listActiveSnap;
    listSnapMaxRef.current = listSnapMax;
  }, [listActiveSnap, listSnapMax]);

  useLayoutEffect(() => {
    setListActiveSnap((prev) => {
      if (prev == null) return listSnapMin;
      let next = prev;
      if (next > listSnapMax) next = listSnapMax;
      if (next < listSnapMin) next = listSnapMin;
      return next === prev ? prev : next;
    });
  }, [listSnapMax, listSnapMin]);

  const mapHighlightStore = useMemo(() => {
    if (storeSheetOpen && selectedStore) return selectedStore;
    // 중간 스냅(목록 모드)일 때는 스크롤 하이라이트가 핀 클릭보다 우선
    if (isSnapNearTarget(listActiveSnap, LIST_SNAP_MID) && scrollFocusedStoreId != null) {
      return filteredStores.find((s) => s.id === scrollFocusedStoreId) ?? null;
    }
    if (barPreviewStore) return barPreviewStore;
    return null;
  }, [storeSheetOpen, selectedStore, barPreviewStore, listActiveSnap, scrollFocusedStoreId, filteredStores]);

  /** 하이라이트 패닝 목표 Y: 가시 지도 영역(헤더 ~ 상점창 상단)의 상단 35% 지점
   * 상점창에 핀이 가려지지 않도록 위쪽에 표시
   */
  const mapHighlightBandCenterY = useMemo(() => {
    if (storeSheetOpen) return null;
    const vh = Math.max(360, viewportH);
    const snap = listActiveSnap ?? listSnapMin;
    const navH = 64;
    const sheetTop = vh * (1 - snap) - navH;          // 상점창 실제 상단 Y
    const hb = headerBottomPx > 12 ? headerBottomPx : Math.min(220, vh * 0.26);
    const visibleH = Math.max(60, sheetTop - hb);     // 가시 지도 높이
    return hb + visibleH * 0.55;                      // 가시 영역 상단 55% 지점
  }, [storeSheetOpen, viewportH, listActiveSnap, listSnapMin, headerBottomPx]);

  useEffect(() => {
    if (!barPreviewStore) return;
    if (!filteredStores.some((s) => s.id === barPreviewStore.id)) setBarPreviewStore(null);
  }, [filteredStores, barPreviewStore]);

  const handleMapDragStart = useCallback(() => {
    const snap = listActiveSnapRef.current ?? listSnapMinRef.current;
    const max = listSnapMaxRef.current;
    preMapDragSnapRef.current = snap;
    suppressHighlightPanRef.current = true; // 드래그 시작 → pan 억제
    setIsMapDragging(true);
    setCustomPinCardOpen(false); // 드래그하면 커스텀 핀 카드 닫기 (핀은 유지)

    if (typeof snap === "number" && typeof max === "number" && Math.abs(snap - max) < 0.04) {
      setStoreSheetOpen(false);
      setBarPreviewStore(null);
      setMapDragHideFullSheet(true);
      return;
    }

    if (typeof snap === "number" && Math.abs(snap - listSnapMinRef.current) < 0.05) {
      setStoreSheetOpen(false);
      setBarPreviewStore(null);
      return;
    }

    setListActiveSnap(listSnapMinRef.current);
    setStoreSheetOpen(false);
    setBarPreviewStore(null);
  }, []);

  const handleMapDragEnd = useCallback(() => {
    const before = preMapDragSnapRef.current;
    const max = listSnapMaxRef.current;

    setIsMapDragging(false);
    setMapDragHideFullSheet(false);

    // 최대 스냅이었을 때만 원래대로 복원, 중간·최소는 최소 유지
    if (typeof before === "number" && typeof max === "number" && Math.abs(before - max) < 0.04) {
      setListActiveSnap(max);
      return;
    }
    setListActiveSnap(listSnapMinRef.current);
  }, []);

  useEffect(() => {
    if (!isSnapNearTarget(listActiveSnap, LIST_SNAP_MID)) {
      setScrollFocusedStoreId(null);
    }
  }, [listActiveSnap]);

  const updateScrollFocusedFromList = useCallback(() => {
    if (!isSnapNearTarget(listActiveSnapRef.current, LIST_SNAP_MID)) return;
    const root = listScrollRef.current;
    // 목록 스크롤 → 드래그 억제 해제 (사용자가 다시 목록 조작 중)
    suppressHighlightPanRef.current = false;
    if (!root) return;
    const rows = Array.from(root.querySelectorAll<HTMLElement>("[data-store-row]"));
    if (!rows.length) return;

    const scrollTop = root.scrollTop;
    const scrollMax = root.scrollHeight - root.clientHeight;
    // 스크롤 비율 (0=맨위, 1=맨아래)
    const ratio = scrollMax > 4 ? Math.min(1, scrollTop / scrollMax) : 0;

    let targetRow: HTMLElement | null = null;
    if (ratio < 0.05) {
      // 맨 위 → 첫 번째 항목
      targetRow = rows[0];
    } else if (ratio > 0.95) {
      // 맨 아래 → 마지막 항목
      targetRow = rows[rows.length - 1];
    } else {
      // 중간 → 스크롤 컨테이너 중앙과 가장 가까운 항목
      const containerTop = root.getBoundingClientRect().top;
      const midY = containerTop + root.clientHeight / 2;
      let bestDist = Infinity;
      for (const row of rows) {
        const r = row.getBoundingClientRect();
        // 화면에 일부라도 보이는 항목만 대상
        if (r.bottom <= containerTop || r.top >= containerTop + root.clientHeight) continue;
        const d = Math.abs(r.top + r.height / 2 - midY);
        if (d < bestDist) { bestDist = d; targetRow = row; }
      }
    }

    const id = targetRow ? Number(targetRow.dataset.storeId) : null;
    if (id != null && Number.isFinite(id)) {
      setScrollFocusedStoreId((prev) => (prev === id ? prev : id));
    }
  }, []);

  useEffect(() => {
    if (!isSnapNearTarget(listActiveSnap, LIST_SNAP_MID)) return;
    const root = listScrollRef.current;
    if (!root) return;
    const onScroll = () => {
      if (listScrollRafRef.current != null) cancelAnimationFrame(listScrollRafRef.current);
      listScrollRafRef.current = requestAnimationFrame(() => {
        listScrollRafRef.current = null;
        updateScrollFocusedFromList();
      });
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    updateScrollFocusedFromList();
    return () => {
      root.removeEventListener("scroll", onScroll);
      if (listScrollRafRef.current != null) cancelAnimationFrame(listScrollRafRef.current);
    };
  }, [listActiveSnap, filteredStores, updateScrollFocusedFromList]);

  const toggleLike = (storeId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedStores((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) next.delete(storeId);
      else next.add(storeId);
      return next;
    });
  };

  const handleMarketChange = (id: MarketId) => {
    setSelectedMarket(id);
    setSelectedCategory("전체");
    setSelectedStore(null);
    setBarPreviewStore(null);
    setSelectedFacility(null);
    setStoreSheetOpen(false);
    setFacilitySheetOpen(false);
    setSearchQuery("");
    setListActiveSnap(listSnapMin);
  };

  const handleAddToCart = (menu: MenuItem, store: StoreData) => {
    const cartItem: CartItem = {
      id: menu.id, name: menu.name, storeName: store.name, storeId: store.id,
      marketId: selectedMarket, price: menu.price, quantity: 1, image: store.image,
    };
    const result = addItem(cartItem);
    if (result === "market_conflict") {
      setPendingCartItem(cartItem);
      setShowConflictModal(true);
    } else if (result === "added") {
      // 담기 성공 - 추가 처리 없음 (버튼은 항상 활성 상태 유지)
    }
  };

  const badgeStyle = (badge?: string) => {
    if (!badge) return "";
    if (badge === "마감할인") return "bg-red-50 text-red-600";
    if (badge === "인기") return "bg-orange-50 text-orange-600";
    if (badge === "신선") return "bg-green-50 text-green-600";
    if (badge === "특산물") return "bg-amber-50 text-amber-600";
    if (badge === "대표맛집") return "bg-purple-50 text-purple-600";
    return "bg-gray-100 text-gray-600";
  };

  const handleSheetPointerDown = useCallback((e: React.PointerEvent) => {
    const currentSnap = listActiveSnapRef.current ?? listSnapMinRef.current;
    const startH = Math.round(currentSnap * viewportH);
    sheetDragRef.current = { startY: e.clientY, startH, pointerId: e.pointerId };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [viewportH]);

  const handleSheetPointerMove = useCallback((e: React.PointerEvent) => {
    const drag = sheetDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const delta = drag.startY - e.clientY;
    const maxH = Math.round(listSnapMaxRef.current * viewportH);
    const newH = Math.max(
      Math.round(listSnapMinRef.current * viewportH),
      Math.min(maxH, drag.startH + delta),
    );
    setSheetDragH(newH);
  }, [viewportH]);

  const handleSheetPointerUp = useCallback((e: React.PointerEvent) => {
    const drag = sheetDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    sheetDragRef.current = null;
    setSheetDragH(null);
    const delta = drag.startY - e.clientY;
    const finalH = drag.startH + delta;
    const vh = viewportH;
    const pts = [listSnapMinRef.current, LIST_SNAP_MID, listSnapMaxRef.current];
    const nearest = pts.reduce((best, p) =>
      Math.abs(p * vh - finalH) < Math.abs(best * vh - finalH) ? p : best, pts[0]);
    setListActiveSnap(nearest);
  }, [viewportH]);

  const moveToCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!window.naver?.maps) return;
        const event = new CustomEvent("move-to-current-location", {
          detail: { lat: position.coords.latitude, lng: position.coords.longitude },
        });
        window.dispatchEvent(event);
      },
      () => {
        // Keep UI silent for denied permissions.
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <div
      className="relative flex flex-col overflow-hidden bg-[#F7F8FA]"
      style={{ height: "calc(100dvh - 3.5rem - env(safe-area-inset-bottom, 0px))" }}
    >
      <MarketConflictModal
        open={showConflictModal}
        onConfirm={() => { if (pendingCartItem) switchMarketAndAdd(pendingCartItem); setShowConflictModal(false); setPendingCartItem(null); }}
        onCancel={() => { setShowConflictModal(false); setPendingCartItem(null); }}
      />

      {/* Header */}
      <div ref={pageHeaderRef} className="z-30 shrink-0 border-b border-gray-100 bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 px-4 py-2.5">
          <Link to="/home" className="p-1"><ChevronLeft className="w-5 h-5 text-gray-700" /></Link>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={`${marketInfo.name}에서 검색`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 h-9 rounded-lg bg-gray-100 text-[14px] focus:outline-none focus:ring-1 focus:ring-gray-300"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
          <Link to="/cart" className="p-1 relative">
            <ShoppingCart className="w-5 h-5 text-gray-700" />
            {totalCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#0EA5E9] text-white text-[10px] min-w-[16px] h-4 rounded-full flex items-center justify-center px-1">
                {totalCount}
              </span>
            )}
          </Link>
        </div>
        {/* Market tabs */}
        <div className="flex">
          {(Object.entries(MARKET_INFO) as [MarketId, typeof MARKET_INFO.jungang][]).map(([id, info]) => (
            <button
              key={id}
              onClick={() => handleMarketChange(id)}
              className={`flex-1 py-2.5 text-[13px] transition-all border-b-2 ${
                selectedMarket === id ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400"
              }`}
            >
              {info.name}
            </button>
          ))}
        </div>
        {/* Category chips */}
        <div className="flex gap-1.5 overflow-x-auto px-4 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => { setShowFavoritesOnly((v) => !v); setSelectedStore(null); setBarPreviewStore(null); setStoreSheetOpen(false); }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg whitespace-nowrap text-[12px] transition-all flex-shrink-0 ${
              showFavoritesOnly ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            <Heart className={`w-3 h-3 ${showFavoritesOnly ? "fill-white" : "text-red-400"}`} />
            단골
            {likedStores.size > 0 && (
              <span className={`text-[10px] ml-0.5 ${showFavoritesOnly ? "text-gray-300" : "text-gray-400"}`}>
                {likedStores.size}
              </span>
            )}
          </button>
          {CATEGORIES.map((cat) => {
            const isActive = !showFavoritesOnly && selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => { setShowFavoritesOnly(false); setSelectedCategory(cat); setSelectedStore(null); setBarPreviewStore(null); setStoreSheetOpen(false); }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg whitespace-nowrap text-[12px] transition-all flex-shrink-0 ${
                  isActive ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Map — 헤더 아래·하단 탭 위까지 전체 (배민식 풀맵 + 드로어) */}
      <div className="relative z-[1] min-h-0 w-full flex-1 bg-white">
        <div className="absolute inset-0 overflow-hidden">
          <NaverMarketMap
            selectedMarket={selectedMarket}
            visibleStores={filteredStores}
            facilities={facilities}
            highlightedStore={mapHighlightStore}
            highlightBandCenterY={mapHighlightBandCenterY}
            onSelectStore={(store) => {
              suppressHighlightPanRef.current = false; // 핀 클릭 → pan 허용
              setBarPreviewStore(store);
              setSelectedFacility(null);
              setStoreSheetOpen(false);
              setFacilitySheetOpen(false);
              setListActiveSnap(listSnapMin);
            }}
            onSelectFacility={(facility) => {
              setSelectedFacility(facility);
              setSelectedStore(null);
              setBarPreviewStore(null);
              setStoreSheetOpen(false);
              setFacilitySheetOpen(true);
            }}
            onMapDragStart={handleMapDragStart}
            onMapDragEnd={handleMapDragEnd}
            onDeselect={() => setBarPreviewStore(null)}
            suppressHighlightPanRef={suppressHighlightPanRef}
            customLocationPin={customLocationPinForMap}
            onCustomPinClick={() => setCustomPinCardOpen(true)}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 top-0">
            <div className="pointer-events-auto absolute bottom-3 left-3 rounded-md bg-white px-2 py-1 text-[11px] text-gray-500 shadow-md">
              {filteredStores.length}개 상점
            </div>
            <button
              type="button"
              onClick={moveToCurrentLocation}
              className="pointer-events-auto absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md"
              aria-label="현재 위치로 이동"
            >
              <MapPin className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      {/* 핀 클릭 시 상점 요약 카드 */}
      {barPreviewStore && isStoreSheetCollapsed && (
        <div
          className="fixed left-0 right-0 z-[142] mx-auto max-w-md px-3 pointer-events-auto"
          style={{
            bottom: `calc(3.5rem + env(safe-area-inset-bottom, 0px) + ${Math.round(listSnapMin * viewportH) + 10}px)`,
          }}
        >
          <div
            className="relative bg-white rounded-2xl shadow-[0_4px_28px_rgba(0,0,0,0.18)] overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
            onClick={() => {
              setSelectedStore(barPreviewStore);
              setFacilitySheetOpen(false);
              setStoreSheetOpen(true);
            }}
          >
            <div className="flex">
              {/* 왼쪽: 상점 정보 */}
              <div className="flex-1 p-3.5 min-w-0">
                <h3 className="text-[15px] font-semibold text-gray-900 truncate">{barPreviewStore.name}</h3>
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-[12px] font-medium text-gray-700">{barPreviewStore.rating}</span>
                  <span className="text-gray-300 mx-0.5">·</span>
                  <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className="text-[11px] text-gray-500 truncate">{barPreviewStore.location}</span>
                </div>
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  {barPreviewStore.badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${badgeStyle(barPreviewStore.badge)}`}>{barPreviewStore.badge}</span>
                  )}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{barPreviewStore.category}</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-2">카드를 눌러 상세·메뉴 보기</p>
              </div>
              {/* 오른쪽: 대표 이미지 */}
              <div className="flex-none py-2 flex items-center">
                <div className="w-[120px] h-[90px] rounded-xl overflow-hidden mr-[30px]">
                  <img src={barPreviewStore.image} alt={barPreviewStore.name} className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
            {/* 닫기 버튼 */}
            <button
              className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center"
              onClick={(e) => { e.stopPropagation(); setBarPreviewStore(null); }}
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* 커스텀 장소 핀 카드 — customPinCardOpen일 때만 표시. 핀 마커 자체는 customMapPin 있으면 항상 표시 */}
      {customMapPin && customPinCardOpen && isStoreSheetCollapsed && !barPreviewStore && (
        <div
          className="fixed left-0 right-0 z-[142] mx-auto max-w-md px-3 pointer-events-auto"
          style={{
            bottom: `calc(3.5rem + env(safe-area-inset-bottom, 0px) + ${Math.round(listSnapMin * viewportH) + 10}px)`,
          }}
        >
          <div className="relative bg-white rounded-2xl shadow-[0_4px_28px_rgba(0,0,0,0.18)] overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-gray-900">{customMapPin.name}</p>
                {customMapPin.description && (
                  <p className="text-[11px] text-gray-400 mt-0.5">{customMapPin.description}</p>
                )}
              </div>
              {/* X: 카드만 닫기 — 핀 마커는 지도에 그대로 유지 */}
              <button
                className="flex-shrink-0 w-5 h-5 rounded-full bg-black/40 flex items-center justify-center"
                onClick={() => setCustomPinCardOpen(false)}
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
            {/* 핀 삭제: 지도 뷰에서만 제거 (포스트 데이터는 유지) */}
            <button
              onClick={() => {
                setCustomMapPin(null);
                setCustomPinCardOpen(false);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-3 border-t border-gray-100 text-[13px] font-medium text-red-500 active:bg-red-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              핀 삭제하기
            </button>
          </div>
        </div>
      )}

      {/* Store list — custom snap bottom sheet */}
      <div
        className={cn(
          "fixed left-0 right-0 z-[141] mx-auto max-w-md flex flex-col bg-white rounded-t-2xl border border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.12)] overflow-hidden",
          STORE_SHEET_BOTTOM_CLASS,
          mapDragHideFullSheet && "pointer-events-none opacity-0",
        )}
        style={{
          height: sheetDragH != null
            ? `${sheetDragH}px`
            : `${Math.round((listActiveSnap ?? listSnapMin) * viewportH)}px`,
          maxHeight: `calc(100dvh - ${headerBottomPx > 12 ? headerBottomPx : Math.min(220, viewportH * 0.26)}px - 3.5rem - env(safe-area-inset-bottom, 0px) - 8px)`,
          transition: sheetDragH != null ? "none" : "height 0.32s cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        {/* 항상 표시되는 탭 헤더 — 드래그 핸들 */}
        <div
          className="shrink-0 cursor-grab active:cursor-grabbing select-none touch-none"
          onPointerDown={handleSheetPointerDown}
          onPointerMove={handleSheetPointerMove}
          onPointerUp={handleSheetPointerUp}
          onPointerCancel={handleSheetPointerUp}
        >
          {isStoreSheetCollapsed ? (
            <div className="flex justify-center pb-1.5 pt-2.5">
              <ChevronUp className="w-7 h-7 text-gray-400" strokeWidth={2.25} />
            </div>
          ) : (
            <div className="mx-auto mb-2 mt-3 h-1 w-10 rounded-full bg-gray-300" />
          )}
          <div className="flex items-center justify-between px-4 pb-3.5 pt-0.5">
            <span className="text-[14px] font-semibold leading-snug text-gray-900">{marketInfo.name}</span>
            <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-[12px] leading-snug text-gray-500">{filteredStores.length}개</span>
          </div>
        </div>
        {/* 목록 영역 — 최소 스냅일 때 CSS로 숨김(스크롤 위치 보존을 위해 언마운트 안 함) */}
        <div
          className="border-t border-gray-100 flex min-h-0 flex-1 flex-col overflow-hidden"
          style={{ visibility: isStoreSheetCollapsed ? "hidden" : "visible" }}
          aria-hidden={isStoreSheetCollapsed}
        >
          <div className="h-2 shrink-0" />
          <div
            ref={listScrollRef}
            style={{ touchAction: "pan-y" }}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pb-3 [-webkit-overflow-scrolling:touch]"
          >
        {filteredStores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Search className="w-8 h-8 mb-2 text-gray-300" />
            <p className="text-[13px]">{showFavoritesOnly ? "단골 매장이 없어요" : "검색 결과가 없어요"}</p>
            {showFavoritesOnly && <p className="text-[11px] mt-1 text-gray-300">매장 카드의 하트를 눌러 등록하세요</p>}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredStores.map((store) => (
              <div
                key={store.id}
                data-store-id={store.id}
                data-store-row="1"
                className="bg-gray-50 rounded-xl overflow-hidden active:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedStore(store);
                  setBarPreviewStore(null);
                  setFacilitySheetOpen(false);
                  setStoreSheetOpen(true);
                }}
              >
                <div className="flex gap-2.5 p-2.5">
                  <div className="flex-none w-[60px] h-[60px] rounded-lg overflow-hidden">
                    <img src={store.image} alt={store.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-[13px] font-medium text-gray-900">{store.name}</h3>
                        {store.badge && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${badgeStyle(store.badge)}`}>{store.badge}</span>
                        )}
                      </div>
                      <button onClick={(e) => toggleLike(store.id, e)} className="flex-shrink-0 ml-1 p-0.5">
                        <Heart className={`w-3.5 h-3.5 ${likedStores.has(store.id) ? "fill-red-500 text-red-500" : "text-gray-300"}`} />
                      </button>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                      <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                      <span className="truncate">{store.location}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[10px] text-gray-400">{store.hours}</span>
                      <div className="flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                        <span className="text-[11px] text-gray-600">{store.rating}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 mt-1.5">
                      <button className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white border border-gray-200 text-[10px] text-gray-600" onClick={(e) => e.stopPropagation()}>
                        <Phone className="w-2.5 h-2.5" />전화
                      </button>
                      <Link
                        to={`/chat?store=${encodeURIComponent(store.name)}`}
                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white border border-gray-200 text-[10px] text-gray-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageCircle className="w-2.5 h-2.5" />채팅
                      </Link>
                      <button
                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-gray-800 text-white text-[10px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (store.menus.length > 0) handleAddToCart(store.menus[0], store);
                        }}
                      >
                        <ShoppingCart className="w-2.5 h-2.5" />담기
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
          </div>
        </div>
      </div>

      {/* Store Detail Bottom Sheet (Vaul: drag from header/image; portal z-index above map) */}
      {selectedStore && (
        <Drawer
          open={storeSheetOpen}
          onOpenChange={setStoreSheetOpen}
          onAnimationEnd={(open) => {
            if (!open) setSelectedStore(null);
          }}
          shouldScaleBackground={false}
          noBodyStyles
        >
          <DrawerContent
            className={cn(
              "mx-auto w-full max-w-md gap-0 rounded-t-2xl border-0 bg-white p-0",
              "data-[vaul-drawer-direction=bottom]:mt-0",
              "data-[vaul-drawer-direction=bottom]:max-h-[96dvh]",
              "[&>div:first-of-type]:hidden",
            )}
          >
            <DrawerTitle className="sr-only">{selectedStore.name}</DrawerTitle>
            <div className="flex h-[96dvh] flex-col overflow-hidden rounded-t-2xl bg-white">
              <div className="flex flex-shrink-0 justify-center pb-1 pt-3">
                <div className="h-1 w-10 rounded-full bg-gray-300" />
              </div>
              <div className="relative h-40 flex-shrink-0">
                <img src={selectedStore.image} alt={selectedStore.name} draggable={false} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <button
                  type="button"
                  onClick={() => setStoreSheetOpen(false)}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md text-gray-800"
                >
                  <X className="h-4 w-4 stroke-[2.5]" />
                </button>
                {selectedStore.badge && (
                  <span className={`absolute left-3 top-3 rounded px-2 py-0.5 text-[11px] ${badgeStyle(selectedStore.badge)}`}>
                    {selectedStore.badge}
                  </span>
                )}
                <div className="absolute bottom-3 left-4 right-4">
                  <h2 className="text-[17px] text-white">{selectedStore.name}</h2>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="text-[11px] text-white/70">{selectedStore.category}</span>
                    <div className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span className="text-[12px] text-white">{selectedStore.rating}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                <div className="space-y-1.5 border-b border-gray-100 py-3">
                  <p className="text-[13px] leading-relaxed text-gray-500">{selectedStore.description}</p>
                  <div className="flex items-center gap-2 text-[12px] text-gray-400">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{selectedStore.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-gray-400">
                    <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{selectedStore.hours}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-gray-400">
                    <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{selectedStore.phone}</span>
                  </div>
                </div>
                <div className="pt-3">
                  <h3 className="mb-2.5 text-[14px] text-gray-900">메뉴 / 상품</h3>
                  <div className="space-y-2">
                    {selectedStore.menus.map((menu) => {
                      return (
                        <div key={menu.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                          <div className="flex-1">
                            <p className="text-[14px] text-gray-800">{menu.name}</p>
                            <div className="mt-0.5 flex items-center gap-2">
                              <span className="text-[14px] text-gray-900">{menu.price.toLocaleString()}원</span>
                              {menu.originalPrice && (
                                <>
                                  <span className="text-[11px] text-gray-400 line-through">{menu.originalPrice.toLocaleString()}원</span>
                                  <span className="text-[11px] text-red-500">-{menu.discount}%</span>
                                </>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddToCart(menu, selectedStore)}
                            className="flex items-center gap-1 rounded-lg px-3 py-2 text-[12px] bg-gray-900 text-white active:bg-gray-700"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            담기
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button type="button" className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white border-2 border-gray-400 py-3 text-[13px] font-semibold text-gray-800 transition-colors active:bg-gray-50">
                      <Phone className="h-4 w-4" />
                      전화하기
                    </button>
                    <Link
                      to={`/chat?store=${encodeURIComponent(selectedStore.name)}`}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gray-900 py-3 text-[13px] text-white transition-colors active:bg-gray-800"
                      onClick={() => setStoreSheetOpen(false)}
                    >
                      <MessageCircle className="h-4 w-4" />
                      채팅하기
                    </Link>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStoreSheetOpen(false)}
                    className="mt-2 w-full py-3 text-[13px] font-semibold text-gray-800 border-2 border-gray-400 rounded-xl transition-colors active:bg-gray-50"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {selectedFacility && (
        <Drawer
          open={facilitySheetOpen}
          onOpenChange={setFacilitySheetOpen}
          onAnimationEnd={(open) => {
            if (!open) setSelectedFacility(null);
          }}
          shouldScaleBackground={false}
          noBodyStyles
        >
          <DrawerContent
            className={cn(
              "mx-auto w-full max-w-md gap-0 rounded-t-2xl border-0 bg-white p-0 mt-0 max-h-[80vh]",
              "[&>div:first-of-type]:hidden",
            )}
          >
            <DrawerTitle className="sr-only">{selectedFacility.name}</DrawerTitle>
            <div className="flex max-h-[80vh] flex-col overflow-hidden rounded-t-2xl bg-white">
              <div className="flex flex-shrink-0 justify-center pb-1 pt-3">
                <div className="h-1 w-10 rounded-full bg-gray-300" />
              </div>
              <div className="relative h-40 flex-shrink-0">
                {selectedFacility.image ? (
                  <img src={selectedFacility.image} alt={selectedFacility.name} draggable={false} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gray-200" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <button
                  type="button"
                  onClick={() => setFacilitySheetOpen(false)}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="absolute bottom-3 left-4 right-4">
                  <h2 className="text-[17px] text-white">{selectedFacility.name}</h2>
                  <p className="mt-0.5 text-[12px] text-white/80">편의시설</p>
                </div>
              </div>
              <div className="space-y-2 px-4 py-4">
                <div className="flex items-center gap-2 text-[12px] text-gray-500">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>
                    {selectedFacility.lat}, {selectedFacility.lng}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[12px] text-gray-500">
                  <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{selectedFacility.hours || "운영시간 정보 없음"}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFacilitySheetOpen(false)}
                  className="mt-2 w-full py-3 text-[13px] text-gray-400 transition-colors active:text-gray-600"
                >
                  닫기
                </button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}

      <BottomNav />
    </div>
  );
}