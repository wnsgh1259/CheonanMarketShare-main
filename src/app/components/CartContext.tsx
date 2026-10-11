import { createContext, useContext, useState, ReactNode } from "react";

export type MarketId = "jungang" | "byeongcheon" | "seonghwan";

export interface CartItem {
  id: string;
  name: string;
  storeName: string;
  /** 상점 미지정(unresolved)일 때 0 */
  storeId: number;
  marketId: MarketId;
  price: number;
  quantity: number;
  image: string;
  isQuickAdd?: boolean;
  /** 상점 상관없이 상품명만 담은 경우 — 경로 추천 시 상점 배정 */
  unresolved?: boolean;
}

interface CartContextType {
  items: CartItem[];
  currentMarketId: MarketId | null;
  addItem: (item: CartItem) => "added" | "market_conflict";
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  switchMarketAndAdd: (item: CartItem) => void;
  totalPrice: number;
  totalCount: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [currentMarketId, setCurrentMarketId] = useState<MarketId | null>(null);

  const addItem = (item: CartItem): "added" | "market_conflict" => {
    if (currentMarketId && currentMarketId !== item.marketId) {
      return "market_conflict";
    }
    setCurrentMarketId(item.marketId);
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: item.quantity > 0 ? item.quantity : 1 }];
    });
    return "added";
  };

  const switchMarketAndAdd = (item: CartItem) => {
    setItems([{ ...item, quantity: item.quantity > 0 ? item.quantity : 1 }]);
    setCurrentMarketId(item.marketId);
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      if (next.length === 0) setCurrentMarketId(null);
      return next;
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity } : i)),
    );
  };

  const clearCart = () => {
    setItems([]);
    setCurrentMarketId(null);
  };

  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalCount = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        currentMarketId,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        switchMarketAndAdd,
        totalPrice,
        totalCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
}
