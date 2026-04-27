import { useState } from "react";
import { Link } from "react-router";
import {
  ChevronLeft, MapPin, Zap, Trash2, ShoppingCart,
  Search, CheckCircle2, PlusCircle, X, ChevronDown, ChevronUp, Route,
} from "lucide-react";
import { useCart } from "../components/CartContext";
import type { MarketId } from "../components/CartContext";
import { BottomNav } from "../components/BottomNav";
import { RouteRecommendation } from "../components/RouteRecommendation";

const MARKET_NAMES: Record<string, string> = {
  jungang: "천안중앙시장",
  byeongcheon: "천안역전시장",
  seonghwan: "성환전통시장",
};

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
  const { items, removeItem, totalCount, currentMarketId, addItem } = useCart();

  const [recipeQuery, setRecipeQuery]     = useState("");
  const [recipeResults, setRecipeResults] = useState<RecipeIngredient[] | null>(null);
  const [recipeTitle, setRecipeTitle]     = useState("");
  const [addedIds, setAddedIds]           = useState<Set<string>>(new Set());
  const [conflictMsg, setConflictMsg]     = useState("");
  const [resultsCollapsed, setResultsCollapsed] = useState(false);

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
    <div className="min-h-screen bg-[#F7F8FA] pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/map" className="p-1"><ChevronLeft className="w-5 h-5 text-gray-700" /></Link>
          <div className="text-center">
            <h1 className="text-[15px] text-gray-900">장바구니</h1>
            <p className="text-[11px] text-gray-400">{marketName}</p>
          </div>
          <div className="w-8" />
        </div>
      </div>

      {/* Cart Items */}
      <div className="bg-white mx-4 mt-3 rounded-xl p-4">
        <h2 className="text-[14px] text-gray-900 mb-3">담은 상품 ({totalCount})</h2>
        {items.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-gray-400">
            <ShoppingCart className="w-10 h-10 mb-2 text-gray-300" />
            <p className="text-[13px] mb-0.5">장바구니가 비어있어요</p>
            <p className="text-[12px] text-gray-300">지도에서 상품을 담아보세요</p>
          </div>
        ) : (
          <>
            {directItems.length > 0 && (
              <div className="space-y-0">
                {directItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                    <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[14px] text-gray-900">{item.name}</h3>
                      <p className="text-[12px] text-gray-400">{item.storeName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[14px] text-gray-900">{item.price.toLocaleString()}원</span>
                        <span className="text-[12px] text-gray-400">× {item.quantity}</span>
                      </div>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="p-2 text-gray-300 active:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {quickItems.length > 0 && (
              <div>
                {directItems.length > 0 && (
                  <div className="border-t border-gray-100 pt-3 mt-1 mb-2">
                    <span className="text-[11px] text-[#0EA5E9]">빠른 장보기로 담은 상품</span>
                  </div>
                )}
                {quickItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                    <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-sky-50">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[14px] text-gray-700">{item.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[14px] text-gray-900">{item.price.toLocaleString()}원</span>
                        <span className="text-[12px] text-gray-400">× {item.quantity}</span>
                      </div>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="p-2 text-gray-300 active:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {items.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[13px] text-gray-500">담은 상품 합계</span>
                <span className="text-[18px] text-gray-900">{totalPrice.toLocaleString()}원</span>
              </div>
            )}
            <Link
              to="/map"
              className="mt-3 flex items-center justify-center w-full py-2.5 border border-dashed border-gray-200 rounded-lg text-[13px] text-gray-400"
            >
              + 상품 추가하기
            </Link>
          </>
        )}
      </div>

      {/* Quick Shopping */}
      <div className="bg-white mx-4 mt-2.5 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-[#0EA5E9]" />
          <h2 className="text-[14px] text-gray-900">빠른 장보기</h2>
        </div>
        <p className="text-[12px] text-gray-400 mb-3">요리명을 검색하면 재료를 자동 추가해요</p>
        <div className="flex gap-2 mb-2">
          <input
            type="text" value={recipeQuery}
            onChange={(e) => setRecipeQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRecipeSearch()}
            placeholder="요리명을 입력하세요"
            className="flex-1 px-3 py-2.5 bg-gray-100 rounded-lg text-[14px] focus:outline-none focus:ring-1 focus:ring-gray-300 placeholder:text-gray-400"
          />
          <button
            onClick={handleRecipeSearch}
            className="px-4 py-2.5 bg-gray-900 text-white rounded-lg text-[13px] active:bg-gray-800 transition-colors flex items-center gap-1"
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
              className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-[12px] active:bg-gray-200 transition-colors"
            >
              {name}
            </button>
          ))}
        </div>

        {recipeResults !== null && (
          recipeResults.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <p className="text-[13px]">검색 결과가 없어요</p>
              <p className="text-[12px] mt-1 text-gray-300">다른 요리명을 입력해 보세요</p>
            </div>
          ) : (
            <div className="mt-1 border border-gray-100 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-gray-800">{recipeTitle} 재료</span>
                  <span className="text-[11px] text-[#0EA5E9]">{addedIds.size}/{recipeResults.length}</span>
                </div>
                <div className="flex items-center gap-1">
                  {!resultsCollapsed && (
                    <button
                      onClick={handleAddAll}
                      className="text-[11px] px-2.5 py-1 bg-gray-900 text-white rounded-md active:bg-gray-800 transition-colors"
                    >
                      전체 담기
                    </button>
                  )}
                  <button onClick={() => setResultsCollapsed((v) => !v)} className="p-1.5 text-gray-400">
                    {resultsCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => { setRecipeResults(null); setRecipeTitle(""); setAddedIds(new Set()); setConflictMsg(""); setResultsCollapsed(false); }}
                    className="p-1.5 text-gray-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {resultsCollapsed ? (
                <div
                  className="px-3 py-2.5 flex items-center justify-between cursor-pointer active:bg-gray-50"
                  onClick={() => setResultsCollapsed(false)}
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {recipeResults.slice(0, 4).map((ing) => (
                      <span
                        key={ing.id}
                        className={`text-[11px] px-2 py-0.5 rounded ${
                          addedIds.has(ing.id) ? "bg-sky-50 text-[#0EA5E9]" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {ing.name}
                      </span>
                    ))}
                    {recipeResults.length > 4 && <span className="text-[11px] text-gray-400">+{recipeResults.length - 4}</span>}
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
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
                            isAdded ? "bg-sky-50" : "bg-gray-50 active:bg-gray-100"
                          }`}
                        >
                          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-[18px] flex-shrink-0">
                            {ing.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[13px] text-gray-800">{ing.name}</span>
                              <span className="text-[10px] text-gray-400">{ing.amount}</span>
                            </div>
                            <span className="text-[11px] text-gray-400">{ing.storeName}</span>
                          </div>
                          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                            <span className="text-[13px] text-gray-900">{ing.price.toLocaleString()}원</span>
                            {isAdded ? (
                              <span className="flex items-center gap-0.5 text-[10px] text-[#0EA5E9]">
                                <CheckCircle2 className="w-3 h-3" />담김
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                                <PlusCircle className="w-3 h-3" />담기
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                    <span className="text-[12px] text-gray-500">전체 재료 합계</span>
                    <span className="text-[14px] text-gray-900">
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
      <div className="bg-white mx-4 mt-2.5 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <Route className="w-4 h-4 text-[#0EA5E9]" />
          <h2 className="text-[14px] text-gray-900">맞춤형 경로 추천</h2>
        </div>
        <p className="text-[12px] text-gray-400 mb-4">
          장바구니 상품 기반으로 3가지 최적 동선을 계산해요
        </p>
        <RouteRecommendation items={items} marketId={currentMarketId as MarketId | null} />
      </div>

      <BottomNav />
    </div>
  );
}
