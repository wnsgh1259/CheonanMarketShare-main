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
 * (이미 같은 상품명이 있는 상점은 기존 메뉴 가격을 쓰므로 여기에는 넣지 않았다.)
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
 * 천안중앙시장 — 시드에 이미 겹치는 상품(계란·대파·두부·고등어·김치·사과 등)이 있음.
 * 여기에 추가 가격 변형을 얹어 경로 차이가 더 잘 나게 한다.
 *
 *  북쪽: 9 천안만두가게, 12 두부콩나물집, 13 황금과일가게
 *  중간: 5 싱싱청과, 6 중앙수산, 7 시장반찬가게
 *  남쪽: 4 신선정육점, 14 남해수산, 15 통큰건어물, 17 중앙정육센터
 */
const JUNGANG: Record<number, MenuItem[]> = {
  3: [t("t-j3-dumpling", "만두 6개", 4800), t("t-j3-kimchi", "김치 1kg", 7200)],
  8: [t("t-j8-bag", "장바구니", 4200), t("t-j8-glove", "고무장갑 3켤레", 2500)],
  11: [t("t-j11-tteok", "떡볶이", 4000), t("t-j11-sundae", "순대", 3800)],
  16: [t("t-j16-rice", "쌀 5kg", 17000), t("t-j16-mixed", "잡곡 1kg", 4500)],
  18: [t("t-j18-oden", "어묵 3개", 2800), t("t-j18-kimbap", "야채김밥", 2800)],
};

/**
 * 천안역전시장 — 계란·대파·고등어·김치·어묵·순대국밥 등 비교용
 */
const BYEONGCHEON: Record<number, MenuItem[]> = {
  3: [t("t-b3-kimchi", "김치 1kg", 7000), t("t-b3-egg", "계란 30구", 6800)],
  8: [t("t-b8-bag", "장바구니", 4000), t("t-b8-glove", "고무장갑", 2200)],
  9: [t("t-b9-tteok", "떡볶이", 4200), t("t-b9-sundae", "순대", 3800)],
  14: [t("t-b14-mixed", "잡곡 500g", 3500), t("t-b14-rice", "현미 1kg", 4200)],
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
  const names = new Set(menus.map((m) => m.name.trim().toLowerCase()));
  return [
    ...menus,
    ...extra.filter((m) => !ids.has(m.id) && !names.has(m.name.trim().toLowerCase())),
  ];
}
