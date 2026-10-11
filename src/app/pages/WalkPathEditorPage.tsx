import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Link2, MapPin, MousePointer2, Plus, RotateCcw, Save, Store, Trash2, Undo2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import type { MarketId } from "../components/CartContext";
import { MARKET_VIEW_CONFIG } from "../map/storeMapPlacement";
import { getMarketStorePins, type MarketStorePin } from "../map/marketStorePins";
import { clearMarketAreaOverlays, drawMarketAreaOverlays, type MarketAreaOverlays } from "../map/drawMarketArea";
import { resolveMarketView } from "../data/marketArea";
import {
  addEdgeBetween,
  createWalkNodeId,
  edgeLengthMeters,
  emptyWalkPathGraph,
  loadWalkPathGraph,
  removeEdge,
  removeNode,
  saveWalkPathGraph,
  ensureStoreFrontNodes,
  totalPathLengthMeters,
  upsertStoreFrontNode,
  type WalkNode,
  type WalkNodeType,
  type WalkPathGraph,
} from "../data/walkPathGraph";
import { ensureWalkPathSeeded, resetWalkPathToSeed } from "../data/walkPathSeed";
import { buildAdminReturnUrl, peekAdminReturnState } from "../data/adminNavigation";

type EditorMode = "add_junction" | "add_entrance" | "connect" | "select" | "link_store";

type StorePin = MarketStorePin;

type NaverMapRef = {
  setCenter: (latLng: unknown) => void;
  setZoom: (zoom: number) => void;
};

type NaverOverlay = { setMap: (map: unknown) => void };

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

const NODE_COLORS: Record<WalkNodeType, string> = {
  junction: "#2563EB",
  entrance: "#16A34A",
  store_front: "#EA580C",
};

const MODE_HINT: Record<EditorMode, string> = {
  add_junction: "맵을 클릭해 교차점(통로) 노드를 추가합니다.",
  add_entrance: "맵을 클릭해 시장 입구 노드를 추가합니다.",
  connect: "연결할 노드 두 개를 순서대로 클릭합니다.",
  select: "노드·간선을 선택한 뒤 삭제할 수 있습니다.",
  link_store: "상점 마커를 클릭하면 상점 앞 노드로 붙고, 가까운 통로에 자동 연결됩니다.",
};

function parseMarket(raw: string | null): MarketId {
  if (raw === "jungang" || raw === "byeongcheon" || raw === "seonghwan") return raw;
  return "jungang";
}

function nodeIconHtml(node: WalkNode, selected: boolean, connectFrom: boolean) {
  const color = NODE_COLORS[node.type];
  const size = node.type === "entrance" ? 16 : 12;
  const ring = connectFrom ? "#F59E0B" : selected ? "#111827" : "#fff";
  const ringW = connectFrom || selected ? 3 : 2;
  const label =
    node.type === "store_front"
      ? "S"
      : node.type === "entrance"
        ? "E"
        : "";
  return `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${color};border:${ringW}px solid ${ring};box-shadow:0 1px 6px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#fff;line-height:1;">${label}</div>`;
}

export function WalkPathEditorPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const marketId = parseMarket(searchParams.get("market"));

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<NaverMapRef | null>(null);
  const areaOverlaysRef = useRef<MarketAreaOverlays | null>(null);
  const nodeMarkersRef = useRef<Map<string, any>>(new Map());
  const edgePolylinesRef = useRef<Map<string, any>>(new Map());
  const storeMarkersRef = useRef<NaverOverlay[]>([]);
  const graphRef = useRef<WalkPathGraph>(emptyWalkPathGraph(marketId));
  const modeRef = useRef<EditorMode>("add_junction");
  const connectFromRef = useRef<string | null>(null);
  const selectedNodeRef = useRef<string | null>(null);
  const selectedEdgeRef = useRef<string | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [graph, setGraph] = useState<WalkPathGraph>(() => emptyWalkPathGraph(marketId));
  const [mode, setMode] = useState<EditorMode>("add_junction");
  const [connectFromId, setConnectFromId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [history, setHistory] = useState<WalkPathGraph[]>([]);

  const clientId = import.meta.env.VITE_NAVER_MAP_CLIENT_ID as string | undefined;
  const isPlaceholder = !clientId || clientId === "your_naver_map_client_id";
  const view = resolveMarketView(marketId);
  const baseView = MARKET_VIEW_CONFIG[marketId];
  const storePins = useMemo(() => getMarketStorePins(marketId), [marketId]);

  graphRef.current = graph;
  modeRef.current = mode;
  connectFromRef.current = connectFromId;
  selectedNodeRef.current = selectedNodeId;
  selectedEdgeRef.current = selectedEdgeId;

  const goBack = () => {
    if (dirty && !window.confirm("저장하지 않은 변경이 있습니다. 나가시겠습니까?")) return;
    const saved = peekAdminReturnState();
    navigate(buildAdminReturnUrl(saved?.market ?? marketId), { replace: true });
  };

  const pushHistory = useCallback((prev: WalkPathGraph) => {
    setHistory((h) => [...h.slice(-19), prev]);
  }, []);

  const applyGraph = useCallback(
    (updater: (prev: WalkPathGraph) => WalkPathGraph, recordHistory = true) => {
      setGraph((prev) => {
        if (recordHistory) pushHistory(prev);
        const next = updater(prev);
        return { ...next, updatedAt: new Date().toISOString() };
      });
      setDirty(true);
      setNotice("");
    },
    [pushHistory],
  );

  const applyGraphRef = useRef(applyGraph);
  applyGraphRef.current = applyGraph;

  const undo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setGraph(prev);
      setDirty(true);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setConnectFromId(null);
      return h.slice(0, -1);
    });
  };

  // Load graph when market changes — 상점 핀 좌표로 store_front 위치 동기화
  useEffect(() => {
    let cancelled = false;
    setGraph(emptyWalkPathGraph(marketId));
    setDirty(false);
    setHistory([]);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setConnectFromId(null);
    setNotice("");
    ensureWalkPathSeeded(marketId);
    const pins = getMarketStorePins(marketId);
    void loadWalkPathGraph(marketId).then((g) => {
      if (cancelled) return;
      // 등록 상점마다 상점 앞 노드가 있도록 맞춤 (시드 18개만 있던 그래프에 추가 상점 반영)
      const synced = ensureStoreFrontNodes(g, pins);
      setGraph(synced);
      if (synced !== g) {
        setDirty(true);
        setNotice("등록 상점 목록에 맞춰 상점 앞 노드를 정리했어요. 저장을 눌러 반영하세요.");
      }
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
        zoom: view.zoom,
        mapTypeId: naver.maps.MapTypeId.NORMAL,
        scaleControl: false,
        logoControl: false,
        mapDataControl: false,
      });
      mapRef.current = map;

      clearMarketAreaOverlays(areaOverlaysRef.current);
      areaOverlaysRef.current = drawMarketAreaOverlays(
        naver,
        map,
        { fillColor: view.fillColor, areaPaths: view.areaPaths },
        { showLabel: false, zIndex: 5 },
      );

      naver.maps.Event.addListener(map, "click", (e: any) => {
        const lat = typeof e?.coord?.lat === "function" ? e.coord.lat() : e?.coord?.y;
        const lng = typeof e?.coord?.lng === "function" ? e.coord.lng() : e?.coord?.x;
        if (typeof lat !== "number" || typeof lng !== "number") return;
        const m = modeRef.current;
        if (m === "add_junction" || m === "add_entrance") {
          const type: WalkNodeType = m === "add_entrance" ? "entrance" : "junction";
          applyGraphRef.current((prev) => ({
            ...prev,
            nodes: [...prev.nodes, { id: createWalkNodeId(), lat, lng, type }],
          }));
          return;
        }
        if (m === "select") {
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
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
      nodeMarkersRef.current.forEach((m) => m.setMap(null));
      nodeMarkersRef.current.clear();
      edgePolylinesRef.current.forEach((p) => p.setMap(null));
      edgePolylinesRef.current.clear();
      storeMarkersRef.current.forEach((m) => m.setMap(null));
      storeMarkersRef.current = [];
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remount on market / client only
  }, [marketId, clientId, isPlaceholder]);

  // Recenter when market changes after map ready
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.naver?.maps) return;
    const naver = window.naver;
    const resolved = resolveMarketView(marketId);
    mapRef.current.setCenter(new naver.maps.LatLng(baseView.center.lat, baseView.center.lng));
    mapRef.current.setZoom(baseView.zoom);
    clearMarketAreaOverlays(areaOverlaysRef.current);
    areaOverlaysRef.current = drawMarketAreaOverlays(
      naver,
      mapRef.current,
      { fillColor: resolved.fillColor, areaPaths: resolved.areaPaths },
      { showLabel: false, zIndex: 5 },
    );
  }, [marketId, mapReady, baseView.center.lat, baseView.center.lng, baseView.zoom]);

  const onNodeClick = useCallback(
    (nodeId: string) => {
      const m = modeRef.current;
      if (m === "connect") {
        const from = connectFromRef.current;
        if (!from) {
          setConnectFromId(nodeId);
          setSelectedNodeId(nodeId);
          setSelectedEdgeId(null);
          return;
        }
        if (from === nodeId) {
          setConnectFromId(null);
          return;
        }
        const cur = graphRef.current;
        const a = cur.nodes.find((n) => n.id === from);
        const b = cur.nodes.find((n) => n.id === nodeId);
        if (a?.type === "store_front" && b?.type === "store_front") {
          setNotice("상점끼리는 연결할 수 없어요. 통로(교차점) 노드에 연결해 주세요.");
          setConnectFromId(null);
          setSelectedNodeId(null);
          return;
        }
        applyGraph((prev) => addEdgeBetween(prev, from, nodeId));
        setConnectFromId(null);
        setSelectedNodeId(null);
        return;
      }
      if (m === "select" || m === "add_junction" || m === "add_entrance") {
        setMode("select");
        setSelectedNodeId(nodeId);
        setSelectedEdgeId(null);
        setConnectFromId(null);
      }
    },
    [applyGraph],
  );

  const onEdgeClick = useCallback((edgeId: string) => {
    if (modeRef.current !== "select" && modeRef.current !== "connect") {
      setMode("select");
    }
    setSelectedEdgeId(edgeId);
    setSelectedNodeId(null);
    setConnectFromId(null);
  }, []);

  const onStoreClick = useCallback(
    (store: StorePin) => {
      if (modeRef.current !== "link_store") return;
      const upsert = (prev: WalkPathGraph) =>
        upsertStoreFrontNode(prev, store.id, store.lat, store.lng, {
          label: store.name,
          autoConnectMaxMeters: 45,
        });
      const preview = upsert(graphRef.current);
      const frontNode = preview.nodes.find((n) => n.type === "store_front" && n.storeId === store.id);
      const connectedToPassage =
        !!frontNode &&
        preview.edges.some((e) => {
          if (e.from !== frontNode.id && e.to !== frontNode.id) return false;
          const otherId = e.from === frontNode.id ? e.to : e.from;
          const other = preview.nodes.find((n) => n.id === otherId);
          return !!other && (other.type === "junction" || other.type === "entrance");
        });
      applyGraph(upsert);
      setNotice(
        connectedToPassage
          ? `「${store.name}」 상점을 가까운 통로 노드에 연결했습니다.`
          : `「${store.name}」 근처 45m 안에 통로 노드가 없어요. 가까운 곳에 교차점을 찍고 연결해 주세요.`,
      );
    },
    [applyGraph],
  );

  // Draw graph overlays
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.naver?.maps) return;
    const naver = window.naver;
    const map = mapRef.current;

    // Edges
    const nextEdgeIds = new Set(graph.edges.map((e) => e.id));
    edgePolylinesRef.current.forEach((poly, id) => {
      if (!nextEdgeIds.has(id)) {
        poly.setMap(null);
        edgePolylinesRef.current.delete(id);
      }
    });
    for (const edge of graph.edges) {
      const from = graph.nodes.find((n) => n.id === edge.from);
      const to = graph.nodes.find((n) => n.id === edge.to);
      if (!from || !to) continue;
      const selected = selectedEdgeId === edge.id;
      const path = [
        new naver.maps.LatLng(from.lat, from.lng),
        new naver.maps.LatLng(to.lat, to.lng),
      ];
      let poly = edgePolylinesRef.current.get(edge.id);
      if (!poly) {
        poly = new naver.maps.Polyline({
          map,
          path,
          strokeColor: selected ? "#111827" : "#0EA5E9",
          strokeOpacity: 0.9,
          strokeWeight: selected ? 6 : 4,
          zIndex: 20,
          clickable: true,
        });
        naver.maps.Event.addListener(poly, "click", (e: any) => {
          e?.domEvent?.stopPropagation?.();
          onEdgeClick(edge.id);
        });
        edgePolylinesRef.current.set(edge.id, poly);
      } else {
        poly.setPath(path);
        poly.setOptions({
          strokeColor: selected ? "#111827" : "#0EA5E9",
          strokeWeight: selected ? 6 : 4,
        });
      }
    }

    // Nodes
    const nextNodeIds = new Set(graph.nodes.map((n) => n.id));
    nodeMarkersRef.current.forEach((marker, id) => {
      if (!nextNodeIds.has(id)) {
        marker.setMap(null);
        nodeMarkersRef.current.delete(id);
      }
    });
    for (const node of graph.nodes) {
      const selected = selectedNodeId === node.id;
      const connectFrom = connectFromId === node.id;
      const icon = {
        content: nodeIconHtml(node, selected, connectFrom),
        anchor: new naver.maps.Point(
          node.type === "entrance" ? 8 : 6,
          node.type === "entrance" ? 8 : 6,
        ),
      };
      let marker = nodeMarkersRef.current.get(node.id);
      if (!marker) {
        marker = new naver.maps.Marker({
          map,
          position: new naver.maps.LatLng(node.lat, node.lng),
          icon,
          zIndex: 40,
          clickable: true,
        });
        naver.maps.Event.addListener(marker, "click", (e: any) => {
          e?.domEvent?.stopPropagation?.();
          onNodeClick(node.id);
        });
        nodeMarkersRef.current.set(node.id, marker);
      } else {
        marker.setPosition(new naver.maps.LatLng(node.lat, node.lng));
        marker.setIcon(icon);
      }
    }
  }, [graph, mapReady, selectedNodeId, selectedEdgeId, connectFromId, onNodeClick, onEdgeClick]);

  // Store markers (상점연결 모드 — 실제 지정 좌표에 이름 라벨)
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.naver?.maps) return;
    const naver = window.naver;
    storeMarkersRef.current.forEach((m) => m.setMap(null));
    storeMarkersRef.current = [];
    if (mode !== "link_store") return;

    storeMarkersRef.current = storePins.map((store) => {
      const linked = graph.nodes.some((n) => n.type === "store_front" && n.storeId === store.id);
      const marker = new naver.maps.Marker({
        map: mapRef.current,
        position: new naver.maps.LatLng(store.lat, store.lng),
        icon: {
          content: `<div style="padding:2px 6px;border-radius:6px;background:${linked ? "#EA580C" : "#111827"};color:#fff;font-size:10px;font-weight:600;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.2);border:1px solid #fff;">${store.name}</div>`,
          anchor: new naver.maps.Point(20, 10),
        },
        zIndex: 50,
        clickable: true,
      });
      naver.maps.Event.addListener(marker, "click", (e: any) => {
        e?.domEvent?.stopPropagation?.();
        onStoreClick(store);
      });
      return marker;
    });
  }, [mode, mapReady, storePins, graph.nodes, onStoreClick]);

  const selectedNode = graph.nodes.find((n) => n.id === selectedNodeId) ?? null;
  const selectedEdge = graph.edges.find((e) => e.id === selectedEdgeId) ?? null;
  const registeredStoreCount = storePins.length;
  /** 직접 찍은 노드 수 (교차점·입구만, 상점 앞 노드 제외) */
  const drawnNodeCount = graph.nodes.filter((n) => n.type !== "store_front").length;
  const pathMeters = Math.round(totalPathLengthMeters(graph));

  const deleteSelected = () => {
    if (selectedNodeId) {
      applyGraph((prev) => removeNode(prev, selectedNodeId));
      setSelectedNodeId(null);
      return;
    }
    if (selectedEdgeId) {
      applyGraph((prev) => removeEdge(prev, selectedEdgeId));
      setSelectedEdgeId(null);
    }
  };

  const restoreSeedPath = () => {
    if (!window.confirm("시드 보행경로로 덮어쓸까요? 현재 편집 내용은 사라집니다.")) return;
    const seeded = resetWalkPathToSeed(marketId);
    setGraph(seeded);
    setDirty(true);
    setHistory([]);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setConnectFromId(null);
    setNotice("시드 보행경로를 불러왔어요. 저장을 눌러 확정하세요.");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await saveWalkPathGraph(graph);
      setGraph(saved);
      setDirty(false);
      setNotice("보행경로를 저장했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const switchMarket = (id: MarketId) => {
    if (id === marketId) return;
    if (dirty && !window.confirm("저장하지 않은 변경이 있습니다. 시장을 바꿀까요?")) return;
    setSearchParams({ market: id });
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button type="button" onClick={goBack} className="p-1" aria-label="뒤로">
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-[15px] text-gray-900">보행경로 편집</h1>
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
          {(
            [
              { id: "add_junction", label: "교차점", icon: Plus },
              { id: "add_entrance", label: "입구", icon: MapPin },
              { id: "connect", label: "연결", icon: Link2 },
              { id: "select", label: "선택", icon: MousePointer2 },
              { id: "link_store", label: "상점연결", icon: Store },
            ] as const
          ).map((tool) => {
            const Icon = tool.icon;
            const active = mode === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => {
                  setMode(tool.id);
                  setConnectFromId(null);
                  if (tool.id !== "select") {
                    setSelectedNodeId(null);
                    setSelectedEdgeId(null);
                  }
                }}
                className={`h-9 px-3 rounded-lg text-[12px] whitespace-nowrap flex items-center gap-1.5 ${
                  active ? "bg-sky-600 text-white" : "bg-white text-gray-700 border border-gray-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tool.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={undo}
            disabled={history.length === 0}
            className="h-9 px-3 rounded-lg text-[12px] whitespace-nowrap flex items-center gap-1.5 bg-white text-gray-700 border border-gray-200 disabled:opacity-40"
          >
            <Undo2 className="w-3.5 h-3.5" />
            실행취소
          </button>
          <button
            type="button"
            onClick={restoreSeedPath}
            className="h-9 px-3 rounded-lg text-[12px] whitespace-nowrap flex items-center gap-1.5 bg-white text-gray-700 border border-gray-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            시드 복원
          </button>
        </div>

        <p className="text-[12px] text-gray-500">{MODE_HINT[mode]}</p>

        <div className="flex flex-col gap-1 text-[11px] text-gray-500">
          <div className="flex items-center justify-between gap-2">
            <span>
              상점 {registeredStoreCount}개 · 노드 {drawnNodeCount} · 간선 {graph.edges.length} · 약{" "}
              {pathMeters}m
            </span>
            <span className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-600" />교차점
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-600" />입구
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-600" />상점
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 flex-1 min-h-0">
        <div className="relative h-[min(58vh,480px)] rounded-xl overflow-hidden border border-gray-200 bg-white">
          {isPlaceholder ? (
            <div className="h-full flex items-center justify-center text-[13px] text-gray-500 px-6 text-center">
              네이버 맵 클라이언트 ID가 필요합니다. `.env`의 `VITE_NAVER_MAP_CLIENT_ID`를 설정하세요.
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
        {(selectedNode || selectedEdge) && (
          <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {selectedNode && (
                <>
                  <p className="text-[13px] text-gray-900 font-medium">
                    {selectedNode.type === "entrance"
                      ? "입구 노드"
                      : selectedNode.type === "store_front"
                        ? `상점 앞 · ${selectedNode.label ?? `상점 #${selectedNode.storeId}`}`
                        : "교차점 노드"}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                    {selectedNode.lat.toFixed(6)}, {selectedNode.lng.toFixed(6)}
                  </p>
                </>
              )}
              {selectedEdge && (
                <>
                  <p className="text-[13px] text-gray-900 font-medium">간선</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    약 {Math.round(edgeLengthMeters(graph, selectedEdge))}m
                  </p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={deleteSelected}
              className="h-8 px-2.5 rounded-lg bg-red-50 text-red-600 text-[12px] flex items-center gap-1 shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              삭제
            </button>
          </div>
        )}

        {notice && (
          <p className="text-[12px] text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">{notice}</p>
        )}

        <p className="text-[11px] text-gray-400 leading-relaxed">
          주요 통로만 교차점으로 찍고 연결한 뒤, 「상점연결」로 상점 앞을 붙이면 됩니다.
          나중에 상점이 추가되면 같은 방식으로 연결하거나 자동 스냅을 쓰면 됩니다.
        </p>
      </div>
    </div>
  );
}
