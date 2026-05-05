import { useEffect, useRef, useState } from "react";
import { ChevronLeft, MapPin, Plus, ImagePlus } from "lucide-react";
import { useNavigate } from "react-router";
import { STORES_BY_MARKET } from "../data/storeData";
import {
  OWNER_DASHBOARD_STORAGE_KEY,
  OWNER_EDIT_STORE_KEY,
  loadSharedOwnerDraft,
  saveSharedOwnerDraft,
  type SharedOwnerDashboardDraft,
} from "../data/ownerSharedStore";

type NaverMapRef = {
  setCenter: (latLng: unknown) => void;
  setZoom: (zoom: number) => void;
};

type NaverMarkerRef = {
  setMap: (map: unknown) => void;
  setPosition: (position: unknown) => void;
};

type NaverPolygonRef = {
  setMap: (map: unknown) => void;
};

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

type OwnerSection = "store" | "product" | "communication" | "promotion";

type OwnerMenu = {
  id: number;
  name: string;
  price: string;
  photoName: string;
};

type OwnerDashboardDraft = {
  stores: DraftStore[];
  menus: OwnerMenu[];
  todayDeal: string;
  news: string;
  couponEvent: string;
  reviewReply: string;
  inquiryReply: string;
};

type MarketId = "jungang" | "byeongcheon" | "seonghwan";

const MARKET_VIEW_CONFIG: Record<MarketId, {
  label: string;
  center: { lat: number; lng: number };
  zoom: number;
  fillColor: string;
  areaPaths: Array<Array<{ lat: number; lng: number }>>;
}> = {
  jungang: {
    label: "천안중앙시장",
    center: { lat: 36.80222, lng: 127.149411 },
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
    label: "천안역전시장",
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
    label: "성환시장",
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
const CATEGORY_OPTIONS = ["먹거리·분식", "정육·계란", "채소", "과일", "채소·과일", "수산물", "반찬·건어물", "기타·생활"];
const PAYMENT_OPTIONS = ["카드", "현금", "지역화폐", "온누리상품권"];
declare global {
  interface Window {
    naver?: any;
  }
}

export function StoreRegistrationPage() {
  const navigate = useNavigate();
  const query = new URLSearchParams(window.location.search);
  const queryMarket = query.get("market");
  const queryEditStoreId = Number(query.get("editStoreId"));
  const initialMarket: MarketId =
    queryMarket === "jungang" || queryMarket === "byeongcheon" || queryMarket === "seonghwan"
      ? queryMarket
      : "byeongcheon";
  const initialEditStoreId = Number.isFinite(queryEditStoreId) ? queryEditStoreId : null;

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<NaverMapRef | null>(null);
  const pinMarkerRef = useRef<NaverMarkerRef | null>(null);
  const marketPolygonsRef = useRef<NaverPolygonRef[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<MarketId>(initialMarket);
  const [stores, setStores] = useState<DraftStore[]>([]);
  const [editingStoreId, setEditingStoreId] = useState<number | null>(initialEditStoreId);
  const [form, setForm] = useState({
    name: "",
    location: "",
    hours: "",
    phone: "",
    description: "",
    representativePhotoName: "",
    representativePhotoUrl: "",
  });
  const [activeSection, setActiveSection] = useState<OwnerSection | null>(null);
  const [activeCommunicationSubSection, setActiveCommunicationSubSection] = useState<"review" | "inquiry">("review");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [menus, setMenus] = useState<OwnerMenu[]>([{ id: Date.now(), name: "", price: "", photoName: "" }]);
  const [todayDeal, setTodayDeal] = useState("");
  const [news, setNews] = useState("");
  const [couponEvent, setCouponEvent] = useState("");
  const [reviewReply, setReviewReply] = useState("");
  const [inquiryReply, setInquiryReply] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [pageTitle, setPageTitle] = useState("~~사장님");

  const clientId = import.meta.env.VITE_NAVER_MAP_CLIENT_ID as string | undefined;
  const isPlaceholderClientId = !clientId || clientId === "your_naver_map_client_id";
  const selectedMarketView = MARKET_VIEW_CONFIG[selectedMarket];

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const remote = await loadSharedOwnerDraft();
        const raw = remote ? JSON.stringify(remote) : window.localStorage.getItem(OWNER_DASHBOARD_STORAGE_KEY);
        if (!raw || cancelled) return;
        const parsed = JSON.parse(raw) as OwnerDashboardDraft;
      setStores(parsed.stores ?? []);
      setMenus(parsed.menus?.length ? parsed.menus : [{ id: Date.now(), name: "", price: "", photoName: "" }]);
      setTodayDeal(parsed.todayDeal ?? "");
      setNews(parsed.news ?? "");
      setCouponEvent(parsed.couponEvent ?? "");
      setReviewReply(parsed.reviewReply ?? "");
      setInquiryReply(parsed.inquiryReply ?? "");

      if (initialEditStoreId !== null) {
        const directTarget = (parsed.stores ?? []).find((store) => store.id === initialEditStoreId);
        const rawEdit = window.localStorage.getItem(OWNER_EDIT_STORE_KEY);
        const editTarget = rawEdit ? (JSON.parse(rawEdit) as DraftStore) : null;
        const target =
          directTarget ??
          (editTarget && editTarget.id === initialEditStoreId ? editTarget : null);
        if (target) {
          setPageTitle(target.name || "~~사장님");
          if (target.marketId) setSelectedMarket(target.marketId);
          const dummyMatch = target.marketId
            ? STORES_BY_MARKET[target.marketId].find((store) => store.name === target.name)
            : undefined;
          setActiveSection("store");
          setForm({
            name: target.name,
            location: target.location,
            hours: target.hours ?? dummyMatch?.hours ?? "",
            phone: target.phone,
            description: target.description,
            representativePhotoName: target.image || dummyMatch?.image ? "기존 대표사진" : "",
            representativePhotoUrl: target.image ?? dummyMatch?.image ?? "",
          });
          setSelectedCategories(
            target.category
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
          );
          setPin({ lat: target.lat, lng: target.lng });
          if (target.menus?.length) {
            setMenus(target.menus);
          } else if (dummyMatch?.menus?.length) {
            setMenus(
              dummyMatch.menus.map((menu, index) => ({
                id: Number(menu.id) || Date.now() + index,
                name: menu.name,
                price: String(menu.price),
                photoName: "",
              })),
            );
          }
          setEditingStoreId(target.id);
        }
      }
        window.localStorage.setItem(OWNER_DASHBOARD_STORAGE_KEY, JSON.stringify(parsed));
      } catch {
        // Ignore corrupted local draft.
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [initialEditStoreId]);

  useEffect(() => {
    if (activeSection !== "store") return;
    if (!clientId || !mapContainerRef.current) return;
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
      mapRef.current = map;
      marketPolygonsRef.current.forEach((polygon) => polygon.setMap(null));
      marketPolygonsRef.current = view.areaPaths.map(
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
      setMapReady(true);
      setMapError(false);

      naver.maps.Event.addListener(map, "click", (e: any) => {
        const lat = e.coord.y;
        const lng = e.coord.x;
        const next = { lat, lng };
        setPin(next);

        if (!pinMarkerRef.current) {
          pinMarkerRef.current = new naver.maps.Marker({
            map,
            position: new naver.maps.LatLng(lat, lng),
            title: "등록 핀",
            icon: {
              content:
                '<div style="width:22px;height:22px;border-radius:999px;background:#111827;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.18);"></div>',
            },
          });
        } else {
          pinMarkerRef.current.setPosition(new naver.maps.LatLng(lat, lng));
          pinMarkerRef.current.setMap(map);
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
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`;
    script.async = true;
    script.dataset.naverMapSdk = "true";
    script.onload = initMap;
    script.onerror = () => setMapError(true);
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      script.onload = null;
      script.onerror = null;
    };
  }, [activeSection, clientId, selectedMarket]);

  useEffect(() => {
    if (!window.naver?.maps || !mapRef.current || activeSection !== "store") return;
    const naver = window.naver;
    const map = mapRef.current;
    const view = selectedMarketView;

    map.setCenter(new naver.maps.LatLng(view.center.lat, view.center.lng));
    map.setZoom(view.zoom);
    marketPolygonsRef.current.forEach((polygon) => polygon.setMap(null));
    marketPolygonsRef.current = view.areaPaths.map(
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
  }, [activeSection, selectedMarket, selectedMarketView]);

  useEffect(() => {
    if (!window.naver?.maps || !mapRef.current || activeSection !== "store" || !pin) return;
    const naver = window.naver;
    const map = mapRef.current;
    const position = new naver.maps.LatLng(pin.lat, pin.lng);
    if (!pinMarkerRef.current) {
      pinMarkerRef.current = new naver.maps.Marker({
        map,
        position,
        title: "등록 핀",
        icon: {
          content:
            '<div style="width:22px;height:22px;border-radius:999px;background:#111827;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.18);"></div>',
        },
      });
    } else {
      pinMarkerRef.current.setPosition(position);
      pinMarkerRef.current.setMap(map);
    }
  }, [activeSection, pin]);

  const handleAddStore = () => {
    if (!pin || !form.name.trim() || selectedCategories.length === 0 || !form.location.trim()) return;
    const isEditingMode = editingStoreId !== null;

    const next: DraftStore = {
      id: editingStoreId ?? Date.now(),
      name: form.name.trim(),
      category: selectedCategories.join(", "),
      location: form.location.trim(),
      hours: form.hours.trim(),
      phone: form.phone.trim(),
      description: form.description.trim(),
      lat: Number(pin.lat.toFixed(6)),
      lng: Number(pin.lng.toFixed(6)),
      marketId: selectedMarket,
      image: form.representativePhotoUrl || undefined,
      menus: menus.filter((menu) => menu.name.trim()).map((menu) => ({
        ...menu,
        price: menu.price.trim(),
      })),
    };
    const updatedStores = editingStoreId
      ? stores.some((store) => store.id === editingStoreId)
        ? stores.map((store) => (store.id === editingStoreId ? next : store))
        : [next, ...stores]
      : [next, ...stores];
    setStores(updatedStores);
    window.localStorage.setItem(
      OWNER_DASHBOARD_STORAGE_KEY,
      JSON.stringify({
        stores: updatedStores,
        menus,
        todayDeal,
        news,
        couponEvent,
        reviewReply,
        inquiryReply,
      } satisfies OwnerDashboardDraft),
    );
    void saveSharedOwnerDraft({
      stores: updatedStores,
      menus,
      todayDeal,
      news,
      couponEvent,
      reviewReply,
      inquiryReply,
    } satisfies SharedOwnerDashboardDraft);
    if (isEditingMode) {
      navigate(-1);
      return;
    }
    setForm({ name: "", location: "", hours: "", phone: "", description: "", representativePhotoName: "", representativePhotoUrl: "" });
    setSelectedCategories([]);
    setSelectedPayments([]);
    setPin(null);
    setEditingStoreId(null);
    pinMarkerRef.current?.setMap(null);
    setSaveNotice("저장되었습니다.");
    window.setTimeout(() => setSaveNotice(""), 1800);
  };

  const toggleOption = (value: string, selected: string[], setSelected: (value: string[]) => void) => {
    if (selected.includes(value)) setSelected(selected.filter((v) => v !== value));
    else setSelected([...selected, value]);
  };

  const resetStoreForm = () => {
    setForm({ name: "", location: "", hours: "", phone: "", description: "", representativePhotoName: "", representativePhotoUrl: "" });
    setSelectedCategories([]);
    setSelectedPayments([]);
    setPin(null);
    pinMarkerRef.current?.setMap(null);
  };

  const addMenuRow = () => {
    setMenus((prev) => [...prev, { id: Date.now(), name: "", price: "", photoName: "" }]);
  };

  const saveOwnerDraft = (notice?: string) => {
    const patchedStores =
      editingStoreId !== null
        ? stores.map((store) =>
            store.id === editingStoreId
              ? {
                  ...store,
                  menus: menus.filter((menu) => menu.name.trim()).map((menu) => ({
                    ...menu,
                    price: menu.price.trim(),
                  })),
                }
              : store,
          )
        : stores;
    const payload: OwnerDashboardDraft = {
      stores: patchedStores,
      menus,
      todayDeal,
      news,
      couponEvent,
      reviewReply,
      inquiryReply,
    };
    setStores(patchedStores);
    window.localStorage.setItem(OWNER_DASHBOARD_STORAGE_KEY, JSON.stringify(payload));
    void saveSharedOwnerDraft(payload as SharedOwnerDashboardDraft);
    if (notice) {
      setSaveNotice(notice);
      window.setTimeout(() => setSaveNotice(""), 1800);
    }
  };

  const hasUnsavedStoreChanges = Boolean(
    form.name.trim() ||
    form.location.trim() ||
    form.hours.trim() ||
    form.phone.trim() ||
    form.description.trim() ||
    form.representativePhotoName ||
    selectedCategories.length > 0 ||
    selectedPayments.length > 0 ||
    pin,
  );

  const hasUnsavedProductChanges = menus.some(
    (menu) => menu.name.trim() || menu.price.trim() || menu.photoName.trim(),
  );

  const hasUnsavedCommunicationChanges = Boolean(
    reviewReply.trim() || inquiryReply.trim(),
  );

  const hasUnsavedPromotionChanges = Boolean(
    todayDeal.trim() || news.trim() || couponEvent.trim(),
  );

  const hasUnsavedChanges = (section: OwnerSection | null) => {
    if (section === "store") return hasUnsavedStoreChanges;
    if (section === "product") return hasUnsavedProductChanges;
    if (section === "communication") return hasUnsavedCommunicationChanges;
    if (section === "promotion") return hasUnsavedPromotionChanges;
    return false;
  };

  const closeOrMoveSection = (nextSection: OwnerSection | null, onConfirm?: () => void) => {
    if (hasUnsavedChanges(activeSection)) {
      const shouldSave = window.confirm("설정내용을 저장하시겠습니까?");
      if (shouldSave) {
        saveOwnerDraft();
      }
    }
    onConfirm?.();
    setActiveSection(nextSection);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-1"
            aria-label="뒤로가기"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-[15px] text-gray-900">{pageTitle}</h1>
          <div className="w-7" />
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        <div className="bg-white rounded-xl p-2 flex gap-2 overflow-x-auto">
          {[
            { key: "store" as OwnerSection, label: "상점 관리" },
            { key: "product" as OwnerSection, label: "상품 관리" },
            { key: "communication" as OwnerSection, label: "고객 소통" },
            { key: "promotion" as OwnerSection, label: "홍보 및 소식" },
          ].map((section) => (
            <button
              key={section.key}
              onClick={() => {
                if (activeSection === section.key) return;
                closeOrMoveSection(section.key);
              }}
              className={`h-10 px-4 whitespace-nowrap rounded-lg text-[13px] transition-colors flex-shrink-0 ${
                activeSection === section.key
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
        {saveNotice && (
          <div className="rounded-lg bg-emerald-50 text-emerald-700 text-[12px] px-3 py-2">
            {saveNotice}
          </div>
        )}

        {activeSection === "store" && (
          <>
            <div className="bg-white rounded-xl p-4">
              <h2 className="text-[14px] text-gray-900 mb-1">지도에서 핀 지정</h2>
              <p className="text-[12px] text-gray-400 mb-3">지도 클릭으로 가게 위치 핀을 먼저 찍어주세요.</p>
              <div className="mb-3 flex gap-2 overflow-x-auto">
                {(Object.entries(MARKET_VIEW_CONFIG) as Array<[MarketId, (typeof MARKET_VIEW_CONFIG)[MarketId]]>).map(([id, market]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setSelectedMarket(id);
                      setPin(null);
                      pinMarkerRef.current?.setMap(null);
                    }}
                    className={`h-8 px-3 rounded-lg text-[12px] whitespace-nowrap transition-colors ${
                      selectedMarket === id
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {market.label}
                  </button>
                ))}
              </div>
              <div className="relative w-full h-52 rounded-lg overflow-hidden bg-gray-100">
                {isPlaceholderClientId ? (
                  <div className="w-full h-full flex items-center justify-center text-[12px] text-gray-500">
                    `.env`에 네이버 지도 키를 설정해주세요.
                  </div>
                ) : mapError ? (
                  <div className="w-full h-full flex items-center justify-center text-[12px] text-gray-500">
                    지도 로딩에 실패했어요. 도메인/키를 확인해주세요.
                  </div>
                ) : (
                  <div ref={mapContainerRef} className="w-full h-full" />
                )}
              </div>
              <div className="mt-2 text-[12px] text-gray-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {pin
                  ? `선택 좌표: ${pin.lat.toFixed(6)}, ${pin.lng.toFixed(6)}`
                  : mapReady
                    ? "아직 핀이 없습니다. 지도를 클릭하세요."
                    : "지도를 불러오는 중..."}
              </div>
            </div>

            <form className="bg-white rounded-xl p-4 space-y-3">
              <div>
                <label className="block text-[12px] text-gray-500 mb-1">상점명</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  type="text"
                  placeholder="예: 천안순대국밥"
                  className="w-full h-10 rounded-lg bg-gray-100 px-3 text-[14px] focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
              </div>

              <div>
                <label className="block text-[12px] text-gray-500 mb-1">위치</label>
                <input
                  value={form.location}
                  onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                  type="text"
                  placeholder="예: 천안역전시장 A동 12호"
                  className="w-full h-10 rounded-lg bg-gray-100 px-3 text-[14px] focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
              </div>

              <div>
                <label className="block text-[12px] text-gray-500 mb-1">운영시간</label>
                <input
                  value={form.hours}
                  onChange={(e) => setForm((prev) => ({ ...prev, hours: e.target.value }))}
                  type="text"
                  placeholder="예: 09:00 - 21:00"
                  className="w-full h-10 rounded-lg bg-gray-100 px-3 text-[14px] focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
              </div>

              <div>
                <label className="block text-[12px] text-gray-500 mb-1">연락처</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  type="tel"
                  placeholder="예: 041-555-1234"
                  className="w-full h-10 rounded-lg bg-gray-100 px-3 text-[14px] focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
              </div>

              <div>
                <label className="block text-[12px] text-gray-500 mb-1">카테고리 (중복 선택)</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleOption(category, selectedCategories, setSelectedCategories)}
                      className={`px-2.5 py-1.5 rounded-lg text-[12px] ${
                        selectedCategories.includes(category) ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[12px] text-gray-500 mb-1">결제 수단 관리 (중복 선택)</label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_OPTIONS.map((payment) => (
                    <button
                      key={payment}
                      type="button"
                      onClick={() => toggleOption(payment, selectedPayments, setSelectedPayments)}
                      className={`px-2.5 py-1.5 rounded-lg text-[12px] ${
                        selectedPayments.includes(payment) ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {payment}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[12px] text-gray-500 mb-1">소개</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  placeholder="상점 소개를 입력해주세요."
                  className="w-full rounded-lg bg-gray-100 px-3 py-2 text-[14px] resize-none focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
              </div>

              <div>
                <label className="block text-[12px] text-gray-500 mb-1">대표사진 지정</label>
                <label className="w-full h-10 rounded-lg bg-gray-100 px-3 text-[13px] text-gray-500 flex items-center gap-2 cursor-pointer">
                  <ImagePlus className="w-4 h-4" />
                  {form.representativePhotoName || "이미지 선택"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        setForm((prev) => ({
                          ...prev,
                          representativePhotoName: file.name,
                          representativePhotoUrl: typeof reader.result === "string" ? reader.result : "",
                        }));
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                {form.representativePhotoUrl && (
                  <div className="mt-2 w-full h-36 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                    <img
                      src={form.representativePhotoUrl}
                      alt="대표사진 미리보기"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => closeOrMoveSection(null, resetStoreForm)}
                  className="h-10 rounded-lg bg-gray-100 text-gray-600 text-[13px]"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleAddStore}
                  className="h-10 rounded-lg bg-gray-900 text-white text-[13px]"
                >
                  저장
                </button>
              </div>
            </form>
          </>
        )}

        {activeSection === "product" && (
          <div className="bg-white rounded-xl p-4 space-y-3">
            <h2 className="text-[14px] text-gray-900">메뉴 관리</h2>
            {menus.map((menu, idx) => (
              <div key={menu.id} className="rounded-lg bg-gray-50 p-3 space-y-2">
                <p className="text-[12px] text-gray-400">메뉴 {idx + 1}</p>
                <input
                  value={menu.name}
                  onChange={(e) =>
                    setMenus((prev) => prev.map((m) => (m.id === menu.id ? { ...m, name: e.target.value } : m)))
                  }
                  placeholder="메뉴 이름"
                  className="w-full h-9 rounded-md bg-white px-3 text-[13px] border border-gray-200"
                />
                <input
                  value={menu.price}
                  onChange={(e) =>
                    setMenus((prev) => prev.map((m) => (m.id === menu.id ? { ...m, price: e.target.value } : m)))
                  }
                  placeholder="가격"
                  className="w-full h-9 rounded-md bg-white px-3 text-[13px] border border-gray-200"
                />
                <label className="w-full h-9 rounded-md bg-white px-3 text-[12px] text-gray-500 border border-gray-200 flex items-center cursor-pointer">
                  {menu.photoName || "사진 추가"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      setMenus((prev) =>
                        prev.map((m) => (m.id === menu.id ? { ...m, photoName: e.target.files?.[0]?.name ?? "" } : m)),
                      )
                    }
                  />
                </label>
              </div>
            ))}
            <button
              type="button"
              onClick={addMenuRow}
              className="w-full h-9 rounded-lg bg-gray-100 text-gray-600 text-[13px] flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" />
              메뉴 추가
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => closeOrMoveSection(null)}
                className="h-10 rounded-lg bg-gray-100 text-gray-600 text-[13px]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => saveOwnerDraft("상품 관리 내용이 저장됐어요.")}
                className="h-10 rounded-lg bg-gray-900 text-white text-[13px]"
              >
                저장
              </button>
            </div>
          </div>
        )}

        {activeSection === "communication" && (
          <div className="bg-white rounded-xl p-4 space-y-4">
            <div className="rounded-lg bg-gray-50 p-3">
              <h2 className="text-[14px] text-gray-900 mb-1">단골 현황</h2>
              <p className="text-[12px] text-gray-500">내 가게를 찜/즐겨찾기한 사용자: <span className="text-gray-900">128명</span></p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveCommunicationSubSection("review")}
                className={`flex-1 h-10 px-3 rounded-lg text-[13px] transition-colors ${
                  activeCommunicationSubSection === "review" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                리뷰 관리 <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">0</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCommunicationSubSection("inquiry")}
                className={`flex-1 h-10 px-3 rounded-lg text-[13px] transition-colors ${
                  activeCommunicationSubSection === "inquiry" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                문의 <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700">3</span>
              </button>
            </div>

            {activeCommunicationSubSection === "review" && (
              <div className="space-y-3">
                <div className="rounded-lg bg-gray-50 p-3">
                  <h2 className="text-[14px] text-gray-900 mb-1">리뷰 관리</h2>
                  <p className="text-[11px] text-gray-500 mb-2">후기 확인 및 답글</p>
                  <div className="rounded-md bg-white px-2 py-1.5 border border-gray-200 text-[11px] text-gray-600 mb-2">
                    "사장님이 친절해요!" - 고객 A
                  </div>
                  <textarea
                    rows={3}
                    placeholder="답글 작성"
                    value={reviewReply}
                    onChange={(e) => setReviewReply(e.target.value)}
                    className="w-full rounded-md bg-white px-2 py-1.5 border border-gray-200 text-[12px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => closeOrMoveSection(null)}
                    className="h-10 rounded-lg bg-gray-100 text-gray-600 text-[13px]"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={() => saveOwnerDraft("리뷰 답글이 저장됐어요.")}
                    className="h-10 rounded-lg bg-gray-900 text-white text-[13px]"
                  >
                    저장
                  </button>
                </div>
              </div>
            )}

            {activeCommunicationSubSection === "inquiry" && (
              <div className="space-y-3">
                <div className="rounded-lg bg-gray-50 p-3">
                  <h2 className="text-[14px] text-gray-900 mb-1">문의 응대</h2>
                  <p className="text-[11px] text-gray-500 mb-2">1:1 질문 확인 및 답변</p>
                  <div className="rounded-md bg-white px-2 py-1.5 border border-gray-200 text-[11px] text-gray-600 mb-2">
                    "오늘 갈치 재고 있나요?" - 고객 B
                  </div>
                  <textarea
                    rows={3}
                    placeholder="답변 작성"
                    value={inquiryReply}
                    onChange={(e) => setInquiryReply(e.target.value)}
                    className="w-full rounded-md bg-white px-2 py-1.5 border border-gray-200 text-[12px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => closeOrMoveSection(null)}
                    className="h-10 rounded-lg bg-gray-100 text-gray-600 text-[13px]"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={() => saveOwnerDraft("문의 답변이 저장됐어요.")}
                    className="h-10 rounded-lg bg-gray-900 text-white text-[13px]"
                  >
                    저장
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === "promotion" && (
          <div className="bg-white rounded-xl p-4 space-y-3">
            <div>
              <label className="block text-[12px] text-gray-500 mb-1">오늘의 특가</label>
              <textarea
                value={todayDeal}
                onChange={(e) => setTodayDeal(e.target.value)}
                rows={2}
                placeholder='예: "오늘만 갈치 3마리 만 원"'
                className="w-full rounded-lg bg-gray-100 px-3 py-2 text-[13px]"
              />
            </div>
            <div>
              <label className="block text-[12px] text-gray-500 mb-1">가게 소식</label>
              <textarea
                value={news}
                onChange={(e) => setNews(e.target.value)}
                rows={3}
                placeholder="신상품 입고, 휴무 공지 등"
                className="w-full rounded-lg bg-gray-100 px-3 py-2 text-[13px]"
              />
            </div>
            <div>
              <label className="block text-[12px] text-gray-500 mb-1">쿠폰/이벤트</label>
              <textarea
                value={couponEvent}
                onChange={(e) => setCouponEvent(e.target.value)}
                rows={3}
                placeholder="앱 사용자 전용 쿠폰 내용 작성"
                className="w-full rounded-lg bg-gray-100 px-3 py-2 text-[13px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => closeOrMoveSection(null)}
                className="h-10 rounded-lg bg-gray-100 text-gray-600 text-[13px]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => saveOwnerDraft("홍보 및 소식 내용이 저장됐어요.")}
                className="h-10 rounded-lg bg-gray-900 text-white text-[13px]"
              >
                저장
              </button>
            </div>
          </div>
        )}

        
      </div>
    </div>
  );
}
