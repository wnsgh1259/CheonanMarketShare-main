import type { MarketId } from "../components/CartContext";

/** 시장 카테고리. 예전 '채소'/'과일'은 '채소·과일'로 합친다. */
export type CategoryKey =
  | "전체"
  | "먹거리·분식"
  | "정육·계란"
  | "채소·과일"
  | "수산물"
  | "반찬·건어물"
  | "기타·생활";

export const STORE_CATEGORY_OPTIONS: Exclude<CategoryKey, "전체">[] = [
  "먹거리·분식",
  "정육·계란",
  "채소·과일",
  "수산물",
  "반찬·건어물",
  "기타·생활",
];

export function normalizeStoreCategory(raw: string | undefined): CategoryKey {
  const value = (raw ?? "").split(",")[0]?.trim() || "기타·생활";
  if (value === "채소" || value === "과일") return "채소·과일";
  if ((STORE_CATEGORY_OPTIONS as string[]).includes(value)) return value as CategoryKey;
  if (value === "전체") return "전체";
  return "기타·생활";
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: number;
}

export interface StoreData {
  id: number;
  name: string;
  category: CategoryKey;
  location: string;
  hours: string;
  phone: string;
  rating: number;
  badge?: string;
  bookmark: boolean;
  image: string;
  mx: number;
  my: number;
  lat?: number;
  lng?: number;
  description: string;
  menus: MenuItem[];
  activeDeal?: {
    note: string;
    startAt: string;
    endAt: string;
  };
}

const HOURS = "09:00 - 21:00";

const IMG_FOOD = "https://images.unsplash.com/photo-1769558688746-7ac36d8ce999?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBzaWRlJTIwZGlzaGVzJTIwYmFuY2hhbnxlbnwxfHx8fDE3NzQ4MDI1NTF8MA&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_SNACK = "https://images.unsplash.com/photo-1760020890915-ca605575b93b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjB0dGVva2Jva2tpJTIwZnJpZWQlMjBmb29kJTIwc25hY2slMjBiYXJ8ZW58MXx8fHwxNzc0ODI3MzYyfDA&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_NOODLE = "https://images.unsplash.com/photo-1747228469031-c5fc60b9d9f9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBmcmllZCUyMGZvb2QlMjB0ZW1wdXJhfGVufDF8fHx8MTc3NDgyNTg2Mnww&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_MEAT = "https://images.unsplash.com/photo-1758788701706-327f3a0d6820?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBmcmVzaCUyMG1lYXQlMjBidXRjaGVyJTIwbWFya2V0fGVufDF8fHx8MTc3NDgyNzM1OHww&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_VEG = "https://images.unsplash.com/photo-1759663783570-520674af30d6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBtYXJrZXQlMjBmcmVzaCUyMHZlZ2V0YWJsZXMlMjBwcm9kdWNlfGVufDF8fHx8MTc3NDgyNzM1OHww&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_FRUIT = "https://images.unsplash.com/photo-1770954265112-be9b0ebed8e8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVzaCUyMGZydWl0JTIwYXBwbGUlMjBwZWFyJTIwbWFya2V0JTIwZGlzcGxheXxlbnwxfHx8fDE3NzQ4MjczNjZ8MA&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_SEAFOOD = "https://images.unsplash.com/photo-1772462850582-802d575852b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBtYXJrZXQlMjBmcmVzaCUyMHNlYWZvb2QlMjBmaXNofGVufDF8fHx8MTc3NDgyNzM1OXww&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_BANCHAN = "https://images.unsplash.com/photo-1628532430664-ef7e7b7b941f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBzaWRlJTIwZGlzaGVzJTIwYmFuY2hhbiUyMG1hcmtldHxlbnwxfHx8fDE3NzQ4MjczNTl8MA&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_LIVING = "https://images.unsplash.com/photo-1594021113115-f1b48e63ef06?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGVvbmFuJTIwa29yZWElMjB0cmFkaXRpb25hbCUyMG1hcmtldCUyMHN0cmVldHxlbnwxfHx8fDE3NzQ4MjY3MzV8MA&ixlib=rb-4.1.0&q=80&w=1080";

function menus(prefix: string, items: Array<[string, number, number?, number?]>): MenuItem[] {
  return items.map(([name, price, originalPrice, discount], index) => ({
    id: `${prefix}-${index + 1}`,
    name,
    price,
    ...(originalPrice ? { originalPrice, discount } : {}),
  }));
}

export const STORES_BY_MARKET: Record<MarketId, StoreData[]> = {
  jungang: [
    {
      id: 1, name: "천안순대국밥", category: "먹거리·분식",
      location: "천안시 동남구 대흥로 248, 중앙시장 A동 12호", hours: HOURS, phone: "041-555-0101",
      rating: 4.8, badge: "인기", bookmark: true, mx: 22, my: 30,
      lat: 36.80355, lng: 127.14895,
      image: IMG_FOOD, description: "진한 사골 국물 순대국밥. 장보기 전 든든한 한 끼.",
      menus: menus("j1", [
        ["순대국밥", 9000], ["얼큰순대국", 10000], ["모듬순대", 15000, 18000, 17], ["수육 소", 12000],
        ["순대만", 7000], ["내장국밥", 9500], ["공기밥 추가", 1000], ["김치추가", 2000],
      ]),
    },
    {
      id: 2, name: "호두과자 본점", category: "먹거리·분식",
      location: "천안시 동남구 대흥로 252, 중앙시장 B동 5호", hours: HOURS, phone: "041-555-0102",
      rating: 4.9, badge: "명물", bookmark: false, mx: 55, my: 20,
      lat: 36.80340, lng: 127.14935,
      image: IMG_SNACK, description: "갓 구운 천안 호두과자. 길에 들고 다니기 좋아요.",
      menus: menus("j2", [
        ["호두과자 1봉", 4000], ["호두과자 2봉", 7000, 8000, 13], ["미니 호두과자", 6000], ["호두과자 선물세트", 12000],
        ["호두과자 5봉", 16000], ["밤호두과자", 5000], ["딸기잼호두과자", 4500], ["따뜻한 식혜", 2500],
      ]),
    },
    {
      id: 3, name: "중앙칼국수", category: "먹거리·분식",
      location: "천안시 동남구 대흥로 260, 중앙시장 C동 8호", hours: HOURS, phone: "041-555-0103",
      rating: 4.6, bookmark: false, mx: 75, my: 35,
      lat: 36.80315, lng: 127.14970,
      image: IMG_NOODLE, description: "수제면 멸치 육수 칼국수.",
      menus: menus("j3", [
        ["칼국수", 8000], ["수제비", 8000], ["비빔국수", 8000], ["만두 8개", 6000],
        ["김치칼국수", 9000], ["해물칼국수", 10000], ["콩국수", 8500], ["공기밥", 1000],
      ]),
    },
    {
      id: 4, name: "신선정육점", category: "정육·계란",
      location: "천안시 동남구 대흥로 246, 중앙시장 A동 34호", hours: HOURS, phone: "041-555-0201",
      rating: 4.5, bookmark: false, mx: 30, my: 45,
      lat: 36.80290, lng: 127.14890,
      image: IMG_MEAT, description: "당일 손질 한돈·계란.",
      menus: menus("j4", [
        ["돼지 삼겹살 500g", 12000], ["목살 500g", 11000], ["계란 30구", 7500, 9000, 17], ["앞다리살 500g", 8000],
        ["돼지불고기 500g", 9000], ["다진돼지 500g", 7000], ["갈비살 500g", 14000], ["특란 15구", 4500],
      ]),
    },
    {
      id: 5, name: "싱싱청과", category: "채소·과일",
      location: "천안시 동남구 문화동 59-4, 중앙시장 D동 2호", hours: HOURS, phone: "041-555-0301",
      rating: 4.4, badge: "신선", bookmark: true, mx: 48, my: 55,
      lat: 36.80265, lng: 127.14920,
      image: IMG_VEG, description: "새벽 입고 채소·과일.",
      menus: menus("j5", [
        ["대파 1단", 2500], ["양파 3kg", 4500, 6000, 25], ["사과 5개", 8000], ["상추 1봉", 3000],
        ["두부 1모", 3200], ["배추 1포기", 4000], ["당근 1봉", 2800], ["시금치 1단", 2200],
        ["계란 30구", 7200], ["딸기 1팩", 5500],
      ]),
    },
    {
      id: 6, name: "중앙수산", category: "수산물",
      location: "천안시 동남구 대흥로 255, 중앙시장 B동 22호", hours: HOURS, phone: "041-555-0401",
      rating: 4.5, bookmark: false, mx: 62, my: 48,
      lat: 36.80285, lng: 127.14955,
      image: IMG_SEAFOOD, description: "고등어·갈치·새우 손질 판매.",
      menus: menus("j6", [
        ["고등어 2마리", 7000], ["갈치 1마리", 12000], ["새우 500g", 10000], ["오징어 2마리", 8000],
        ["조기 2마리", 9000], ["전어 1접시", 11000], ["멸치 1근", 6000], ["김 1봉", 4500],
      ]),
    },
    {
      id: 7, name: "시장반찬가게", category: "반찬·건어물",
      location: "천안시 동남구 문화동 61-2, 중앙시장 C동 15호", hours: HOURS, phone: "041-555-0501",
      rating: 4.6, bookmark: true, mx: 40, my: 62,
      lat: 36.80240, lng: 127.14905,
      image: IMG_BANCHAN, description: "집밥용 반찬·김치·멸치볶음.",
      menus: menus("j7", [
        ["반찬 3종 세트", 12000], ["김치 1kg", 8000], ["멸치볶음 200g", 5000, 6500, 23], ["계란말이", 4500],
        ["오징어볶음", 7000], ["시금치나물", 3500], ["콩자반", 4000], ["깍두기 1kg", 7000],
      ]),
    },
    {
      id: 8, name: "생활잡화코너", category: "기타·생활",
      location: "천안시 동남구 대흥로 265, 중앙시장 E동 3호", hours: HOURS, phone: "041-555-0601",
      rating: 4.2, bookmark: false, mx: 70, my: 65,
      lat: 36.80235, lng: 127.14975,
      image: IMG_LIVING, description: "장바구니·수세미·장갑 등 잡화.",
      menus: menus("j8", [
        ["장바구니", 5000], ["고무장갑 3켤레", 3000], ["수세미 세트", 2000], ["비닐봉투 100매", 3500],
        ["행주 5장", 4000], ["앞치마", 6000], ["세탁세제 1kg", 5500], ["휴지 30롤", 12000],
      ]),
    },
    {
      id: 9, name: "천안만두가게", category: "먹거리·분식",
      location: "천안시 동남구 대흥로 244, 중앙시장 A동 7호", hours: HOURS, phone: "041-555-0104",
      rating: 4.7, bookmark: false, mx: 25, my: 40,
      lat: 36.80305, lng: 127.14880,
      image: IMG_SNACK, description: "찐만두·군만두 포장 가능.",
      menus: menus("j9", [
        ["김치만두 10개", 6000], ["고기만두 10개", 6500, 8000, 19], ["왕만두 5개", 5500], ["찐만두 세트", 10000],
        ["군만두 10개", 7000], ["만두국", 8000], ["김치 1kg", 6000], ["공기밥", 1000],
      ]),
    },
    {
      id: 10, name: "해물파전집", category: "먹거리·분식",
      location: "천안시 동남구 대흥로 254, 중앙시장 B동 11호", hours: HOURS, phone: "041-555-0105",
      rating: 4.5, bookmark: false, mx: 58, my: 38,
      lat: 36.80300, lng: 127.14940,
      image: IMG_FOOD, description: "바삭한 해물파전과 막걸리.",
      menus: menus("j10", [
        ["해물파전", 10000], ["김치전", 8000], ["감자전", 7000], ["막걸리", 4000],
        ["부추전", 7500], ["동동주", 4500], ["파전 반반", 9000], ["모듬전 세트", 18000],
      ]),
    },
    {
      id: 11, name: "어묵꼬치골목", category: "먹거리·분식",
      location: "천안시 동남구 문화동 58, 중앙시장 먹거리골목 3호", hours: HOURS, phone: "041-555-0106",
      rating: 4.3, badge: "간식", bookmark: false, mx: 50, my: 42,
      lat: 36.80275, lng: 127.14925,
      image: IMG_SNACK, description: "걸으면서 먹는 어묵·번데기.",
      menus: menus("j11", [
        ["어묵꼬치 3개", 3000], ["번데기 1컵", 2000], ["어묵탕", 5000], ["모듬튀김", 5000],
        ["떡꼬치", 2500], ["핫도그", 2500], ["어묵 5개", 4500], ["컵라면", 3000],
      ]),
    },
    {
      id: 12, name: "두부콩나물집", category: "채소·과일",
      location: "천안시 동남구 문화동 60-1, 중앙시장 D동 9호", hours: HOURS, phone: "041-555-0302",
      rating: 4.4, bookmark: false, mx: 35, my: 58,
      lat: 36.80250, lng: 127.14895,
      image: IMG_VEG, description: "매일 만드는 두부와 콩나물.",
      menus: menus("j12", [
        ["두부 1모", 2500], ["콩나물 500g", 2000], ["순두부 1팩", 3000], ["두부김치 재료", 6500],
        ["대파 1단", 1500], ["계란 30구", 5500], ["연두부 2팩", 3500], ["콩비지 1팩", 2800],
      ]),
    },
    {
      id: 13, name: "황금과일가게", category: "채소·과일",
      location: "천안시 동남구 대흥로 258, 중앙시장 B동 18호", hours: HOURS, phone: "041-555-0303",
      rating: 4.6, bookmark: true, mx: 68, my: 28,
      lat: 36.80325, lng: 127.14960,
      image: IMG_FRUIT, description: "제철 과일 소분 판매.",
      menus: menus("j13", [
        ["배 3개", 12000], ["딸기 1팩", 6000, 8000, 25], ["귤 1kg", 7000], ["사과 5개", 7500],
        ["바나나 1송이", 3500], ["포도 1팩", 9000], ["키위 5개", 5500], ["계란 30구", 6900], ["두부 1모", 3000],
      ]),
    },
    {
      id: 14, name: "남해수산", category: "수산물",
      location: "천안시 동남구 대흥로 262, 중앙시장 수산동 4호", hours: HOURS, phone: "041-555-0402",
      rating: 4.4, bookmark: false, mx: 78, my: 50,
      lat: 36.80270, lng: 127.14985,
      image: IMG_SEAFOOD, description: "바지락·꽃게·오징어.",
      menus: menus("j14", [
        ["바지락 1kg", 8000, 10000, 20], ["꽃게 2마리", 15000], ["오징어 3마리", 9000], ["고등어 2마리", 5500],
        ["새우 500g", 11000], ["주꾸미 500g", 13000], ["홍합 1kg", 7000], ["매운탕 재료", 12000],
      ]),
    },
    {
      id: 15, name: "통큰건어물", category: "반찬·건어물",
      location: "천안시 동남구 문화동 62, 중앙시장 C동 21호", hours: HOURS, phone: "041-555-0502",
      rating: 4.3, bookmark: false, mx: 45, my: 70,
      lat: 36.80220, lng: 127.14915,
      image: IMG_BANCHAN, description: "쥐포·황태·새우젓.",
      menus: menus("j15", [
        ["쥐포 10장", 5000], ["황태채 200g", 8000, 10000, 20], ["새우젓 500g", 7000], ["김 1봉", 4000],
        ["김치 1kg", 7500], ["오징어채", 5500], ["멸치 1근", 6500], ["다시마 200g", 4500],
      ]),
    },
    {
      id: 16, name: "천안쌀잡곡", category: "기타·생활",
      location: "천안시 동남구 대흥로 268, 중앙시장 E동 8호", hours: HOURS, phone: "041-555-0602",
      rating: 4.5, bookmark: false, mx: 80, my: 70,
      lat: 36.80215, lng: 127.14990,
      image: IMG_LIVING, description: "쌀·현미·잡곡 소분.",
      menus: menus("j16", [
        ["쌀 5kg", 18000], ["현미 2kg", 8000], ["잡곡 1kg", 5000], ["콩 1kg", 4500],
        ["찹쌀 2kg", 9000], ["보리 1kg", 4000], ["흑미 1kg", 5500], ["들깨 500g", 6000],
      ]),
    },
    {
      id: 17, name: "중앙정육센터", category: "정육·계란",
      location: "천안시 동남구 대흥로 242, 중앙시장 A동 40호", hours: HOURS, phone: "041-555-0202",
      rating: 4.6, bookmark: false, mx: 28, my: 68,
      lat: 36.80225, lng: 127.14885,
      image: IMG_MEAT, description: "보쌈·수육용 고기 손질.",
      menus: menus("j17", [
        ["보쌈용 수육 300g", 11000], ["앞다리살 500g", 8000], ["계란 15구", 4500], ["삼겹살 500g", 12500],
        ["계란 30구", 7800], ["목살 500g", 11500], ["돼지불고기 500g", 9500], ["닭볶음탕용 1kg", 9000],
      ]),
    },
    {
      id: 18, name: "엄마손김밥", category: "먹거리·분식",
      location: "천안시 동남구 대흥로 240, 중앙시장 정문 입구 2호", hours: HOURS, phone: "041-555-0107",
      rating: 4.7, badge: "포장", bookmark: true, mx: 18, my: 22,
      lat: 36.80370, lng: 127.14885,
      image: IMG_FOOD, description: "김밥·라면·떡볶이 포장.",
      menus: menus("j18", [
        ["참치김밥", 3500], ["치즈김밥", 4000], ["떡볶이", 4500], ["라면", 4000],
        ["야채김밥", 3000], ["돈까스김밥", 4500], ["순대", 4000], ["튀김", 3000], ["우동", 5000],
      ]),
    },
  ],

  byeongcheon: [
    {
      id: 1, name: "역전순대국", category: "먹거리·분식",
      location: "천안시 동남구 대흥로 70, 역전시장 1통로 3호", hours: HOURS, phone: "041-566-1101",
      rating: 4.8, badge: "대표", bookmark: true, mx: 25, my: 25,
      lat: 36.81085, lng: 127.14870,
      image: IMG_FOOD, description: "기차역 앞 든든한 순대국.",
      menus: menus("b1", [
        ["순대국밥", 9000], ["머리고기", 15000], ["순대만", 7000], ["얼큰순대국", 10000],
        ["어묵 3개", 3500], ["수육 소", 12000], ["내장국밥", 9500], ["김치추가", 2000],
      ]),
    },
    {
      id: 2, name: "역전어묵튀김", category: "먹거리·분식",
      location: "천안시 동남구 대흥로 74, 역전시장 2통로 5호", hours: HOURS, phone: "041-566-1102",
      rating: 4.5, badge: "간식", bookmark: false, mx: 55, my: 22,
      lat: 36.81095, lng: 127.14910,
      image: IMG_SNACK, description: "바삭 어묵·튀김 포장.",
      menus: menus("b2", [
        ["모듬튀김", 5000], ["어묵 3개", 3000], ["핫도그", 2500], ["어묵탕", 5000],
        ["순대국밥", 8500], ["떡꼬치", 2500], ["김말이 2개", 3000], ["번데기 1컵", 2000],
      ]),
    },
    {
      id: 3, name: "역전칼국수", category: "먹거리·분식",
      location: "천안시 동남구 대흥로 72, 역전시장 1통로 8호", hours: HOURS, phone: "041-566-1103",
      rating: 4.6, bookmark: false, mx: 40, my: 35,
      lat: 36.81070, lng: 127.14890,
      image: IMG_NOODLE, description: "따뜻한 칼국수와 만두.",
      menus: menus("b3", [
        ["칼국수", 8000], ["비빔국수", 8000], ["수제비", 8000], ["만두 6개", 5000],
        ["김치칼국수", 9000], ["해물칼국수", 10000], ["콩국수", 8500], ["만두국", 8000],
      ]),
    },
    {
      id: 4, name: "역전정육점", category: "정육·계란",
      location: "천안시 동남구 문화동 12, 역전시장 정육골목 2호", hours: HOURS, phone: "041-566-1201",
      rating: 4.4, bookmark: false, mx: 35, my: 48,
      lat: 36.81045, lng: 127.14880,
      image: IMG_MEAT, description: "삼겹·목살·계란.",
      menus: menus("b4", [
        ["삼겹살 500g", 12000], ["목살 500g", 11000], ["계란 30구", 7500], ["앞다리살 500g", 8000],
        ["돼지불고기 500g", 9000], ["다진돼지 500g", 7000], ["갈비살 500g", 14000], ["특란 15구", 4500],
      ]),
    },
    {
      id: 5, name: "역전청과마트", category: "채소·과일",
      location: "천안시 동남구 문화동 15, 역전시장 청과동 1호", hours: HOURS, phone: "041-566-1301",
      rating: 4.7, badge: "신선", bookmark: true, mx: 20, my: 55,
      lat: 36.81025, lng: 127.14855,
      image: IMG_VEG, description: "장보기용 채소·과일.",
      menus: menus("b5", [
        ["시금치 1단", 2000], ["당근 1봉", 3000], ["사과 4개", 7000], ["양파 3kg", 4500],
        ["대파 1단", 2500], ["상추 1봉", 3000], ["배추 1포기", 4000], ["두부 1모", 2800],
        ["계란 30구", 7000], ["딸기 1팩", 6000],
      ]),
    },
    {
      id: 6, name: "역전수산", category: "수산물",
      location: "천안시 동남구 대흥로 78, 역전시장 수산동 4호", hours: HOURS, phone: "041-566-1401",
      rating: 4.3, bookmark: false, mx: 70, my: 45,
      lat: 36.81050, lng: 127.14935,
      image: IMG_SEAFOOD, description: "고등어·오징어·조개.",
      menus: menus("b6", [
        ["고등어 2마리", 6500], ["오징어 2마리", 8000], ["바지락 500g", 5000], ["갈치 1마리", 12000],
        ["새우 500g", 10000], ["조기 2마리", 9000], ["홍합 1kg", 7000], ["김 1봉", 4000],
      ]),
    },
    {
      id: 7, name: "역전반찬집", category: "반찬·건어물",
      location: "천안시 동남구 문화동 18, 역전시장 3통로 6호", hours: HOURS, phone: "041-566-1501",
      rating: 4.5, bookmark: false, mx: 48, my: 58,
      lat: 36.81020, lng: 127.14900,
      image: IMG_BANCHAN, description: "밑반찬·젓갈·건어물.",
      menus: menus("b7", [
        ["반찬 2종", 8000], ["멸치볶음", 4500], ["오징어젓", 6000], ["김치 1kg", 8000],
        ["계란말이", 4500], ["시금치나물", 3500], ["콩자반", 4000], ["깍두기 1kg", 7000],
      ]),
    },
    {
      id: 8, name: "역전잡화가게", category: "기타·생활",
      location: "천안시 동남구 대흥로 68, 역전시장 남문 입구 옆", hours: HOURS, phone: "041-566-1601",
      rating: 4.1, bookmark: false, mx: 75, my: 60,
      lat: 36.81015, lng: 127.14945,
      image: IMG_LIVING, description: "봉투·장갑·생활용품.",
      menus: menus("b8", [
        ["비닐봉투 100매", 3500], ["고무장갑", 2500], ["장바구니", 4500], ["수세미 세트", 2000],
        ["행주 5장", 4000], ["앞치마", 6000], ["세탁세제 1kg", 5500], ["휴지 30롤", 12000],
      ]),
    },
    {
      id: 9, name: "역전김밥천국", category: "먹거리·분식",
      location: "천안시 동남구 대흥로 66, 역전시장 정문 1호", hours: HOURS, phone: "041-566-1104",
      rating: 4.6, badge: "포장", bookmark: true, mx: 15, my: 20,
      lat: 36.81100, lng: 127.14850,
      image: IMG_FOOD, description: "빠른 김밥·라면.",
      menus: menus("b9", [
        ["야채김밥", 3000], ["참치김밥", 3500], ["치즈김밥", 4000], ["라면", 4000],
        ["떡볶이", 4500], ["돈까스김밥", 4500], ["우동", 5000], ["순대", 4000],
      ]),
    },
    {
      id: 10, name: "역전떡볶이집", category: "먹거리·분식",
      location: "천안시 동남구 대흥로 76, 역전시장 2통로 9호", hours: HOURS, phone: "041-566-1105",
      rating: 4.4, bookmark: false, mx: 60, my: 32,
      lat: 36.81080, lng: 127.14920,
      image: IMG_SNACK, description: "떡볶이·순대·튀김 세트.",
      menus: menus("b10", [
        ["떡볶이", 4000], ["순대", 4000], ["튀김", 3000], ["모둠세트", 9000, 11000, 18],
        ["어묵 3개", 2800], ["핫도그", 2500], ["김말이 2개", 3000], ["라면", 4000],
      ]),
    },
    {
      id: 11, name: "역전과일가게", category: "채소·과일",
      location: "천안시 동남구 문화동 16, 역전시장 청과동 5호", hours: HOURS, phone: "041-566-1302",
      rating: 4.5, bookmark: false, mx: 30, my: 65,
      lat: 36.81005, lng: 127.14875,
      image: IMG_FRUIT, description: "제철 과일 소분.",
      menus: menus("b11", [
        ["배 2개", 8000], ["바나나 1송이", 3500], ["포도 1팩", 9000], ["사과 4개", 6500],
        ["딸기 1팩", 5500], ["귤 1kg", 7000], ["키위 5개", 5500], ["대파 1단", 2000],
      ]),
    },
    {
      id: 12, name: "역전계란집", category: "정육·계란",
      location: "천안시 동남구 문화동 13, 역전시장 정육골목 5호", hours: HOURS, phone: "041-566-1202",
      rating: 4.3, bookmark: false, mx: 42, my: 52,
      lat: 36.81035, lng: 127.14895,
      image: IMG_MEAT, description: "유정란·특란·메추리알.",
      menus: menus("b12", [
        ["특란 30구", 8000], ["유정란 10구", 6000], ["메추리알", 3500], ["왕란 15구", 5500],
        ["계란 30구", 6500], ["삼겹살 500g", 12500], ["목살 500g", 11500], ["두부 1모", 3000],
      ]),
    },
    {
      id: 13, name: "역전건어물", category: "반찬·건어물",
      location: "천안시 동남구 문화동 20, 역전시장 3통로 12호", hours: HOURS, phone: "041-566-1502",
      rating: 4.2, bookmark: false, mx: 65, my: 55,
      lat: 36.81030, lng: 127.14925,
      image: IMG_BANCHAN, description: "쥐포·오징어채·김.",
      menus: menus("b13", [
        ["김 1봉", 4000], ["오징어채", 5500], ["쥐포 5장", 3000], ["황태채 200g", 8000],
        ["김치 1kg", 7500], ["멸치 1근", 6500], ["새우젓 500g", 7000], ["다시마 200g", 4500],
      ]),
    },
    {
      id: 14, name: "역전씨앗견과", category: "기타·생활",
      location: "천안시 동남구 대흥로 75, 역전시장 중앙통로 7호", hours: HOURS, phone: "041-566-1602",
      rating: 4.4, bookmark: false, mx: 50, my: 40,
      lat: 36.81060, lng: 127.14905,
      image: IMG_LIVING, description: "견과·씨앗·잡곡 소분.",
      menus: menus("b14", [
        ["아몬드 200g", 5000], ["호두 150g", 6000], ["잡곡 500g", 4000], ["해바라기씨 200g", 3500],
        ["호박씨 200g", 4000], ["캐슈넛 200g", 5500], ["현미 1kg", 4500], ["들깨 500g", 6000],
      ]),
    },
    {
      id: 15, name: "역전회센터", category: "수산물",
      location: "천안시 동남구 대흥로 80, 역전시장 수산동 8호", hours: HOURS, phone: "041-566-1402",
      rating: 4.6, badge: "회", bookmark: true, mx: 80, my: 40,
      lat: 36.81055, lng: 127.14955,
      image: IMG_SEAFOOD, description: "모듬회·광어·우럭 포장.",
      menus: menus("b15", [
        ["모듬회 소", 25000], ["광어회", 30000], ["우럭회", 28000], ["매운탕 재료", 12000],
        ["고등어 2마리", 6000], ["오징어 2마리", 7500], ["새우 500g", 11000], ["주꾸미 500g", 13000],
      ]),
    },
  ],

  seonghwan: [
    {
      id: 1, name: "성환칼국수", category: "먹거리·분식",
      location: "천안시 서북구 성환읍 성환1로 225, 이화시장 1동 6호", hours: HOURS, phone: "041-588-2101",
      rating: 4.7, badge: "인기", bookmark: true, mx: 30, my: 22,
      lat: 36.91975, lng: 127.12973,
      image: IMG_NOODLE, description: "수제 칼국수와 콩국수.",
      menus: menus("s1", [["칼국수", 7000], ["콩국수", 8000], ["수제비", 7000], ["만두", 5000]]),
    },
    {
      id: 2, name: "성환분식코너", category: "먹거리·분식",
      location: "천안시 서북구 성환읍 성환1로 230, 이화시장 2동 3호", hours: HOURS, phone: "041-588-2102",
      rating: 4.4, bookmark: false, mx: 68, my: 28,
      lat: 36.91957, lng: 127.13106,
      image: IMG_SNACK, description: "떡볶이·순대 간식.",
      menus: menus("s2", [["떡볶이", 4000], ["순대", 4000], ["튀김", 3000], ["모둠세트", 9000]]),
    },
    {
      id: 3, name: "성환정육점", category: "정육·계란",
      location: "천안시 서북구 성환읍 성환1로 220, 이화시장 1동 20호", hours: HOURS, phone: "041-588-2201",
      rating: 4.5, bookmark: false, mx: 48, my: 48,
      lat: 36.91897, lng: 127.13036,
      image: IMG_MEAT, description: "한우·한돈 정육.",
      menus: menus("s3", [["한우불고기 300g", 18000], ["삼겹살 500g", 12000], ["목살 500g", 11000], ["계란 30구", 7500]]),
    },
    {
      id: 4, name: "성환청과마트", category: "채소·과일",
      location: "천안시 서북구 성환읍 성환1로 235, 이화시장 3동 11호", hours: HOURS, phone: "041-588-2301",
      rating: 4.6, badge: "신선", bookmark: false, mx: 20, my: 62,
      lat: 36.91855, lng: 127.12938,
      image: IMG_VEG, description: "채소·과일 함께 판매.",
      menus: menus("s4", [["배추 1포기", 3500], ["무 1개", 2000], ["사과 5개", 8000], ["양파 3kg", 4500]]),
    },
    {
      id: 5, name: "성환배농원직판", category: "채소·과일",
      location: "천안시 서북구 성환읍 성환1로 240, 이화시장 특산물 코너", hours: HOURS, phone: "041-588-2302",
      rating: 4.9, badge: "특산물", bookmark: true, mx: 75, my: 60,
      lat: 36.91861, lng: 127.13131,
      image: IMG_FRUIT, description: "성환 배 산지직송.",
      menus: menus("s5", [["배 선물세트 6개", 25000, 30000, 17], ["배 3개", 12000], ["배즙 1팩", 15000], ["배 조각세트", 8000]]),
    },
  ],
};

export const MARKET_INFO: Record<MarketId, { name: string; color: string; subtitle: string }> = {
  jungang: { name: "천안중앙시장", color: "#0EA5E9", subtitle: "상설시장 · 매일 운영" },
  byeongcheon: { name: "천안역전시장", color: "#0EA5E9", subtitle: "상설시장 · 매일 운영" },
  seonghwan: { name: "성환이화시장", color: "#0EA5E9", subtitle: "이화시장 · 매일 운영" },
};

export const MAP_CONFIGS: Record<
  MarketId,
  { roads: string[]; blocks: { x: number; y: number; w: number; h: number }[] }
> = {
  jungang: {
    roads: ["M 0 40 H 100", "M 0 70 H 100", "M 30 0 V 100", "M 60 0 V 100", "M 85 0 V 100", "M 0 55 H 30 M 60 55 H 100"],
    blocks: [
      { x: 0, y: 0, w: 30, h: 40 }, { x: 30, y: 0, w: 30, h: 40 }, { x: 60, y: 0, w: 25, h: 40 },
      { x: 0, y: 40, w: 30, h: 30 }, { x: 60, y: 40, w: 25, h: 30 },
      { x: 0, y: 70, w: 30, h: 30 }, { x: 30, y: 70, w: 30, h: 30 }, { x: 60, y: 70, w: 25, h: 30 },
    ],
  },
  byeongcheon: {
    roads: ["M 0 45 H 100", "M 0 75 H 100", "M 35 0 V 100", "M 70 0 V 100", "M 35 45 Q 52 58 70 45"],
    blocks: [
      { x: 0, y: 0, w: 35, h: 45 }, { x: 35, y: 0, w: 35, h: 45 }, { x: 70, y: 0, w: 30, h: 45 },
      { x: 0, y: 45, w: 35, h: 30 }, { x: 70, y: 45, w: 30, h: 30 },
      { x: 0, y: 75, w: 35, h: 25 }, { x: 35, y: 75, w: 35, h: 25 }, { x: 70, y: 75, w: 30, h: 25 },
    ],
  },
  seonghwan: {
    roads: ["M 0 35 H 100", "M 0 65 H 100", "M 25 0 V 100", "M 55 0 V 100", "M 80 0 V 100"],
    blocks: [
      { x: 0, y: 0, w: 25, h: 35 }, { x: 25, y: 0, w: 30, h: 35 }, { x: 55, y: 0, w: 25, h: 35 },
      { x: 0, y: 35, w: 25, h: 30 }, { x: 55, y: 35, w: 25, h: 30 },
      { x: 0, y: 65, w: 25, h: 35 }, { x: 25, y: 65, w: 30, h: 35 }, { x: 55, y: 65, w: 25, h: 35 },
    ],
  },
};

/** 임시로 붙인 상점명(숫자만, 상점1 등)인지 판별 */
export function isPlaceholderStoreName(name: string | undefined) {
  const t = (name ?? "").trim();
  if (!t) return true;
  return /^\d+$/.test(t) || /^상점\s*\d+$/i.test(t) || /^가게\s*\d+$/i.test(t) || t === "새 상점" || t === "신규 상점";
}

/** 위치 칸에 대충 넣은 값(ㅁ, 1, 미정 등)인지 판별 */
export function isPlaceholderLocation(location: string | undefined) {
  const t = (location ?? "").trim();
  if (!t) return true;
  if (/^[ㅁㅇ□■ㆍ·.\-_/]+$/.test(t)) return true;
  if (/^\d+$/.test(t)) return true;
  if (/^(위치|주소|미정|없음|테스트|test|n\/a|없음)$/i.test(t)) return true;
  if (/^(동|호|통로)\s*\d*$/i.test(t)) return true;
  if (t.length <= 2) return true;
  return false;
}

/** 카테고리·상점명 기준으로 데모용 메뉴 3개 이상 생성 */
export function menusForStoreName(
  name: string,
  category: CategoryKey,
  prefix = "auto",
): MenuItem[] {
  const n = name.replace(/\s+/g, "");
  if (/순대국|국밥/.test(n)) {
    return menus(prefix, [["순대국밥", 9000], ["얼큰순대국", 10000], ["모듬순대", 15000], ["수육 소", 12000]]);
  }
  if (/호두과자/.test(n)) {
    return menus(prefix, [["호두과자 1봉", 4000], ["호두과자 2봉", 7000], ["미니 호두과자", 6000], ["호두과자 선물세트", 12000]]);
  }
  if (/칼국수|국수/.test(n)) {
    return menus(prefix, [["칼국수", 8000], ["수제비", 8000], ["비빔국수", 8000], ["만두 6개", 5000]]);
  }
  if (/만두/.test(n)) {
    return menus(prefix, [["김치만두 10개", 6000], ["고기만두 10개", 6500], ["왕만두 5개", 5500], ["찐만두 세트", 10000]]);
  }
  if (/파전|전집/.test(n)) {
    return menus(prefix, [["해물파전", 10000], ["김치전", 8000], ["감자전", 7000], ["막걸리", 4000]]);
  }
  if (/어묵|튀김/.test(n)) {
    return menus(prefix, [["어묵꼬치 3개", 3000], ["모듬튀김", 5000], ["어묵탕", 5000], ["핫도그", 2500]]);
  }
  if (/떡볶이/.test(n)) {
    return menus(prefix, [["떡볶이", 4000], ["순대", 4000], ["튀김", 3000], ["모둠세트", 9000]]);
  }
  if (/김밥/.test(n)) {
    return menus(prefix, [["참치김밥", 3500], ["야채김밥", 3000], ["치즈김밥", 4000], ["라면", 4000]]);
  }
  if (/회|수산|해물/.test(n) || category === "수산물") {
    return menus(prefix, [["고등어 2마리", 7000], ["오징어 2마리", 8000], ["모듬회 소", 25000], ["매운탕 재료", 12000]]);
  }
  if (/정육|고기|계란/.test(n) || category === "정육·계란") {
    return menus(prefix, [["삼겹살 500g", 12000], ["목살 500g", 11000], ["계란 30구", 7500], ["앞다리살 500g", 8000]]);
  }
  if (/과일|청과|배농|채소|두부|콩나물/.test(n) || category === "채소·과일") {
    return menus(prefix, [["사과 5개", 8000], ["대파 1단", 2500], ["양파 3kg", 4500], ["배 3개", 12000]]);
  }
  if (/반찬|건어|젓갈|김\b/.test(n) || category === "반찬·건어물") {
    return menus(prefix, [["반찬 3종 세트", 12000], ["김치 1kg", 8000], ["멸치볶음 200g", 5000], ["쥐포 10장", 5000]]);
  }
  if (/쌀|잡곡|견과|씨앗/.test(n)) {
    return menus(prefix, [["쌀 5kg", 18000], ["현미 2kg", 8000], ["잡곡 1kg", 5000], ["아몬드 200g", 5000]]);
  }
  if (category === "먹거리·분식") {
    return menus(prefix, [["오늘의 분식", 5000], ["세트메뉴", 9000], ["음료", 2000], ["추가 토핑", 1500]]);
  }
  return menus(prefix, [["장바구니", 5000], ["고무장갑 3켤레", 3000], ["수세미 세트", 2000], ["비닐봉투 100매", 3500]]);
}

/** 메뉴가 비었거나 3개 미만이면 상점명·카테고리로 채움 */
export function ensureStoreMenus(
  name: string,
  category: CategoryKey,
  menus: MenuItem[] | undefined,
  prefix = "auto",
): MenuItem[] {
  const cleaned = (menus ?? []).filter((m) => m?.name?.trim() && Number(m.price) > 0);
  if (cleaned.length >= 3) return cleaned;
  return menusForStoreName(name, category, prefix);
}
