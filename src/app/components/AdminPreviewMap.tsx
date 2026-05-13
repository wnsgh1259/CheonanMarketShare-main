import { useEffect, useRef, useState } from "react";
import { buildFacilityMarkerIcon, buildStoreMarkerIcon } from "../map/naverMarkerIcons";

export type AdminPreviewMarketView = {
  center: { lat: number; lng: number };
  zoom: number;
  fillColor: string;
  areaPaths: Array<Array<{ lat: number; lng: number }>>;
};

type NaverMapRef = {
  setCenter: (latLng: unknown) => void;
  setZoom: (zoom: number) => void;
  setSize: (size: unknown) => void;
};

type NaverMarkerRef = { setMap: (map: unknown) => void };
type NaverPolygonRef = { setMap: (map: unknown) => void };

function clearMarkers(markers: NaverMarkerRef[]) {
  markers.forEach((m) => m.setMap(null));
}

export type AdminPreviewStorePin = { id: number; name: string; category: string; lat: number; lng: number };
export type AdminPreviewFacilityPin = { id: number; name: string; lat: number; lng: number; color: string; size?: number };

type Props = {
  view: AdminPreviewMarketView;
  tab: "store" | "facility";
  stores: AdminPreviewStorePin[];
  facilities: AdminPreviewFacilityPin[];
  clientId: string | undefined;
  isPlaceholder: boolean;
  onStoreClick: (store: AdminPreviewStorePin) => void;
  onFacilityClick: (f: AdminPreviewFacilityPin) => void;
};

export function AdminPreviewMap({
  view,
  tab,
  stores,
  facilities,
  clientId,
  isPlaceholder,
  onStoreClick,
  onFacilityClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<NaverMapRef | null>(null);
  const polygonsRef = useRef<NaverPolygonRef[]>([]);
  const storeMarkersRef = useRef<NaverMarkerRef[]>([]);
  const facilityMarkersRef = useRef<NaverMarkerRef[]>([]);
  const viewRef = useRef(view);
  viewRef.current = view;
  const onStoreRef = useRef(onStoreClick);
  onStoreRef.current = onStoreClick;
  const onFacilityRef = useRef(onFacilityClick);
  onFacilityRef.current = onFacilityClick;
  const [mapEpoch, setMapEpoch] = useState(0);

  useEffect(() => {
    if (isPlaceholder || !clientId || !containerRef.current) return;
    let rafId: number | null = null;
    let cancelled = false;

    const initMap = () => {
      if (!window.naver?.maps || !containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      if (clientWidth === 0 || clientHeight === 0) {
        if (!cancelled) rafId = window.requestAnimationFrame(initMap);
        return;
      }
      const naver = window.naver;
      const v = viewRef.current;
      const map = new naver.maps.Map(containerRef.current, {
        center: new naver.maps.LatLng(v.center.lat, v.center.lng),
        zoom: v.zoom,
        mapTypeId: naver.maps.MapTypeId.NORMAL,
        scaleControl: false,
        logoControl: false,
        mapDataControl: false,
      });
      mapRef.current = map;
      polygonsRef.current.forEach((p) => p.setMap(null));
      polygonsRef.current = v.areaPaths.map(
        (path) =>
          new naver.maps.Polygon({
            map,
            paths: path.map((point) => new naver.maps.LatLng(point.lat, point.lng)),
            fillColor: v.fillColor,
            fillOpacity: 0.28,
            strokeColor: v.fillColor,
            strokeOpacity: 0,
            strokeWeight: 0,
            zIndex: 10,
            clickable: false,
          }),
      );
      setMapEpoch((n) => n + 1);
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
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      clearMarkers(storeMarkersRef.current);
      storeMarkersRef.current = [];
      clearMarkers(facilityMarkersRef.current);
      facilityMarkersRef.current = [];
      polygonsRef.current.forEach((p) => p.setMap(null));
      polygonsRef.current = [];
      script.onload = null;
    };
  }, [clientId, isPlaceholder]);

  useEffect(() => {
    if (!window.naver?.maps || !mapRef.current) return;
    const naver = window.naver;
    const map = mapRef.current;
    map.setCenter(new naver.maps.LatLng(view.center.lat, view.center.lng));
    map.setZoom(view.zoom);
    polygonsRef.current.forEach((p) => p.setMap(null));
    polygonsRef.current = view.areaPaths.map(
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
  }, [view]);

  useEffect(() => {
    if (!window.naver?.maps || !mapRef.current) return;
    const naver = window.naver;
    const map = mapRef.current;
    const resize = () => {
      naver.maps.Event.trigger(map, "resize");
      const el = containerRef.current;
      if (el) map.setSize(new naver.maps.Size(el.clientWidth, el.clientHeight));
    };
    resize();
    const t = window.setTimeout(resize, 200);
    return () => window.clearTimeout(t);
  }, [tab, stores.length, facilities.length, mapEpoch]);

  useEffect(() => {
    if (!window.naver?.maps || !mapRef.current) return;
    const naver = window.naver;
    const map = mapRef.current;

    clearMarkers(storeMarkersRef.current);
    storeMarkersRef.current = [];
    clearMarkers(facilityMarkersRef.current);
    facilityMarkersRef.current = [];

    if (tab === "store") {
      const circleSize = 14;
      storeMarkersRef.current = stores
        .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng) && (s.lat !== 0 || s.lng !== 0))
        .map((store) => {
          const icon = buildStoreMarkerIcon(naver, store, { highlighted: false, circleSize });
          const marker = new naver.maps.Marker({
            map,
            position: new naver.maps.LatLng(store.lat, store.lng),
            title: store.name,
            zIndex: 20,
            icon: { content: icon.content, size: icon.size, anchor: icon.anchor },
          });
          naver.maps.Event.addListener(marker, "click", () => onStoreRef.current(store));
          return marker;
        });
    } else {
      const size = 15;
      facilityMarkersRef.current = facilities
        .filter((f) => Number.isFinite(f.lat) && Number.isFinite(f.lng))
        .map((facility) => {
          const icon = buildFacilityMarkerIcon(naver, facility.color || "#2563eb", size);
          const marker = new naver.maps.Marker({
            map,
            position: new naver.maps.LatLng(facility.lat, facility.lng),
            title: facility.name,
            zIndex: 20,
            icon: { content: icon.content, size: icon.size, anchor: icon.anchor },
          });
          naver.maps.Event.addListener(marker, "click", () => onFacilityRef.current(facility));
          return marker;
        });
    }
  }, [tab, stores, facilities, mapEpoch]);

  if (isPlaceholder || !clientId) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-100 text-[12px] text-gray-500">
        `.env`에 네이버 지도 키를 설정해주세요.
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full min-h-[208px]" />;
}
