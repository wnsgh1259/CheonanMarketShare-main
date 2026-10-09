import { useState } from "react";
import { useNavigate } from "react-router";
import { X, Store, ShoppingCart, Clock, ArrowLeft, KeyRound, ChevronDown, Check, LockKeyhole, MessageCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { findRegisteredUserByPhone } from "../data/userAccounts";
import {
  findRejectedSignupByPhone,
  saveOwnerSignupEditDraft,
} from "../data/ownerSignupApplications";
import { refreshOwnerSignupApplicationsFromRemote } from "../data/ownerSignupApplicationsSync";
import { refreshStoreAccountsFromRemote } from "../data/storeAccountsSync";
import { refreshRegisteredUsersFromRemote } from "../data/registeredUsersSync";
import { formatPhoneInput } from "../utils/phoneFormat";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, loginAdminShortcut, enterGuest } = useAuth();
  const [showRoleSheet, setShowRoleSheet] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showNaverPreview, setShowNaverPreview] = useState(false);
  const [showKakaoPreview, setShowKakaoPreview] = useState(false);
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showPinFind, setShowPinFind] = useState(false);
  const [findPhone, setFindPhone] = useState("");
  const [findError, setFindError] = useState("");
  const [pinSent, setPinSent] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectPhoneDigits, setRejectPhoneDigits] = useState("");

  const goHome = () => {
    const result = enterGuest();
    if (result.ok) navigate(result.redirect);
  };

  const handleLogin = async () => {
    const phoneDigits = phone.replace(/\D/g, "");
    const pinValue = pin.trim();

    if (!phoneDigits) {
      setLoginError("휴대폰 번호를 입력해주세요.");
      return;
    }
    if (!/^[0-9]{4,6}$/.test(pinValue)) {
      setLoginError("PIN 번호는 4~6자리 숫자로 입력해주세요.");
      return;
    }

    await Promise.all([
      refreshOwnerSignupApplicationsFromRemote(),
      refreshStoreAccountsFromRemote(),
      refreshRegisteredUsersFromRemote(),
    ]);
    const result = login(phoneDigits, pinValue);
    if (!result.ok) {
      if (result.status === "pending") {
        setShowPendingModal(true);
        setLoginError("");
        return;
      }
      if (result.status === "rejected" || result.rejectReason) {
        setRejectReason(result.rejectReason || "관리자에 의해 거절되었습니다.");
        setRejectPhoneDigits(phoneDigits);
        setShowRejectModal(true);
        setLoginError("");
        return;
      }
      setLoginError(result.error);
      return;
    }
    navigate(result.redirect);
  };

  const handleEditRejectedSignup = () => {
    const app = findRejectedSignupByPhone(rejectPhoneDigits);
    if (app) {
      saveOwnerSignupEditDraft(app);
    } else {
      // 신청 데이터가 없으면 로그인 폼 정보만이라도 넘김
      saveOwnerSignupEditDraft({
        id: Date.now(),
        storeName: "",
        email: "",
        phone: rejectPhoneDigits,
        pin: pin.trim(),
        address: "",
        storeImage: "",
        marketId: "jungang",
        status: "rejected",
        createdAt: new Date().toISOString(),
        rejectReason,
      });
    }
    setShowRejectModal(false);
    navigate("/register?role=owner&edit=1");
  };

  const handleSendPinEmail = () => {
    const phoneDigits = findPhone.replace(/\D/g, "");
    if (!phoneDigits) {
      setFindError("휴대폰 번호를 입력해주세요.");
      return;
    }
    if (!/^[0-9]{10,11}$/.test(phoneDigits)) {
      setFindError("올바른 휴대폰 번호 형식으로 입력해주세요.");
      return;
    }

    const user = findRegisteredUserByPhone(phoneDigits);
    if (!user?.email) {
      setFindError("등록된 이메일이 없습니다. 회원가입을 먼저 진행해주세요.");
      return;
    }

    setFindError("");
    setPinSent(true);
  };

  const closePinFind = () => {
    setShowPinFind(false);
    setFindPhone("");
    setFindError("");
    setPinSent(false);
  };

  if (showKakaoPreview) {
    return (
      <div className="relative flex min-h-[100dvh] flex-col bg-white px-[4%] text-[#171717]">
        <div className="flex h-[62px] items-center gap-2 pt-2">
          <button
            type="button"
            aria-label="로그인 화면으로 돌아가기"
            onClick={() => setShowKakaoPreview(false)}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-[#F0F0F0] text-[#252525]"
          >
            <ArrowLeft className="h-7 w-7" strokeWidth={2.4} />
          </button>
          <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[18px] bg-[#F3F3F3] px-3 text-[#777]">
            <LockKeyhole className="h-4 w-4 flex-shrink-0 fill-[#888] text-[#888]" />
            <span className="truncate text-[clamp(14px,3.8vw,20px)]">kauth.kakao.com</span>
            <span className="ml-auto flex-shrink-0 text-[14px] font-semibold text-[#222]">가가</span>
          </div>
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#FEE500] text-[#191919]">
            <MessageCircle className="h-6 w-6 fill-[#191919] stroke-[#191919]" />
          </div>
          <button type="button" aria-label="더 보기" className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-[#F0F0F0] text-[#252525]">
            <ChevronDown className="h-7 w-7" strokeWidth={2.4} />
          </button>
        </div>

        <main className="flex flex-1 flex-col items-center pt-[14.5vh] text-center">
          <div className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-[#FEE500] text-[#191919]">
            <Check className="h-6 w-6" strokeWidth={3.5} />
          </div>
          <h1 className="mt-[5.5vh] text-[clamp(19px,4.8vw,28px)] font-bold tracking-tight">카카오 로그인 완료</h1>
          <p className="mt-[2.8vh] text-[clamp(12px,3.2vw,18px)] leading-relaxed text-[#888]">
            이용 중이던 서비스로 이동하여 로그인을 완료해 주세요.
          </p>
        </main>

        <button
          type="button"
          onClick={goHome}
          className="mb-[2.5vh] h-[6.5vh] min-h-12 w-full rounded-[12px] bg-[#F1F1F1] text-[clamp(18px,4.5vw,26px)] font-semibold text-[#222] active:bg-[#E7E7E7]"
        >
          확인
        </button>
      </div>
    );
  }

  if (showNaverPreview) {
    return (
      <div className="relative flex min-h-[100dvh] flex-col bg-white px-[5%] text-[#222]">
        <button
          type="button"
          aria-label="로그인 화면으로 돌아가기"
          onClick={() => setShowNaverPreview(false)}
          className="absolute left-[5%] top-[4.2dvh] flex h-10 w-10 items-center justify-center text-[#333]"
        >
          <ArrowLeft className="h-8 w-8" strokeWidth={2.4} />
        </button>

        <div className="pt-[10.5dvh] text-center">
          <p className="text-[clamp(34px,8vw,50px)] font-extrabold leading-none tracking-[-0.06em] text-[#03C75A]">NAVER</p>
        </div>

        <div className="mx-auto mt-[8.5dvh] w-[90%] max-w-[360px]">
          <div className="overflow-hidden rounded-[12px] border-2 border-[#E0E0E0]">
            <input
              type="text"
              aria-label="아이디 또는 전화번호"
              placeholder="아이디 또는 전화번호"
              className="h-[8.6dvh] w-full border-b-2 border-[#E0E0E0] bg-white px-7 text-[clamp(18px,4.5vw,28px)] text-[#333] outline-none placeholder:text-[#A2A2A2]"
            />
            <input
              type="password"
              aria-label="비밀번호"
              placeholder="비밀번호"
              className="h-[8.6dvh] w-full bg-white px-7 text-[clamp(18px,4.5vw,28px)] text-[#333] outline-none placeholder:text-[#A2A2A2]"
            />
          </div>

          <button type="button" disabled className="mt-[2.1vh] h-[6.5vh] w-full rounded-[11px] bg-[#D0D0D0] text-[clamp(18px,4.5vw,27px)] font-semibold text-white">
            로그인
          </button>
          <button type="button" className="mt-[1.2vh] flex h-[6.5vh] w-full items-center justify-center gap-3 rounded-[11px] bg-[#ECECEC] text-[clamp(17px,4.2vw,26px)] font-semibold text-[#292929] active:bg-[#E1E1E1]">
            <KeyRound className="h-7 w-7" strokeWidth={2.8} />
            패스키 로그인
          </button>
          <div className="mt-[3.1vh] flex items-center justify-center gap-3 text-[clamp(15px,3.8vw,23px)] text-[#A0A0A0]">
            <button type="button">비밀번호 찾기</button>
            <span className="text-[#D8D8D8]">|</span>
            <button type="button">아이디 찾기</button>
            <span className="text-[#D8D8D8]">|</span>
            <button type="button" className="font-semibold text-[#03A94D]">회원가입</button>
          </div>
        </div>

        <div className="mt-auto pb-[4.5vh] text-center text-[clamp(14px,3.5vw,21px)] text-[#A4A4A4]">
          <div className="mb-[2.2vh] flex items-center justify-center gap-3">
            <button type="button">계정관리</button>
            <span className="text-[#D8D8D8]">|</span>
            <button type="button">고객센터</button>
          </div>
          <p className="text-[clamp(22px,5.2vw,32px)] font-extrabold tracking-[-0.05em] text-[#B7B7B7]">NAVER</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F7F3]">

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-14 pb-4">
        <h1 className="text-[44px] font-extrabold tracking-tight mb-1" style={{ color: "#5B4335" }}>천안시장</h1>
        <p className="text-[14px] text-[#9A897F] mb-8">Cheonan Market</p>

        {/* 시장 일러스트 SVG */}
        <svg width="260" height="140" viewBox="0 0 260 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-8">
          <style>{`
            @keyframes market-window-reveal-one {
              0% { fill-opacity: 0; }
              10.5%, 89.5% { fill-opacity: 0.45; }
              100% { fill-opacity: 0; }
            }
            @keyframes market-window-reveal-three {
              0%, 26.3% { fill-opacity: 0; }
              36.8%, 89.5% { fill-opacity: 0.45; }
              100% { fill-opacity: 0; }
            }
            @keyframes market-window-reveal-two {
              0%, 52.6% { fill-opacity: 0; }
              63.2%, 89.5% { fill-opacity: 0.45; }
              100% { fill-opacity: 0; }
            }
            .market-window-light--one { animation: market-window-reveal-one 11.4s ease-in-out infinite; }
            .market-window-light--three { animation: market-window-reveal-three 11.4s ease-in-out infinite; }
            .market-window-light--two { animation: market-window-reveal-two 11.4s ease-in-out infinite; }
            @media (prefers-reduced-motion: reduce) {
              .market-window-light { animation: none; fill-opacity: 0.45; }
            }
          `}</style>
          {/* 왼쪽 상가 */}
          <rect x="10" y="50" width="55" height="75" rx="3" stroke="#A67B50" strokeWidth="2.5" fill="none"/>
          <rect className="market-window-light market-window-light--one" x="22" y="62" width="14" height="18" rx="2" stroke="#A67B50" strokeWidth="2" fill="#9EBEB4" fillOpacity="0.45"/>
          <rect className="market-window-light market-window-light--one" x="42" y="62" width="14" height="18" rx="2" stroke="#A67B50" strokeWidth="2" fill="#9EBEB4" fillOpacity="0.45"/>
          <rect className="market-window-light market-window-light--one" x="22" y="88" width="31" height="25" rx="2" stroke="#A67B50" strokeWidth="2" fill="#9EBEB4" fillOpacity="0.45"/>
          <line x1="37" y1="88" x2="37" y2="113" stroke="#A67B50" strokeWidth="2"/>
          <rect x="6" y="44" width="63" height="10" rx="2" stroke="#A67B50" strokeWidth="2.5" fill="none"/>
          {/* 중앙 메인 상가 */}
          <rect x="85" y="35" width="90" height="90" rx="3" stroke="#A67B50" strokeWidth="2.5" fill="none"/>
          <rect className="market-window-light market-window-light--two" x="103" y="55" width="22" height="24" rx="2" stroke="#A67B50" strokeWidth="2" fill="#9EBEB4" fillOpacity="0.45"/>
          <rect className="market-window-light market-window-light--two" x="135" y="55" width="22" height="24" rx="2" stroke="#A67B50" strokeWidth="2" fill="#9EBEB4" fillOpacity="0.45"/>
          <rect className="market-window-light market-window-light--two" x="103" y="87" width="54" height="38" rx="2" stroke="#A67B50" strokeWidth="2" fill="#9EBEB4" fillOpacity="0.45"/>
          <line x1="130" y1="87" x2="130" y2="125" stroke="#A67B50" strokeWidth="2"/>
          <rect x="80" y="26" width="100" height="13" rx="2" stroke="#A67B50" strokeWidth="2.5" fill="none"/>
          <rect x="108" y="8" width="44" height="18" rx="9" fill="#A67B50"/>
          <text x="130" y="21" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">SALE</text>
          <line x1="130" y1="26" x2="130" y2="28" stroke="#A67B50" strokeWidth="2"/>
          <circle cx="130" cy="6" r="3" fill="#A67B50"/>
          {/* 오른쪽 상가 */}
          <rect x="195" y="50" width="55" height="75" rx="3" stroke="#A67B50" strokeWidth="2.5" fill="none"/>
          <rect className="market-window-light market-window-light--three" x="204" y="62" width="14" height="18" rx="2" stroke="#A67B50" strokeWidth="2" fill="#9EBEB4" fillOpacity="0.45"/>
          <rect className="market-window-light market-window-light--three" x="224" y="62" width="14" height="18" rx="2" stroke="#A67B50" strokeWidth="2" fill="#9EBEB4" fillOpacity="0.45"/>
          <rect className="market-window-light market-window-light--three" x="204" y="88" width="31" height="25" rx="2" stroke="#A67B50" strokeWidth="2" fill="#9EBEB4" fillOpacity="0.45"/>
          <line x1="219" y1="88" x2="219" y2="113" stroke="#A67B50" strokeWidth="2"/>
          <rect x="191" y="44" width="63" height="10" rx="2" stroke="#A67B50" strokeWidth="2.5" fill="none"/>
          {/* 바닥선 */}
          <line x1="5" y1="127" x2="255" y2="127" stroke="#A67B50" strokeWidth="2" strokeDasharray="6 4"/>
        </svg>

        {/* 피처 카드 */}
        <div className="w-full space-y-2.5">
          {[ 
            { emoji: "🏪", text: "천안 3개 전통시장 맞춤형 앱", sub: "중앙시장 · 역전시장 · 성환이화시장" },
            { emoji: "⏰", text: "다양한 이벤트와 혜택, 할인 알림 서비스", sub: "" },
            { emoji: "🎉", text: "상인·이웃과 함께하는 커뮤니티", sub: "" },
          ].map(({ emoji, text, sub }) => (
            <div key={text} className="flex items-center gap-3 rounded-2xl border border-[#EDE5D8] bg-white px-4 py-3.5 shadow-sm">
              <span className="text-[20px]">{emoji}</span>
              <div>
                <p className="text-[14px] text-[#46352C] font-medium">{text}</p>
                {sub && <p className="text-[11px] text-[#9A897F] mt-0.5">{sub}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 하단 버튼 영역 */}
      <div className="px-6 pb-10 space-y-3">
        {!showLoginForm ? (
          <button
            onClick={() => { setShowLoginForm(true); setLoginError(""); }}
            className="w-full h-[52px] rounded-2xl text-white text-[15px] font-semibold active:opacity-80 transition-opacity"
            style={{ backgroundColor: "#5B4335" }}
          >
            휴대폰 번호로 시작하기
          </button>
        ) : (
          <div className="space-y-2.5">
            <div>
              <label className="block text-[12px] text-[#8A776B] mb-1.5">휴대폰 번호</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(formatPhoneInput(e.target.value)); setLoginError(""); }}
                maxLength={13}
                placeholder="010-0000-0000"
                className="w-full h-11 rounded-xl border border-[#E5D9CB] bg-[#F8F5F0] px-4 text-[14px] text-[#46352C] focus:outline-none focus:ring-1 focus:ring-[#B89A7D]"
              />
            </div>
            <div>
              <label className="block text-[12px] text-[#8A776B] mb-1.5">PIN 번호</label>
              <input
                type="text"
                inputMode="numeric"
                value={pin}
                onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setLoginError(""); }}
                maxLength={6}
                placeholder="4~6자리"
                className="w-full h-11 rounded-xl border border-[#E5D9CB] bg-[#F8F5F0] px-4 text-[14px] text-[#46352C] tracking-widest focus:outline-none focus:ring-1 focus:ring-[#B89A7D]"
              />
            </div>
            {loginError && (
              <p className="text-[12px] text-red-400">{loginError}</p>
            )}
            <button
              onClick={handleLogin}
              className="w-full h-[52px] rounded-2xl text-white text-[15px] font-semibold active:opacity-80 transition-opacity"
              style={{ backgroundColor: "#5B4335" }}
            >
              로그인
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowLoginForm(false); setPhone(""); setPin(""); setLoginError(""); }}
                className="flex-1 h-9 text-[13px] text-gray-400"
              >
                뒤로
              </button>
              <button
                onClick={() => { setShowPinFind(true); setFindPhone(""); setFindError(""); setPinSent(false); }}
                className="flex-1 h-9 text-[13px] text-[#8A6A52] font-medium"
              >
                핀번호 찾기
              </button>
            </div>
          </div>
        )}

        {/* 소셜 로그인 */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-[12px] text-gray-400">소셜 로그인</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        <div className="flex justify-center items-center gap-4">
          {/* 네이버 */}
          <button onClick={() => setShowNaverPreview(true)} aria-label="네이버 로그인 미리보기" className="w-12 h-12 rounded-full flex items-center justify-center active:opacity-70 shadow-sm" style={{ backgroundColor: "#03C75A" }}>
            <span className="text-white font-extrabold text-[18px] leading-none">N</span>
          </button>
          {/* 카카오 */}
          <button onClick={() => setShowKakaoPreview(true)} aria-label="카카오 로그인 미리보기" className="w-12 h-12 rounded-full flex items-center justify-center active:opacity-70 shadow-sm" style={{ backgroundColor: "#FEE500" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 3C7.03 3 3 6.36 3 10.5c0 2.65 1.7 4.97 4.28 6.3l-.94 3.5c-.08.3.26.54.52.37L11 18.1c.32.04.65.06.98.06 4.97 0 9-3.36 9-7.5S16.97 3 12 3z" fill="#3A1D1D"/></svg>
          </button>
          {/* 구글 */}
          <button onClick={goHome} className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center active:opacity-70 shadow-sm">
            <svg width="22" height="22" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
          </button>
        </div>

        <div className="flex justify-center items-center gap-2 pt-1">
          <button
            onClick={goHome}
            className="h-10 px-3 rounded-full border-2 text-[13px] font-semibold active:opacity-70 transition-opacity"
            style={{ borderColor: "#E5D9CB", color: "#6B5142", backgroundColor: "#FFFFFF" }}
          >
            비회원
          </button>
          <button
            onClick={() => {
              const result = loginAdminShortcut();
              if (result.ok) navigate(result.redirect);
            }}
            className="h-10 px-3 rounded-full border-2 text-[13px] font-semibold active:opacity-70 transition-opacity"
            style={{ borderColor: "#E5D9CB", color: "#6B5142", backgroundColor: "#FFFFFF" }}
          >
            관리자
          </button>
          <button
            onClick={() => setShowRoleSheet(true)}
            className="h-10 px-3 rounded-full border-2 text-[13px] font-semibold active:opacity-70 transition-opacity"
            style={{ borderColor: "#E5D9CB", color: "#6B5142", backgroundColor: "#FFFFFF" }}
          >
            회원가입
          </button>
        </div>
      </div>

      {/* PIN 찾기 바텀시트 */}
      {showPinFind && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[100]" onClick={closePinFind} />
          <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-3xl z-[110] shadow-2xl">
            <div className="px-5 pt-5 pb-10">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
              <div className="flex items-center justify-between mb-4">
                <p className="text-[17px] font-bold text-gray-900">PIN 번호 찾기</p>
                <button onClick={closePinFind} className="p-1 text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {pinSent ? (
                <div className="text-center py-6">
                  <p className="text-[16px] font-semibold text-gray-900 mb-2">전송되었습니다.</p>
                  <p className="text-[13px] text-gray-500">등록된 이메일로 PIN 번호를 확인해주세요.</p>
                  <button
                    onClick={closePinFind}
                    className="mt-6 w-full h-11 rounded-xl text-white text-[14px] font-semibold"
                    style={{ backgroundColor: "#5B4335" }}
                  >
                    확인
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[12px] text-gray-500 mb-1.5">휴대폰 번호</label>
                    <input
                      type="tel"
                      value={findPhone}
                      onChange={(e) => { setFindPhone(formatPhoneInput(e.target.value)); setFindError(""); }}
                      maxLength={13}
                      placeholder="010-0000-0000"
                      className="w-full h-11 rounded-xl border border-[#E5D9CB] bg-[#F8F5F0] px-4 text-[14px] text-[#46352C] focus:outline-none focus:ring-1 focus:ring-[#B89A7D]"
                    />
                  </div>
                  <p className="text-[13px] text-gray-500 leading-relaxed">
                    회원가입 시 입력한 이메일에 핀번호가 전송됩니다.
                  </p>
                  {findError && (
                    <p className="text-[12px] text-red-400">{findError}</p>
                  )}
                  <button
                    onClick={handleSendPinEmail}
                    className="w-full h-11 rounded-xl text-white text-[14px] font-semibold"
                    style={{ backgroundColor: "#5B4335" }}
                  >
                    이메일에 보내기
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* 역할 선택 바텀시트 */}
      {showRoleSheet && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[100]" onClick={() => setShowRoleSheet(false)} />
          <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-3xl z-[110] shadow-2xl">
            <div className="px-5 pt-5 pb-10">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
              <div className="flex items-center justify-between mb-2">
                <p className="text-[17px] font-bold text-gray-900">어떤 회원으로 가입할까요?</p>
                <button onClick={() => setShowRoleSheet(false)} className="p-1 text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[13px] text-gray-400 mb-6">가입 유형에 맞는 서비스를 이용할 수 있어요</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setShowRoleSheet(false); navigate("/register?role=customer"); }}
                  className="flex flex-col items-center gap-3 py-6 px-4 rounded-2xl border-2 border-[#E8DCC5] bg-[#F9F5E9] active:bg-[#F3E7D1] transition-all"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white/80 flex items-center justify-center">
                    <ShoppingCart className="w-7 h-7 text-[#A67B50]" />
                  </div>
                  <div className="text-center">
                    <p className="text-[15px] font-bold text-[#46352C]">손님</p>
                    <p className="text-[11px] text-[#8A776B] mt-0.5 leading-snug">시장 탐방·쿠폰·<br />커뮤니티 이용</p>
                  </div>
                </button>
                <button
                  onClick={() => { setShowRoleSheet(false); navigate("/register?role=owner"); }}
                  className="flex flex-col items-center gap-3 py-6 px-4 rounded-2xl border-2 border-[#E5D9CB] bg-[#F5F0E7] active:bg-[#EFE4D8] transition-all"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white/80 flex items-center justify-center">
                    <Store className="w-7 h-7 text-[#8A6A52]" />
                  </div>
                  <div className="text-center">
                    <p className="text-[15px] font-bold text-[#46352C]">사장님</p>
                    <p className="text-[11px] text-[#8A776B] mt-0.5 leading-snug">상점 관리·홍보·<br />고객 소통</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 신청중 팝업 */}
      {showPendingModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[200]" onClick={() => setShowPendingModal(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[210] w-[300px] max-w-[calc(100vw-48px)] bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 pt-6 pb-5 text-center">
              <div className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-[#F3E7D1] flex items-center justify-center">
                <Clock className="w-6 h-6 text-[#A67B50]" />
              </div>
              <p className="text-[16px] font-bold text-gray-800 mb-2">신청중</p>
              <p className="text-[13px] text-gray-600 leading-relaxed">
                가입 신청이 접수되어 승인 대기 중입니다.
                <br />
                영업일 기준 1일 이내로 처리됩니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPendingModal(false)}
              className="w-full py-3.5 bg-[#5B4335] text-white text-[14px] font-semibold active:bg-[#46352C] transition-colors"
            >
              확인
            </button>
          </div>
        </>
      )}

      {/* 가입 거절 팝업 */}
      {showRejectModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[200]" onClick={() => setShowRejectModal(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[210] w-[300px] max-w-[calc(100vw-48px)] bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 pt-6 pb-5 text-center">
              <p className="text-[28px] mb-2">❌</p>
              <p className="text-[16px] font-bold text-gray-800 mb-2">가입 신청이 반려되었습니다</p>
              <p className="text-[12px] text-gray-400 mb-3">반려 사유</p>
              <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-xl px-4 py-3 text-left">
                {rejectReason}
              </p>
            </div>
            <div className="grid grid-cols-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="py-3.5 bg-white text-gray-600 text-[14px] font-semibold border-r border-gray-100 active:bg-gray-50"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={handleEditRejectedSignup}
              className="py-3.5 bg-[#5B4335] text-white text-[14px] font-semibold active:bg-[#46352C]"
              >
                수정하기
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
