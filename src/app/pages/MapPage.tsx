import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import {
  ChevronLeft, Search, X, MapPin, Heart, ShoppingCart,
  Clock, Phone, Star, ChevronDown, ChevronUp, Plus, MessageCircle,
} from "lucide-react";
import { useCart, type CartItem } from "../components/CartContext";
import type { MarketId } from "../components/CartContext";
import { MarketConflictModal } from "../components/MarketConflictModal";
import { BottomNav } from "../components/BottomNav";
import {
  STORES_BY_MARKET, MARKET_INFO,
  type CategoryKey, type StoreData, type MenuItem,
} from "../data/storeData";
import { OWNER_DASHBOARD_STORAGE_KEY, loadSharedOwnerDraft } from "../data/ownerSharedStore";
import { syntheticSeedStoreId } from "../data/seedStoreIds";

const CATEGORIES: CategoryKey[] = [
  "전체", "먹거리·분식", "정육·계란", "채소", "과일", "채소·과일", "수산물", "반찬·건어물", "기타·생활",
];

const CATEGORY_COLOR: Record<CategoryKey, { bg: string; text: string; pin: string }> = {
  "전체":        { bg: "bg-gray-600",   text: "text-white", pin: "#607D8B" },
  "먹거리·분식": { bg: "bg-orange-500", text: "text-white", pin: "#FF9800" },
  "정육·계란":   { bg: "bg-red-500",    text: "text-white", pin: "#E53935" },
  "채소":        { bg: "bg-green-500",  text: "text-white", pin: "#43A047" },
  "과일":        { bg: "bg-amber-500",  text: "text-white", pin: "#FB8C00" },
  "채소·과일":   { bg: "bg-lime-600",   text: "text-white", pin: "#7CB342" },
  "수산물":      { bg: "bg-blue-500",   text: "text-white", pin: "#1E88E5" },
  "반찬·건어물": { bg: "bg-purple-500", text: "text-white", pin: "#8E24AA" },
  "기타·생활":   { bg: "bg-gray-500",   text: "text-white", pin: "#757575" },
};

const CATEGORY_EMOJI: Record<CategoryKey, string> = {
  "전체": "🏪", "먹거리·분식": "🍢", "정육·계란": "🥩", "채소": "🥦",
  "과일": "🍎", "채소·과일": "🥬", "수산물": "🐟", "반찬·건어물": "🍱", "기타·생활": "🛍️",
};

type NaverMapRef = {
  setCenter: (latLng: unknown) => void;
  panTo: (latLng: unknown) => void;
  setSize: (size: unknown) => void;
  setZoom: (zoom: number) => void;
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

declare global {
  interface Window {
    naver?: any;
  }
}

const MARKET_COORDS: Record<MarketId, { lat: number; lng: number }> = {
  jungang: { lat: 36.8071, lng: 127.1518 },
  byeongcheon: { lat: 36.8102, lng: 127.1469 }, // 천안역전시장
  seonghwan: { lat: 36.918910, lng: 127.130431 },
};

const MARKET_VIEW_CONFIG: Record<MarketId, {
  center: { lat: number; lng: number };
  zoom: number;
  fillColor: string;
  areaPaths: Array<Array<{ lat: number; lng: number }>>;
}> = {
  jungang: {
    center: { lat: 36.802220, lng: 127.149411 },
    zoom: 15.4,
    fillColor: "#2563EB",
    areaPaths: [
      [
        { lat: 36.804099, lng: 127.148671 },
        { lat: 36.804099, lng: 127.149905 },
        { lat: 36.800137, lng: 127.149905 },
        { lat: 36.800137, lng: 127.148671 },
      ],
      [
        { lat: 36.803683, lng: 127.149905 },
        { lat: 36.803683, lng: 127.150225 },
        { lat: 36.803487, lng: 127.150225 },
        { lat: 36.803487, lng: 127.149905 },
      ],
      [
        { lat: 36.803035, lng: 127.149905 },
        { lat: 36.803035, lng: 127.150314 },
        { lat: 36.802786, lng: 127.150314 },
        { lat: 36.802786, lng: 127.149905 },
      ],
    ],
  },
  byeongcheon: {
    center: { lat: 36.810152, lng: 127.149018 },
    zoom: 17,
    fillColor: "#16A34A",
    areaPaths: [[
      { lat: 36.809302, lng: 127.148552 },
      { lat: 36.810976, lng: 127.149064 },
      { lat: 36.810871, lng: 127.149528 },
      { lat: 36.809180, lng: 127.148898 },
    ]],
  },
  seonghwan: {
    center: { lat: 36.918910, lng: 127.130431 },
    zoom: 17,
    fillColor: "#EA580C",
    areaPaths: [[
      { lat: 36.918485, lng: 127.130249 },
      { lat: 36.918721, lng: 127.129787 },
      { lat: 36.919403, lng: 127.130168 },
      { lat: 36.918936, lng: 127.131198 },
    ]],
  },
};

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
    const raw = window.localStorage.getItem(OWNER_DASHBOARD_STORAGE_KEY);
    if (!raw) return emptyDraftOverrides();
    const parsed = JSON.parse(raw) as { stores?: DraftStorePin[] };
    return buildDraftOverridesForMarket(parsed.stores ?? [], marketId);
  } catch {
    return emptyDraftOverrides();
  }
}

function resolveDraftOverride(
  marketId: MarketId,
  seedStore: StoreData,
  maps: DraftOverrides,
): DraftStorePin | undefined {
  const syntheticId = syntheticSeedStoreId(marketId, seedStore.id);
  return maps.byId.get(syntheticId) ?? maps.byName.get(seedStore.name);
}

function toStoreLatLng(
  center: { lat: number; lng: number },
  mx: number,
  my: number,
) {
  const latSpan = 0.003;
  const lngSpan = 0.0035;
  return {
    lat: center.lat + (50 - my) * (latSpan / 100),
    lng: center.lng + (mx - 50) * (lngSpan / 100),
  };
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
  selectedStore,
  mapExpanded,
  onSelectStore,
}: {
  selectedMarket: MarketId;
  visibleStores: StoreData[];
  selectedStore: StoreData | null;
  mapExpanded: boolean;
  onSelectStore: (store: StoreData) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<NaverMapRef | null>(null);
  const marketPolygonsRef = useRef<NaverPolygonRef[]>([]);
  const storeMarkersRef = useRef<NaverMarkerRef[]>([]);
  const [mapLoadError, setMapLoadError] = useState(false);
  const [mapInitError, setMapInitError] = useState(false);
  const centerRef = useRef(MARKET_COORDS[selectedMarket]);
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
      const view = MARKET_VIEW_CONFIG[selectedMarket];
      centerRef.current = view.center;
      const naver = window.naver;
      setMapLoadError(false);
      setMapInitError(false);

      mapRef.current = new naver.maps.Map(mapContainerRef.current, {
        center: new naver.maps.LatLng(view.center.lat, view.center.lng),
        zoom: view.zoom,
        mapTypeId: naver.maps.MapTypeId.NORMAL,
        scaleControl: false,
        logoControl: false,
        mapDataControl: false,
      });

      marketPolygonsRef.current = createMarketPolygons(mapRef.current, view);
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

    map.setCenter(new naver.maps.LatLng(view.center.lat, view.center.lng));
    map.setZoom(view.zoom);

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
      const isSelected = selectedStore?.id === store.id;
      const marker = new naver.maps.Marker({
        map,
        position: new naver.maps.LatLng(point.lat, point.lng),
        title: store.name,
        icon: {
          content: `<div style="width:${isSelected ? 16 : 14}px;height:${isSelected ? 16 : 14}px;border-radius:999px;background:${isSelected ? "#111827" : "#2563EB"};border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.18);"></div>`,
        },
      });
      naver.maps.Event.addListener(marker, "click", () => {
        onSelectStore(store);
      });
      return marker;
    });
  }, [visibleStores, selectedStore, onSelectStore]);

  useEffect(() => {
    if (!window.naver?.maps || !mapRef.current || !mapExpanded) return;
    const naver = window.naver;
    const map = mapRef.current;

    const resizeMap = () => {
      naver.maps.Event.trigger(map, "resize");
      const container = mapContainerRef.current;
      if (container) {
        map.setSize(new naver.maps.Size(container.clientWidth, container.clientHeight));
      }
      const center = centerRef.current;
      map.setCenter(new naver.maps.LatLng(center.lat, center.lng));
    };

    // Transition(높이 애니메이션) 이후에도 한 번 더 보정한다.
    resizeMap();
    const t = window.setTimeout(resizeMap, 350);
    return () => window.clearTimeout(t);
  }, [mapExpanded, selectedMarket]);

  useEffect(() => {
    if (!window.naver?.maps || !mapRef.current || !selectedStore) return;
    const center = centerRef.current;
    const point = getStoreLatLng(selectedStore, center);
    mapRef.current.panTo(new window.naver.maps.LatLng(point.lat, point.lng));
  }, [selectedStore]);

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

export function MapPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMarket, setSelectedMarket] = useState<MarketId>(() => {
    const param = new URLSearchParams(window.location.search).get("market");
    if (param === "jungang" || param === "byeongcheon" || param === "seonghwan") return param;
    return "byeongcheon";
  });
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>("전체");
  const [selectedStore, setSelectedStore] = useState<StoreData | null>(null);
  const [mapExpanded, setMapExpanded] = useState(true);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [pendingCartItem, setPendingCartItem] = useState<CartItem | null>(null);
  const [addedMenuIds, setAddedMenuIds] = useState<Set<string>>(new Set());
  const [likedStores, setLikedStores] = useState<Set<number>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sharedStores, setSharedStores] = useState<DraftStorePin[] | null>(null);

  const { addItem, switchMarketAndAdd, totalCount } = useCart();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const remote = await loadSharedOwnerDraft();
      if (!remote || cancelled) return;
      setSharedStores((remote.stores ?? []) as DraftStorePin[]);
      window.localStorage.setItem(OWNER_DASHBOARD_STORAGE_KEY, JSON.stringify(remote));
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const allStores = useMemo(() => {
    const maps = sharedStores
      ? buildDraftOverridesForMarket(sharedStores, selectedMarket)
      : readStoredDraftOverrides(selectedMarket);
    return STORES_BY_MARKET[selectedMarket].map((store) => {
      const override = resolveDraftOverride(selectedMarket, store, maps);
      if (!override) return store;
      const nextName = override.name?.trim();
      return {
        ...store,
        name: nextName || store.name,
        lat: override.lat,
        lng: override.lng,
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
  }, [selectedMarket, sharedStores]);
  const marketInfo = MARKET_INFO[selectedMarket];

  const filteredStores = allStores.filter((s) => {
    const matchFav = !showFavoritesOnly || likedStores.has(s.id);
    const matchCat = showFavoritesOnly || selectedCategory === "전체" || s.category === selectedCategory;
    const matchSearch = !searchQuery || s.name.includes(searchQuery) || s.category.includes(searchQuery) || s.location.includes(searchQuery);
    return matchFav && matchCat && matchSearch;
  });

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
    setSearchQuery("");
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
      setAddedMenuIds(prev => new Set(prev).add(menu.id));
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
    <div className="min-h-screen bg-[#F7F8FA] pb-20">
      <MarketConflictModal
        open={showConflictModal}
        onConfirm={() => { if (pendingCartItem) switchMarketAndAdd(pendingCartItem); setShowConflictModal(false); setPendingCartItem(null); }}
        onCancel={() => { setShowConflictModal(false); setPendingCartItem(null); }}
      />

      {/* Header */}
      <div className="sticky top-0 bg-white z-20 border-b border-gray-100">
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
        <div className="flex gap-1.5 px-4 py-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => { setShowFavoritesOnly((v) => !v); setSelectedStore(null); }}
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
                onClick={() => { setShowFavoritesOnly(false); setSelectedCategory(cat); setSelectedStore(null); }}
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

      {/* Map */}
      <div className="relative bg-white">
        <div className="relative overflow-hidden transition-all duration-300" style={{ height: mapExpanded ? 220 : 0 }}>
          <NaverMarketMap
            selectedMarket={selectedMarket}
            visibleStores={filteredStores}
            selectedStore={selectedStore}
            mapExpanded={mapExpanded}
            onSelectStore={(store) => {
              setSelectedStore(store);
              setAddedMenuIds(new Set());
            }}
          />
          <div className="absolute bottom-2 left-2 bg-white rounded-md px-2 py-1 text-[11px] text-gray-500 shadow-sm">
            {filteredStores.length}개 상점
          </div>
          <button
            onClick={moveToCurrentLocation}
            className="absolute bottom-2 right-2 w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center"
          >
            <MapPin className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <button onClick={() => setMapExpanded(!mapExpanded)} className="w-full flex items-center justify-center gap-1 py-2 bg-gray-50 border-t border-gray-100 text-[12px] text-gray-400">
          {mapExpanded ? <><ChevronUp className="w-3 h-3" /> 지도 접기</> : <><ChevronDown className="w-3 h-3" /> 지도 펼치기</>}
        </button>
      </div>

      {/* Store List */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[14px] text-gray-900">{marketInfo.name}</span>
          <span className="text-[12px] text-gray-400">{filteredStores.length}개</span>
        </div>

        {filteredStores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Search className="w-10 h-10 mb-3 text-gray-300" />
            <p className="text-[14px]">{showFavoritesOnly ? "단골 매장이 없어요" : "검색 결과가 없어요"}</p>
            {showFavoritesOnly && <p className="text-[12px] mt-1 text-gray-300">매장 카드의 하트를 눌러 등록하세요</p>}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredStores.map((store) => (
              <div
                key={store.id}
                className="bg-white rounded-xl overflow-hidden active:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => { setSelectedStore(store); setAddedMenuIds(new Set()); }}
              >
                <div className="flex gap-3 p-3">
                  <div className="flex-none w-[72px] h-[72px] rounded-lg overflow-hidden">
                    <img src={store.image} alt={store.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-[14px] text-gray-900">{store.name}</h3>
                        {store.badge && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${badgeStyle(store.badge)}`}>{store.badge}</span>
                        )}
                      </div>
                      <button onClick={(e) => toggleLike(store.id, e)} className="flex-shrink-0 ml-1 p-0.5">
                        <Heart className={`w-4 h-4 ${likedStores.has(store.id) ? "fill-red-500 text-red-500" : "text-gray-300"}`} />
                      </button>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-gray-400 mb-1">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{store.location}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-400">{store.hours}</span>
                      <div className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-[12px] text-gray-600">{store.rating}</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      <button className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-[11px] text-gray-600" onClick={(e) => e.stopPropagation()}>
                        <Phone className="w-3 h-3" />전화
                      </button>
                      <Link
                        to={`/chat?store=${encodeURIComponent(store.name)}`}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-[11px] text-gray-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageCircle className="w-3 h-3" />채팅
                      </Link>
                      <button
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-900 text-white text-[11px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (store.menus.length > 0) handleAddToCart(store.menus[0], store);
                        }}
                      >
                        <ShoppingCart className="w-3 h-3" />담기
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Store Detail Bottom Sheet */}
      {selectedStore && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end max-w-md mx-auto">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedStore(null)} />
          <div className="relative bg-white rounded-t-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="relative h-40 flex-shrink-0">
              <img src={selectedStore.image} alt={selectedStore.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <button onClick={() => setSelectedStore(null)} className="absolute top-3 right-3 w-8 h-8 bg-black/30 rounded-full flex items-center justify-center text-white">
                <X className="w-4 h-4" />
              </button>
              {selectedStore.badge && (
                <span className={`absolute top-3 left-3 text-[11px] px-2 py-0.5 rounded ${badgeStyle(selectedStore.badge)}`}>
                  {selectedStore.badge}
                </span>
              )}
              <div className="absolute bottom-3 left-4 right-4">
                <h2 className="text-white text-[17px]">{selectedStore.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-white/70">{selectedStore.category}</span>
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span className="text-[12px] text-white">{selectedStore.rating}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 px-4 pb-4">
              <div className="py-3 space-y-1.5 border-b border-gray-100">
                <p className="text-[13px] text-gray-500 leading-relaxed">{selectedStore.description}</p>
                <div className="flex items-center gap-2 text-[12px] text-gray-400">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" /><span>{selectedStore.location}</span>
                </div>
                <div className="flex items-center gap-2 text-[12px] text-gray-400">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" /><span>{selectedStore.hours}</span>
                </div>
                <div className="flex items-center gap-2 text-[12px] text-gray-400">
                  <Phone className="w-3.5 h-3.5 flex-shrink-0" /><span>{selectedStore.phone}</span>
                </div>
              </div>
              <div className="pt-3">
                <h3 className="text-[14px] text-gray-900 mb-2.5">메뉴 / 상품</h3>
                <div className="space-y-2">
                  {selectedStore.menus.map((menu) => {
                    const isAdded = addedMenuIds.has(menu.id);
                    return (
                      <div key={menu.id} className={`flex items-center justify-between p-3 rounded-lg transition-all ${isAdded ? "bg-sky-50" : "bg-gray-50"}`}>
                        <div className="flex-1">
                          <p className="text-[14px] text-gray-800">{menu.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
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
                          onClick={() => handleAddToCart(menu, selectedStore)}
                          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-[12px] transition-all ${isAdded ? "bg-gray-200 text-gray-500" : "bg-gray-900 text-white active:bg-gray-800"}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {isAdded ? "담김" : "담기"}
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2 mt-4">
                  <button className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-gray-100 rounded-xl text-[13px] text-gray-600 active:bg-gray-200 transition-colors">
                    <Phone className="w-4 h-4" />전화하기
                  </button>
                  <Link
                    to={`/chat?store=${encodeURIComponent(selectedStore.name)}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-gray-900 text-white rounded-xl text-[13px] active:bg-gray-800 transition-colors"
                    onClick={() => setSelectedStore(null)}
                  >
                    <MessageCircle className="w-4 h-4" />채팅하기
                  </Link>
                </div>
                <button
                  onClick={() => setSelectedStore(null)}
                  className="w-full mt-2 py-3 text-[13px] text-gray-400 active:text-gray-600 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}