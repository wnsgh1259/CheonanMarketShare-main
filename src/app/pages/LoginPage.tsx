import { useNavigate } from "react-router";
import { MapPin, ShoppingBag } from "lucide-react";

export function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-white px-6 py-12">
      <div className="h-6" />

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-20 h-20 rounded-2xl bg-gray-900 flex items-center justify-center mb-5">
          <ShoppingBag className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-[22px] text-gray-900 mb-1 tracking-tight">천안 시장</h1>
        <p className="text-[14px] text-gray-400 text-center">
          전통시장 스마트 장보기
        </p>
        <div className="flex items-center gap-1 mt-3 text-[12px] text-gray-400">
          <MapPin className="w-3.5 h-3.5" />
          천안중앙 · 역전 · 성환 시장
        </div>
      </div>

      {/* Login */}
      <div className="space-y-4 pb-8">
        <button
          onClick={() => navigate("/home")}
          className="w-full h-[52px] bg-gray-900 text-white rounded-2xl text-[15px] active:bg-gray-800 transition-colors"
        >
          시작하기
        </button>

        <div className="flex justify-center items-center gap-2 pt-2">
          <button
            onClick={() => navigate("/owner/store-registration")}
            className="h-11 px-4 rounded-full bg-black flex items-center justify-center text-white text-[13px] active:bg-gray-800 transition-colors"
            aria-label="사장님 홈페이지로 이동"
          >
            사장님 홈페이지
          </button>
          <button
            onClick={() => navigate("/admin")}
            className="h-11 px-4 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-800 text-[13px] active:bg-gray-200 transition-colors"
            aria-label="관리자 페이지로 이동"
          >
            관리자 페이지
          </button>
        </div>

        <button
          onClick={() => navigate("/home")}
          className="block w-full text-center text-[13px] text-gray-400"
        >
          비회원
        </button>
      </div>
    </div>
  );
}
