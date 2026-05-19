import { useNavigate } from "react-router";

export function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="flex-1 flex flex-col items-center justify-center px-8 pt-16">
        {/* Logo */}
        <div className="mb-2 text-center">
          <span className="text-[40px] font-black text-[#ff6600] tracking-tight leading-none">천안시장</span>
          <p className="text-[13px] text-[#868b94] mt-1 tracking-widest">Cheonan Market</p>
        </div>

        {/* Market illustration */}
        <div className="w-full max-w-[320px] my-10">
          <svg viewBox="0 0 320 180" fill="none" className="w-full h-auto">
            {/* Buildings */}
            <rect x="10" y="80" width="55" height="80" rx="3" stroke="#ff6600" strokeWidth="2" fill="none"/>
            <rect x="20" y="65" width="35" height="18" rx="2" fill="#ff6600"/>
            <rect x="25" y="67" width="10" height="14" rx="1" fill="white"/>
            <rect x="40" y="67" width="10" height="14" rx="1" fill="white"/>
            <rect x="15" y="110" width="12" height="50" rx="1" stroke="#ff6600" strokeWidth="1.5" fill="none"/>
            <rect x="33" y="110" width="12" height="50" rx="1" stroke="#ff6600" strokeWidth="1.5" fill="none"/>
            <rect x="51" y="110" width="12" height="50" rx="1" stroke="#ff6600" strokeWidth="1.5" fill="none"/>

            {/* Center stall */}
            <rect x="115" y="70" width="90" height="90" rx="3" stroke="#ff6600" strokeWidth="2" fill="none"/>
            <path d="M110 70 L160 40 L210 70" stroke="#ff6600" strokeWidth="2" fill="none"/>
            <line x1="160" y1="40" x2="160" y2="20" stroke="#ff6600" strokeWidth="2"/>
            <circle cx="160" cy="16" r="5" fill="#ff6600"/>
            <rect x="130" y="100" width="25" height="30" rx="2" stroke="#ff6600" strokeWidth="1.5" fill="none"/>
            <rect x="165" y="100" width="25" height="30" rx="2" stroke="#ff6600" strokeWidth="1.5" fill="none"/>
            <circle cx="140" cy="85" r="8" stroke="#ff6600" strokeWidth="1.5" fill="none"/>
            <circle cx="180" cy="85" r="8" stroke="#ff6600" strokeWidth="1.5" fill="none"/>

            {/* Right building */}
            <rect x="255" y="90" width="55" height="70" rx="3" stroke="#ff6600" strokeWidth="2" fill="none"/>
            <rect x="260" y="75" width="45" height="18" rx="2" fill="#ff6600"/>
            <rect x="265" y="77" width="13" height="14" rx="1" fill="white"/>
            <rect x="284" y="77" width="13" height="14" rx="1" fill="white"/>
            <rect x="262" y="115" width="14" height="45" rx="1" stroke="#ff6600" strokeWidth="1.5" fill="none"/>
            <rect x="283" y="115" width="14" height="45" rx="1" stroke="#ff6600" strokeWidth="1.5" fill="none"/>

            {/* Ground */}
            <line x1="0" y1="160" x2="320" y2="160" stroke="#ff6600" strokeWidth="2" strokeDasharray="4 4"/>

            {/* Small person left */}
            <circle cx="85" cy="125" r="8" stroke="#ff6600" strokeWidth="1.5" fill="none"/>
            <line x1="85" y1="133" x2="85" y2="155" stroke="#ff6600" strokeWidth="1.5"/>
            <line x1="85" y1="140" x2="75" y2="150" stroke="#ff6600" strokeWidth="1.5"/>
            <line x1="85" y1="140" x2="95" y2="150" stroke="#ff6600" strokeWidth="1.5"/>

            {/* Small person right */}
            <circle cx="235" cy="125" r="8" stroke="#ff6600" strokeWidth="1.5" fill="none"/>
            <line x1="235" y1="133" x2="235" y2="155" stroke="#ff6600" strokeWidth="1.5"/>
            <line x1="235" y1="140" x2="225" y2="150" stroke="#ff6600" strokeWidth="1.5"/>
            <line x1="235" y1="140" x2="245" y2="150" stroke="#ff6600" strokeWidth="1.5"/>

            {/* Stars */}
            <circle cx="60" cy="30" r="3" fill="#ff6600" opacity="0.4"/>
            <circle cx="270" cy="45" r="3" fill="#ff6600" opacity="0.4"/>
            <circle cx="155" cy="10" r="2" fill="#ff6600" opacity="0.6"/>

            {/* Price tags */}
            <rect x="125" y="55" width="28" height="14" rx="7" fill="#ff6600"/>
            <text x="139" y="65" textAnchor="middle" fill="white" fontSize="8" fontWeight="700">1000</text>
            <rect x="165" y="55" width="28" height="14" rx="7" fill="#ff6600"/>
            <text x="179" y="65" textAnchor="middle" fill="white" fontSize="8" fontWeight="700">1000</text>
          </svg>
        </div>
      </div>

      {/* Buttons */}
      <div className="px-6 pb-12 space-y-4">
        <button
          onClick={() => navigate("/home")}
          className="w-full h-[52px] bg-[#ff6600] text-white rounded-[9999px] text-[16px] font-semibold active:bg-[#e14d00] transition-colors"
        >
          휴대폰 번호로 시작하기
        </button>

        {/* Social logins */}
        <div className="flex items-center justify-center gap-4 py-1">
          <button onClick={() => navigate("/home")} className="w-11 h-11 rounded-full bg-[#FEE500] flex items-center justify-center shadow-[0px_2px_10px_rgba(0,0,0,0.10)] active:scale-95 transition-transform" aria-label="카카오">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3C7.029 3 3 6.358 3 10.5c0 2.625 1.618 4.935 4.068 6.3L6.3 20.1a.375.375 0 00.533.416L11.1 18c.296.023.596.034.9.034 4.971 0 9-3.358 9-7.5S16.971 3 12 3z" fill="#3C1E1E"/></svg>
          </button>
          <button onClick={() => navigate("/home")} className="w-11 h-11 rounded-full bg-[#1877F2] flex items-center justify-center shadow-[0px_2px_10px_rgba(0,0,0,0.10)] active:scale-95 transition-transform" aria-label="페이스북">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
          </button>
          <button onClick={() => navigate("/home")} className="w-11 h-11 rounded-full bg-white border border-[#dcdee3] flex items-center justify-center shadow-[0px_2px_10px_rgba(0,0,0,0.10)] active:scale-95 transition-transform" aria-label="구글">
            <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          </button>
          <button onClick={() => navigate("/home")} className="w-11 h-11 rounded-full bg-[#03C75A] flex items-center justify-center shadow-[0px_2px_10px_rgba(0,0,0,0.10)] active:scale-95 transition-transform" aria-label="네이버">
            <span className="text-white font-bold text-[15px]">N</span>
          </button>
          <button onClick={() => navigate("/home")} className="w-11 h-11 rounded-full bg-black flex items-center justify-center shadow-[0px_2px_10px_rgba(0,0,0,0.10)] active:scale-95 transition-transform" aria-label="애플">
            <svg width="18" height="20" viewBox="0 0 24 29" fill="white"><path d="M20.16 15.25c-.03-3.3 2.7-4.9 2.82-4.97-1.54-2.25-3.93-2.56-4.77-2.59-2.02-.21-3.97 1.2-5 1.2-1.04 0-2.62-1.18-4.32-1.14-2.2.03-4.24 1.29-5.37 3.25-2.3 3.99-.59 9.89 1.64 13.12 1.1 1.58 2.4 3.35 4.1 3.29 1.65-.07 2.28-1.06 4.27-1.06 1.99 0 2.56 1.06 4.3 1.02 1.78-.03 2.9-1.6 3.98-3.19 1.27-1.82 1.79-3.6 1.81-3.69-.04-.02-3.45-1.32-3.46-5.24zM16.78 5.19c.9-1.1 1.52-2.62 1.35-4.14-1.3.05-2.9.87-3.83 1.95-.83.97-1.57 2.54-1.38 4.03 1.46.11 2.95-.74 3.86-1.84z"/></svg>
          </button>
        </div>

        <button onClick={() => navigate("/home")} className="block w-full text-center text-[13px] text-[#868b94]">
          비회원으로 구경하기
        </button>

        <div className="flex justify-center gap-4">
          <button onClick={() => navigate("/owner/store-registration")} className="text-[11px] text-[#b0b3ba]">사장님 홈페이지</button>
          <span className="text-[#dcdee3]">|</span>
          <button onClick={() => navigate("/admin")} className="text-[11px] text-[#b0b3ba]">관리자</button>
        </div>
      </div>
    </div>
  );
}
