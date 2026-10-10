import { useEffect, useState } from "react";
import { AdminIdolPanel } from "./AdminIdolPanel";
import { AdminSnsPromoPanel } from "./AdminSnsPromoPanel";
import { refreshSnsPromos } from "../data/snsPromo";
import { EVENT_DEFS, refreshSubmissions, reviewSubmission, type RewardSubmission } from "../data/rewards";

export function AdminRewardPanel({ onPendingChange }: { onPendingChange?: (total: number) => void }) {
  const [tab, setTab] = useState<"photo" | "price" | "idol" | "sns">("photo");
  const [items, setItems] = useState<RewardSubmission[]>([]);
  const [snsPendingCount, setSnsPendingCount] = useState(0);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const reloadSns = () => {
    void refreshSnsPromos().then((promos) => {
      setSnsPendingCount(promos.filter((promo) => promo.status === "pending").length);
    });
  };

  useEffect(() => {
    void refreshSubmissions().then(setItems);
    reloadSns();
  }, []);

  const pendingCounts = {
    photo: items.filter((item) => item.status === "pending" && item.kind === "photo-event").length,
    price: items.filter((item) => item.status === "pending" && item.kind === "price").length,
    sns: snsPendingCount,
    idol: 0,
  };

  useEffect(() => {
    onPendingChange?.(pendingCounts.photo + pendingCounts.price + pendingCounts.sns);
  }, [pendingCounts.photo, pendingCounts.price, pendingCounts.sns]);

  const visible = items.filter((item) => item.status === "pending" && item.kind === (tab === "photo" ? "photo-event" : "price"));

  const tabLabels = { photo: "이벤트", price: "가격 제보", sns: "SNS홍보", idol: "아이돌" } as const;

  const decide = async (id: string, status: "approved" | "rejected") => {
    const next = await reviewSubmission(id, status, reason);
    setItems(next);
    setRejectingId(null);
    setReason("");
  };

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl p-3 flex gap-2">
        {(["photo", "price", "sns", "idol"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`h-9 px-3 rounded-lg text-[12px] font-medium inline-flex items-center gap-1.5 ${tab === key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            {tabLabels[key]}
            {pendingCounts[key] > 0 && (
              <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold inline-flex items-center justify-center ${tab === key ? "bg-white text-gray-900" : "bg-amber-500 text-white"}`}>
                {pendingCounts[key]}
              </span>
            )}
          </button>
        ))}
      </div>
      {tab === "idol" ? <AdminIdolPanel /> : tab === "sns" ? <AdminSnsPromoPanel onChanged={reloadSns} /> : (
    <div className="bg-white rounded-xl p-4 space-y-3">
      {visible.length === 0 && <p className="text-[13px] text-gray-400 py-6 text-center">대기 중인 신청이 없어요.</p>}
      {visible.map((item) => (
        <div key={item.id} className="border border-gray-100 rounded-2xl p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[13px] font-semibold text-gray-800">{item.userName} · {item.storeName}</p>
              <p className="text-[11px] text-gray-400">{item.kind === "price" ? `${item.itemName} ${item.priceText}` : (EVENT_DEFS.find((event) => event.id === item.eventId)?.name || item.note || "사진 이벤트")}</p>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${item.status === "pending" ? "bg-amber-100 text-amber-700" : item.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"}`}>
              {item.status === "pending" ? "대기" : item.status === "approved" ? "승인" : "거절"}
            </span>
          </div>
          {item.image && <img src={item.image} alt="" className="w-full max-h-40 object-cover rounded-xl" />}
          {item.status === "rejected" && item.rejectReason && <p className="text-[12px] text-rose-500">거절 사유: {item.rejectReason}</p>}
          {item.status === "pending" && (
            <>
              {rejectingId === item.id ? (
                <div className="space-y-2">
                  <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="거절 사유" className="w-full h-20 rounded-xl bg-gray-50 p-3 text-[13px] outline-none" />
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setRejectingId(null)} className="h-10 rounded-xl bg-gray-100 text-[13px]">취소</button>
                    <button type="button" onClick={() => void decide(item.id, "rejected")} className="h-10 rounded-xl bg-rose-500 text-white text-[13px]">사유 전송</button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => void decide(item.id, "approved")} className="h-10 rounded-xl bg-gray-900 text-white text-[13px]">승인</button>
                  <button type="button" onClick={() => { setRejectingId(item.id); setReason(""); }} className="h-10 rounded-xl bg-rose-50 text-rose-600 text-[13px]">거절</button>
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
      )}
    </div>
  );
}
