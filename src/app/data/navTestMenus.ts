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
  // 시연 영상에서도 최저가/최단 경로 차이가 나도록 기본 켜둠
  return true;
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
  // 시연: 사과·삼겹살·대파 — 위치·가격을 갈라 최저가≠최단이 되게
  4: [t("t-j4-pork", "삼겹살", 11000)],
  5: [t("t-j5-pa", "대파", 2000), t("t-j5-apple", "사과", 8500)],
  12: [t("t-j12-pa", "대파", 2800)],
  13: [t("t-j13-apple", "사과", 7000)],
  17: [t("t-j17-pork", "삼겹살", 13500)],
  3: [t("t-j3-dumpling", "만두 6개", 4800), t("t-j3-kimchi", "김치 1kg", 7200)],
  8: [t("t-j8-bag", "장바구니", 4200), t("t-j8-glove", "고무장갑 3켤레", 2500)],
  11: [t("t-j11-tteok", "떡볶이", 4000), t("t-j11-sundae", "순대", 3800)],
  16: [t("t-j16-rice", "쌀 5kg", 17000), t("t-j16-mixed", "잡곡 1kg", 4500)],
  18: [t("t-j18-oden", "어묵 3개", 2800), t("t-j18-kimbap", "야채김밥", 2800)],
};

/**
 * 천안역전시장 시연 — 사과·삼겹살·대파 각 3상점 (최저가≠최단≠추천)
 *  가까운 묶음: 4 대산 정육점, 5 송현농원, 8 푸줏간골목
 *  먼 묶음(저가): 11 과일나라, 12 한돈축산
 *  중간: 14 햇과일가게
 */
const BYEONGCHEON: Record<number, MenuItem[]> = {
  4: [t("t-b4-pork", "삼겹살", 13500)],
  5: [t("t-b5-apple", "사과", 9000), t("t-b5-pa", "대파", 3600)],
  8: [t("t-b8-pork", "삼겹살", 15200)],
  11: [t("t-b11-apple", "사과", 6500), t("t-b11-pa", "대파", 1800)],
  12: [t("t-b12-pork", "삼겹살", 10500)],
  14: [t("t-b14-apple", "사과", 7800), t("t-b14-pa", "대파", 2500)],
  3: [t("t-b3-kimchi", "김치 1kg", 7000), t("t-b3-egg", "계란 30구", 6800)],
  9: [t("t-b9-tteok", "떡볶이", 4200), t("t-b9-sundae", "순대", 3800)],
};

/** 성환이화시장은 아직 실험용 메뉴 없음 */
const SEONGHWAN: Record<number, MenuItem[]> = {};

export const NAV_TEST_MENUS: Record<MarketId, Record<number, MenuItem[]>> = {
  jungang: JUNGANG,
  byeongcheon: BYEONGCHEON,
  seonghwan: SEONGHWAN,
};

/** 시연(사과·삼겹살·대파)용 시드 상점 — 삭제돼도 지도·검색·경로에 유지 */
export function isDemoNavStore(marketId: MarketId, seedStoreId: number) {
  return Boolean(NAV_TEST_MENUS[marketId]?.[seedStoreId]?.length);
}

/**
 * 상점(시드 id) 메뉴에 실험용 메뉴를 덧붙인다.
 * 같은 상품명이 있으면 시연용 가격으로 덮어써서 최저가≠최단이 깨지지 않게 한다.
 */
export function withNavTestMenus(
  marketId: MarketId,
  storeId: number,
  menus: MenuItem[],
): MenuItem[] {
  if (!isNavTestMenusEnabled()) return menus;
  const extra = NAV_TEST_MENUS[marketId]?.[storeId];
  if (!extra?.length) return menus;
  const byName = new Map(extra.map((m) => [m.name.trim().toLowerCase(), m]));
  const ids = new Set(menus.map((m) => m.id));
  const merged = menus.map((m) => {
    const demo = byName.get(m.name.trim().toLowerCase());
    if (!demo) return m;
    return {
      ...m,
      price: demo.price,
      ...(demo.originalPrice != null
        ? { originalPrice: demo.originalPrice, discount: demo.discount }
        : { originalPrice: undefined, discount: undefined }),
    };
  });
  const names = new Set(merged.map((m) => m.name.trim().toLowerCase()));
  return [
    ...merged,
    ...extra.filter((m) => !ids.has(m.id) && !names.has(m.name.trim().toLowerCase())),
  ];
}
