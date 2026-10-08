import type { MarketId } from "../components/CartContext";
import type { RouteType } from "./routePlanner";

export type ActiveNavStop = {
  storeId: number;
  storeName: string;
  lat: number;
  lng: number;
  order: number;
  itemNames: string[];
};

export type ActiveNavRoute = {
  marketId: MarketId;
  routeType: RouteType;
  title: string;
  lineColor: string;
  distance: number;
  time: number;
  stops: ActiveNavStop[];
  /** 출발점→상점들 보행 경로 (통로 스냅 또는 직선) */
  pathLatLng: Array<{ lat: number; lng: number }>;
  startLabel: string;
  startSource?: "gps" | "nearest_entrance" | "default_entrance";
  savedAt: string;
};

const KEY = "active_nav_route_v1";

export function saveActiveNavRoute(route: ActiveNavRoute) {
  sessionStorage.setItem(KEY, JSON.stringify(route));
}

export function loadActiveNavRoute(): ActiveNavRoute | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveNavRoute;
    if (!parsed?.marketId || !Array.isArray(parsed.pathLatLng) || !Array.isArray(parsed.stops)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearActiveNavRoute() {
  sessionStorage.removeItem(KEY);
}
