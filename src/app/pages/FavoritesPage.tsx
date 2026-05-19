import { useState } from "react";
import { Menu, Bell, Search, Heart, Phone, Navigation, ChevronDown } from "lucide-react";
import { Link } from "react-router";
import { BottomNav } from "../components/BottomNav";
import { SideMenu } from "../components/SideMenu";

interface FavoriteStore {
  id: number;
  name: string;
  badge?: string;
  description: string;
  location: string;
  hours: string;
  image: string;
  phone: string;
}

const INITIAL_FAVORITES: FavoriteStore[] = [
  {
    id: 1,
    name: "통큰족발",
    badge: "알뜰세일",
    description: "막국수와 찰떡궁합 족발의 조화",
    location: "앞 16호",
    hours: "영업시간 12:00 ~ 22:00",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&q=80",
    phone: "02-000-0000",
  },
  {
    id: 2,
    name: "보령수산",
    description: "신선한 해산물",
    location: "앞 44호",
    hours: "영업시간 08:00 ~ 20:00",
    image: "https://images.unsplash.com/photo-1565680018093-ebb6b9ab5460?w=300&q=80",
    phone: "02-000-0001",
  },
  {
    id: 3,
    name: "봉화청과상회",
    description: "싱싱하고 맛있는 과일",
    location: "앞 35호",
    hours: "영업시간 07:00 ~ 18:00",
    image: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=300&q=80",
    phone: "02-000-0002",
  },
  {
    id: 4,
    name: "서울지짐이",
    badge: "인기",
    description: "연중무휴 지역명 맛집",
    location: "앞 22호",
    hours: "영업시간 12:00 ~ 24:00",
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=300&q=80",
    phone: "02-356-0000",
  },
];

const SORT_OPTIONS = ["최근 등록순", "이름순", "거리순"];

export function FavoritesPage() {
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sortIdx, setSortIdx] = useState(0);
  const [showSort, setShowSort] = useState(false);
  const [favorites, setFavorites] = useState<Set<number>>(
    new Set(INITIAL_FAVORITES.map((s) => s.id))
  );

  const toggleFav = (id: number) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const displayed = INITIAL_FAVORITES.filter(
    (s) =>
      favorites.has(s.id) &&
      (query === "" || s.name.includes(query) || s.description.includes(query))
  );

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-20">
      <SideMenu open={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setSideMenuOpen(true)} className="p-1">
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
          <span className="text-[17px] font-bold text-gray-900">즐겨찾기</span>
          <button className="p-1 relative">
            <Bell className="w-6 h-6 text-gray-700" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#FF6B2B] rounded-full" />
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="bg-white px-4 pt-3 pb-3 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="상품이나 상점을 검색해보세요"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 h-10 bg-gray-100 rounded-xl text-[14px] focus:outline-none focus:ring-1 focus:ring-orange-200"
          />
        </div>
      </div>

      {/* Count + sort */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-[13px] text-gray-500">
          <span className="font-semibold text-gray-900">{displayed.length}개</span>의 상점
        </span>
        <div className="relative">
          <button
            className="flex items-center gap-1 text-[13px] text-gray-600"
            onClick={() => setShowSort((v) => !v)}
          >
            {SORT_OPTIONS[sortIdx]}
            <ChevronDown className="w-4 h-4" />
          </button>
          {showSort && (
            <div className="absolute right-0 top-7 bg-white rounded-xl shadow-lg border border-gray-100 z-10 min-w-[120px] overflow-hidden">
              {SORT_OPTIONS.map((opt, i) => (
                <button
                  key={opt}
                  className={`w-full text-left px-4 py-2.5 text-[13px] ${
                    i === sortIdx ? "text-[#FF6B2B] font-semibold" : "text-gray-700"
                  } active:bg-gray-50`}
                  onClick={() => { setSortIdx(i); setShowSort(false); }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Store list */}
      <div className="px-4 space-y-3">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <Heart className="w-10 h-10 mb-3 text-gray-200" />
            <p className="text-[14px]">즐겨찾기한 가게가 없어요</p>
            <p className="text-[12px] mt-1 text-gray-300">가게 카드의 하트를 눌러 저장하세요</p>
          </div>
        ) : (
          displayed.map((store) => (
            <div key={store.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="flex gap-3 p-3">
                {/* Image */}
                <Link to={`/store/${store.id}`} className="flex-none w-[80px] h-[80px] rounded-xl overflow-hidden">
                  <img src={store.image} alt={store.name} className="w-full h-full object-cover" />
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-1.5">
                      <Link to={`/store/${store.id}`}>
                        <span className="text-[15px] font-bold text-gray-900">{store.name}</span>
                      </Link>
                      {store.badge && (
                        <span className="bg-[#FF6B2B] text-white text-[10px] px-1.5 py-0.5 rounded-md">
                          {store.badge}
                        </span>
                      )}
                    </div>
                    <button onClick={() => toggleFav(store.id)} className="flex-shrink-0 ml-1 p-0.5">
                      <Heart
                        className={`w-5 h-5 ${
                          favorites.has(store.id)
                            ? "fill-[#FF6B2B] text-[#FF6B2B]"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-[12px] text-gray-500 mt-0.5">{store.description}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {store.location} | {store.hours}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 px-3 pb-3">
                <a
                  href={`tel:${store.phone}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-xl text-[13px] text-gray-600 active:bg-gray-50"
                >
                  <Phone className="w-3.5 h-3.5" />
                  전화
                </a>
                <Link
                  to={`/map?store=${encodeURIComponent(store.name)}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-xl text-[13px] text-gray-600 active:bg-gray-50"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  길찾기
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}
