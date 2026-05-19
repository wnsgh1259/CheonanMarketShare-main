import { useState } from "react";
import { Link } from "react-router";
import { Bell, ChevronRight, Heart, Menu } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { SideMenu } from "../components/SideMenu";

// ── category icons ──────────────────────────────────────────────
const CATEGORIES = [
  { label: "시장아이스크림", emoji: "🍦" },
  { label: "전통과자", emoji: "🍘" },
  { label: "육류", emoji: "🥩" },
  { label: "수산", emoji: "🐟" },
  { label: "채소", emoji: "🥬" },
  { label: "국수", emoji: "🍜" },
  { label: "한식", emoji: "🍱" },
  { label: "분식", emoji: "🥞" },
];

// ── popular stores ───────────────────────────────────────────────
const POPULAR_STORES = [
  { id: 1, name: "통큰족발", badge: "알뜰세일", category: "한식", location: "앞 16호", image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&q=80" },
  { id: 2, name: "보령수산", badge: null, category: "수산", location: "앞 44호", image: "https://images.unsplash.com/photo-1565680018093-ebb6b9ab5460?w=300&q=80" },
  { id: 3, name: "봉화청과상회", badge: null, category: "채소", location: "앞 35호", image: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=300&q=80" },
  { id: 4, name: "서울지짐이", badge: "인기", category: "한식", location: "앞 22호", image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=300&q=80" },
];

// ── community posts ──────────────────────────────────────────────
const COMMUNITY_POSTS = [
  { id: 1, author: "김민준", time: "3시간 전", title: "통큰족발 오늘도 대박이에요", preview: "막국수와 찰떡궁합 족발의 조화...", image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&q=80" },
  { id: 2, author: "이수진", time: "5시간 전", title: "보령수산 신선도 최고!", preview: "오늘 새벽에 들어온 광어 회...", image: "https://images.unsplash.com/photo-1565680018093-ebb6b9ab5460?w=200&q=80" },
  { id: 3, author: "박지영", time: "어제", title: "봄 채소 다 들어왔어요", preview: "봄나물 종류가 정말 다양해요...", image: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200&q=80" },
];

// ── nearby spots ─────────────────────────────────────────────────
const NEARBY_SPOTS = [
  { id: 1, name: "독립기념관", image: "https://images.unsplash.com/photo-1590677197221-43af4beba05e?w=300&q=80" },
  { id: 2, name: "유관순 열사 사적지", image: "https://images.unsplash.com/photo-1617369120004-4fc70312c5e6?w=300&q=80" },
  { id: 3, name: "각원사", image: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=300&q=80" },
];

export function HomePage() {
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [likedStores, setLikedStores] = useState<Set<number>>(new Set());

  const toggleLike = (id: number) => {
    setLikedStores((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-20">
      <SideMenu open={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />

      {/* ── Header ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setSideMenuOpen(true)} className="p-1">
            <Menu className="w-6 h-6 text-gray-700" />
          </button>

          {/* Logo */}
          <span className="text-[20px] font-black text-[#FF6B2B] tracking-tight">천안시장</span>

          <button className="p-1 relative">
            <Bell className="w-6 h-6 text-gray-700" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#FF6B2B] rounded-full" />
          </button>
        </div>
      </div>

      {/* ── Category icons ── */}
      <div className="bg-white pt-4 pb-3 px-2">
        <div className="grid grid-cols-4 gap-y-4">
          {CATEGORIES.map((cat) => (
            <Link key={cat.label} to="/map" className="flex flex-col items-center gap-1.5">
              <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center text-[26px]">
                {cat.emoji}
              </div>
              <span className="text-[11px] text-gray-600 text-center leading-tight">{cat.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Popular stores banner ── */}
      <div className="px-4 mt-3">
        <div className="bg-[#FF6B2B] rounded-2xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-white text-[13px] opacity-80">기간 내 신규회원</p>
            <p className="text-white text-[16px] font-bold">쿠폰+상품 할인 혜택</p>
          </div>
          <button className="bg-white/20 text-white text-[12px] px-3 py-1.5 rounded-lg">
            확인하기
          </button>
        </div>
      </div>

      {/* ── 인기 가게들 ── */}
      <div className="mt-5 px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-gray-900">천안 인기 가게들 🔥</h2>
          <Link to="/map" className="flex items-center text-[12px] text-gray-400">
            모두보기 <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {POPULAR_STORES.map((store) => (
            <Link
              key={store.id}
              to={`/store/${store.id}`}
              className="flex-none w-[150px] bg-white rounded-2xl overflow-hidden shadow-sm"
            >
              <div className="relative h-[100px]">
                <img src={store.image} alt={store.name} className="w-full h-full object-cover" />
                {store.badge && (
                  <span className="absolute top-2 left-2 bg-[#FF6B2B] text-white text-[10px] px-1.5 py-0.5 rounded-md">
                    {store.badge}
                  </span>
                )}
                <button
                  className="absolute top-2 right-2"
                  onClick={(e) => { e.preventDefault(); toggleLike(store.id); }}
                >
                  <Heart
                    className={`w-4 h-4 ${likedStores.has(store.id) ? "fill-[#FF6B2B] text-[#FF6B2B]" : "text-white"}`}
                    strokeWidth={2}
                  />
                </button>
              </div>
              <div className="px-2.5 py-2">
                <p className="text-[13px] font-semibold text-gray-900 truncate">{store.name}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{store.location} · 영업중</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── 지금 천안 사람들 ── */}
      <div className="mt-5 px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-gray-900">지금 천안 사람들 💬</h2>
          <Link to="/community" className="flex items-center text-[12px] text-gray-400">
            모두보기 <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {COMMUNITY_POSTS.map((post) => (
            <Link
              key={post.id}
              to={`/post/${post.id}`}
              className="flex-none w-[130px]"
            >
              <div className="relative h-[100px] rounded-xl overflow-hidden mb-1.5">
                <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-1.5 left-2 right-2">
                  <p className="text-white text-[11px] font-medium leading-tight line-clamp-2">{post.title}</p>
                </div>
              </div>
              <p className="text-[10px] text-gray-400">{post.author} · {post.time}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* ── 할뜰세일 배너 ── */}
      <div className="mx-4 mt-4 bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3 flex items-center gap-3">
        <span className="text-[28px]">🏷️</span>
        <div className="flex-1">
          <p className="text-[13px] font-bold text-[#FF6B2B]">알뜰 넘지마 대 아요</p>
          <p className="text-[11px] text-gray-500">오늘의 마감 특가 상품을 확인하세요</p>
        </div>
        <Link to="/map" className="bg-[#FF6B2B] text-white text-[11px] px-3 py-1.5 rounded-lg whitespace-nowrap">
          보러가기
        </Link>
      </div>

      {/* ── 근처 명소 ── */}
      <div className="mt-5 px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-gray-900">천안 근처 명소</h2>
          <Link to="/community" className="flex items-center text-[12px] text-gray-400">
            모두보기 <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NEARBY_SPOTS.map((spot) => (
            <Link key={spot.id} to="/community" className="flex-none">
              <div className="relative w-[140px] h-[90px] rounded-xl overflow-hidden">
                <img src={spot.image} alt={spot.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <p className="absolute bottom-2 left-2 text-white text-[12px] font-medium">{spot.name}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── 이벤트 배너 ── */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden relative h-[140px] mb-4">
        <img
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80"
          alt="떡볶이 페스타"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/20" />
        <div className="absolute inset-0 px-4 py-4 flex flex-col justify-between">
          <span className="bg-[#FF6B2B] text-white text-[10px] px-2 py-0.5 rounded self-start">이벤트</span>
          <div>
            <p className="text-white/80 text-[12px]">이번 주말 천안시장 곳곳에</p>
            <p className="text-white text-[17px] font-bold">'떡볶이 페스타'</p>
            <button
              onClick={() => {}}
              className="mt-2 bg-[#FF6B2B] text-white text-[13px] font-semibold px-5 py-2 rounded-xl"
            >
              축제 바로가기
            </button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
