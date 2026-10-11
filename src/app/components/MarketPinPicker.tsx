import { useEffect, useRef, useState } from "react";
import type { MarketId } from "./CartContext";
import { resolveMarketView } from "../data/marketArea";
import { MapPin } from "lucide-react";

type NaverMapRef = {
  setCenter: (latLng: unknown) => void;
  setZoom: (zoom: number) => void;
};

type NaverMarkerRef = {
  setMap: (map: unknown) => void;
  setPosition: (latLng: unknown) => void;
};

declare global {
  interface Window {
    naver?: any;
  }
}

type Props = {
  marketId: MarketId;
  value: { lat: number; lng: number } | null;
  onChange: (pin: { lat: number; lng: number }) => void;
  error?: boolean;
  className?: string;
};

function makePinIcon(naver: any) {
  return {
    content:
      '<div style="width:18px;height:18px;border-radius:999px;background:#C4783A;border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.3);"></div>',
    anchor: new naver.maps.Point(9, 9),
  };
}

/** 시장 맵에서 상점 위치를 찍는 공통 핀 선택기 */
export function MarketPinPicker({ marketId, value, onChange, error, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<NaverMapRef | null>(null);
  const markerRef = useRef<NaverMarkerRef | null>(null);
  const polygonsRef = useRef<Array<{ setMap: (map: unknown) => void }>>([]);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  const clientId = import.meta.env.VITE_NAVER_MAP_CLIENT_ID as string | undefined;
  const isPlaceholder = !clientId || clientId === "your_naver_map_client_id";
  const view = resolveMarketView(marketId);

  useEffect(() => {
    if (isPlaceholder || !clientId || !containerRef.current) return;
    let cancelled = false;
    let rafId: number | null = null;

    const initMap = () => {
      if (cancelled || !window.naver?.maps || !containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      if (clientWidth === 0 || clientHeight === 0) {
        rafId = window.requestAnimationFrame(initMap);
        return;
      }
      const naver = window.naver;
      const map = new naver.maps.Map(containerRef.current, {
        center: new naver.maps.LatLng(view.center.lat, view.center.lng),
        zoom: view.zoom,
        mapTypeId: naver.maps.MapTypeId.NORMAL,
        scaleControl: false,
        logoControl: false,
        mapDataControl: false,
      });
      mapRef.current = map;

      polygonsRef.current.forEach((p) => p.setMap(null));
      polygonsRef.current = view.areaPaths.map(
        (path) =>
          new naver.maps.Polygon({
            map,
            paths: path.map((point) => new naver.maps.LatLng(point.lat, point.lng)),
            fillColor: view.fillColor,
            fillOpacity: 0.14,
            strokeWeight: 0,
            strokeOpacity: 0,
            zIndex: 10,
            clickable: false,
          }),
      );

      naver.maps.Event.addListener(map, "click", (e: any) => {
        const lat = typeof e?.coord?.lat === "function" ? e.coord.lat() : e?.coord?.y;
        const lng = typeof e?.coord?.lng === "function" ? e.coord.lng() : e?.coord?.x;
        if (typeof lat !== "number" || typeof lng !== "number") return;
        onChangeRef.current({ lat, lng });
      });

      setMapReady(true);
      setMapError(false);
    };

    if (window.naver?.maps) {
      initMap();
    } else {
      const existing = document.querySelector<HTMLScriptElement>('script[data-naver-map-sdk="true"]');
      if (existing) {
        existing.addEventListener("load", initMap, { once: true });
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
      polygonsRef.current.forEach((p) => p.setMap(null));
      polygonsRef.current = [];
      markerRef.current?.setMap(null);
      markerRef.current = null;
      mapRef.current = null;
      setMapReady(false);
    };
    // remount when market changes so center/area reset cleanly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketId, clientId, isPlaceholder]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.naver?.maps) return;
    const naver = window.naver;
    const map = mapRef.current;
    const resolved = resolveMarketView(marketId);
    map.setCenter(new naver.maps.LatLng(resolved.center.lat, resolved.center.lng));
    map.setZoom(resolved.zoom);
    polygonsRef.current.forEach((p) => p.setMap(null));
    polygonsRef.current = resolved.areaPaths.map(
      (path) =>
        new naver.maps.Polygon({
          map,
          paths: path.map((point) => new naver.maps.LatLng(point.lat, point.lng)),
          fillColor: resolved.fillColor,
          fillOpacity: 0.14,
          strokeWeight: 0,
          strokeOpacity: 0,
          zIndex: 10,
          clickable: false,
        }),
    );
  }, [marketId, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.naver?.maps) return;
    const naver = window.naver;
    if (!value) {
      markerRef.current?.setMap(null);
      markerRef.current = null;
      return;
    }
    const position = new naver.maps.LatLng(value.lat, value.lng);
    if (!markerRef.current) {
      markerRef.current = new naver.maps.Marker({
        map: mapRef.current,
        position,
        icon: makePinIcon(naver),
        zIndex: 40,
      });
    } else {
      markerRef.current.setPosition(position);
      markerRef.current.setMap(mapRef.current);
    }
  }, [value, mapReady]);

  return (
    <div className={className}>
      <div
        className={`relative w-full h-48 rounded-xl overflow-hidden bg-gray-100 border ${
          error ? "border-red-300" : "border-gray-200"
        }`}
      >
        {isPlaceholder ? (
          <div className="w-full h-full flex items-center justify-center text-[12px] text-gray-500 px-4 text-center">
            `.env`에 네이버 지도 키를 설정해주세요.
          </div>
        ) : mapError ? (
          <div className="w-full h-full flex items-center justify-center text-[12px] text-gray-500 px-4 text-center">
            지도 로딩에 실패했어요. 잠시 후 다시 시도해주세요.
          </div>
        ) : (
          <div ref={containerRef} className="w-full h-full" />
        )}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[12px] text-gray-500">
        <MapPin className="w-3.5 h-3.5 shrink-0" />
        {value
          ? `선택 좌표: ${value.lat.toFixed(6)}, ${value.lng.toFixed(6)}`
          : mapReady
            ? "지도를 탭해 상점 위치를 지정해주세요."
            : "지도를 불러오는 중..."}
      </div>
    </div>
  );
}
