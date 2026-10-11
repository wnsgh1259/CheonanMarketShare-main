import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, MousePointer2, Plus, RotateCcw, Save, Trash2, Undo2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import type { MarketId } from "../components/CartContext";
import { MARKET_VIEW_CONFIG } from "../map/storeMapPlacement";
import { clearMarketAreaOverlays, drawMarketAreaOverlays, type MarketAreaOverlays } from "../map/drawMarketArea";
import {
  emptyMarketArea,
  loadMarketArea,
  saveMarketArea,
  seedMarketArea,
  type LatLngPoint,
  type MarketAreaDoc,
} from "../data/marketArea";
import { buildAdminReturnUrl, peekAdminReturnState } from "../data/adminNavigation";

type EditorMode = "draw" | "edit";

type NaverMapRef = {
  setCenter: (latLng: unknown) => void;
  setZoom: (zoom: number) => void;
};

declare global {
  interface Window {
    naver?: any;
  }
}

const MARKET_LABELS: Record<MarketId, string> = {
  jungang: "천안중앙시장",
  byeongcheon: "천안역전시장",
  seonghwan: "성환이화시장",
};

function parseMarket(raw: string | null): MarketId {
  if (raw === "jungang" || raw === "byeongcheon" || raw === "seonghwan") return raw;
  return "jungang";
}

function distMeters(a: LatLngPoint, b: LatLngPoint) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function nearestEdgeInsert(
  ring: LatLngPoint[],
  point: LatLngPoint,
  maxMeters = 18,
): { index: number; meters: number } | null {
  if (ring.length < 2) return null;
  let best: { index: number; meters: number } | null = null;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    // sample mid for rough hit-test
    const mid = { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
    const meters = distMeters(mid, point);
    if (meters > maxMeters) continue;
    if (!best || meters < best.meters) best = { index: i + 1, meters };
  }
  return best;
}

export function MarketAreaEditorPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const marketId = parseMarket(searchParams.get("market"));

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<NaverMapRef | null>(null);
  const areaOverlaysRef = useRef<MarketAreaOverlays | null>(null);
  const draftPolylineRef = useRef<any>(null);
  const vertexMarkersRef = useRef<any[]>([]);
  const midMarkersRef = useRef<any[]>([]);

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [doc, setDoc] = useState<MarketAreaDoc>(() => seedMarketArea(marketId));
  const [mode, setMode] = useState<EditorMode>("edit");
  const [draftPoints, setDraftPoints] = useState<LatLngPoint[]>([]);
  const [selectedRing, setSelectedRing] = useState(0);
  const [selectedVertex, setSelectedVertex] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [history, setHistory] = useState<MarketAreaDoc[]>([]);

  const modeRef = useRef(mode);
  const draftRef = useRef(draftPoints);
  const docRef = useRef(doc);
  const selectedRingRef = useRef(selectedRing);
  modeRef.current = mode;
  draftRef.current = draftPoints;
  docRef.current = doc;
  selectedRingRef.current = selectedRing;

  const clientId = import.meta.env.VITE_NAVER_MAP_CLIENT_ID as string | undefined;
  const isPlaceholder = !clientId || clientId === "your_naver_map_client_id";
  const view = MARKET_VIEW_CONFIG[marketId];

  const pushHistory = useCallback((prev: MarketAreaDoc) => {
    setHistory((h) => [...h.slice(-19), prev]);
  }, []);

  const applyDoc = useCallback(
    (updater: (prev: MarketAreaDoc) => MarketAreaDoc) => {
      setDoc((prev) => {
        pushHistory(prev);
        return { ...updater(prev), updatedAt: new Date().toISOString() };
      });
      setDirty(true);
      setNotice("");
    },
    [pushHistory],
  );
  const applyDocRef = useRef(applyDoc);
  applyDocRef.current = applyDoc;

  const goBack = () => {
    if (dirty && !window.confirm("저장하지 않은 변경이 있습니다. 나가시겠습니까?")) return;
    const saved = peekAdminReturnState();
    navigate(buildAdminReturnUrl(saved?.market ?? marketId), { replace: true });
  };

  const undo = () => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setDoc(prev);
      setDirty(true);
      setDraftPoints([]);
      setSelectedVertex(null);
      return h.slice(0, -1);
    });
  };

  useEffect(() => {
    let cancelled = false;
    setDoc(seedMarketArea(marketId));
    setDraftPoints([]);
    setSelectedRing(0);
    setSelectedVertex(null);
    setDirty(false);
    setHistory([]);
    setNotice("");
    setMode("edit");
    void loadMarketArea(marketId).then((loaded) => {
      if (!cancelled) setDoc(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [marketId]);

  // Init map
  useEffect(() => {
    if (isPlaceholder || !clientId || !mapContainerRef.current) return;
    let cancelled = false;
    let rafId: number | null = null;

    const initMap = () => {
      if (cancelled || !window.naver?.maps || !mapContainerRef.current) return;
      const { clientWidth, clientHeight } = mapContainerRef.current;
      if (clientWidth === 0 || clientHeight === 0) {
        rafId = window.requestAnimationFrame(initMap);
        return;
      }
      const naver = window.naver;
      const map = new naver.maps.Map(mapContainerRef.current, {
        center: new naver.maps.LatLng(view.center.lat, view.center.lng),
        zoom: Math.max(view.zoom, 16),
        mapTypeId: naver.maps.MapTypeId.NORMAL,
        scaleControl: false,
        logoControl: false,
        mapDataControl: false,
      });
      mapRef.current = map;

      naver.maps.Event.addListener(map, "click", (e: any) => {
        const lat = typeof e?.coord?.lat === "function" ? e.coord.lat() : e?.coord?.y;
        const lng = typeof e?.coord?.lng === "function" ? e.coord.lng() : e?.coord?.x;
        if (typeof lat !== "number" || typeof lng !== "number") return;
        const point = { lat, lng };

        if (modeRef.current === "draw") {
          const draft = draftRef.current;
          if (draft.length >= 3 && distMeters(draft[0], point) < 12) {
            // close near first point
            applyDocRef.current((prev) => ({
              ...prev,
              rings: [...prev.rings, draft],
            }));
            setDraftPoints([]);
            setSelectedRing(docRef.current.rings.length);
            setMode("edit");
            setNotice("영역이 닫혔습니다. 꼭짓점을 드래그해 다듬을 수 있어요.");
            return;
          }
          setDraftPoints((prev) => [...prev, point]);
          return;
        }

        // edit: insert vertex on nearest edge of selected ring
        const ringIdx = selectedRingRef.current;
        const ring = docRef.current.rings[ringIdx];
        if (!ring) return;
        const hit = nearestEdgeInsert(ring, point);
        if (hit) {
          applyDocRef.current((prev) => {
            const rings = prev.rings.map((r, i) => {
              if (i !== ringIdx) return r;
              const next = [...r];
              next.splice(hit.index, 0, point);
              return next;
            });
            return { ...prev, rings };
          });
          setSelectedVertex(hit.index);
        }
      });

      setMapReady(true);
    };

    if (window.naver?.maps) {
      initMap();
    } else {
      const existing = document.querySelector<HTMLScriptElement>('script[data-naver-map-sdk="true"]');
      if (existing) {
        existing.addEventListener("load", initMap);
        if (window.naver?.maps) initMap();
      } else {
        const script = document.createElement("script");
        script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`;
        script.async = true;
        script.dataset.naverMapSdk = "true";
        script.onload = () => initMap();
        script.onerror = () => setMapError(true);
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      if (rafId != null) window.cancelAnimationFrame(rafId);
      clearMarketAreaOverlays(areaOverlaysRef.current);
      areaOverlaysRef.current = null;
      draftPolylineRef.current?.setMap(null);
      draftPolylineRef.current = null;
      vertexMarkersRef.current.forEach((m) => m.setMap(null));
      vertexMarkersRef.current = [];
      midMarkersRef.current.forEach((m) => m.setMap(null));
      midMarkersRef.current = [];
      mapRef.current = null;
      setMapReady(false);
    };
  }, [marketId, clientId, isPlaceholder, view.center.lat, view.center.lng, view.zoom]);

  // Draw filled area + edit handles
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.naver?.maps) return;
    const naver = window.naver;
    const map = mapRef.current;

    clearMarketAreaOverlays(areaOverlaysRef.current);
    areaOverlaysRef.current = drawMarketAreaOverlays(
      naver,
      map,
      {
        fillColor: doc.fillColor ?? view.fillColor,
        areaPaths: doc.rings,
      },
      { showLabel: false, zIndex: 10 },
    );

    // draft polyline
    draftPolylineRef.current?.setMap(null);
    draftPolylineRef.current = null;
    if (draftPoints.length > 0) {
      draftPolylineRef.current = new naver.maps.Polyline({
        map,
        path: draftPoints.map((p) => new naver.maps.LatLng(p.lat, p.lng)),
        strokeColor: view.fillColor,
        strokeOpacity: 0.95,
        strokeWeight: 3,
        zIndex: 30,
      });
    }

    // vertex markers for selected ring (edit mode)
    vertexMarkersRef.current.forEach((m) => m.setMap(null));
    vertexMarkersRef.current = [];
    midMarkersRef.current.forEach((m) => m.setMap(null));
    midMarkersRef.current = [];

    if (mode !== "edit") return;
    const ring = doc.rings[selectedRing];
    if (!ring) return;

    ring.forEach((point, index) => {
      const selected = selectedVertex === index;
      const marker = new naver.maps.Marker({
        map,
        position: new naver.maps.LatLng(point.lat, point.lng),
        zIndex: 40,
        draggable: true,
        icon: {
          content: `<div style="width:${selected ? 14 : 11}px;height:${selected ? 14 : 11}px;border-radius:999px;background:#fff;border:2.5px solid ${view.fillColor};box-shadow:0 1px 6px rgba(0,0,0,.25);"></div>`,
          anchor: new naver.maps.Point(selected ? 7 : 5.5, selected ? 7 : 5.5),
        },
      });
      naver.maps.Event.addListener(marker, "click", (e: any) => {
        e?.domEvent?.stopPropagation?.();
        setSelectedVertex(index);
      });
      naver.maps.Event.addListener(marker, "dragend", (e: any) => {
        const lat = typeof e?.coord?.lat === "function" ? e.coord.lat() : marker.getPosition().lat();
        const lng = typeof e?.coord?.lng === "function" ? e.coord.lng() : marker.getPosition().lng();
        applyDocRef.current((prev) => {
          const rings = prev.rings.map((r, ri) => {
            if (ri !== selectedRingRef.current) return r;
            return r.map((p, pi) => (pi === index ? { lat, lng } : p));
          });
          return { ...prev, rings };
        });
      });
      vertexMarkersRef.current.push(marker);
    });

    // mid-edge + markers to insert
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      const mid = { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
      const insertAt = i + 1;
      const midMarker = new naver.maps.Marker({
        map,
        position: new naver.maps.LatLng(mid.lat, mid.lng),
        zIndex: 35,
        icon: {
          content: `<div style="width:8px;height:8px;border-radius:999px;background:${view.fillColor}88;border:1.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.2);"></div>`,
          anchor: new naver.maps.Point(4, 4),
        },
      });
      naver.maps.Event.addListener(midMarker, "click", (e: any) => {
        e?.domEvent?.stopPropagation?.();
        applyDocRef.current((prev) => {
          const rings = prev.rings.map((r, ri) => {
            if (ri !== selectedRingRef.current) return r;
            const next = [...r];
            next.splice(insertAt, 0, mid);
            return next;
          });
          return { ...prev, rings };
        });
        setSelectedVertex(insertAt);
      });
      midMarkersRef.current.push(midMarker);
    }
  }, [doc, draftPoints, mode, selectedRing, selectedVertex, mapReady, marketId, view.fillColor]);

  const closeDraft = () => {
    if (draftPoints.length < 3) {
      setNotice("꼭짓점을 3개 이상 찍어야 영역을 닫을 수 있어요.");
      return;
    }
    applyDoc((prev) => ({ ...prev, rings: [...prev.rings, draftPoints] }));
    setSelectedRing(doc.rings.length);
    setDraftPoints([]);
    setMode("edit");
    setNotice("영역이 닫혔습니다. 꼭짓점을 드래그해 도로·건물 선을 따라 다듬으세요.");
  };

  const deleteSelectedVertex = () => {
    if (selectedVertex == null) return;
    const ring = doc.rings[selectedRing];
    if (!ring) return;
    if (ring.length <= 3) {
      setNotice("다각형은 꼭짓점이 최소 3개 필요합니다. 영역 자체를 삭제하세요.");
      return;
    }
    applyDoc((prev) => {
      const rings = prev.rings.map((r, i) =>
        i === selectedRing ? r.filter((_, vi) => vi !== selectedVertex) : r,
      );
      return { ...prev, rings };
    });
    setSelectedVertex(null);
  };

  const deleteSelectedRing = () => {
    if (!doc.rings[selectedRing]) return;
    if (!window.confirm("선택한 영역 조각을 삭제할까요?")) return;
    applyDoc((prev) => ({
      ...prev,
      rings: prev.rings.filter((_, i) => i !== selectedRing),
    }));
    setSelectedRing(0);
    setSelectedVertex(null);
  };

  const clearAll = () => {
    if (!window.confirm("이 시장의 영역을 모두 지울까요?")) return;
    applyDoc(() => emptyMarketArea(marketId));
    setDraftPoints([]);
    setSelectedRing(0);
    setSelectedVertex(null);
    setMode("draw");
  };

  const resetToSeed = () => {
    if (!window.confirm("처음 등록된 대략 영역으로 되돌릴까요?")) return;
    applyDoc(() => seedMarketArea(marketId));
    setDraftPoints([]);
    setSelectedRing(0);
    setSelectedVertex(null);
    setMode("edit");
  };

  const handleSave = async () => {
    if (draftPoints.length > 0) {
      setNotice("그리는 중인 선이 있습니다. 먼저 「닫기」하거나 취소하세요.");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveMarketArea(doc);
      setDoc(saved);
      setDirty(false);
      setNotice("시장 영역을 저장했습니다. 지도에 부드럽게 표시됩니다.");
    } finally {
      setSaving(false);
    }
  };

  const switchMarket = (id: MarketId) => {
    if (id === marketId) return;
    if (dirty && !window.confirm("저장하지 않은 변경이 있습니다. 시장을 바꿀까요?")) return;
    setSearchParams({ market: id });
  };

  const startNewRing = () => {
    setDraftPoints([]);
    setSelectedVertex(null);
    setMode("draw");
    setNotice("맵을 따라 꼭짓점을 찍으세요. 시작점 근처를 다시 누르거나 「닫기」로 완성합니다.");
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button type="button" onClick={goBack} className="p-1" aria-label="뒤로">
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-[15px] text-gray-900">시장영역 편집</h1>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            className={`flex items-center gap-1 h-8 px-2.5 rounded-lg text-[12px] ${
              dirty ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-400"
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "저장중" : "저장"}
          </button>
        </div>
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
          {(Object.keys(MARKET_LABELS) as MarketId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => switchMarket(id)}
              className={`h-8 px-3 rounded-lg text-[12px] whitespace-nowrap ${
                marketId === id ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              {MARKET_LABELS[id]}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-2 space-y-2">
        <div className="flex gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={startNewRing}
            className={`h-9 px-3 rounded-lg text-[12px] whitespace-nowrap flex items-center gap-1.5 ${
              mode === "draw" ? "bg-sky-600 text-white" : "bg-white text-gray-700 border border-gray-200"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            새 영역 그리기
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("edit");
              setDraftPoints([]);
            }}
            className={`h-9 px-3 rounded-lg text-[12px] whitespace-nowrap flex items-center gap-1.5 ${
              mode === "edit" ? "bg-sky-600 text-white" : "bg-white text-gray-700 border border-gray-200"
            }`}
          >
            <MousePointer2 className="w-3.5 h-3.5" />
            다듬기
          </button>
          {mode === "draw" && (
            <button
              type="button"
              onClick={closeDraft}
              className="h-9 px-3 rounded-lg text-[12px] whitespace-nowrap flex items-center gap-1.5 bg-emerald-600 text-white"
            >
              <Check className="w-3.5 h-3.5" />
              닫기
            </button>
          )}
          <button
            type="button"
            onClick={undo}
            disabled={history.length === 0}
            className="h-9 px-3 rounded-lg text-[12px] whitespace-nowrap flex items-center gap-1.5 bg-white text-gray-700 border border-gray-200 disabled:opacity-40"
          >
            <Undo2 className="w-3.5 h-3.5" />
            실행취소
          </button>
        </div>

        <p className="text-[12px] text-gray-500 leading-relaxed">
          {mode === "draw"
            ? "시장 외곽을 따라 꼭짓점을 찍으세요. 시작점 근처를 다시 클릭하거나 「닫기」로 완성합니다."
            : "하얀 꼭짓점을 드래그해 도로·건물 경계에 맞추고, 작은 점(변 중간)을 누르면 꼭짓점이 추가됩니다."}
        </p>

        <div className="flex items-center gap-2 overflow-x-auto">
          {doc.rings.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setSelectedRing(i);
                setSelectedVertex(null);
                setMode("edit");
              }}
              className={`h-7 px-2.5 rounded-md text-[11px] whitespace-nowrap ${
                selectedRing === i ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              영역 {i + 1}
            </button>
          ))}
          {doc.rings.length === 0 && (
            <span className="text-[11px] text-gray-400">아직 영역이 없습니다. 「새 영역 그리기」로 시작하세요.</span>
          )}
        </div>
      </div>

      <div className="px-4 flex-1 min-h-0">
        <div className="relative h-[min(56vh,460px)] rounded-xl overflow-hidden border border-gray-200 bg-white">
          {isPlaceholder ? (
            <div className="h-full flex items-center justify-center text-[13px] text-gray-500 px-6 text-center">
              네이버 맵 클라이언트 ID가 필요합니다.
            </div>
          ) : mapError ? (
            <div className="h-full flex items-center justify-center text-[13px] text-red-500">
              지도를 불러오지 못했습니다.
            </div>
          ) : (
            <div ref={mapContainerRef} className="w-full h-full" />
          )}
        </div>
      </div>

      <div className="px-4 py-3 space-y-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={deleteSelectedVertex}
            disabled={selectedVertex == null}
            className="h-8 px-2.5 rounded-lg text-[12px] bg-white border border-gray-200 text-gray-700 disabled:opacity-40 flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            꼭짓점 삭제
          </button>
          <button
            type="button"
            onClick={deleteSelectedRing}
            disabled={!doc.rings[selectedRing]}
            className="h-8 px-2.5 rounded-lg text-[12px] bg-red-50 text-red-600 border border-red-100 disabled:opacity-40"
          >
            이 영역 삭제
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="h-8 px-2.5 rounded-lg text-[12px] bg-white border border-gray-200 text-gray-700"
          >
            전체 지우기
          </button>
          <button
            type="button"
            onClick={resetToSeed}
            className="h-8 px-2.5 rounded-lg text-[12px] bg-white border border-gray-200 text-gray-700 flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            대략영역 복원
          </button>
        </div>

        {notice && (
          <p className="text-[12px] text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{notice}</p>
        )}

        <p className="text-[11px] text-gray-400 leading-relaxed">
          팁: 여러 사각형을 붙이지 말고, 시장 외곽을 <span className="text-gray-600">하나의 선</span>으로
          따라 그리면 내부 경계선 없이 자연스럽게 보입니다. 돌출된 골목만 꼭짓점으로 빼면 됩니다.
        </p>
      </div>
    </div>
  );
}
