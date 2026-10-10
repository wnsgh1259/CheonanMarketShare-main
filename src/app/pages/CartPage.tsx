import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  ChevronLeft, Zap, Trash2, ShoppingCart,
  Search, CheckCircle2, PlusCircle, X, ChevronDown, ChevronUp, Route,
} from "lucide-react";
import { useCart } from "../components/CartContext";
import type { CartItem, MarketId } from "../components/CartContext";
import { BottomNav } from "../components/BottomNav";
import { RouteRecommendation } from "../components/RouteRecommendation";
import { MarketConflictModal } from "../components/MarketConflictModal";
import {
  searchProducts,
  unresolvedCartItemId,
  type ProductSearchGroup,
  type ProductStoreOffer,
} from "../data/productSearch";

const MARKET_NAMES: Record<MarketId, string> = {
  jungang: "천안중앙시장",
  byeongcheon: "천안역전시장",
  seonghwan: "성환전통시장",
};

const MARKET_ORDER: MarketId[] = ["jungang", "byeongcheon", "seonghwan"];

const VEG_IMG   = "https://images.unsplash.com/photo-1771250625125-6e552f84fe11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200";
const MEAT_IMG  = "https://images.unsplash.com/photo-1616627152550-5aac9b71a949?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200";
const ONION_IMG = "https://images.unsplash.com/photo-1602769515559-e15133a7e992?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200";
const GARLIC_IMG= "https://images.unsplash.com/photo-1641905777022-a2f31c030af1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200";
const SAUCE_IMG = "https://images.unsplash.com/photo-1747228469031-c5fc60b9d9f9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200";

interface RecipeIngredient {
  id: string;
  name: string;
  amount: string;
  storeName: string;
  storeId: number;
  marketId: MarketId;
  price: number;
  image: string;
  emoji: string;
}

const RECIPES: Record<string, RecipeIngredient[]> = {
  "김치찌개": [
    { id: "rc-kc-1", name: "묵은지 김치",       amount: "300g",  storeName: "싱싱채소마트", storeId: 5, marketId: "jungang", price: 3500, image: VEG_IMG,    emoji: "🥬" },
    { id: "rc-kc-2", name: "돼지고기 (앞다리살)", amount: "200g",  storeName: "신선정육점",   storeId: 4, marketId: "jungang", price: 6800, image: MEAT_IMG,   emoji: "🥩" },
    { id: "rc-kc-3", name: "순두부",             amount: "1모",   storeName: "두부·콩나물마트",storeId:13, marketId:"jungang", price: 3000, image: VEG_IMG,   emoji: "⬜" },
    { id: "rc-kc-4", name: "대파",               amount: "1/2대", storeName: "싱싱채소마트", storeId: 5, marketId: "jungang", price: 800,  image: ONION_IMG,  emoji: "🌿" },
    { id: "rc-kc-5", name: "다진 마늘",          amount: "1큰술", storeName: "시장반찬가게", storeId: 8, marketId: "jungang", price: 1200, image: GARLIC_IMG, emoji: "🧄" },
    { id: "rc-kc-6", name: "고춧가루",           amount: "1큰술", storeName: "시장반찬가게", storeId: 8, marketId: "jungang", price: 2500, image: SAUCE_IMG,  emoji: "🌶️" },
    { id: "rc-kc-7", name: "참기름",             amount: "1작은술",storeName: "시장반찬가게",storeId: 8, marketId: "jungang", price: 3200, image: SAUCE_IMG,  emoji: "🫙" },
  ],
  "된장찌개": [
    { id: "rc-dj-1", name: "된장",    amount: "2큰술",  storeName: "시장반찬가게",  storeId: 8, marketId: "jungang", price: 2800, image: SAUCE_IMG, emoji: "🫙" },
    { id: "rc-dj-2", name: "두부",    amount: "1/2모",  storeName: "두부·콩나물마트",storeId:13, marketId:"jungang", price: 2500, image: VEG_IMG,   emoji: "⬜" },
    { id: "rc-dj-3", name: "애호박",  amount: "1/3개",  storeName: "싱싱채소마트",  storeId: 5, marketId: "jungang", price: 1200, image: VEG_IMG,   emoji: "🥒" },
    { id: "rc-dj-4", name: "감자",    amount: "1개",    storeName: "싱싱채소마트",  storeId: 5, marketId: "jungang", price: 900,  image: VEG_IMG,   emoji: "🥔" },
    { id: "rc-dj-5", name: "양파",    amount: "1/2개",  storeName: "싱싱채소마트",  storeId: 5, marketId: "jungang", price: 700,  image: VEG_IMG,   emoji: "🧅" },
    { id: "rc-dj-6", name: "대파",    amount: "1/2대",  storeName: "싱싱채소마트",  storeId: 5, marketId: "jungang", price: 800,  image: ONION_IMG, emoji: "🌿" },
    { id: "rc-dj-7", name: "다진 마늘",amount:"1큰술",  storeName: "시장반찬가게",  storeId: 8, marketId: "jungang", price: 1200, image: GARLIC_IMG,emoji: "🧄" },
  ],
  "불고기": [
    { id: "rc-bg-1", name: "소고기 (불고기용)", amount: "300g",  storeName: "신선정육점",  storeId: 4, marketId: "jungang", price: 14500, image: MEAT_IMG,   emoji: "🥩" },
    { id: "rc-bg-2", name: "양파",              amount: "1개",   storeName: "싱싱채소마트",storeId: 5, marketId: "jungang", price: 700,   image: VEG_IMG,    emoji: "🧅" },
    { id: "rc-bg-3", name: "대파",              amount: "1대",   storeName: "싱싱채소마트",storeId: 5, marketId: "jungang", price: 800,   image: ONION_IMG,  emoji: "🌿" },
    { id: "rc-bg-4", name: "간장",              amount: "3큰술", storeName: "시장반찬가게",storeId: 8, marketId: "jungang", price: 2200,  image: SAUCE_IMG,  emoji: "🫙" },
    { id: "rc-bg-5", name: "설탕",              amount: "1큰술", storeName: "시장반찬가게",storeId: 8, marketId: "jungang", price: 900,   image: SAUCE_IMG,  emoji: "🍬" },
    { id: "rc-bg-6", name: "참기름",            amount: "1큰술", storeName: "시장반찬가게",storeId: 8, marketId: "jungang", price: 3200,  image: SAUCE_IMG,  emoji: "🫙" },
    { id: "rc-bg-7", name: "다진 마늘",         amount: "1큰술", storeName: "시장반찬가게",storeId: 8, marketId: "jungang", price: 1200,  image: GARLIC_IMG, emoji: "🧄" },
  ],
  "순두부찌개": [
    { id: "rc-sd-1", name: "순두부",            amount: "1팩",   storeName: "두부·콩나물마트",storeId:13,marketId:"jungang", price: 3000, image: VEG_IMG,   emoji: "⬜" },
    { id: "rc-sd-2", name: "돼지고기 (다짐육)", amount: "100g",  storeName: "신선정육점",   storeId: 4, marketId:"jungang", price: 3500, image: MEAT_IMG,  emoji: "🥩" },
    { id: "rc-sd-3", name: "달걀",              amount: "1개",   storeName: "싱싱채소마트", storeId: 5, marketId:"jungang", price: 500,  image: VEG_IMG,   emoji: "🥚" },
    { id: "rc-sd-4", name: "대파",              amount: "1/2대", storeName: "싱싱채소마트", storeId: 5, marketId:"jungang", price: 800,  image: ONION_IMG, emoji: "🌿" },
    { id: "rc-sd-5", name: "고춧가루",          amount: "2큰술", storeName: "시장반찬가게", storeId: 8, marketId:"jungang", price: 2500, image: SAUCE_IMG, emoji: "🌶️" },
    { id: "rc-sd-6", name: "다진 마늘",         amount: "1큰술", storeName: "시장반찬가게", storeId: 8, marketId:"jungang", price: 1200, image: GARLIC_IMG,emoji: "🧄" },
    { id: "rc-sd-7", name: "참기름",            amount: "1작은술",storeName: "시장반찬가게",storeId: 8, marketId:"jungang", price: 3200, image: SAUCE_IMG, emoji: "🫙" },
  ],
};

export function CartPage() {
  const { items, removeItem, clearCart, totalCount, currentMarketId, addItem, switchMarketAndAdd } = useCart();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const [searchMarket, setSearchMarket] = useState<MarketId>(currentMarketId ?? "jungang");
  const [productQuery, setProductQuery] = useState("");
  const [productGroups, setProductGroups] = useState<ProductSearchGroup[] | null>(null);
  const [productSearched, setProductSearched] = useState(false);
  const [pendingConflictItem, setPendingConflictItem] = useState<CartItem | null>(null);
  const [productNotice, setProductNotice] = useState("");

  const [recipeQuery, setRecipeQuery]     = useState("");
  const [recipeResults, setRecipeResults] = useState<RecipeIngredient[] | null>(null);
  const [recipeTitle, setRecipeTitle]     = useState("");
  const [addedIds, setAddedIds]           = useState<Set<string>>(new Set());
  const [conflictMsg, setConflictMsg]     = useState("");
  const [resultsCollapsed, setResultsCollapsed] = useState(false);

  const activeSearchMarket = currentMarketId ?? searchMarket;

  const cartIdSet = useMemo(() => new Set(items.map((i) => i.id)), [items]);

  const handleProductSearch = () => {
    const q = productQuery.trim();
    if (!q) return;
    const groups = searchProducts(activeSearchMarket, q);
    setProductGroups(groups);
    setProductSearched(true);
    setProductNotice("");
  };

  const tryAdd = (item: CartItem) => {
    const result = addItem(item);
    if (result === "market_conflict") {
      setPendingConflictItem(item);
      return false;
    }
    setProductNotice(`「${item.name}」을(를) 담았어요.`);
    return true;
  };

  const addUnresolved = (group: ProductSearchGroup) => {
    tryAdd({
      id: unresolvedCartItemId(activeSearchMarket, group.productName),
      name: group.productName,
      storeName: "상점 미지정",
      storeId: 0,
      marketId: activeSearchMarket,
      price: group.minPrice,
      quantity: 1,
      image: group.offers[0]?.storeImage ?? "",
      unresolved: true,
    });
  };

  const addOffer = (offer: ProductStoreOffer) => {
    tryAdd({
      id: offer.menuId,
      name: offer.menuName,
      storeName: offer.storeName,
      storeId: offer.storeId,
      marketId: offer.marketId,
      price: offer.price,
      quantity: 1,
      image: offer.storeImage,
    });
  };

  const handleRecipeSearch = () => {
    const q = recipeQuery.trim();
    if (!q) return;
    const match = Object.entries(RECIPES).find(([key]) => key.includes(q) || q.includes(key));
    if (match) {
      setRecipeTitle(match[0]);
      setRecipeResults(match[1]);
      setAddedIds(new Set());
      setConflictMsg("");
      setResultsCollapsed(false);
    } else {
      setRecipeTitle("");
      setRecipeResults([]);
      setConflictMsg("");
      setResultsCollapsed(false);
    }
  };

  const handleAddIngredient = (ing: RecipeIngredient) => {
    const result = addItem({
      id: ing.id, name: ing.name, storeName: ing.storeName, storeId: ing.storeId,
      marketId: ing.marketId, price: ing.price, quantity: 1, image: ing.image, isQuickAdd: true,
    });
    if (result === "added") {
      setAddedIds((prev) => new Set(prev).add(ing.id));
      setConflictMsg("");
    } else {
      setConflictMsg("다른 시장 상품은 함께 담을 수 없어요.");
    }
  };

  const handleToggleIngredient = (ing: RecipeIngredient) => {
    if (addedIds.has(ing.id)) {
      removeItem(ing.id);
      setAddedIds((prev) => { const next = new Set(prev); next.delete(ing.id); return next; });
      setConflictMsg("");
    } else {
      handleAddIngredient(ing);
    }
  };

  const handleAddAll = () => {
    if (!recipeResults) return;
    let hasConflict = false;
    const newAdded = new Set(addedIds);
    recipeResults.forEach((ing) => {
      if (!newAdded.has(ing.id)) {
        const result = addItem({
          id: ing.id, name: ing.name, storeName: ing.storeName, storeId: ing.storeId,
          marketId: ing.marketId, price: ing.price, quantity: 1, image: ing.image, isQuickAdd: true,
        });
        if (result === "added") newAdded.add(ing.id);
        else hasConflict = true;
      }
    });
    setAddedIds(newAdded);
    if (hasConflict) setConflictMsg("일부 상품은 시장이 달라 추가되지 않았어요.");
    else setConflictMsg("");
  };

  const marketName = currentMarketId ? MARKET_NAMES[currentMarketId] : "시장을 선택하세요";
  const directItems = items.filter((i) => !i.isQuickAdd);
  const quickItems  = items.filter((i) =>  i.isQuickAdd);
  const totalPrice  = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <div className="relative isolate min-h-screen bg-[#F7F6F1] pb-24">
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
      <div className="sticky top-0 z-20 border-b border-[#EEEAE4] bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/map" className="p-1"><ChevronLeft className="w-5 h-5 text-[#5A453B]" /></Link>
          <div className="text-center">
            <h1 className="text-[15px] text-[#46352C] font-semibold">장바구니</h1>
            <p className="text-[11px] text-[#8A776B]">{marketName}</p>
          </div>
          <div className="w-8" />
        </div>
      </div>

      <main className="relative z-10">
      {/* Product search */}
      <div className="mx-4 mt-3 rounded-2xl border border-[#E5D9CB] bg-white p-4 shadow-[0_8px_24px_-22px_rgba(70,53,44,0.28)]">
        <h2 className="text-[14px] text-[#46352C] mb-1">상품 검색</h2>
        <p className="text-[12px] text-[#8A776B] mb-3">
          사고 싶은 상품을 검색한 뒤, 상점을 고르거나 상점 무관으로 담으세요
        </p>

        {!currentMarketId && (
          <div className="flex gap-1.5 mb-2.5 overflow-x-auto">
            {MARKET_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setSearchMarket(id);
                  setProductGroups(null);
                  setProductSearched(false);
                }}
                className={`h-8 px-3 rounded-lg text-[12px] whitespace-nowrap ${
                  searchMarket === id ? "bg-[#5B4335] text-white" : "bg-[#F5F0E7] text-[#46352C]"
                }`}
              >
                {MARKET_NAMES[id]}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={productQuery}
            onChange={(e) => setProductQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleProductSearch()}
            placeholder="상품명 검색 (예: 고등어, 배추)"
            className="flex-1 px-3 py-2.5 bg-[#F5F0E7] rounded-lg text-[14px] focus:outline-none focus:ring-1 focus:ring-[#B89A7D] placeholder:text-[#8A776B]"
          />
          <button
            type="button"
            onClick={handleProductSearch}
            className="px-4 py-2.5 bg-[#5B4335] text-white rounded-lg text-[13px] active:bg-[#6B5142] transition-colors flex items-center gap-1"
          >
            <Search className="w-3.5 h-3.5" />검색
          </button>
        </div>

        {productSearched && productGroups !== null && (
          <div className="mt-3 border border-[#E5D9CB] rounded-lg overflow-hidden">
            {productGroups.length === 0 ? (
              <div className="px-3 py-5 text-center">
                <p className="text-[13px] text-[#6B5142]">상품정보가 없습니다</p>
                <p className="text-[11px] text-[#8A776B] mt-1">장바구니에 추가할 수 없어요</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {productGroups.map((group) => {
                  const unresolvedId = unresolvedCartItemId(activeSearchMarket, group.productName);
                  const unresolvedAdded = cartIdSet.has(unresolvedId);
                  return (
                    <div key={group.productName} className="p-2.5 space-y-1">
                      <button
                        type="button"
                        onClick={() => addUnresolved(group)}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-left transition-colors ${
                          unresolvedAdded ? "bg-sky-50" : "bg-[#F7F5F1] active:bg-[#EFE4D8]"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-[13px] text-[#46352C] font-medium truncate">{group.productName}</p>
                          <p className="text-[11px] text-[#8A776B]">상점 무관 · 최저 {group.minPrice.toLocaleString()}원~</p>
                        </div>
                        <span className={`text-[11px] shrink-0 ${unresolvedAdded ? "text-[#0EA5E9]" : "text-[#6B5142]"}`}>
                          {unresolvedAdded ? "담김" : "담기"}
                        </span>
                      </button>

                      {group.offers.map((offer) => {
                        const added = cartIdSet.has(offer.menuId);
                        return (
                          <button
                            key={`${offer.storeId}-${offer.menuId}`}
                            type="button"
                            onClick={() => addOffer(offer)}
                            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                              added ? "bg-sky-50/70" : "active:bg-[#F7F5F1]"
                            }`}
                          >
                            <div className="min-w-0 pl-1">
                              <p className="text-[13px] text-[#46352C] truncate">{offer.storeName}</p>
                              {offer.originalPrice != null && offer.originalPrice > offer.price ? (
                                <p className="text-[11px] text-emerald-600">할인중</p>
                              ) : (
                                <p className="text-[11px] text-[#8A776B]">등록 메뉴</p>
                              )}
                            </div>
                            <div className="flex flex-col items-end shrink-0">
                              <span className="text-[13px] text-[#46352C]">{offer.price.toLocaleString()}원</span>
                              <span className={`text-[10px] ${added ? "text-[#0EA5E9]" : "text-[#8A776B]"}`}>
                                {added ? "담김" : "담기"}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {productNotice && (
          <p className="mt-2 text-[12px] text-emerald-600">{productNotice}</p>
        )}
      </div>

      {/* Cart Items */}
      <div className="mx-4 mt-2.5 rounded-2xl border border-[#E5D9CB] bg-white p-4 shadow-[0_8px_24px_-22px_rgba(70,53,44,0.28)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[14px] text-[#46352C]">담은 상품 ({totalCount})</h2>
          {items.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1 text-[12px] text-[#6B5142] active:text-red-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />초기화
            </button>
          )}
        </div>
        {items.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-[#6B5142]">
            <ShoppingCart className="w-10 h-10 mb-2 text-[#9A897F]" />
            <p className="text-[13px] mb-0.5">장바구니가 비어있어요</p>
            <p className="text-[12px] text-[#6B5142]">지도에서 상품을 담아보세요</p>
          </div>
        ) : (
          <>
            {directItems.length > 0 && (
              <div className="space-y-0">
                {directItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                    <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-[#FAF4EC]">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[11px] text-[#8A776B]">상품</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[14px] text-[#46352C]">{item.name}</h3>
                      <p className={`text-[12px] ${item.unresolved ? "text-amber-600" : "text-[#8A776B]"}`}>
                        {item.unresolved ? "상점 미지정 · 경로 추천 시 배정" : item.storeName}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[14px] text-[#46352C]">
                          {item.unresolved ? `${item.price.toLocaleString()}원~` : `${item.price.toLocaleString()}원`}
                        </span>
                        <span className="text-[12px] text-[#8A776B]">× {item.quantity}</span>
                      </div>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="p-2 text-[#9A897F] active:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {quickItems.length > 0 && (
              <div>
                {directItems.length > 0 && (
                  <div className="border-t border-[#EDE5D8] pt-3 mt-1 mb-2">
                    <span className="text-[11px] text-[#8A6A52]">빠른 장보기로 담은 상품</span>
                  </div>
                )}
                {quickItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                    <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-[#FAF0E3]">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[14px] text-[#46352C]">{item.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[14px] text-[#46352C]">{item.price.toLocaleString()}원</span>
                        <span className="text-[12px] text-[#6B5142]">× {item.quantity}</span>
                      </div>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="p-2 text-[#9A897F] active:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {items.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[#EDE5D8] flex items-center justify-between">
                <span className="text-[13px] text-[#6B5142]">담은 상품 합계</span>
                <span className="text-[18px] text-[#46352C]">{totalPrice.toLocaleString()}원</span>
              </div>
            )}
            <Link
              to="/map"
              className="mt-3 flex items-center justify-center w-full py-2.5 border border-dashed border-[#E5D9CB] rounded-lg text-[13px] text-[#6B5142]"
            >
              + 상품 추가하기
            </Link>
          </>
        )}
      </div>

      {/* Quick Shopping */}
      <div className="bg-white mx-4 mt-3 rounded-2xl p-4 ring-1 ring-inset ring-[#EAE8DF] shadow-[0_8px_24px_-22px_rgba(70,53,44,0.28)]">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-[#8A6A52]" />
          <h2 className="text-[14px] text-[#46352C]">빠른 장보기</h2>
        </div>
        <p className="text-[12px] text-[#6B5142] mb-3">요리명을 검색하면 재료를 자동 추가해요</p>
        <div className="flex gap-2 mb-2">
          <input
            type="text" value={recipeQuery}
            onChange={(e) => setRecipeQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRecipeSearch()}
            placeholder="요리명을 입력하세요"
            className="flex-1 px-3 py-2.5 bg-[#F7F2E8] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#B89A7D] placeholder:text-[#6B5142]"
          />
          <button
            onClick={handleRecipeSearch}
            className="px-4 py-2.5 bg-[#5B4335] text-white rounded-xl text-[13px] active:bg-[#46352C] transition-colors flex items-center gap-1"
          >
            <Search className="w-3.5 h-3.5" />검색
          </button>
        </div>
        <div className="flex gap-1.5 flex-wrap mb-3">
          {Object.keys(RECIPES).map((name) => (
            <button
              key={name}
              onClick={() => {
                setRecipeQuery(name);
                const match = RECIPES[name];
                setRecipeTitle(name);
                setRecipeResults(match);
                setAddedIds(new Set());
                setConflictMsg("");
                setResultsCollapsed(false);
              }}
              className="px-3 py-1.5 bg-[#F5F0E7] text-[#6B5142] rounded-full text-[12px] active:bg-[#EDE1D5] transition-colors"
            >
              {name}
            </button>
          ))}
        </div>

        {recipeResults !== null && (
          recipeResults.length === 0 ? (
            <div className="text-center py-6 text-[#6B5142]">
              <p className="text-[13px]">검색 결과가 없어요</p>
              <p className="text-[12px] mt-1 text-[#6B5142]">다른 요리명을 입력해 보세요</p>
            </div>
          ) : (
            <div className="mt-1 border border-[#EDE5D8] rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2.5 bg-[#F7F5F1] border-b border-[#EDE5D8]">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-[#46352C]">{recipeTitle} 재료</span>
                  <span className="text-[11px] text-[#8A6A52]">{addedIds.size}/{recipeResults.length}</span>
                </div>
                <div className="flex items-center gap-1">
                  {!resultsCollapsed && (
                    <button
                      onClick={handleAddAll}
                      className="text-[11px] px-3 py-1.5 bg-[#5B4335] text-white rounded-full active:bg-[#46352C] transition-colors"
                    >
                      전체 담기
                    </button>
                  )}
                  <button onClick={() => setResultsCollapsed((v) => !v)} className="p-1.5 text-[#6B5142]">
                    {resultsCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => { setRecipeResults(null); setRecipeTitle(""); setAddedIds(new Set()); setConflictMsg(""); setResultsCollapsed(false); }}
                    className="p-1.5 text-[#6B5142]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {resultsCollapsed ? (
                <div
                  className="px-3 py-2.5 flex items-center justify-between cursor-pointer active:bg-[#FAF0E3]"
                  onClick={() => setResultsCollapsed(false)}
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {recipeResults.slice(0, 4).map((ing) => (
                      <span
                        key={ing.id}
                        className={`text-[11px] px-2 py-0.5 rounded ${
                          addedIds.has(ing.id) ? "bg-[#EFE4D8] text-[#6B5142]" : "bg-[#F5F0E7] text-[#6B5142]"
                        }`}
                      >
                        {ing.name}
                      </span>
                    ))}
                    {recipeResults.length > 4 && <span className="text-[11px] text-[#6B5142]">+{recipeResults.length - 4}</span>}
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#6B5142] flex-shrink-0 ml-2" />
                </div>
              ) : (
                <div className="p-3">
                  <div className="space-y-1.5">
                    {recipeResults.map((ing) => {
                      const isAdded = addedIds.has(ing.id);
                      return (
                        <button
                          key={ing.id}
                          onClick={() => handleToggleIngredient(ing)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                            isAdded ? "bg-[#FAF0E3]" : "bg-[#F7F5F1] active:bg-[#FAF0E3]"
                          }`}
                        >
                          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-[18px] flex-shrink-0">
                            {ing.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[13px] text-[#46352C]">{ing.name}</span>
                              <span className="text-[10px] text-[#6B5142]">{ing.amount}</span>
                            </div>
                            <span className="text-[11px] text-[#6B5142]">{ing.storeName}</span>
                          </div>
                          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                            <span className="text-[13px] text-[#46352C]">{ing.price.toLocaleString()}원</span>
                            {isAdded ? (
                              <span className="flex items-center gap-0.5 text-[10px] text-[#8A6A52]">
                                <CheckCircle2 className="w-3 h-3" />담김
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5 text-[10px] text-[#6B5142]">
                                <PlusCircle className="w-3 h-3" />담기
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 p-3 bg-[#F7F5F1] rounded-lg flex items-center justify-between">
                    <span className="text-[12px] text-[#6B5142]">전체 재료 합계</span>
                    <span className="text-[14px] text-[#46352C]">
                      {recipeResults.reduce((s, i) => s + i.price, 0).toLocaleString()}원
                    </span>
                  </div>
                  {conflictMsg && <p className="mt-2 text-[11px] text-orange-500 text-center">{conflictMsg}</p>}
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Route Recommendation */}
      <div className="bg-white mx-4 mt-3 rounded-2xl p-4 ring-1 ring-inset ring-[#EAE8DF] shadow-[0_8px_24px_-22px_rgba(70,53,44,0.28)]">
        <div className="flex items-center gap-2 mb-1">
          <Route className="w-4 h-4 text-[#A9652D]" />
          <h2 className="text-[14px] text-[#46352C]">맞춤형 경로 추천</h2>
        </div>
        <p className="text-[12px] text-[#6B5142] mb-4">
          장바구니 상품 기반으로 3가지 최적 동선을 계산해요
        </p>
        <RouteRecommendation items={items} marketId={currentMarketId as MarketId | null} />
      </div>
      </main>

      <MarketConflictModal
        open={pendingConflictItem != null}
        onCancel={() => setPendingConflictItem(null)}
        onConfirm={() => {
          if (!pendingConflictItem) return;
          switchMarketAndAdd(pendingConflictItem);
          setPendingConflictItem(null);
          setProductNotice(`시장을 바꾸고 「${pendingConflictItem.name}」을(를) 담았어요.`);
        }}
      />

      {/* 초기화 확인 팝업 */}
      {showClearConfirm && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[200]" onClick={() => setShowClearConfirm(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[210] w-[280px] bg-white rounded-[24px] shadow-2xl ring-1 ring-inset ring-[#EAE8DF] overflow-hidden">
            <div className="px-6 pt-6 pb-5 text-center">
              <p className="text-[28px] mb-2">🗑️</p>
              <p className="text-[16px] font-bold text-[#46352C] mb-1">장바구니 초기화</p>
              <p className="text-[13px] text-[#6B5142]">담은 상품을 모두 삭제할까요?</p>
            </div>
            <div className="flex border-t border-[#EDE5D8]">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3.5 text-[14px] text-[#6B5142] active:bg-[#FAF0E3] transition-colors border-r border-[#EDE5D8]"
              >
                취소
              </button>
              <button
                onClick={() => { clearCart(); setShowClearConfirm(false); }}
                className="flex-1 py-3.5 text-[14px] font-semibold text-red-500 active:bg-red-50 transition-colors"
              >
                초기화
              </button>
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}
