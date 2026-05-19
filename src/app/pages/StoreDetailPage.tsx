import { useState } from "react";
import { Link, useParams } from "react-router";
import { ChevronLeft, ChevronDown, Share2, Heart, MapPin, ShoppingCart, Clock, Phone, Plus, Star, MessageCircle } from "lucide-react";
import { useCart, type CartItem } from "../components/CartContext";
import { MarketConflictModal } from "../components/MarketConflictModal";
import { BottomNav } from "../components/BottomNav";

const ALL_STORES = [
  { id: 1, marketId: "jungang" as const, name: "천안순대국밥", badge: "인기", description: "천안 대표 순대국밥 맛집. 진한 국물과 푸짐한 양이 인기!", location: "중앙시장 1동 12호", hours: "07:00 - 20:00", phone: "041-555-1234", rating: 4.8, images: ["https://images.unsplash.com/photo-1769558688746-7ac36d8ce999?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBzaWRlJTIwZGlzaGVzJTIwYmFuY2hhbnxlbnwxfHx8fDE3NzQ4MDI1NTF8MA&ixlib=rb-4.1.0&q=80&w=1080"], specials: [{ id: "j1-3", name: "모듬순대", desc: "순대+머리고기+내장 세트", price: 15000, originalPrice: 18000, discount: 17 }], menus: [{ id: "j1-1", name: "순대국밥", desc: "진한 사골 육수 순대국밥", price: 9000 }, { id: "j1-2", name: "얼큰순대국", desc: "매콤한 순대국", price: 10000 }] },
  { id: 2, marketId: "jungang" as const, name: "호두과자 본점", badge: "마감할인", description: "천안 명물 호두과자! 갓 구운 바삭한 호두과자를 맛보세요.", location: "중앙시장 2동 5호", hours: "09:00 - 21:00", phone: "041-555-2345", rating: 4.9, images: ["https://images.unsplash.com/photo-1760020890915-ca605575b93b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjB0dGVva2Jva2tpJTIwZnJpZWQlMjBmb29kJTIwc25hY2slMjBiYXJ8ZW58MXx8fHwxNzc0ODI3MzYyfDA&ixlib=rb-4.1.0&q=80&w=1080"], specials: [{ id: "j2-2", name: "호두과자 2봉 세트", desc: "오늘만 특가!", price: 7000, originalPrice: 8000, discount: 13 }], menus: [{ id: "j2-1", name: "호두과자 1봉 (15개)", desc: "갓 구운 호두과자", price: 4000 }, { id: "j2-3", name: "미니 호두과자 (30개)", desc: "작고 바삭한 미니 사이즈", price: 6000 }] },
  { id: 3, marketId: "jungang" as const, name: "중앙칼국수", badge: "", description: "수제면으로 만든 진한 멸치 육수 칼국수가 일품!", location: "중앙시장 3동 8호", hours: "10:00 - 19:00", phone: "041-555-3456", rating: 4.6, images: ["https://images.unsplash.com/photo-1747228469031-c5fc60b9d9f9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBmcmllZCUyMGZvb2QlMjB0ZW1wdXJhfGVufDF8fHx8MTc3NDgyNTg2Mnww&ixlib=rb-4.1.0&q=80&w=1080"], specials: [], menus: [{ id: "j3-1", name: "칼국수", desc: "수제면 멸치 육수", price: 8000 }, { id: "j3-2", name: "수제비", desc: "구수한 수제비", price: 8000 }, { id: "j3-3", name: "만두 (8개)", desc: "손만두", price: 6000 }] },
  { id: 4, marketId: "jungang" as const, name: "신선정육점", badge: "", description: "당일 도축 신선한 한우·돼지고기 전문점", location: "중앙시장 1동 34호", hours: "07:00 - 18:00", phone: "041-555-4567", rating: 4.5, images: ["https://images.unsplash.com/photo-1758788701706-327f3a0d6820?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBmcmVzaCUyMG1lYXQlMjBidXRjaGVyJTIwbWFya2V0fGVufDF8fHx8MTc3NDgyNzM1OHww&ixlib=rb-4.1.0&q=80&w=1080"], specials: [{ id: "j4-3", name: "계란 30구", desc: "마감 특가", price: 7500, originalPrice: 9000, discount: 17 }], menus: [{ id: "j4-1", name: "한우 등심 200g", desc: "1++ 등급", price: 25000 }, { id: "j4-2", name: "돼지 삼겹살 500g", desc: "국내산", price: 12000 }] },
  { id: 5, marketId: "jungang" as const, name: "싱싱채소마트", badge: "마감할인", description: "산지직송 신선 채소 전문. 매일 새벽 입고!", location: "중앙시장 4동 2호", hours: "06:00 - 17:00", phone: "041-555-5678", rating: 4.3, images: ["https://images.unsplash.com/photo-1759663783570-520674af30d6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBtYXJrZXQlMjBmcmVzaCUyMHZlZ2V0YWJsZXMlMjBwcm9kdWNlfGVufDF8fHx8MTc3NDgyNzM1OHww&ixlib=rb-4.1.0&q=80&w=1080"], specials: [{ id: "j5-2", name: "양파 3kg", desc: "마감 특가", price: 4500, originalPrice: 6000, discount: 25 }], menus: [{ id: "j5-1", name: "대파 1단", desc: "국내산", price: 2500 }, { id: "j5-3", name: "감자 2kg", desc: "강원도산", price: 5000 }] },
];

export function StoreDetailPage() {
  const { id } = useParams();
  const [expandedSection, setExpandedSection] = useState<string | null>("daily");
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [pendingItem, setPendingItem] = useState<CartItem | null>(null);
  const { addItem, switchMarketAndAdd, totalCount } = useCart();

  const store = ALL_STORES.find((s) => s.id === Number(id)) || ALL_STORES[0];

  const handleAddToCart = (menu: { id: string; name: string; price: number }) => {
    const cartItem: CartItem = { id: menu.id, name: menu.name, storeName: store.name, storeId: store.id, marketId: store.marketId, price: menu.price, quantity: 1, image: store.images[0] };
    const result = addItem(cartItem);
    if (result === "market_conflict") { setPendingItem(cartItem); setShowConflictModal(true); }
  };

  const toggleSection = (s: string) => setExpandedSection(expandedSection === s ? null : s);

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-24">
      <MarketConflictModal
        open={showConflictModal}
        onConfirm={() => { if (pendingItem) switchMarketAndAdd(pendingItem); setShowConflictModal(false); setPendingItem(null); }}
        onCancel={() => { setShowConflictModal(false); setPendingItem(null); }}
      />

      {/* Header */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/map" className="p-1"><ChevronLeft className="w-5 h-5 text-gray-700" /></Link>
          <h1 className="text-[15px] text-gray-900">{store.name}</h1>
          <div className="flex items-center gap-1">
            <Link to="/cart" className="p-1 relative">
              <ShoppingCart className="w-5 h-5 text-gray-600" />
              {totalCount > 0 && <span className="absolute -top-1 -right-1 bg-[#ff6600] text-white text-[10px] min-w-[16px] h-4 rounded-full flex items-center justify-center px-1">{totalCount}</span>}
            </Link>
            <button className="p-1"><Share2 className="w-5 h-5 text-gray-600" /></button>
            <button className="p-1"><Heart className="w-5 h-5 text-gray-600" /></button>
          </div>
        </div>
      </div>

      {/* Image */}
      <div className="relative h-52">
        <img src={store.images[0]} alt={store.name} className="w-full h-full object-cover" />
      </div>

      {/* Store Info */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-[17px] text-gray-900">{store.name}</h2>
          {store.badge && <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${store.badge === "마감할인" ? "bg-[#ff6600] text-white" : "bg-orange-50 text-[#ff6600]"}`}>{store.badge}</span>}
          <div className="flex items-center gap-0.5 ml-auto">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-[14px] text-gray-700">{store.rating}</span>
          </div>
        </div>
        <p className="text-[13px] text-gray-500 mb-3">{store.description}</p>
        <div className="space-y-1 text-[13px] text-gray-400">
          <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /><span>{store.location}</span></div>
          <div className="flex items-center gap-2"><Clock className="w-4 h-4" /><span>{store.hours}</span></div>
        </div>
        <div className="flex gap-2 mt-3">
          <button className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-gray-100 rounded-xl text-[13px] text-gray-600">
            <Phone className="w-4 h-4" />{store.phone}
          </button>
          <button className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-gray-100 rounded-xl text-[13px] text-gray-600">
            <MapPin className="w-4 h-4" />길찾기
          </button>
        </div>
      </div>

      {/* Daily Specials */}
      {store.specials.length > 0 && (
        <div className="border-b border-gray-100">
          <button onClick={() => toggleSection("daily")} className="w-full px-4 py-3 flex items-center justify-between">
            <span className="text-[14px] text-gray-900">마감 할인</span>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedSection === "daily" ? "rotate-180" : ""}`} />
          </button>
          {expandedSection === "daily" && (
            <div className="px-4 pb-4 space-y-3">
              {store.specials.map((item) => (
                <div key={item.id} className="flex gap-3 items-center">
                  <div className="flex-1">
                    <h4 className="text-[14px] text-gray-900 mb-0.5">{item.name}</h4>
                    {item.desc && <p className="text-[12px] text-gray-400 mb-1">{item.desc}</p>}
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-red-500">-{item.discount}%</span>
                      <span className="text-[14px] text-gray-900">{item.price.toLocaleString()}원</span>
                      <span className="text-[12px] text-gray-400 line-through">{item.originalPrice.toLocaleString()}원</span>
                    </div>
                  </div>
                  <button onClick={() => handleAddToCart(item)} className="w-9 h-9 rounded-xl bg-[#ff6600] text-white flex items-center justify-center active:bg-[#e5601f]">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Regular Menu */}
      <div className="border-b border-gray-100">
        <button onClick={() => toggleSection("regular")} className="w-full px-4 py-3 flex items-center justify-between">
          <span className="text-[14px] text-gray-900">일반 메뉴</span>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedSection === "regular" ? "rotate-180" : ""}`} />
        </button>
        {expandedSection === "regular" && (
          <div className="px-4 pb-4 space-y-3">
            {store.menus.map((item) => (
              <div key={item.id} className="flex gap-3 items-center">
                <div className="flex-1">
                  <h4 className="text-[14px] text-gray-900 mb-0.5">{item.name}</h4>
                  {item.desc && <p className="text-[12px] text-gray-400 mb-1">{item.desc}</p>}
                  <span className="text-[14px] text-gray-900">{item.price.toLocaleString()}원</span>
                </div>
                <button onClick={() => handleAddToCart(item)} className="w-9 h-9 rounded-xl bg-gray-900 text-white flex items-center justify-center active:bg-gray-800">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
