import { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router";
import {
  ChevronLeft, Share2, Heart, MapPin, ShoppingCart,
  Clock, Phone, Plus, Star, Flame, Timer, CheckCircle2,
  ChevronDown, MessageCircle,
} from "lucide-react";
import { useCart, type CartItem } from "../components/CartContext";
import { MarketConflictModal } from "../components/MarketConflictModal";
import { BottomNav } from "../components/BottomNav";

// ── Store data ─────────────────────────────────────────────────────────────
const ALL_STORES = [
  {
    id: 1, marketId: "jungang" as const, name: "천안순대국밥", badge: "인기",
    description: "천안 대표 순대국밥 맛집. 진한 국물과 푸짐한 양이 인기!",
    location: "중앙시장 1동 12호", hours: "07:00 - 20:00", closeHour: 20,
    phone: "041-555-1234", rating: 4.8, reviewCount: 312,
    images: ["https://images.unsplash.com/photo-1769558688746-7ac36d8ce999?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800"],
    specials: [{ id: "j1-3", name: "모듬순대", desc: "순대+머리고기+내장 세트", price: 15000, originalPrice: 18000, discount: 17 }],
    menus: [
      { id: "j1-1", name: "순대국밥", desc: "진한 사골 육수 순대국밥", price: 9000 },
      { id: "j1-2", name: "얼큰순대국", desc: "매콤한 순대국", price: 10000 },
    ],
    reviews: [
      { author: "김**", rating: 5, text: "국물이 진하고 맛있어요! 양도 푸짐해서 자주 옵니다.", date: "2일 전" },
      { author: "이**", rating: 5, text: "천안 오면 꼭 들르는 곳. 순대 탱탱하고 맛있어요.", date: "5일 전" },
      { author: "박**", rating: 4, text: "맛있는데 점심시간엔 좀 기다려야 해요.", date: "1주 전" },
    ],
  },
  {
    id: 2, marketId: "jungang" as const, name: "호두과자 본점", badge: "마감할인",
    description: "천안 명물 호두과자! 갓 구운 바삭한 호두과자를 맛보세요.",
    location: "중앙시장 2동 5호", hours: "09:00 - 21:00", closeHour: 21,
    phone: "041-555-2345", rating: 4.9, reviewCount: 521,
    images: ["https://images.unsplash.com/photo-1760020890915-ca605575b93b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800"],
    specials: [{ id: "j2-2", name: "호두과자 2봉 세트", desc: "오늘만 특가!", price: 7000, originalPrice: 8000, discount: 13 }],
    menus: [
      { id: "j2-1", name: "호두과자 1봉 (15개)", desc: "갓 구운 호두과자", price: 4000 },
      { id: "j2-3", name: "미니 호두과자 (30개)", desc: "작고 바삭한 미니 사이즈", price: 6000 },
    ],
    reviews: [
      { author: "최**", rating: 5, text: "천안 여행 와서 꼭 사가는 곳! 따뜻할 때 먹으면 최고예요.", date: "1일 전" },
      { author: "정**", rating: 5, text: "선물용으로도 좋아요. 포장도 이쁩니다.", date: "3일 전" },
    ],
  },
  {
    id: 3, marketId: "jungang" as const, name: "중앙칼국수", badge: "",
    description: "수제면으로 만든 진한 멸치 육수 칼국수가 일품!",
    location: "중앙시장 3동 8호", hours: "10:00 - 19:00", closeHour: 19,
    phone: "041-555-3456", rating: 4.6, reviewCount: 188,
    images: ["https://images.unsplash.com/photo-1747228469031-c5fc60b9d9f9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800"],
    specials: [],
    menus: [
      { id: "j3-1", name: "칼국수", desc: "수제면 멸치 육수", price: 8000 },
      { id: "j3-2", name: "수제비", desc: "구수한 수제비", price: 8000 },
      { id: "j3-3", name: "만두 (8개)", desc: "손만두", price: 6000 },
    ],
    reviews: [{ author: "강**", rating: 5, text: "면이 정말 쫄깃해요. 국물도 깔끔하고요.", date: "4일 전" }],
  },
  {
    id: 4, marketId: "jungang" as const, name: "신선정육점", badge: "",
    description: "당일 도축 신선한 한우·돼지고기 전문점",
    location: "중앙시장 1동 34호", hours: "07:00 - 18:00", closeHour: 18,
    phone: "041-555-4567", rating: 4.5, reviewCount: 97,
    images: ["https://images.unsplash.com/photo-1758788701706-327f3a0d6820?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800"],
    specials: [{ id: "j4-3", name: "계란 30구", desc: "마감 특가", price: 7500, originalPrice: 9000, discount: 17 }],
    menus: [
      { id: "j4-1", name: "한우 등심 200g", desc: "1++ 등급", price: 25000 },
      { id: "j4-2", name: "돼지 삼겹살 500g", desc: "국내산", price: 12000 },
    ],
    reviews: [{ author: "윤**", rating: 5, text: "신선도가 정말 좋아요. 당일 도축이라 믿을 수 있어요.", date: "2일 전" }],
  },
  {
    id: 5, marketId: "jungang" as const, name: "싱싱채소마트", badge: "마감할인",
    description: "산지직송 신선 채소 전문. 매일 새벽 입고!",
    location: "중앙시장 4동 2호", hours: "06:00 - 17:00", closeHour: 17,
    phone: "041-555-5678", rating: 4.3, reviewCount: 75,
    images: ["https://images.unsplash.com/photo-1759663783570-520674af30d6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800"],
    specials: [{ id: "j5-2", name: "양파 3kg", desc: "마감 특가", price: 4500, originalPrice: 6000, discount: 25 }],
    menus: [
      { id: "j5-1", name: "대파 1단", desc: "국내산", price: 2500 },
      { id: "j5-3", name: "감자 2kg", desc: "강원도산", price: 5000 },
    ],
    reviews: [{ author: "한**", rating: 4, text: "채소가 정말 신선해요. 새벽에 입고해서 아침 일찍 사야 해요.", date: "6일 전" }],
  },
];

// ── Countdown ──────────────────────────────────────────────────────────────
function useCountdown(targetHour: number) {
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

// ── Toast component ────────────────────────────────────────────────────────
function CartToast({ name, onDone }: { name: string; onDone: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDone, 2200);
    return () => clearTimeout(id);
  }, [onDone]);
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center gap-2 bg-[#1a1c20] text-white text-[13px] font-medium px-4 py-3 rounded-2xl shadow-xl whitespace-nowrap">
        <CheckCircle2 className="w-4 h-4 text-[#ff6600] flex-shrink-0" />
        <span><span className="font-bold">{name}</span>을(를) 담았어요</span>
        <Link to="/cart" className="ml-1 text-[#ff6600] font-bold underline underline-offset-2">
          보기
        </Link>
      </div>
    </div>
  );
}

// ── Review stars ───────────────────────────────────────────────────────────
function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-3 h-3 ${i <= rating ? "text-amber-400 fill-amber-400" : "text-[#dcdee3]"}`} />
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export function StoreDetailPage() {
  const { id } = useParams();
  const [specialsOpen, setSpecialsOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(true);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [pendingItem, setPendingItem] = useState<CartItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { addItem, switchMarketAndAdd, totalCount } = useCart();

  const store = ALL_STORES.find((s) => s.id === Number(id)) ?? ALL_STORES[0];
  const countdown = useCountdown(store.closeHour);
  const isFlash = store.badge === "마감할인";

  const handleAddToCart = (menu: { id: string; name: string; price: number }) => {
    const item: CartItem = {
      id: menu.id, name: menu.name, storeName: store.name, storeId: store.id,
      marketId: store.marketId, price: menu.price, quantity: 1, image: store.images[0],
    };
    const result = addItem(item);
    if (result === "market_conflict") {
      setPendingItem(item);
      setShowConflictModal(true);
    } else {
      setToast(menu.name);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-24">
      {toast && <CartToast name={toast} onDone={() => setToast(null)} />}

      <MarketConflictModal
        open={showConflictModal}
        onConfirm={() => {
          if (pendingItem) { switchMarketAndAdd(pendingItem); setToast(pendingItem.name); }
          setShowConflictModal(false); setPendingItem(null);
        }}
        onCancel={() => { setShowConflictModal(false); setPendingItem(null); }}
      />

      {/* ── Header ── */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/home" className="p-1">
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="text-[15px] font-semibold text-gray-900">{store.name}</h1>
          <div className="flex items-center gap-0.5">
            <Link to="/cart" className="p-1 relative">
              <ShoppingCart className="w-5 h-5 text-gray-600" />
              {totalCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#ff6600] text-white text-[10px] min-w-[16px] h-4 rounded-full flex items-center justify-center px-1">
                  {totalCount}
                </span>
              )}
            </Link>
            <button className="p-1"><Share2 className="w-5 h-5 text-gray-600" /></button>
            <button className="p-1"><Heart className="w-5 h-5 text-gray-600" /></button>
          </div>
        </div>
      </div>

      {/* ── Hero image ── */}
      <div className="relative h-56">
        <img src={store.images[0]} alt={store.name} className="w-full h-full object-cover" />
        {isFlash && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#ff6600]" />
              <span className="text-white text-[13px] font-semibold">마감할인 진행 중</span>
              <div className="flex items-center gap-1 bg-black/40 rounded-lg px-2 py-0.5 ml-auto">
                <Timer className="w-3.5 h-3.5 text-white/80" />
                <span className="text-white font-mono text-[12px] tabular-nums">{countdown}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Store info ── */}
      <div className="bg-white px-4 py-4 border-b border-gray-100">
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[18px] font-bold text-gray-900">{store.name}</h2>
            {store.badge && (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                store.badge === "마감할인" ? "bg-[#ff6600] text-white" : "bg-orange-50 text-[#ff6600]"
              }`}>
                {store.badge}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-[14px] font-bold text-gray-900">{store.rating}</span>
            <span className="text-[12px] text-gray-400">({store.reviewCount})</span>
          </div>
        </div>

        <p className="text-[13px] text-gray-500 mb-3">{store.description}</p>

        <div className="space-y-1.5 text-[12px] text-gray-400 mb-3">
          <div className="flex items-center gap-2"><MapPin className="w-4 h-4 flex-shrink-0" />{store.location}</div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>{store.hours}</span>
            {isFlash && (
              <span className="ml-auto font-mono text-[#ff6600] font-semibold tabular-nums">{countdown}</span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#f7f8f9] border border-[#dcdee3] rounded-xl text-[13px] text-gray-600 font-medium">
            <Phone className="w-4 h-4" />{store.phone}
          </button>
          <Link
            to={`/map`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#f7f8f9] border border-[#dcdee3] rounded-xl text-[13px] text-gray-600 font-medium"
          >
            <MapPin className="w-4 h-4" />길찾기
          </Link>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#f7f8f9] border border-[#dcdee3] rounded-xl text-[13px] text-gray-600 font-medium">
            <MessageCircle className="w-4 h-4" />문의
          </button>
        </div>
      </div>

      {/* ── Flash specials ── */}
      {store.specials.length > 0 && (
        <div className="bg-white border-b border-gray-100 mt-2">
          <button
            onClick={() => setSpecialsOpen(!specialsOpen)}
            className="w-full px-4 py-3.5 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#ff6600]" />
              <span className="text-[14px] font-bold text-gray-900">마감 할인</span>
              <span className="text-[11px] bg-[#ff6600] text-white px-1.5 py-0.5 rounded-md font-bold">
                {store.specials.length}
              </span>
            </div>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${specialsOpen ? "rotate-180" : ""}`} />
          </button>
          {specialsOpen && (
            <div className="px-4 pb-4 space-y-3">
              {store.specials.map((item) => (
                <div key={item.id} className="flex items-center gap-3 bg-orange-50 rounded-2xl p-3">
                  <div className="flex-1">
                    <h4 className="text-[14px] font-bold text-gray-900 mb-0.5">{item.name}</h4>
                    {item.desc && <p className="text-[12px] text-gray-400 mb-1">{item.desc}</p>}
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] bg-[#ff6600] text-white px-1.5 py-0.5 rounded font-bold">-{item.discount}%</span>
                      <span className="text-[15px] font-black text-[#ff6600]">{item.price.toLocaleString()}원</span>
                      <span className="text-[12px] text-gray-400 line-through">{item.originalPrice.toLocaleString()}원</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddToCart(item)}
                    className="w-10 h-10 rounded-xl bg-[#ff6600] text-white flex items-center justify-center active:bg-[#e5601f] transition-colors shadow-md flex-shrink-0"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Regular menu ── */}
      <div className="bg-white border-b border-gray-100 mt-2">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-full px-4 py-3.5 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold text-gray-900">전체 메뉴</span>
            <span className="text-[11px] bg-[#1a1c20] text-white px-1.5 py-0.5 rounded-md font-bold">
              {store.menus.length}
            </span>
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`} />
        </button>
        {menuOpen && (
          <div className="px-4 pb-4 space-y-2">
            {store.menus.map((item) => (
              <div key={item.id} className="flex items-center gap-3 bg-[#f7f8f9] rounded-2xl p-3">
                <div className="flex-1">
                  <h4 className="text-[14px] font-semibold text-gray-900 mb-0.5">{item.name}</h4>
                  {item.desc && <p className="text-[12px] text-gray-400 mb-1">{item.desc}</p>}
                  <span className="text-[14px] font-bold text-gray-900">{item.price.toLocaleString()}원</span>
                </div>
                <button
                  onClick={() => handleAddToCart(item)}
                  className="w-10 h-10 rounded-xl bg-[#1a1c20] text-white flex items-center justify-center active:bg-black transition-colors flex-shrink-0"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Reviews ── */}
      {store.reviews.length > 0 && (
        <div className="bg-white border-b border-gray-100 mt-2">
          <button
            onClick={() => setReviewsOpen(!reviewsOpen)}
            className="w-full px-4 py-3.5 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-[14px] font-bold text-gray-900">리뷰</span>
              <span className="text-[11px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md font-bold">
                {store.reviewCount}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="text-[13px] font-bold text-gray-900">{store.rating}</span>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${reviewsOpen ? "rotate-180" : ""}`} />
            </div>
          </button>
          {reviewsOpen && (
            <div className="px-4 pb-4 space-y-3">
              {store.reviews.map((review, i) => (
                <div key={i} className="bg-[#f7f8f9] rounded-2xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-[#dcdee3] rounded-full flex items-center justify-center text-[11px] font-bold text-[#555d6d]">
                        {review.author[0]}
                      </div>
                      <span className="text-[13px] font-semibold text-gray-700">{review.author}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Stars rating={review.rating} />
                      <span className="text-[11px] text-gray-400">{review.date}</span>
                    </div>
                  </div>
                  <p className="text-[13px] text-gray-600 leading-relaxed">{review.text}</p>
                </div>
              ))}
              <button className="w-full py-2.5 border border-[#dcdee3] rounded-xl text-[13px] text-[#555d6d] font-medium">
                리뷰 {store.reviewCount}개 전체보기
              </button>
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
