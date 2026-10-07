// src/app/pages/ProfilePage.tsx
import {
  ChevronLeft, Settings, TrendingUp, Clock,
  Upload, CheckCircle2, Ticket, Tag, Camera, MapPin, Lock, Check, Gift,
  ShoppingBag, X, Sparkles,
} from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { useState, useEffect } from "react";
import { BottomNav } from "../components/BottomNav";
import {
  getTitlesWithStatus, getActiveTitle, setActiveTitle,
  type TitleItem, type TitleId,
} from "../data/userStore";

type TabType = "stamps" | "events" | "coupons";
type CouponViewMode = "qr" | "number";

function generateCouponCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

const PROGRESS_COLORS = ["bg-[#A67B50]", "bg-[#7B8873]", "bg-[#C69A67]", "bg-[#8A9A7D]", "bg-[#B48A62]"];

const GIFT_ITEMS = [
  { id: 1, emoji: "🎫", name: "500원 할인권", desc: "전 시장 공통", cost: 500,  color: "from-[#F9F5E9] to-[#F3E7D1]", border: "border-[#E8DCC5]", badge: "bg-[#F3E7D1] text-[#795B3D]" },
  { id: 2, emoji: "🎟", name: "1,000원 할인권", desc: "전 시장 공통", cost: 900,  color: "from-[#F5F0E7] to-[#EFE4D8]", border: "border-[#E5D9CB]", badge: "bg-[#EFE4D8] text-[#6B5142]" },
  { id: 3, emoji: "🏷", name: "2,000원 할인권", desc: "전 시장 공통", cost: 1700, color: "from-[#F5F8E9] to-[#EAF0DF]", border: "border-[#DFE8D5]", badge: "bg-[#EAF0DF] text-[#65765E]" },
  { id: 4, emoji: "💝", name: "5,000원 할인권", desc: "전 시장 공통", cost: 4000, color: "from-[#F9F5E9] to-[#F3E7D1]", border: "border-[#E8DCC5]", badge: "bg-[#F3E7D1] text-[#795B3D]" },
  { id: 5, emoji: "👑", name: "10,000원 할인권", desc: "전 시장 공통", cost: 7500, color: "from-[#F5F8E9] to-[#EAF0DF]", border: "border-[#DFE8D5]", badge: "bg-[#EAF0DF] text-[#65765E]", rare: true },
];

export function ProfilePage() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>(() => searchParams.get("tab") === "coupons" ? "coupons" : "stamps");
  const [progressAnimationKey, setProgressAnimationKey] = useState(0);
  const [photoUploaded, setPhotoUploaded] = useState(false);

  const [showTitleSheet, setShowTitleSheet] = useState(false);
  const [sheetDetail, setSheetDetail] = useState<(TitleItem & { unlocked: boolean }) | null>(null);

  const [showGiftShop, setShowGiftShop] = useState(false);
  const [mileage, setMileage] = useState(() => {
    try { return Number(localStorage.getItem("user_mileage")) || 3250; } catch { return 3250; }
  });
  const [exchangeResult, setExchangeResult] = useState<{ name: string; emoji: string } | null>(null);

  const [selectedCoupon, setSelectedCoupon] = useState<{ id: number; title: string; market: string; discount: string; expiry: string; color: string } | null>(null);
  const [couponViewMode, setCouponViewMode] = useState<CouponViewMode>("qr");
  const [couponCode, setCouponCode] = useState("");

  const savedName = localStorage.getItem("user_name") || "홍길동";
  const user = { name: savedName, visitedStores: 12, totalDistance: 8500 };

  const uncollectedStamps = [
    { id: 4, name: "한복 체험", icon: "👘", description: "한복 체험관 방문 후 인증", progress: 30, maxProgress: 100, score: 30, unit: "점", reward: "200P" },
    { id: 5, name: "드론 뷰 컬렉터", icon: "🚁", description: "드론 촬영 포인트 방문", progress: 0, maxProgress: 3, score: 0, unit: "곳", reward: "300P" },
    { id: 6, name: "축제 참가자", icon: "🎉", description: "천안 시장 축제 이벤트 참가", progress: 1, maxProgress: 3, score: 1, unit: "회", reward: "150P" },
    { id: 7, name: "숨은 맛집 발견", icon: "🔍", description: "숨은 맛집 5곳 발견하기", progress: 2, maxProgress: 5, score: 2, unit: "곳", reward: "500P" },
  ];

  const collectedStamps = [
    { id: 1, name: "전통시장 탐험가", icon: "🏪", date: "2026.03.15", description: "천안 시장 5곳 이상 방문", reward: "100P" },
    { id: 2, name: "먹거리 골목 마스터", icon: "🍜", date: "2026.03.20", description: "먹거리 골목 탐방 완료", reward: "150P" },
    { id: 3, name: "칼국수 골목", icon: "🍲", date: "2026.03.22", description: "칼국수 골목 전체 방문", reward: "120P" },
    { id: 8, name: "만보기 챌린지", icon: "👟", date: "2026.03.25", description: "10,000보 달성", reward: "100P" },
  ];

  const collectedCount = collectedStamps.length;
  const totalStamps = uncollectedStamps.length + collectedStamps.length;

  const [currentTitle, setCurrentTitleState] = useState(() => getActiveTitle(collectedCount));
  const titles = getTitlesWithStatus(collectedCount);
  const unlockedCount = titles.filter(t => t.unlocked).length;

  useEffect(() => {
    const handler = () => setCurrentTitleState(getActiveTitle(collectedCount));
    window.addEventListener("user_title_changed", handler);
    return () => window.removeEventListener("user_title_changed", handler);
  }, [collectedCount]);

  const handleApplyTitle = (id: TitleId) => {
    setActiveTitle(id);
    setCurrentTitleState(getActiveTitle(collectedCount));
    setSheetDetail(null);
    setShowTitleSheet(false);
  };

  const handleExchange = (item: typeof GIFT_ITEMS[0]) => {
    if (mileage < item.cost) return;
    const newMileage = mileage - item.cost;
    setMileage(newMileage);
    try { localStorage.setItem("user_mileage", String(newMileage)); } catch {}
    setExchangeResult({ name: item.name, emoji: item.emoji });
  };

  const handleUseCoupon = (coupon: typeof coupons[0]) => {
    setCouponCode(generateCouponCode());
    setCouponViewMode("qr");
    setSelectedCoupon(coupon);
  };

  const coupons = [
    { id: 1, title: "천안중앙시장 5,000원 할인", description: "2만원 이상 구매 시", discount: "5,000원", market: "천안중앙시장", expiry: "2026.04.30", color: "bg-[#A67B50]" },
    { id: 2, title: "성환전통시장 10% 할인", description: "1만원 이상 구매 시", discount: "10%", market: "성환전통시장", expiry: "2026.05.15", color: "bg-[#7B8873]" },
    { id: 3, title: "천안역전시장 무료 시음권", description: "방문 시 1회 무료", discount: "무료", market: "천안역전시장", expiry: "2026.04.20", color: "bg-[#C69A67]" },
    { id: 4, title: "만보기 달성 특별 쿠폰", description: "5천원 이상 구매 시 3,000원", discount: "3,000원", market: "전 시장 공통", expiry: "2026.05.01", color: "bg-[#8A9A7D]" },
    { id: 5, title: "1시간 체류 달성 쿠폰", description: "시장 1시간 이상 체류", discount: "2,000원", market: "전 시장 공통", expiry: "2026.04.25", color: "bg-[#B48A62]" },
  ];

  return (
    <div className="min-h-screen bg-[#F8F7F3] pb-20">

      {/* ── 헤더 ── */}
      <div className="sticky top-0 bg-white z-10 border-b border-[#EEEAE4]">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/home" className="p-1"><ChevronLeft className="w-5 h-5 text-[#5A453B]" /></Link>
          <h1 className="text-[15px] text-[#46352C] font-semibold">마이페이지</h1>
          <Link to="/settings" className="group p-1"><Settings className="community-settings-motion w-5 h-5 text-[#5A453B]" /></Link>
        </div>
      </div>

      {/* ── 프로필 히어로 카드 ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#EAF3F6] via-[#F3F6F3] to-[#F8F7F3] px-5 pb-5 pt-6">
        <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-[#D8C6B8]/25 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-[#C4A88F]/20 blur-2xl" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <span className="profile-leaf profile-leaf-one">🍁</span>
          <span className="profile-leaf profile-leaf-two">🍂</span>
          <span className="profile-leaf profile-leaf-three">🍁</span>
        </div>
        <div className="relative z-10 mb-4 flex items-center gap-2 text-[11px] font-semibold tracking-wide text-[#8A776B]"><Sparkles className="h-3.5 w-3.5" /> 나의 시장 기록</div>

        <div className="relative z-10 mb-5 flex items-center gap-4 rounded-[24px] border border-[#E5D9CB] bg-white/80 p-4 shadow-[0_10px_30px_-24px_rgba(70,53,44,0.28)] backdrop-blur-sm">
          <button
            onClick={() => { setSheetDetail(null); setShowTitleSheet(true); }}
            className="relative flex-shrink-0"
          >
            <div className="flex h-[68px] w-[68px] items-center justify-center rounded-[22px] border border-[#E5D9CB] bg-gradient-to-br from-[#F5EBDD] to-[#E9DDCE] text-[34px] shadow-inner active:scale-95 transition-transform">
              {currentTitle.emoji}
            </div>
            {currentTitle.rare && (
              <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-[#8A6A52] text-white px-1.5 py-0.5 rounded-full font-bold leading-tight shadow-sm">
                희귀
              </span>
            )}
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] bg-white text-[#8A776B] border border-[#ECEBE4] px-2 py-0.5 rounded-full whitespace-nowrap">
              탭해서 변경
            </span>
          </button>

          <div className="flex-1">
            <p className="text-[#8A776B] text-[11px] mb-0.5">오늘도 시장을 둘러본</p>
            <h2 className="text-[#46352C] text-[21px] font-bold leading-tight">{user.name}</h2>
            <button
              onClick={() => { setSheetDetail(null); setShowTitleSheet(true); }}
              className="profile-title-glint relative mt-1 inline-flex items-center gap-1 overflow-hidden rounded-full border border-[#E5D9CB] bg-[#F5F0E7] px-2.5 py-1 text-[#6B5142] transition-colors active:bg-[#EFE4D8]"
            >
              <span className="text-[11px] font-semibold">{currentTitle.name}</span>
            </button>
          </div>

          <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
            <div className="rounded-xl border border-[#E5D9CB] bg-gradient-to-br from-[#FBF8F2] to-[#F0E8DD] px-3 pb-3 pt-2 text-center shadow-[0_6px_16px_-14px_rgba(70,53,44,0.28)]">
              <p className="text-[#8A6A52] text-[10px]">마일리지</p>
              <p className="text-[#5B4335] text-[16px] font-bold leading-none">
                {mileage.toLocaleString()}<span className="text-[10px] text-[#9A897F] font-normal ml-0.5">P</span>
              </p>
            </div>
            <button
              onClick={() => { setExchangeResult(null); setShowGiftShop(true); }}
              className="flex items-center gap-1 rounded-xl bg-[#5B4335] px-2.5 py-1.5 text-white shadow-[0_4px_12px_-9px_rgba(91,67,53,0.3)] transition-all duration-300 hover:bg-[#6B5142] hover:shadow-[0_7px_16px_-7px_rgba(91,67,53,0.28)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B89A7D]"
            >
              <Gift className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold">교환소</span>
            </button>
          </div>
        </div>

        {/* 스탯 바 */}
        <div className="relative z-10 grid grid-cols-3 gap-2">
          {[
            { label: "방문 가게", value: user.visitedStores, unit: "곳", emoji: "🏪", bg: "bg-white", border: "border-[#D8C6B8]" },
            { label: "스탬프", value: `${collectedCount}/${totalStamps}`, unit: "", emoji: "⭐", bg: "bg-white", border: "border-[#D8C6B8]" },
            { label: "이동거리", value: (user.totalDistance / 1000).toFixed(1), unit: "km", emoji: "👟", bg: "bg-white", border: "border-[#D8C6B8]" },
          ].map(stat => (
            <div key={stat.label} className={`${stat.bg} border ${stat.border} rounded-2xl px-2 py-3 text-center shadow-[0_6px_18px_-16px_rgba(70,53,44,0.28)]`}>
              <span className="text-[16px]">{stat.emoji}</span>
              <p className="text-[#46352C] text-[16px] font-bold mt-0.5 leading-none">
                {stat.value}<span className="text-[10px] text-[#9A897F] ml-0.5">{stat.unit}</span>
              </p>
              <p className="text-[#9A897F] text-[10px] mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 탭 바 ── */}
      <div className="sticky top-[53px] z-10 flex border-b border-[#EEEAE4] bg-white">
        {([
          { key: "stamps" as TabType, label: "🗺 스탬프" },
          { key: "events" as TabType, label: "🎯 이벤트" },
          { key: "coupons" as TabType, label: "🎟 쿠폰함" },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => {
              setActiveTab(key);
              setProgressAnimationKey((current) => current + 1);
            }}
            className={`flex-1 py-3 text-center text-[13px] transition-colors border-b-2 ${
              activeTab === key
                ? "text-[#46352C] border-[#5B4335] font-semibold"
                : "text-[#8A776B] border-transparent"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── 스탬프 탭 ── */}
      {activeTab === "stamps" && (
        <div className="space-y-3 px-4 py-4">

          {/* 만보기 */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#D8C6B8]">
            <div className="profile-challenge-glint relative overflow-hidden bg-gradient-to-r from-[#F5F8E9] to-[#EAF0DF] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[20px]">👟</span>
                <div>
                  <p className="text-[#465541] text-[13px] font-semibold">만보기 챌린지</p>
                  <p className="text-[#75836C] text-[10px]">달성 시 100P 지급</p>
                </div>
              </div>
              <TrendingUp className="w-5 h-5 text-[#7B8873]" />
            </div>
            <div className="px-4 py-3">
              <div className="flex items-center justify-between text-[12px] mb-2">
                <span className="text-[#9A897F]">오늘 걸음 수</span>
                <span className="text-[#65765E] font-semibold">8,500 / 10,000보</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div key={progressAnimationKey} className="profile-progress-fill h-2.5 bg-gradient-to-r from-[#7B8873] to-[#A3AF91] rounded-full" style={{ width: "85%" }} />
              </div>
              <p className="text-[11px] text-[#9A897F] mt-1.5">🏃 1,500보만 더!</p>
            </div>
          </div>

          {/* 진행 중 챌린지 */}
          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <h3 className="text-[13px] font-semibold text-[#46352C]">진행 중인 챌린지</h3>
              <span className="text-[11px] text-[#9A897F]">{uncollectedStamps.length}개</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {uncollectedStamps.map((stamp, i) => {
                const pct = Math.round((stamp.progress / stamp.maxProgress) * 100);
                const color = PROGRESS_COLORS[i % PROGRESS_COLORS.length];
                return (
                  <div key={stamp.id} className="bg-white rounded-2xl p-3.5 shadow-sm border border-[#D8C6B8]">
                    <div className="flex items-start justify-between mb-2.5">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-[20px]">{stamp.icon}</div>
                      <span className="text-[10px] bg-gray-100 text-[#8A776B] px-2 py-0.5 rounded-full font-medium">{stamp.reward}</span>
                    </div>
                    <p className="text-[13px] font-semibold text-[#46352C] mb-0.5">{stamp.name}</p>
                    <p className="text-[10px] text-[#9A897F] mb-2.5 leading-snug">{stamp.description}</p>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden mb-1">
                      <div key={progressAnimationKey} className={`profile-progress-fill h-1.5 ${color} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#9A897F]">{stamp.score}/{stamp.maxProgress} {stamp.unit}</span>
                      <span className="text-[10px] font-semibold text-[#8A776B]">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 칭호 배너 */}
          <button
            onClick={() => { setSheetDetail(null); setShowTitleSheet(true); }}
            className="profile-challenge-glint relative w-full overflow-hidden rounded-2xl border border-[#E8D6B7] bg-gradient-to-r from-[#F9F5E9] to-[#F3E7D1] px-4 py-3.5 flex items-center gap-3 active:opacity-90 transition-opacity shadow-sm"
          >
            <div className="w-10 h-10 bg-white/75 rounded-xl flex items-center justify-center text-[20px]">{currentTitle.emoji}</div>
            <div className="flex-1 text-left">
              <p className="text-[#9B784D] text-[11px]">현재 칭호</p>
              <p className="text-[#46352C] text-[14px] font-bold">{currentTitle.name}</p>
            </div>
            <div className="text-right">
              <p className="text-[#9B784D] text-[11px]">{unlockedCount}/{titles.length} 획득</p>
              <p className="text-[#795B3D] text-[11px] font-medium mt-0.5">전체 보기 →</p>
            </div>
          </button>
        </div>
      )}

      {/* ── 이벤트 탭 ── */}
      {activeTab === "events" && (
        <div className="px-4 py-4 space-y-3">
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#D8C6B8]">
            <div className="profile-challenge-glint relative overflow-hidden bg-gradient-to-r from-[#F5F8E9] to-[#EAF0DF] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#65765E]" />
                <div>
                  <p className="text-[#465541] text-[13px] font-semibold">가격표 촬영 인증</p>
                  <p className="text-[#75836C] text-[10px]">사진 1장당 50P</p>
                </div>
              </div>
              <span className="text-[10px] bg-white/75 text-[#65765E] px-2 py-0.5 rounded-full">진행중</span>
            </div>
            <div className="px-4 py-3">
              <p className="text-[12px] text-[#9A897F] mb-3 leading-relaxed">시장 가게의 가격표나 메뉴판을 찍어 업로드하면 마일리지를 드려요. 하루 최대 5장(250P)!</p>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div key={progressAnimationKey} className="profile-progress-fill h-2 bg-gradient-to-r from-[#7B8873] to-[#A3AF91] rounded-full" style={{ width: "40%" }} />
                </div>
                <span className="text-[12px] font-semibold text-[#76645A]">2/5장</span>
              </div>
              {photoUploaded ? (
                <div className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#EEF1EC] rounded-xl text-[#65765E] text-[13px] font-medium">
                  <CheckCircle2 className="w-4 h-4" />업로드 완료! +50P
                </div>
              ) : (
                <button onClick={() => setPhotoUploaded(true)} className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#5B4335] text-white rounded-xl text-[13px] font-medium active:bg-[#46352C] transition-colors">
                  <Upload className="w-4 h-4" />사진 업로드
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#D8C6B8]">
            <div className="profile-challenge-glint relative overflow-hidden bg-gradient-to-r from-[#F9F5E9] to-[#F3E7D1] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#A67B50]" />
                <div>
                  <p className="text-[#46352C] text-[13px] font-semibold">1시간 체류 이벤트</p>
                  <p className="text-[#9B784D] text-[10px]">달성 시 2,000원 쿠폰</p>
                </div>
              </div>
              <span className="text-[10px] bg-white/75 text-[#9B784D] px-2 py-0.5 rounded-full">진행중</span>
            </div>
            <div className="px-4 py-3">
              <p className="text-[12px] text-[#9A897F] mb-3 leading-relaxed">시장 반경 내에서 1시간 이상 GPS 체류가 확인되면 자동으로 쿠폰을 드려요.</p>
              <div className="flex items-center justify-between text-[12px] mb-1.5">
                <span className="text-[#9A897F]">오늘 체류 시간</span>
                <span className="font-semibold text-[#A67B50]">32분 / 60분</span>
              </div>
              <div className="w-full bg-[#F1EBDD] rounded-full h-2 overflow-hidden mb-2">
                <div key={progressAnimationKey} className="profile-progress-fill h-2 bg-gradient-to-r from-[#C69A67] to-[#D9B983] rounded-full" style={{ width: "53%" }} />
              </div>
              <div className="flex items-center gap-1.5 bg-[#F5F0E7] rounded-xl px-3 py-2">
                <MapPin className="w-3.5 h-3.5 text-[#A67B50] flex-shrink-0" />
                <span className="text-[11px] text-[#6B5142]">28분 더 머물면 쿠폰이 자동 발급돼요!</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#D8C6B8]">
            <div className="profile-challenge-glint relative overflow-hidden bg-gradient-to-r from-[#F5F0E7] to-[#EFE4D8] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[20px]">🤝</span>
                <div>
                  <p className="text-[#46352C] text-[13px] font-semibold">가격 정보 제보</p>
                  <p className="text-[#8A6A52] text-[10px]">1건당 30P · 채택 시 +50P</p>
                </div>
              </div>
              <span className="text-[10px] bg-white/75 text-[#8A6A52] px-2 py-0.5 rounded-full">상시</span>
            </div>
            <div className="px-4 py-3">
              <p className="text-[12px] text-[#9A897F] mb-3 leading-relaxed">시장 상품의 가격 정보를 직접 등록하고 마일리지를 받아요. 채택되면 추가 포인트도!</p>
              <button className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#5B4335] text-white rounded-xl text-[13px] font-medium active:bg-[#46352C] transition-colors">
                <Tag className="w-4 h-4" />가격 정보 등록
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 쿠폰 탭 ── */}
      {activeTab === "coupons" && (
        <div className="px-4 py-4 space-y-3">
          <div className="bg-gradient-to-br from-[#FBF8F2] to-[#F0E8DD] border border-[#E5D9CB] rounded-2xl px-4 py-4 relative overflow-hidden shadow-sm">
            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[14px]">🪙</span>
                  <span className="text-[12px] text-[#8A6A52]">보유 마일리지</span>
                </div>
                <p className="text-[32px] font-bold text-[#5B4335] leading-none">
                  {mileage.toLocaleString()}<span className="text-[16px] text-[#9A897F] ml-1">P</span>
                </p>
              </div>
              <button
                onClick={() => { setExchangeResult(null); setShowGiftShop(true); }}
                className="flex flex-col items-center gap-1 rounded-2xl bg-[#5B4335] px-4 py-3 text-white shadow-[0_4px_12px_-9px_rgba(91,67,53,0.3)] transition-all duration-300 hover:bg-[#6B5142] hover:shadow-[0_7px_16px_-7px_rgba(91,67,53,0.28)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B89A7D]"
              >
                <Gift className="w-5 h-5" />
                <span className="text-[11px] font-bold">교환소</span>
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <h3 className="text-[13px] font-semibold text-[#46352C]">보유 쿠폰</h3>
              <span className="text-[11px] text-[#9A897F]">{coupons.length}장</span>
            </div>
            <div className="space-y-2">
              {coupons.map((coupon) => (
                <div key={coupon.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#D8C6B8]">
                  <div className={`profile-challenge-glint relative overflow-hidden ${coupon.color} px-4 py-3 flex items-center justify-between`}>
                    <div>
                      <span className="text-white/60 text-[11px]">{coupon.market}</span>
                      <p className="text-white text-[22px] font-bold leading-tight">{coupon.discount}</p>
                    </div>
                    <Ticket className="w-7 h-7 text-white/25" />
                  </div>
                  <div className="flex items-center px-4">
                    <div className="w-3 h-3 rounded-full bg-gray-50 -ml-5 flex-shrink-0" />
                    <div className="flex-1 border-t border-dashed border-[#D8C6B8] mx-1" />
                    <div className="w-3 h-3 rounded-full bg-gray-50 -mr-5 flex-shrink-0" />
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-[13px] font-medium text-[#46352C] mb-0.5">{coupon.title}</p>
                    <p className="text-[11px] text-[#9A897F] mb-2">{coupon.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#9A897F]">~ {coupon.expiry}</span>
                      <button
                        onClick={() => handleUseCoupon(coupon)}
                        className="text-[12px] font-medium text-[#6B5142] bg-[#F5F0E7] px-3 py-1.5 rounded-xl active:bg-[#EFE4D8] transition-colors"
                      >
                        사용하기
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 선물 교환소 바텀시트 ── */}
      {showGiftShop && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[145]" onClick={() => setShowGiftShop(false)} />
          <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-3xl z-[150] shadow-2xl">
            <div className="px-5 pt-5 pb-8">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

              {exchangeResult ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center text-[40px] mb-4 shadow-sm">
                    {exchangeResult.emoji}
                  </div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <p className="text-[17px] font-bold text-[#46352C]">교환 완료!</p>
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-[14px] text-[#76645A] mb-1">{exchangeResult.name}</p>
                  <p className="text-[12px] text-[#9A897F] mb-6">쿠폰함에 추가되었어요 🎉</p>
                  <div className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
                    <span className="text-[12px] text-[#9A897F]">남은 마일리지</span>
                    <span className="text-[16px] font-bold text-[#46352C]">{mileage.toLocaleString()} P</span>
                  </div>
                  <button
                    onClick={() => setExchangeResult(null)}
                    className="w-full py-3 bg-[#5B4335] text-white rounded-2xl text-[14px] font-semibold active:bg-[#46352C] transition-colors"
                  >
                    계속 교환하기
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Gift className="w-5 h-5 text-[#8A6A52]" />
                      <p className="text-[16px] font-bold text-[#46352C]">선물 교환소</p>
                    </div>
                    <button onClick={() => setShowGiftShop(false)} className="p-1 text-[#9A897F]">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-[12px] text-[#9A897F] mb-1">마일리지로 할인권을 교환해요</p>

                  <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[16px]">🪙</span>
                      <span className="text-[12px] text-[#8A776B]">보유 마일리지</span>
                    </div>
                    <span className="text-[16px] font-bold text-[#46352C]">{mileage.toLocaleString()} P</span>
                  </div>

                  <div className="space-y-2">
                    {GIFT_ITEMS.map((item) => {
                      const canAfford = mileage >= item.cost;
                      return (
                        <div
                          key={item.id}
                          className={`bg-gradient-to-r ${item.color} border ${item.border} rounded-2xl px-4 py-3.5 flex items-center gap-3 ${!canAfford ? "opacity-50" : ""}`}
                        >
                          <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center text-[22px] shadow-sm flex-shrink-0">
                            {item.emoji}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <p className="text-[14px] font-bold text-[#46352C]">{item.name}</p>
                              {item.rare && (
                                <span className="text-[9px] bg-[#8A6A52] text-white px-1.5 py-0.5 rounded-full font-bold">인기</span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#8A776B]">{item.desc}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${item.badge}`}>
                              {item.cost.toLocaleString()} P
                            </span>
                            <button
                              onClick={() => handleExchange(item)}
                              disabled={!canAfford}
                              className={`text-[11px] font-semibold px-3 py-1.5 rounded-xl transition-colors ${
                                canAfford
                                  ? "bg-gray-900 text-white active:bg-gray-700"
                                  : "bg-gray-200 text-[#9A897F] cursor-not-allowed"
                              }`}
                            >
                              {canAfford ? "교환" : "부족"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-[#9A897F] text-center mt-4">
                    교환된 쿠폰은 쿠폰함에서 확인할 수 있어요
                  </p>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── 칭호 바텀시트 ── */}
      {showTitleSheet && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[145]" onClick={() => { setShowTitleSheet(false); setSheetDetail(null); }} />
          <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-3xl z-[150] shadow-2xl">
            <div className="px-5 pt-5 pb-8">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

              {sheetDetail ? (
                <>
                  <button onClick={() => setSheetDetail(null)} className="flex items-center gap-1 text-[12px] text-[#9A897F] mb-5">
                    <ChevronLeft className="w-4 h-4" /> 전체 칭호
                  </button>
                  <div className="flex flex-col items-center text-center mb-6">
                    <div className={`w-24 h-24 rounded-3xl flex items-center justify-center text-[44px] mb-3 ${sheetDetail.unlocked ? "bg-gray-100 border border-gray-200" : "bg-gray-100"}`}>
                      {sheetDetail.unlocked ? sheetDetail.emoji : <Lock className="w-10 h-10 text-gray-300" />}
                    </div>
                    {sheetDetail.rare && sheetDetail.unlocked && (
                      <span className="text-[11px] text-[#6B5142] font-semibold bg-[#F5F0E7] border border-[#E5D9CB] px-3 py-1 rounded-full mb-2">
                        ✨ 10% 이하의 사용자가 획득했어요!
                      </span>
                    )}
                    <p className="text-[19px] font-bold text-[#46352C] mb-1">{sheetDetail.name}</p>
                    <p className="text-[13px] text-[#8A776B] mb-4">{sheetDetail.description}</p>
                    <div className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-left">
                      <p className="text-[10px] text-[#9A897F] mb-1 uppercase tracking-wider">획득 조건</p>
                      <p className="text-[13px] text-[#5A453B] font-medium">{sheetDetail.condition}</p>
                    </div>
                  </div>
                  {sheetDetail.unlocked ? (
                    currentTitle.id === sheetDetail.id ? (
                      <div className="w-full py-3.5 rounded-2xl bg-gray-100 border border-gray-200 text-[#8A776B] text-[14px] font-semibold text-center flex items-center justify-center gap-2">
                        <Check className="w-4 h-4" />현재 적용 중
                      </div>
                    ) : (
                      <button onClick={() => handleApplyTitle(sheetDetail.id)} className="w-full py-3.5 rounded-2xl bg-[#5B4335] text-white text-[15px] font-semibold active:bg-[#46352C] transition-colors">
                        이 칭호 사용하기
                      </button>
                    )
                  ) : (
                    <button disabled className="w-full py-3.5 rounded-2xl bg-gray-100 text-[#9A897F] text-[15px] font-semibold cursor-not-allowed">
                      아직 잠겨있어요 🔒
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[16px] font-bold text-[#46352C]">나의 칭호</p>
                    <span className="text-[12px] text-[#9A897F] bg-gray-100 px-2.5 py-1 rounded-full">{unlockedCount} / {titles.length} 획득</span>
                  </div>
                  <p className="text-[12px] text-[#9A897F] mb-4">스탬프를 모아 새로운 칭호를 해금하세요</p>

                  <div className="grid grid-cols-3 gap-2.5 mb-4">
                    {titles.map((title) => {
                      const isActive = currentTitle.id === title.id;
                      const matchedStamp = collectedStamps.find(s => s.name === title.name);
                      const acquiredDate = title.unlockAt === 0 ? "가입 시 획득" : matchedStamp?.date;
                      return (
                        <button
                          key={title.id}
                          onClick={() => setSheetDetail(title)}
                          className={`flex flex-col items-center py-3.5 px-2 rounded-2xl border-2 transition-all relative ${
                            isActive ? "border-[#8A6A52] bg-[#F5F0E7]"
                            : title.unlocked ? "border-gray-100 bg-white active:bg-gray-50"
                            : "border-gray-100 bg-gray-50 opacity-50"
                          }`}
                        >
                          {isActive && (
                            <span className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-[#8A6A52] rounded-full flex items-center justify-center shadow-sm">
                              <Check className="w-3 h-3 text-white" />
                            </span>
                          )}
                          {title.rare && title.unlocked && (
                            <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-[#A88B6B] text-white px-1.5 py-0.5 rounded-full font-bold">희귀</span>
                          )}
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-[24px] mb-2 ${title.unlocked ? "bg-gray-100" : "bg-gray-100"}`}>
                            {title.unlocked ? title.emoji : <Lock className="w-5 h-5 text-gray-300" />}
                          </div>
                          <p className={`text-[10px] font-semibold text-center leading-tight mb-0.5 ${isActive ? "text-[#5B4335]" : title.unlocked ? "text-[#5A453B]" : "text-[#9A897F]"}`}>
                            {title.name}
                          </p>
                          <p className="text-[9px] text-[#9A897F] text-center leading-tight">
                            {title.unlocked ? acquiredDate ?? "획득 완료" : `스탬프 ${title.unlockAt}개`}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  <button onClick={() => setShowTitleSheet(false)} className="w-full py-3 text-[14px] text-[#9A897F] active:text-[#76645A]">
                    닫기
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── 쿠폰 사용하기 바텀시트 ── */}
      {selectedCoupon && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[145]" onClick={() => setSelectedCoupon(null)} />
          <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-3xl z-[150] shadow-2xl">
            <div className="px-5 pt-5 pb-10">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

              {/* 헤더 */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[11px] text-[#9A897F]">{selectedCoupon.market}</p>
                  <p className="text-[16px] font-bold text-[#46352C]">{selectedCoupon.title}</p>
                </div>
                <button onClick={() => setSelectedCoupon(null)} className="p-1 text-[#9A897F]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* QR / 번호 토글 */}
              <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
                <button
                  onClick={() => setCouponViewMode("qr")}
                  className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                    couponViewMode === "qr" ? "bg-white text-[#34251F] shadow-sm" : "text-[#9A897F]"
                  }`}
                >
                  QR 코드
                </button>
                <button
                  onClick={() => setCouponViewMode("number")}
                  className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                    couponViewMode === "number" ? "bg-white text-[#34251F] shadow-sm" : "text-[#9A897F]"
                  }`}
                >
                  쿠폰 번호
                </button>
              </div>

              {couponViewMode === "qr" ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 shadow-sm">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(couponCode)}&bgcolor=FFFFFF&color=111111&margin=10`}
                      alt="쿠폰 QR코드"
                      width={180}
                      height={180}
                      className="rounded-lg"
                    />
                  </div>
                  <p className="text-[11px] text-[#9A897F] text-center">점원에게 이 QR을 스캔해 달라고 하세요</p>
                  <div className="bg-gray-50 rounded-xl px-4 py-2 w-full text-center">
                    <span className="text-[11px] text-[#9A897F] tracking-widest font-mono">{couponCode}</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-[32px]">
                    🎟
                  </div>
                  <div className="bg-gray-50 border border-dashed border-gray-300 rounded-2xl px-6 py-5 w-full text-center">
                    <p className="text-[11px] text-[#9A897F] mb-2">쿠폰 번호</p>
                    <p className="text-[22px] font-bold text-[#46352C] tracking-widest font-mono">{couponCode}</p>
                  </div>
                  <p className="text-[11px] text-[#9A897F] text-center">이 번호를 점원에게 보여주세요</p>
                </div>
              )}

              {/* 만료일 */}
              <div className="mt-5 flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <span className="text-[12px] text-[#9A897F]">사용 가능 기한</span>
                <span className="text-[12px] font-semibold text-[#5A453B]">~ {selectedCoupon.expiry}</span>
              </div>
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}
