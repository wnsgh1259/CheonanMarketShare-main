import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ParkingSquare, Armchair, Toilet, Info, Package, Music } from "lucide-react";

const FACILITY_COLOR_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  "#448AFF": ParkingSquare,
  "#4CAF50": Armchair,
  "#FFC107": Toilet,
  "#FF5252": Info,
  "#9C27B0": Package,
  "#FF9800": Music,
};
import { Link, useNavigate, useSearchParams } from "react-router";
import { AdminPreviewMap, type AdminPreviewStorePin } from "../components/AdminPreviewMap";
import { STORES_BY_MARKET, type StoreData } from "../data/storeData";
import { SEED_MARKET_ORDER, syntheticSeedStoreId } from "../data/seedStoreIds";
import { MARKET_VIEW_CONFIG, pickStoreDisplayLatLng } from "../map/storeMapPlacement";
import {
  OWNER_DASHBOARD_STORAGE_KEY,
  OWNER_EDIT_STORE_KEY,
  OWNER_EDIT_FACILITY_KEY,
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
  mx?: number;
  my?: number;
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
  const adminReturnHandledKey = useRef<string | null>(null);
  const mapClientId = import.meta.env.VITE_NAVER_MAP_CLIENT_ID as string | undefined;
  const isPlaceholderClientId = !mapClientId || mapClientId === "your_naver_map_client_id";

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

  useEffect(() => {
    if (marketParam === "jungang" || marketParam === "byeongcheon" || marketParam === "seonghwan") {
      setSelectedMarket(marketParam);
    }
  }, [marketParam]);

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
      try {
        const raw = window.localStorage.getItem(OWNER_DASHBOARD_STORAGE_KEY);
        if (raw) {
          const local = JSON.parse(raw) as OwnerDashboardDraft;
          const hasStores = Array.isArray(local.stores) && local.stores.length > 0;
          const hasFacilities = Array.isArray(local.facilities) && local.facilities.length > 0;
          if (hasStores || hasFacilities) {
            return;
          }
        }
      } catch {
        // If local is unreadable, fall through and bootstrap from remote.
      }
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
        mx: store.mx,
        my: store.my,
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

  const storesForMapPreview = useMemo(() => {
    const rows = STORES_BY_MARKET[selectedMarket];
    const marketDrafts = draft.stores.filter((s) => (s.marketId ?? selectedMarket) === selectedMarket);
    return filteredStores.map((adminStore) => {
      const seedRow =
        rows.find((s) => syntheticSeedStoreId(selectedMarket, s.id) === adminStore.id) ??
        rows.find((s) => s.name === adminStore.name);
      const pin: Pick<StoreData, "id" | "mx" | "my"> & { lat?: number; lng?: number } = seedRow
        ? { id: seedRow.id, mx: seedRow.mx, my: seedRow.my, lat: adminStore.lat, lng: adminStore.lng }
        : {
            id: adminStore.id >= 10000 ? adminStore.id % 10000 : adminStore.id,
            mx: adminStore.mx ?? 50,
            my: adminStore.my ?? 50,
            lat: adminStore.lat,
            lng: adminStore.lng,
          };
      const override =
        marketDrafts.find((d) => d.id === adminStore.id) ??
        (seedRow ? marketDrafts.find((d) => d.name === seedRow.name) : undefined);
      const pos = pickStoreDisplayLatLng(selectedMarket, pin, override ?? undefined);
      return {
        id: adminStore.id,
        name: adminStore.name,
        category: adminStore.category,
        lat: pos.lat,
        lng: pos.lng,
      };
    });
  }, [filteredStores, selectedMarket, draft.stores]);

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

  const openOwnerStoreEditor = (pin: AdminPreviewStorePin | DraftStore, source: "map" | "list") => {
    const full = mergedStores.find((s) => s.id === pin.id);
    if (!full) {
      window.alert("상점 정보를 찾을 수 없어요. 목록을 새로고침한 뒤 다시 눌러주세요.");
      return;
    }
    const ensuredStore: DraftStore = {
      ...full,
      marketId: full.marketId ?? selectedMarket,
      lat: typeof pin.lat === "number" ? pin.lat : full.lat,
      lng: typeof pin.lng === "number" ? pin.lng : full.lng,
    };
    const exists = draft.stores.some((item) => item.id === ensuredStore.id);
    const nextStores = exists
      ? draft.stores.map((item) => (item.id === ensuredStore.id ? ensuredStore : item))
      : [ensuredStore, ...draft.stores];
    saveDraft({ ...draft, stores: nextStores });
    window.localStorage.setItem(OWNER_EDIT_STORE_KEY, JSON.stringify(ensuredStore));
    const returnHint =
      source === "map"
        ? "&adminReturn=map"
        : `&adminReturn=list&focusStore=${encodeURIComponent(String(ensuredStore.id))}`;
    navigate(
      `/owner/store-registration?market=${ensuredStore.marketId}&editStoreId=${ensuredStore.id}&returnTo=admin${returnHint}`,
    );
  };

  const openOwnerNewStoreEditor = () => {
    navigate(`/owner/store-registration?market=${selectedMarket}&returnTo=admin`);
  };

  const openFacilityRegistration = () => {
    navigate(`/owner/facility-registration?market=${selectedMarket}&returnTo=admin`);
  };

  const openFacilityEditor = (facility: DraftFacility) => {
    const ensured: DraftFacility = {
      ...facility,
      marketId: facility.marketId ?? selectedMarket,
    };
    window.localStorage.setItem(OWNER_EDIT_FACILITY_KEY, JSON.stringify(ensured));
    navigate(
      `/owner/facility-registration?market=${ensured.marketId}&editFacilityId=${ensured.id}&returnTo=admin`,
    );
  };

  const handleDeleteFacility = (facilityId: number) => {
    const ok = window.confirm("해당 편의시설을 삭제할까요?");
    if (!ok) return;
    saveDraft({
      ...draft,
      facilities: (draft.facilities ?? []).filter((facility) => facility.id !== facilityId),
    });
  };

  const tabParam = searchParams.get("tab");
  useEffect(() => {
    if (tabParam === "facility") setManagementTab("facility");
  }, [tabParam]);

  useEffect(() => {
    const adminReturn = searchParams.get("adminReturn");
    if (adminReturn !== "map" && adminReturn !== "list") {
      adminReturnHandledKey.current = null;
      return;
    }

    const focusStoreRaw = searchParams.get("focusStore");
    const dedupeKey = `${adminReturn}:${focusStoreRaw ?? ""}`;
    if (adminReturnHandledKey.current === dedupeKey) return;
    adminReturnHandledKey.current = dedupeKey;

    setManagementTab("store");
    setSelectedStoreId(null);
    setIsEditing(false);

    const clearReturnParams = () => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("adminReturn");
          next.delete("focusStore");
          return next;
        },
        { replace: true },
      );
    };

    window.requestAnimationFrame(() => {
      if (adminReturn === "map") {
        document.getElementById("admin-store-map-section")?.scrollIntoView({ block: "start", behavior: "smooth" });
        window.setTimeout(clearReturnParams, 350);
        return;
      }
      if (adminReturn === "list" && focusStoreRaw) {
        const id = Number(focusStoreRaw);
        if (Number.isFinite(id)) {
          document.getElementById(`admin-store-card-${id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
        }
        window.setTimeout(clearReturnParams, 350);
      }
    });
  }, [searchParams, setSearchParams]);

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
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.set("market", market.id);
                    return next;
                  });
                  setSelectedStoreId(null);
                  setIsEditing(false);
                  setSearchQuery("");
                  setSelectedCategory("전체");
                  setFacilitySearchQuery("");
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

          <div id="admin-store-map-section" className="mb-3 overflow-hidden rounded-lg border border-gray-200">
            <div className="border-b border-gray-100 bg-gray-50 px-3 py-1.5">
              <p className="text-[11px] leading-snug text-gray-500">
                고객 지도와 같은 핀 스타일입니다. 핀을 누르면 해당 항목 수정 화면으로 이동합니다.
              </p>
            </div>
            <div className="h-[220px] w-full">
              <AdminPreviewMap
                view={MARKET_VIEW_CONFIG[selectedMarket]}
                tab={managementTab}
                stores={storesForMapPreview}
                facilities={filteredFacilities}
                clientId={mapClientId}
                isPlaceholder={isPlaceholderClientId}
                onStoreClick={(store) => openOwnerStoreEditor(store, "map")}
                onFacilityClick={openFacilityEditor}
              />
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
                      id={`admin-store-card-${store.id}`}
                      type="button"
                      onClick={() => openOwnerStoreEditor(store, "list")}
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
                    onClick={openFacilityRegistration}
                    className="h-7 px-2.5 rounded-lg bg-gray-900 text-[12px] text-white"
                  >
                    추가
                  </button>
                </div>
              </div>

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
                      onClick={() => openFacilityEditor(facility)}
                      className="w-full rounded-lg bg-gray-50 p-3 flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {facility.image ? (
                          <img src={facility.image} alt={facility.name} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-md flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: facility.color ? facility.color + "22" : "#f3f4f6" }}>
                            {facility.color && FACILITY_COLOR_ICON[facility.color]
                              ? (() => { const Icon = FACILITY_COLOR_ICON[facility.color]; return <Icon className="w-5 h-5" style={{ color: facility.color }} />; })()
                              : null}
                          </div>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
