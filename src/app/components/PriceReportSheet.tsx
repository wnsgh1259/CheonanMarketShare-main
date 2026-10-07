import { useState } from "react";
import { Check } from "lucide-react";
import { PRICE_REPORT_POINTS, submitReward } from "../data/rewards";
import { compressImageFile } from "../utils/imageCompress";

type MenuOption = { id: string | number; name: string; price: number };

export function PriceReportSheet({
  storeName,
  menus,
  onClose,
}: {
  storeName: string;
  menus: MenuOption[];
  onClose: () => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | "custom" | null>(null);
  const [customName, setCustomName] = useState("");
  const [priceText, setPriceText] = useState("");
  const [notice, setNotice] = useState("");

  const select = (next: number | "custom") => {
    setSelectedIndex((current) => (current === next ? null : next));
    setPriceText("");
    setNotice("");
  };

  const itemName = selectedIndex === "custom"
    ? customName.trim()
    : selectedIndex === null
      ? ""
      : menus[selectedIndex]?.name ?? "";

  const send = async (file?: File) => {
    if (!file || !itemName || !priceText) {
      setNotice("메뉴, 실제 가격, 사진을 모두 넣어 주세요.");
      return;
    }
    const image = await compressImageFile(file, { maxWidth: 720, maxHeight: 720, quality: 0.62 });
    await submitReward({
      kind: "price",
      storeName,
      itemName,
      priceText,
      image,
    });
    setNotice(`제보를 보냈어요. 승인되면 ${PRICE_REPORT_POINTS}P가 적립돼요.`);
    setPriceText("");
  };

  return (
    <div data-vaul-no-drag className="pointer-events-auto fixed inset-0 z-[2100] flex items-end justify-center rounded-t-2xl bg-black/40" onClick={onClose}>
      <div className="pointer-events-auto max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" />
        <h3 className="text-[16px] font-bold text-gray-800">가격 제보</h3>
        <p className="mt-1 text-[12px] leading-relaxed text-gray-400">
          {storeName} 가격이 화면과 다르면 메뉴를 고르고 사진과 함께 알려 주세요. 관리자가 승인하면 {PRICE_REPORT_POINTS}P가 적립되고 가격이 바뀝니다.
        </p>
        <div className="mt-4 space-y-2">
          {menus.map((menu, index) => {
            const checked = selectedIndex === index;
            return (
              <div key={`${menu.id}-${index}`} className="space-y-2 rounded-lg border border-gray-100 p-3">
                <button type="button" onClick={() => select(index)} className="flex w-full items-center justify-between gap-3 text-left">
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] text-gray-900">{menu.name}</span>
                    <span className="text-[12px] text-gray-400">{menu.price.toLocaleString()}원</span>
                  </span>
                  <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[4px] border ${checked ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white"}`}>
                    {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                </button>
                {checked && (
                  <div className="flex items-center gap-2">
                    <input
                      inputMode="numeric"
                      value={priceText}
                      onChange={(event) => setPriceText(event.target.value.replace(/[^\d]/g, ""))}
                      placeholder="실제 가격"
                      className="h-9 flex-1 rounded-lg bg-gray-100 px-3 text-[13px] outline-none"
                    />
                    <span className="w-6 text-[12px] text-gray-500">원</span>
                  </div>
                )}
              </div>
            );
          })}
          <div className="space-y-2 rounded-lg border border-gray-100 p-3">
            <button type="button" onClick={() => select("custom")} className="flex w-full items-center justify-between gap-3 text-left">
              <span className="text-[13px] text-gray-900">목록에 없는 메뉴</span>
              <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[4px] border ${selectedIndex === "custom" ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white"}`}>
                {selectedIndex === "custom" && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
            </button>
            {selectedIndex === "custom" && (
              <div className="space-y-2">
                <input
                  value={customName}
                  onChange={(event) => setCustomName(event.target.value)}
                  placeholder="메뉴 이름"
                  className="h-9 w-full rounded-lg bg-gray-100 px-3 text-[13px] outline-none"
                />
                <div className="flex items-center gap-2">
                  <input
                    inputMode="numeric"
                    value={priceText}
                    onChange={(event) => setPriceText(event.target.value.replace(/[^\d]/g, ""))}
                    placeholder="실제 가격"
                    className="h-9 flex-1 rounded-lg bg-gray-100 px-3 text-[13px] outline-none"
                  />
                  <span className="w-6 text-[12px] text-gray-500">원</span>
                </div>
              </div>
            )}
          </div>
        </div>
        <label className="mt-3 flex h-11 items-center justify-center rounded-xl bg-gray-900 text-[13px] font-medium text-white">
          가격 사진 보내기
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => void send(event.target.files?.[0])} />
        </label>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 flex h-11 w-full items-center justify-center rounded-xl bg-gray-100 text-[13px] font-medium text-gray-700 active:bg-gray-200"
        >
          확인
        </button>
        {notice && <p className={`mt-2 text-[12px] ${notice.startsWith("제보를 보냈어요") ? "text-emerald-700" : "text-rose-500"}`}>{notice}</p>}
      </div>
    </div>
  );
}
