import { useState } from "react";
import { ChevronLeft, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router";
import { BottomNav } from "../components/BottomNav";

const BUTTONS = [
  { label: "100,000원", value: 100000 },
  { label: "10,000원", value: 10000 },
  { label: "5,000원", value: 5000 },
  { label: "1,000원", value: 1000 },
];

const MIN_POINTS = 1000;

export function SettlementPage() {
  const navigate = useNavigate();
  const [points] = useState(() => {
    try { return Number(localStorage.getItem("user_mileage")) || 3250; } catch { return 3250; }
  });
  const [amount, setAmount] = useState(0);
  const [showDevPopup, setShowDevPopup] = useState(false);

  const canSettle = amount >= MIN_POINTS && amount <= points;

  const handleSettle = () => {
    if (!canSettle) return;
    setShowDevPopup(true);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-28">
      {/* 헤더 */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-[15px] text-gray-900 font-semibold">정산</h1>
          <div className="w-7" />
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">

        {/* 내 포인트 */}
        <div className="bg-white rounded-2xl px-5 py-5 shadow-sm border border-gray-100">
          <p className="text-[12px] text-gray-400 mb-1">내 포인트</p>
          <p className="text-[32px] font-bold text-gray-900 leading-none">
            {points.toLocaleString()}
            <span className="text-[16px] text-gray-400 font-normal ml-1">P</span>
          </p>
          <p className="text-[11px] text-gray-400 mt-2">최소 정산 금액 {MIN_POINTS.toLocaleString()}P 이상</p>
        </div>

        {/* 정산 금액 선택 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-semibold text-gray-800">정산 금액 선택</p>
            <button
              onClick={() => setAmount(0)}
              className="flex items-center gap-1 text-[12px] text-gray-400 active:text-gray-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              초기화
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {BUTTONS.map(({ label, value }) => {
              const disabled = points - amount < value;
              return (
                <button
                  key={value}
                  onClick={() => !disabled && setAmount((prev) => Math.min(prev + value, points))}
                  disabled={disabled}
                  className={`py-3.5 rounded-xl text-[14px] font-semibold transition-colors border-2 ${
                    disabled
                      ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                      : "border-gray-200 bg-white text-gray-800 active:bg-gray-100"
                  }`}
                >
                  +{label}
                </button>
              );
            })}
          </div>

          {/* 선택 금액 표시 */}
          <div className={`rounded-xl px-4 py-4 flex items-center justify-between ${amount > 0 ? "bg-gray-900" : "bg-gray-50 border border-gray-100"}`}>
            <span className={`text-[13px] ${amount > 0 ? "text-gray-300" : "text-gray-400"}`}>선택 금액</span>
            <span className={`text-[22px] font-bold ${amount > 0 ? "text-white" : "text-gray-300"}`}>
              {amount.toLocaleString()}
              <span className={`text-[13px] font-normal ml-1 ${amount > 0 ? "text-gray-300" : "text-gray-400"}`}>원</span>
            </span>
          </div>

          {amount > 0 && amount < MIN_POINTS && (
            <p className="text-[11px] text-red-400 mt-2 text-center">
              최소 {MIN_POINTS.toLocaleString()}원 이상 선택해야 정산할 수 있어요
            </p>
          )}
        </div>

        {/* 정산하기 버튼 */}
        <button
          onClick={handleSettle}
          disabled={!canSettle}
          className={`w-full py-4 rounded-2xl text-[15px] font-bold transition-colors ${
            canSettle
              ? "bg-gray-900 text-white active:bg-gray-700"
              : "bg-gray-100 text-gray-300 cursor-not-allowed"
          }`}
        >
          {canSettle ? `${amount.toLocaleString()}원 정산하기` : "금액을 선택해주세요"}
        </button>
      </div>

      <BottomNav />

      {/* 개발중 팝업 */}
      {showDevPopup && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[200]" onClick={() => setShowDevPopup(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[210] w-[280px] bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 pt-6 pb-5 text-center">
              <p className="text-[28px] mb-2">🔧</p>
              <p className="text-[16px] font-bold text-gray-800 mb-1">개발중입니다</p>
              <p className="text-[13px] text-gray-400">정산 기능은 곧 제공될 예정이에요</p>
            </div>
            <button
              onClick={() => setShowDevPopup(false)}
              className="w-full py-3.5 bg-gray-900 text-white text-[14px] font-semibold active:bg-gray-700 transition-colors"
            >
              확인
            </button>
          </div>
        </>
      )}
    </div>
  );
}
