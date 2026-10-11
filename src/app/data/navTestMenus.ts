import type { MarketId } from "../components/CartContext";
import type { MenuItem } from "./storeData";

/**
 * 네비게이션(경로 추천) 실험용 메뉴.
 * - 같은 상품을 여러 상점이 서로 다른 가격으로 팔도록 만들어서
 *   "최저가 / 최단거리 / 추천" 경로가 서로 다르게 나오게 한다.
 * - 개발 서버(npm run dev)에서는 기본으로 켜져 있고, 배포 빌드에서는 꺼진다.
 * - 브라우저 콘솔에서 수동 제어:
 *     localStorage.setItem("nav-test-menus", "on")   // 강제로 켜기
 *     localStorage.setItem("nav-test-menus", "off")  // 끄기
 *     localStorage.removeItem("nav-test-menus")      // 기본값(개발 서버에서만 켜짐)
 *
 * 상점 id 는 storeData.ts 의 시드 상점 id 이다.
 * (이미 같은 상품명이 있는 상점은 기존 메뉴를 그대로 쓰므로 여기에는 넣지 않았다.)
 */
export const NAV_TEST_MENU_KEY = "nav-test-menus";

export function isNavTestMenusEnabled(): boolean {
  try {
    const v = localStorage.getItem(NAV_TEST_MENU_KEY);
    if (v === "on") return true;
    if (v === "off") return false;
  } catch {
    // ignore
  }
  return import.meta.env.DEV === true;
}

const t = (id: string, name: string, price: number, originalPrice?: number): MenuItem => ({
  id,
  name,
  price,
  ...(originalPrice
    ? { originalPrice, discount: Math.round(((originalPrice - price) / originalPrice) * 100) }
    : {}),
});

/**
 * 천안중앙시장 (기본 입구는 남쪽, 시드 좌표 기준 my 값이 클수록 남쪽)
 *
 *  북쪽(입구에서 멂): 13 두부·콩나물마트, 10 천안만두가게, 7 중앙수산
 *  중간            : 8 시장반찬가게
 *  남쪽(입구에 가까움): 5 싱싱채소마트, 14 황금채소마트, 15 남해수산, 16 통큰건어물, 6 천안과일나라, 4 신선정육점
 *
 * 기존 메뉴(그대로 사용)
 *  - 계란 30구: 4 신선정육점 7,500 (할인)
 *  - 대파 1단 : 5 싱싱채소마트 2,500
 *  - 두부 1모 : 13 두부·콩나물마트 2,500
 *  - 고등어 2마리: 7 중앙수산 7,000
 *  - 김치 1kg : 8 시장반찬가게 8,000
 *  - 딸기 1팩 : 6 천안과일나라 6,000 (25% 할인)
 */
const JUNGANG: Record<number, MenuItem[]> = {
  // 북쪽: 계란·대파가 가장 싸다 → 최저가 경로는 북쪽 한 곳
  13: [t("t-j13-egg", "계란 30구", 5500), t("t-j13-leek", "대파 1단", 1500)],
  // 남쪽: 계란·두부를 조금 더 비싸게 → 최단 경로 후보
  14: [t("t-j14-egg", "계란 30구", 6900), t("t-j14-tofu", "두부 1모", 3000)],
  5: [
    t("t-j5-egg", "계란 30구", 7200),
    t("t-j5-tofu", "두부 1모", 3200),
    t("t-j5-berry", "딸기 1팩", 5500),
  ],
  // 고등어는 남쪽이 싸고, 김치는 북쪽이 싸다 → 최저가 경로는 남↔북 왕복
  15: [t("t-j15-mackerel", "고등어 2마리", 5500)],
  16: [t("t-j16-kimchi", "김치 1kg", 7500)],
  10: [t("t-j10-kimchi", "김치 1kg", 6000)],
};

/**
 * 천안역전시장(병천 시드 id 1~5) — 가볍게 비교할 수 있는 상품만
 * 기존: 2 어묵·튀김코너 "어묵 3개" 3,000 (할인), 1 병천순대본가 "순대국밥" 9,000
 */
const BYEONGCHEON: Record<number, MenuItem[]> = {
  1: [t("t-b1-oden", "어묵 3개", 3500)],
  2: [t("t-b2-sundae", "순대국밥", 8500)],
};

/** 성환이화시장은 아직 실험용 메뉴 없음 */
const SEONGHWAN: Record<number, MenuItem[]> = {};

export const NAV_TEST_MENUS: Record<MarketId, Record<number, MenuItem[]>> = {
  jungang: JUNGANG,
  byeongcheon: BYEONGCHEON,
  seonghwan: SEONGHWAN,
};

/** 상점(시드 id) 메뉴에 실험용 메뉴를 덧붙인다. 같은 id 는 중복 추가하지 않는다. */
export function withNavTestMenus(
  marketId: MarketId,
  storeId: number,
  menus: MenuItem[],
): MenuItem[] {
  if (!isNavTestMenusEnabled()) return menus;
  const extra = NAV_TEST_MENUS[marketId]?.[storeId];
  if (!extra?.length) return menus;
  const ids = new Set(menus.map((m) => m.id));
  return [...menus, ...extra.filter((m) => !ids.has(m.id))];
}
