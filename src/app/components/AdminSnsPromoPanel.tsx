import { useEffect, useState } from "react";
import { refreshSnsPromos, reviewSnsPromo, type SnsPromoRequest } from "../data/snsPromo";

type Draft = { mode: "post" | "reject"; text: string };

export function AdminSnsPromoPanel({ onChanged }: { onChanged?: () => void }) {
  const [items, setItems] = useState<SnsPromoRequest[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    void refreshSnsPromos().then(setItems);
  }, []);

  const pending = items.filter((item) => item.status === "pending");

  const setDraft = (id: string, draft: Draft | null) => {
    setDrafts((prev) => {
      const next = { ...prev };
      if (draft) next[id] = draft;
      else delete next[id];
      return next;
    });
    setErrors((prev) => ({ ...prev, [id]: "" }));
  };

  const confirm = async (item: SnsPromoRequest) => {
    const draft = drafts[item.id];
    if (!draft) return;
    const text = draft.text.trim();
    if (!text) {
      setErrors((prev) => ({ ...prev, [item.id]: draft.mode === "post" ? "게시 링크를 입력해 주세요." : "거절 사유를 입력해 주세요." }));
      return;
    }
    const next = draft.mode === "post"
      ? await reviewSnsPromo(item.id, { status: "posted", link: text })
      : await reviewSnsPromo(item.id, { status: "rejected", reason: text });
    setItems(next);
    setDraft(item.id, null);
    onChanged?.();
  };

  return (
    <div className="space-y-3 rounded-xl bg-white p-4">
      {pending.length === 0 && <p className="py-6 text-center text-[13px] text-gray-400">대기 중인 SNS 홍보 신청이 없어요.</p>}
      {pending.map((item) => {
        const draft = drafts[item.id];
        return (
          <div key={item.id} className="space-y-2 rounded-2xl border border-gray-100 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] text-gray-400">상점</p>
                <p className="text-[14px] font-semibold text-gray-800">{item.storeName}</p>
              </div>
              <span className="flex-shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700">대기</span>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">홍보 문구</p>
              <p className="text-[13px] font-medium text-gray-800">{item.title}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">홍보 내용</p>
              <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-gray-600">{item.content}</p>
            </div>
            {item.images.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto">
                {item.images.map((image, index) => (
                  <img key={index} src={image} alt="" className="h-24 w-24 flex-shrink-0 rounded-xl object-cover" />
                ))}
              </div>
            )}

            {draft ? (
              <div className="space-y-2">
                {draft.mode === "post" ? (
                  <input
                    value={draft.text}
                    onChange={(event) => setDraft(item.id, { ...draft, text: event.target.value })}
                    placeholder="게시한 SNS 링크 (https://...)"
                    className="h-11 w-full rounded-xl bg-gray-50 px-3 text-[13px] outline-none"
                  />
                ) : (
                  <textarea
                    value={draft.text}
                    onChange={(event) => setDraft(item.id, { ...draft, text: event.target.value })}
                    placeholder="거절 사유"
                    className="h-20 w-full rounded-xl bg-gray-50 p-3 text-[13px] outline-none"
                  />
                )}
                {errors[item.id] && <p className="text-[12px] text-red-400">{errors[item.id]}</p>}
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setDraft(item.id, null)} className="h-10 rounded-xl bg-gray-100 text-[13px]">취소</button>
                  <button
                    type="button"
                    onClick={() => void confirm(item)}
                    className={`h-10 rounded-xl text-[13px] text-white ${draft.mode === "post" ? "bg-gray-900" : "bg-rose-500"}`}
                  >
                    {draft.mode === "post" ? "게시 완료" : "사유 전송"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setDraft(item.id, { mode: "post", text: "" })} className="h-10 rounded-xl bg-gray-900 text-[13px] text-white">게시하기</button>
                <button type="button" onClick={() => setDraft(item.id, { mode: "reject", text: "" })} className="h-10 rounded-xl bg-rose-50 text-[13px] text-rose-600">거절</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
