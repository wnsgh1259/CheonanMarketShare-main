import { useNavigate } from "react-router";

export function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Top spacer */}
      <div className="flex-1" />

      {/* Logo + illustration area */}
      <div className="flex flex-col items-center px-8">
        {/* Brand logo text */}
        <div className="mb-2 text-center">
          <span className="text-[42px] leading-none font-black text-[#FF6B2B] tracking-tight">
            천안시장
          </span>
          <p className="text-[13px] text-gray-400 mt-1 tracking-widest">Cheonan Market</p>
        </div>

        {/* Illustration placeholder — orange-tinted card */}
        <div className="w-full max-w-[280px] h-[200px] my-8 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center overflow-hidden">
          <svg viewBox="0 0 280 200" className="w-full h-full" fill="none">
            {/* simple market illustration */}
            <rect x="30" y="110" width="60" height="60" rx="4" fill="#FFE0CC" stroke="#FF6B2B" strokeWidth="2"/>
            <rect x="35" y="90" width="50" height="24" rx="3" fill="#FF6B2B"/>
            <text x="60" y="107" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">시장</text>
            <rect x="110" y="100" width="60" height="70" rx="4" fill="#FFE0CC" stroke="#FF6B2B" strokeWidth="2"/>
            <rect x="115" y="80" width="50" height="24" rx="3" fill="#FF8C5A"/>
            <text x="140" y="97" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">가게</text>
            <rect x="190" y="115" width="60" height="55" rx="4" fill="#FFE0CC" stroke="#FF6B2B" strokeWidth="2"/>
            <rect x="195" y="95" width="50" height="24" rx="3" fill="#FF6B2B"/>
            <text x="220" y="112" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">명물</text>
            {/* ground */}
            <rect x="10" y="168" width="260" height="4" rx="2" fill="#FFD4B8"/>
            {/* decorative circles */}
            <circle cx="250" cy="50" r="12" fill="#FFE0CC" stroke="#FF6B2B" strokeWidth="1.5"/>
            <circle cx="30" cy="60" r="8" fill="#FFE0CC" stroke="#FF6B2B" strokeWidth="1.5"/>
            <circle cx="140" cy="35" r="6" fill="#FF6B2B" opacity="0.4"/>
          </svg>
        </div>
      </div>

      {/* Buttons */}
      <div className="px-6 pb-10 space-y-3">
        {/* Primary CTA */}
        <button
          onClick={() => navigate("/home")}
          className="w-full h-[52px] bg-[#FF6B2B] text-white rounded-xl text-[16px] font-semibold active:bg-[#e5601f] transition-colors"
        >
          휴대폰 번호로 시작하기
        </button>

        {/* Social login row */}
        <div className="flex items-center justify-center gap-3 py-1">
          {/* 카카오 */}
          <button
            onClick={() => navigate("/home")}
            className="w-11 h-11 rounded-full bg-[#FEE500] flex items-center justify-center shadow-sm active:scale-95 transition-transform"
            aria-label="카카오 로그인"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 3C7.029 3 3 6.358 3 10.5c0 2.625 1.618 4.935 4.068 6.3L6.3 20.1a.375.375 0 00.533.416L11.1 18c.296.023.596.034.9.034 4.971 0 9-3.358 9-7.5S16.971 3 12 3z" fill="#3C1E1E"/>
            </svg>
          </button>

          {/* 페이스북 */}
          <button
            onClick={() => navigate("/home")}
            className="w-11 h-11 rounded-full bg-[#1877F2] flex items-center justify-center shadow-sm active:scale-95 transition-transform"
            aria-label="페이스북 로그인"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
            </svg>
          </button>

          {/* 구글 */}
          <button
            onClick={() => navigate("/home")}
            className="w-11 h-11 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm active:scale-95 transition-transform"
            aria-label="구글 로그인"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </button>

          {/* 네이버 */}
          <button
            onClick={() => navigate("/home")}
            className="w-11 h-11 rounded-full bg-[#03C75A] flex items-center justify-center shadow-sm active:scale-95 transition-transform"
            aria-label="네이버 로그인"
          >
            <span className="text-white font-bold text-[15px]">N</span>
          </button>

          {/* 애플 */}
          <button
            onClick={() => navigate("/home")}
            className="w-11 h-11 rounded-full bg-black flex items-center justify-center shadow-sm active:scale-95 transition-transform"
            aria-label="애플 로그인"
          >
            <svg width="18" height="20" viewBox="0 0 24 29" fill="white">
              <path d="M20.16 15.25c-.03-3.3 2.7-4.9 2.82-4.97-1.54-2.25-3.93-2.56-4.77-2.59-2.02-.21-3.97 1.2-5 1.2-1.04 0-2.62-1.18-4.32-1.14-2.2.03-4.24 1.29-5.37 3.25-2.3 3.99-.59 9.89 1.64 13.12 1.1 1.58 2.4 3.35 4.1 3.29 1.65-.07 2.28-1.06 4.27-1.06 1.99 0 2.56 1.06 4.3 1.02 1.78-.03 2.9-1.6 3.98-3.19 1.27-1.82 1.79-3.6 1.81-3.69-.04-.02-3.45-1.32-3.46-5.24zM16.78 5.19c.9-1.1 1.52-2.62 1.35-4.14-1.3.05-2.9.87-3.83 1.95-.83.97-1.57 2.54-1.38 4.03 1.46.11 2.95-.74 3.86-1.84z"/>
            </svg>
          </button>
        </div>

        {/* Guest link */}
        <button
          onClick={() => navigate("/home")}
          className="block w-full text-center text-[13px] text-gray-400 pt-1"
        >
          비회원으로 구경하기
        </button>

        {/* Admin shortcuts */}
        <div className="flex justify-center gap-3 pt-1">
          <button
            onClick={() => navigate("/owner/store-registration")}
            className="text-[11px] text-gray-300"
          >
            사장님 홈페이지
          </button>
          <span className="text-gray-200">|</span>
          <button
            onClick={() => navigate("/admin")}
            className="text-[11px] text-gray-300"
          >
            관리자
          </button>
        </div>
      </div>
    </div>
  );
}
