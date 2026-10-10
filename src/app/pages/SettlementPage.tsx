import { useEffect, useState } from "react";
import { ChevronLeft, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router";
import { BottomNav } from "../components/BottomNav";
import { loadOwnerCatalog } from "../data/ownerStoreData";
import type { PointEntry } from "../data/rewards";
import { loadStoreLedger, syncStorePoints } from "../data/storePoints";

const HISTORY_PAGE_SIZE = 5;

function formatDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const BUTTONS = [
  { label: "100,000원", value: 100000 },
  { label: "10,000원", value: 10000 },
  { label: "5,000원", value: 5000 },
  { label: "1,000원", value: 1000 },
];

const MIN_POINTS = 1000;
const SETTLEMENT_BANK_NAME_KEY = "settlement_bank_name";

export function SettlementPage() {
  const navigate = useNavigate();
  const storeId = (() => {
    const raw = Number(localStorage.getItem("owner_store_id"));
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  })();
  const storeName = storeId ? (loadOwnerCatalog().stores ?? []).find((store) => store.id === storeId)?.name ?? "" : "";
  const [ledger, setLedger] = useState<PointEntry[]>(() => (storeId ? loadStoreLedger(storeId) : []));
  const [historyPage, setHistoryPage] = useState(0);
  const points = Math.max(0, ledger.reduce((sum, entry) => sum + entry.points, 0));
  const historyPages = Math.max(1, Math.ceil(ledger.length / HISTORY_PAGE_SIZE));
  const currentHistoryPage = Math.min(historyPage, historyPages - 1);
  const pagedLedger = ledger.slice(currentHistoryPage * HISTORY_PAGE_SIZE, (currentHistoryPage + 1) * HISTORY_PAGE_SIZE);

  useEffect(() => {
    if (!storeId) return;
    void syncStorePoints(storeId).then(() => setLedger(loadStoreLedger(storeId)));
  }, [storeId]);
  const [amount, setAmount] = useState(0);
  const [bankName, setBankName] = useState(() => {
    try { return localStorage.getItem(SETTLEMENT_BANK_NAME_KEY) || ""; } catch { return ""; }
  });
  const [showDevPopup, setShowDevPopup] = useState(false);

  const canSettle = amount >= MIN_POINTS && amount <= points && bankName.trim().length > 0;

  const handleBankNameChange = (value: string) => {
    setBankName(value);
    localStorage.setItem(SETTLEMENT_BANK_NAME_KEY, value);
  };

  const handleSettle = () => {
    if (!canSettle) return;
    setShowDevPopup(true);
  };

  const settleButtonLabel = (() => {
    if (amount < MIN_POINTS) return "금액을 선택해주세요";
    if (!bankName.trim()) return "은행명을 입력해주세요";
    return `${amount.toLocaleString()}원 정산하기`;
  })();

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
          <p className="text-[12px] text-gray-400 mb-1">내 포인트{storeName ? ` · ${storeName}` : ""}</p>
          <p className="text-[32px] font-bold text-gray-900 leading-none">
            {points.toLocaleString()}
            <span className="text-[16px] text-gray-400 font-normal ml-1">P</span>
          </p>
          <p className="text-[11px] text-gray-400 mt-2">최소 정산 금액 {MIN_POINTS.toLocaleString()}P 이상</p>
          <p className="text-[11px] text-gray-400 mt-0.5">손님 쿠폰으로 할인해 준 금액만큼 포인트가 들어와요.</p>
        </div>

        {/* 포인트 내역 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-semibold text-gray-800">포인트 내역</p>
            <span className="text-[11px] text-gray-400">{ledger.length}건</span>
          </div>
          {!storeId ? (
            <p className="py-6 text-center text-[12px] text-gray-400">가게 정보를 찾을 수 없어요. 다시 로그인해 주세요.</p>
          ) : ledger.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-gray-400">아직 받은 포인트가 없어요.</p>
          ) : (
            <div className="space-y-2">
              {pagedLedger.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] text-gray-700">{entry.label}</p>
                    <p className="text-[10px] text-gray-400">{formatDateTime(entry.at)}</p>
                  </div>
                  <span className={`flex-shrink-0 text-[13px] font-bold ${entry.points >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                    {entry.points >= 0 ? "+" : ""}{entry.points.toLocaleString()}P
                  </span>
                </div>
              ))}
              {historyPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={currentHistoryPage === 0}
                    onClick={() => setHistoryPage(currentHistoryPage - 1)}
                    className="h-9 rounded-full border border-gray-200 bg-white px-4 text-[12px] font-medium text-gray-600 disabled:opacity-40"
                  >
                    ‹ 이전
                  </button>
                  <span className="text-[12px] text-gray-500">{currentHistoryPage + 1} / {historyPages}</span>
                  <button
                    type="button"
                    disabled={currentHistoryPage >= historyPages - 1}
                    onClick={() => setHistoryPage(currentHistoryPage + 1)}
                    className="h-9 rounded-full border border-gray-200 bg-white px-4 text-[12px] font-medium text-gray-600 disabled:opacity-40"
                  >
                    다음 ›
                  </button>
                </div>
              )}
            </div>
          )}
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

        {/* 정산 계좌 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-[13px] font-semibold text-gray-800 mb-3">정산 계좌</p>
          <label className="block">
            <span className="text-[12px] text-gray-500 mb-1.5 block">은행명</span>
            <input
              type="text"
              value={bankName}
              onChange={(e) => handleBankNameChange(e.target.value)}
              placeholder="예: 국민은행, 신한은행"
              className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-4 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
            />
          </label>
          <p className="text-[11px] text-gray-400 mt-2">정산받을 계좌의 은행명을 입력해주세요</p>
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
          {settleButtonLabel}
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
