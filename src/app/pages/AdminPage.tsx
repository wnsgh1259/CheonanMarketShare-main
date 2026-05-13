import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, MapPin } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { STORES_BY_MARKET } from "../data/storeData";
import { SEED_MARKET_ORDER } from "../data/seedStoreIds";
import {
  OWNER_DASHBOARD_STORAGE_KEY,
  OWNER_EDIT_STORE_KEY,
  loadSharedOwnerDraft,
  saveSharedOwnerDraft,
  type SharedOwnerDashboardDraft,
} from "../data/ownerSharedStore";

type DraftStore = {
  id: number;
  name: string;
  category: string;
  location: string;
  hours?: string;
  phone: string;
  description: string;
  lat: number;
  lng: number;
  marketId?: MarketId;
  image?: string;
  menus?: OwnerMenu[];
};

type MarketId = "jungang" | "byeongcheon" | "seonghwan";

type OwnerMenu = {
  id: number;
  name: string;
  price: string;
  photoName: string;
};

type OwnerDashboardDraft = {
  stores: DraftStore[];
  facilities?: DraftFacility[];
  menus?: OwnerMenu[];
  todayDeal?: string;
  news?: string;
  couponEvent?: string;
  reviewReply?: string;
  inquiryReply?: string;
};

type DraftFacility = {
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

const MARKET_BUTTONS: Array<{ id: MarketId; label: string }> = [
  { id: "jungang", label: "천안중앙시장" },
  { id: "byeongcheon", label: "천안역전시장" },
  { id: "seonghwan", label: "성환시장" },
];

const MAP_CATEGORY_OPTIONS = [
  "전체",
  "먹거리·분식",
  "정육·계란",
  "채소",
  "과일",
  "채소·과일",
  "수산물",
  "반찬·건어물",
  "기타·생활",
];

const FACILITY_COLOR_OPTIONS = [
  { label: "교통/이동", value: "#448AFF" },
  { label: "휴게/쉼터", value: "#4CAF50" },
  { label: "청결/위생", value: "#FFC107" },
  { label: "안내/지원", value: "#FF5252" },
  { label: "물류/편의", value: "#9C27B0" },
  { label: "문화/이벤트", value: "#FF9800" },
];
const FIXED_FACILITY_MARKER_SIZE = 15;

type NaverMapRef = {
  setCenter: (latLng: unknown) => void;
  setZoom: (zoom: number) => void;
};

type NaverMarkerRef = {
  setMap: (map: unknown) => void;
  setPosition: (position: unknown) => void;
  setIcon: (icon: unknown) => void;
};

type NaverPolygonRef = {
  setMap: (map: unknown) => void;
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

declare global {
  interface Window {
    naver?: any;
  }
}

export function AdminPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const marketParam = searchParams.get("market");
  const initialMarket: MarketId =
    marketParam === "jungang" || marketParam === "byeongcheon" || marketParam === "seonghwan"
      ? marketParam
      : "jungang";
  const [selectedMarket, setSelectedMarket] = useState<MarketId>(initialMarket);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [isEditing, setIsEditing] = useState(false);
  const [managementTab, setManagementTab] = useState<"store" | "facility">("store");
  const [facilitySearchQuery, setFacilitySearchQuery] = useState("");
  const [isAddingFacility, setIsAddingFacility] = useState(false);
  const [editingFacilityId, setEditingFacilityId] = useState<number | null>(null);
  const [facilityForm, setFacilityForm] = useState({
    name: "",
    lat: "",
    lng: "",
    color: "#448AFF",
    hours: "",
    image: "",
    imageName: "",
  });
  const [facilityPin, setFacilityPin] = useState<{ lat: number; lng: number } | null>(null);
  const [facilityMapReady, setFacilityMapReady] = useState(false);
  const [facilityMapError, setFacilityMapError] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const facilityMapRef = useRef<NaverMapRef | null>(null);
  const facilityPinMarkerRef = useRef<NaverMarkerRef | null>(null);
  const facilityPolygonsRef = useRef<NaverPolygonRef[]>([]);
  const mapClientId = import.meta.env.VITE_NAVER_MAP_CLIENT_ID as string | undefined;
  const isPlaceholderClientId = !mapClientId || mapClientId === "your_naver_map_client_id";

  const facilityPinIcon = (naver: any) => ({
    content: `<div style="width:${FIXED_FACILITY_MARKER_SIZE}px;height:${FIXED_FACILITY_MARKER_SIZE}px;border-radius:999px;background:${facilityForm.color || "#448AFF"};border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.18);"></div>`,
    size: new naver.maps.Size(FIXED_FACILITY_MARKER_SIZE, FIXED_FACILITY_MARKER_SIZE),
    anchor: new naver.maps.Point(FIXED_FACILITY_MARKER_SIZE / 2, FIXED_FACILITY_MARKER_SIZE / 2),
  });

  const [draft, setDraft] = useState<OwnerDashboardDraft>(() => {
    try {
      const raw = window.localStorage.getItem(OWNER_DASHBOARD_STORAGE_KEY);
      if (!raw) {
        return {
          stores: [],
        };
      }
      return JSON.parse(raw) as OwnerDashboardDraft;
    } catch {
      return {
        stores: [],
      };
    }
  });

  const [editForm, setEditForm] = useState({
    name: "",
    category: "",
    location: "",
    phone: "",
    description: "",
    lat: "",
    lng: "",
  });

  const saveDraft = (next: OwnerDashboardDraft) => {
    setDraft(next);
    window.localStorage.setItem(OWNER_DASHBOARD_STORAGE_KEY, JSON.stringify(next));
    void saveSharedOwnerDraft(next as SharedOwnerDashboardDraft);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const remote = await loadSharedOwnerDraft();
      if (!remote || cancelled) return;
      const normalized: OwnerDashboardDraft = {
        stores: (remote.stores ?? []).map((store) => ({
          ...store,
          marketId:
            store.marketId === "jungang" || store.marketId === "byeongcheon" || store.marketId === "seonghwan"
              ? store.marketId
              : undefined,
        })),
        facilities: (remote.facilities ?? []).map((facility) => ({
          ...facility,
          marketId:
            facility.marketId === "jungang" || facility.marketId === "byeongcheon" || facility.marketId === "seonghwan"
              ? facility.marketId
              : undefined,
        })),
        menus: remote.menus,
        todayDeal: remote.todayDeal,
        news: remote.news,
        couponEvent: remote.couponEvent,
        reviewReply: remote.reviewReply,
        inquiryReply: remote.inquiryReply,
      };
      setDraft(normalized);
      window.localStorage.setItem(OWNER_DASHBOARD_STORAGE_KEY, JSON.stringify(normalized));
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const dummyStores = useMemo<DraftStore[]>(() => {
    return SEED_MARKET_ORDER.flatMap((marketId, marketIndex) =>
      STORES_BY_MARKET[marketId].map((store) => ({
        id: marketIndex * 10000 + store.id,
        name: store.name,
        category: store.category,
        location: store.location,
        hours: store.hours,
        phone: store.phone,
        description: store.description,
        lat: typeof store.lat === "number" ? store.lat : 0,
        lng: typeof store.lng === "number" ? store.lng : 0,
        marketId,
        image: store.image,
        menus: store.menus.map((menu) => ({
          id: Number(menu.id) || Date.now(),
          name: menu.name,
          price: String(menu.price),
          photoName: "",
        })),
      })),
    );
  }, []);

  const mergedStores = useMemo(() => {
    const byId = new Map<number, DraftStore>();
    dummyStores.forEach((store) => {
      byId.set(store.id, store);
    });
    draft.stores.forEach((store) => {
      const base = byId.get(store.id);
      if (base) {
        byId.set(store.id, {
          ...base,
          ...store,
          image: store.image || base.image,
          menus: store.menus?.length ? store.menus : base.menus,
        });
      } else {
        byId.set(store.id, store);
      }
    });
    return Array.from(byId.values());
  }, [dummyStores, draft.stores]);

  const storesBySelectedMarket = mergedStores.filter(
    (store) => store.marketId === selectedMarket,
  );
  const facilitiesBySelectedMarket = (draft.facilities ?? []).filter(
    (facility) => facility.marketId === selectedMarket,
  );
  const filteredFacilities = facilitiesBySelectedMarket.filter((facility) => {
    const q = facilitySearchQuery.trim();
    return !q || facility.name.includes(q);
  });

  const filteredStores = storesBySelectedMarket.filter((store) => {
    const matchCategory =
      selectedCategory === "전체" ||
      store.category.split(",").map((item) => item.trim()).includes(selectedCategory);
    const q = searchQuery.trim();
    const matchSearch =
      !q ||
      store.name.includes(q) ||
      store.location.includes(q) ||
      store.category.includes(q);
    return matchCategory && matchSearch;
  });

  const selectedMarketLabel =
    MARKET_BUTTONS.find((market) => market.id === selectedMarket)?.label ?? "선택 시장";

  const selectedStore = storesBySelectedMarket.find((store) => store.id === selectedStoreId) ?? null;

  const handleEditStart = () => {
    if (!selectedStore) return;
    setEditForm({
      name: selectedStore.name,
      category: selectedStore.category,
      location: selectedStore.location,
      phone: selectedStore.phone,
      description: selectedStore.description,
      lat: String(selectedStore.lat),
      lng: String(selectedStore.lng),
    });
    setIsEditing(true);
  };

  const handleEditSave = () => {
    if (!selectedStore) return;
    const nextLat = Number(editForm.lat);
    const nextLng = Number(editForm.lng);
    if (Number.isNaN(nextLat) || Number.isNaN(nextLng)) {
      window.alert("좌표는 숫자로 입력해주세요.");
      return;
    }
    const nextStores = draft.stores.map((store) =>
      store.id === selectedStore.id
        ? {
            ...store,
            name: editForm.name.trim(),
            category: editForm.category.trim(),
            location: editForm.location.trim(),
            phone: editForm.phone.trim(),
            description: editForm.description.trim(),
            lat: nextLat,
            lng: nextLng,
          }
        : store,
    );
    const existsInSaved = draft.stores.some((store) => store.id === selectedStore.id);
    const normalizedStore: DraftStore = {
      ...selectedStore,
      name: editForm.name.trim(),
      category: editForm.category.trim(),
      location: editForm.location.trim(),
      phone: editForm.phone.trim(),
      description: editForm.description.trim(),
      lat: nextLat,
      lng: nextLng,
      marketId: selectedStore.marketId ?? selectedMarket,
    };
    saveDraft({
      ...draft,
      stores: existsInSaved ? nextStores : [normalizedStore, ...draft.stores],
    });
    setIsEditing(false);
  };

  const handleDeleteStore = () => {
    if (!selectedStore) return;
    const ok = window.confirm("해당 상점을 삭제할까요?");
    if (!ok) return;
    const nextStores = draft.stores.filter((store) => store.id !== selectedStore.id);
    saveDraft({ ...draft, stores: nextStores });
    setSelectedStoreId(null);
    setIsEditing(false);
  };

  const openOwnerStoreEditor = (store: DraftStore) => {
    const ensuredStore: DraftStore = {
      ...store,
      marketId: store.marketId ?? selectedMarket,
    };
    const exists = draft.stores.some((item) => item.id === ensuredStore.id);
    const nextStores = exists
      ? draft.stores.map((item) => (item.id === ensuredStore.id ? ensuredStore : item))
      : [ensuredStore, ...draft.stores];
    saveDraft({ ...draft, stores: nextStores });
    window.localStorage.setItem(OWNER_EDIT_STORE_KEY, JSON.stringify(ensuredStore));
    navigate(
      `/owner/store-registration?market=${ensuredStore.marketId}&editStoreId=${ensuredStore.id}`,
    );
  };

  const openOwnerNewStoreEditor = () => {
    navigate(`/owner/store-registration?market=${selectedMarket}`);
  };

  const handleSaveFacility = () => {
    const name = facilityForm.name.trim();
    const lat = Number(facilityForm.lat);
    const lng = Number(facilityForm.lng);
    if (!name) {
      window.alert("편의시설 장소명을 입력해주세요.");
      return false;
    }
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      window.alert("편의시설 좌표(위도/경도)를 숫자로 입력해주세요.");
      return false;
    }
    const nextFacility: DraftFacility = {
      id: editingFacilityId ?? Date.now(),
      name,
      lat,
      lng,
      color: facilityForm.color || "#448AFF",
      size: FIXED_FACILITY_MARKER_SIZE,
      hours: facilityForm.hours.trim(),
      image: facilityForm.image || undefined,
      marketId: selectedMarket,
    };
    const hasTarget =
      editingFacilityId !== null &&
      (draft.facilities ?? []).some((facility) => facility.id === editingFacilityId);
    saveDraft({
      ...draft,
      facilities: hasTarget
        ? (draft.facilities ?? []).map((facility) =>
            facility.id === editingFacilityId ? nextFacility : facility,
          )
        : [nextFacility, ...(draft.facilities ?? [])],
    });
    setFacilityForm({
      name: "",
      lat: "",
      lng: "",
      color: facilityForm.color || "#448AFF",
      hours: "",
      image: "",
      imageName: "",
    });
    setEditingFacilityId(null);
    return true;
  };

  const handleStartAddFacility = () => {
    setIsAddingFacility(true);
    setEditingFacilityId(null);
    setFacilityPin(null);
    setFacilityMapError(false);
    setFacilityMapReady(false);
    setFacilityForm((prev) => ({
      ...prev,
      name: "",
      lat: "",
      lng: "",
      hours: "",
      image: "",
      imageName: "",
    }));
  };

  const handleCancelAddFacility = () => {
    setIsAddingFacility(false);
    setEditingFacilityId(null);
    setFacilityPin(null);
    facilityPinMarkerRef.current?.setMap(null);
  };

  const handleDeleteFacility = (facilityId: number) => {
    const ok = window.confirm("해당 편의시설을 삭제할까요?");
    if (!ok) return;
    saveDraft({
      ...draft,
      facilities: (draft.facilities ?? []).filter((facility) => facility.id !== facilityId),
    });
  };

  const handleStartEditFacility = (facility: DraftFacility) => {
    setIsAddingFacility(true);
    setEditingFacilityId(facility.id);
    setFacilityPin({ lat: facility.lat, lng: facility.lng });
    setFacilityMapReady(false);
    setFacilityMapError(false);
    setFacilityForm({
      name: facility.name,
      lat: String(facility.lat),
      lng: String(facility.lng),
      color: facility.color || "#448AFF",
      hours: facility.hours || "",
      image: facility.image || "",
      imageName: facility.image ? "기존 사진" : "",
    });
  };

  useEffect(() => {
    if (managementTab !== "facility" || !isAddingFacility || !mapContainerRef.current) return;
    if (!mapClientId) return;
    let cancelled = false;

    const initMap = () => {
      if (cancelled || !window.naver?.maps || !mapContainerRef.current) return;
      const naver = window.naver;
      const view = MARKET_VIEW_CONFIG[selectedMarket];
      const map = new naver.maps.Map(mapContainerRef.current, {
        center: new naver.maps.LatLng(view.center.lat, view.center.lng),
        zoom: view.zoom,
        mapTypeId: naver.maps.MapTypeId.NORMAL,
        scaleControl: false,
        logoControl: false,
        mapDataControl: false,
      });
      facilityMapRef.current = map;
      facilityPolygonsRef.current.forEach((polygon) => polygon.setMap(null));
      facilityPolygonsRef.current = view.areaPaths.map(
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
      setFacilityMapReady(true);
      setFacilityMapError(false);

      naver.maps.Event.addListener(map, "click", (e: any) => {
        const lat = typeof e?.coord?.lat === "function" ? e.coord.lat() : e?.coord?.y;
        const lng = typeof e?.coord?.lng === "function" ? e.coord.lng() : e?.coord?.x;
        if (typeof lat !== "number" || typeof lng !== "number") return;
        const next = { lat, lng };
        setFacilityPin(next);
        setFacilityForm((prev) => ({
          ...prev,
          lat: lat.toFixed(6),
          lng: lng.toFixed(6),
        }));

        if (!facilityPinMarkerRef.current) {
          facilityPinMarkerRef.current = new naver.maps.Marker({
            map,
            position: new naver.maps.LatLng(lat, lng),
            title: "편의시설 핀",
            icon: facilityPinIcon(naver),
          });
        } else {
          facilityPinMarkerRef.current.setPosition(new naver.maps.LatLng(lat, lng));
          facilityPinMarkerRef.current.setMap(map);
          facilityPinMarkerRef.current.setIcon(facilityPinIcon(naver));
        }
      });
    };

    if (window.naver?.maps) {
      initMap();
      return () => {
        cancelled = true;
      };
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-naver-map-sdk="true"]');
    if (existingScript) {
      if (window.naver?.maps) initMap();
      else existingScript.addEventListener("load", initMap, { once: true });
      return () => {
        cancelled = true;
        existingScript.removeEventListener("load", initMap);
      };
    }

    const script = document.createElement("script");
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${mapClientId}`;
    script.async = true;
    script.dataset.naverMapSdk = "true";
    script.onload = initMap;
    script.onerror = () => setFacilityMapError(true);
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      script.onload = null;
      script.onerror = null;
    };
  }, [managementTab, isAddingFacility, mapClientId, selectedMarket, facilityForm.color]);

  useEffect(() => {
    if (!window.naver?.maps || !facilityMapRef.current || managementTab !== "facility" || !isAddingFacility) return;
    const naver = window.naver;
    const map = facilityMapRef.current;
    const view = MARKET_VIEW_CONFIG[selectedMarket];
    map.setCenter(new naver.maps.LatLng(view.center.lat, view.center.lng));
    map.setZoom(view.zoom);
    facilityPolygonsRef.current.forEach((polygon) => polygon.setMap(null));
    facilityPolygonsRef.current = view.areaPaths.map(
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
    if (editingFacilityId === null) {
      setFacilityPin(null);
      setFacilityForm((prev) => ({ ...prev, lat: "", lng: "" }));
      facilityPinMarkerRef.current?.setMap(null);
    }
  }, [selectedMarket, managementTab, isAddingFacility, editingFacilityId]);

  useEffect(() => {
    if (!window.naver?.maps || !facilityMapRef.current || managementTab !== "facility" || !isAddingFacility || !facilityPin) return;
    const naver = window.naver;
    const map = facilityMapRef.current;
    const position = new naver.maps.LatLng(facilityPin.lat, facilityPin.lng);
    if (!facilityPinMarkerRef.current) {
      facilityPinMarkerRef.current = new naver.maps.Marker({
        map,
        position,
        title: "편의시설 핀",
        icon: facilityPinIcon(naver),
      });
    } else {
      facilityPinMarkerRef.current.setPosition(position);
      facilityPinMarkerRef.current.setMap(map);
      facilityPinMarkerRef.current.setIcon(facilityPinIcon(naver));
    }
  }, [facilityPin, managementTab, isAddingFacility, facilityForm.color]);

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="p-1" aria-label="로그인 페이지로 이동">
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="text-[15px] text-gray-900">{selectedMarketLabel}</h1>
          <div className="w-7" />
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        <div className="bg-white rounded-xl p-2 flex gap-2 overflow-x-auto">
          {MARKET_BUTTONS.map((market) => {
            const isActive = selectedMarket === market.id;
            return (
              <button
                key={market.id}
                onClick={() => {
                  setSelectedMarket(market.id);
                  setSearchParams({ market: market.id });
                  setSelectedStoreId(null);
                  setIsEditing(false);
                  setSearchQuery("");
                  setSelectedCategory("전체");
                  setFacilitySearchQuery("");
                  setIsAddingFacility(false);
                  setEditingFacilityId(null);
                }}
                className={`h-9 px-3 rounded-lg text-[12px] whitespace-nowrap transition-colors ${
                  isActive ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                {market.label}
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => {
                  setManagementTab("store");
                  setIsAddingFacility(false);
                  setEditingFacilityId(null);
                }}
                className={`h-8 px-3 rounded-md text-[12px] ${
                  managementTab === "store" ? "bg-gray-900 text-white" : "text-gray-700"
                }`}
              >
                상점
              </button>
              <button
                onClick={() => {
                  setManagementTab("facility");
                  setSelectedStoreId(null);
                  setIsEditing(false);
                }}
                className={`h-8 px-3 rounded-md text-[12px] ${
                  managementTab === "facility" ? "bg-gray-900 text-white" : "text-gray-700"
                }`}
              >
                편의시설
              </button>
            </div>
          </div>

          {managementTab === "store" ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[14px] text-gray-900">{selectedMarketLabel} 등록 상점</h2>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-gray-500">{filteredStores.length}개</span>
                  <button
                    onClick={openOwnerNewStoreEditor}
                    className="h-7 px-2.5 rounded-lg bg-gray-900 text-[12px] text-white"
                  >
                    추가
                  </button>
                </div>
              </div>

              {!selectedStore && (
            <div className="mb-2 space-y-2">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="상점명"
                className="w-full h-9 rounded-lg bg-gray-100 px-3 text-[12px] focus:outline-none focus:ring-1 focus:ring-gray-300"
              />
              <div className="flex gap-1.5 overflow-x-auto">
                {MAP_CATEGORY_OPTIONS.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`h-8 px-2.5 rounded-lg whitespace-nowrap text-[12px] ${
                      selectedCategory === category ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
              )}
              {storesBySelectedMarket.length === 0 ? (
                <p className="text-[12px] text-gray-400">선택한 시장에 저장된 상점 정보가 없습니다.</p>
              ) : selectedStore ? (
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedStoreId(null)}
                    className="h-8 px-2 rounded-lg bg-gray-100 text-[12px] text-gray-700"
                  >
                    목록으로
                  </button>
                  {isEditing ? (
                    <div className="rounded-lg bg-gray-50 p-3 space-y-2">
                      <input
                        value={editForm.name}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                        className="w-full h-9 rounded-md bg-white px-3 text-[12px]"
                        placeholder="상점명"
                      />
                      <input
                        value={editForm.category}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                        className="w-full h-9 rounded-md bg-white px-3 text-[12px]"
                        placeholder="카테고리"
                      />
                      <input
                        value={editForm.location}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
                        className="w-full h-9 rounded-md bg-white px-3 text-[12px]"
                        placeholder="위치"
                      />
                      <input
                        value={editForm.phone}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                        className="w-full h-9 rounded-md bg-white px-3 text-[12px]"
                        placeholder="연락처"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={editForm.lat}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, lat: e.target.value }))}
                          className="w-full h-9 rounded-md bg-white px-3 text-[12px]"
                          placeholder="위도(lat)"
                        />
                        <input
                          value={editForm.lng}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, lng: e.target.value }))}
                          className="w-full h-9 rounded-md bg-white px-3 text-[12px]"
                          placeholder="경도(lng)"
                        />
                      </div>
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        className="w-full rounded-md bg-white px-3 py-2 text-[12px] resize-none"
                        placeholder="소개"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setIsEditing(false)}
                          className="h-9 rounded-lg bg-gray-100 text-[12px] text-gray-700"
                        >
                          취소
                        </button>
                        <button
                          onClick={handleEditSave}
                          className="h-9 rounded-lg bg-gray-900 text-[12px] text-white"
                        >
                          저장
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-[14px] text-gray-900">{selectedStore.name}</p>
                      <p className="text-[12px] text-gray-500 mt-1">{selectedStore.category}</p>
                      <p className="text-[12px] text-gray-500 mt-1">위치: {selectedStore.location}</p>
                      <p className="text-[12px] text-gray-500 mt-1">연락처: {selectedStore.phone || "-"}</p>
                      <p className="text-[12px] text-gray-500 mt-1">좌표: {selectedStore.lat}, {selectedStore.lng}</p>
                      <p className="text-[12px] text-gray-700 mt-2 whitespace-pre-wrap">{selectedStore.description || "-"}</p>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <button
                          onClick={handleEditStart}
                          className="h-9 rounded-lg bg-gray-100 text-[12px] text-gray-700"
                        >
                          수정
                        </button>
                        <button
                          onClick={handleDeleteStore}
                          className="h-9 rounded-lg bg-red-500 text-[12px] text-white"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredStores.map((store) => (
                    <button
                      key={store.id}
                      onClick={() => openOwnerStoreEditor(store)}
                      className="w-full text-left rounded-lg bg-gray-50 p-3"
                    >
                      <p className="text-[13px] text-gray-900">{store.name}</p>
                      <p className="text-[12px] text-gray-500 mt-0.5">{store.category} · {store.location}</p>
                      <p className="text-[11px] text-gray-400 mt-1">연락처 {store.phone || "-"}</p>
                    </button>
                  ))}
                  {storesBySelectedMarket.length > 0 && filteredStores.length === 0 && (
                    <p className="text-[12px] text-gray-400">검색/카테고리 조건에 맞는 상점이 없습니다.</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] text-gray-900">{selectedMarketLabel} 편의시설</h2>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-gray-500">{filteredFacilities.length}개</span>
                  <button
                    onClick={handleStartAddFacility}
                    className="h-7 px-2.5 rounded-lg bg-gray-900 text-[12px] text-white"
                  >
                    추가
                  </button>
                </div>
              </div>

              {isAddingFacility ? (
                <div className="rounded-lg bg-gray-50 p-3 space-y-2">
                  <div>
                    <label className="block text-[12px] text-gray-500 mb-1">지도에서 핀 지정</label>
                    <div className="relative w-full h-52 rounded-lg overflow-hidden bg-gray-100">
                      {isPlaceholderClientId ? (
                        <div className="w-full h-full flex items-center justify-center text-[12px] text-gray-500">
                          `.env`에 네이버 지도 키를 설정해주세요.
                        </div>
                      ) : facilityMapError ? (
                        <div className="w-full h-full flex items-center justify-center text-[12px] text-gray-500">
                          지도 로딩에 실패했어요. 도메인/키를 확인해주세요.
                        </div>
                      ) : (
                        <div ref={mapContainerRef} className="w-full h-full" />
                      )}
                    </div>
                    <div className="mt-2 text-[12px] text-gray-500 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {facilityPin
                        ? `선택 좌표: ${facilityPin.lat.toFixed(6)}, ${facilityPin.lng.toFixed(6)}`
                        : facilityMapReady
                          ? "아직 핀이 없습니다. 지도를 클릭하세요."
                          : "지도를 불러오는 중..."}
                    </div>
                  </div>
                  <input
                    value={facilityForm.name}
                    onChange={(e) => setFacilityForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full h-9 rounded-md bg-white px-3 text-[12px]"
                    placeholder="장소명 (예: 공영주차장)"
                  />
                  <input
                    value={facilityForm.hours}
                    onChange={(e) => setFacilityForm((prev) => ({ ...prev, hours: e.target.value }))}
                    className="w-full h-9 rounded-md bg-white px-3 text-[12px]"
                    placeholder="운영시간 (예: 09:00 - 18:00)"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={facilityForm.lat}
                      onChange={(e) => setFacilityForm((prev) => ({ ...prev, lat: e.target.value }))}
                      className="w-full h-9 rounded-md bg-white px-3 text-[12px]"
                      placeholder="위도(lat)"
                    />
                    <input
                      value={facilityForm.lng}
                      onChange={(e) => setFacilityForm((prev) => ({ ...prev, lng: e.target.value }))}
                      className="w-full h-9 rounded-md bg-white px-3 text-[12px]"
                      placeholder="경도(lng)"
                    />
                  </div>
                  <div className="rounded-md bg-white px-3 py-2">
                    <p className="text-[12px] text-gray-600 mb-2">마커 색상</p>
                    <div className="grid grid-cols-3 gap-2">
                      {FACILITY_COLOR_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFacilityForm((prev) => ({ ...prev, color: option.value }))}
                          className={`h-8 rounded-md text-[11px] border transition-colors ${
                            facilityForm.color === option.value
                              ? "border-gray-900 bg-gray-900 text-white"
                              : "border-gray-200 bg-white text-gray-700"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="w-full h-10 rounded-lg bg-white px-3 text-[12px] text-gray-500 flex items-center cursor-pointer">
                      {facilityForm.imageName || "편의시설 사진 등록"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            setFacilityForm((prev) => ({
                              ...prev,
                              imageName: file.name,
                              image: typeof reader.result === "string" ? reader.result : "",
                            }));
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    {facilityForm.image && (
                      <div className="mt-2 w-full h-28 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                        <img src={facilityForm.image} alt="편의시설 미리보기" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleCancelAddFacility}
                      className="h-9 rounded-lg bg-gray-100 text-[12px] text-gray-700"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => {
                        const saved = handleSaveFacility();
                        if (saved) {
                          setIsAddingFacility(false);
                          setEditingFacilityId(null);
                          setFacilityPin(null);
                          facilityPinMarkerRef.current?.setMap(null);
                        }
                      }}
                      className="h-9 rounded-lg bg-gray-900 text-[12px] text-white"
                    >
                      저장
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <input
                    value={facilitySearchQuery}
                    onChange={(e) => setFacilitySearchQuery(e.target.value)}
                    placeholder="편의시설명 검색"
                    className="w-full h-9 rounded-lg bg-gray-100 px-3 text-[12px] focus:outline-none focus:ring-1 focus:ring-gray-300"
                  />
                  {facilitiesBySelectedMarket.length === 0 ? (
                    <p className="text-[12px] text-gray-400">등록된 편의시설이 없습니다.</p>
                  ) : filteredFacilities.length === 0 ? (
                    <p className="text-[12px] text-gray-400">검색 결과가 없습니다.</p>
                  ) : (
                    <div className="space-y-2">
                      {filteredFacilities.map((facility) => (
                    <button
                      key={facility.id}
                      onClick={() => handleStartEditFacility(facility)}
                      className="w-full rounded-lg bg-gray-50 p-3 flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {facility.image ? (
                          <img src={facility.image} alt={facility.name} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-gray-200 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                        <p className="text-[13px] text-gray-900">{facility.name}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{facility.hours || "운영시간 미입력"}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {facility.lat}, {facility.lng}
                        </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-4 h-4 rounded-full border border-white shadow"
                          style={{ backgroundColor: facility.color }}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFacility(facility.id);
                          }}
                          className="h-8 px-2 rounded-lg bg-red-500 text-[12px] text-white"
                        >
                          삭제
                        </button>
                      </div>
                    </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
