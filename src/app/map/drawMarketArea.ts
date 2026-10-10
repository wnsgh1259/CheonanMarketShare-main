import {
  MARKET_AREA_DISPLAY,
  ringCentroid,
  type LatLngPoint,
} from "../data/marketArea";

type NaverOverlay = { setMap: (map: unknown) => void };

export type MarketAreaOverlays = {
  polygons: NaverOverlay[];
  outlines: NaverOverlay[];
  label: NaverOverlay | null;
};

export type MarketAreaView = {
  fillColor: string;
  areaPaths: LatLngPoint[][];
  label?: string;
};

/** 테두리 없이 연한 fill만 — 내부 경계선·외곽 점선 없음 */
export function drawMarketAreaOverlays(
  naver: any,
  map: unknown,
  view: MarketAreaView,
  opts?: { showLabel?: boolean; zIndex?: number },
): MarketAreaOverlays {
  const z = opts?.zIndex ?? 10;
  const polygons: NaverOverlay[] = [];
  const outlines: NaverOverlay[] = [];

  for (const ring of view.areaPaths) {
    if (ring.length < 3) continue;
    const path = ring.map((p) => new naver.maps.LatLng(p.lat, p.lng));
    polygons.push(
      new naver.maps.Polygon({
        map,
        paths: path,
        fillColor: view.fillColor,
        fillOpacity: MARKET_AREA_DISPLAY.fillOpacity,
        strokeColor: view.fillColor,
        strokeOpacity: MARKET_AREA_DISPLAY.strokeOpacity,
        strokeWeight: MARKET_AREA_DISPLAY.strokeWeight,
        zIndex: z,
        clickable: false,
      }),
    );
  }

  let label: NaverOverlay | null = null;
  if (opts?.showLabel && view.label && view.areaPaths[0]?.length) {
    const c = ringCentroid(view.areaPaths[0]);
    label = new naver.maps.Marker({
      map,
      position: new naver.maps.LatLng(c.lat, c.lng),
      clickable: false,
      zIndex: z + 2,
      icon: {
        content: `<div style="pointer-events:none;padding:4px 10px;border-radius:999px;background:rgba(255,255,255,.92);border:1px solid ${view.fillColor}55;color:${view.fillColor};font-size:11px;font-weight:700;letter-spacing:-0.02em;box-shadow:0 2px 10px rgba(0,0,0,.12);white-space:nowrap;">${view.label}</div>`,
        anchor: new naver.maps.Point(40, 12),
      },
    });
  }

  return { polygons, outlines, label };
}

export function clearMarketAreaOverlays(overlays: MarketAreaOverlays | null | undefined) {
  if (!overlays) return;
  overlays.polygons.forEach((p) => p.setMap(null));
  overlays.outlines.forEach((p) => p.setMap(null));
  overlays.label?.setMap(null);
}
