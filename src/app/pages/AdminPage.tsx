import { useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
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
  menus?: OwnerMenu[];
  todayDeal?: string;
  news?: string;
  couponEvent?: string;
  reviewReply?: string;
  inquiryReply?: string;
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
        </div>
      </div>
    </div>
  );
}
