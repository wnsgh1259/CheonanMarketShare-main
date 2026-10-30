import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  ChevronLeft, Zap, Trash2, ShoppingCart,
  Search, CheckCircle2, PlusCircle, X, ChevronDown, ChevronUp, Route,
  Minus, Plus, Package,
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
import { readAuthSession } from "../data/authSession";
import {
  PICKUP_ORDERS_CHANGED,
  cancelPickupOrder,
  createPickupOrders,
  formatPickupItemsSummary,
  listPickupOrdersForCustomer,
  pickupOrderTotal,
  pickupStatusLabel,
  resolveCustomerPickupKey,
  updatePickupCustomerMessage,
  type PickupOrder,
} from "../data/pickupOrders";

const MARKET_NAMES: Record<MarketId, string> = {
  jungang: "천안중앙시장",
  byeongcheon: "천안역전시장",
  seonghwan: "성환이화시장",
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

/** 중앙시장 시드 상점 기준 (네비게이션·장바구니 연동) */
const S = {
  meat:   { storeName: "신선정육점", storeId: 4 },
  meat2:  { storeName: "중앙정육센터", storeId: 17 },
  veg:    { storeName: "싱싱청과", storeId: 5 },
  tofu:   { storeName: "두부콩나물집", storeId: 12 },
  fruit:  { storeName: "황금과일가게", storeId: 13 },
  fish:   { storeName: "중앙수산", storeId: 6 },
  fish2:  { storeName: "남해수산", storeId: 14 },
  banchan:{ storeName: "시장반찬가게", storeId: 7 },
  dry:    { storeName: "통큰건어물", storeId: 15 },
  rice:   { storeName: "천안쌀잡곡", storeId: 16 },
  living: { storeName: "생활잡화코너", storeId: 8 },
} as const;

type StoreRef = (typeof S)[keyof typeof S];

function ing(
  prefix: string,
  index: number,
  name: string,
  amount: string,
  store: StoreRef,
  price: number,
  image: string,
  emoji: string,
): RecipeIngredient {
  return {
    id: `${prefix}-${index}`,
    name,
    amount,
    storeName: store.storeName,
    storeId: store.storeId,
    marketId: "jungang",
    price,
    image,
    emoji,
  };
}

function recipe(
  prefix: string,
  items: Array<[string, string, StoreRef, number, string, string]>,
): RecipeIngredient[] {
  return items.map(([name, amount, store, price, image, emoji], i) =>
    ing(prefix, i + 1, name, amount, store, price, image, emoji),
  );
}

const RECIPES: Record<string, RecipeIngredient[]> = {
  "김치찌개": recipe("rc-kc", [
    ["묵은지 김치", "300g", S.banchan, 3500, VEG_IMG, "🥬"],
    ["돼지고기 (앞다리살)", "200g", S.meat, 6800, MEAT_IMG, "🥩"],
    ["순두부", "1모", S.tofu, 3000, VEG_IMG, "⬜"],
    ["대파", "1/2대", S.veg, 800, ONION_IMG, "🌿"],
    ["다진 마늘", "1큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
    ["고춧가루", "1큰술", S.banchan, 2500, SAUCE_IMG, "🌶️"],
    ["참기름", "1작은술", S.banchan, 3200, SAUCE_IMG, "🫙"],
  ]),
  "된장찌개": recipe("rc-dj", [
    ["된장", "2큰술", S.banchan, 2800, SAUCE_IMG, "🫙"],
    ["두부", "1/2모", S.tofu, 2500, VEG_IMG, "⬜"],
    ["애호박", "1/3개", S.veg, 1200, VEG_IMG, "🥒"],
    ["감자", "1개", S.veg, 900, VEG_IMG, "🥔"],
    ["양파", "1/2개", S.veg, 700, VEG_IMG, "🧅"],
    ["대파", "1/2대", S.veg, 800, ONION_IMG, "🌿"],
    ["다진 마늘", "1큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
  ]),
  "불고기": recipe("rc-bg", [
    ["소고기 (불고기용)", "300g", S.meat, 14500, MEAT_IMG, "🥩"],
    ["양파", "1개", S.veg, 700, VEG_IMG, "🧅"],
    ["대파", "1대", S.veg, 800, ONION_IMG, "🌿"],
    ["간장", "3큰술", S.banchan, 2200, SAUCE_IMG, "🫙"],
    ["설탕", "1큰술", S.banchan, 900, SAUCE_IMG, "🍬"],
    ["참기름", "1큰술", S.banchan, 3200, SAUCE_IMG, "🫙"],
    ["다진 마늘", "1큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
  ]),
  "순두부찌개": recipe("rc-sd", [
    ["순두부", "1팩", S.tofu, 3000, VEG_IMG, "⬜"],
    ["돼지고기 (다짐육)", "100g", S.meat, 3500, MEAT_IMG, "🥩"],
    ["달걀", "1개", S.veg, 500, VEG_IMG, "🥚"],
    ["대파", "1/2대", S.veg, 800, ONION_IMG, "🌿"],
    ["고춧가루", "2큰술", S.banchan, 2500, SAUCE_IMG, "🌶️"],
    ["다진 마늘", "1큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
    ["참기름", "1작은술", S.banchan, 3200, SAUCE_IMG, "🫙"],
  ]),
  "제육볶음": recipe("rc-jy", [
    ["돼지 앞다리살", "400g", S.meat, 8000, MEAT_IMG, "🥩"],
    ["양파", "1개", S.veg, 700, VEG_IMG, "🧅"],
    ["대파", "1대", S.veg, 800, ONION_IMG, "🌿"],
    ["고추장", "2큰술", S.banchan, 2500, SAUCE_IMG, "🌶️"],
    ["고춧가루", "1큰술", S.banchan, 2500, SAUCE_IMG, "🌶️"],
    ["다진 마늘", "1큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
    ["참기름", "1큰술", S.banchan, 3200, SAUCE_IMG, "🫙"],
  ]),
  "감자조림": recipe("rc-gj", [
    ["감자", "4개", S.veg, 2500, VEG_IMG, "🥔"],
    ["간장", "3큰술", S.banchan, 2200, SAUCE_IMG, "🫙"],
    ["설탕", "1큰술", S.banchan, 900, SAUCE_IMG, "🍬"],
    ["다진 마늘", "1큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
    ["참기름", "1작은술", S.banchan, 3200, SAUCE_IMG, "🫙"],
    ["대파", "1/2대", S.veg, 800, ONION_IMG, "🌿"],
  ]),
  "계란말이": recipe("rc-eg", [
    ["계란 30구", "4개분", S.meat, 7500, VEG_IMG, "🥚"],
    ["대파", "1/2대", S.veg, 800, ONION_IMG, "🌿"],
    ["당근", "1/4개", S.veg, 700, VEG_IMG, "🥕"],
    ["참기름", "1작은술", S.banchan, 3200, SAUCE_IMG, "🫙"],
    ["소금", "약간", S.banchan, 500, SAUCE_IMG, "🧂"],
  ]),
  "미역국": recipe("rc-my", [
    ["미역", "20g", S.dry, 2500, VEG_IMG, "🌊"],
    ["소고기 (국거리)", "150g", S.meat, 9000, MEAT_IMG, "🥩"],
    ["다진 마늘", "1큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
    ["간장", "1큰술", S.banchan, 2200, SAUCE_IMG, "🫙"],
    ["참기름", "1큰술", S.banchan, 3200, SAUCE_IMG, "🫙"],
    ["대파", "1/2대", S.veg, 800, ONION_IMG, "🌿"],
  ]),
  "고등어구이": recipe("rc-go", [
    ["고등어 2마리", "1마리", S.fish, 7000, MEAT_IMG, "🐟"],
    ["대파", "1대", S.veg, 800, ONION_IMG, "🌿"],
    ["다진 마늘", "1큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
    ["간장", "2큰술", S.banchan, 2200, SAUCE_IMG, "🫙"],
    ["고춧가루", "1큰술", S.banchan, 2500, SAUCE_IMG, "🌶️"],
  ]),
  "갈치조림": recipe("rc-gc", [
    ["갈치 1마리", "1마리", S.fish, 12000, MEAT_IMG, "🐟"],
    ["무", "1/4개", S.veg, 1500, VEG_IMG, "⚪"],
    ["양파", "1/2개", S.veg, 700, VEG_IMG, "🧅"],
    ["고춧가루", "2큰술", S.banchan, 2500, SAUCE_IMG, "🌶️"],
    ["간장", "3큰술", S.banchan, 2200, SAUCE_IMG, "🫙"],
    ["다진 마늘", "1큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
  ]),
  "오징어볶음": recipe("rc-oj", [
    ["오징어 2마리", "1마리", S.fish, 8000, MEAT_IMG, "🦑"],
    ["양파", "1개", S.veg, 700, VEG_IMG, "🧅"],
    ["대파", "1대", S.veg, 800, ONION_IMG, "🌿"],
    ["고추장", "2큰술", S.banchan, 2500, SAUCE_IMG, "🌶️"],
    ["고춧가루", "1큰술", S.banchan, 2500, SAUCE_IMG, "🌶️"],
    ["다진 마늘", "1큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
  ]),
  "생선매운탕": recipe("rc-mt", [
    ["매운탕 재료", "1세트", S.fish2, 12000, MEAT_IMG, "🍲"],
    ["대파", "1대", S.veg, 800, ONION_IMG, "🌿"],
    ["무", "1/4개", S.veg, 1500, VEG_IMG, "⚪"],
    ["고춧가루", "2큰술", S.banchan, 2500, SAUCE_IMG, "🌶️"],
    ["다진 마늘", "1큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
    ["두부", "1/2모", S.tofu, 2500, VEG_IMG, "⬜"],
  ]),
  "보쌈": recipe("rc-bs", [
    ["보쌈용 수육 300g", "500g", S.meat2, 11000, MEAT_IMG, "🥩"],
    ["배추 1포기", "1/2포기", S.veg, 4000, VEG_IMG, "🥬"],
    ["새우젓 500g", "약간", S.dry, 7000, SAUCE_IMG, "🦐"],
    ["마늘", "1통", S.banchan, 2000, GARLIC_IMG, "🧄"],
    ["생강", "조금", S.banchan, 1500, VEG_IMG, "🫚"],
  ]),
  "삼겹살구이": recipe("rc-sg", [
    ["돼지 삼겹살 500g", "500g", S.meat, 12000, MEAT_IMG, "🥩"],
    ["상추 1봉", "1봉", S.veg, 3000, VEG_IMG, "🥬"],
    ["마늘", "1통", S.banchan, 2000, GARLIC_IMG, "🧄"],
    ["쌈장", "1통", S.banchan, 3500, SAUCE_IMG, "🫙"],
    ["양파", "1개", S.veg, 700, VEG_IMG, "🧅"],
  ]),
  "콩나물국": recipe("rc-kn", [
    ["콩나물 500g", "300g", S.tofu, 2000, VEG_IMG, "🌱"],
    ["대파", "1/2대", S.veg, 800, ONION_IMG, "🌿"],
    ["다진 마늘", "1큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
    ["멸치 1근", "조금", S.dry, 6500, SAUCE_IMG, "🐟"],
    ["고춧가루", "1작은술", S.banchan, 2500, SAUCE_IMG, "🌶️"],
  ]),
  "두부조림": recipe("rc-tj", [
    ["두부 1모", "1모", S.tofu, 2500, VEG_IMG, "⬜"],
    ["간장", "3큰술", S.banchan, 2200, SAUCE_IMG, "🫙"],
    ["고춧가루", "1큰술", S.banchan, 2500, SAUCE_IMG, "🌶️"],
    ["다진 마늘", "1큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
    ["대파", "1/2대", S.veg, 800, ONION_IMG, "🌿"],
    ["참기름", "1작은술", S.banchan, 3200, SAUCE_IMG, "🫙"],
  ]),
  "잡채": recipe("rc-jc", [
    ["당면", "200g", S.rice, 3500, VEG_IMG, "🍜"],
    ["돼지고기 (채썰기)", "150g", S.meat, 5000, MEAT_IMG, "🥩"],
    ["시금치 1단", "1단", S.veg, 2200, VEG_IMG, "🥬"],
    ["당근", "1/2개", S.veg, 700, VEG_IMG, "🥕"],
    ["양파", "1개", S.veg, 700, VEG_IMG, "🧅"],
    ["간장", "4큰술", S.banchan, 2200, SAUCE_IMG, "🫙"],
    ["참기름", "2큰술", S.banchan, 3200, SAUCE_IMG, "🫙"],
  ]),
  "닭볶음탕": recipe("rc-dk", [
    ["닭볶음탕용 1kg", "1마리", S.meat2, 9000, MEAT_IMG, "🍗"],
    ["감자", "2개", S.veg, 1500, VEG_IMG, "🥔"],
    ["당근", "1개", S.veg, 1000, VEG_IMG, "🥕"],
    ["양파", "1개", S.veg, 700, VEG_IMG, "🧅"],
    ["고추장", "3큰술", S.banchan, 2500, SAUCE_IMG, "🌶️"],
    ["고춧가루", "2큰술", S.banchan, 2500, SAUCE_IMG, "🌶️"],
    ["다진 마늘", "1큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
  ]),
  "김치전": recipe("rc-kj", [
    ["김치 1kg", "200g", S.banchan, 8000, VEG_IMG, "🥬"],
    ["부침가루", "1컵", S.rice, 3000, VEG_IMG, "🌾"],
    ["달걀", "1개", S.veg, 500, VEG_IMG, "🥚"],
    ["대파", "1/2대", S.veg, 800, ONION_IMG, "🌿"],
    ["식용유", "적당량", S.banchan, 4000, SAUCE_IMG, "🫙"],
  ]),
  "해물파전": recipe("rc-hp", [
    ["새우 500g", "100g", S.fish, 10000, MEAT_IMG, "🦐"],
    ["오징어 2마리", "1/2마리", S.fish, 8000, MEAT_IMG, "🦑"],
    ["부추", "1단", S.veg, 2000, VEG_IMG, "🌿"],
    ["부침가루", "1컵", S.rice, 3000, VEG_IMG, "🌾"],
    ["달걀", "1개", S.veg, 500, VEG_IMG, "🥚"],
    ["대파", "1대", S.veg, 800, ONION_IMG, "🌿"],
  ]),
  "북엇국": recipe("rc-bu", [
    ["황태채 200g", "50g", S.dry, 8000, VEG_IMG, "🐟"],
    ["두부", "1/2모", S.tofu, 2500, VEG_IMG, "⬜"],
    ["달걀", "1개", S.veg, 500, VEG_IMG, "🥚"],
    ["대파", "1/2대", S.veg, 800, ONION_IMG, "🌿"],
    ["다진 마늘", "1큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
    ["참기름", "1작은술", S.banchan, 3200, SAUCE_IMG, "🫙"],
  ]),
  "비빔밥": recipe("rc-bb", [
    ["쌀 5kg", "2인분", S.rice, 18000, VEG_IMG, "🍚"],
    ["시금치 1단", "1단", S.veg, 2200, VEG_IMG, "🥬"],
    ["콩나물 500g", "200g", S.tofu, 2000, VEG_IMG, "🌱"],
    ["당근", "1/2개", S.veg, 700, VEG_IMG, "🥕"],
    ["달걀", "2개", S.veg, 1000, VEG_IMG, "🥚"],
    ["고추장", "2큰술", S.banchan, 2500, SAUCE_IMG, "🌶️"],
    ["참기름", "1큰술", S.banchan, 3200, SAUCE_IMG, "🫙"],
  ]),
  "김치볶음밥": recipe("rc-kb", [
    ["김치 1kg", "150g", S.banchan, 8000, VEG_IMG, "🥬"],
    ["쌀 5kg", "2인분", S.rice, 18000, VEG_IMG, "🍚"],
    ["돼지고기 (다짐육)", "100g", S.meat, 3500, MEAT_IMG, "🥩"],
    ["달걀", "2개", S.veg, 1000, VEG_IMG, "🥚"],
    ["김 1봉", "약간", S.dry, 4000, VEG_IMG, "🌊"],
    ["참기름", "1큰술", S.banchan, 3200, SAUCE_IMG, "🫙"],
  ]),
  "시금치나물": recipe("rc-sgn", [
    ["시금치 1단", "1단", S.veg, 2200, VEG_IMG, "🥬"],
    ["다진 마늘", "1큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
    ["참기름", "1큰술", S.banchan, 3200, SAUCE_IMG, "🫙"],
    ["간장", "1작은술", S.banchan, 2200, SAUCE_IMG, "🫙"],
    ["깨소금", "약간", S.banchan, 1500, SAUCE_IMG, "🧂"],
  ]),
  "오이소박이": recipe("rc-os", [
    ["오이", "5개", S.veg, 4000, VEG_IMG, "🥒"],
    ["고춧가루", "3큰술", S.banchan, 2500, SAUCE_IMG, "🌶️"],
    ["다진 마늘", "2큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
    ["대파", "1대", S.veg, 800, ONION_IMG, "🌿"],
    ["멸치액젓", "2큰술", S.dry, 4500, SAUCE_IMG, "🫙"],
  ]),
  "감자채볶음": recipe("rc-gcj", [
    ["감자", "3개", S.veg, 1800, VEG_IMG, "🥔"],
    ["당근", "1/3개", S.veg, 700, VEG_IMG, "🥕"],
    ["양파", "1/2개", S.veg, 700, VEG_IMG, "🧅"],
    ["간장", "1큰술", S.banchan, 2200, SAUCE_IMG, "🫙"],
    ["참기름", "1작은술", S.banchan, 3200, SAUCE_IMG, "🫙"],
  ]),
  "멸치볶음": recipe("rc-mr", [
    ["멸치 1근", "100g", S.dry, 6500, SAUCE_IMG, "🐟"],
    ["간장", "2큰술", S.banchan, 2200, SAUCE_IMG, "🫙"],
    ["설탕", "1큰술", S.banchan, 900, SAUCE_IMG, "🍬"],
    ["다진 마늘", "1작은술", S.banchan, 1200, GARLIC_IMG, "🧄"],
    ["참기름", "1작은술", S.banchan, 3200, SAUCE_IMG, "🫙"],
  ]),
  "주꾸미볶음": recipe("rc-jk", [
    ["주꾸미 500g", "500g", S.fish2, 13000, MEAT_IMG, "🐙"],
    ["양파", "1개", S.veg, 700, VEG_IMG, "🧅"],
    ["대파", "1대", S.veg, 800, ONION_IMG, "🌿"],
    ["고추장", "2큰술", S.banchan, 2500, SAUCE_IMG, "🌶️"],
    ["고춧가루", "1큰술", S.banchan, 2500, SAUCE_IMG, "🌶️"],
    ["다진 마늘", "1큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
  ]),
  "깍두기": recipe("rc-kk", [
    ["무", "1개", S.veg, 2000, VEG_IMG, "⚪"],
    ["고춧가루", "4큰술", S.banchan, 2500, SAUCE_IMG, "🌶️"],
    ["다진 마늘", "2큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
    ["새우젓 500g", "2큰술", S.dry, 7000, SAUCE_IMG, "🦐"],
    ["대파", "1대", S.veg, 800, ONION_IMG, "🌿"],
  ]),
  "무생채": recipe("rc-ms", [
    ["무", "1/2개", S.veg, 1500, VEG_IMG, "⚪"],
    ["고춧가루", "2큰술", S.banchan, 2500, SAUCE_IMG, "🌶️"],
    ["식초", "2큰술", S.banchan, 1800, SAUCE_IMG, "🫙"],
    ["설탕", "1큰술", S.banchan, 900, SAUCE_IMG, "🍬"],
    ["다진 마늘", "1큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
  ]),
  "돼지국밥": recipe("rc-pg", [
    ["보쌈용 수육 300g", "300g", S.meat2, 11000, MEAT_IMG, "🥩"],
    ["대파", "1대", S.veg, 800, ONION_IMG, "🌿"],
    ["다진 마늘", "1큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
    ["새우젓 500g", "약간", S.dry, 7000, SAUCE_IMG, "🦐"],
    ["김치 1kg", "조금", S.banchan, 8000, VEG_IMG, "🥬"],
  ]),
  "소고기무국": recipe("rc-sm", [
    ["소고기 (국거리)", "200g", S.meat, 10000, MEAT_IMG, "🥩"],
    ["무", "1/3개", S.veg, 1500, VEG_IMG, "⚪"],
    ["대파", "1/2대", S.veg, 800, ONION_IMG, "🌿"],
    ["다진 마늘", "1큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
    ["간장", "1큰술", S.banchan, 2200, SAUCE_IMG, "🫙"],
  ]),
  "계란국": recipe("rc-egs", [
    ["계란 30구", "2개분", S.meat, 7500, VEG_IMG, "🥚"],
    ["대파", "1/2대", S.veg, 800, ONION_IMG, "🌿"],
    ["김 1봉", "조금", S.dry, 4000, VEG_IMG, "🌊"],
    ["다진 마늘", "1작은술", S.banchan, 1200, GARLIC_IMG, "🧄"],
    ["참기름", "1작은술", S.banchan, 3200, SAUCE_IMG, "🫙"],
  ]),
  "호박전": recipe("rc-hb", [
    ["애호박", "1개", S.veg, 2000, VEG_IMG, "🥒"],
    ["부침가루", "1컵", S.rice, 3000, VEG_IMG, "🌾"],
    ["달걀", "1개", S.veg, 500, VEG_IMG, "🥚"],
    ["식용유", "적당량", S.banchan, 4000, SAUCE_IMG, "🫙"],
    ["소금", "약간", S.banchan, 500, SAUCE_IMG, "🧂"],
  ]),
  "동그랑땡": recipe("rc-dg", [
    ["다진돼지 500g", "300g", S.meat, 7000, MEAT_IMG, "🥩"],
    ["두부 1모", "1/2모", S.tofu, 2500, VEG_IMG, "⬜"],
    ["당근", "1/4개", S.veg, 700, VEG_IMG, "🥕"],
    ["양파", "1/2개", S.veg, 700, VEG_IMG, "🧅"],
    ["달걀", "2개", S.veg, 1000, VEG_IMG, "🥚"],
    ["다진 마늘", "1큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
  ]),
  "김치찜": recipe("rc-kz", [
    ["묵은지 김치", "1포기", S.banchan, 5000, VEG_IMG, "🥬"],
    ["돼지 삼겹살 500g", "400g", S.meat, 12000, MEAT_IMG, "🥩"],
    ["두부", "1/2모", S.tofu, 2500, VEG_IMG, "⬜"],
    ["대파", "1대", S.veg, 800, ONION_IMG, "🌿"],
    ["다진 마늘", "1큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
  ]),
  "오징어채무침": recipe("rc-oc", [
    ["오징어채", "150g", S.dry, 5500, VEG_IMG, "🦑"],
    ["고추장", "2큰술", S.banchan, 2500, SAUCE_IMG, "🌶️"],
    ["설탕", "1큰술", S.banchan, 900, SAUCE_IMG, "🍬"],
    ["참기름", "1큰술", S.banchan, 3200, SAUCE_IMG, "🫙"],
    ["다진 마늘", "1작은술", S.banchan, 1200, GARLIC_IMG, "🧄"],
  ]),
  "콩나물무침": recipe("rc-knm", [
    ["콩나물 500g", "300g", S.tofu, 2000, VEG_IMG, "🌱"],
    ["다진 마늘", "1큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
    ["참기름", "1큰술", S.banchan, 3200, SAUCE_IMG, "🫙"],
    ["고춧가루", "1작은술", S.banchan, 2500, SAUCE_IMG, "🌶️"],
    ["깨소금", "약간", S.banchan, 1500, SAUCE_IMG, "🧂"],
  ]),
  "파전": recipe("rc-pj", [
    ["대파", "3대", S.veg, 2000, ONION_IMG, "🌿"],
    ["부침가루", "1컵", S.rice, 3000, VEG_IMG, "🌾"],
    ["달걀", "1개", S.veg, 500, VEG_IMG, "🥚"],
    ["식용유", "적당량", S.banchan, 4000, SAUCE_IMG, "🫙"],
    ["간장", "찍어먹기", S.banchan, 2200, SAUCE_IMG, "🫙"],
  ]),
  "간장게장": recipe("rc-gg", [
    ["꽃게 2마리", "2마리", S.fish2, 15000, MEAT_IMG, "🦀"],
    ["간장", "2컵", S.banchan, 2200, SAUCE_IMG, "🫙"],
    ["마늘", "1통", S.banchan, 2000, GARLIC_IMG, "🧄"],
    ["대파", "1대", S.veg, 800, ONION_IMG, "🌿"],
    ["설탕", "2큰술", S.banchan, 900, SAUCE_IMG, "🍬"],
  ]),
  "된장국": recipe("rc-djk", [
    ["된장", "2큰술", S.banchan, 2800, SAUCE_IMG, "🫙"],
    ["두부", "1/2모", S.tofu, 2500, VEG_IMG, "⬜"],
    ["애호박", "1/3개", S.veg, 1200, VEG_IMG, "🥒"],
    ["대파", "1/2대", S.veg, 800, ONION_IMG, "🌿"],
    ["멸치 1근", "조금", S.dry, 6500, SAUCE_IMG, "🐟"],
  ]),
  "감자국": recipe("rc-gjk", [
    ["감자", "3개", S.veg, 1800, VEG_IMG, "🥔"],
    ["대파", "1/2대", S.veg, 800, ONION_IMG, "🌿"],
    ["다진 마늘", "1큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
    ["멸치 1근", "조금", S.dry, 6500, SAUCE_IMG, "🐟"],
    ["간장", "1큰술", S.banchan, 2200, SAUCE_IMG, "🫙"],
  ]),
  "애호박볶음": recipe("rc-ah", [
    ["애호박", "1개", S.veg, 2000, VEG_IMG, "🥒"],
    ["양파", "1/2개", S.veg, 700, VEG_IMG, "🧅"],
    ["다진 마늘", "1작은술", S.banchan, 1200, GARLIC_IMG, "🧄"],
    ["참기름", "1작은술", S.banchan, 3200, SAUCE_IMG, "🫙"],
    ["소금", "약간", S.banchan, 500, SAUCE_IMG, "🧂"],
  ]),
  "소시지야채볶음": recipe("rc-sy", [
    ["돼지불고기 500g", "200g", S.meat, 9000, MEAT_IMG, "🥩"],
    ["양파", "1개", S.veg, 700, VEG_IMG, "🧅"],
    ["당근", "1/2개", S.veg, 700, VEG_IMG, "🥕"],
    ["양배추", "조금", S.veg, 2000, VEG_IMG, "🥬"],
    ["간장", "2큰술", S.banchan, 2200, SAUCE_IMG, "🫙"],
  ]),
  "김치만두전골": recipe("rc-km", [
    ["김치만두 10개", "10개", S.banchan, 6000, VEG_IMG, "🥟"],
    ["김치 1kg", "200g", S.banchan, 8000, VEG_IMG, "🥬"],
    ["두부", "1/2모", S.tofu, 2500, VEG_IMG, "⬜"],
    ["대파", "1대", S.veg, 800, ONION_IMG, "🌿"],
    ["고춧가루", "1큰술", S.banchan, 2500, SAUCE_IMG, "🌶️"],
  ]),
  "계란볶음밥": recipe("rc-erb", [
    ["쌀 5kg", "2인분", S.rice, 18000, VEG_IMG, "🍚"],
    ["달걀", "3개", S.veg, 1500, VEG_IMG, "🥚"],
    ["당근", "1/4개", S.veg, 700, VEG_IMG, "🥕"],
    ["양파", "1/2개", S.veg, 700, VEG_IMG, "🧅"],
    ["간장", "1큰술", S.banchan, 2200, SAUCE_IMG, "🫙"],
    ["참기름", "1큰술", S.banchan, 3200, SAUCE_IMG, "🫙"],
  ]),
  "시래기국": recipe("rc-sr", [
    ["시금치 1단", "시래기 대용", S.veg, 2200, VEG_IMG, "🥬"],
    ["된장", "2큰술", S.banchan, 2800, SAUCE_IMG, "🫙"],
    ["대파", "1/2대", S.veg, 800, ONION_IMG, "🌿"],
    ["다진 마늘", "1큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
    ["멸치 1근", "조금", S.dry, 6500, SAUCE_IMG, "🐟"],
  ]),
  "갈비찜": recipe("rc-gr", [
    ["갈비살 500g", "500g", S.meat, 14000, MEAT_IMG, "🥩"],
    ["무", "1/4개", S.veg, 1500, VEG_IMG, "⚪"],
    ["당근", "1개", S.veg, 1000, VEG_IMG, "🥕"],
    ["간장", "4큰술", S.banchan, 2200, SAUCE_IMG, "🫙"],
    ["설탕", "2큰술", S.banchan, 900, SAUCE_IMG, "🍬"],
    ["다진 마늘", "1큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
  ]),
  "오징어순대": recipe("rc-osd", [
    ["오징어 2마리", "2마리", S.fish, 8000, MEAT_IMG, "🦑"],
    ["당면", "100g", S.rice, 3500, VEG_IMG, "🍜"],
    ["당근", "1/4개", S.veg, 700, VEG_IMG, "🥕"],
    ["양파", "1/2개", S.veg, 700, VEG_IMG, "🧅"],
    ["다진 마늘", "1큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
  ]),
  "바지락칼국수": recipe("rc-pk", [
    ["바지락 1kg", "500g", S.fish2, 8000, MEAT_IMG, "🐚"],
    ["칼국수면", "2인분", S.rice, 4000, VEG_IMG, "🍜"],
    ["애호박", "1/3개", S.veg, 1200, VEG_IMG, "🥒"],
    ["대파", "1대", S.veg, 800, ONION_IMG, "🌿"],
    ["다진 마늘", "1큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
  ]),
  "알탕": recipe("rc-at", [
    ["매운탕 재료", "1세트", S.fish2, 12000, MEAT_IMG, "🍲"],
    ["두부", "1/2모", S.tofu, 2500, VEG_IMG, "⬜"],
    ["대파", "1대", S.veg, 800, ONION_IMG, "🌿"],
    ["고춧가루", "2큰술", S.banchan, 2500, SAUCE_IMG, "🌶️"],
    ["다진 마늘", "1큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
  ]),
  "깻잎장아찌": recipe("rc-kkj", [
    ["깻잎", "2속", S.veg, 2500, VEG_IMG, "🍃"],
    ["간장", "1컵", S.banchan, 2200, SAUCE_IMG, "🫙"],
    ["설탕", "2큰술", S.banchan, 900, SAUCE_IMG, "🍬"],
    ["다진 마늘", "1큰술", S.banchan, 1200, GARLIC_IMG, "🧄"],
    ["식초", "2큰술", S.banchan, 1800, SAUCE_IMG, "🫙"],
  ]),
  "두부김치": recipe("rc-tk", [
    ["두부 1모", "1모", S.tofu, 2500, VEG_IMG, "⬜"],
    ["김치 1kg", "200g", S.banchan, 8000, VEG_IMG, "🥬"],
    ["돼지고기 (다짐육)", "100g", S.meat, 3500, MEAT_IMG, "🥩"],
    ["대파", "1/2대", S.veg, 800, ONION_IMG, "🌿"],
    ["참기름", "1큰술", S.banchan, 3200, SAUCE_IMG, "🫙"],
  ]),
};

const RECIPE_NAMES = Object.keys(RECIPES);

export function CartPage() {
  const {
    items, removeItem, updateQuantity, clearCart, totalCount, totalPrice,
    currentMarketId, addItem, switchMarketAndAdd,
  } = useCart();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [pickupModalOpen, setPickupModalOpen] = useState(false);
  const [pickupMessage, setPickupMessage] = useState("");
  const [pickupNotice, setPickupNotice] = useState("");
  const [editingPickupId, setEditingPickupId] = useState<string | null>(null);
  const [myPickups, setMyPickups] = useState<PickupOrder[]>(() => {
    const session = readAuthSession();
    return listPickupOrdersForCustomer(resolveCustomerPickupKey(session.phone));
  });

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
  const [recipeListOpen, setRecipeListOpen] = useState(false);

  const activeSearchMarket = currentMarketId ?? searchMarket;

  const cartIdSet = useMemo(() => new Set(items.map((i) => i.id)), [items]);

  const filteredRecipeNames = useMemo(() => {
    const q = recipeQuery.trim();
    if (!q) return RECIPE_NAMES;
    return RECIPE_NAMES.filter((name) => name.includes(q) || q.includes(name));
  }, [recipeQuery]);

  const selectRecipe = (name: string) => {
    setRecipeQuery(name);
    setRecipeTitle(name);
    setRecipeResults(RECIPES[name]);
    setAddedIds(new Set());
    setConflictMsg("");
    setResultsCollapsed(false);
    setRecipeListOpen(false);
  };

  const refreshMyPickups = () => {
    const session = readAuthSession();
    setMyPickups(listPickupOrdersForCustomer(resolveCustomerPickupKey(session.phone)));
  };

  useEffect(() => {
    refreshMyPickups();
    const onChange = () => refreshMyPickups();
    window.addEventListener(PICKUP_ORDERS_CHANGED, onChange);
    window.addEventListener("storage", onChange);
    window.addEventListener("focus", onChange);
    return () => {
      window.removeEventListener(PICKUP_ORDERS_CHANGED, onChange);
      window.removeEventListener("storage", onChange);
      window.removeEventListener("focus", onChange);
    };
  }, []);

  const pickupableItems = useMemo(
    () => items.filter((item) => !item.unresolved && item.storeId > 0 && item.storeName.trim()),
    [items],
  );

  const requestedPickups = useMemo(
    () => myPickups.filter((o) => o.status === "requested"),
    [myPickups],
  );

  const openEditPickup = (order: PickupOrder) => {
    setEditingPickupId(order.id);
    setPickupMessage(order.customerMessage || "");
    setPickupModalOpen(true);
  };

  const handleCancelPickup = (orderId: string) => {
    cancelPickupOrder(orderId);
    refreshMyPickups();
    setPickupNotice("픽업 요청을 취소했어요.");
  };

  const submitPickupRequest = () => {
    // 메시지 수정 모드
    if (editingPickupId) {
      updatePickupCustomerMessage(editingPickupId, pickupMessage);
      setEditingPickupId(null);
      setPickupMessage("");
      setPickupModalOpen(false);
      refreshMyPickups();
      setPickupNotice("픽업 요청 메시지를 수정했어요.");
      return;
    }

    if (pickupableItems.length === 0) {
      setPickupNotice("상점이 지정된 상품만 픽업 요청할 수 있어요.");
      setPickupModalOpen(false);
      return;
    }
    const session = readAuthSession();
    const customerKey = resolveCustomerPickupKey(session.phone);
    const marketId = (currentMarketId ?? pickupableItems[0]?.marketId ?? "jungang") as MarketId;
    const byStore = new Map<string, typeof pickupableItems>();
    for (const item of pickupableItems) {
      const key = `${item.storeId}::${item.storeName}`;
      const list = byStore.get(key) ?? [];
      list.push(item);
      byStore.set(key, list);
    }
    const groups = [...byStore.entries()].map(([, storeItems]) => ({
      storeId: storeItems[0].storeId,
      storeName: storeItems[0].storeName,
      items: storeItems.map((item) => ({
        menuId: item.id,
        menuName: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
    }));
    createPickupOrders({
      marketId,
      customerName: session.name || "손님",
      customerPhone: customerKey,
      customerMessage: pickupMessage,
      groups,
    });
    setPickupMessage("");
    setPickupModalOpen(false);
    refreshMyPickups();
    setPickupNotice("픽업 요청이 접수됐어요. 사장님 확인을 기다려 주세요.");
    for (const item of pickupableItems) removeItem(item.id);
  };

  // 폰/PC에서 삭제한 상점이 검색·경로에 다시 안 뜨도록 동기화
  useEffect(() => {
    void import("../data/deletedStoreIds").then(({ refreshDeletedStoreIdsFromRemote }) =>
      refreshDeletedStoreIdsFromRemote(),
    );
    void import("../data/ownerStoreData").then(({ refreshOwnerCatalogFromRemote }) =>
      refreshOwnerCatalogFromRemote(),
    );
  }, []);

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
    if (!q) {
      setRecipeListOpen(true);
      return;
    }
    const match = Object.entries(RECIPES).find(([key]) => key.includes(q) || q.includes(key));
    if (match) {
      selectRecipe(match[0]);
    } else {
      setRecipeTitle("");
      setRecipeResults([]);
      setConflictMsg("");
      setResultsCollapsed(false);
      setRecipeListOpen(false);
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

  const dismissProductSearch = () => {
    setProductGroups(null);
    setProductSearched(false);
  };

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
        <h2 className="text-[14px] text-[#46352C] mb-3">상품 검색</h2>

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
            <div className="flex items-center justify-between px-3 py-2 bg-[#FAF7F2] border-b border-[#E5D9CB]">
              <span className="text-[12px] text-[#6B5142]">
                {productGroups.length === 0
                  ? "검색 결과 없음"
                  : `검색 결과 ${productGroups.length}개`}
              </span>
              <button
                type="button"
                onClick={dismissProductSearch}
                className="p-1 rounded-md text-[#8A776B] active:bg-[#EFE4D8]"
                aria-label="검색 결과 닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {productGroups.length === 0 ? (
              <div className="px-3 py-5 text-center">
                <p className="text-[13px] text-[#6B5142]">상품정보가 없습니다</p>
                <p className="text-[11px] text-[#8A776B] mt-1">장바구니에 추가할 수 없어요</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[42vh] overflow-y-auto">
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
                          <p className="text-[11px] text-[#8A776B]">
                            상점 무관 · {group.offers.length}곳 ·{" "}
                            {group.minPrice === group.maxPrice
                              ? `${group.minPrice.toLocaleString()}원`
                              : `${group.minPrice.toLocaleString()}~${group.maxPrice.toLocaleString()}원`}
                          </p>
                        </div>
                        <span className={`text-[11px] shrink-0 ${unresolvedAdded ? "text-[#0EA5E9]" : "text-[#6B5142]"}`}>
                          {unresolvedAdded ? "담김" : "담기"}
                        </span>
                      </button>

                      {group.offers.map((offer, offerIdx) => {
                        const added = cartIdSet.has(offer.menuId);
                        const isCheapest = offerIdx === 0 && group.offers.length > 1;
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
                              {isCheapest ? (
                                <p className="text-[11px] text-emerald-600">최저가</p>
                              ) : offer.originalPrice != null && offer.originalPrice > offer.price ? (
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
          <p className="mt-2 text-[12px] text-emerald-600 text-center">{productNotice}</p>
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
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span className="text-[14px] text-[#46352C]">
                          {item.unresolved ? `${item.price.toLocaleString()}원~` : `${item.price.toLocaleString()}원`}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-7 h-7 rounded-lg border border-[#E5D9CB] flex items-center justify-center text-[#6B5142] active:bg-[#F5F0E7]"
                            aria-label="수량 줄이기"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center text-[13px] text-[#46352C] tabular-nums">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-7 h-7 rounded-lg border border-[#E5D9CB] flex items-center justify-center text-[#6B5142] active:bg-[#F5F0E7]"
                            aria-label="수량 늘리기"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span className="text-[14px] text-[#46352C]">{item.price.toLocaleString()}원</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-7 h-7 rounded-lg border border-[#E5D9CB] flex items-center justify-center text-[#6B5142] active:bg-[#F5F0E7]"
                            aria-label="수량 줄이기"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center text-[13px] text-[#46352C] tabular-nums">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-7 h-7 rounded-lg border border-[#E5D9CB] flex items-center justify-center text-[#6B5142] active:bg-[#F5F0E7]"
                            aria-label="수량 늘리기"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
            {pickupableItems.length > 0 && requestedPickups.length === 0 && (
              <button
                type="button"
                onClick={() => {
                  setEditingPickupId(null);
                  setPickupMessage("");
                  setPickupNotice("");
                  setPickupModalOpen(true);
                }}
                className="mt-3 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#5B4335] text-white text-[14px] font-semibold active:bg-[#6B5142]"
              >
                <Package className="w-4 h-4" />
                픽업하기
              </button>
            )}
            {items.some((i) => i.unresolved) && (
              <p className="mt-2 text-[11px] text-amber-600 text-center">
                상점 미지정 상품은 픽업 요청에서 제외돼요.
              </p>
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

      {/* 픽업 요청 현황 — 요청중이면 상태·수정·취소 버튼 유지 */}
      {myPickups.length > 0 && (
        <div className="mx-4 mt-3 rounded-2xl border border-[#E5D9CB] bg-white p-4 shadow-[0_8px_24px_-22px_rgba(70,53,44,0.28)]">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-[#A9652D]" />
            <h2 className="text-[14px] text-[#46352C]">픽업 요청 현황</h2>
          </div>
          <div className="space-y-2.5">
            {myPickups.slice(0, 8).map((order) => (
              <div key={order.id} className="rounded-xl bg-[#F7F5F1] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#46352C] truncate">{order.storeName}</p>
                    <p className="text-[11px] text-[#6B5142] mt-0.5">{formatPickupItemsSummary(order)}</p>
                  </div>
                  <span
                    className={`shrink-0 text-[11px] font-semibold px-2 py-1 rounded-full ${
                      order.status === "requested"
                        ? "bg-amber-100 text-amber-800"
                        : order.status === "accepted"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {pickupStatusLabel(order.status)}
                  </span>
                </div>
                <p className="text-[12px] text-[#46352C] mt-1.5">{pickupOrderTotal(order).toLocaleString()}원</p>
                {order.customerMessage && (
                  <p className="text-[11px] text-[#6B5142] mt-1">내 메시지: {order.customerMessage}</p>
                )}
                {order.ownerMessage && (
                  <div className="mt-2 rounded-lg bg-white border border-[#E5D9CB] px-2.5 py-2">
                    <p className="text-[10px] text-[#8A776B] mb-0.5">사장님 메시지</p>
                    <p className="text-[12px] text-[#46352C] whitespace-pre-wrap">{order.ownerMessage}</p>
                  </div>
                )}
                {order.status === "requested" && (
                  <div className="mt-3 grid grid-cols-[1.2fr_1fr_1fr] gap-2">
                    <div className="flex items-center justify-center h-10 rounded-xl bg-amber-100 text-amber-900 text-[12px] font-semibold">
                      픽업요청중
                    </div>
                    <button
                      type="button"
                      onClick={() => openEditPickup(order)}
                      className="h-10 rounded-xl border border-[#E5D9CB] bg-white text-[13px] font-medium text-[#5B4335] active:bg-[#F7F2E8]"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCancelPickup(order.id)}
                      className="h-10 rounded-xl bg-red-50 text-[13px] font-medium text-red-600 border border-red-100 active:bg-red-100"
                    >
                      취소
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {pickupNotice && (
        <p className="mx-4 mt-2 text-[12px] text-emerald-700 text-center">{pickupNotice}</p>
      )}

      {/* Quick Shopping */}
      <div className="bg-white mx-4 mt-3 rounded-2xl p-4 ring-1 ring-inset ring-[#EAE8DF] shadow-[0_8px_24px_-22px_rgba(70,53,44,0.28)]">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-[#8A6A52]" />
          <h2 className="text-[14px] text-[#46352C]">빠른 장보기</h2>
        </div>
        <p className="text-[12px] text-[#6B5142] mb-3">요리명을 검색하면 재료를 자동 추가해요</p>
        <div className="relative mb-2">
          <div className="flex gap-2">
          <input
              type="text"
              value={recipeQuery}
              onChange={(e) => {
                setRecipeQuery(e.target.value);
                setRecipeListOpen(true);
              }}
              onFocus={() => setRecipeListOpen(true)}
              onClick={() => setRecipeListOpen(true)}
              onBlur={() => {
                window.setTimeout(() => setRecipeListOpen(false), 120);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRecipeSearch();
                if (e.key === "Escape") setRecipeListOpen(false);
              }}
            placeholder="요리명을 입력하세요"
            className="flex-1 px-3 py-2.5 bg-[#F7F2E8] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#B89A7D] placeholder:text-[#6B5142]"
          />
          <button
              type="button"
            onClick={handleRecipeSearch}
            className="px-4 py-2.5 bg-[#5B4335] text-white rounded-xl text-[13px] active:bg-[#46352C] transition-colors flex items-center gap-1"
          >
            <Search className="w-3.5 h-3.5" />검색
          </button>
        </div>
          {recipeListOpen && (
            <div
              className="absolute left-0 right-0 z-20 mt-1.5 overflow-hidden rounded-xl bg-white shadow-[0_12px_28px_-12px_rgba(70,53,44,0.35)] ring-1 ring-[#EDE5D8]"
              onMouseDown={(e) => e.preventDefault()}
            >
              <div className="flex items-center justify-between border-b border-[#F0EBE3] bg-[#FAF7F1] px-3 py-2">
                <span className="text-[12px] text-[#6B5142]">
                  요리 목록 {filteredRecipeNames.length}개
                </span>
                <button
                  type="button"
                  aria-label="목록 닫기"
                  onClick={() => setRecipeListOpen(false)}
                  className="rounded-full p-1 text-[#6B5142] active:bg-[#EDE1D5]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-[220px] overflow-y-auto overscroll-contain">
                {filteredRecipeNames.length === 0 ? (
                  <p className="px-3 py-3 text-[13px] text-[#6B5142]">맞는 요리가 없어요</p>
                ) : (
                  filteredRecipeNames.map((name) => {
                    const selected = recipeTitle === name && recipeResults !== null;
                    return (
            <button
              key={name}
                        type="button"
                        onClick={() => selectRecipe(name)}
                        className={`flex w-full items-center justify-between border-b border-[#F0EBE3] px-3 py-2.5 text-left text-[14px] last:border-b-0 ${
                          selected
                            ? "bg-[#F7F2E8] text-[#46352C]"
                            : "text-[#5B4335] active:bg-[#FAF7F1]"
                        }`}
                      >
                        <span>{name}</span>
                        <span className="text-[11px] text-[#8A6A52]">
                          {RECIPES[name].length}개 재료
                        </span>
            </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
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
          상점 무관으로 담으면 최저가 · 최단거리 · 추천 경로가 서로 다르게 나와요
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

      {/* 픽업 요청/수정 팝업 */}
      {pickupModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-[200]"
            onClick={() => {
              setPickupModalOpen(false);
              setEditingPickupId(null);
            }}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[210] w-[min(320px,calc(100vw-32px))] bg-white rounded-[24px] shadow-2xl ring-1 ring-inset ring-[#EAE8DF] overflow-hidden">
            <div className="px-5 pt-5 pb-4">
              <p className="text-[16px] font-bold text-[#46352C] text-center mb-1">
                {editingPickupId ? "픽업 요청 수정" : "픽업요청을 하시겠습니까?"}
              </p>
              <p className="text-[12px] text-[#6B5142] text-center mb-3">
                {editingPickupId
                  ? "사장님께 전할 메시지를 수정할 수 있어요"
                  : `${pickupableItems.length}개 상품 · ${new Set(pickupableItems.map((i) => i.storeName)).size}개 상점`}
              </p>
              <textarea
                value={pickupMessage}
                onChange={(e) => setPickupMessage(e.target.value)}
                placeholder="사장님께 전할 메시지 (예: 오후 5시쯤 찾으러 갈게요)"
                rows={3}
                className="w-full rounded-xl border border-[#E5D9CB] bg-[#F7F5F1] px-3 py-2.5 text-[13px] text-[#46352C] placeholder:text-[#9A897F] focus:outline-none focus:ring-2 focus:ring-[#B89A7D] resize-none"
              />
            </div>
            <div className="flex border-t border-[#EDE5D8]">
              <button
                type="button"
                onClick={() => {
                  setPickupModalOpen(false);
                  setEditingPickupId(null);
                }}
                className="flex-1 py-3.5 text-[14px] text-[#6B5142] active:bg-[#FAF0E3] transition-colors border-r border-[#EDE5D8]"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={submitPickupRequest}
                className="flex-1 py-3.5 text-[14px] font-semibold text-[#5B4335] active:bg-[#F7F2E8] transition-colors"
              >
                {editingPickupId ? "저장" : "확인"}
              </button>
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}
