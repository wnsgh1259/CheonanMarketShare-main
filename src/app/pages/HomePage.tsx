import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Bell, MapPin, Store, ChevronRight, Clock, Tag, ShoppingCart, Settings, Star, Ticket } from "lucide-react";
import { useCart } from "../components/CartContext";
import { BottomNav, OWNER_MODE_KEY, OwnerBackToStoreButton, getSettingsPath } from "../components/BottomNav";
import { IDOL, IDOL_STAGE_COUNT } from "../data/idolEvent";
import { loadIdolProgress, syncRewardState } from "../data/rewards";
import { loadOwnerCatalog, refreshOwnerCatalogFromRemote } from "../data/ownerStoreData";
import { listLiveDeals } from "../data/storePromotion";

type MarketId = "jungang" | "byeongcheon" | "seonghwan";

interface Market {
  id: MarketId;
  name: string;
  subtitle: string;
  location: string;
  description: string;
  image: string;
  tag: string;
  openDays: string;
}

const markets: Market[] = [
  {
    id: "jungang",
    name: "천안중앙시장",
    subtitle: "중앙시장",
    location: "천안시 동남구 중앙동",
    description: "천안을 대표하는 전통 재래시장. 다양한 먹거리와 생필품이 풍성해요.",
    image: "https://images.unsplash.com/photo-1594021113115-f1b48e63ef06?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGVvbmFuJTIwa29yZWElMjB0cmFkaXRpb25hbCUyMG1hcmtldCUyMHN0cmVldHxlbnwxfHx8fDE3NzQ4MjY3MzV8MA&ixlib=rb-4.1.0&q=80&w=1080",
    tag: "상설",
    openDays: "매일 운영",
  },
  {
    id: "byeongcheon",
    name: "천안역전시장",
    subtitle: "역전시장",
    location: "천안시 동남구 대흥동",
    description: "천안역 인근 활기찬 전통시장. 다양한 먹거리와 신선한 식재료가 풍부해요.",
    image: "https://images.unsplash.com/photo-1616627152550-5aac9b71a949?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBmaXZlJTIwZGF5JTIwcnVyYWwlMjBtYXJrZXQlMjBieWVvbmdjaGVvbnxlbnwxfHx8fDE3NzQ4MjY3MzV8MA&ixlib=rb-4.1.0&q=80&w=1080",
    tag: "상설",
    openDays: "매일 운영",
  },
  {
    id: "seonghwan",
    name: "성환이화시장",
    subtitle: "이화시장",
    location: "천안시 서북구 성환읍",
    description: "성환 지역의 정겨운 전통시장. 신선한 채소와 과일, 지역 특산물이 풍부해요.",
    image: "https://images.unsplash.com/photo-1560100927-c32f29063ade?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzZW9od2FuJTIwdHJhZGl0aW9uYWwlMjBtYXJrZXQlMjBrb3JlYSUyMHZlZ2V0YWJsZXN8ZW58MXx8fHwxNzc0ODI2NzM1fDA&ixlib=rb-4.1.0&q=80&w=1080",
    tag: "전통",
    openDays: "매일 운영",
  },
];

const spotsByMarket: Record<MarketId, { id: number; name: string; location: string; image: string }[]> = {
  jungang: [
    { id: 1, name: "천안 순대거리", location: "중앙동 먹거리 골목", image: "https://images.unsplash.com/photo-1773304189617-0e89faa81c6e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmFkaXRpb25hbCUyMGtvcmVhbiUyMG1hcmtldHxlbnwxfHx8fDE3NzQ4MjU4MjR8MA&ixlib=rb-4.1.0&q=80&w=1080" },
    { id: 2, name: "신선 청과물", location: "중앙시장 청과 골목", image: "https://images.unsplash.com/photo-1771250625125-6e552f84fe11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjB2ZWdldGFibGVzJTIwZnJlc2glMjBwcm9kdWNlfGVufDF8fHx8MTc3NDgyNTg1OHww&ixlib=rb-4.1.0&q=80&w=1080" },
    { id: 3, name: "야시장 푸드", location: "중앙시장 야간 특구", image: "https://images.unsplash.com/photo-1759663802834-5df7ae5b08de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBtYXJrZXQlMjBmb29kJTIwc3RhbGwlMjBuaWdodHxlbnwxfHx8fDE3NzQ4MjY3NDB8MA&ixlib=rb-4.1.0&q=80&w=1080" },
  ],
  byeongcheon: [
    { id: 1, name: "역전 순대타운", location: "역전시장 먹거리 골목", image: "https://images.unsplash.com/photo-1769558688746-7ac36d8ce999?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBzaWRlJTIwZGlzaGVzJTIwYmFuY2hhbnxlbnwxfHx8fDE3NzQ4MDI1NTF8MA&ixlib=rb-4.1.0&q=80&w=1080" },
    { id: 2, name: "역전 청과물", location: "역전시장 청과 골목", image: "https://images.unsplash.com/photo-1710388766264-07a47a416e93?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjB0cmFkaXRpb25hbCUyMGhhbm9rJTIwYXJjaGl0ZWN0dXJlfGVufDF8fHx8MTc3NDgyNTgyOXww&ixlib=rb-4.1.0&q=80&w=1080" },
    { id: 3, name: "역전 먹거리", location: "역전시장 분식 코너", image: "https://images.unsplash.com/photo-1616627152550-5aac9b71a949?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBmaXZlJTIwZGF5JTIwcnVyYWwlMjBtYXJrZXQlMjBieWVvbmdjaGVvbnxlbnwxfHx8fDE3NzQ4MjY3MzV8MA&ixlib=rb-4.1.0&q=80&w=1080" },
  ],
  seonghwan: [
    { id: 1, name: "성환 배 특산물", location: "성환읍 과수 특산 코너", image: "https://images.unsplash.com/photo-1560100927-c32f29063ade?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzZW9od2FuJTIwdHJhZGl0aW9uYWwlMjBtYXJrZXQlMjBrb3JlYSUyMHZlZ2V0YWJsZXN8ZW58MXx8fHwxNzc0ODI2NzM1fDA&ixlib=rb-4.1.0&q=80&w=1080" },
    { id: 2, name: "신선 채소과일", location: "성환이화시장 농산물 골목", image: "https://images.unsplash.com/photo-1771250625125-6e552f84fe11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjB2ZWdldGFibGVzJTIwZnJlc2glMjBwcm9kdWNlfGVufDF8fHx8MTc3NDgyNTg1OHww&ixlib=rb-4.1.0&q=80&w=1080" },
    { id: 3, name: "지역 먹거리 골목", location: "성환읍 내 시장 거리", image: "https://images.unsplash.com/photo-1662525194400-3c516a92a148?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBzdHJlZXQlMjBmb29kJTIwbWFya2V0fGVufDF8fHx8MTc3NDc4NjE5OHww&ixlib=rb-4.1.0&q=80&w=1080" },
  ],
};

const coursesByMarket: Record<MarketId, { id: number; title: string; image: string }[]> = {
  jungang: [
    { id: 1, title: "먹킷 걷고, 데이트까지", image: "https://images.unsplash.com/photo-1662525194400-3c516a92a148?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBzdHJlZXQlMjBmb29kJTIwbWFya2V0fGVufDF8fHx8MTc3NDc4NjE5OHww&ixlib=rb-4.1.0&q=80&w=1080" },
    { id: 2, title: "전통 먹거리, 한 번에 즐기고", image: "https://images.unsplash.com/photo-1773304189617-0e89faa81c6e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmFkaXRpb25hbCUyMGtvcmVhbiUyMG1hcmtldHxlbnwxfHx8fDE3NzQ4MjU4MjR8MA&ixlib=rb-4.1.0&q=80&w=1080" },
    { id: 3, title: "풍성한 야시장 코스", image: "https://images.unsplash.com/photo-1759663802834-5df7ae5b08de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBtYXJrZXQlMjBmb29kJTIwc3RhbGwlMjBuaWdodHxlbnwxfHx8fDE3NzQ4MjY3NDB8MA&ixlib=rb-4.1.0&q=80&w=1080" },
  ],
  byeongcheon: [
    { id: 1, title: "역전 순대 투어", image: "https://images.unsplash.com/photo-1769558688746-7ac36d8ce999?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBzaWRlJTIwZGlzaGVzJTIwYmFuY2hhbnxlbnwxfHx8fDE3NzQ4MDI1NTF8MA&ixlib=rb-4.1.0&q=80&w=1080" },
    { id: 2, title: "역전시장 맛집 탐방", image: "https://images.unsplash.com/photo-1710388766264-07a47a416e93?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjB0cmFkaXRpb25hbCUyMGhhbm9rJTIwYXJjaGl0ZWN0dXJlfGVufDF8fHx8MTc3NDgyNTgyOXww&ixlib=rb-4.1.0&q=80&w=1080" },
    { id: 3, title: "역전시장 신선 식재료 쇼핑", image: "https://images.unsplash.com/photo-1616627152550-5aac9b71a949?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBmaXZlJTIwZGF5JTIwcnVyYWwlMjBtYXJrZXQlMjBieWVvbmdjaGVvbnxlbnwxfHx8fDE3NzQ4MjY3MzV8MA&ixlib=rb-4.1.0&q=80&w=1080" },
  ],
  seonghwan: [
    { id: 1, title: "성환 배 산지 직구 코스", image: "https://images.unsplash.com/photo-1560100927-c32f29063ade?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzZW9od2FuJTIwdHJhZGl0aW9uYWwlMjBtYXJrZXQlMjBrb3JlYSUyMHZlZ2V0YWJsZXN8ZW58MXx8fHwxNzc0ODI2NzM1fDA&ixlib=rb-4.1.0&q=80&w=1080" },
    { id: 2, title: "싱싱 채소 근거리 방문 코스", image: "https://images.unsplash.com/photo-1771250625125-6e552f84fe11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjB2ZWdldGFibGVzJTIwZnJlc2glMjBwcm9kdWNlfGVufDF8fHx8MTc3NDgyNTg1OHww&ixlib=rb-4.1.0&q=80&w=1080" },
    { id: 3, title: "지역 특산물 쇼핑 코스", image: "https://images.unsplash.com/photo-1662525194400-3c516a92a148?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBzdHJlZXQlMjBmb29kJTIwbWFya2V0fGVufDF8fHx8MTc3NDc4NjE5OHww&ixlib=rb-4.1.0&q=80&w=1080" },
  ],
};

function getCourseTitleLines(title: string): [string, string] {
  if (title === "풍성한 야시장 코스") return ["풍성한", "야시장 코스"];

  const commaIndex = title.indexOf(",");
  if (commaIndex >= 0) return [title.slice(0, commaIndex + 1), title.slice(commaIndex + 1).trim()];

  const words = title.split(" ");
  const splitIndex = Math.ceil(words.length / 2);
  return [words.slice(0, splitIndex).join(" "), words.slice(splitIndex).join(" ")];
}

export function HomePage() {
  const [selectedMarketId, setSelectedMarketId] = useState<MarketId>("jungang");
  const [activeCourseIndex, setActiveCourseIndex] = useState(0);
  const spotsStripDragRef = useRef<{ pointerId: number; startX: number; startScrollLeft: number; dragging: boolean } | null>(null);
  const suppressSpotClickUntilRef = useRef(0);
  const { totalCount } = useCart();
  const ownerMode = localStorage.getItem(OWNER_MODE_KEY) === "true";
  const [idolStage, setIdolStage] = useState(() => loadIdolProgress().stage);

  useEffect(() => {
    let alive = true;
    void syncRewardState().then(() => {
      if (alive) setIdolStage(loadIdolProgress().stage);
    });
    return () => {
      alive = false;
    };
  }, []);

  const [liveDealCount, setLiveDealCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const remote = await refreshOwnerCatalogFromRemote();
      if (cancelled) return;
      const stores = remote?.stores ?? loadOwnerCatalog().stores ?? [];
      setLiveDealCount(listLiveDeals(stores, Date.now(), selectedMarketId).length);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedMarketId]);

  const selectedMarket = markets.find((m) => m.id === selectedMarketId)!;
  const spots = spotsByMarket[selectedMarketId];
  const courses = coursesByMarket[selectedMarketId];

  useEffect(() => {
    setActiveCourseIndex(0);
  }, [selectedMarketId]);

  useEffect(() => {
    if (courses.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveCourseIndex((index) => (index + 1) % courses.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [courses.length, selectedMarketId]);

  return (
    <div className="relative isolate min-h-screen bg-[#F8F8F7] pb-20">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <span className="profile-leaf profile-leaf-one">🍁</span>
        <span className="profile-leaf profile-leaf-two">🍂</span>
        <span className="profile-leaf profile-leaf-three">🍁</span>
        <span className="profile-leaf home-leaf-four">🍂</span>
        <span className="profile-leaf home-leaf-five">🍁</span>
        <span className="profile-leaf home-leaf-six">🍂</span>
        <span className="profile-leaf home-leaf-seven">🍁</span>
        <span className="profile-leaf home-leaf-eight">🍂</span>
        <span className="profile-leaf home-leaf-nine">🍁</span>
        <span className="profile-leaf home-leaf-ten">🍂</span>
      </div>
      {/* Header */}
      <div className="relative z-20 bg-white/95 px-4 py-3 border-b border-[#EEEAE4]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-[#8A776B] tracking-wide">천안 스마트 장보기</p>
            <h1 className="text-[17px] text-[#46352C] tracking-tight">{selectedMarket.name}</h1>
          </div>
          <div className="flex items-center gap-1">
            {ownerMode ? (
              <>
                <OwnerBackToStoreButton />
                <button className="group relative flex h-10 w-10 items-center justify-center rounded-full active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A096]">
                  <Bell className="bell-swing-target w-[20px] h-[20px] text-[#5A453B]" />
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#C9813A] rounded-full" />
                </button>
                <Link to={getSettingsPath()} className="flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-200 hover:-translate-y-0.5 hover:scale-105 active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A096]">
                  <Settings className="w-[20px] h-[20px] text-[#5A453B]" />
                </Link>
              </>
            ) : (
              <>
                <Link to="/cart" className="group relative flex h-10 w-10 items-center justify-center rounded-full active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A096]">
                  <ShoppingCart className="cart-pull-target w-[20px] h-[20px] text-[#5A453B]" />
                  {totalCount > 0 && (
                    <span className="absolute top-1 right-0.5 bg-[#A9652D] text-white text-[10px] min-w-[16px] h-4 rounded-full flex items-center justify-center px-1">
                      {totalCount}
                    </span>
                  )}
                </Link>
                <button className="group relative flex h-10 w-10 items-center justify-center rounded-full active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A096]">
                  <Bell className="bell-swing-target w-[20px] h-[20px] text-[#5A453B]" />
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#C9813A] rounded-full" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-30 bg-transparent px-4 py-2">
        <div className="grid grid-cols-3 gap-2">
          <Link to={`/deals?market=${selectedMarketId}`} aria-label={liveDealCount > 0 ? `할인 상품, 진행 중 ${liveDealCount}곳` : "할인 상품"} className="relative flex h-[44px] min-w-0 cursor-pointer items-center justify-center gap-1 rounded-full bg-white/95 px-2 text-[13px] font-semibold tracking-tight text-[#6B6B6B] shadow-[0_5px_18px_-14px_rgba(70,53,44,0.32)] transition-transform hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A096]">
            <Tag className="h-[18px] w-[18px] flex-shrink-0 text-[#C9C9C9]" />
            <span className="whitespace-nowrap">할인 상품</span>
            {liveDealCount > 0 && (
              <span className="absolute -right-0.5 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#A9652D] px-1 text-[10px] font-semibold text-white">
                {liveDealCount}
              </span>
            )}
          </Link>
          <Link to="/profile?tab=coupons" aria-label="쿠폰함" className="relative flex h-[44px] min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-white/95 px-2 text-[#6B6B6B] shadow-[0_5px_18px_-14px_rgba(70,53,44,0.32)] transition-transform hover:-translate-y-0.5 active:scale-[0.97]">
            <Ticket className="h-5 w-5 flex-shrink-0 text-[#C9C9C9]" />
            <span className="text-[13px] font-semibold tracking-tight">쿠폰함</span>
          </Link>
          <button
            type="button"
            aria-label={`시장 변경: ${selectedMarket.name}`}
            onClick={() => setSelectedMarketId((current) => current === "jungang" ? "byeongcheon" : current === "byeongcheon" ? "seonghwan" : "jungang")}
            className="flex h-[44px] min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-white/95 px-2 text-[#6B6B6B] shadow-[0_5px_18px_-14px_rgba(70,53,44,0.32)] transition-transform hover:-translate-y-0.5 active:scale-[0.97]"
          >
            <Store className="h-5 w-5 flex-shrink-0 text-[#C9C9C9]" />
            <span className="whitespace-nowrap text-[13px] font-semibold tracking-tight">{selectedMarket.subtitle.replace("시장", " 시장")}</span>
          </button>
        </div>
      </div>

      {/* Selected Market Feature */}
      <section className="relative z-10 px-4 pt-5">
        <div className="relative h-[210px] overflow-hidden rounded-[28px] bg-[#3E4E3A] shadow-[0_14px_34px_-20px_rgba(45,54,39,0.55)]">
          <img src={selectedMarket.image} alt={selectedMarket.name} className="absolute inset-0 h-full w-full object-cover opacity-65" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#17241D]/95 via-[#17241D]/35 to-black/5" />
          <div className="relative flex h-full flex-col justify-end p-4 text-white">
            <div className="mb-auto flex items-start justify-between pt-1">
              <span className="rounded-full border border-white/25 bg-black/20 px-2.5 py-0.5 text-[10px] font-medium text-white/95 backdrop-blur-sm">오늘의 시장</span>
              <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold text-[#493719]">{selectedMarket.tag}</span>
            </div>
            <p className="mb-1 flex items-center gap-1 text-[11px] text-white/85"><MapPin className="h-3 w-3" />{selectedMarket.location}</p>
            <div className="market-banner-copy mb-2">
              <h2 className="relative z-[1] text-[23px] font-bold tracking-tight">{selectedMarket.name}</h2>
              <p className="relative z-[1] mt-0.5 max-w-[290px] text-[12px] leading-relaxed text-white/90">{selectedMarket.description}</p>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-white/85">
              <Clock className="h-3 w-3" />{selectedMarket.openDays}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="relative z-10 px-4 pt-8">
        {/* Spots */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-5">
            <div><p className="text-[11px] font-medium text-[#46352C]">LOCAL FAVORITES</p><h2 className="text-[19px] font-bold tracking-tight text-[#3F4140]">시장 한 바퀴, 여기부터</h2></div>
          </div>
          <div
            className="flex cursor-grab select-none gap-2.5 overflow-x-auto pb-1 active:cursor-grabbing touch-pan-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onPointerDown={(event) => {
              if (event.pointerType !== "mouse" || event.button !== 0) return;
              suppressSpotClickUntilRef.current = 0;
              spotsStripDragRef.current = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startScrollLeft: event.currentTarget.scrollLeft,
                dragging: false,
              };
            }}
            onPointerMove={(event) => {
              const drag = spotsStripDragRef.current;
              if (!drag || drag.pointerId !== event.pointerId) return;
              const deltaX = event.clientX - drag.startX;
              if (!drag.dragging && Math.abs(deltaX) > 5) {
                drag.dragging = true;
                event.currentTarget.setPointerCapture(event.pointerId);
              }
              if (drag.dragging) {
                event.preventDefault();
                event.currentTarget.scrollLeft = drag.startScrollLeft - deltaX;
              }
            }}
            onPointerUp={(event) => {
              const drag = spotsStripDragRef.current;
              if (!drag || drag.pointerId !== event.pointerId) return;
              if (drag.dragging) {
                suppressSpotClickUntilRef.current = Date.now() + 350;
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }
              }
              spotsStripDragRef.current = null;
            }}
            onPointerCancel={() => { spotsStripDragRef.current = null; }}
            onClickCapture={(event) => {
              if (Date.now() < suppressSpotClickUntilRef.current) {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
          >
            {spots.map((spot) => (
              <Link key={spot.id} to="/map" className="flex w-[132px] flex-none flex-col items-center text-left">
                <p className="mb-2 flex w-full items-center gap-1 px-1 text-left text-[10px] leading-snug text-[#8A7B68]">
                  <MapPin className="h-3 w-3 flex-shrink-0" />{spot.location}
                </p>
                <img src={spot.image} alt={spot.name} className="mb-3 h-[124px] w-[124px] rounded-full object-cover shadow-[0_6px_18px_-12px_rgba(70,53,44,0.35)]" />
                <p className="w-full px-1 text-center text-[13px] font-semibold leading-snug text-[#3F4140]">{spot.name}</p>
              </Link>
            ))}
          </div>
        </div>

        {!ownerMode && (
          <div className="mb-6 space-y-3">
            <Link
              to="/idol"
              className="flex items-center gap-3 rounded-xl border border-[#D7D3E8] bg-[#E4E2EF] p-4 text-[#302C40] active:opacity-90"
            >
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/65 text-[22px]">{IDOL.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-[#6250A4]">에스파 {IDOL.name}의 시장 미션</p>
                <p className="mt-0.5 text-[11px] text-[#625D76]">
                  {idolStage >= IDOL_STAGE_COUNT
                    ? "미션을 모두 풀었어요"
                    : `힌트를 찾아 문제를 풀면 포인트와 굿즈 추첨권 · ${idolStage}/${IDOL_STAGE_COUNT}`}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 flex-shrink-0 text-[#6044A5]" />
            </Link>
            <Link
              to="/profile?tab=events"
              className="flex items-center gap-3 rounded-xl border border-[#D2E0EC] bg-[#E6EFF7] p-4 text-[#555B63] active:opacity-90"
            >
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/70 text-[22px]">📣</span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-[#1768A8]">시장을 SNS에 알려주세요</p>
                <p className="mt-0.5 text-[11px] text-[#555B63]">게시물을 올리고 인증하면 최대 400P를 받아요</p>
              </div>
              <ChevronRight className="h-5 w-5 flex-shrink-0 text-[#1768A8]" />
            </Link>
          </div>
        )}

        {/* Courses */}
        <div className="mb-4">
          <div className="mb-3"><p className="text-[11px] font-medium text-[#46352C]">MARKET WALK</p><h2 className="text-[19px] font-bold tracking-tight text-[#3F4140]">이 코스 어때요?</h2></div>
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{
                width: `${courses.length * 100}%`,
                transform: `translateX(-${activeCourseIndex * (100 / courses.length)}%)`,
              }}
            >
              {courses.map((course) => (
                <Link key={course.id} to="/map" style={{ width: `${100 / courses.length}%` }} className={`flex min-h-[132px] flex-shrink-0 items-center justify-between gap-2 overflow-hidden rounded-[24px] border border-[#F0E8D9] ${["bg-[#F9F5E9]", "bg-[#F5F0E7]", "bg-[#F5F8E9]"][course.id - 1] || "bg-[#F9F5E9]"} px-4 py-3.5 shadow-[0_8px_22px_-18px_rgba(89,69,43,0.35)] transition-transform active:scale-[0.99]` }>
                  <div className="min-w-0 flex-1 py-1 pl-1">
                    <p className="text-[16px] font-semibold leading-snug tracking-tight text-[#332F29]">
                      <span className="block">{getCourseTitleLines(course.title)[0]}</span>
                      <span className="block">{getCourseTitleLines(course.title)[1]}</span>
                    </p>
                    <p className="mt-1 text-[11px] text-[#8A7B68]">{selectedMarket.name}</p>
                  </div>
                  <div className="relative h-[104px] w-[148px] flex-shrink-0">
                    <img src={course.image} alt="" className="h-full w-full rounded-[32px] object-cover" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <div className="mt-2.5 flex justify-center gap-1.5" aria-label="코스 카드 선택">
            {courses.map((course, index) => (
              <button
                key={course.id}
                type="button"
                aria-label={`${index + 1}번째 코스 보기`}
                aria-current={activeCourseIndex === index}
                onClick={() => setActiveCourseIndex(index)}
                className={`h-1.5 rounded-full transition-all ${activeCourseIndex === index ? "w-5 bg-[#A67B50]" : "w-1.5 bg-[#D9D0C2]"}`}
              />
            ))}
          </div>
        </div>
      </div>

      <Link
        to={`/map?market=${selectedMarketId}`}
        className="group fixed bottom-[88px] right-[max(16px,calc(50%-208px))] z-[130] inline-flex items-center gap-1.5 rounded-full bg-[#5B4335] px-4 py-3 text-[13px] font-semibold text-white shadow-[0_8px_22px_-10px_rgba(45,54,39,0.38)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#6B5142] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A096] active:scale-[0.97] active:translate-y-0"
      >
        시장 구경하기 <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
      </Link>

      <BottomNav />
    </div>
  );
}
