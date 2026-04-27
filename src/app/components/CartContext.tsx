import { createContext, useContext, useState, ReactNode } from "react";

export type MarketId = "jungang" | "byeongcheon" | "seonghwan";

export interface CartItem {
  id: string;
  name: string;
  storeName: string;
  storeId: number;
  marketId: MarketId;
  price: number;
  quantity: number;
  image: string;
  isQuickAdd?: boolean;
}

interface CartContextType {
  items: CartItem[];
  currentMarketId: MarketId | null;
  addItem: (item: CartItem) => "added" | "market_conflict";
  removeItem: (id: string) => void;
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
      return [...prev, { ...item, quantity: 1 }];
    });
    return "added";
  };

  const switchMarketAndAdd = (item: CartItem) => {
    setItems([{ ...item, quantity: 1 }]);
    setCurrentMarketId(item.marketId);
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      if (next.length === 0) setCurrentMarketId(null);
      return next;
    });
  };

  const clearCart = () => {
    setItems([]);
    setCurrentMarketId(null);
  };

  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalCount = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, currentMarketId, addItem, removeItem, clearCart, switchMarketAndAdd, totalPrice, totalCount }}
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