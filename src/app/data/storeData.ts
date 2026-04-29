import type { MarketId } from "../components/CartContext";

export type CategoryKey =
  | "전체" | "먹거리·분식" | "정육·계란" | "채소" | "과일"
  | "채소·과일" | "수산물" | "반찬·건어물" | "기타·생활";

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
}

// Shared image URLs
const IMG_FOOD    = "https://images.unsplash.com/photo-1769558688746-7ac36d8ce999?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBzaWRlJTIwZGlzaGVzJTIwYmFuY2hhbnxlbnwxfHx8fDE3NzQ4MDI1NTF8MA&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_SNACK   = "https://images.unsplash.com/photo-1760020890915-ca605575b93b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjB0dGVva2Jva2tpJTIwZnJpZWQlMjBmb29kJTIwc25hY2slMjBiYXJ8ZW58MXx8fHwxNzc0ODI3MzYyfDA&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_NOODLE  = "https://images.unsplash.com/photo-1747228469031-c5fc60b9d9f9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBmcmllZCUyMGZvb2QlMjB0ZW1wdXJhfGVufDF8fHx8MTc3NDgyNTg2Mnww&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_MEAT    = "https://images.unsplash.com/photo-1758788701706-327f3a0d6820?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBmcmVzaCUyMG1lYXQlMjBidXRjaGVyJTIwbWFya2V0fGVufDF8fHx8MTc3NDgyNzM1OHww&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_VEG     = "https://images.unsplash.com/photo-1759663783570-520674af30d6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBtYXJrZXQlMjBmcmVzaCUyMHZlZ2V0YWJsZXMlMjBwcm9kdWNlfGVufDF8fHx8MTc3NDgyNzM1OHww&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_FRUIT   = "https://images.unsplash.com/photo-1770954265112-be9b0ebed8e8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVzaCUyMGZydWl0JTIwYXBwbGUlMjBwZWFyJTIwbWFya2V0JTIwZGlzcGxheXxlbnwxfHx8fDE3NzQ4MjczNjZ8MA&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_SEAFOOD = "https://images.unsplash.com/photo-1772462850582-802d575852b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBtYXJrZXQlMjBmcmVzaCUyMHNlYWZvb2QlMjBmaXNofGVufDF8fHx8MTc3NDgyNzM1OXww&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_BANCHAN = "https://images.unsplash.com/photo-1628532430664-ef7e7b7b941f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBzaWRlJTIwZGlzaGVzJTIwYmFuY2hhbiUyMG1hcmtldHxlbnwxfHx8fDE3NzQ4MjczNTl8MA&ixlib=rb-4.1.0&q=80&w=1080";
const IMG_LIVING  = "https://images.unsplash.com/photo-1594021113115-f1b48e63ef06?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGVvbmFuJTIwa29yZWElMjB0cmFkaXRpb25hbCUyMG1hcmtldCUyMHN0cmVldHxlbnwxfHx8fDE3NzQ4MjY3MzV8MA&ixlib=rb-4.1.0&q=80&w=1080";

export const STORES_BY_MARKET: Record<MarketId, StoreData[]> = {
  jungang: [
    /* ── 기존 9곳 ── */
    {
      id: 1, name: "천안순대국밥", category: "먹거리·분식",
      location: "중앙시장 1동 12호", hours: "07:00 - 20:00", phone: "041-555-1234",
      rating: 4.8, badge: "인기", bookmark: true, mx: 22, my: 30,
lat: 36.80770, lng: 127.15082,
      image: IMG_FOOD,
      description: "천안 대표 순대국밥 맛집. 진한 국물과 푸짐한 양이 인기!",
      menus: [
        { id: "j1-1", name: "순대국밥", price: 9000 },
        { id: "j1-2", name: "얼큰순대국", price: 10000 },
        { id: "j1-3", name: "모듬순대", price: 15000, originalPrice: 18000, discount: 17 },
      ],
    },
    {
      id: 2, name: "호두과자 본점", category: "먹거리·분식",
      location: "중앙시장 2동 5호", hours: "09:00 - 21:00", phone: "041-555-2345",
      rating: 4.9, badge: "마감할인", bookmark: false, mx: 55, my: 20,
lat: 36.80800, lng: 127.15197,
      image: IMG_SNACK,
      description: "천안 명물 호두과자! 갓 구운 바삭한 호두과자를 맛보세요.",
      menus: [
        { id: "j2-1", name: "호두과자 1봉 (15개)", price: 4000 },
        { id: "j2-2", name: "호두과자 2봉 세트", price: 7000, originalPrice: 8000, discount: 13 },
        { id: "j2-3", name: "미니 호두과자 (30개)", price: 6000 },
      ],
    },
    {
      id: 3, name: "중앙칼국수", category: "먹거리·분식",
      location: "중앙시장 3동 8호", hours: "10:00 - 19:00", phone: "041-555-3456",
      rating: 4.6, bookmark: false, mx: 75, my: 55,
lat: 36.80695, lng: 127.15267,
      image: IMG_NOODLE,
      description: "수제면으로 만든 진한 멸치 육수 칼국수가 일품!",
      menus: [
        { id: "j3-1", name: "칼국수", price: 8000 },
        { id: "j3-2", name: "수제비", price: 8000 },
        { id: "j3-3", name: "만두 (8개)", price: 6000 },
      ],
    },
    {
      id: 4, name: "신선정육점", category: "정육·계란",
      location: "중앙시장 1동 34호", hours: "07:00 - 18:00", phone: "041-555-4567",
      rating: 4.5, bookmark: false, mx: 38, my: 60,
lat: 36.80680, lng: 127.15138,
      image: IMG_MEAT,
      description: "당일 도축 신선한 한우·돼지고기 전문점",
      menus: [
        { id: "j4-1", name: "한우 등심 200g", price: 25000 },
        { id: "j4-2", name: "돼지 삼겹살 500g", price: 12000 },
        { id: "j4-3", name: "계란 30구", price: 7500, originalPrice: 9000, discount: 17 },
      ],
    },
    {
      id: 5, name: "싱싱채소마트", category: "채소",
      location: "중앙시장 4동 2호", hours: "06:00 - 17:00", phone: "041-555-5678",
      rating: 4.3, badge: "마감할인", bookmark: true, mx: 62, my: 75,
lat: 36.80635, lng: 127.15222,
      image: IMG_VEG,
      description: "산지직송 신선 채소 전문. 매일 새벽 입고!",
      menus: [
        { id: "j5-1", name: "대파 1단", price: 2500 },
        { id: "j5-2", name: "양파 3kg", price: 4500, originalPrice: 6000, discount: 25 },
        { id: "j5-3", name: "감자 2kg", price: 5000 },
      ],
    },
    {
      id: 6, name: "천안과일나라", category: "과일",
      location: "중앙시장 2동 18호", hours: "07:00 - 19:00", phone: "041-555-6789",
      rating: 4.7, bookmark: false, mx: 15, my: 70,
lat: 36.80650, lng: 127.15057,
      image: IMG_FRUIT,
      description: "제철 과일 산지직송! 사과, 배, 딸기 전문",
      menus: [
        { id: "j6-1", name: "사과 5개", price: 8000 },
        { id: "j6-2", name: "배 3개", price: 12000 },
        { id: "j6-3", name: "딸기 1팩", price: 6000, originalPrice: 8000, discount: 25 },
      ],
    },
    {
      id: 7, name: "중앙수산", category: "수산물",
      location: "중앙시장 5동 7호", hours: "06:00 - 18:00", phone: "041-555-7890",
      rating: 4.4, bookmark: false, mx: 85, my: 35,
lat: 36.80755, lng: 127.15302,
      image: IMG_SEAFOOD,
      description: "서해안 직송 싱싱한 해산물 전문점",
      menus: [
        { id: "j7-1", name: "고등어 2마리", price: 7000 },
        { id: "j7-2", name: "갈치 1마리", price: 12000 },
        { id: "j7-3", name: "새우 500g", price: 10000 },
      ],
    },
    {
      id: 8, name: "시장반찬가게", category: "반찬·건어물",
      location: "중앙시장 3동 22호", hours: "08:00 - 19:00", phone: "041-555-8901",
      rating: 4.6, badge: "인기", bookmark: true, mx: 48, my: 42,
lat: 36.80734, lng: 127.15173,
      image: IMG_BANCHAN,
      description: "엄마 손맛 그대로! 매일 만드는 정성 반찬",
      menus: [
        { id: "j8-1", name: "반찬 3종 세트", price: 12000 },
        { id: "j8-2", name: "김치 1kg", price: 8000 },
        { id: "j8-3", name: "멸치볶음 200g", price: 5000, originalPrice: 6500, discount: 23 },
      ],
    },
    {
      id: 9, name: "생활용품코너", category: "기타·생활",
      location: "중앙시장 1동 44호", hours: "09:00 - 20:00", phone: "041-555-9012",
      rating: 4.1, bookmark: false, mx: 30, my: 82,
lat: 36.80614, lng: 127.15110,
      image: IMG_LIVING,
      description: "생활용품·주방용품·잡화 종합 할인매장",
      menus: [
        { id: "j9-1", name: "고무장갑 3켤레", price: 3000 },
        { id: "j9-2", name: "수세미 세트", price: 2000 },
        { id: "j9-3", name: "비닐봉투 (100매)", price: 3500 },
      ],
    },
    /* ── 신규 9곳 ── */
    {
      id: 10, name: "천안만두가게", category: "먹거리·분식",
      location: "중앙시장 2동 7호", hours: "09:00 - 20:00", phone: "041-555-0101",
      rating: 4.7, badge: "인기", bookmark: false, mx: 42, my: 12,
lat: 36.80824, lng: 127.15152,
      image: IMG_SNACK,
      description: "직접 빚는 수제 만두 전문점. 김치·고기·새우만두 모두 인기!",
      menus: [
        { id: "j10-1", name: "김치만두 (10개)", price: 6000 },
        { id: "j10-2", name: "고기만두 (10개)", price: 6500, originalPrice: 8000, discount: 19 },
        { id: "j10-3", name: "왕만두 (5개)", price: 5500 },
      ],
    },
    {
      id: 11, name: "해물파전집", category: "먹거리·분식",
      location: "중앙시장 4동 11호", hours: "10:00 - 19:00", phone: "041-555-0202",
      rating: 4.5, bookmark: false, mx: 68, my: 28,
lat: 36.80776, lng: 127.15243,
      image: IMG_NOODLE,
      description: "신선한 해산물이 가득 들어간 바삭한 해물파전 전문",
      menus: [
        { id: "j11-1", name: "해물파전 (1판)", price: 10000 },
        { id: "j11-2", name: "김치전 (1판)", price: 8000 },
        { id: "j11-3", name: "막걸리 (1병)", price: 4000, originalPrice: 5000, discount: 20 },
      ],
    },
    {
      id: 12, name: "번데기·어묵코너", category: "먹거리·분식",
      location: "중앙시장 1동 3호", hours: "08:00 - 18:00", phone: "041-555-0303",
      rating: 4.2, badge: "마감할인", bookmark: false, mx: 12, my: 18,
lat: 36.80806, lng: 127.15047,
      image: IMG_SNACK,
      description: "추억의 번데기와 따뜻한 어묵탕. 시장 입구 명물!",
      menus: [
        { id: "j12-1", name: "번데기 (1컵)", price: 2000 },
        { id: "j12-2", name: "어묵꼬치 (3개)", price: 3000, originalPrice: 4000, discount: 25 },
        { id: "j12-3", name: "어묵탕 (1인분)", price: 5000 },
      ],
    },
    {
      id: 13, name: "두부·콩나물마트", category: "채소",
      location: "중앙시장 2동 22호", hours: "06:00 - 15:00", phone: "041-555-0404",
      rating: 4.6, badge: "신선", bookmark: false, mx: 35, my: 25,
lat: 36.80785, lng: 127.15127,
      image: IMG_VEG,
      description: "매일 아침 만드는 신선한 두부와 콩나물 전문",
      menus: [
        { id: "j13-1", name: "두부 1모", price: 2500 },
        { id: "j13-2", name: "콩나물 500g", price: 2000, originalPrice: 2500, discount: 20 },
        { id: "j13-3", name: "순두부 1팩", price: 3000 },
      ],
    },
    {
      id: 14, name: "황금채소마트", category: "채소",
      location: "중앙시장 5동 1호", hours: "06:00 - 17:00", phone: "041-555-0505",
      rating: 4.4, bookmark: false, mx: 78, my: 78,
lat: 36.80626, lng: 127.15278,
      image: IMG_VEG,
      description: "산지 직송 신선 채소. 가격 착한 채소 전문점",
      menus: [
        { id: "j14-1", name: "시금치 1단", price: 2000, originalPrice: 2500, discount: 20 },
        { id: "j14-2", name: "고구마 2kg", price: 6000 },
        { id: "j14-3", name: "브로콜리 1개", price: 3000 },
      ],
    },
    {
      id: 15, name: "남해수산", category: "수산물",
      location: "중앙시장 5동 14호", hours: "05:30 - 17:00", phone: "041-555-0606",
      rating: 4.5, badge: "마감할인", bookmark: false, mx: 90, my: 65,
lat: 36.80665, lng: 127.15320,
      image: IMG_SEAFOOD,
      description: "제주·남해 싱싱 해산물 직송. 조개류·갑각류 전문",
      menus: [
        { id: "j15-1", name: "바지락 1kg", price: 8000, originalPrice: 10000, discount: 20 },
        { id: "j15-2", name: "꽃게 2마리", price: 15000 },
        { id: "j15-3", name: "오징어 3마리", price: 9000 },
      ],
    },
    {
      id: 16, name: "통큰건어물", category: "반찬·건어물",
      location: "중앙시장 4동 30호", hours: "08:00 - 18:00", phone: "041-555-0707",
      rating: 4.3, bookmark: false, mx: 70, my: 88,
lat: 36.80596, lng: 127.15250,
      image: IMG_BANCHAN,
      description: "각종 건어물·젓갈 전문점. 저렴하고 품질 좋은 건어물",
      menus: [
        { id: "j16-1", name: "쥐포 (10장)", price: 5000 },
        { id: "j16-2", name: "황태채 200g", price: 8000, originalPrice: 10000, discount: 20 },
        { id: "j16-3", name: "새우젓 500g", price: 7000 },
      ],
    },
    {
      id: 17, name: "천안쌀·잡곡", category: "기타·생활",
      location: "중앙시장 3동 5호", hours: "08:00 - 18:00", phone: "041-555-0808",
      rating: 4.5, bookmark: false, mx: 55, my: 48,
lat: 36.80716, lng: 127.15197,
      image: IMG_LIVING,
      description: "천안 지역 농가 직거래 쌀·잡곡 전문. 건강한 먹거리",
      menus: [
        { id: "j17-1", name: "쌀 5kg", price: 18000 },
        { id: "j17-2", name: "현미 2kg", price: 8000, originalPrice: 9000, discount: 11 },
        { id: "j17-3", name: "잡곡 1kg", price: 5000 },
      ],
    },
    {
      id: 18, name: "중앙정육센터", category: "정육·계란",
      location: "중앙시장 3동 15호", hours: "06:30 - 17:30", phone: "041-555-0909",
      rating: 4.4, bookmark: false, mx: 25, my: 58,
lat: 36.80686, lng: 127.15093,
      image: IMG_MEAT,
      description: "한돈 직거래 정육. 목살·삼겹살 당일 신선 공급",
      menus: [
        { id: "j18-1", name: "목살 500g", price: 9500, originalPrice: 12000, discount: 21 },
        { id: "j18-2", name: "앞다리살 500g", price: 8000 },
        { id: "j18-3", name: "보쌈용 수육 300g", price: 11000 },
      ],
    },
  ],

  byeongcheon: [
    {
      id: 1, name: "병천순대본가", category: "먹거리·분식",
      location: "병천장터 A구역 3호", hours: "장날 08:00 - 17:00", phone: "041-566-1111",
      rating: 4.9, badge: "대표맛집", bookmark: true, mx: 28, my: 25,
      lat: 36.81055, lng: 127.14625,
      image: IMG_FOOD,
      description: "병천 순대의 원조! 전통 방식 그대로",
      menus: [
        { id: "b1-1", name: "순대국밥", price: 9000 },
        { id: "b1-2", name: "머리고기", price: 15000 },
      ],
    },
    {
      id: 2, name: "어묵·튀김코너", category: "먹거리·분식",
      location: "병천장터 B구역 5호", hours: "장날 09:00 - 16:00", phone: "041-566-2222",
      rating: 4.5, badge: "마감할인", bookmark: false, mx: 65, my: 20,
      lat: 36.81072, lng: 127.14746,
      image: IMG_SNACK,
      description: "바삭한 어묵과 튀김 간식",
      menus: [
        { id: "b2-1", name: "모듬튀김", price: 5000 },
        { id: "b2-2", name: "어묵 3개", price: 3000, originalPrice: 4000, discount: 25 },
      ],
    },
    {
      id: 3, name: "장날정육점", category: "정육·계란",
      location: "병천장터 A구역 8호", hours: "장날 07:00 - 16:00", phone: "041-566-3333",
      rating: 4.4, bookmark: false, mx: 45, my: 50,
      lat: 36.81019, lng: 127.14681,
      image: IMG_MEAT,
      description: "장날 특가 정육",
      menus: [
        { id: "b3-1", name: "삼겹살 500g", price: 11000 },
      ],
    },
    {
      id: 4, name: "오일장 채소·과일", category: "채소·과일",
      location: "병천장터 C구역 1호", hours: "장날 06:00 - 15:00", phone: "041-566-4444",
      rating: 4.7, badge: "신선", bookmark: true, mx: 20, my: 65,
      lat: 36.80964, lng: 127.14614,
      image: IMG_VEG,
      description: "농가 직거래 신선 채소과일",
      menus: [
        { id: "b4-1", name: "시금치 1단", price: 2000 },
        { id: "b4-2", name: "당근 1봉", price: 3000 },
      ],
    },
    {
      id: 5, name: "병천수산코너", category: "수산물",
      location: "병천장터 B구역 12호", hours: "장날 06:00 - 15:00", phone: "041-566-5555",
      rating: 4.3, bookmark: false, mx: 72, my: 60,
      lat: 36.80982, lng: 127.14762,
      image: IMG_SEAFOOD,
      description: "싱싱한 생선과 건어물",
      menus: [
        { id: "b5-1", name: "고등어 2마리", price: 6000 },
      ],
    },
  ],

  seonghwan: [
    {
      id: 1, name: "성환칼국수", category: "먹거리·분식",
      location: "성환시장 1동 6호", hours: "09:00 - 19:00", phone: "041-588-1111",
      rating: 4.7, badge: "인기", bookmark: true, mx: 30, my: 22,
lat: 36.91414, lng: 127.13060,
      image: IMG_NOODLE,
      description: "수제 칼국수와 콩국수 맛집",
      menus: [
        { id: "s1-1", name: "칼국수", price: 7000 },
        { id: "s1-2", name: "콩국수", price: 8000 },
      ],
    },
    {
      id: 2, name: "성환분식코너", category: "먹거리·분식",
      location: "성환시장 2동 3호", hours: "10:00 - 18:00", phone: "041-588-2222",
      rating: 4.4, bookmark: false, mx: 68, my: 28,
lat: 36.91396, lng: 127.13193,
      image: IMG_SNACK,
      description: "분식과 간식의 천국",
      menus: [
        { id: "s2-1", name: "떡볶이", price: 4000 },
        { id: "s2-2", name: "순대", price: 4000, originalPrice: 5000, discount: 20 },
      ],
    },
    {
      id: 3, name: "성환정육점", category: "정육·계란",
      location: "성환시장 1동 20호", hours: "07:00 - 18:00", phone: "041-588-3333",
      rating: 4.5, bookmark: false, mx: 48, my: 48,
lat: 36.91336, lng: 127.13123,
      image: IMG_MEAT,
      description: "신선한 정육 전문점",
      menus: [
        { id: "s3-1", name: "한우불고기 300g", price: 18000 },
      ],
    },
    {
      id: 4, name: "성환채소마트", category: "채소",
      location: "성환시장 3동 11호", hours: "06:00 - 17:00", phone: "041-588-4444",
      rating: 4.6, badge: "신선", bookmark: false, mx: 20, my: 62,
lat: 36.91294, lng: 127.13025,
      image: IMG_VEG,
      description: "매일 새벽 입고 신선 채소",
      menus: [
        { id: "s4-1", name: "배추 1포기", price: 3500 },
        { id: "s4-2", name: "무 1개", price: 2000 },
      ],
    },
    {
      id: 5, name: "성환배농원직판", category: "과일",
      location: "성환시장 특산물 코너", hours: "08:00 - 18:00", phone: "041-588-5555",
      rating: 4.9, badge: "특산물", bookmark: true, mx: 75, my: 60,
lat: 36.91300, lng: 127.13217,
      image: IMG_FRUIT,
      description: "성환 명물 배 산지직송",
      menus: [
        { id: "s5-1", name: "배 선물세트 (6개)", price: 25000, originalPrice: 30000, discount: 17 },
      ],
    },
  ],
};

export const MARKET_INFO: Record<MarketId, { name: string; color: string; subtitle: string }> = {
  jungang:     { name: "천안중앙시장", color: "#0EA5E9", subtitle: "상설시장 · 매일 운영" },
  byeongcheon: { name: "천안역전시장", color: "#0EA5E9", subtitle: "상설시장 · 매일 운영" },
  seonghwan:   { name: "성환전통시장", color: "#0EA5E9", subtitle: "전통시장 · 매일 운영" },
};

export const MAP_CONFIGS: Record<
  MarketId,
  { roads: string[]; blocks: { x: number; y: number; w: number; h: number }[] }
> = {
  jungang: {
    roads: ["M 0 40 H 100","M 0 70 H 100","M 30 0 V 100","M 60 0 V 100","M 85 0 V 100","M 0 55 H 30 M 60 55 H 100"],
    blocks: [
      {x:0,y:0,w:30,h:40},{x:30,y:0,w:30,h:40},{x:60,y:0,w:25,h:40},
      {x:0,y:40,w:30,h:30},{x:60,y:40,w:25,h:30},
      {x:0,y:70,w:30,h:30},{x:30,y:70,w:30,h:30},{x:60,y:70,w:25,h:30},
    ],
  },
  byeongcheon: {
    roads: ["M 0 45 H 100","M 0 75 H 100","M 35 0 V 100","M 70 0 V 100","M 35 45 Q 52 58 70 45"],
    blocks: [
      {x:0,y:0,w:35,h:45},{x:35,y:0,w:35,h:45},{x:70,y:0,w:30,h:45},
      {x:0,y:45,w:35,h:30},{x:70,y:45,w:30,h:30},
      {x:0,y:75,w:35,h:25},{x:35,y:75,w:35,h:25},{x:70,y:75,w:30,h:25},
    ],
  },
  seonghwan: {
    roads: ["M 0 35 H 100","M 0 65 H 100","M 25 0 V 100","M 55 0 V 100","M 80 0 V 100"],
    blocks: [
      {x:0,y:0,w:25,h:35},{x:25,y:0,w:30,h:35},{x:55,y:0,w:25,h:35},
      {x:0,y:35,w:25,h:30},{x:55,y:35,w:25,h:30},
      {x:0,y:65,w:25,h:35},{x:25,y:65,w:30,h:35},{x:55,y:65,w:25,h:35},
    ],
  },
};
