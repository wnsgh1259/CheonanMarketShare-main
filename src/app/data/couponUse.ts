import { couponValue, loadCoupons, markCouponUsed, syncRewardState, type EarnedCoupon } from "./rewards";
import { creditStore } from "./storePoints";

export type RedeemResult =
  | { ok: true; coupon: EarnedCoupon; amount: number }
  | { ok: false; error: string };

/** 손님 쿠폰을 사용 처리하고, 할인해 준 금액만큼 가게에 포인트를 넣는다. */
export async function redeemCoupon(couponId: string, store: { id: number; name: string }): Promise<RedeemResult> {
  await syncRewardState();
  const current = loadCoupons().find((item) => item.id === couponId);
  if (!current) return { ok: false, error: "쿠폰을 찾을 수 없어요." };
  if (current.usedAt) return { ok: false, error: "이미 사용한 쿠폰이에요." };
  const used = markCouponUsed(couponId, store);
  if (!used) return { ok: false, error: "이미 사용한 쿠폰이에요." };
  const amount = couponValue(used);
  await creditStore(store.id, amount, `쿠폰 할인 · ${used.title}`, `coupon-${used.id}`);
  return { ok: true, coupon: used, amount };
}
