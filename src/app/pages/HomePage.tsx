import { useState } from "react";
import { Link } from "react-router";
import { Bell, MapPin, Store, ChevronRight, Clock, Tag, ShoppingCart } from "lucide-react";
import { useCart } from "../components/CartContext";
import { BottomNav } from "../components/BottomNav";

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
    { id: 1, title: "먹고 걷고, 데이트까지", image: "https://images.unsplash.com/photo-1662525194400-3c516a92a148?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBzdHJlZXQlMjBmb29kJTIwbWFya2V0fGVufDF8fHx8MTc3NDc4NjE5OHww&ixlib=rb-4.1.0&q=80&w=1080" },
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
  const { totalCount } = useCart();

  const selectedMarket = markets.find((m) => m.id === selectedMarketId)!;
  const spots = spotsByMarket[selectedMarketId];
  const courses = coursesByMarket[selectedMarketId];

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-gray-400 tracking-wide">천안 스마트 장보기</p>
            <h1 className="text-[17px] font-bold text-gray-900 tracking-tight">{selectedMarket.name}</h1>
          </div>
          <div className="flex items-center gap-1">
            <Link to="/cart" className="w-10 h-10 flex items-center justify-center relative">
              <ShoppingCart className="w-[20px] h-[20px] text-gray-600" />
              {totalCount > 0 && (
                <span className="absolute top-1 right-0.5 bg-[#FF6B2B] text-white text-[10px] min-w-[16px] h-4 rounded-full flex items-center justify-center px-1">
                  {totalCount}
                </span>
              )}
            </Link>
            <button className="w-10 h-10 flex items-center justify-center relative">
              <Bell className="w-[20px] h-[20px] text-gray-600" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#FF6B2B] rounded-full" />
            </button>
          </div>
        </div>
      </div>

      {/* Market Selector */}
      <div className="bg-white px-4 pt-4 pb-4 border-b border-gray-100">
        <div className="flex gap-2.5">
          {markets.map((market) => (
            <button
              key={market.id}
              onClick={() => setSelectedMarketId(market.id)}
              className={`flex-1 relative rounded-2xl overflow-hidden h-[96px] transition-all duration-200 ${
                selectedMarketId === market.id
                  ? "ring-2 ring-[#FF6B2B] ring-offset-2 scale-[1.02]"
                  : "opacity-60"
              }`}
            >
              <img src={market.image} alt={market.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-2.5">
                <p className="text-white text-[12px] font-semibold leading-tight">{market.subtitle}</p>
                <p className="text-white/70 text-[10px] mt-0.5">{market.openDays}</p>
              </div>
              {selectedMarketId === market.id && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-[#FF6B2B] rounded-full flex items-center justify-center">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Market Info */}
      <div className="mx-4 mt-3 bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Store className="w-5 h-5 text-[#FF6B2B]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-[15px] font-bold text-gray-900">{selectedMarket.name}</h3>
              <span className="text-[11px] text-[#FF6B2B] bg-orange-50 px-2 py-0.5 rounded-md font-medium">
                {selectedMarket.tag}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[12px] text-gray-400 mb-0.5">
              <MapPin className="w-3 h-3" />{selectedMarket.location}
            </div>
            <div className="flex items-center gap-1 text-[12px] text-gray-400 mb-2">
              <Clock className="w-3 h-3" />{selectedMarket.openDays}
            </div>
            <p className="text-[13px] text-gray-500 leading-relaxed">{selectedMarket.description}</p>
          </div>
        </div>
        <Link
          to={`/map?market=${selectedMarketId}`}
          className="mt-3 flex items-center justify-center gap-1.5 w-full py-2.5 bg-[#FF6B2B] text-white rounded-xl text-[14px] font-semibold active:bg-[#e5601f] transition-colors"
        >
          <MapPin className="w-4 h-4" />
          지도 보기
        </Link>
      </div>

      {/* Main Content */}
      <div className="px-4 pt-5">
        {/* Spots */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold text-gray-900">인기 명소</h2>
            <button className="flex items-center gap-0.5 text-[12px] text-gray-400">
              모두보기 <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {spots.map((spot) => (
              <Link key={spot.id} to="/map" className="flex-none w-[120px]">
                <div className="relative h-[120px] rounded-2xl overflow-hidden mb-1.5">
                  <img src={spot.image} alt={spot.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2 text-white">
                    <p className="text-[12px] font-semibold leading-tight">{spot.name}</p>
                    <p className="text-[10px] opacity-80 mt-0.5 flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5" />{spot.location}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Flash Sale */}
        <div className="bg-gradient-to-r from-[#FF6B2B] to-[#FF8C5A] rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Tag className="w-4 h-4 text-white/80" />
            <span className="text-[14px] font-semibold text-white">마감 할인 알림</span>
          </div>
          <p className="text-[12px] text-white/80 mb-3">
            {selectedMarket.name} 상인들의 오늘 마감 특가를 확인하세요
          </p>
          <Link
            to="/map"
            className="inline-flex items-center gap-1 bg-white text-[#FF6B2B] text-[12px] font-semibold px-3 py-1.5 rounded-lg active:bg-orange-50 transition-colors"
          >
            할인 상품 보기 <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Courses */}
        <div className="mb-4">
          <h2 className="text-[15px] font-bold text-gray-900 mb-3">추천 코스</h2>
          <div className="space-y-2.5">
            {courses.map((course) => (
              <Link key={course.id} to="/map" className="block relative h-[130px] rounded-2xl overflow-hidden">
                <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                  <div className="text-white">
                    <p className="text-[14px] font-semibold">{course.title}</p>
                    <p className="text-[11px] opacity-70 mt-0.5">{selectedMarket.name}</p>
                  </div>
                  <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
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
