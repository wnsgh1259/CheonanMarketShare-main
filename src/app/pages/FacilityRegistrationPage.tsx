import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ImagePlus, MapPin, ParkingSquare, Armchair, Toilet, Info, Package, Music } from "lucide-react";
import { useNavigate } from "react-router";
import type { MarketId } from "../components/CartContext";
import { MARKET_VIEW_CONFIG } from "../map/storeMapPlacement";
import {
  OWNER_EDIT_FACILITY_KEY,
} from "../data/ownerSharedStore";
import {
  loadOwnerCatalog,
  loadOwnerCatalogRemote,
  migrateLegacyOwnerDraftIfNeeded,
  saveOwnerCatalog,
} from "../data/ownerStoreData";

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

const FACILITY_COLOR_OPTIONS = [
  { label: "교통/이동", value: "#448AFF", icon: ParkingSquare },
  { label: "휴게/쉼터", value: "#4CAF50", icon: Armchair },
  { label: "청결/위생", value: "#FFC107", icon: Toilet },
  { label: "안내/지원", value: "#FF5252", icon: Info },
  { label: "물류/편의", value: "#9C27B0", icon: Package },
  { label: "문화/이벤트", value: "#FF9800", icon: Music },
];
const FIXED_FACILITY_MARKER_SIZE = 15;

const MARKET_TAB_LABELS: Record<MarketId, string> = {
  jungang: "천안중앙시장",
  byeongcheon: "천안역전시장",
  seonghwan: "성환시장",
};

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

declare global {
  interface Window {
    naver?: any;
  }
}

export function FacilityRegistrationPage() {
  const navigate = useNavigate();
  const query = new URLSearchParams(window.location.search);
  const queryMarket = query.get("market");
  const editFacilityIdParam = query.get("editFacilityId");
  const queryEditFacilityId =
    editFacilityIdParam != null && editFacilityIdParam !== "" ? Number(editFacilityIdParam) : Number.NaN;
  const initialMarket: MarketId =
    queryMarket === "jungang" || queryMarket === "byeongcheon" || queryMarket === "seonghwan"
      ? queryMarket
      : "jungang";
  const initialEditFacilityId = Number.isFinite(queryEditFacilityId) ? queryEditFacilityId : null;
  const returnToAdmin = query.get("returnTo") === "admin" || initialEditFacilityId !== null;

  const goBackToAdmin = (opts?: { replace?: boolean }) => {
    navigate(`/admin?market=${encodeURIComponent(selectedMarket)}&tab=facility`, { replace: opts?.replace === true });
  };

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<NaverMapRef | null>(null);
  const pinMarkerRef = useRef<NaverMarkerRef | null>(null);
  const marketPolygonsRef = useRef<NaverPolygonRef[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<MarketId>(initialMarket);
  const [editingFacilityId, setEditingFacilityId] = useState<number | null>(initialEditFacilityId);
  const [form, setForm] = useState({
    name: "",
    hours: "",
    lat: "",
    lng: "",
    color: "#448AFF",
    image: "",
    imageName: "",
  });
  const [saveNotice, setSaveNotice] = useState("");

  const clientId = import.meta.env.VITE_NAVER_MAP_CLIENT_ID as string | undefined;
  const isPlaceholderClientId = !clientId || clientId === "your_naver_map_client_id";
  const selectedMarketView = MARKET_VIEW_CONFIG[selectedMarket];

  const formColorRef = useRef(form.color);
  formColorRef.current = form.color;

  const makeFacilityPinIcon = (naver: any) => ({
    content: `<div style="width:${FIXED_FACILITY_MARKER_SIZE}px;height:${FIXED_FACILITY_MARKER_SIZE}px;border-radius:999px;background:${formColorRef.current || "#448AFF"};border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.18);"></div>`,
    size: new naver.maps.Size(FIXED_FACILITY_MARKER_SIZE, FIXED_FACILITY_MARKER_SIZE),
    anchor: new naver.maps.Point(FIXED_FACILITY_MARKER_SIZE / 2, FIXED_FACILITY_MARKER_SIZE / 2),
  });

  const persistDraftFacilities = (facilities: DraftFacility[]) => {
    const catalog = loadOwnerCatalog();
    saveOwnerCatalog({ ...catalog, facilities });
  };

  useEffect(() => {
    migrateLegacyOwnerDraftIfNeeded();
    let cancelled = false;
    const load = async () => {
      try {
        const remoteCatalog = await loadOwnerCatalogRemote();
        const localCatalog = loadOwnerCatalog();
        const catalog =
          remoteCatalog && localCatalog.stores.length === 0 && (localCatalog.facilities?.length ?? 0) === 0
            ? remoteCatalog
            : localCatalog;
        if (remoteCatalog && catalog === remoteCatalog) {
          saveOwnerCatalog(remoteCatalog);
        }
        if (cancelled) return;
        const facilities = catalog.facilities ?? [];

        if (initialEditFacilityId !== null) {
          const direct = facilities.find((f) => f.id === initialEditFacilityId);
          let snap: DraftFacility | null = null;
          try {
            const er = window.localStorage.getItem(OWNER_EDIT_FACILITY_KEY);
            if (er) {
              const p = JSON.parse(er) as DraftFacility;
              if (p.id === initialEditFacilityId) snap = p;
            }
          } catch {
            /* ignore */
          }
          const target = direct ?? snap;
          if (target) {
            if (target.marketId) setSelectedMarket(target.marketId);
            setForm({
              name: target.name,
              hours: target.hours ?? "",
              lat: String(target.lat),
              lng: String(target.lng),
              color: target.color || "#448AFF",
              image: target.image ?? "",
              imageName: target.image ? "기존 사진" : "",
            });
            setPin({ lat: target.lat, lng: target.lng });
            setEditingFacilityId(target.id);
          }
        }
      } catch {
        /* ignore */
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [initialEditFacilityId]);

  useEffect(() => {
    if (!clientId || !mapContainerRef.current) return;
    let cancelled = false;

    const initMap = () => {
      if (cancelled || !window.naver?.maps || !mapContainerRef.current) return;
      setMapReady(false);
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
        const lat = typeof e?.coord?.lat === "function" ? e.coord.lat() : e?.coord?.y;
        const lng = typeof e?.coord?.lng === "function" ? e.coord.lng() : e?.coord?.x;
        if (typeof lat !== "number" || typeof lng !== "number") return;
        setPin({ lat, lng });
        setForm((prev) => ({ ...prev, lat: lat.toFixed(6), lng: lng.toFixed(6) }));

        if (!pinMarkerRef.current) {
          pinMarkerRef.current = new naver.maps.Marker({
            map,
            position: new naver.maps.LatLng(lat, lng),
            title: "편의시설 핀",
            icon: makeFacilityPinIcon(naver),
          });
        } else {
          pinMarkerRef.current.setPosition(new naver.maps.LatLng(lat, lng));
          pinMarkerRef.current.setMap(map);
          pinMarkerRef.current.setIcon(makeFacilityPinIcon(naver));
        }
      });
    };

    if (window.naver?.maps) {
      initMap();
      return () => {
        cancelled = true;
        setMapReady(false);
        pinMarkerRef.current?.setMap(null);
        pinMarkerRef.current = null;
        mapRef.current = null;
      };
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-naver-map-sdk="true"]');
    if (existingScript) {
      if (window.naver?.maps) initMap();
      else existingScript.addEventListener("load", initMap, { once: true });
      return () => {
        cancelled = true;
        existingScript.removeEventListener("load", initMap);
        setMapReady(false);
        pinMarkerRef.current?.setMap(null);
        pinMarkerRef.current = null;
        mapRef.current = null;
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
      setMapReady(false);
      pinMarkerRef.current?.setMap(null);
      pinMarkerRef.current = null;
      mapRef.current = null;
      script.onload = null;
      script.onerror = null;
    };
  }, [clientId, selectedMarket]);

  useEffect(() => {
    if (!window.naver?.maps || !mapRef.current) return;
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
  }, [selectedMarket, selectedMarketView]);

  useEffect(() => {
    if (!mapReady || !window.naver?.maps || !mapRef.current || !pin) return;
    const naver = window.naver;
    const map = mapRef.current;
    const position = new naver.maps.LatLng(pin.lat, pin.lng);
    if (!pinMarkerRef.current) {
      pinMarkerRef.current = new naver.maps.Marker({
        map,
        position,
        title: "편의시설 핀",
        icon: makeFacilityPinIcon(naver),
      });
    } else {
      pinMarkerRef.current.setPosition(position);
      pinMarkerRef.current.setMap(map);
      pinMarkerRef.current.setIcon(makeFacilityPinIcon(naver));
    }
  }, [pin, mapReady, form.color]);

  const handleSave = () => {
    const name = form.name.trim();
    const lat = pin?.lat ?? Number(form.lat);
    const lng = pin?.lng ?? Number(form.lng);
    if (!name) {
      setSaveNotice("장소명을 입력해 주세요.");
      window.setTimeout(() => setSaveNotice(""), 3500);
      return;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setSaveNotice("지도에서 핀을 찍거나 위도·경도를 입력해 주세요.");
      window.setTimeout(() => setSaveNotice(""), 3500);
      return;
    }

    const next: DraftFacility = {
      id: editingFacilityId ?? Date.now(),
      name,
      lat,
      lng,
      color: form.color || "#448AFF",
      size: FIXED_FACILITY_MARKER_SIZE,
      hours: form.hours.trim(),
      image: form.image || undefined,
      marketId: selectedMarket,
    };

    const base = readStorageDraftRecord();
    const prevFac = (Array.isArray(base.facilities) ? base.facilities : []) as DraftFacility[];
    const nextFacilities =
      editingFacilityId !== null && prevFac.some((f) => f.id === editingFacilityId)
        ? prevFac.map((f) => (f.id === editingFacilityId ? next : f))
        : [...prevFac, next];

    persistDraftFacilities(nextFacilities);

    if (returnToAdmin) {
      goBackToAdmin({ replace: true });
      return;
    }
    setSaveNotice("저장되었습니다.");
    window.setTimeout(() => setSaveNotice(""), 1800);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => {
              if (returnToAdmin) goBackToAdmin();
              else navigate(-1);
            }}
            className="p-1"
            aria-label="뒤로가기"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-[15px] text-gray-900">{editingFacilityId !== null ? "편의시설 수정" : "편의시설 등록"}</h1>
          <div className="w-7" />
        </div>
      </div>

      <div className="space-y-3 px-4 py-3">
        {saveNotice ? (
          <div
            className={`rounded-lg border px-3 py-2 text-[13px] ${
              /저장(되었|됐)/.test(saveNotice)
                ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            {saveNotice}
          </div>
        ) : null}

        <div className="rounded-xl bg-white p-4">
          <h2 className="mb-1 text-[14px] text-gray-900">시장 선택</h2>
          <div className="mb-3 flex gap-2 overflow-x-auto">
            {(Object.entries(MARKET_VIEW_CONFIG) as Array<[MarketId, (typeof MARKET_VIEW_CONFIG)[MarketId]]>).map(
              ([id]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setSelectedMarket(id);
                    setPin(null);
                    pinMarkerRef.current?.setMap(null);
                  }}
                  className={`h-8 flex-shrink-0 whitespace-nowrap rounded-lg px-3 text-[12px] transition-colors ${
                    selectedMarket === id ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {MARKET_TAB_LABELS[id]}
                </button>
              ),
            )}
          </div>

          <h2 className="mb-1 text-[14px] text-gray-900">지도에서 핀 지정</h2>
          <p className="mb-3 text-[12px] text-gray-400">지도를 눌러 위치를 지정해 주세요.</p>
          <div className="relative h-52 w-full overflow-hidden rounded-lg bg-gray-100">
            {isPlaceholderClientId ? (
              <div className="flex h-full w-full items-center justify-center text-[12px] text-gray-500">
                `.env`에 네이버 지도 키를 설정해주세요.
              </div>
            ) : mapError ? (
              <div className="flex h-full w-full items-center justify-center text-[12px] text-gray-500">
                지도 로딩에 실패했어요. 도메인/키를 확인해주세요.
              </div>
            ) : (
              <div ref={mapContainerRef} className="h-full w-full" />
            )}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[12px] text-gray-500">
            <MapPin className="h-3.5 w-3.5" />
            {pin
              ? `선택 좌표: ${pin.lat.toFixed(6)}, ${pin.lng.toFixed(6)}`
              : mapReady
                ? "아직 핀이 없습니다. 지도를 클릭하세요."
                : "지도를 불러오는 중..."}
          </div>
        </div>

        <form
          className="space-y-3 rounded-xl bg-white p-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <div>
            <label className="mb-1 block text-[12px] text-gray-500">장소명</label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="h-10 w-full rounded-lg bg-gray-100 px-3 text-[14px] focus:outline-none focus:ring-1 focus:ring-gray-300"
              placeholder="예: 공영주차장"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] text-gray-500">운영시간</label>
            <input
              value={form.hours}
              onChange={(e) => setForm((p) => ({ ...p, hours: e.target.value }))}
              className="h-10 w-full rounded-lg bg-gray-100 px-3 text-[14px] focus:outline-none focus:ring-1 focus:ring-gray-300"
              placeholder="예: 09:00 - 18:00"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[12px] text-gray-500">위도</label>
              <input
                value={form.lat}
                onChange={(e) => setForm((p) => ({ ...p, lat: e.target.value }))}
                className="h-10 w-full rounded-lg bg-gray-100 px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-gray-300"
                placeholder="lat"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] text-gray-500">경도</label>
              <input
                value={form.lng}
                onChange={(e) => setForm((p) => ({ ...p, lng: e.target.value }))}
                className="h-10 w-full rounded-lg bg-gray-100 px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-gray-300"
                placeholder="lng"
              />
            </div>
          </div>
          <div>
            <p className="mb-2 text-[12px] text-gray-600">마커 색상</p>
            <div className="grid grid-cols-3 gap-2">
              {FACILITY_COLOR_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, color: option.value }))}
                    className={`h-10 rounded-md border text-[11px] flex items-center justify-center gap-1 transition-colors ${
                      form.color === option.value
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 bg-white text-gray-700"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[12px] text-gray-500">사진</label>
            <label className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-lg bg-gray-100 px-3 text-[13px] text-gray-500">
              <ImagePlus className="h-4 w-4" />
              {form.imageName || "이미지 선택"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    setForm((p) => ({
                      ...p,
                      imageName: file.name,
                      image: typeof reader.result === "string" ? reader.result : "",
                    }));
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            {form.image ? (
              <div className="mt-2 h-28 w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                <img src={form.image} alt="미리보기" className="h-full w-full object-cover" />
              </div>
            ) : null}
          </div>

          {saveNotice ? (
            <p
              className={`rounded-lg border px-3 py-2 text-[12px] ${
                /저장(되었|됐)/.test(saveNotice)
                  ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              {saveNotice}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                if (returnToAdmin) goBackToAdmin();
                else navigate(-1);
              }}
              className="h-10 rounded-lg bg-gray-100 text-[13px] text-gray-600"
            >
              취소
            </button>
            <button type="submit" className="h-10 rounded-lg bg-gray-900 text-[13px] text-white">
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
