import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  X, ChevronDown, Image, MapPin, BarChart2, Hash, Check, Plus, Trash2, Star,
} from "lucide-react";
import { addPost } from "../data/postStore";
import type { Category, MarketKey, PostLocationPin } from "../data/postStore";
import { STORES_BY_MARKET, type StoreData } from "../data/storeData";
import { MARKET_VIEW_CONFIG, pickStoreDisplayLatLng } from "../map/storeMapPlacement";
import { buildStoreMarkerIcon } from "../map/naverMarkerIcons";
import type { MarketId } from "../components/CartContext";

declare global {
  interface Window { naver?: any; }
}

// ─── Types ───────────────────────────────────────────
type LocationPin =
  | { type: "store"; store: StoreData; market: MarketKey }
  | { type: "custom"; name: string; description: string; lat: number; lng: number };

// ─── Constants ───────────────────────────────────────
const IS_SAJANGNIM = false;
const CATEGORIES: Category[] = ["사장님", "질문", "정보", "후기"];

const MARKET_LABELS: Record<MarketKey, string> = {
  jungang:     "천안중앙시장",
  byeongcheon: "천안역전시장",
  seonghwan:   "성환전통시장",
};

const CATEGORY_STYLE: Record<Category, string> = {
  사장님: "bg-gray-900 text-white",
  질문:   "bg-amber-100 text-amber-700",
  정보:   "bg-emerald-100 text-emerald-700",
  후기:   "bg-purple-100 text-purple-700",
};

// ─── LocationPickerMap ───────────────────────────────
function LocationPickerMap({
  market,
  onStoreClick,
  onMapClick,
  customPinLatLng,
}: {
  market: MarketKey;
  onStoreClick: (store: StoreData) => void;
  onMapClick: (lat: number, lng: number) => void;
  customPinLatLng: { lat: number; lng: number } | null;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<any>(null);
  const storeMarkersRef = useRef<any[]>([]);
  const customMarkerRef = useRef<any>(null);
  const onStoreClickRef = useRef(onStoreClick);
  onStoreClickRef.current = onStoreClick;
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const [mapReady, setMapReady] = useState(false);

  const clientId      = import.meta.env.VITE_NAVER_MAP_CLIENT_ID as string | undefined;
  const isPlaceholder = !clientId || clientId === "your_naver_map_client_id";

  // 지도 초기화
  useEffect(() => {
    if (isPlaceholder || !mapContainerRef.current) return;
    let cancelled = false;

    const initMap = () => {
      if (cancelled || !window.naver?.maps || !mapContainerRef.current) return;
      const view  = MARKET_VIEW_CONFIG[market as MarketId];
      const naver = window.naver;

      mapRef.current = new naver.maps.Map(mapContainerRef.current, {
        center:     new naver.maps.LatLng(view.center.lat, view.center.lng),
        zoom:       view.zoom,
        mapTypeId:  naver.maps.MapTypeId.NORMAL,
        scaleControl: false,
        logoControl:  false,
        mapDataControl: false,
      });

      naver.maps.Event.addListener(mapRef.current, "click", (e: any) => {
        onMapClickRef.current(e.coord.lat(), e.coord.lng());
      });

      setMapReady(true);
    };

    if (window.naver?.maps) {
      initMap();
    } else {
      const existing = document.querySelector<HTMLScriptElement>('script[data-naver-map-sdk="true"]');
      if (existing) {
        if (window.naver?.maps) initMap();
        else existing.addEventListener("load", initMap, { once: true });
      } else {
        const script = document.createElement("script");
        script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`;
        script.async = true;
        script.dataset.naverMapSdk = "true";
        script.onload = initMap;
        document.head.appendChild(script);
      }
    }

    return () => { cancelled = true; };
  }, [isPlaceholder]);

  // 시장 변경 시 지도 중심 이동
  useEffect(() => {
    if (!mapRef.current || !window.naver?.maps) return;
    const view  = MARKET_VIEW_CONFIG[market as MarketId];
    const naver = window.naver;
    mapRef.current.setCenter(new naver.maps.LatLng(view.center.lat, view.center.lng));
    mapRef.current.setZoom(view.zoom);
  }, [market]);

  // 상점 마커 렌더링
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.naver?.maps) return;
    const naver = window.naver;

    storeMarkersRef.current.forEach((m) => m.setMap(null));
    storeMarkersRef.current = [];

    const stores = STORES_BY_MARKET[market as MarketId] ?? [];
    storeMarkersRef.current = stores.map((store) => {
      const pos  = pickStoreDisplayLatLng(market as MarketId, store);
      const icon = buildStoreMarkerIcon(naver, store, { highlighted: false, circleSize: 14 });
      const marker = new naver.maps.Marker({
        map:      mapRef.current,
        position: new naver.maps.LatLng(pos.lat, pos.lng),
        title:    store.name,
        icon:     { content: icon.content, size: icon.size, anchor: icon.anchor },
        zIndex:   20,
      });
      naver.maps.Event.addListener(marker, "click", () => {
        onStoreClickRef.current(store);
      });
      return marker;
    });

    return () => {
      storeMarkersRef.current.forEach((m) => m.setMap(null));
      storeMarkersRef.current = [];
    };
  }, [market, mapReady]);

  // 커스텀 빨간 핀 마커
  useEffect(() => {
    if (!mapRef.current || !window.naver?.maps) return;
    const naver = window.naver;

    if (customMarkerRef.current) {
      customMarkerRef.current.setMap(null);
      customMarkerRef.current = null;
    }

    if (customPinLatLng) {
      const pinHtml = `<div style="width:28px;height:36px;display:flex;justify-content:center;align-items:flex-start;">
        <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 0C8.477 0 4 4.477 4 10c0 7.18 10 22 10 22s10-14.82 10-22c0-5.523-4.477-10-10-10z" fill="#EF4444"/>
          <circle cx="14" cy="10" r="4" fill="white"/>
        </svg>
      </div>`;
      customMarkerRef.current = new naver.maps.Marker({
        map:      mapRef.current,
        position: new naver.maps.LatLng(customPinLatLng.lat, customPinLatLng.lng),
        icon:     { content: pinHtml, anchor: new naver.maps.Point(14, 36) },
        zIndex:   100,
      });
    }
  }, [customPinLatLng]);

  if (isPlaceholder) {
    return (
      <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center gap-3">
        <MapPin className="w-10 h-10 text-gray-300" />
        <p className="text-[12px] text-gray-400 text-center leading-relaxed px-8">
          네이버 지도 키를 <code className="bg-gray-200 px-1 rounded">.env</code>에<br />
          실제 값으로 넣으면 지도가 표시됩니다.
        </p>
      </div>
    );
  }

  return <div ref={mapContainerRef} className="w-full h-full" />;
}

// ─── LocationPickerModal ─────────────────────────────
function LocationPickerModal({
  initialMarket,
  onClose,
  onConfirm,
}: {
  initialMarket: MarketKey;
  onClose: () => void;
  onConfirm: (pin: LocationPin) => void;
}) {
  const [market, setMarket]             = useState<MarketKey>(initialMarket);
  const [selectedStore, setSelectedStore] = useState<StoreData | null>(null);
  const [customLatLng, setCustomLatLng]   = useState<{ lat: number; lng: number } | null>(null);
  const [customName, setCustomName]       = useState("");
  const [customDesc, setCustomDesc]       = useState("");
  const [showCustomForm, setShowCustomForm] = useState(false);

  const handleStoreClick = useCallback((store: StoreData) => {
    setSelectedStore(store);
    setCustomLatLng(null);
    setShowCustomForm(false);
  }, []);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setSelectedStore(null);
    setCustomLatLng({ lat, lng });
    setCustomName("");
    setCustomDesc("");
    setShowCustomForm(true);
  }, []);

  const handleMarketChange = (key: MarketKey) => {
    setMarket(key);
    setSelectedStore(null);
    setCustomLatLng(null);
    setShowCustomForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white max-w-md mx-auto">
      {/* 헤더 */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <button onClick={onClose} className="p-1 -ml-1">
          <X className="w-5 h-5 text-gray-700" />
        </button>
        <span className="text-[15px] font-semibold text-gray-900">장소 선택</span>
        <div className="w-7" />
      </div>

      {/* 시장 탭 */}
      <div className="shrink-0 flex border-b border-gray-100">
        {(Object.entries(MARKET_LABELS) as [MarketKey, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => handleMarketChange(key)}
            className={`flex-1 py-2.5 text-[12px] transition-all border-b-2 ${
              market === key
                ? "border-gray-900 text-gray-900 font-medium"
                : "border-transparent text-gray-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 안내 */}
      <div className="shrink-0 px-4 py-2 bg-gray-50 border-b border-gray-100">
        <p className="text-[11px] text-gray-500">
          📍 상점 핀을 클릭하면 상점 카드가 표시돼요. 빈 곳을 클릭하면 빨간 핀을 찍을 수 있어요.
        </p>
      </div>

      {/* 지도 */}
      <div className="relative flex-1 min-h-0">
        <LocationPickerMap
          market={market}
          onStoreClick={handleStoreClick}
          onMapClick={handleMapClick}
          customPinLatLng={customLatLng}
        />

        {/* 상점 카드 */}
        {selectedStore && (
          <div className="absolute bottom-3 left-3 right-3 bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            <div className="flex gap-3 p-3 items-center">
              <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                <img
                  src={selectedStore.image}
                  alt={selectedStore.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-gray-900 truncate">{selectedStore.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                    {selectedStore.category}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                    <span className="text-[11px] text-gray-600">{selectedStore.rating}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="w-2.5 h-2.5 text-gray-400 flex-shrink-0" />
                  <span className="text-[11px] text-gray-500 truncate">{selectedStore.location}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedStore(null)}
                className="flex-shrink-0 self-start p-0.5"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <button
              onClick={() => onConfirm({ type: "store", store: selectedStore, market })}
              className="w-full py-3 bg-gray-900 text-white text-[14px] font-medium active:bg-gray-800 transition-colors"
            >
              이 상점 첨부하기
            </button>
          </div>
        )}

        {/* 커스텀 핀 입력 폼 */}
        {showCustomForm && customLatLng && (
          <div className="absolute bottom-3 left-3 right-3 bg-white rounded-2xl shadow-xl border border-gray-100">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-[14px] font-semibold text-gray-900">장소 정보 입력</span>
                <button
                  onClick={() => { setCustomLatLng(null); setShowCustomForm(false); }}
                  className="ml-auto p-0.5"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="장소 이름 (필수)"
                maxLength={30}
                autoFocus
                className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-[13px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:bg-gray-100 mb-2"
              />
              <input
                type="text"
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
                placeholder="간단한 설명 (선택)"
                maxLength={60}
                className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-[13px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:bg-gray-100 mb-3"
              />
              <button
                disabled={!customName.trim()}
                onClick={() => {
                  if (customLatLng && customName.trim()) {
                    onConfirm({
                      type: "custom",
                      name: customName.trim(),
                      description: customDesc.trim(),
                      lat: customLatLng.lat,
                      lng: customLatLng.lng,
                    });
                  }
                }}
                className="w-full py-3 bg-gray-900 text-white text-[14px] font-medium rounded-xl disabled:opacity-40 active:bg-gray-800 transition-colors"
              >
                이 장소 첨부하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── WritePage ───────────────────────────────────────
export function WritePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSajangnim] = useState(IS_SAJANGNIM);

  const [category, setCategory]                     = useState<Category | null>(null);
  const [showCategorySheet, setShowCategorySheet]   = useState(false);
  const [market, setMarket]                         = useState<MarketKey>("jungang");
  const [showMarketSheet, setShowMarketSheet]       = useState(false);
  const [title, setTitle]                           = useState("");
  const [body, setBody]                             = useState("");
  const [images, setImages]                         = useState<string[]>([]);
  const [tag, setTag]                               = useState("");
  const [tags, setTags]                             = useState<string[]>([]);
  const [showTagInput, setShowTagInput]             = useState(false);
  const [showPoll, setShowPoll]                     = useState(false);
  const [pollOptions, setPollOptions]               = useState<string[]>(["", ""]);
  const [locationPin, setLocationPin]               = useState<LocationPin | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const canSubmit = title.trim().length > 0 && category !== null;

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) =>
        setImages((prev) => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === " ") && tag.trim()) {
      e.preventDefault();
      const cleaned = tag.trim().replace(/^#/, "");
      if (cleaned && !tags.includes(cleaned))
        setTags((prev) => [...prev, cleaned]);
      setTag("");
    }
    if (e.key === "Backspace" && tag === "" && tags.length > 0)
      setTags((prev) => prev.slice(0, -1));
  };

  const updatePollOption = (i: number, val: string) =>
    setPollOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)));
  const addPollOption = () => {
    if (pollOptions.length < 5) setPollOptions((prev) => [...prev, ""]);
  };
  const removePollOption = (i: number) => {
    if (pollOptions.length > 2)
      setPollOptions((prev) => prev.filter((_, idx) => idx !== i));
  };

  const toPostPin = (pin: LocationPin | null): PostLocationPin | undefined => {
    if (!pin) return undefined;
    if (pin.type === "store") {
      return {
        type: "store",
        name: pin.store.name,
        category: pin.store.category,
        location: pin.store.location,
        image: pin.store.image,
        rating: pin.store.rating,
        market: pin.market,
      };
    }
    return { type: "custom", name: pin.name, description: pin.description, lat: pin.lat, lng: pin.lng };
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    const userName = localStorage.getItem("user_name") || "익명";
    addPost({
      id: Date.now(),
      category: category!,
      market,
      title: title.trim(),
      preview: body.trim().slice(0, 60) + (body.length > 60 ? "..." : ""),
      body: body.trim(),
      author: isSajangnim ? "사장님" : userName,
      time: "방금",
      views: 0,
      likes: 0,
      comments: 0,
      image: images[0],
      tags,
      pollOptions: showPoll ? pollOptions.filter((o) => o.trim()) : undefined,
      commentList: [],
      locationPin: toPostPin(locationPin),
    });
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto relative">

      {/* ── 헤더 ── */}
      <div className="sticky top-0 bg-white z-20 border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1">
            <X className="w-5 h-5 text-gray-700" />
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`text-[15px] font-medium transition-colors ${
              canSubmit ? "text-gray-900" : "text-gray-300"
            }`}
          >
            완료
          </button>
        </div>

        {/* 주제 / 시장 */}
        <div className="flex items-center px-4 pb-3 gap-2">
          <button
            onClick={() => setShowCategorySheet(true)}
            className="flex items-center gap-1"
          >
            {category ? (
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${CATEGORY_STYLE[category]}`}>
                {category}
              </span>
            ) : (
              <span className="text-[14px] text-gray-500">주제를 선택해주세요.</span>
            )}
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          <button
            onClick={() => setShowMarketSheet(true)}
            className="flex items-center gap-1 ml-auto"
          >
            <span className="text-[12px] text-gray-500">{MARKET_LABELS[market]}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* ── 작성 영역 ── */}
      <div className="flex-1 px-4 pt-5 pb-36">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요."
          maxLength={60}
          className="w-full text-[18px] font-semibold text-gray-900 placeholder:text-gray-300 focus:outline-none mb-3"
        />

        {/* 제목 / 내용 구분선 */}
        <div className="h-px bg-gray-300 mb-3" />

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`시장 이웃과 이야기를 나눠보세요.\n#맛집 #세일 #이벤트...`}
          rows={8}
          className="w-full text-[15px] text-gray-700 placeholder:text-gray-300 focus:outline-none resize-none leading-relaxed"
        />

        {/* 이미지 미리보기 */}
        {images.length > 0 && (
          <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-hide">
            {images.map((src, i) => (
              <div
                key={i}
                className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-gray-100"
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute top-0.5 right-0.5 w-4 h-4 bg-gray-900 bg-opacity-60 rounded-full flex items-center justify-center"
                >
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
              </div>
            ))}
            {images.length < 10 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-shrink-0 w-20 h-20 rounded-xl border border-dashed border-gray-200 flex items-center justify-center"
              >
                <Image className="w-5 h-5 text-gray-300" />
              </button>
            )}
          </div>
        )}

        {/* 장소 카드 */}
        {locationPin && (
          <div className="mt-4 border border-gray-200 rounded-2xl overflow-hidden bg-white">
            {locationPin.type === "store" ? (
              <div className="flex gap-3 p-3 items-center">
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                  <img
                    src={locationPin.store.image}
                    alt={locationPin.store.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-blue-500 flex-shrink-0" />
                    <span className="text-[13px] font-semibold text-gray-900 truncate">
                      {locationPin.store.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-gray-400">{locationPin.store.category}</span>
                    <span className="text-gray-200">·</span>
                    <span className="text-[11px] text-gray-400 truncate">
                      {locationPin.store.location}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setLocationPin(null)}
                  className="flex-shrink-0 self-start p-0.5"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            ) : (
              <div className="flex gap-3 p-3 items-center">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900">{locationPin.name}</p>
                  {locationPin.description && (
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                      {locationPin.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setLocationPin(null)}
                  className="flex-shrink-0 self-start p-0.5"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* 투표 UI */}
        {showPoll && (
          <div className="mt-4 border border-gray-100 rounded-2xl px-4 py-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-semibold text-gray-700">투표 항목</span>
              <button onClick={() => setShowPoll(false)}>
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="space-y-2">
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[12px] text-gray-400 w-4">{i + 1}</span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updatePollOption(i, e.target.value)}
                    placeholder={`항목 ${i + 1}`}
                    maxLength={30}
                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-[13px] text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-gray-400"
                  />
                  {pollOptions.length > 2 && (
                    <button onClick={() => removePollOption(i)}>
                      <Trash2 className="w-4 h-4 text-gray-300" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {pollOptions.length < 5 && (
              <button
                onClick={addPollOption}
                className="mt-2 flex items-center gap-1.5 text-[12px] text-gray-400 active:text-gray-600"
              >
                <Plus className="w-3.5 h-3.5" />
                항목 추가 (최대 5개)
              </button>
            )}
          </div>
        )}

        {/* 태그 입력 */}
        {showTagInput && (
          <div className="mt-4 flex flex-wrap gap-1.5 items-center border border-gray-200 rounded-xl px-3 py-2 min-h-[42px]">
            {tags.map((t) => (
              <span
                key={t}
                onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                className="text-[13px] text-blue-500 cursor-pointer"
              >
                #{t}
              </span>
            ))}
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="태그 입력 후 Space"
              className="flex-1 min-w-[100px] text-[13px] text-gray-700 placeholder:text-gray-300 focus:outline-none"
            />
          </div>
        )}

        {/* TIP 박스 */}
        {body.length === 0 && images.length === 0 && !showPoll && !locationPin && (
          <div className="mt-10">
            <p className="text-[13px] text-blue-400 mb-2">
              <span className="font-semibold text-blue-500">TIP</span>{" "}
              시장 커뮤니티에서 이런 이야기를 나눠보세요!
            </p>
            <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5">
              {[
                "우리 시장의 질문과 정보를 공유해요.",
                "이웃 상인과 교류하고 싶은 소식을 공유해요.",
                "운영정책에 어긋나는 글은 올릴 수 없어요.",
              ].map((tip) => (
                <div key={tip} className="flex items-start gap-1.5">
                  <span className="text-gray-400 mt-0.5">•</span>
                  <span className="text-[13px] text-gray-500">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 하단 툴바 ── */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 px-4 py-3">
        <div className="flex items-center gap-5 text-gray-400">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 active:text-gray-700 transition-colors"
          >
            <Image className="w-5 h-5" />
            <span className="text-[13px]">사진</span>
          </button>
          <button
            onClick={() => setShowLocationPicker(true)}
            className={`flex items-center gap-1.5 transition-colors ${
              locationPin ? "text-blue-500" : "active:text-gray-700"
            }`}
          >
            <MapPin className={`w-5 h-5 ${locationPin ? "fill-blue-100" : ""}`} />
            <span className="text-[13px]">장소</span>
          </button>
          <button
            onClick={() => setShowPoll((v) => !v)}
            className={`flex items-center gap-1.5 transition-colors ${
              showPoll ? "text-gray-900" : "active:text-gray-700"
            }`}
          >
            <BarChart2 className="w-5 h-5" />
            <span className="text-[13px]">투표</span>
          </button>
          <button
            onClick={() => setShowTagInput((v) => !v)}
            className={`flex items-center gap-1.5 transition-colors ${
              showTagInput ? "text-gray-900" : "active:text-gray-700"
            }`}
          >
            <Hash className="w-5 h-5" />
            <span className="text-[13px]">태그</span>
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImageAdd}
      />

      {/* ── 주제 선택 바텀시트 ── */}
      {showCategorySheet && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50">
          <div className="bg-white rounded-t-2xl px-4 pt-5 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <p className="text-[16px] font-semibold text-gray-900 mb-4">주제 선택</p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => {
                const disabled = cat === "사장님" && !isSajangnim;
                return (
                  <button
                    key={cat}
                    disabled={disabled}
                    onClick={() => { setCategory(cat); setShowCategorySheet(false); }}
                    className={`py-3 rounded-xl text-[14px] font-medium border transition-all relative
                      ${disabled
                        ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                        : category === cat
                          ? "border-gray-900 bg-gray-50 text-gray-900"
                          : "border-gray-100 bg-gray-50 text-gray-700 active:bg-gray-100"
                      }`}
                  >
                    {cat}
                    {disabled && (
                      <span className="block text-[10px] text-gray-300 mt-0.5">사장님 전용</span>
                    )}
                    {!disabled && category === cat && (
                      <Check className="w-3.5 h-3.5 absolute top-2 right-2 text-gray-900" />
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowCategorySheet(false)}
              className="mt-4 w-full py-3 text-[14px] text-gray-400 active:text-gray-600"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* ── 시장 선택 바텀시트 ── */}
      {showMarketSheet && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50">
          <div className="bg-white rounded-t-2xl px-4 pt-5 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <p className="text-[16px] font-semibold text-gray-900 mb-4">시장 선택</p>
            <div className="space-y-2">
              {(Object.entries(MARKET_LABELS) as [MarketKey, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { setMarket(key); setShowMarketSheet(false); }}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-[14px] transition-all ${
                    market === key
                      ? "border-gray-900 bg-gray-50 text-gray-900 font-medium"
                      : "border-gray-100 bg-gray-50 text-gray-600 active:bg-gray-100"
                  }`}
                >
                  {label}
                  {market === key && <Check className="w-4 h-4 text-gray-900" />}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowMarketSheet(false)}
              className="mt-4 w-full py-3 text-[14px] text-gray-400 active:text-gray-600"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* ── 장소 선택 모달 ── */}
      {showLocationPicker && (
        <LocationPickerModal
          initialMarket={market}
          onClose={() => setShowLocationPicker(false)}
          onConfirm={(pin) => {
            setLocationPin(pin);
            setShowLocationPicker(false);
          }}
        />
      )}
    </div>
  );
}
