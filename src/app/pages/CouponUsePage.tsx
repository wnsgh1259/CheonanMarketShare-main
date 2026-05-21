import { useState } from "react";
import { ChevronLeft, QrCode, Hash, CheckCircle2, X } from "lucide-react";
import { useNavigate } from "react-router";
import { BottomNav } from "../components/BottomNav";

type Mode = "idle" | "qr" | "number";

export function CouponUsePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("idle");
  const [numberInput, setNumberInput] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedCode, setConfirmedCode] = useState("");

  const handleConfirmNumber = () => {
    const trimmed = numberInput.trim();
    if (!trimmed) return;
    setConfirmedCode(trimmed);
    setConfirmed(true);
  };

  const reset = () => {
    setMode("idle");
    setNumberInput("");
    setConfirmed(false);
    setConfirmedCode("");
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-24">
      {/* 헤더 */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-[15px] text-gray-900 font-semibold">쿠폰사용</h1>
          <div className="w-7" />
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* 쿠폰 등록하기 카드 */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <div className="px-4 pt-4 pb-2">
            <p className="text-[13px] font-semibold text-gray-800">쿠폰 등록하기</p>
            <p className="text-[11px] text-gray-400 mt-0.5">QR 코드 또는 쿠폰 번호로 등록하세요</p>
          </div>

          <div className="grid grid-cols-2 gap-3 px-4 pb-4 mt-2">
            <button
              onClick={() => { reset(); setMode("qr"); }}
              className={`flex flex-col items-center gap-2 py-5 rounded-xl border-2 transition-all ${
                mode === "qr"
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-100 bg-gray-50 text-gray-700 active:bg-gray-100"
              }`}
            >
              <QrCode className="w-7 h-7" />
              <span className="text-[13px] font-semibold">QR 등록</span>
            </button>
            <button
              onClick={() => { reset(); setMode("number"); }}
              className={`flex flex-col items-center gap-2 py-5 rounded-xl border-2 transition-all ${
                mode === "number"
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-100 bg-gray-50 text-gray-700 active:bg-gray-100"
              }`}
            >
              <Hash className="w-7 h-7" />
              <span className="text-[13px] font-semibold">번호 등록</span>
            </button>
          </div>
        </div>

        {/* QR 등록 UI */}
        {mode === "qr" && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[14px] font-semibold text-gray-800">QR 코드 스캔</p>
              <button onClick={reset} className="text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* 카메라 스캔 영역 */}
            <div className="relative w-full aspect-square max-w-[240px] mx-auto mb-4">
              <div className="w-full h-full bg-gray-900 rounded-2xl flex items-center justify-center overflow-hidden">
                <div className="relative w-44 h-44">
                  {/* 스캔 프레임 */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-md" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-md" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-md" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-md" />
                  {/* 스캔 라인 */}
                  <div className="absolute left-2 right-2 h-0.5 bg-red-400 top-1/2 -translate-y-1/2 opacity-80" />
                  <div className="flex items-center justify-center h-full">
                    <QrCode className="w-12 h-12 text-white/20" />
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[12px] text-gray-400 text-center">쿠폰의 QR 코드를 화면 안에 맞춰주세요</p>
          </div>
        )}

        {/* 번호 등록 UI */}
        {mode === "number" && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[14px] font-semibold text-gray-800">쿠폰 번호 입력</p>
              <button onClick={reset} className="text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {confirmed ? (
              <div className="flex flex-col items-center py-6 gap-3">
                <CheckCircle2 className="w-14 h-14 text-emerald-500" />
                <p className="text-[16px] font-bold text-gray-800">등록 완료!</p>
                <div className="bg-gray-50 border border-gray-100 rounded-xl px-6 py-3">
                  <p className="text-[22px] font-bold text-gray-800 tracking-widest text-center font-mono">
                    {confirmedCode}
                  </p>
                </div>
                <p className="text-[12px] text-gray-400">쿠폰이 성공적으로 등록됐어요 🎉</p>
                <button
                  onClick={reset}
                  className="mt-2 w-full py-3 bg-gray-100 text-gray-700 rounded-xl text-[13px] font-semibold active:bg-gray-200 transition-colors"
                >
                  다시 등록하기
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={numberInput}
                  onChange={(e) => setNumberInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleConfirmNumber()}
                  maxLength={20}
                  autoFocus
                  placeholder="쿠폰 번호를 입력하세요"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[15px] text-gray-800 text-center tracking-widest font-mono placeholder:text-gray-300 focus:outline-none focus:border-gray-400"
                />
                <button
                  onClick={handleConfirmNumber}
                  disabled={!numberInput.trim()}
                  className={`mt-3 w-full py-3 rounded-xl text-[14px] font-semibold transition-colors ${
                    numberInput.trim()
                      ? "bg-gray-900 text-white active:bg-gray-700"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  확인
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
