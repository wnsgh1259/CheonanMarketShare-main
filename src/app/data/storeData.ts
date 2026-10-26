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
        ["사골순대국밥", 9500], ["얼큰내장국밥", 10500], ["순대국밥 특", 11500],
        ["순대만 한접시", 8000], ["머릿고기 한접시", 14000], ["수육무침 소", 10000],
        ["순대볶음 소", 9000], ["국밥 공기밥 추가", 1000], ["된장찌개 추가", 3000],
        ["부추무침", 3000], ["술국(소주안주)", 12000],
      ]),
    },
    {
      id: 2, name: "호두과자 본점", category: "먹거리·분식",
      location: "천안시 동남구 대흥로 252, 중앙시장 B동 5호", hours: HOURS, phone: "041-555-0102",
      rating: 4.9, badge: "명물", bookmark: false, mx: 55, my: 20,
      lat: 36.80340, lng: 127.14935,
      image: IMG_SNACK, description: "갓 구운 천안 호두과자. 길에 들고 다니기 좋아요.",
      menus: menus("j2", [
        ["호두과자 10개입", 4000], ["호두과자 20개입", 7000, 8000, 13], ["미니 호두과자 15개입", 6000],
        ["밤 호두과자 10개입", 5000], ["흑임자 호두과자 10개입", 4500], ["호두과자 선물상자 30개", 12000],
      ]),
    },
    {
      id: 3, name: "중앙칼국수", category: "먹거리·분식",
      location: "천안시 동남구 대흥로 260, 중앙시장 C동 8호", hours: HOURS, phone: "041-555-0103",
      rating: 4.6, bookmark: false, mx: 75, my: 35,
      lat: 36.80315, lng: 127.14970,
      image: IMG_NOODLE, description: "수제면 멸치 육수 칼국수.",
      menus: menus("j3", [
        ["멸치칼국수", 8000], ["바지락칼국수", 11000], ["들깨칼국수", 9500],
        ["김치수제비", 8500], ["손만두 8개", 6000], ["만두칼국수", 10000],
        ["메밀전병 2장", 5000], ["열무비빔국수", 8500],
      ]),
    },
    {
      id: 4, name: "신선정육점", category: "정육·계란",
      location: "천안시 동남구 대흥로 246, 중앙시장 A동 34호", hours: HOURS, phone: "041-555-0201",
      rating: 4.5, bookmark: false, mx: 30, my: 45,
      lat: 36.80290, lng: 127.14890,
      image: IMG_MEAT, description: "당일 손질 한돈·계란.",
      menus: menus("j4", [
        ["삼겹살", 11000], ["한돈 항정살 300g", 12000], ["한돈 가브리살 300g", 11500],
        ["다짐육 500g", 6500], ["등심스테이크용 400g", 16000], ["특란 30구", 8200],
      ]),
    },
    {
      id: 5, name: "싱싱청과", category: "채소·과일",
      location: "천안시 동남구 문화동 59-4, 중앙시장 D동 2호", hours: HOURS, phone: "041-555-0301",
      rating: 4.4, badge: "신선", bookmark: true, mx: 48, my: 55,
      lat: 36.80265, lng: 127.14920,
      image: IMG_VEG, description: "새벽 입고 채소·과일.",
      menus: menus("j5", [
        ["대파", 2000], ["사과", 8500], ["양파 3kg", 4500, 6000, 25], ["얼갈이배추 1단", 3500],
        ["풋고추 1봉", 2500], ["브로콜리 1개", 3500], ["방울토마토 1팩", 4000],
        ["청경채 1봉", 2800], ["깻잎 1속", 2000], ["애호박 2개", 3000],
      ]),
    },
    {
      id: 6, name: "중앙수산", category: "수산물",
      location: "천안시 동남구 대흥로 255, 중앙시장 B동 22호", hours: HOURS, phone: "041-555-0401",
      rating: 4.5, bookmark: false, mx: 62, my: 48,
      lat: 36.80285, lng: 127.14955,
      image: IMG_SEAFOOD, description: "고등어·갈치·새우 손질 판매.",
      menus: menus("j6", [
        ["손질 고등어 구이용 2마리", 8000], ["갈치 중 1마리", 12500], ["조기 2마리", 9500],
        ["임연수 2마리", 8500], ["전어 1접시", 11000], ["멸치 국물용 1근", 6000], ["마른김 10장", 4500],
      ]),
    },
    {
      id: 7, name: "시장반찬가게", category: "반찬·건어물",
      location: "천안시 동남구 문화동 61-2, 중앙시장 C동 15호", hours: HOURS, phone: "041-555-0501",
      rating: 4.6, bookmark: true, mx: 40, my: 62,
      lat: 36.80240, lng: 127.14905,
      image: IMG_BANCHAN, description: "집밥용 반찬·김치·멸치볶음.",
      menus: menus("j7", [
        ["배추김치 1kg", 8000], ["총각김치 1kg", 7500], ["멸치볶음 200g", 5000, 6500, 23],
        ["계란말이 1줄", 4500], ["연근조림 200g", 4500], ["시금치나물 200g", 3500],
        ["도라지무침 200g", 4000], ["잡채 300g", 6500], ["고등어조림 2토막", 7500],
        ["우엉조림 200g", 4200], ["깻잎지 200g", 3800],
      ]),
    },
    {
      id: 8, name: "생활잡화코너", category: "기타·생활",
      location: "천안시 동남구 대흥로 265, 중앙시장 E동 3호", hours: HOURS, phone: "041-555-0601",
      rating: 4.2, bookmark: false, mx: 70, my: 65,
      lat: 36.80235, lng: 127.14975,
      image: IMG_LIVING, description: "시장용 생활잡화·주방용품.",
      menus: menus("j8", [
        ["고무장갑 중형 3켤레", 3000], ["수세미 10개입", 2000], ["시장용 비닐봉투 100매", 3500],
        ["방수 앞치마", 6000], ["지퍼백 중형 50매", 4000],
      ]),
    },
    {
      id: 9, name: "천안만두가게", category: "먹거리·분식",
      location: "천안시 동남구 대흥로 244, 중앙시장 A동 7호", hours: HOURS, phone: "041-555-0104",
      rating: 4.7, bookmark: false, mx: 25, my: 40,
      lat: 36.80305, lng: 127.14880,
      image: IMG_SNACK, description: "찐만두·군만두 포장 가능.",
      menus: menus("j9", [
        ["김치만두 10개", 6000], ["고기만두 10개", 6500, 8000, 19], ["왕만두 5개", 5500],
        ["군만두 10개", 7000], ["찐만두 10개", 6000], ["만두국 1인분", 8000],
        ["김치왕만두 5개", 6000], ["새우만두 8개", 7500], ["냉동만두 20개입", 9000],
        ["만두피 20장", 3500], ["고추만두 8개", 7000],
      ]),
    },
    {
      id: 10, name: "해물파전집", category: "먹거리·분식",
      location: "천안시 동남구 대흥로 254, 중앙시장 B동 11호", hours: HOURS, phone: "041-555-0105",
      rating: 4.5, bookmark: false, mx: 58, my: 38,
      lat: 36.80300, lng: 127.14940,
      image: IMG_FOOD, description: "바삭한 해물파전과 막걸리.",
      menus: menus("j10", [
        ["해물파전 1장", 10000], ["김치전 1장", 8000], ["부추전 1장", 7500],
        ["녹두빈대떡", 8500], ["막걸리 750ml", 4000], ["파전 반반", 9000],
      ]),
    },
    {
      id: 11, name: "어묵꼬치골목", category: "먹거리·분식",
      location: "천안시 동남구 문화동 58, 중앙시장 먹거리골목 3호", hours: HOURS, phone: "041-555-0106",
      rating: 4.3, badge: "간식", bookmark: false, mx: 50, my: 42,
      lat: 36.80275, lng: 127.14925,
      image: IMG_SNACK, description: "걸으면서 먹는 어묵·번데기.",
      menus: menus("j11", [
        ["어묵꼬치 3개", 3000], ["어묵꼬치 5개", 4500], ["어묵국물 리필", 1000],
        ["번데기 1컵", 2000], ["떡꼬치 2개", 2500], ["어묵탕 1인분", 5000], ["유부주머니 2개", 3000],
      ]),
    },
    {
      id: 12, name: "두부콩나물집", category: "채소·과일",
      location: "천안시 동남구 문화동 60-1, 중앙시장 D동 9호", hours: HOURS, phone: "041-555-0302",
      rating: 4.4, bookmark: false, mx: 35, my: 58,
      lat: 36.80250, lng: 127.14895,
      image: IMG_VEG, description: "매일 만드는 두부와 콩나물.",
      menus: menus("j12", [
        ["손두부 1모", 2800], ["순두부 1팩", 3000], ["연두부 2팩", 3500],
        ["콩나물 500g", 2000], ["대파", 2800], ["유부 10장", 3500],
      ]),
    },
    {
      id: 13, name: "황금과일가게", category: "채소·과일",
      location: "천안시 동남구 대흥로 258, 중앙시장 B동 18호", hours: HOURS, phone: "041-555-0303",
      rating: 4.6, bookmark: true, mx: 68, my: 28,
      lat: 36.80325, lng: 127.14960,
      image: IMG_FRUIT, description: "제철 과일 소분 판매.",
      menus: menus("j13", [
        ["사과", 7000], ["천안배 3개", 13000], ["딸기 1팩", 6000, 8000, 25],
        ["샤인머스캣 1송이", 18000], ["한라봉 5개", 10000], ["블루베리 1팩", 7000],
        ["체리 200g", 8500], ["망고 2개", 9000],
      ]),
    },
    {
      id: 14, name: "남해수산", category: "수산물",
      location: "천안시 동남구 대흥로 262, 중앙시장 수산동 4호", hours: HOURS, phone: "041-555-0402",
      rating: 4.4, bookmark: false, mx: 78, my: 50,
      lat: 36.80270, lng: 127.14985,
      image: IMG_SEAFOOD, description: "바지락·꽃게·오징어.",
      menus: menus("j14", [
        ["바지락 1kg", 8000, 10000, 20], ["꽃게 2마리", 15000], ["낙지 2마리", 14000],
        ["전복 3미", 18000], ["주꾸미 500g", 13000], ["홍합 1kg", 7000],
        ["키조개 관자 200g", 16000], ["소라 1kg", 12000], ["멍게 5미", 10000], ["가리비 10개", 11000],
      ]),
    },
    {
      id: 15, name: "통큰건어물", category: "반찬·건어물",
      location: "천안시 동남구 문화동 62, 중앙시장 C동 21호", hours: HOURS, phone: "041-555-0502",
      rating: 4.3, bookmark: false, mx: 45, my: 70,
      lat: 36.80220, lng: 127.14915,
      image: IMG_BANCHAN, description: "쥐포·황태·새우젓.",
      menus: menus("j15", [
        ["쥐포 10장", 5000], ["황태채 200g", 8000, 10000, 20], ["북어포 5장", 6000],
        ["국물멸치 1근", 6500], ["다시마 200g", 4500], ["멸치액젓 500ml", 5000],
        ["황태구이 2마리", 7000], ["코다리 3마리", 9000],
      ]),
    },
    {
      id: 16, name: "천안쌀잡곡", category: "기타·생활",
      location: "천안시 동남구 대흥로 268, 중앙시장 E동 8호", hours: HOURS, phone: "041-555-0602",
      rating: 4.5, bookmark: false, mx: 80, my: 70,
      lat: 36.80215, lng: 127.14990,
      image: IMG_LIVING, description: "쌀·현미·잡곡 소분.",
      menus: menus("j16", [
        ["백미 5kg", 18000], ["백미 10kg", 32000], ["현미 2kg", 8000], ["찹쌀 2kg", 9000],
        ["흑미 1kg", 5500], ["혼합잡곡 1kg", 5000],
      ]),
    },
    {
      id: 17, name: "중앙정육센터", category: "정육·계란",
      location: "천안시 동남구 대흥로 242, 중앙시장 A동 40호", hours: HOURS, phone: "041-555-0202",
      rating: 4.6, bookmark: false, mx: 28, my: 68,
      lat: 36.80225, lng: 127.14885,
      image: IMG_MEAT, description: "보쌈·수육용 고기 손질.",
      menus: menus("j17", [
        ["삼겹살", 13500], ["보쌈용 수육 500g", 14000], ["수육용 앞다리 500g", 9000],
        ["족발용 앞다리 1kg", 16000], ["돼지갈비 찜용 1kg", 15000], ["닭볶음탕용 1kg", 9000],
        ["계란 15구", 4500], ["사골육수 1L", 5000],
      ]),
    },
    {
      id: 18, name: "엄마손김밥", category: "먹거리·분식",
      location: "천안시 동남구 대흥로 240, 중앙시장 정문 입구 2호", hours: HOURS, phone: "041-555-0107",
      rating: 4.7, badge: "포장", bookmark: true, mx: 18, my: 22,
      lat: 36.80370, lng: 127.14885,
      image: IMG_FOOD, description: "김밥·라면·떡볶이 포장.",
      menus: menus("j18", [
        ["참치김밥", 3500], ["치즈김밥", 4000], ["야채김밥", 3000], ["소고기김밥", 4500],
        ["날치알김밥", 4500], ["김치김밥", 3500], ["삼각김밥 참치", 2000],
        ["잔치국수", 5000], ["라면", 4000], ["떡볶이 1인분", 4500], ["우동 1인분", 5000], ["유부초밥 4개", 4000],
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
        ["역전순대국 보통", 8500], ["역전순대국 특", 10500], ["순댓국+순대추가", 11000],
        ["순대곱창볶음", 13000], ["돼지국밥", 9000], ["공깃밥", 1000],
      ]),
    },
    {
      id: 2, name: "역전어묵튀김", category: "먹거리·분식",
      location: "천안시 동남구 대흥로 74, 역전시장 2통로 5호", hours: HOURS, phone: "041-566-1102",
      rating: 4.5, badge: "간식", bookmark: false, mx: 55, my: 22,
      lat: 36.81095, lng: 127.14910,
      image: IMG_SNACK, description: "바삭 어묵·튀김 포장.",
      menus: menus("b2", [
        ["모듬튀김 소", 5000], ["모듬튀김 대", 9000], ["고추튀김 2개", 2500],
        ["야채튀김", 3000], ["오징어튀김", 4000], ["감자튀김", 3500],
        ["치즈핫도그", 3000], ["어묵바 1개", 2000], ["닭꼬치 2개", 4500], ["츄러스 2개", 3000],
      ]),
    },
    {
      id: 3, name: "역전칼국수", category: "먹거리·분식",
      location: "천안시 동남구 대흥로 72, 역전시장 1통로 8호", hours: HOURS, phone: "041-566-1103",
      rating: 4.6, bookmark: false, mx: 40, my: 35,
      lat: 36.81070, lng: 127.14890,
      image: IMG_NOODLE, description: "따뜻한 칼국수와 만두.",
      menus: menus("b3", [
        ["해물칼국수", 10000], ["김치칼국수", 9000], ["콩국수", 8500],
        ["비빔국수", 8000], ["손수제비", 8000],
      ]),
    },
    {
      id: 4, name: "역전정육점", category: "정육·계란",
      location: "천안시 동남구 문화동 12, 역전시장 정육골목 2호", hours: HOURS, phone: "041-566-1201",
      rating: 4.4, bookmark: false, mx: 46, my: 38,
      lat: 36.81058, lng: 127.14910,
      image: IMG_MEAT, description: "삼겹·목살 당일 손질.",
      menus: menus("b4", [
        ["한돈 목살 500g", 11000], ["돼지불고기용 500g", 9000],
        ["갈비살 500g", 14000], ["양념왕갈비 1kg", 18000], ["계란 30구", 7200],
      ]),
    },
    {
      id: 5, name: "송현농원", category: "채소·과일",
      location: "천안시 동남구 문화동 15, 역전시장 청과동 1호", hours: HOURS, phone: "041-566-1301",
      rating: 4.7, badge: "신선", bookmark: true, mx: 50, my: 29,
      lat: 36.81076, lng: 127.14914,
      image: IMG_VEG, description: "농원 직송 채소·과일.",
      menus: menus("b5", [
        ["사과", 9200], ["대파", 3800], ["시금치 1단", 2000], ["당근 1봉", 3000],
        ["감자 1kg", 3500], ["무 1개", 2000], ["양배추 1포기", 3500], ["오이 3개", 2500],
      ]),
    },
    {
      id: 6, name: "역전수산", category: "수산물",
      location: "천안시 동남구 대흥로 78, 역전시장 수산동 4호", hours: HOURS, phone: "041-566-1401",
      rating: 4.3, bookmark: false, mx: 70, my: 45,
      lat: 36.81050, lng: 127.14935,
      image: IMG_SEAFOOD, description: "고등어·오징어·조개.",
      menus: menus("b6", [
        ["손질 오징어 2마리", 8500], ["흰다리새우 500g", 10500], ["바지락 500g", 5000],
        ["꼬막 1kg", 14000], ["굴 500g", 9000], ["동태 1마리", 7000], ["코다리 2마리", 8000],
      ]),
    },
    {
      id: 7, name: "역전반찬집", category: "반찬·건어물",
      location: "천안시 동남구 문화동 18, 역전시장 3통로 6호", hours: HOURS, phone: "041-566-1501",
      rating: 4.5, bookmark: false, mx: 48, my: 58,
      lat: 36.81020, lng: 127.14900,
      image: IMG_BANCHAN, description: "밑반찬·젓갈·건어물.",
      menus: menus("b7", [
        ["깍두기 1kg", 7000], ["오징어젓 200g", 6000], ["명란젓 150g", 9000],
        ["창란젓 150g", 8000], ["무생채 300g", 3500], ["콩나물무침 300g", 3000],
      ]),
    },
    {
      id: 8, name: "푸줏간골목", category: "정육·계란",
      location: "천안시 동남구 대흥로 68, 역전시장 정육골목 6호", hours: HOURS, phone: "041-566-1601",
      rating: 4.1, bookmark: false, mx: 48, my: 30,
      lat: 36.81075, lng: 127.14912,
      image: IMG_MEAT, description: "시장 골목 한돈 정육.",
      menus: menus("b8", [
        ["삼겹살", 14800], ["한돈 목살 500g", 12000], ["다짐육 500g", 7000],
        ["계란 30구", 7500], ["특란 15구", 4500], ["돼지불고기용 500g", 9000],
      ]),
    },
    {
      id: 9, name: "역전김밥천국", category: "먹거리·분식",
      location: "천안시 동남구 대흥로 66, 역전시장 정문 1호", hours: HOURS, phone: "041-566-1104",
      rating: 4.6, badge: "포장", bookmark: true, mx: 15, my: 20,
      lat: 36.81100, lng: 127.14850,
      image: IMG_FOOD, description: "빠른 김밥·라면.",
      menus: menus("b9", [
        ["야채김밥", 3000], ["참치김밥", 3500], ["돈까스김밥", 4500], ["계란말이김밥", 4000],
        ["불고기김밥", 4500], ["라면", 4000], ["치즈라면", 4500], ["떡라면", 5000],
        ["김치볶음밥", 6000], ["오므라이스", 7000],
      ]),
    },
    {
      id: 10, name: "역전떡볶이집", category: "먹거리·분식",
      location: "천안시 동남구 대흥로 76, 역전시장 2통로 9호", hours: HOURS, phone: "041-566-1105",
      rating: 4.4, bookmark: false, mx: 60, my: 32,
      lat: 36.81080, lng: 127.14920,
      image: IMG_SNACK, description: "떡볶이·순대·튀김.",
      menus: menus("b10", [
        ["국물떡볶이 1인분", 4000], ["로제떡볶이", 5500], ["짜장떡볶이", 5000],
        ["치즈떡볶이", 5500], ["떡볶이+순대 세트", 7500], ["떡사리 추가", 1500],
        ["어묵사리 추가", 1500], ["튀김 모듬 3개", 4000], ["쿨피스", 1500],
      ]),
    },
    {
      id: 11, name: "과일나라", category: "채소·과일",
      location: "천안시 동남구 문화동 16, 역전시장 청과동 5호", hours: HOURS, phone: "041-566-1302",
      rating: 4.5, bookmark: false, mx: 36, my: 88,
      lat: 36.80928, lng: 127.14862,
      image: IMG_FRUIT, description: "제철 과일·대파 소분.",
      menus: menus("b11", [
        ["사과", 6200], ["대파", 1600], ["바나나 1송이", 3500], ["귤 1kg", 6500],
        ["키위 5개", 5000], ["감 5개", 7000], ["파인애플 1개", 6000],
      ]),
    },
    {
      id: 12, name: "한돈축산", category: "정육·계란",
      location: "천안시 동남구 문화동 13, 역전시장 남쪽 정육 8호", hours: HOURS, phone: "041-566-1202",
      rating: 4.3, bookmark: false, mx: 30, my: 86,
      lat: 36.80932, lng: 127.14858,
      image: IMG_MEAT, description: "한돈 특가·계란.",
      menus: menus("b12", [
        ["삼겹살", 10500], ["특란 30구", 8000], ["유정란 10구", 6000],
        ["왕란 15구", 5500], ["메추리알 1팩", 3500], ["구운란 10구", 5000],
      ]),
    },
    {
      id: 13, name: "역전건어물", category: "반찬·건어물",
      location: "천안시 동남구 문화동 20, 역전시장 3통로 12호", hours: HOURS, phone: "041-566-1502",
      rating: 4.2, bookmark: false, mx: 65, my: 55,
      lat: 36.81030, lng: 127.14925,
      image: IMG_BANCHAN, description: "쥐포·오징어채·김.",
      menus: menus("b13", [
        ["마른김 20장", 4000], ["파래김 10장", 4500], ["오징어채 150g", 5500],
        ["한치채 100g", 6000], ["쥐포 5장", 3000], ["새우젓 500g", 7000],
        ["꼴뚜기젓 200g", 6500], ["조개젓 200g", 7000],
      ]),
    },
    {
      id: 14, name: "햇과일가게", category: "채소·과일",
      location: "천안시 동남구 대흥로 75, 역전시장 중앙통로 7호", hours: HOURS, phone: "041-566-1602",
      rating: 4.4, bookmark: false, mx: 42, my: 62,
      lat: 36.80995, lng: 127.14888,
      image: IMG_FRUIT, description: "과일·대파·견과 소분.",
      menus: menus("b14", [
        ["사과", 7800], ["대파", 2500], ["아몬드 200g", 5000], ["호두 150g", 6000],
        ["캐슈넛 200g", 5500], ["혼합견과 200g", 5500], ["해바라기씨 200g", 3500],
      ]),
    },
    {
      id: 15, name: "역전회센터", category: "수산물",
      location: "천안시 동남구 대흥로 80, 역전시장 수산동 8호", hours: HOURS, phone: "041-566-1402",
      rating: 4.6, badge: "회", bookmark: true, mx: 80, my: 40,
      lat: 36.81055, lng: 127.14955,
      image: IMG_SEAFOOD, description: "모듬회·광어·우럭 포장.",
      menus: menus("b15", [
        ["모듬회 소", 25000], ["모듬회 중", 35000], ["모듬회 대", 50000],
        ["광어회 1인분", 30000], ["우럭회 1인분", 28000], ["연어회 1인분", 25000],
        ["물회 1인분", 14000], ["초밥 10입", 15000], ["매운탕 세트", 15000], ["간장게장 소", 22000],
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
      menus: menus("s1", [
        ["성환멸치칼국수", 7000], ["들깨칼국수", 8500], ["콩국수", 8000],
        ["감자수제비", 7500], ["손만두 6개", 5000],
      ]),
    },
    {
      id: 2, name: "성환분식코너", category: "먹거리·분식",
      location: "천안시 서북구 성환읍 성환1로 230, 이화시장 2동 3호", hours: HOURS, phone: "041-588-2102",
      rating: 4.4, bookmark: false, mx: 68, my: 28,
      lat: 36.91957, lng: 127.13106,
      image: IMG_SNACK, description: "떡볶이·순대 간식.",
      menus: menus("s2", [
        ["떡볶이 1인분", 4000], ["순대 1인분", 4000], ["김말이튀김 2개", 3000],
        ["계란말이튀김", 3500], ["쫄면", 5500], ["만두튀김 4개", 4000], ["어묵꼬치 2개", 2000],
      ]),
    },
    {
      id: 3, name: "성환정육점", category: "정육·계란",
      location: "천안시 서북구 성환읍 성환1로 220, 이화시장 1동 20호", hours: HOURS, phone: "041-588-2201",
      rating: 4.5, bookmark: false, mx: 48, my: 48,
      lat: 36.91897, lng: 127.13036,
      image: IMG_MEAT, description: "한우·한돈 정육.",
      menus: menus("s3", [
        ["한우불고기 300g", 18000], ["한우국거리 500g", 22000], ["한돈 삼겹살 500g", 12000],
        ["한돈 목살 500g", 11000], ["계란 30구", 7500], ["돼지불고기용 500g", 9000],
      ]),
    },
    {
      id: 4, name: "성환청과마트", category: "채소·과일",
      location: "천안시 서북구 성환읍 성환1로 235, 이화시장 3동 11호", hours: HOURS, phone: "041-588-2301",
      rating: 4.6, badge: "신선", bookmark: false, mx: 20, my: 62,
      lat: 36.91855, lng: 127.12938,
      image: IMG_VEG, description: "채소·과일 함께 판매.",
      menus: menus("s4", [
        ["배추 1포기", 3500], ["무 1개", 2000], ["양파 3kg", 4500],
        ["대파 1단", 2500], ["성환배 2개", 9000], ["사과 5개", 8000],
      ]),
    },
    {
      id: 5, name: "성환배농원직판", category: "채소·과일",
      location: "천안시 서북구 성환읍 성환1로 240, 이화시장 특산물 코너", hours: HOURS, phone: "041-588-2302",
      rating: 4.9, badge: "특산물", bookmark: true, mx: 75, my: 60,
      lat: 36.91861, lng: 127.13131,
      image: IMG_FRUIT, description: "성환 배 산지직송.",
      menus: menus("s5", [
        ["성환배 선물상자 6개", 25000, 30000, 17], ["성환배 3개", 12000], ["성환배 5개", 18000],
        ["배즙 30팩", 15000], ["배 말랭이 200g", 8000], ["신고배 2개", 10000],
        ["배잼 200g", 7000], ["배칩 100g", 5500],
      ]),
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

/** 상점명 중복 비교용 (공백·대소문자 무시) */
export function normalizeStoreNameKey(name: string | undefined) {
  return (name ?? "").trim().replace(/\s+/g, "").toLowerCase();
}

/** 임시·테스트용 상점명(숫자만, 상점1, 트라이 등)인지 판별 */
export function isPlaceholderStoreName(name: string | undefined) {
  const t = (name ?? "").trim();
  if (!t) return true;
  if (/^\d+$/.test(t)) return true;
  if (/^상점\s*\d+$/i.test(t) || /^가게\s*\d+$/i.test(t)) return true;
  if (/^(새\s*상점|신규\s*상점|미정|없음|테스트|test|try|트라이|asdf|qwer|임시)$/i.test(t)) return true;
  if (/^[ㅁㅇ□■ㆍ·.\-_/]+$/.test(t)) return true;
  // 한 글자만(의미 없는 입력)
  if (t.length === 1) return true;
  return false;
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

/** 상점명의 대표 키워드(메뉴에 최소 1개는 포함되어야 함) */
function primaryStoreKeywords(name: string): string[] {
  const n = name.replace(/\s+/g, "");
  if (/떡볶이/.test(n)) return ["떡볶이"];
  if (/순대국|국밥/.test(n)) return ["국밥", "순대국"];
  if (/호두과자/.test(n)) return ["호두과자"];
  if (/칼국수/.test(n)) return ["칼국수"];
  if (/국수|수제비/.test(n)) return ["국수", "수제비"];
  if (/만두/.test(n)) return ["만두"];
  if (/파전|전집|빈대떡/.test(n)) return ["파전", "전", "빈대떡"];
  if (/어묵/.test(n)) return ["어묵"];
  if (/튀김/.test(n)) return ["튀김"];
  if (/김밥/.test(n)) return ["김밥"];
  if (/족발|보쌈/.test(n)) return ["족발", "보쌈", "수육"];
  if (/치킨|닭강정|닭발/.test(n)) return ["치킨", "닭", "강정", "닭발"];
  if (/빵|베이커|카스테라/.test(n)) return ["빵", "식빵", "케이크", "카스테라"];
  if (/회센터|횟집|회집/.test(n)) return ["회"];
  if (/수산|해물|꽃게|오징어/.test(n)) return ["고등어", "오징어", "새우", "갈치", "바지락", "꽃게"];
  if (/정육|고기|수육|축산|푸줏|한돈/.test(n)) return ["삼겹", "목살", "불고기", "수육", "갈비"];
  if (/계란/.test(n)) return ["계란", "특란", "유정란"];
  if (/과일|배농|사과|딸기|황금과일|농원/.test(n)) return ["사과", "배", "딸기", "귤", "포도", "대파"];
  if (/두부|콩나물/.test(n)) return ["두부", "콩나물"];
  if (/청과|채소|싱싱/.test(n)) return ["대파", "양파", "배추", "시금치", "상추", "사과"];
  if (/반찬|건어|젓갈/.test(n)) return ["김치", "멸치", "젓", "황태", "쥐포"];
  if (/쌀|잡곡|견과|씨앗/.test(n)) return ["쌀", "현미", "잡곡", "아몬드", "들깨", "호두"];
  if (/잡화|생활|세제/.test(n)) return ["장갑", "수세미", "봉투", "세제"];
  if (/분식/.test(n)) return ["떡볶이", "순대", "김밥", "튀김"];
  return [];
}

function menusSeemRelatedToStore(storeName: string, items: MenuItem[]): boolean {
  if (items.length === 0) return false;
  const keys = primaryStoreKeywords(storeName);
  if (keys.length === 0) return true;
  const blob = items.map((m) => m.name).join(" ");
  return keys.some((k) => blob.includes(k));
}

type MenuTuple = [string, number, number?, number?];

function hashName(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) >>> 0;
  return h;
}

/** 상점명 해시로 풀에서 다른 구간·다른 길이를 뽑아 상점마다 메뉴가 덜 겹치게 함 */
function pickFromPool(
  prefix: string,
  name: string,
  pool: MenuTuple[],
  minLen = 5,
  maxLen = 11,
): MenuItem[] {
  if (pool.length === 0) return [];
  const h = hashName(name + prefix);
  const span = Math.max(1, maxLen - minLen + 1);
  const len = Math.min(pool.length, minLen + (h % span));
  const start = h % pool.length;
  const rotated = [...pool.slice(start), ...pool.slice(0, start)];
  return menus(prefix, rotated.slice(0, len));
}

/** 카테고리·상점명 기준으로 데모용 메뉴 생성 (상점마다 구성·가짓수 다름) */
export function menusForStoreName(
  name: string,
  category: CategoryKey,
  prefix = "auto",
): MenuItem[] {
  const n = name.replace(/\s+/g, "");
  const isYeok = /역전|역시장|byeong|병천/.test(n + prefix);

  if (/마늘.*떡볶이|떡볶이.*마늘/.test(n)) {
    return pickFromPool(prefix, name, [
      ["마늘떡볶이 1인분", 4500], ["마늘떡볶이 2인분", 8000], ["치즈마늘떡볶이", 5500],
      ["로제마늘떡볶이", 5500], ["짜장마늘떡볶이", 5000], ["통마늘 추가", 1500],
      ["떡사리 추가", 1500], ["치즈추가", 1500], ["계란추가", 1000], ["김말이튀김 2개", 3000],
    ], 7, 10);
  }
  if (/떡볶이/.test(n)) {
    return pickFromPool(prefix, name, isYeok
      ? [
          ["국물떡볶이 1인분", 4000], ["로제떡볶이", 5500], ["짜장떡볶이", 5000],
          ["치즈떡볶이", 5500], ["떡볶이+순대 세트", 7500], ["떡사리 추가", 1500],
          ["어묵사리 추가", 1500], ["튀김 모듬 3개", 4000], ["쿨피스", 1500], ["라볶이", 5500],
        ]
      : [
          ["떡볶이 1인분", 4000], ["떡볶이 2인분", 7000], ["치즈떡볶이", 5000], ["라볶이", 5500],
          ["순대 1인분", 4000], ["김말이튀김 2개", 3000], ["계란추가", 1000],
          ["오징어링 튀김", 3500], ["핫바 1개", 2500],
        ], 6, 10);
  }
  if (/분식/.test(n)) {
    return pickFromPool(prefix, name, [
      ["떡볶이 1인분", 4000], ["순대 1인분", 4000], ["쫄면", 5500], ["김말이튀김 2개", 3000],
      ["계란말이튀김", 3500], ["만두튀김 4개", 4000], ["어묵꼬치 2개", 2000], ["라면", 4000],
    ], 5, 8);
  }
  if (/순대국|국밥/.test(n)) {
    return pickFromPool(prefix, name, isYeok
      ? [
          ["역전순대국 보통", 8500], ["역전순대국 특", 10500], ["순댓국+순대추가", 11000],
          ["순대곱창볶음", 13000], ["돼지국밥", 9000], ["공깃밥", 1000], ["내장추가", 3000],
        ]
      : [
          ["사골순대국밥", 9500], ["얼큰내장국밥", 10500], ["순대국밥 특", 11500],
          ["순대만 한접시", 8000], ["머릿고기 한접시", 14000], ["수육무침 소", 10000],
          ["순대볶음 소", 9000], ["부추무침", 3000], ["술국(소주안주)", 12000],
        ], 5, 9);
  }
  if (/호두과자/.test(n)) {
    return pickFromPool(prefix, name, [
      ["호두과자 10개입", 4000], ["호두과자 20개입", 7000], ["미니 호두과자 15개입", 6000],
      ["밤 호두과자 10개입", 5000], ["흑임자 호두과자 10개입", 4500], ["호두과자 선물상자 30개", 12000],
      ["갓구운 호두과자", 4500], ["식혜 한 잔", 2500],
    ], 5, 8);
  }
  if (/칼국수|국수|수제비/.test(n)) {
    return pickFromPool(prefix, name, isYeok
      ? [
          ["해물칼국수", 10000], ["김치칼국수", 9000], ["콩국수", 8500],
          ["비빔국수", 8000], ["손수제비", 8000], ["잔치국수", 7500], ["들깨칼국수", 9500],
        ]
      : [
          ["멸치칼국수", 8000], ["바지락칼국수", 11000], ["들깨칼국수", 9500],
          ["김치수제비", 8500], ["손만두 8개", 6000], ["만두칼국수", 10000],
          ["메밀전병 2장", 5000], ["열무비빔국수", 8500],
        ], 5, 8);
  }
  if (/만두/.test(n)) {
    return pickFromPool(prefix, name, [
      ["김치만두 10개", 6000], ["고기만두 10개", 6500], ["왕만두 5개", 5500], ["김치왕만두 5개", 6000],
      ["군만두 10개", 7000], ["찐만두 10개", 6000], ["새우만두 8개", 7500],
      ["만두국 1인분", 8000], ["고추만두 8개", 7000], ["만두피 20장", 3500], ["냉동만두 20개입", 9000],
    ], 7, 11);
  }
  if (/파전|전집|빈대떡/.test(n)) {
    return pickFromPool(prefix, name, [
      ["해물파전 1장", 10000], ["김치전 1장", 8000], ["부추전 1장", 7500],
      ["녹두빈대떡", 8500], ["막걸리 750ml", 4000], ["파전 반반", 9000],
      ["감자전 1장", 7000], ["동동주 750ml", 4500],
    ], 5, 8);
  }
  if (/어묵/.test(n)) {
    return pickFromPool(prefix, name, isYeok
      ? [
          ["모듬튀김 소", 5000], ["모듬튀김 대", 9000], ["고추튀김 2개", 2500],
          ["야채튀김", 3000], ["오징어튀김", 4000], ["어묵바 1개", 2000],
          ["닭꼬치 2개", 4500], ["치즈핫도그", 3000], ["감자튀김", 3500],
        ]
      : [
          ["어묵꼬치 3개", 3000], ["어묵꼬치 5개", 4500], ["어묵국물 리필", 1000],
          ["번데기 1컵", 2000], ["떡꼬치 2개", 2500], ["어묵탕 1인분", 5000], ["유부주머니 2개", 3000],
        ], 6, 10);
  }
  if (/튀김/.test(n)) {
    return pickFromPool(prefix, name, [
      ["모듬튀김 소", 5000], ["김말이튀김 2개", 3000], ["오징어튀김", 4000],
      ["고구마튀김 3개", 3000], ["야채튀김", 3000], ["고추튀김 2개", 2500],
      ["닭꼬치 2개", 4000], ["감자튀김", 3500],
    ], 5, 8);
  }
  if (/김밥/.test(n)) {
    return pickFromPool(prefix, name, isYeok
      ? [
          ["야채김밥", 3000], ["참치김밥", 3500], ["돈까스김밥", 4500], ["계란말이김밥", 4000],
          ["불고기김밥", 4500], ["라면", 4000], ["치즈라면", 4500], ["떡라면", 5000],
          ["김치볶음밥", 6000], ["오므라이스", 7000],
        ]
      : [
          ["참치김밥", 3500], ["치즈김밥", 4000], ["야채김밥", 3000], ["소고기김밥", 4500],
          ["날치알김밥", 4500], ["김치김밥", 3500], ["삼각김밥 참치", 2000],
          ["잔치국수", 5000], ["라면", 4000], ["우동 1인분", 5000], ["유부초밥 4개", 4000],
        ], 7, 12);
  }
  if (/족발|보쌈/.test(n)) {
    return pickFromPool(prefix, name, [
      ["족발 앞다리", 28000], ["족발 중", 35000], ["보쌈 소", 25000], ["보쌈 중", 32000],
      ["막국수", 8000], ["쌈무·새우젓", 3000], ["편육 200g", 12000], ["김치 추가", 3000],
    ], 5, 8);
  }
  if (/치킨|닭강정/.test(n)) {
    return pickFromPool(prefix, name, [
      ["후라이드치킨", 16000], ["양념치킨", 17000], ["반반치킨", 17000], ["닭강정 소", 10000],
      ["닭강정 중", 15000], ["순살치킨", 18000], ["치킨무", 1000], ["콜라 1.25L", 2000],
    ], 5, 8);
  }
  if (/닭발/.test(n)) {
    return pickFromPool(prefix, name, [
      ["무뼈닭발", 14000], ["뼈닭발", 13000], ["직화닭발", 15000], ["닭발+볶음밥", 17000],
      ["계란찜", 3000], ["주먹밥", 2000], ["팽이버섯추가", 2000],
    ], 5, 7);
  }
  if (/빵|베이커|카스테라/.test(n)) {
    return pickFromPool(prefix, name, [
      ["식빵 1근", 3500], ["단팥빵", 2000], ["소보로빵", 2000], ["크림빵", 2500],
      ["카스테라", 4000], ["고로케", 2500], ["도너츠 3개", 3000], ["모닝빵 5개", 3500],
    ], 5, 8);
  }
  if (/회센터|횟집|회집/.test(n)) {
    return pickFromPool(prefix, name, [
      ["모듬회 소", 25000], ["모듬회 중", 35000], ["모듬회 대", 50000],
      ["광어회 1인분", 30000], ["우럭회 1인분", 28000], ["연어회 1인분", 25000],
      ["물회 1인분", 14000], ["초밥 10입", 15000], ["매운탕 세트", 15000], ["간장게장 소", 22000],
    ], 6, 10);
  }
  if (/수산|해물|꽃게|오징어/.test(n) || category === "수산물") {
    return pickFromPool(prefix, name, isYeok
      ? [
          ["손질 오징어 2마리", 8500], ["흰다리새우 500g", 10500], ["바지락 500g", 5000],
          ["꼬막 1kg", 14000], ["굴 500g", 9000], ["동태 1마리", 7000], ["코다리 2마리", 8000],
        ]
      : [
          ["손질 고등어 구이용 2마리", 8000], ["갈치 중 1마리", 12500], ["조기 2마리", 9500],
          ["임연수 2마리", 8500], ["전어 1접시", 11000], ["바지락 1kg", 8000],
          ["꽃게 2마리", 15000], ["낙지 2마리", 14000], ["전복 3미", 18000],
        ], 5, 9);
  }
  if (/계란/.test(n)) {
    return pickFromPool(prefix, name, [
      ["특란 30구", 8000], ["유정란 10구", 6000], ["왕란 15구", 5500],
      ["메추리알 1팩", 3500], ["구운란 10구", 5000], ["계란 15구", 4000],
    ], 4, 6);
  }
  if (/정육|고기|수육|축산|푸줏|한돈/.test(n) || category === "정육·계란") {
    return pickFromPool(prefix, name, isYeok
      ? [
          ["삼겹살", 13500], ["한돈 목살 500g", 11000], ["한돈 앞다리살 500g", 8000],
          ["돼지불고기용 500g", 9000], ["갈비살 500g", 14000], ["양념왕갈비 1kg", 18000],
          ["우삼겹 300g", 15000], ["계란 30구", 7200],
        ]
      : [
          ["한돈 삼겹살 600g", 13500], ["한돈 항정살 300g", 12000], ["한돈 가브리살 300g", 11000],
          ["보쌈용 수육 500g", 14000], ["족발용 앞다리 1kg", 16000], ["다짐육 500g", 6500],
          ["닭볶음탕용 1kg", 9000], ["특란 30구", 8200],
        ], 5, 8);
  }
  if (/과일|배농|사과|딸기|황금과일|농원|햇과일/.test(n)) {
    return pickFromPool(prefix, name, isYeok
      ? [
          ["사과", 7800], ["대파", 2500], ["바나나 1송이", 3500], ["귤 1kg", 6500],
          ["키위 5개", 5000], ["감 5개", 7000], ["파인애플 1개", 6000],
        ]
      : [
          ["사과", 8000], ["천안배 3개", 13000], ["딸기 1팩", 6000],
          ["샤인머스캣 1송이", 18000], ["한라봉 5개", 10000], ["블루베리 1팩", 7000],
          ["체리 200g", 8500], ["망고 2개", 9000],
        ], 5, 8);
  }
  if (/두부|콩나물/.test(n)) {
    return pickFromPool(prefix, name, [
      ["손두부 1모", 2800], ["순두부 1팩", 3000], ["연두부 2팩", 3500],
      ["콩나물 500g", 2000], ["콩비지 1팩", 2800], ["유부 10장", 3500], ["숙주나물 300g", 2500],
    ], 5, 7);
  }
  if (/청과|채소|싱싱/.test(n) || category === "채소·과일") {
    return pickFromPool(prefix, name, isYeok
      ? [
          ["시금치 1단", 2000], ["당근 1봉", 3000], ["감자 1kg", 3500],
          ["고구마 1kg", 4000], ["무 1개", 2000], ["양배추 1포기", 3500],
          ["오이 3개", 2500], ["버섯모듬 1팩", 4500],
        ]
      : [
          ["대파 1단", 2500], ["양파 3kg", 4500], ["얼갈이배추 1단", 3500],
          ["풋고추 1봉", 2500], ["브로콜리 1개", 3500], ["방울토마토 1팩", 4000],
          ["청경채 1봉", 2800], ["깻잎 1속", 2000], ["애호박 2개", 3000],
        ], 5, 9);
  }
  if (/건어/.test(n)) {
    return pickFromPool(prefix, name, isYeok
      ? [
          ["마른김 20장", 4000], ["파래김 10장", 4500], ["오징어채 150g", 5500],
          ["한치채 100g", 6000], ["쥐포 5장", 3000], ["새우젓 500g", 7000],
          ["꼴뚜기젓 200g", 6500], ["조개젓 200g", 7000],
        ]
      : [
          ["쥐포 10장", 5000], ["황태채 200g", 8000], ["북어포 5장", 6000],
          ["국물멸치 1근", 6500], ["다시마 200g", 4500], ["멸치액젓 500ml", 5000],
          ["황태구이 2마리", 7000], ["코다리 3마리", 9000],
        ], 5, 8);
  }
  if (/반찬|젓갈/.test(n) || category === "반찬·건어물") {
    return pickFromPool(prefix, name, isYeok
      ? [
          ["깍두기 1kg", 7000], ["오징어젓 200g", 6000], ["명란젓 150g", 9000],
          ["창란젓 150g", 8000], ["무생채 300g", 3500], ["콩나물무침 300g", 3000],
        ]
      : [
          ["배추김치 1kg", 8000], ["총각김치 1kg", 7500], ["멸치볶음 200g", 5000],
          ["계란말이 1줄", 4500], ["연근조림 200g", 4500], ["도라지무침 200g", 4000],
          ["잡채 300g", 6500], ["우엉조림 200g", 4200], ["깻잎지 200g", 3800],
        ], 5, 9);
  }
  if (/쌀|잡곡/.test(n)) {
    return pickFromPool(prefix, name, [
      ["백미 5kg", 18000], ["백미 10kg", 32000], ["현미 2kg", 8000], ["찹쌀 2kg", 9000],
      ["흑미 1kg", 5500], ["혼합잡곡 1kg", 5000], ["보리쌀 1kg", 4000],
    ], 5, 7);
  }
  if (/견과|씨앗/.test(n)) {
    return pickFromPool(prefix, name, [
      ["아몬드 200g", 5000], ["호두 150g", 6000], ["캐슈넛 200g", 5500],
      ["피스타치오 150g", 7000], ["마카다미아 100g", 6500], ["혼합견과 200g", 5500],
      ["해바라기씨 200g", 3500], ["호박씨 200g", 4000],
    ], 5, 8);
  }
  if (/잡화|생활|세제/.test(n) || category === "기타·생활") {
    return pickFromPool(prefix, name, isYeok
      ? [
          ["휴지 3겹 30롤", 12000], ["주방세제 1L", 3500], ["세탁세제 1kg", 5500],
          ["면 행주 5장", 4000], ["위생장갑 100매", 2500], ["물티슈 100매", 3000],
          ["일회용 젓가락 50쌍", 2500], ["종이컵 50개", 2000],
        ]
      : [
          ["고무장갑 중형 3켤레", 3000], ["수세미 10개입", 2000], ["시장용 비닐봉투 100매", 3500],
          ["방수 앞치마", 6000], ["지퍼백 중형 50매", 4000], ["주방세제 1L", 3500],
        ], 4, 8);
  }
  if (category === "먹거리·분식") {
    return pickFromPool(prefix, name, [
      ["떡볶이 1인분", 4500], ["순대 1인분", 4000], ["김말이튀김 2개", 3000],
      ["야채김밥", 3000], ["라면", 4000], ["쫄면", 5500], ["핫바 1개", 2500],
    ], 5, 7);
  }
  return pickFromPool(prefix, name, [
    ["고무장갑 중형 3켤레", 3000], ["수세미 10개입", 2000],
    ["시장용 비닐봉투 100매", 3500], ["면 행주 5장", 4000], ["주방세제 1L", 3500],
  ], 4, 5);
}

/**
 * 메뉴가 비었거나 상점명과 안 맞으면 이름 기준으로 채운다.
 * 이름과 맞고 메뉴가 있으면(가짓수 달라도) 시드/초안을 유지한다.
 */
export function ensureStoreMenus(
  name: string,
  category: CategoryKey,
  items: MenuItem[] | undefined,
  prefix = "auto",
): MenuItem[] {
  const cleaned = (items ?? []).filter((m) => m?.name?.trim() && Number(m.price) > 0);
  const generated = menusForStoreName(name, category, prefix);
  const hasHint = primaryStoreKeywords(name).length > 0;
  const related = cleaned.length >= 3 && menusSeemRelatedToStore(name, cleaned);

  if (!hasHint && cleaned.length >= 3) return cleaned;
  // 이름과 맞으면 가짓수와 상관없이 유지 (상점마다 메뉴 수 다양)
  if (related) return cleaned;
  return generated;
}
