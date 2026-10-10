export const DAILY_PROMOTION_LIMIT_MINUTES = 4 * 60;

export type DiscountMode = "percent" | "amount";

export type MenuDiscount = {
  menuId: number;
  mode: DiscountMode;
  value: number;
};

export type PromotionSlot = {
  id: string;
  date: string;
  startAt: string;
  endAt: string;
  minutes: number;
};

export type StorePromotion = {
  note: string;
  menuDiscounts: MenuDiscount[];
  slots: PromotionSlot[];
  activeSlotId?: string;
};

export type DealMenuInput = {
  menuId: number;
  name: string;
  price: number;
  enabled: boolean;
  mode: DiscountMode;
  value: number;
};

export function localDateKey(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toDatetimeLocalValue(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseMenuPrice(price: string | number) {
  if (typeof price === "number") return Number.isFinite(price) ? price : 0;
  const numeric = Number(String(price).replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

export function formatMinutes(total: number) {
  const minutes = Math.max(0, Math.round(total));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours <= 0) return `${rest}분`;
  if (rest === 0) return `${hours}시간`;
  return `${hours}시간 ${rest}분`;
}

export function formatDealClock(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function discountedPrice(base: number, mode: DiscountMode, value: number) {
  if (base <= 0 || value <= 0) return base;
  if (mode === "percent") {
    const percent = Math.min(90, value);
    return Math.max(0, Math.round(base * (1 - percent / 100)));
  }
  return Math.max(0, base - value);
}

export function getActiveSlot(promotion: StorePromotion | null | undefined, now = Date.now()) {
  if (!promotion?.activeSlotId) return null;
  const slot = promotion.slots.find((item) => item.id === promotion.activeSlotId);
  if (!slot) return null;
  const start = Date.parse(slot.startAt);
  const end = Date.parse(slot.endAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (now >= start && now < end) return slot;
  return null;
}

export function getScheduledSlot(promotion: StorePromotion | null | undefined, now = Date.now()) {
  if (!promotion?.activeSlotId) return null;
  const slot = promotion.slots.find((item) => item.id === promotion.activeSlotId);
  if (!slot) return null;
  const start = Date.parse(slot.startAt);
  const end = Date.parse(slot.endAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (now < end) return slot;
  return null;
}

export function usedMinutesOnDate(
  promotion: StorePromotion | null | undefined,
  dateKey: string,
) {
  if (!promotion) return 0;
  return promotion.slots
    .filter((slot) => slot.date === dateKey)
    .reduce((sum, slot) => sum + Math.max(0, slot.minutes), 0);
}

export function remainingMinutesOnDate(
  promotion: StorePromotion | null | undefined,
  dateKey: string,
) {
  return Math.max(0, DAILY_PROMOTION_LIMIT_MINUTES - usedMinutesOnDate(promotion, dateKey));
}

function pruneSlots(slots: PromotionSlot[], now: number) {
  const cutoff = now - 2 * 24 * 60 * 60 * 1000;
  return slots.filter((slot) => Date.parse(slot.endAt) >= cutoff);
}

function overlaps(start: number, end: number, slot: PromotionSlot) {
  const slotStart = Date.parse(slot.startAt);
  const slotEnd = Date.parse(slot.endAt);
  return start < slotEnd && slotStart < end;
}

export function commitStorePromotion(
  existing: StorePromotion | null | undefined,
  input: {
    note: string;
    startLocal: string;
    endLocal: string;
    menus: DealMenuInput[];
  },
  now = Date.now(),
): { ok: true; promotion: StorePromotion } | { ok: false; error: string } {
  const note = input.note.trim();
  if (!note) return { ok: false, error: "할인·이벤트 내용을 입력해 주세요." };
  if (note.length > 200) return { ok: false, error: "내용은 200자 이내로 입력해 주세요." };

  const start = new Date(input.startLocal);
  const end = new Date(input.endLocal);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false, error: "시작과 종료 시간을 선택해 주세요." };
  }
  if (end.getTime() <= start.getTime()) {
    return { ok: false, error: "종료 시간은 시작 시간보다 뒤여야 합니다." };
  }
  if (end.getTime() <= now) {
    return { ok: false, error: "이미 지난 시간으로는 켤 수 없습니다." };
  }
  const dateKey = localDateKey(start);
  if (localDateKey(end) !== dateKey) {
    return { ok: false, error: "시작과 종료는 같은 날 안에서만 설정할 수 있습니다." };
  }
  if (dateKey !== localDateKey(new Date(now))) {
    return { ok: false, error: "할인·이벤트는 오늘 날짜만 켤 수 있습니다." };
  }

  const minutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
  const enabled = input.menus.filter((menu) => menu.enabled);
  if (enabled.length === 0) {
    return { ok: false, error: "할인할 메뉴를 하나 이상 선택해 주세요." };
  }
  for (const menu of enabled) {
    if (menu.mode === "percent") {
      if (!Number.isInteger(menu.value) || menu.value < 1 || menu.value > 90) {
        return { ok: false, error: `${menu.name} 할인율은 1~90%로 입력해 주세요.` };
      }
    } else if (!Number.isInteger(menu.value) || menu.value < 100 || menu.value >= menu.price) {
      return { ok: false, error: `${menu.name} 할인 금액은 100원 이상, 정가보다 작게 입력해 주세요.` };
    }
  }

  let slots = pruneSlots([...(existing?.slots ?? [])], now);
  const active = slots.find((slot) => slot.id === existing?.activeSlotId);
  if (active && Date.parse(active.startAt) > now) {
    slots = slots.filter((slot) => slot.id !== active.id);
  } else if (active && now >= Date.parse(active.startAt) && now < Date.parse(active.endAt)) {
    const elapsed = Math.max(1, Math.round((now - Date.parse(active.startAt)) / 60000));
    slots = slots.map((slot) =>
      slot.id === active.id
        ? {
            ...slot,
            endAt: new Date(now).toISOString(),
            minutes: Math.min(slot.minutes, elapsed),
          }
        : slot,
    );
  }

  const used = slots
    .filter((slot) => slot.date === dateKey)
    .reduce((sum, slot) => sum + slot.minutes, 0);
  if (used + minutes > DAILY_PROMOTION_LIMIT_MINUTES) {
    const remain = DAILY_PROMOTION_LIMIT_MINUTES - used;
    return {
      ok: false,
      error: remain <= 0
        ? "오늘 할인·이벤트는 4시간을 모두 사용했습니다."
        : `오늘 남은 시간은 ${formatMinutes(remain)}입니다. 그 안으로 시간을 줄여 주세요.`,
    };
  }

  const nextSlot: PromotionSlot = {
    id: `deal-${now}`,
    date: dateKey,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    minutes,
  };
  if (slots.some((slot) => overlaps(start.getTime(), end.getTime(), slot))) {
    return { ok: false, error: "이미 사용한 시간과 겹칩니다. 다른 시간으로 설정해 주세요." };
  }

  return {
    ok: true,
    promotion: {
      note,
      menuDiscounts: enabled.map((menu) => ({
        menuId: menu.menuId,
        mode: menu.mode,
        value: menu.value,
      })),
      slots: [...slots, nextSlot],
      activeSlotId: nextSlot.id,
    },
  };
}

export function turnOffStorePromotion(
  existing: StorePromotion | null | undefined,
  now = Date.now(),
): StorePromotion | null {
  if (!existing?.activeSlotId) return existing ?? null;
  const active = existing.slots.find((slot) => slot.id === existing.activeSlotId);
  if (!active) return { ...existing, activeSlotId: undefined };
  const start = Date.parse(active.startAt);
  const end = Date.parse(active.endAt);
  if (now < start) {
    return {
      ...existing,
      activeSlotId: undefined,
      slots: existing.slots.filter((slot) => slot.id !== active.id),
    };
  }
  if (now < end) {
    const elapsed = Math.max(1, Math.round((now - start) / 60000));
    return {
      ...existing,
      activeSlotId: undefined,
      slots: existing.slots.map((slot) =>
        slot.id === active.id
          ? { ...slot, endAt: new Date(now).toISOString(), minutes: Math.min(slot.minutes, elapsed) }
          : slot,
      ),
    };
  }
  return { ...existing, activeSlotId: undefined };
}

export type LiveDealView = {
  storeId: number;
  storeName: string;
  marketId?: string;
  location: string;
  category: string;
  image?: string;
  note: string;
  startAt: string;
  endAt: string;
  items: Array<{
    name: string;
    originalPrice: number;
    price: number;
    mode: DiscountMode;
    value: number;
  }>;
};

type DealStoreLike = {
  id: number;
  name: string;
  marketId?: string;
  location?: string;
  category?: string;
  image?: string;
  menus?: Array<{ id: number; name: string; price: string | number }>;
  promotion?: StorePromotion;
};

export function listLiveDeals(stores: DealStoreLike[], now = Date.now(), marketId?: string): LiveDealView[] {
  return stores.flatMap((store) => {
    if (marketId && store.marketId !== marketId) return [];
    const slot = getActiveSlot(store.promotion, now);
    if (!slot || !store.promotion) return [];
    const items = store.promotion.menuDiscounts.flatMap((discount) => {
      const menu = store.menus?.find((item) => item.id === discount.menuId);
      if (!menu) return [];
      const originalPrice = parseMenuPrice(menu.price);
      return [{
        name: menu.name,
        originalPrice,
        price: discountedPrice(originalPrice, discount.mode, discount.value),
        mode: discount.mode,
        value: discount.value,
      }];
    });
    return [{
      storeId: store.id,
      storeName: store.name,
      marketId: store.marketId,
      location: store.location || "",
      category: store.category || "",
      image: store.image,
      note: store.promotion.note,
      startAt: slot.startAt,
      endAt: slot.endAt,
      items,
    }];
  });
}
