import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import {
  Bell, MapPin, ChevronRight, Tag, ShoppingCart, Search,
  Utensils, ShoppingBag, Carrot, Fish, Coffee, Package,
  Timer, Star, Flame, Store,
} from "lucide-react";
import { useCart } from "../components/CartContext";
import { BottomNav } from "../components/BottomNav";

// ── Types ──────────────────────────────────────────────────────────────────
type MarketId = "jungang" | "byeongcheon" | "seonghwan";
type CategoryLabel = "전체" | "음식점" | "농산물" | "수산물" | "의류" | "카페" | "잡화";

// ── Market data ────────────────────────────────────────────────────────────
const MARKETS: { id: MarketId; name: string; short: string; location: string }[] = [
  { id: "jungang",    name: "천안중앙시장", short: "중앙",  location: "동남구 중앙동" },
  { id: "byeongcheon", name: "천안역전시장", short: "역전",  location: "동남구 대흥동" },
  { id: "seonghwan",  name: "성환전통시장", short: "성환",  location: "서북구 성환읍" },
];

// ── Store data (unified, shared) ────────────────────────────────────────────
interface StoreCard {
  id: number;
  marketId: MarketId;
  name: string;
  category: CategoryLabel;
  badge?: "마감할인" | "인기" | "신규";
  description: string;
  rating: number;
  reviewCount: number;
  image: string;
  closeHour: number; // for countdown
  flashPrice?: number;
  flashOriginal?: number;
  flashItem?: string;
}

const ALL_STORES: StoreCard[] = [
  {
    id: 1, marketId: "jungang", name: "천안순대국밥", category: "음식점",
    badge: "인기", description: "천안 대표 순대국밥 맛집. 진한 국물과 푸짐한 양!", rating: 4.8, reviewCount: 312,
    image: "https://images.unsplash.com/photo-1769558688746-7ac36d8ce999?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
    closeHour: 20,
  },
  {
    id: 2, marketId: "jungang", name: "호두과자 본점", category: "음식점",
    badge: "마감할인", description: "천안 명물 호두과자! 갓 구운 바삭한 호두과자.", rating: 4.9, reviewCount: 521,
    image: "https://images.unsplash.com/photo-1760020890915-ca605575b93b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
    closeHour: 21, flashItem: "호두과자 2봉 세트", flashPrice: 7000, flashOriginal: 8000,
  },
  {
    id: 3, marketId: "jungang", name: "중앙칼국수", category: "음식점",
    description: "수제면으로 만든 진한 멸치 육수 칼국수가 일품!", rating: 4.6, reviewCount: 188,
    image: "https://images.unsplash.com/photo-1747228469031-c5fc60b9d9f9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
    closeHour: 19,
  },
  {
    id: 4, marketId: "jungang", name: "신선정육점", category: "농산물",
    description: "당일 도축 신선한 한우·돼지고기 전문점", rating: 4.5, reviewCount: 97,
    image: "https://images.unsplash.com/photo-1758788701706-327f3a0d6820?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
    closeHour: 18,
  },
  {
    id: 5, marketId: "jungang", name: "싱싱채소마트", category: "농산물",
    badge: "마감할인", description: "산지직송 신선 채소. 매일 새벽 입고!", rating: 4.3, reviewCount: 75,
    image: "https://images.unsplash.com/photo-1759663783570-520674af30d6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
    closeHour: 17, flashItem: "양파 3kg", flashPrice: 4500, flashOriginal: 6000,
  },
  {
    id: 6, marketId: "byeongcheon", name: "역전 순대타운", category: "음식점",
    badge: "인기", description: "역전시장 대표 먹거리 골목", rating: 4.7, reviewCount: 204,
    image: "https://images.unsplash.com/photo-1773304189617-0e89faa81c6e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
    closeHour: 20,
  },
  {
    id: 7, marketId: "byeongcheon", name: "역전 청과물", category: "농산물",
    badge: "마감할인", description: "신선한 과일·채소 매일 입고", rating: 4.4, reviewCount: 63,
    image: "https://images.unsplash.com/photo-1771250625125-6e552f84fe11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
    closeHour: 17, flashItem: "사과 5개 세트", flashPrice: 5000, flashOriginal: 7000,
  },
  {
    id: 8, marketId: "byeongcheon", name: "역전 분식코너", category: "음식점",
    badge: "신규", description: "즉석 떡볶이·튀김 맛집", rating: 4.5, reviewCount: 41,
    image: "https://images.unsplash.com/photo-1616627152550-5aac9b71a949?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
    closeHour: 21,
  },
  {
    id: 9, marketId: "seonghwan", name: "성환 배 특산물", category: "농산물",
    badge: "인기", description: "성환 명물 배! 산지 직송 최저가", rating: 4.9, reviewCount: 156,
    image: "https://images.unsplash.com/photo-1560100927-c32f29063ade?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
    closeHour: 18,
  },
  {
    id: 10, marketId: "seonghwan", name: "성환 채소가게", category: "농산물",
    badge: "마감할인", description: "싱싱한 지역 농산물 전문", rating: 4.2, reviewCount: 38,
    image: "https://images.unsplash.com/photo-1759663783570-520674af30d6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
    closeHour: 17, flashItem: "감자 2kg", flashPrice: 3500, flashOriginal: 5000,
  },
  {
    id: 11, marketId: "seonghwan", name: "성환 먹거리 골목", category: "음식점",
    description: "지역 특산물로 만든 향토음식 골목", rating: 4.6, reviewCount: 89,
    image: "https://images.unsplash.com/photo-1662525194400-3c516a92a148?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
    closeHour: 19,
  },
];

const CATEGORIES: { label: CategoryLabel; Icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
  { label: "전체",   Icon: Store },
  { label: "음식점", Icon: Utensils },
  { label: "농산물", Icon: Carrot },
  { label: "수산물", Icon: Fish },
  { label: "의류",   Icon: ShoppingBag },
  { label: "카페",   Icon: Coffee },
  { label: "잡화",   Icon: Package },
];

// ── Countdown hook ─────────────────────────────────────────────────────────
function useCountdownToHour(targetHour: number) {
  const calc = useCallback(() => {
    const now = new Date();
    const target = new Date();
    target.setHours(targetHour, 0, 0, 0);
    if (now >= target) target.setDate(target.getDate() + 1);
    const diff = Math.max(0, target.getTime() - now.getTime());
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [targetHour]);

  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [calc]);
  return time;
}

// ── Flash Sale countdown (to 18:00 as common close) ───────────────────────
function FlashTimer() {
  const time = useCountdownToHour(18);
  return (
    <span className="font-mono text-[#ff6600] font-bold tabular-nums">{time}</span>
  );
}

// ── Store card component ───────────────────────────────────────────────────
function StoreListCard({ store }: { store: StoreCard }) {
  const discountPct = store.flashOriginal
    ? Math.round((1 - store.flashPrice! / store.flashOriginal) * 100)
    : 0;

  return (
    <Link to={`/store/${store.id}`} className="flex gap-3 items-start bg-white rounded-2xl p-3 shadow-[0px_1px_6px_rgba(0,0,0,0.07)] active:scale-[0.98] transition-transform">
      <div className="relative w-[80px] h-[80px] rounded-xl overflow-hidden flex-shrink-0">
        <img src={store.image} alt={store.name} className="w-full h-full object-cover" />
        {store.badge && (
          <span className={`absolute top-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
            store.badge === "마감할인"
              ? "bg-[#ff6600] text-white"
              : store.badge === "신규"
              ? "bg-[#1a1c20] text-white"
              : "bg-orange-50 text-[#ff6600]"
          }`}>
            {store.badge}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className="text-[14px] font-bold text-[#1a1c20] truncate">{store.name}</span>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="text-[12px] text-[#555d6d]">{store.rating}</span>
            <span className="text-[11px] text-[#b0b3ba] ml-0.5">({store.reviewCount})</span>
          </div>
        </div>
        <p className="text-[12px] text-[#868b94] mb-1.5 line-clamp-1">{store.description}</p>
        {store.flashItem && (
          <div className="flex items-center gap-1.5 bg-orange-50 rounded-lg px-2 py-1">
            <Flame className="w-3 h-3 text-[#ff6600] flex-shrink-0" />
            <span className="text-[11px] text-[#ff6600] font-semibold truncate">{store.flashItem}</span>
            <span className="text-[11px] font-bold text-[#ff6600] flex-shrink-0">
              -{discountPct}% {store.flashPrice!.toLocaleString()}원
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

// ── Flash Sale horizontal card ─────────────────────────────────────────────
function FlashCard({ store }: { store: StoreCard }) {
  const discountPct = store.flashOriginal
    ? Math.round((1 - store.flashPrice! / store.flashOriginal) * 100)
    : 0;
  const time = useCountdownToHour(store.closeHour);
  return (
    <Link to={`/store/${store.id}`} className="flex-none w-[160px] bg-white rounded-2xl overflow-hidden shadow-[0px_2px_10px_rgba(0,0,0,0.08)] active:scale-[0.97] transition-transform">
      <div className="relative h-[100px]">
        <img src={store.image} alt={store.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <span className="absolute top-2 left-2 bg-[#ff6600] text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
          -{discountPct}%
        </span>
        <div className="absolute bottom-2 left-2 right-2">
          <p className="text-white text-[12px] font-semibold truncate">{store.name}</p>
        </div>
      </div>
      <div className="p-2.5">
        <p className="text-[12px] font-bold text-[#1a1c20] truncate mb-0.5">{store.flashItem}</p>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[13px] font-black text-[#ff6600]">{store.flashPrice!.toLocaleString()}원</span>
            <span className="text-[10px] text-[#b0b3ba] line-through ml-1">{store.flashOriginal!.toLocaleString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 mt-1.5">
          <Timer className="w-3 h-3 text-[#868b94]" />
          <span className="text-[10px] text-[#868b94] font-mono tabular-nums">{time}</span>
        </div>
      </div>
    </Link>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export function HomePage() {
  const [selectedMarket, setSelectedMarket] = useState<MarketId>("jungang");
  const [selectedCategory, setSelectedCategory] = useState<CategoryLabel>("전체");
  const { totalCount } = useCart();

  const marketInfo = MARKETS.find((m) => m.id === selectedMarket)!;

  const flashStores = ALL_STORES.filter(
    (s) => s.marketId === selectedMarket && s.badge === "마감할인" && s.flashItem,
  );

  const filteredStores = ALL_STORES.filter((s) => {
    const marketMatch = s.marketId === selectedMarket;
    const catMatch = selectedCategory === "전체" || s.category === selectedCategory;
    return marketMatch && catMatch;
  });

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-20">

      {/* ── Sticky header ── */}
      <div className="sticky top-0 bg-white z-10 border-b border-[rgba(0,0,0,0.06)]">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[11px] text-[#868b94] tracking-wide">천안 스마트 장보기</p>
              <h1 className="text-[18px] font-bold text-[#1a1c20] tracking-tight">
                {marketInfo.name}
              </h1>
            </div>
            <div className="flex items-center gap-1">
              <Link to="/cart" className="w-10 h-10 flex items-center justify-center relative">
                <ShoppingCart className="w-[20px] h-[20px] text-[#555d6d]" />
                {totalCount > 0 && (
                  <span className="absolute top-1 right-0.5 bg-[#ff6600] text-white text-[10px] min-w-[16px] h-4 rounded-full flex items-center justify-center px-1">
                    {totalCount}
                  </span>
                )}
              </Link>
              <button className="w-10 h-10 flex items-center justify-center relative">
                <Bell className="w-[20px] h-[20px] text-[#555d6d]" />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#ff6600] rounded-full" />
              </button>
            </div>
          </div>

          {/* Search */}
          <Link
            to="/map"
            className="flex items-center gap-2 bg-[#f7f8f9] border border-[#dcdee3] rounded-xl px-3 h-10"
          >
            <Search className="w-4 h-4 text-[#b0b3ba] flex-shrink-0" />
            <span className="text-[14px] text-[#b0b3ba]">시장, 가게, 상품 검색</span>
          </Link>
        </div>

        {/* Market tabs */}
        <div className="flex px-4 pb-2 gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {MARKETS.map((m) => (
            <button
              key={m.id}
              onClick={() => { setSelectedMarket(m.id); setSelectedCategory("전체"); }}
              className={`flex-none px-4 h-8 rounded-[9999px] text-[13px] font-semibold transition-colors ${
                selectedMarket === m.id
                  ? "bg-[#ff6600] text-white"
                  : "bg-[#f7f8f9] text-[#555d6d]"
              }`}
            >
              {m.short}
            </button>
          ))}
          <div className="flex items-center ml-auto flex-none">
            <Link to="/map" className="flex items-center gap-1 text-[12px] text-[#868b94]">
              <MapPin className="w-3.5 h-3.5" />지도
            </Link>
          </div>
        </div>
      </div>

      {/* ── Category filter ── */}
      <div className="bg-white border-b border-[rgba(0,0,0,0.06)]">
        <div className="flex px-4 py-3 gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map(({ label, Icon }) => (
            <button
              key={label}
              onClick={() => setSelectedCategory(label)}
              className={`flex-none flex items-center gap-1.5 px-3 h-8 rounded-[9999px] text-[12px] font-medium transition-colors border ${
                selectedCategory === label
                  ? "bg-[#ff6600] text-white border-[#ff6600]"
                  : "bg-white text-[#555d6d] border-[#dcdee3]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5">

        {/* ── Flash Sale section ── */}
        {flashStores.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#ff6600] rounded-xl flex items-center justify-center">
                  <Flame className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-[#1a1c20] leading-tight">오늘의 마감할인</h2>
                  <div className="flex items-center gap-1 text-[11px] text-[#868b94]">
                    <Timer className="w-3 h-3" />
                    <span>마감까지&nbsp;</span>
                    <FlashTimer />
                  </div>
                </div>
              </div>
              <Link to="/map" className="flex items-center gap-0.5 text-[12px] text-[#868b94]">
                전체 <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {flashStores.map((s) => (
                <FlashCard key={s.id} store={s} />
              ))}
            </div>
          </section>
        )}

        {/* ── Store list ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold text-[#1a1c20]">
              {selectedCategory === "전체"
                ? `${marketInfo.short} 전체 가게`
                : `${marketInfo.short} ${selectedCategory}`}
              <span className="ml-1.5 text-[13px] font-normal text-[#868b94]">
                {filteredStores.length}곳
              </span>
            </h2>
            <Link to="/map" className="flex items-center gap-0.5 text-[12px] text-[#868b94]">
              지도보기 <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {filteredStores.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[14px] text-[#868b94]">
                {selectedCategory} 가게가 아직 없어요
              </p>
              <button
                onClick={() => setSelectedCategory("전체")}
                className="mt-3 text-[13px] text-[#ff6600] font-semibold"
              >
                전체 보기
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredStores.map((s) => (
                <StoreListCard key={s.id} store={s} />
              ))}
            </div>
          )}
        </section>

        {/* ── Market info footer ── */}
        <section className="bg-white rounded-2xl p-4 border border-[rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-4 h-4 text-[#ff6600]" />
            <span className="text-[13px] font-semibold text-[#1a1c20]">{marketInfo.name} 안내</span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-[#868b94] mb-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>{marketInfo.location}</span>
          </div>
          <Link
            to={`/map?market=${selectedMarket}`}
            className="mt-3 flex items-center justify-center gap-1.5 w-full py-2.5 bg-[#1a1c20] text-white rounded-[9999px] text-[13px] font-semibold active:bg-black transition-colors"
          >
            <MapPin className="w-4 h-4" />
            지도에서 가게 찾기
          </Link>
        </section>
      </div>

      <BottomNav />
    </div>
  );
}
