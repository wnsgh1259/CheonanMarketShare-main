import type { MarketId } from "../components/CartContext";

export type PickupStatus = "requested" | "accepted" | "rejected";

export type PickupOrderItem = {
  menuId: string;
  menuName: string;
  quantity: number;
  price: number;
};

export type PickupOrder = {
  id: string;
  marketId: MarketId;
  storeId: number;
  storeName: string;
  customerName: string;
  customerPhone: string;
  items: PickupOrderItem[];
  customerMessage: string;
  ownerMessage: string;
  status: PickupStatus;
  createdAt: string;
  respondedAt?: string;
};

const STORAGE_KEY = "cheonan_pickup_orders";
export const PICKUP_ORDERS_CHANGED = "pickup_orders_changed";

/** 손님 식별키 — 전화번호 또는 guest-demo */
export function resolveCustomerPickupKey(phone?: string, fallbackGuestId = "guest-demo"): string {
  const raw = (phone ?? "").trim();
  if (!raw) return fallbackGuestId;
  if (raw.startsWith("guest-")) return raw;
  const digits = raw.replace(/\D/g, "");
  return digits || fallbackGuestId;
}

function safeParse(raw: string | null): PickupOrder[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is PickupOrder =>
        !!row &&
        typeof row === "object" &&
        typeof (row as PickupOrder).id === "string" &&
        typeof (row as PickupOrder).storeName === "string",
    );
  } catch {
    return [];
  }
}

export function loadPickupOrders(): PickupOrder[] {
  return safeParse(localStorage.getItem(STORAGE_KEY));
}

export function savePickupOrders(orders: PickupOrder[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  window.dispatchEvent(new Event(PICKUP_ORDERS_CHANGED));
}

export function createPickupOrders(input: {
  marketId: MarketId;
  customerName: string;
  customerPhone: string;
  customerMessage: string;
  groups: Array<{
    storeId: number;
    storeName: string;
    items: PickupOrderItem[];
  }>;
}): PickupOrder[] {
  const now = new Date().toISOString();
  const created: PickupOrder[] = input.groups
    .filter((g) => g.items.length > 0 && g.storeName.trim())
    .map((g, index) => ({
      id: `pickup-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
      marketId: input.marketId,
      storeId: g.storeId,
      storeName: g.storeName.trim(),
      customerName: input.customerName.trim() || "손님",
      customerPhone: resolveCustomerPickupKey(input.customerPhone),
      items: g.items,
      customerMessage: input.customerMessage.trim(),
      ownerMessage: "",
      status: "requested" as const,
      createdAt: now,
    }));

  if (created.length === 0) return [];
  const next = [...created, ...loadPickupOrders()];
  savePickupOrders(next);
  return created;
}

export function respondPickupOrder(
  orderId: string,
  status: "accepted" | "rejected",
  ownerMessage: string,
): PickupOrder | null {
  const orders = loadPickupOrders();
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx < 0) return null;
  const updated: PickupOrder = {
    ...orders[idx],
    status,
    ownerMessage: ownerMessage.trim(),
    respondedAt: new Date().toISOString(),
  };
  const next = [...orders];
  next[idx] = updated;
  savePickupOrders(next);
  return updated;
}

export function storeMatchesOwner(
  order: PickupOrder,
  ownerStoreId: number | null | undefined,
  ownerStoreName: string,
): boolean {
  const name = ownerStoreName.trim();
  if (name && order.storeName === name) return true;
  if (ownerStoreId == null || !Number.isFinite(ownerStoreId)) return false;
  if (order.storeId === ownerStoreId) return true;
  // 시드 id(1~) vs 관리자 합성 id(시장*10000+시드)
  if (ownerStoreId >= 10000 && order.storeId === ownerStoreId % 10000) return true;
  if (order.storeId >= 10000 && ownerStoreId === order.storeId % 10000) return true;
  return false;
}

export function listPickupOrdersForOwner(
  ownerStoreId: number | null | undefined,
  ownerStoreName: string,
): PickupOrder[] {
  return loadPickupOrders()
    .filter((o) => storeMatchesOwner(o, ownerStoreId, ownerStoreName))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listPickupOrdersForCustomer(customerPhone: string): PickupOrder[] {
  const key = resolveCustomerPickupKey(customerPhone);
  return loadPickupOrders()
    .filter((o) => resolveCustomerPickupKey(o.customerPhone) === key)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function cancelPickupOrder(orderId: string): boolean {
  const orders = loadPickupOrders();
  const next = orders.filter((o) => o.id !== orderId);
  if (next.length === orders.length) return false;
  savePickupOrders(next);
  return true;
}

export function updatePickupCustomerMessage(orderId: string, message: string): PickupOrder | null {
  const orders = loadPickupOrders();
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx < 0) return null;
  if (orders[idx].status !== "requested") return null;
  const updated: PickupOrder = {
    ...orders[idx],
    customerMessage: message.trim(),
  };
  const next = [...orders];
  next[idx] = updated;
  savePickupOrders(next);
  return updated;
}

export function pickupStatusLabel(status: PickupStatus): string {
  if (status === "requested") return "픽업요청중";
  if (status === "accepted") return "픽업확정";
  return "픽업거절";
}

export function pickupOrderTotal(order: PickupOrder): number {
  return order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function formatPickupItemsSummary(order: PickupOrder): string {
  return order.items.map((i) => `${i.menuName} ${i.quantity}개`).join(", ");
}
