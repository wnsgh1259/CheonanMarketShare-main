import { useState, useEffect } from "react";
import { Link, useParams } from "react-router";
import {
  ChevronLeft, Share2, Heart, MapPin, Clock, Phone,
  Plus, Copy, Navigation, ChevronDown, ChevronUp,
} from "lucide-react";
import { useCart, type CartItem } from "../components/CartContext";
import { MarketConflictModal } from "../components/MarketConflictModal";
import { BottomNav } from "../components/BottomNav";

// ── store data ───────────────────────────────────────────────────
const ALL_STORES = [
  {
    id: 1,
    marketId: "jungang" as const,
    name: "서울지짐이",
    badge: "인기",
    description: "연중무휴 지역 명 맛집. 다양한 전 메뉴가 가득합니다.",
    location: "서울 은평구 불광로 15 18, 앞 56호",
    hours: "12:00 ~ 24:00",
    phone: "02-356-0000",
    payMethods: "지역화폐(지무원) / 소비쿠폰(신용 체크카드) / 제로페이",
    rating: 4.8,
    images: [
      "https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80",
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80",
      "https://images.unsplash.com/photo-1565680018093-ebb6b9ab5460?w=600&q=80",
    ],
    lat: 37.614,
    lng: 126.929,
    specials: [
      { id: "s1-1", name: "삼색전", desc: "파전+김치전+동태전+녹두전", price: 15400, originalPrice: 22000, discount: 30, image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=200&q=80" },
      { id: "s1-2", name: "해물파전", desc: null, price: 15400, originalPrice: 22000, discount: 30, image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&q=80" },
    ],
    menus: [
      { id: "m1-1", name: "모듬전", price: 22000, image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=200&q=80" },
      { id: "m1-2", name: "육전", desc: "배추기무치+소스", price: 21000, image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&q=80" },
      { id: "m1-3", name: "녹두빈대떡", price: 19000, image: "https://images.unsplash.com/photo-1565680018093-ebb6b9ab5460?w=200&q=80" },
    ],
  },
  {
    id: 2,
    marketId: "jungang" as const,
    name: "통큰족발",
    badge: "알뜰세일",
    description: "막국수와 찰떡궁합 족발의 조화",
    location: "앞 16호",
    hours: "12:00 ~ 22:00",
    phone: "02-000-0000",
    payMethods: "현금 / 카드",
    rating: 4.7,
    images: ["https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80"],
    lat: 37.615,
    lng: 126.930,
    specials: [
      { id: "s2-1", name: "족발 세트", desc: "족발+막국수", price: 35000, originalPrice: 42000, discount: 17, image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&q=80" },
    ],
    menus: [
      { id: "m2-1", name: "족발 (소)", price: 32000, image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&q=80" },
      { id: "m2-2", name: "막국수", price: 9000, image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=200&q=80" },
    ],
  },
];

// ── countdown hook ───────────────────────────────────────────────
function useCountdown(initialSeconds: number) {
  const [remaining, setRemaining] = useState(initialSeconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const t = setInterval(() => setRemaining((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [remaining]);

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// ── component ────────────────────────────────────────────────────
export function StoreDetailPage() {
  const { id } = useParams();
  const store = ALL_STORES.find((s) => s.id === Number(id)) ?? ALL_STORES[0];

  const [imageIdx, setImageIdx] = useState(0);
  const [liked, setLiked] = useState(false);
  const [saleOpen, setSaleOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(true);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [pendingItem, setPendingItem] = useState<CartItem | null>(null);
  const { addItem, switchMarketAndAdd } = useCart();
  const countdown = useCountdown(9516); // ~2h 38m 36s

  const handleAddToCart = (item: { id: string; name: string; price: number }) => {
    const cartItem: CartItem = {
      id: item.id,
      name: item.name,
      storeName: store.name,
      storeId: store.id,
      marketId: store.marketId,
      price: item.price,
      quantity: 1,
      image: store.images[0],
    };
    const result = addItem(cartItem);
    if (result === "market_conflict") {
      setPendingItem(cartItem);
      setShowConflictModal(true);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(store.location).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-white pb-24">
      <MarketConflictModal
        open={showConflictModal}
        onConfirm={() => { if (pendingItem) switchMarketAndAdd(pendingItem); setShowConflictModal(false); setPendingItem(null); }}
        onCancel={() => { setShowConflictModal(false); setPendingItem(null); }}
      />

      {/* ── Header ── */}
      <div className="sticky top-0 bg-white z-20 border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/map" className="p-1">
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="text-[16px] font-bold text-gray-900">{store.name}</h1>
          <div className="flex items-center gap-0.5">
            <button className="p-1.5"><Share2 className="w-5 h-5 text-gray-600" /></button>
            <button className="p-1.5" onClick={() => setLiked((v) => !v)}>
              <Heart className={`w-5 h-5 ${liked ? "fill-[#FF6B2B] text-[#FF6B2B]" : "text-gray-600"}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Image slider ── */}
      <div className="relative bg-black overflow-hidden" style={{ height: 240 }}>
        <img
          src={store.images[imageIdx]}
          alt={store.name}
          className="w-full h-full object-cover"
        />
        {/* dots */}
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
          {store.images.map((_, i) => (
            <button
              key={i}
              onClick={() => setImageIdx(i)}
              className={`rounded-full transition-all ${
                i === imageIdx ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
        {/* counter */}
        <div className="absolute top-3 right-3 bg-black/40 text-white text-[11px] px-2 py-0.5 rounded-full">
          {imageIdx + 1}/{store.images.length}
        </div>
      </div>

      {/* ── Flash sale timer ── */}
      {store.specials.length > 0 && (
        <div className="bg-[#FF6B2B] px-4 py-2.5 flex items-center justify-center gap-2">
          <span className="text-white text-[12px]">알뜰 판매 목록 확인 :</span>
          <span className="text-white font-bold text-[14px] tabular-nums">{countdown} 남음</span>
        </div>
      )}

      {/* ── Store info ── */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-[20px] font-bold text-gray-900">{store.name}</h2>
          {store.badge && (
            <span className="bg-[#FF6B2B] text-white text-[11px] px-2 py-0.5 rounded-md">{store.badge}</span>
          )}
        </div>
        <div className="space-y-1.5 text-[13px] text-gray-500">
          <div className="flex items-start gap-2">
            <span className="text-gray-400 w-10 flex-shrink-0">주소</span>
            <span>{store.location}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-gray-400 w-10 flex-shrink-0">전화번호</span>
            <span>{store.phone}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-gray-400 w-10 flex-shrink-0">영업시간</span>
            <span>{store.hours}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-gray-400 w-10 flex-shrink-0">유형</span>
            <span>연중무휴 (지무원)</span>
          </div>
          {store.payMethods && (
            <div className="flex items-start gap-2">
              <span className="text-gray-400 w-10 flex-shrink-0">결제수단</span>
              <span className="flex-1">{store.payMethods}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── 알뜰세일 section ── */}
      {store.specials.length > 0 && (
        <div className="border-b border-gray-100">
          <button
            className="w-full flex items-center justify-between px-4 py-3.5"
            onClick={() => setSaleOpen((v) => !v)}
          >
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-bold text-gray-900">알뜰세일</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-[#FF6B2B] animate-pulse" />
                <span className="text-[11px] text-[#FF6B2B] font-medium">진행중</span>
              </div>
            </div>
            {saleOpen
              ? <ChevronUp className="w-5 h-5 text-gray-400" />
              : <ChevronDown className="w-5 h-5 text-gray-400" />
            }
          </button>
          {saleOpen && (
            <div className="px-4 pb-4 space-y-3">
              {store.specials.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="w-[72px] h-[72px] rounded-xl overflow-hidden flex-shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-gray-900">{item.name}</p>
                    {item.desc && <p className="text-[11px] text-gray-400 mt-0.5">{item.desc}</p>}
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[12px] font-bold text-[#FF6B2B]">{item.discount}%</span>
                      <span className="text-[15px] font-bold text-gray-900">{item.price.toLocaleString()}원</span>
                      <span className="text-[12px] text-gray-400 line-through">{item.originalPrice.toLocaleString()}원</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddToCart(item)}
                    className="w-9 h-9 rounded-xl bg-[#FF6B2B] text-white flex items-center justify-center flex-shrink-0 active:bg-[#e5601f]"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 일반상품 section ── */}
      <div className="border-b border-gray-100">
        <button
          className="w-full flex items-center justify-between px-4 py-3.5"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="text-[16px] font-bold text-gray-900">일반상품</span>
          {menuOpen
            ? <ChevronUp className="w-5 h-5 text-gray-400" />
            : <ChevronDown className="w-5 h-5 text-gray-400" />
          }
        </button>
        {menuOpen && (
          <div className="px-4 pb-4 space-y-3">
            {store.menus.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="w-[72px] h-[72px] rounded-xl overflow-hidden flex-shrink-0">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-gray-900">{item.name}</p>
                  {"desc" in item && item.desc && (
                    <p className="text-[11px] text-gray-400 mt-0.5">{(item as { desc?: string }).desc}</p>
                  )}
                  <p className="text-[15px] font-bold text-gray-900 mt-1">{item.price.toLocaleString()}원</p>
                </div>
                <button
                  onClick={() => handleAddToCart(item)}
                  className="w-9 h-9 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center flex-shrink-0 active:bg-gray-200"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Map preview ── */}
      <div className="px-4 py-4">
        <h3 className="text-[15px] font-bold text-gray-900 mb-3">지도</h3>
        <div className="w-full h-[140px] bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center relative">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100" />
          <div className="relative flex flex-col items-center gap-1 text-gray-500">
            <MapPin className="w-8 h-8 text-[#FF6B2B]" />
            <p className="text-[12px]">{store.location}</p>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex gap-3 mt-3">
          <button
            onClick={copyAddress}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 border border-gray-300 rounded-xl text-[14px] font-semibold text-gray-700 active:bg-gray-50"
          >
            <Copy className="w-4 h-4" />
            주소 복사
          </button>
          <Link
            to={`/map?store=${encodeURIComponent(store.name)}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-[#FF6B2B] rounded-xl text-[14px] font-semibold text-white active:bg-[#e5601f]"
          >
            <Navigation className="w-4 h-4" />
            길찾기
          </Link>
        </div>

        {/* Phone + Hours row */}
        <div className="flex gap-3 mt-2">
          <a
            href={`tel:${store.phone}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-gray-200 rounded-xl text-[13px] text-gray-600 active:bg-gray-50"
          >
            <Phone className="w-4 h-4" />
            {store.phone}
          </a>
          <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gray-50 rounded-xl text-[13px] text-gray-500">
            <Clock className="w-4 h-4" />
            {store.hours}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
