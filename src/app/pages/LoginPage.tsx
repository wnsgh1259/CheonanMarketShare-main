import { useNavigate } from "react-router";
import { MapPin } from "lucide-react";

export function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Top decorative band */}
      <div className="h-1.5 bg-[#FF6B2B]" />

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* Logo mark */}
        <div className="w-[88px] h-[88px] rounded-[24px] bg-[#FF6B2B] flex items-center justify-center mb-6 shadow-lg shadow-orange-200">
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <path d="M8 16h28M8 16v18a2 2 0 002 2h24a2 2 0 002-2V16M8 16l3-8h22l3 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 34V24h12v10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h1 className="text-[28px] font-bold text-gray-900 mb-2 tracking-tight">천안 시장</h1>
        <p className="text-[15px] text-gray-400 mb-4 text-center">전통시장 스마트 장보기</p>

        <div className="flex items-center gap-1.5 bg-orange-50 text-[#FF6B2B] text-[13px] px-4 py-2 rounded-full">
          <MapPin className="w-3.5 h-3.5" />
          천안중앙 · 역전 · 성환 시장
        </div>
      </div>

      {/* Buttons */}
      <div className="px-6 pb-10 space-y-3">
        <button
          onClick={() => navigate("/home")}
          className="w-full h-[54px] bg-[#FF6B2B] text-white rounded-2xl text-[16px] font-semibold active:bg-[#e5601f] transition-colors shadow-md shadow-orange-200"
        >
          시작하기
        </button>

        <div className="flex gap-3">
          <button
            onClick={() => navigate("/owner/store-registration")}
            className="flex-1 h-11 rounded-xl bg-gray-900 text-white text-[13px] font-medium active:bg-gray-800 transition-colors"
          >
            사장님 홈페이지
          </button>
          <button
            onClick={() => navigate("/admin")}
            className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-700 text-[13px] font-medium active:bg-gray-200 transition-colors"
          >
            관리자 페이지
          </button>
        </div>

        <button
          onClick={() => navigate("/home")}
          className="block w-full text-center text-[13px] text-gray-400 pt-1"
        >
          비회원으로 둘러보기
        </button>
      </div>
    </div>
  );
}
