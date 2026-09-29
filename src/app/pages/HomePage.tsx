import { useRef, useState } from "react";
import { Link } from "react-router";
import { Bell, MapPin, Store, ChevronRight, Clock, Tag, ShoppingCart, Settings } from "lucide-react";
import { useCart } from "../components/CartContext";
import { BottomNav, OWNER_MODE_KEY, OwnerBackToStoreButton, getSettingsPath } from "../components/BottomNav";

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
    name: "성환전통시장",
    subtitle: "전통시장",
    location: "천안시 서북구 성환읍",
    description: "성환 지역의 정겨운 전통시장. 신선한 채소와 과일, 지역 특산물이 풍부해요.",
    image: "https://images.unsplash.com/photo-1560100927-c32f29063ade?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzZW9od2FuJTIwdHJhZGl0aW9uYWwlMjBtYXJrZXQlMjBrb3JlYSUyMHZlZ2V0YWJsZXN8ZW58MXx8fHwxNzc0ODI2NzM1fDA&ixlib=rb-4.1.0&q=80&w=1080",
    tag: "전통",
    openDays: "매일 운영",
  },
];

const MARKET_BUTTON_STYLE: Record<MarketId, { active: string; hover: string }> = {
  jungang: {
    active: "border-[#BFCDAF] bg-[#EDF1E7] shadow-[0_5px_16px_-10px_rgba(76,103,58,0.4)]",
    hover: "hover:border-[#C8D5BB] hover:bg-[#F0F4EC] hover:shadow-[0_7px_18px_-8px_rgba(76,103,58,0.28)]",
  },
  byeongcheon: {
    active: "border-[#D9B58E] bg-[#FBF3E9] shadow-[0_5px_16px_-10px_rgba(166,111,61,0.4)]",
    hover: "hover:border-[#D9B58E] hover:bg-[#FBF3E9] hover:shadow-[0_7px_18px_-8px_rgba(166,111,61,0.28)]",
  },
  seonghwan: {
    active: "border-[#D4A096] bg-[#F8EAE6] shadow-[0_5px_16px_-10px_rgba(166,78,61,0.38)]",
    hover: "hover:border-[#D4A096] hover:bg-[#F8EAE6] hover:shadow-[0_7px_18px_-8px_rgba(166,78,61,0.28)]",
  },
};

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
    { id: 2, name: "신선 채소과일", location: "성환전통시장 농산물 골목", image: "https://images.unsplash.com/photo-1771250625125-6e552f84fe11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjB2ZWdldGFibGVzJTIwZnJlc2glMjBwcm9kdWNlfGVufDF8fHx8MTc3NDgyNTg1OHww&ixlib=rb-4.1.0&q=80&w=1080" },
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

export function HomePage() {
  const [selectedMarketId, setSelectedMarketId] = useState<MarketId>("jungang");
  const marketStripDragRef = useRef<{ pointerId: number; startX: number; startScrollLeft: number; dragging: boolean } | null>(null);
  const suppressMarketClickUntilRef = useRef(0);
  const spotsStripDragRef = useRef<{ pointerId: number; startX: number; startScrollLeft: number; dragging: boolean } | null>(null);
  const suppressSpotClickUntilRef = useRef(0);
  const { totalCount } = useCart();
  const ownerMode = localStorage.getItem(OWNER_MODE_KEY) === "true";

  const selectedMarket = markets.find((m) => m.id === selectedMarketId)!;
  const spots = spotsByMarket[selectedMarketId];
  const courses = coursesByMarket[selectedMarketId];

  return (
    <div className="relative isolate min-h-screen bg-gradient-to-b from-[#EAF3F6] via-[#F3F6F3] to-[#F8F7F3] pb-20">
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

      {/* Selected Market Feature */}
      <section className="relative z-10 px-4 pt-5">
        <div className="relative min-h-[216px] overflow-hidden rounded-[28px] bg-[#3E4E3A] shadow-[0_14px_34px_-20px_rgba(45,54,39,0.55)]">
          <img src={selectedMarket.image} alt={selectedMarket.name} className="absolute inset-0 h-full w-full object-cover opacity-65" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#17241D]/95 via-[#17241D]/35 to-black/5" />
          <div className="relative flex min-h-[216px] flex-col justify-end p-5 text-white">
            <div className="mb-auto flex items-start justify-between pt-1">
              <span className="rounded-full border border-white/25 bg-black/20 px-3 py-1 text-[11px] font-medium text-white/95 backdrop-blur-sm">오늘의 시장</span>
              <span className="rounded-full bg-[#F4C96B] px-3 py-1 text-[11px] font-semibold text-[#493719]">{selectedMarket.tag}</span>
            </div>
            <p className="mb-1 flex items-center gap-1 text-[12px] text-white/85"><MapPin className="h-3.5 w-3.5" />{selectedMarket.location}</p>
            <div className="market-banner-copy mb-3">
              <h2 className="relative z-[1] text-[25px] font-bold tracking-tight">{selectedMarket.name}</h2>
              <p className="relative z-[1] mt-1 max-w-[290px] text-[13px] leading-relaxed text-white/90">{selectedMarket.description}</p>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-[12px] text-white/85"><Clock className="h-3.5 w-3.5" />{selectedMarket.openDays}</span>
              <Link to={`/map?market=${selectedMarketId}`} className="group inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-[13px] font-semibold text-[#354333] shadow-[0_4px_14px_-5px_rgba(255,255,255,0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#F8EAE6] hover:text-[#8F4B40] hover:shadow-[0_6px_18px_-5px_rgba(166,78,61,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A096] active:scale-[0.97] active:translate-y-0">
                시장 구경하기 <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div><p className="text-[11px] font-medium text-[#B86836]">가까운 시장 둘러보기</p><p className="mt-0.5 text-[15px] font-semibold text-[#46352C]">어느 시장에 가볼까요?</p></div>
          <Store className="h-5 w-5 text-[#B86836]" />
        </div>
        <div
          className="mt-3 flex cursor-grab select-none gap-2.5 overflow-x-auto pb-1 active:cursor-grabbing touch-pan-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onPointerDown={(event) => {
            if (event.pointerType !== "mouse" || event.button !== 0) return;
            suppressMarketClickUntilRef.current = 0;
            marketStripDragRef.current = {
              pointerId: event.pointerId,
              startX: event.clientX,
              startScrollLeft: event.currentTarget.scrollLeft,
              dragging: false,
            };
          }}
          onPointerMove={(event) => {
            const drag = marketStripDragRef.current;
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
            const drag = marketStripDragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            if (drag.dragging) {
              suppressMarketClickUntilRef.current = Date.now() + 350;
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
            }
            marketStripDragRef.current = null;
          }}
          onPointerCancel={() => { marketStripDragRef.current = null; }}
          onClickCapture={(event) => {
            if (Date.now() < suppressMarketClickUntilRef.current) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
        >
          {markets.map((market) => (
            <button key={market.id} onClick={() => setSelectedMarketId(market.id)} aria-pressed={selectedMarketId === market.id}
              className={`group flex min-w-[148px] items-center gap-2.5 rounded-2xl border p-2 text-left transition-all duration-300 active:scale-[0.98] ${selectedMarketId === market.id ? MARKET_BUTTON_STYLE[market.id].active : `border-[#E9E7DF] bg-white ${MARKET_BUTTON_STYLE[market.id].hover}`}`}>
              <img src={market.image} alt="" className="h-12 w-12 rounded-xl object-cover transition-transform duration-300 group-hover:scale-105" />
              <span className="min-w-0"><span className="block truncate text-[12px] font-semibold text-[#343B32]">{market.subtitle}</span><span className="mt-0.5 block text-[10px] text-[#898B80]">{market.openDays}</span></span>
            </button>
          ))}
        </div>
      </section>

      {/* Main Content */}
      <div className="relative z-10 px-4 pt-6">
        {/* Spots */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div><p className="text-[11px] font-medium text-[#B86836]">LOCAL FAVORITES</p><h2 className="text-[19px] font-bold tracking-tight text-[#46352C]">시장 한 바퀴, 여기부터</h2></div>
            <button className="flex items-center text-[13px] text-[#B86836] transition-colors hover:text-[#A95735]">
              모두보기 <ChevronRight className="w-4 h-4" />
            </button>
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
              <Link key={spot.id} to="/map" className="flex-none w-[120px]">
                <div className="relative h-[120px] rounded-xl overflow-hidden mb-1.5">
                  <img src={spot.image} alt={spot.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2 text-white">
                    <p className="text-[12px] leading-tight">{spot.name}</p>
                    <p className="mt-0.5 flex items-center gap-0.5 text-[10px] opacity-80">
                      <MapPin className="w-2.5 h-2.5" />{spot.location}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Flash Sale */}
        <div className="relative mb-6 overflow-hidden rounded-[24px] border border-[#EEDFD8] bg-gradient-to-br from-[#FBF3EF] via-[#F8EEE9] to-[#F5EFE5] p-4 shadow-[0_12px_30px_-26px_rgba(143,75,64,0.4)]">
          <div aria-hidden="true" className="pointer-events-none absolute -right-7 -top-10 h-28 w-28 rounded-full bg-[#E9C9BE]/25 blur-xl" />
          <div className="relative flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-[#A95745] shadow-sm ring-1 ring-inset ring-white">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-wide text-[#A46C60]">오늘 장 마감 전에</p>
              <h3 className="text-[15px] font-bold text-[#443833]">마감 할인 알림</h3>
            </div>
          </div>
          <p className="relative text-[12px] leading-relaxed text-[#756761] mb-3">
            {selectedMarket.name} 상인들의 오늘 마감 특가를 확인하세요
          </p>
          <Link
            to="/map"
            className="group relative flex w-full items-center justify-between rounded-2xl border border-white/90 bg-white/80 px-4 py-3 text-[13px] font-semibold text-[#77574E] shadow-[0_4px_14px_-10px_rgba(105,64,53,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#E8C9C0] hover:bg-[#F8EAE6] hover:text-[#8F4B40] hover:shadow-[0_7px_18px_-7px_rgba(166,78,61,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A096] active:scale-[0.99] active:translate-y-0"
          >
            할인 상품 구경하기 <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Courses */}
        <div className="mb-4">
          <div className="mb-3"><p className="text-[11px] font-medium text-[#B86836]">MARKET WALK</p><h2 className="text-[19px] font-bold tracking-tight text-[#46352C]">이 코스 어때요?</h2></div>
          <div className="space-y-2.5">
            {courses.map((course) => (
              <Link key={course.id} to="/map" className="block relative h-[130px] rounded-xl overflow-hidden">
                <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                  <div className="text-white">
                    <p className="text-[14px]">{course.title}</p>
                    <p className="text-[11px] opacity-70 mt-0.5">{selectedMarket.name}</p>
                  </div>
                  <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
                    <ChevronRight className="w-4 h-4 text-white" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
