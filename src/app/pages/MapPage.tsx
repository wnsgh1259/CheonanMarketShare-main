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
import { PriceReportSheet } from "../components/PriceReportSheet";
import { Drawer, DrawerContent, DrawerTitle } from "../components/ui/drawer";
import { cn } from "../components/ui/utils";
import {
  STORES_BY_MARKET, MARKET_INFO,
  type CategoryKey, type StoreData, type MenuItem,
} from "../data/storeData";
import {
  loadOwnerCatalog,
  migrateLegacyOwnerDraftIfNeeded,
  refreshOwnerCatalogFromRemote,
} from "../data/ownerStoreData";
import { syntheticSeedStoreId } from "../data/seedStoreIds";
import { buildFacilityMarkerIcon, buildStoreMarkerIcon } from "../map/naverMarkerIcons";
import { MARKET_VIEW_CONFIG, pickStoreDisplayLatLng, toStoreLatLng } from "../map/storeMapPlacement";
import { clearMarketAreaOverlays, drawMarketAreaOverlays, type MarketAreaOverlays } from "../map/drawMarketArea";
import { hydrateMarketArea, resolveMarketView } from "../data/marketArea";
import {
  clearActiveNavRoute,
  loadActiveNavRoute,
  type ActiveNavRoute,
} from "../data/activeNavRoute";
import { hydrateWalkPathGraph } from "../data/walkPathSeed";
import {
  discountedPrice,
  formatDealClock,
  getActiveSlot,
  type StorePromotion,
} from "../data/storePromotion";

const CATEGORIES: CategoryKey[] = [
  "전체", "먹거리·분식", "정육·계란", "채소", "과일", "채소·과일", "수산물", "반찬·건어물", "기타·생활",
];

const CATEGORY_BUTTON_STYLE: Record<CategoryKey, { active: string; hover: string }> = {
  "전체": {
    active: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200",
    hover: "hover:bg-sky-50 hover:text-sky-700 hover:ring-1 hover:ring-inset hover:ring-sky-200",
  },
  "먹거리·분식": {
    active: "bg-orange-50 text-orange-800 ring-1 ring-inset ring-orange-200",
    hover: "hover:bg-orange-50 hover:text-orange-800 hover:ring-1 hover:ring-inset hover:ring-orange-200",
  },
  "정육·계란": {
    active: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
    hover: "hover:bg-rose-50 hover:text-rose-700 hover:ring-1 hover:ring-inset hover:ring-rose-200",
  },
  "채소": {
    active: "bg-[#EDF1E7] text-[#63734F] ring-1 ring-inset ring-[#DCE5D2]",
    hover: "hover:bg-[#EDF1E7] hover:text-[#63734F] hover:ring-1 hover:ring-inset hover:ring-[#DCE5D2]",
  },
  "과일": {
    active: "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-200",
    hover: "hover:bg-purple-50 hover:text-purple-700 hover:ring-1 hover:ring-inset hover:ring-purple-200",
  },
  "채소·과일": {
    active: "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200",
    hover: "hover:bg-emerald-50 hover:text-emerald-800 hover:ring-1 hover:ring-inset hover:ring-emerald-200",
  },
  "수산물": {
    active: "bg-cyan-50 text-cyan-800 ring-1 ring-inset ring-cyan-200",
    hover: "hover:bg-cyan-50 hover:text-cyan-800 hover:ring-1 hover:ring-inset hover:ring-cyan-200",
  },
  "반찬·건어물": {
    active: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
    hover: "hover:bg-amber-50 hover:text-amber-800 hover:ring-1 hover:ring-inset hover:ring-amber-200",
  },
  "기타·생활": {
    active: "bg-stone-100 text-stone-700 ring-1 ring-inset ring-stone-200",
    hover: "hover:bg-stone-100 hover:text-stone-700 hover:ring-1 hover:ring-inset hover:ring-stone-200",
  },
};

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
  promotion?: StorePromotion;
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

function createMarketAreaLayer(map: unknown, marketId: MarketId): MarketAreaOverlays {
  const naver = window.naver;
  const view = resolveMarketView(marketId);
  return drawMarketAreaOverlays(
    naver,
    map,
    { fillColor: view.fillColor, areaPaths: view.areaPaths },
    { showLabel: false, zIndex: 10 },
  );
}

function clearStoreMarkers(markers: NaverMarkerRef[]) {
  markers.forEach((marker) => {
    try {
      marker.setMap(null);
    } catch {
      /* 지도가 이미 정리된 경우 네이버 SDK가 예외를 던짐 */
    }
  });
}

type DraftOverrides = {
  byId: Map<number, DraftStorePin>;
  byName: Map<string, DraftStorePin>;
};

function emptyDraftOverrides(): DraftOverrides {
  return { byId: new Map(), byName: new Map() };
}

function usableLatLng(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
}

function buildDraftOverridesForMarket(stores: DraftStorePin[], marketId: MarketId): DraftOverrides {
  const byId = new Map<number, DraftStorePin>();
  const byName = new Map<string, DraftStorePin>();
  for (const store of stores) {
    if (
      store.marketId !== marketId ||
      typeof store.lat !== "number" ||
      typeof store.lng !== "number" ||
      !usableLatLng(store.lat, store.lng) ||
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
      menus: uniqueMenuIds(d.menus?.map((m) => ({
        id: String(m.id),
        name: m.name,
        price: Number(m.price) || 0,
      })) ?? []),
    }));
}

function uniqueMenuIds(menus: MenuItem[]): MenuItem[] {
  const seen = new Set<string>();
  return menus.map((menu, index) => {
    let id = menu.id;
    if (seen.has(id)) id = `${menu.id}-${index}`;
    seen.add(id);
    return id === menu.id ? menu : { ...menu, id };
  });
}

function applyLiveDeal(store: StoreData, promotion: StorePromotion | undefined, now: number): StoreData {
  const slot = getActiveSlot(promotion, now);
  if (!slot || !promotion) return { ...store, activeDeal: undefined };
  const menus = store.menus.map((menu) => {
    const discount = promotion.menuDiscounts.find((item) => String(item.menuId) === String(menu.id));
    if (!discount) return menu;
    const base = menu.originalPrice ?? menu.price;
    const next = discountedPrice(base, discount.mode, discount.value);
    if (!(base > 0) || next >= base) return menu;
    const percent = discount.mode === "percent" ? discount.value : Math.round((1 - next / base) * 100);
    return { ...menu, price: next, originalPrice: base, discount: percent };
  });
  return {
    ...store,
    menus,
    activeDeal: { note: promotion.note, startAt: slot.startAt, endAt: slot.endAt },
  };
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
  if (typeof store.lat === "number" && typeof store.lng === "number" && usableLatLng(store.lat, store.lng)) {
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
  activeNavRoute,
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
  activeNavRoute?: ActiveNavRoute | null;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<NaverMapRef | null>(null);
  const marketAreaOverlaysRef = useRef<MarketAreaOverlays | null>(null);
  const storeMarkersRef = useRef<NaverMarkerRef[]>([]);
  const facilityMarkersRef = useRef<NaverMarkerRef[]>([]);
  const customPinMarkerRef = useRef<NaverMarkerRef | null>(null);
  const routePolylineRef = useRef<{ setMap: (map: unknown) => void } | null>(null);
  const routeStopMarkersRef = useRef<NaverMarkerRef[]>([]);
  const onCustomPinClickRef = useRef(onCustomPinClick);
  onCustomPinClickRef.current = onCustomPinClick;
  const onSelectStoreRef = useRef(onSelectStore);
  onSelectStoreRef.current = onSelectStore;
  const onSelectFacilityRef = useRef(onSelectFacility);
  onSelectFacilityRef.current = onSelectFacility;
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

      clearMarketAreaOverlays(marketAreaOverlaysRef.current);
      marketAreaOverlaysRef.current = createMarketAreaLayer(mapRef.current, selectedMarketRef.current);
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
      clearMarketAreaOverlays(marketAreaOverlaysRef.current);
      marketAreaOverlaysRef.current = null;
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
    let cancelled = false;
    const map = mapRef.current;
    const naver = window.naver;

    const applyView = () => {
      if (cancelled || !mapRef.current) return;
      const view = resolveMarketView(selectedMarket);
      centerRef.current = view.center;

      const isInitial = isInitialMarketEffectRef.current;
      isInitialMarketEffectRef.current = false;

      // 초기 마운트이고 커스텀 핀이 있으면 시장 중심으로 이동하지 않음
      // (initMap에서 이미 핀 위치로 지도를 초기화했기 때문)
      if (!(isInitial && customLocationPinRef.current)) {
        map.setCenter(new naver.maps.LatLng(view.center.lat, view.center.lng));
        map.setZoom(view.zoom);
        setZoomLevel(view.zoom);
      }

      clearMarketAreaOverlays(marketAreaOverlaysRef.current);
      marketAreaOverlaysRef.current = createMarketAreaLayer(map, selectedMarket);
    };

    applyView();
    void hydrateMarketArea(selectedMarket).then(() => {
      if (!cancelled) applyView();
    });
    return () => {
      cancelled = true;
    };
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
      const icon = buildStoreMarkerIcon(naver, store, {
        highlighted: isHighlighted,
        circleSize,
        onSale: Boolean(store.activeDeal),
      });
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
        onSelectStoreRef.current(store);
      });
      return marker;
    });
  }, [visibleStores, highlightedStore, zoomLevel, selectedMarket, mapInstanceEpoch]);

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
        onSelectFacilityRef.current(facility);
      });
      return marker;
    });
  }, [facilities, zoomLevel, selectedMarket, mapInstanceEpoch]);

  useEffect(() => {
    if (!window.naver?.maps || !mapRef.current) return;
    const naver = window.naver;
    const map = mapRef.current;
    const el = mapContainerRef.current;
    if (!el) return;

    const resizeMap = () => {
      naver.maps.Event.trigger(map, "resize");
      map.setSize(new naver.maps.Size(el.clientWidth, el.clientHeight));
      // 현재 뷰를 유지한다. setCenter로 시장 중심 강제 이동하지 않음.
    };

    resizeMap();
    const t = window.setTimeout(resizeMap, 350);

    const ro = new ResizeObserver(() => {
      window.requestAnimationFrame(resizeMap);
    });
    ro.observe(el);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        window.requestAnimationFrame(resizeMap);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", resizeMap);

    return () => {
      window.clearTimeout(t);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", resizeMap);
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

  /** 장바구니에서 고른 맞춤 경로 폴리라인 */
  useEffect(() => {
    if (!window.naver?.maps || !mapRef.current) return;
    const naver = window.naver;
    const map = mapRef.current;

    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
      routePolylineRef.current = null;
    }
    routeStopMarkersRef.current.forEach((m) => {
      try {
        m.setMap(null);
      } catch {
        /* ignore */
      }
    });
    routeStopMarkersRef.current = [];

    if (!activeNavRoute || activeNavRoute.marketId !== selectedMarket) return;
    if (!activeNavRoute.pathLatLng.length) return;

    const path = activeNavRoute.pathLatLng.map((p) => new naver.maps.LatLng(p.lat, p.lng));
    routePolylineRef.current = new naver.maps.Polyline({
      map,
      path,
      strokeColor: activeNavRoute.lineColor || "#2563EB",
      strokeOpacity: 0.92,
      strokeWeight: 6,
      zIndex: 80,
      clickable: false,
    });

    // 출발 (내 위치 / 입구)
    const start = activeNavRoute.pathLatLng[0];
    const startMark = activeNavRoute.startSource === "gps" ? "나" : "출";
    routeStopMarkersRef.current.push(
      new naver.maps.Marker({
        map,
        position: new naver.maps.LatLng(start.lat, start.lng),
        zIndex: 90,
        icon: {
          content: `<div style="width:22px;height:22px;border-radius:999px;background:#111827;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25);">${startMark}</div>`,
          anchor: new naver.maps.Point(11, 11),
        },
      }),
    );

    activeNavRoute.stops.forEach((stop) => {
      routeStopMarkersRef.current.push(
        new naver.maps.Marker({
          map,
          position: new naver.maps.LatLng(stop.lat, stop.lng),
          zIndex: 91,
          icon: {
            content: `<div style="width:24px;height:24px;border-radius:999px;background:${activeNavRoute.lineColor};color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25);">${stop.order}</div>`,
            anchor: new naver.maps.Point(12, 12),
          },
        }),
      );
    });

    // 경로가 보이도록 대략 맞춤
    try {
      const bounds = new naver.maps.LatLngBounds(
        new naver.maps.LatLng(activeNavRoute.pathLatLng[0].lat, activeNavRoute.pathLatLng[0].lng),
        new naver.maps.LatLng(activeNavRoute.pathLatLng[0].lat, activeNavRoute.pathLatLng[0].lng),
      );
      activeNavRoute.pathLatLng.forEach((p) => {
        bounds.extend(new naver.maps.LatLng(p.lat, p.lng));
      });
      map.fitBounds(bounds, { top: 48, right: 48, bottom: 120, left: 48 });
    } catch {
      /* ignore */
    }
  }, [activeNavRoute, selectedMarket, mapInstanceEpoch]);

  if (isPlaceholderClientId) {
    return (
      <div className="w-full h-full bg-[#F5F0E7] flex items-center justify-center text-[12px] text-[#6B5142]">
        네이버 지도 키를 `.env`에 실제 값으로 넣어주세요.
      </div>
    );
  }

  if (mapLoadError || mapInitError) {
    return (
      <div className="w-full h-full bg-[#F5F0E7] flex items-center justify-center text-[12px] text-[#6B5142]">
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
    const nav = loadActiveNavRoute();
    if (nav && new URLSearchParams(window.location.search).get("navRoute") === "1") {
      return nav.marketId;
    }
    return "byeongcheon";
  });
  const [activeNavRoute, setActiveNavRoute] = useState<ActiveNavRoute | null>(() => {
    if (new URLSearchParams(window.location.search).get("navRoute") !== "1") return null;
    return loadActiveNavRoute();
  });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    void hydrateWalkPathGraph(selectedMarket);
  }, [selectedMarket]);

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
  const [priceReportOpen, setPriceReportOpen] = useState(false);
  const [storeActionsReady, setStoreActionsReady] = useState(false);
  const [storeScrolled, setStoreScrolled] = useState(false);
  const [facilitySheetOpen, setFacilitySheetOpen] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [pendingCartItem, setPendingCartItem] = useState<CartItem | null>(null);
  const [likedStores, setLikedStores] = useState<Set<number>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sharedStores, setSharedStores] = useState<DraftStorePin[]>(
    () => (loadOwnerCatalog().stores ?? []) as DraftStorePin[],
  );
  const [sharedFacilities, setSharedFacilities] = useState<DraftFacilityPin[]>(
    () => (loadOwnerCatalog().facilities ?? []) as DraftFacilityPin[],
  );
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
  const storeListDragRef = useRef<{ pointerId: number; startY: number; startScrollTop: number; dragging: boolean } | null>(null);
  const suppressStoreListClickUntilRef = useRef(0);
  const categoryStripDragRef = useRef<{ pointerId: number; startX: number; startScrollLeft: number; dragging: boolean } | null>(null);
  const suppressCategoryClickUntilRef = useRef(0);
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

  useEffect(() => {
    setStoreScrolled(false);
    if (!storeSheetOpen) {
      setStoreActionsReady(false);
      setPriceReportOpen(false);
      return;
    }
    setPriceReportOpen(false);
    const timer = window.setTimeout(() => setStoreActionsReady(true), 450);
    return () => window.clearTimeout(timer);
  }, [storeSheetOpen]);

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timerId);
  }, []);

  const { items, addItem, switchMarketAndAdd, totalCount } = useCart();

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
      const merged = await refreshOwnerCatalogFromRemote();
      if (cancelled) return;
      setSharedStores((merged.stores ?? []) as DraftStorePin[]);
      setSharedFacilities((merged.facilities ?? []) as DraftFacilityPin[]);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const allStores = useMemo(() => {
    const rawDrafts = sharedStores.filter(
      (s) =>
        s.marketId === selectedMarket &&
        typeof s.lat === "number" &&
        typeof s.lng === "number" &&
        usableLatLng(s.lat, s.lng) &&
        s.name,
    );

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
      return applyLiveDeal({
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
            ? uniqueMenuIds(override.menus.map((menu) => ({
                id: String(menu.id),
                name: menu.name,
                price: Number(menu.price) || 0,
              })))
            : store.menus,
      }, override.promotion, now);
    });

    // 관리자에서 새로 추가한 상점 (시드에 없는 상점) 추가
    const newStores = draftOnlyToStoreData(rawDrafts, selectedMarket).map((store) => {
      const draft = rawDrafts.find((item) => item.id === store.id);
      return applyLiveDeal(store, draft?.promotion, now);
    });

    return [...seedStores, ...newStores];
  }, [selectedMarket, sharedStores, now]);
  const marketInfo = MARKET_INFO[selectedMarket];
  const facilities = useMemo(() => {
    return sharedFacilities.filter(
      (facility) =>
        facility.marketId === selectedMarket &&
        usableLatLng(facility.lat, facility.lng),
    );
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
    return "bg-[#F5F0E7] text-[#6B5142]";
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
      className="relative flex flex-col overflow-hidden bg-[#F7F6F1]"
      style={{ height: "calc(100dvh - 3.5rem - env(safe-area-inset-bottom, 0px))" }}
    >
      <MarketConflictModal
        open={showConflictModal}
        onConfirm={() => { if (pendingCartItem) switchMarketAndAdd(pendingCartItem); setShowConflictModal(false); setPendingCartItem(null); }}
        onCancel={() => { setShowConflictModal(false); setPendingCartItem(null); }}
      />

      {/* Header */}
      <div ref={pageHeaderRef} className="z-30 shrink-0 border-b border-[#EEEAE4] bg-white shadow-[0_1px_0_rgba(70,53,44,0.05)]">
        <div className="flex items-center gap-2 px-4 py-2.5">
          <Link to="/home" className="p-1"><ChevronLeft className="w-5 h-5 text-[#5A453B]" /></Link>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A776B]" />
            <input
              type="text"
              placeholder={`${marketInfo.name}에서 검색`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 h-10 rounded-xl bg-[#F7F5F1] text-[14px] text-[#46352C] placeholder:text-[#9A897F] focus:outline-none focus:ring-2 focus:ring-[#B89A7D]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-[#8A776B]" />
              </button>
            )}
          </div>
          <Link to="/cart" className="group relative p-1">
            <ShoppingCart className="cart-pull-target w-5 h-5 text-[#5A453B]" />
            {totalCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#A9652D] text-white text-[10px] min-w-[16px] h-4 rounded-full flex items-center justify-center px-1">
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
                selectedMarket === id ? "border-[#5B4335] text-[#46352C] font-semibold" : "border-transparent text-[#8A776B]"
              }`}
            >
              {info.name}
            </button>
          ))}
        </div>
        {/* Category chips */}
        <div
          className="flex cursor-grab select-none gap-1.5 overflow-x-auto px-4 py-2 active:cursor-grabbing touch-pan-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onPointerDown={(event) => {
            if (event.pointerType !== "mouse" || event.button !== 0) return;
            suppressCategoryClickUntilRef.current = 0;
            categoryStripDragRef.current = {
              pointerId: event.pointerId,
              startX: event.clientX,
              startScrollLeft: event.currentTarget.scrollLeft,
              dragging: false,
            };
          }}
          onPointerMove={(event) => {
            const drag = categoryStripDragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            const deltaX = event.clientX - drag.startX;
            if (!drag.dragging && Math.abs(deltaX) > 5) {
              drag.dragging = true;
              event.currentTarget.setPointerCapture(event.pointerId);
            }
            if (drag.dragging) {
              event.preventDefault();
              event.currentTarget.scrollLeft = drag.startScrollLeft - deltaX;
            }
          }}
          onPointerUp={(event) => {
            const drag = categoryStripDragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            if (drag.dragging) {
              suppressCategoryClickUntilRef.current = Date.now() + 350;
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
            }
            categoryStripDragRef.current = null;
          }}
          onPointerCancel={() => { categoryStripDragRef.current = null; }}
          onClickCapture={(event) => {
            if (Date.now() < suppressCategoryClickUntilRef.current) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
        >
          <button
            onClick={() => { setShowFavoritesOnly((v) => !v); setSelectedStore(null); setBarPreviewStore(null); setStoreSheetOpen(false); }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg whitespace-nowrap text-[12px] transition-all duration-300 flex-shrink-0 active:scale-[0.97] hover:shadow-[0_5px_14px_-8px_rgba(70,53,44,0.24)] ${
              showFavoritesOnly ? "bg-[#F7F2E8] text-[#6B5142] ring-1 ring-inset ring-[#D8C6B8]" : "bg-white text-[#666A60] ring-1 ring-inset ring-[#EAE8DF]"
            }`}
          >
            <Heart className={`w-3 h-3 transition-colors duration-200 ${showFavoritesOnly ? "fill-[#C96560] text-[#C96560]" : "text-[#9A766D]"}`} />
            단골
            {likedStores.size > 0 && (
              <span className="text-[10px] ml-0.5 text-[#81766C]">
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
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg whitespace-nowrap text-[12px] transition-all duration-300 flex-shrink-0 active:scale-[0.97] ${
                  isActive ? `${CATEGORY_BUTTON_STYLE[cat].active} shadow-[0_4px_12px_-7px_rgba(70,53,44,0.28)]` : `bg-white text-[#666A60] ring-1 ring-inset ring-[#EAE8DF] ${CATEGORY_BUTTON_STYLE[cat].hover} hover:shadow-[0_5px_14px_-8px_rgba(70,53,44,0.24)]`
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
            activeNavRoute={activeNavRoute}
          />
          {activeNavRoute && activeNavRoute.marketId === selectedMarket && (
            <div className="absolute left-3 right-3 top-3 z-20 flex items-start gap-2">
              <div className="flex-1 rounded-xl bg-white/95 px-3 py-2.5 shadow-md border border-[#E5D9CB]">
                <p className="text-[13px] text-[#46352C] font-medium">{activeNavRoute.title}</p>
                <p className="text-[11px] text-[#6B5142] mt-0.5">
                  {activeNavRoute.startLabel || "출발"} · {activeNavRoute.distance}m · 약 {activeNavRoute.time}분 ·{" "}
                  {activeNavRoute.stops.length}곳
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  clearActiveNavRoute();
                  setActiveNavRoute(null);
                  const url = new URL(window.location.href);
                  url.searchParams.delete("navRoute");
                  window.history.replaceState({}, "", url.pathname + url.search);
                }}
                className="h-9 w-9 rounded-xl bg-white shadow-md border border-[#E5D9CB] flex items-center justify-center text-[#6B5142]"
                aria-label="경로 닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 top-0">
            <div className="pointer-events-auto absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-medium text-[#6B5142] shadow-[0_4px_16px_-8px_rgba(70,53,44,0.24)] ring-1 ring-inset ring-white">
              {filteredStores.length}개 상점
            </div>
            <button
              type="button"
              onClick={moveToCurrentLocation}
              className="pointer-events-auto absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 shadow-[0_4px_16px_-8px_rgba(70,53,44,0.24)] ring-1 ring-inset ring-white"
              aria-label="현재 위치로 이동"
            >
              <MapPin className="h-4 w-4 text-[#6B5142]" />
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
                <h3 className="text-[15px] font-semibold text-[#46352C] truncate">{barPreviewStore.name}</h3>
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-[12px] font-medium text-[#46352C]">{barPreviewStore.rating}</span>
                  <span className="text-[#9A897F] mx-0.5">·</span>
                  <MapPin className="w-3 h-3 text-[#6B5142] flex-shrink-0" />
                  <span className="text-[11px] text-[#6B5142] truncate">{barPreviewStore.location}</span>
                </div>
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  {barPreviewStore.activeDeal && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500 text-white">할인</span>
                  )}
                  {barPreviewStore.badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${badgeStyle(barPreviewStore.badge)}`}>{barPreviewStore.badge}</span>
                  )}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{barPreviewStore.category}</span>
                </div>
                {barPreviewStore.activeDeal ? (
                  <p className="text-[12px] text-[#46352C] mt-2 line-clamp-2">{barPreviewStore.activeDeal.note}</p>
                ) : (
                  <p className="text-[10px] text-[#8A776B] mt-2">카드를 눌러 상세·메뉴 보기</p>
                )}
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
                <p className="text-[14px] font-semibold text-[#46352C]">{customMapPin.name}</p>
                {customMapPin.description && (
                  <p className="text-[11px] text-[#6B5142] mt-0.5">{customMapPin.description}</p>
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
              className="w-full flex items-center justify-center gap-1.5 py-3 border-t border-[#EDE5D8] text-[13px] font-medium text-red-500 active:bg-red-50 transition-colors"
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
          "fixed left-0 right-0 z-[141] mx-auto max-w-md flex flex-col bg-[#F6F2EA] rounded-t-[26px] border border-[#EAE8DF] shadow-[0_-8px_30px_rgba(35,45,30,0.13)] overflow-hidden",
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
          className="shrink-0 cursor-grab select-none touch-none bg-white active:cursor-grabbing"
          onPointerDown={handleSheetPointerDown}
          onPointerMove={handleSheetPointerMove}
          onPointerUp={handleSheetPointerUp}
          onPointerCancel={handleSheetPointerUp}
        >
          {isStoreSheetCollapsed ? (
            <div className="flex justify-center pb-1.5 pt-2.5">
              <ChevronUp className="w-7 h-7 text-[#6B5142]" strokeWidth={2.25} />
            </div>
          ) : (
            <div className="mx-auto mb-2 mt-3 h-1 w-10 rounded-full bg-gray-300" />
          )}
          <div className="flex items-center justify-between border-b border-[#E8DDD2] bg-white px-4 pb-3.5 pt-0.5">
            <span className="text-[14px] font-semibold leading-snug text-[#46352C]">{marketInfo.name}</span>
          <span className="shrink-0 rounded-full bg-[#F5F0E7] px-2.5 py-1 text-[12px] font-semibold leading-snug text-[#6B5142]">{filteredStores.length}개</span>
          </div>
        </div>
        {/* 목록 영역 — 최소 스냅일 때 CSS로 숨김(스크롤 위치 보존을 위해 언마운트 안 함) */}
        <div
          className="border-t border-[#EDE5D8] flex min-h-0 flex-1 flex-col overflow-hidden"
          style={{ visibility: isStoreSheetCollapsed ? "hidden" : "visible" }}
          aria-hidden={isStoreSheetCollapsed}
        >
          <div className="h-2 shrink-0" />
          <div
            ref={listScrollRef}
            style={{ touchAction: "pan-y" }}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain cursor-grab active:cursor-grabbing px-3 pb-3 [-webkit-overflow-scrolling:touch]"
            onPointerDown={(event) => {
              if (event.pointerType !== "mouse" || event.button !== 0) return;
              const target = event.target as HTMLElement;
              if (target.closest("button, a, input, textarea, select")) return;
              suppressStoreListClickUntilRef.current = 0;
              storeListDragRef.current = {
                pointerId: event.pointerId,
                startY: event.clientY,
                startScrollTop: event.currentTarget.scrollTop,
                dragging: false,
              };
            }}
            onPointerMove={(event) => {
              const drag = storeListDragRef.current;
              if (!drag || drag.pointerId !== event.pointerId) return;
              const deltaY = event.clientY - drag.startY;
              if (!drag.dragging && Math.abs(deltaY) > 5) {
                drag.dragging = true;
                event.currentTarget.setPointerCapture(event.pointerId);
              }
              if (drag.dragging) {
                event.preventDefault();
                event.currentTarget.scrollTop = drag.startScrollTop - deltaY;
              }
            }}
            onPointerUp={(event) => {
              const drag = storeListDragRef.current;
              if (!drag || drag.pointerId !== event.pointerId) return;
              if (drag.dragging) {
                suppressStoreListClickUntilRef.current = Date.now() + 350;
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }
              }
              storeListDragRef.current = null;
            }}
            onPointerCancel={() => { storeListDragRef.current = null; }}
            onClickCapture={(event) => {
              if (Date.now() < suppressStoreListClickUntilRef.current) {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
          >
        {filteredStores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[#6B5142]">
            <Search className="w-8 h-8 mb-2 text-[#9A897F]" />
            <p className="text-[13px]">{showFavoritesOnly ? "단골 매장이 없어요" : "검색 결과가 없어요"}</p>
            {showFavoritesOnly && <p className="text-[11px] mt-1 text-[#9A897F]">매장 카드의 하트를 눌러 등록하세요</p>}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredStores.map((store) => (
              <div
                key={store.id}
                data-store-id={store.id}
                data-store-row="1"
                className="bg-white ring-1 ring-inset ring-[#D8C6B8] rounded-2xl overflow-hidden active:bg-[#F5F5EF] transition-colors cursor-pointer"
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
                        <h3 className="text-[13px] font-medium text-[#46352C]">{store.name}</h3>
                        {store.activeDeal && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500 text-white">할인</span>
                        )}
                        {store.badge && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${badgeStyle(store.badge)}`}>{store.badge}</span>
                        )}
                      </div>
                      <button onClick={(e) => toggleLike(store.id, e)} className="flex-shrink-0 ml-1 p-0.5">
                        <Heart className={`w-3.5 h-3.5 ${likedStores.has(store.id) ? "favorite-heart-sparkle fill-red-500 text-red-500" : "text-[#9A897F]"}`} />
                      </button>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-[#6B5142] mt-0.5">
                      <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                      <span className="truncate">{store.location}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[10px] text-[#6B5142]">{store.hours}</span>
                      <div className="flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                        <span className="text-[11px] text-[#6B5142]">{store.rating}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 mt-1.5">
                      <button className="flex items-center gap-0.5 rounded-lg border border-[#E5D9CB] bg-[#F7F2E8] px-2 py-1 text-[10px] font-medium text-[#6B5142] transition-all duration-300 hover:border-[#B89A7D] hover:bg-[#EFE4D8] hover:shadow-[0_4px_12px_-8px_rgba(91,67,53,0.24)] active:scale-[0.97]" onClick={(e) => e.stopPropagation()}>
                        <Phone className="w-2.5 h-2.5" />전화
                      </button>
                      <Link
                        to={`/chat?store=${encodeURIComponent(store.name)}`}
                        className="flex items-center gap-0.5 rounded-lg border border-[#E5D9CB] bg-[#F5F0E7] px-2 py-1 text-[10px] font-medium text-[#6B5142] transition-all duration-300 hover:border-[#B89A7D] hover:bg-[#EFE4D8] hover:shadow-[0_4px_12px_-8px_rgba(91,67,53,0.24)] active:scale-[0.97]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageCircle className="w-2.5 h-2.5" />채팅
                      </Link>
                      <button
                        className="flex items-center gap-0.5 rounded-lg border border-[#5B4335] bg-[#5B4335] px-2 py-1 text-[10px] font-medium text-white transition-all duration-300 hover:border-[#6B5142] hover:bg-[#6B5142] hover:shadow-[0_4px_12px_-8px_rgba(91,67,53,0.28)] active:scale-[0.97]"
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
              "mx-auto w-full max-w-md gap-0 rounded-t-2xl border-0 bg-[#F8F5EF] p-0",
              "data-[vaul-drawer-direction=bottom]:mt-0",
              "data-[vaul-drawer-direction=bottom]:max-h-[96dvh]",
              "[&>div:first-of-type]:hidden",
            )}
          >
            <DrawerTitle className="sr-only">{selectedStore.name}</DrawerTitle>
            <div className="flex h-[96dvh] flex-col overflow-hidden rounded-t-2xl bg-white">
              <div
                className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white", !storeActionsReady && "pointer-events-none")}
                onScroll={(event) => setStoreScrolled(event.currentTarget.scrollTop > 60)}
              >
                <div className="sticky top-0 z-20 h-0">
                  <div className={cn("flex h-12 items-center justify-between gap-2 px-3 transition-colors", storeScrolled && "bg-white shadow-[0_1px_0_rgba(0,0,0,0.06)]")}>
                    <button
                      type="button"
                      onClick={() => setStoreSheetOpen(false)}
                      aria-label="닫기"
                      className={cn(
                        "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full",
                        storeScrolled ? "text-[#46352C]" : "bg-black/35 text-white backdrop-blur-sm",
                      )}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <p className={cn("min-w-0 flex-1 truncate text-[15px] font-semibold text-[#46352C] transition-opacity", storeScrolled ? "opacity-100" : "opacity-0")}>
                      {selectedStore.name}
                    </p>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={(event) => toggleLike(selectedStore.id, event)}
                        aria-label="단골 등록"
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full",
                          storeScrolled ? "text-[#46352C]" : "bg-black/35 text-white backdrop-blur-sm",
                        )}
                      >
                        <Heart className={cn("h-[18px] w-[18px]", likedStores.has(selectedStore.id) && "fill-red-500 text-red-500")} />
                      </button>
                      <Link
                        to="/cart"
                        aria-label="장바구니"
                        className={cn(
                          "relative flex h-9 w-9 items-center justify-center rounded-full",
                          storeScrolled ? "text-[#46352C]" : "bg-black/35 text-white backdrop-blur-sm",
                        )}
                      >
                        <ShoppingCart className="h-[18px] w-[18px]" />
                        {totalCount > 0 && (
                          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-pink-500 px-1 text-[10px] font-bold text-white">
                            {totalCount}
                          </span>
                        )}
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="relative h-56">
                  <img src={selectedStore.image} alt={selectedStore.name} draggable={false} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/25" />
                  <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-white/70" />
                  {selectedStore.badge && (
                    <span className={`absolute bottom-3 left-4 rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeStyle(selectedStore.badge)}`}>
                      {selectedStore.badge}
                    </span>
                  )}
                </div>

                <div className="px-5 pb-5 pt-4">
                  <h2 className="text-[22px] font-bold leading-tight text-[#46352C]">{selectedStore.name}</h2>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Star className="h-4 w-4 flex-shrink-0 fill-amber-400 text-amber-400" />
                      <span className="text-[15px] font-bold text-[#46352C]">{selectedStore.rating}</span>
                      <span className="truncate text-[13px] text-[#6B5142]">· {selectedStore.category}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!storeActionsReady) return;
                        setPriceReportOpen(true);
                      }}
                      className="flex-shrink-0 rounded-full bg-amber-400 px-3 py-1.5 text-[12px] font-semibold text-[#46352C] active:bg-amber-500"
                    >
                      가격 제보
                    </button>
                  </div>
                  {selectedStore.description && (
                    <p className="mt-3 text-[14px] leading-relaxed text-[#6B5142]">{selectedStore.description}</p>
                  )}
                  <div className="mt-4 space-y-3 rounded-xl border border-[#E5D9CB] px-4 py-4 text-[13px]">
                    <div className="flex gap-4">
                      <span className="w-14 flex-shrink-0 text-[#6B5142]">위치</span>
                      <span className="min-w-0 text-[#46352C]">{selectedStore.location}</span>
                    </div>
                    <div className="flex gap-4">
                      <span className="w-14 flex-shrink-0 text-[#6B5142]">운영시간</span>
                      <span className="min-w-0 text-[#46352C]">{selectedStore.hours}</span>
                    </div>
                    <div className="flex gap-4">
                      <span className="w-14 flex-shrink-0 text-[#6B5142]">연락처</span>
                      <a href={`tel:${selectedStore.phone}`} className="min-w-0 text-[#46352C] underline decoration-gray-300 underline-offset-2">
                        {selectedStore.phone}
                      </a>
                    </div>
                  </div>
                  {selectedStore.activeDeal && (
                    <div className="mt-3 rounded-xl bg-[#5B4335] px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-orange-500 px-1.5 py-0.5 text-[11px] font-bold text-white">할인·이벤트</span>
                        <span className="text-[11px] text-[#8A776B]">
                          {formatDealClock(selectedStore.activeDeal.startAt)} – {formatDealClock(selectedStore.activeDeal.endAt)}
                        </span>
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-white">{selectedStore.activeDeal.note}</p>
                    </div>
                  )}
                </div>

                <div className="h-2 bg-[#F4F4F5]" />

                <div className="pb-6">
                  <div className="flex items-baseline gap-1.5 px-5 pb-1 pt-5">
                    <h3 className="text-[18px] font-bold text-[#46352C]">메뉴</h3>
                    <span className="text-[13px] text-[#8A776B]">{selectedStore.menus.length}</span>
                  </div>
                  <div>
                    {selectedStore.menus.map((menu) => {
                      const qty = items.find((item) => item.storeId === selectedStore.id && item.id === menu.id)?.quantity ?? 0;
                      return (
                        <div key={menu.id} className="flex items-center gap-3 border-b border-[#E5D9CB] px-5 py-4 last:border-b-0">
                          <div className="min-w-0 flex-1">
                            {menu.originalPrice && (
                              <span className="mb-1.5 inline-block rounded bg-[#F5F0E7] px-1.5 py-0.5 text-[11px] font-medium text-[#6B5142]">
                                할인
                              </span>
                            )}
                            <p className="text-[16px] font-medium leading-snug text-[#46352C]">{menu.name}</p>
                            <div className="mt-1 flex items-baseline gap-1.5">
                              {menu.originalPrice && <span className="text-[14px] font-bold text-rose-500">{menu.discount}%</span>}
                              <span className="text-[16px] font-bold text-[#46352C]">{menu.price.toLocaleString()}원</span>
                              {menu.originalPrice && (
                                <span className="text-[12px] text-[#8A776B] line-through">{menu.originalPrice.toLocaleString()}원</span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddToCart(menu, selectedStore)}
                            aria-label={`${menu.name} 담기`}
                            className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-[#E5D9CB] bg-white text-[#46352C] shadow-md active:bg-[#F7F5F1]"
                          >
                            <Plus className="h-5 w-5" />
                            {qty > 0 && (
                              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#5B4335] px-1 text-[11px] font-bold text-white">
                                {qty}
                              </span>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className={cn("flex flex-shrink-0 gap-2 border-t border-[#E5D9CB] bg-white px-4 py-3", !storeActionsReady && "pointer-events-none")}>
                <a
                  href={`tel:${selectedStore.phone}`}
                  aria-label="전화하기"
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-[#E5D9CB] text-[#46352C] active:bg-[#F7F5F1]"
                >
                  <Phone className="h-[18px] w-[18px]" />
                </a>
                {totalCount > 0 ? (
                  <>
                    <Link
                      to={`/chat?store=${encodeURIComponent(selectedStore.name)}`}
                      aria-label="채팅하기"
                      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-[#E5D9CB] text-[#46352C] active:bg-[#F7F5F1]"
                      onClick={() => setStoreSheetOpen(false)}
                    >
                      <MessageCircle className="h-[18px] w-[18px]" />
                    </Link>
                    <Link
                      to="/cart"
                      className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#5B4335] text-[15px] font-semibold text-white active:bg-[#6B5142]"
                    >
                      장바구니 보기
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[12px] font-bold text-[#46352C]">
                        {totalCount}
                      </span>
                    </Link>
                  </>
                ) : (
                  <Link
                    to={`/chat?store=${encodeURIComponent(selectedStore.name)}`}
                    className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#5B4335] text-[15px] font-semibold text-white active:bg-[#6B5142]"
                    onClick={() => setStoreSheetOpen(false)}
                  >
                    <MessageCircle className="h-[18px] w-[18px]" />
                    채팅하기
                  </Link>
                )}
              </div>
            </div>
            {priceReportOpen && (
              <PriceReportSheet
                storeName={selectedStore.name}
                menus={selectedStore.menus}
                onClose={() => setPriceReportOpen(false)}
              />
            )}
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
                  <div className="h-full w-full bg-[#EFE4D8]" />
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
                <div className="flex items-center gap-2 text-[12px] text-[#6B5142]">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>
                    {selectedFacility.lat}, {selectedFacility.lng}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[12px] text-[#6B5142]">
                  <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{selectedFacility.hours || "운영시간 정보 없음"}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFacilitySheetOpen(false)}
                  className="mt-2 w-full py-3 text-[13px] text-[#6B5142] transition-colors active:text-[#6B5142]"
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
