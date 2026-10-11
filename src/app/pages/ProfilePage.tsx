// src/app/pages/ProfilePage.tsx
import {
  ChevronLeft, Settings, Ticket, Gift, Camera, Coins,
  X, Sparkles, Lock, Check,
} from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { useState, useEffect } from "react";
import { BottomNav } from "../components/BottomNav";
import { CheckinSheet } from "../components/CheckinSheet";
import {
  getTitlesWithStatus, getActiveTitle, setActiveTitle,
  type TitleItem, type TitleId,
} from "../data/userStore";
import {
  STAMP_DEFS, EVENT_DEFS,
  PRICE_REPORT_POINTS, paysOnApproval,
  addEarnedCoupon, addMileage, eventMeter, loadCoupons, loadPointLedger, loadProgress,
  readMileage, refreshRewards, refreshSubmissions, stampProgress, submissionsForUser, submitReward,
  uniqueCheckinCount, type EarnedCoupon, type PointEntry, type RewardSubmission,
} from "../data/rewards";
import { redeemCoupon } from "../data/couponUse";

function latestPhoto(items: RewardSubmission[], eventId: string) {
  return items.find((item) => item.kind === "photo-event" && item.eventId === eventId);
}
import { compressImageFile } from "../utils/imageCompress";

function formatDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const PRICE_PAGE_SIZE = 5;

type TabType = "stamps" | "events" | "price" | "coupons";
const PROGRESS_COLORS = ["bg-rose-400", "bg-amber-400", "bg-emerald-400", "bg-sky-400", "bg-violet-400"];

const GIFT_ITEMS = [
  { id: 1, emoji: "🎫", name: "500원 할인권", desc: "전 시장 공통", cost: 500,  color: "from-[#F9F5E9] to-[#F3E7D1]", border: "border-[#E8DCC5]", badge: "bg-[#F3E7D1] text-[#795B3D]" },
  { id: 2, emoji: "🎟", name: "1,000원 할인권", desc: "전 시장 공통", cost: 900,  color: "from-[#F5F0E7] to-[#EFE4D8]", border: "border-[#E5D9CB]", badge: "bg-[#EFE4D8] text-[#6B5142]" },
  { id: 3, emoji: "🏷", name: "2,000원 할인권", desc: "전 시장 공통", cost: 1700, color: "from-[#F5F8E9] to-[#EAF0DF]", border: "border-[#DFE8D5]", badge: "bg-[#EAF0DF] text-[#65765E]" },
  { id: 4, emoji: "💝", name: "5,000원 할인권", desc: "전 시장 공통", cost: 4000, color: "from-[#F9F5E9] to-[#F3E7D1]", border: "border-[#E8DCC5]", badge: "bg-[#F3E7D1] text-[#795B3D]" },
  { id: 5, emoji: "👑", name: "10,000원 할인권", desc: "전 시장 공통", cost: 7500, color: "from-[#F5F8E9] to-[#EAF0DF]", border: "border-[#DFE8D5]", badge: "bg-[#EAF0DF] text-[#65765E]", rare: true },
];

export function ProfilePage() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const tab = searchParams.get("tab");
    return tab === "events" || tab === "price" || tab === "coupons" ? tab : "stamps";
  });

  const [showTitleSheet, setShowTitleSheet] = useState(false);
  const [sheetDetail, setSheetDetail] = useState<(TitleItem & { unlocked: boolean }) | null>(null);

  const [showGiftShop, setShowGiftShop] = useState(false);
  const [showPoints, setShowPoints] = useState(false);
  const [priceFilter, setPriceFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [pricePage, setPricePage] = useState(0);
  const [mileage, setMileage] = useState(() => readMileage());
  const [syncTick, setSyncTick] = useState(0);
  const [exchangeResult, setExchangeResult] = useState<{ name: string; emoji: string } | null>(null);
  const [progressTick, setProgressTick] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [showCheckin, setShowCheckin] = useState(false);
  const [notice, setNotice] = useState("");
  const [submissions, setSubmissions] = useState<RewardSubmission[]>([]);
  const [photoNote, setPhotoNote] = useState("");
  const [photoEventId, setPhotoEventId] = useState<string | null>(null);
  const [rejectInfoId, setRejectInfoId] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<EarnedCoupon[]>(() => loadCoupons());

  useEffect(() => {
    const timer = window.setTimeout(() => setStepProgress(85), 80);
    return () => window.clearTimeout(timer);
  }, []);

  const progress = loadProgress();
  const visited = uniqueCheckinCount(progress);
  const collectedCount = progress.claimedStamps.length;
  const totalStamps = STAMP_DEFS.length;
  const mySubmissions = submissionsForUser(submissions);
  const priceReports = mySubmissions.filter((item) => item.kind === "price");
  const pendingPriceCount = priceReports.filter((item) => item.status === "pending").length;
  const filteredPriceReports = priceReports.filter((item) => item.status === priceFilter);
  const priceTotalPages = Math.max(1, Math.ceil(filteredPriceReports.length / PRICE_PAGE_SIZE));
  const currentPricePage = Math.min(pricePage, priceTotalPages - 1);
  const pagedPriceReports = filteredPriceReports.slice(currentPricePage * PRICE_PAGE_SIZE, (currentPricePage + 1) * PRICE_PAGE_SIZE);
  const pendingPhotoPoints = mySubmissions
    .filter((item) => item.kind === "photo-event" && item.status === "pending")
    .reduce((sum, item) => sum + (EVENT_DEFS.find((event) => event.id === item.eventId)?.points ?? 0), 0);
  const pendingPricePoints = priceReports.filter((item) => item.status === "pending" && paysOnApproval(item)).length * PRICE_REPORT_POINTS;
  const pendingPoints = pendingPricePoints + pendingPhotoPoints;
  const pointEntries: PointEntry[] = (() => {
    void progressTick;
    void syncTick;
    void mileage;
    const ledger = loadPointLedger();
    const tracked = ledger.reduce((sum, entry) => sum + entry.points, 0);
    const earlier = mileage - tracked;
    if (earlier <= 0) return ledger;
    return [...ledger, { id: "earlier", at: "", label: "이전 적립", points: earlier }];
  })();

  const [selectedCoupon, setSelectedCoupon] = useState<EarnedCoupon | null>(null);
  const savedName = localStorage.getItem("user_name") || "손님";
  const user = { name: savedName };

  useEffect(() => {
    let alive = true;
    void refreshRewards().then(({ items }) => {
      if (!alive) return;
      setSubmissions(items);
      setMileage(readMileage());
      setCoupons(loadCoupons());
      setSyncTick((value) => value + 1);
    });
    return () => {
      alive = false;
    };
  }, [progressTick]);

  const [currentTitle, setCurrentTitleState] = useState(() => getActiveTitle(collectedCount));
  const titles = getTitlesWithStatus(collectedCount);
  const unlockedCount = titles.filter(t => t.unlocked).length;

  useEffect(() => {
    setCurrentTitleState(getActiveTitle(collectedCount));
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
    setMileage(addMileage(-item.cost, `교환 · ${item.name}`));
    const next = addEarnedCoupon({
      id: `coupon-${Date.now()}`,
      title: item.name,
      description: "포인트로 교환한 쿠폰",
      discount: item.name.replace(" 할인권", ""),
      market: "전 시장 공통",
      expiry: "교환일로부터 30일",
      color: "bg-[#6B5142]",
    });
    setCoupons(next);
    setExchangeResult({ name: item.name, emoji: item.emoji });
  };

  const handleUseCoupon = (coupon: EarnedCoupon) => {
    setSelectedCoupon(coupon);
  };

  const verifyCouponStore = async (store: { id: number; name: string }) => {
    if (!selectedCoupon) return { error: "쿠폰을 다시 선택해 주세요." };
    const result = await redeemCoupon(selectedCoupon.id, store);
    setCoupons(loadCoupons());
    if (!result.ok) return { error: result.error };
    return { message: `${store.name}에서 ${result.amount.toLocaleString()}원 할인 쿠폰을 사용했어요.` };
  };

  const uploadPhotoEvent = async (file: File | undefined) => {
    if (!file || !photoEventId) return;
    const image = await compressImageFile(file, { maxWidth: 720, maxHeight: 720, quality: 0.62 });
    const event = EVENT_DEFS.find((item) => item.id === photoEventId);
    await submitReward({
      kind: "photo-event",
      eventId: photoEventId,
      storeName: "시장",
      note: photoNote || event?.name,
      image,
    });
    setNotice("사진을 보냈어요. 승인되면 포인트가 들어와요.");
    setPhotoNote("");
    setPhotoEventId(null);
    setProgressTick((value) => value + 1);
  };

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
            { label: "방문 가게", value: visited, unit: "곳", emoji: "🏪", bg: "bg-white/60", border: "border-[#E5D9CB]" },
            { label: "스탬프", value: `${collectedCount}/${totalStamps}`, unit: "", emoji: "⭐", bg: "bg-white/60", border: "border-[#E5D9CB]" },
            { label: "포인트", value: mileage.toLocaleString(), unit: "P", emoji: "", bg: "bg-white/60", border: "border-[#E5D9CB]" },
          ].map(stat => {
            const body = (
              <>
                {stat.label === "포인트" ? <Coins className="mx-auto h-4 w-4 text-[#B5813D]" strokeWidth={2.2} /> : <span className="text-[16px]">{stat.emoji}</span>}
                <p className="text-[#46352C] text-[16px] font-bold mt-0.5 leading-none">
                  {stat.value}<span className="text-[10px] text-[#8A776B] ml-0.5">{stat.unit}</span>
                </p>
                <p className="text-[#8A776B] text-[10px] mt-0.5">{stat.label}</p>
                {stat.label === "포인트" && <p className="text-[#C9813A] text-[10px] font-medium mt-0.5">적립 내역 ›</p>}
              </>
            );
            const cls = `${stat.bg} border ${stat.border} rounded-xl px-2 py-2.5 text-center`;
            return stat.label === "포인트" ? (
              <button key={stat.label} type="button" onClick={() => setShowPoints(true)} className={`${cls} active:bg-white`}>
                {body}
              </button>
            ) : (
              <div key={stat.label} className={cls}>{body}</div>
            );
          })}
        </div>
      </div>

      {/* ── 탭 바 ── */}
      <div className="sticky top-[53px] z-10 flex border-b border-[#EEEAE4] bg-white">
        {([
          { key: "stamps" as TabType, label: "🗺 스탬프" },
          { key: "events" as TabType, label: "🎯 이벤트" },
          { key: "price" as TabType, label: "🏷 가격제보" },
          { key: "coupons" as TabType, label: "🎟 쿠폰함" },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`relative flex-1 py-3 text-center text-[13px] transition-colors border-b-2 ${
              activeTab === key
                ? "text-[#46352C] border-[#5B4335] font-semibold"
                : "text-[#8A776B] border-transparent"
            }`}
          >
            {label}
            {key === "price" && pendingPriceCount > 0 && (
              <span className="absolute right-1 top-1.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-400 text-[10px] font-bold text-[#46352C] leading-4">
                {pendingPriceCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── 스탬프 탭 ── */}
      {activeTab === "stamps" && (
        <div className="px-4 py-4 space-y-3">
          {notice && <p className="text-[12px] text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">{notice}</p>}
          <div className="overflow-hidden rounded-2xl border border-[#EAD7CB] bg-white shadow-sm">
            <div className="flex items-center justify-between bg-[#F6E9E0] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-[20px]">👟</span>
                <div>
                  <p className="text-[13px] font-semibold text-[#70483A]">만보기 챌린지</p>
                  <p className="text-[10px] text-[#8B6758]">달성 시 100P 지급</p>
                </div>
              </div>
              <span className="rounded-full bg-white/75 px-2 py-1 text-[9px] font-medium text-[#9A6249]">미리보기</span>
            </div>
            <div className="px-4 py-3">
              <div className="mb-2 flex items-center justify-between text-[12px]">
                <span className="text-[#8A776B]">오늘 걸음 수</span>
                <span className="font-semibold text-[#554F49]">8,500 / 10,000보</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#F1E3DA]">
                <div className="h-2.5 rounded-full bg-gradient-to-r from-[#EF984C] to-[#D65D45] transition-[width] duration-[1400ms] ease-out" style={{ width: `${stepProgress}%` }} />
              </div>
              <p className="mt-1.5 text-[11px] text-[#8B6758]">🏃 1,500보만 더!</p>
            </div>
          </div>
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[13px] font-semibold text-[#46352C]">진행 중인 퀘스트</h3>
            <span className="text-[11px] text-[#8A776B]">카드를 누르면 인증</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[...STAMP_DEFS].sort((a, b) => Number(progress.claimedStamps.includes(a.id)) - Number(progress.claimedStamps.includes(b.id))).map((stamp) => {
              const index = STAMP_DEFS.findIndex((item) => item.id === stamp.id);
              const done = progress.claimedStamps.includes(stamp.id);
              const current = Math.min(stampProgress(progress, stamp), stamp.target);
              const pct = Math.round((current / stamp.target) * 100);
              const card = (
                <>
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-10 h-10 bg-[#F5F0E7] rounded-xl flex items-center justify-center text-[20px]">{stamp.icon}</div>
                    <span className="text-[10px] bg-[#F5F0E7] text-[#6B5142] px-2 py-0.5 rounded-full font-medium">{done ? "완료" : `${stamp.points}P`}</span>
                  </div>
                  <p className="text-[13px] font-semibold text-[#46352C] leading-tight">{stamp.name}</p>
                  <p className="text-[10px] text-[#8A776B] mt-0.5 leading-snug min-h-[28px]">{stamp.description}</p>
                  <div className="w-full bg-[#F5F0E7] rounded-full h-1.5 mt-2 overflow-hidden">
                    <div className={`h-1.5 ${done ? "bg-emerald-400" : PROGRESS_COLORS[index % PROGRESS_COLORS.length]} rounded-full`} style={{ width: `${done ? 100 : pct}%` }} />
                  </div>
                  <p className="text-[10px] text-[#8A776B] mt-1">{done ? "완료" : `${current}/${stamp.target}${stamp.unit}`}</p>
                </>
              );
              if (done) {
                return (
                  <div key={stamp.id} className="bg-white rounded-2xl p-3.5 border border-emerald-100 shadow-sm text-left">
                    {card}
                  </div>
                );
              }
              return (
                <button key={stamp.id} type="button" onClick={() => setShowCheckin(true)} className="bg-white rounded-2xl p-3.5 border border-[#E5D9CB] shadow-sm text-left active:bg-[#F7F5F1]">
                  {card}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => { setSheetDetail(null); setShowTitleSheet(true); }}
            className="profile-challenge-glint relative w-full overflow-hidden rounded-2xl border border-[#E8D6B7] bg-gradient-to-r from-[#F9F5E9] to-[#F3E7D1] px-4 py-3.5 flex items-center gap-3 active:opacity-90 transition-opacity shadow-sm"
          >
            <div className="w-10 h-10 bg-white/75 rounded-xl flex items-center justify-center text-[20px]">{currentTitle.emoji}</div>
            <div className="flex-1 text-left">
              <p className="text-[#9B784D] text-[11px]">현재 칭호</p>
              <p className="text-[#46352C] text-[14px] font-bold">{currentTitle.name}</p>
            </div>
            <p className="text-white/80 text-[11px]">{unlockedCount}/{titles.length}</p>
          </button>
        </div>
      )}

      {activeTab === "events" && (
        <div className="px-4 py-4 space-y-3">
          {notice && <p className="text-[12px] text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">{notice}</p>}
          {[
            { key: "basic", title: "이벤트 퀘스트", hint: "카드를 누르면 참여", defs: EVENT_DEFS.filter((event) => event.group !== "sns") },
            { key: "sns", title: "SNS 홍보 퀘스트", hint: "게시 화면을 캡처해서 보내요", defs: EVENT_DEFS.filter((event) => event.group === "sns") },
          ].map((section) => (
          <div key={section.key} className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[13px] font-semibold text-[#46352C]">{section.title}</h3>
            <span className="text-[11px] text-[#8A776B]">{section.hint}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {section.defs.map((event, index) => {
              const photo = latestPhoto(mySubmissions, event.id);
              const meter = eventMeter(progress, event);
              const done = event.kind === "checkin" ? meter.done : photo?.status === "approved";
              const pending = event.kind === "photo" && photo?.status === "pending";
              const rejected = event.kind === "photo" && photo?.status === "rejected";
              const label = done ? "완료" : pending ? "확인 중" : rejected ? "거절" : `${event.points}P`;
              const detail = rejected
                ? "눌러서 거절 사유 보기"
                : event.kind === "checkin"
                  ? `${meter.current}/${meter.target}`
                  : event.description;
              return (
                <button
                  key={event.id}
                  type="button"
                  disabled={done || pending}
                  onClick={() => {
                    if (event.kind === "checkin") setShowCheckin(true);
                    else if (rejected) setRejectInfoId(event.id);
                    else setPhotoEventId(event.id);
                  }}
                  className={`bg-white rounded-2xl p-3.5 border shadow-sm text-left ${done ? "border-emerald-100" : "border-[#E5D9CB] active:bg-[#F7F5F1]"} disabled:active:bg-white`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-10 h-10 bg-[#F5F0E7] rounded-xl flex items-center justify-center text-[20px]">{event.icon}</div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${done ? "bg-emerald-50 text-emerald-600" : pending ? "bg-amber-50 text-amber-600" : rejected ? "bg-rose-50 text-rose-500" : "bg-[#F5F0E7] text-[#6B5142]"}`}>{label}</span>
                      {event.kind === "photo" && (
                        <span className="w-6 h-6 rounded-full bg-[#F5F0E7] flex items-center justify-center">
                          <Camera className="w-3.5 h-3.5 text-[#46352C]" />
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[13px] font-semibold text-[#46352C] leading-tight">{event.name}</p>
                  <p className="text-[10px] text-[#8A776B] mt-0.5 leading-snug min-h-[28px] line-clamp-2">{detail}</p>
                  <div className="w-full bg-[#F5F0E7] rounded-full h-1.5 mt-2 overflow-hidden">
                    <div className={`h-1.5 ${done ? "bg-emerald-400" : PROGRESS_COLORS[index % PROGRESS_COLORS.length]} rounded-full`} style={{ width: `${done || pending ? 100 : event.kind === "checkin" ? Math.round((meter.current / meter.target) * 100) : 0}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
          </div>
          ))}
        </div>
      )}

      {activeTab === "price" && (
        <div className="px-4 py-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {([
              { label: "확인 중", status: "pending", tone: "text-amber-600", ring: "border-amber-300 bg-amber-50/60" },
              { label: "승인 완료", status: "approved", tone: "text-emerald-600", ring: "border-emerald-300 bg-emerald-50/60" },
              { label: "거절", status: "rejected", tone: "text-rose-500", ring: "border-rose-300 bg-rose-50/60" },
            ] as const).map((entry) => (
              <button
                key={entry.status}
                type="button"
                onClick={() => { setPriceFilter(entry.status); setPricePage(0); }}
                className={`rounded-xl border py-2.5 text-center shadow-sm transition-colors ${
                  priceFilter === entry.status ? entry.ring : "border-[#E5D9CB] bg-white"
                }`}
              >
                <p className={`text-[16px] font-bold leading-none ${entry.tone}`}>
                  {priceReports.filter((item) => item.status === entry.status).length}
                </p>
                <p className={`mt-1 text-[10px] ${priceFilter === entry.status ? "font-semibold text-[#46352C]" : "text-[#8A776B]"}`}>{entry.label}</p>
              </button>
            ))}
          </div>
          <p className="px-1 text-[11px] leading-relaxed text-[#8A776B]">
            가게 상세에서 가격이 다르면 사진과 함께 제보해 주세요. 승인되면 {PRICE_REPORT_POINTS}P가 적립되고 가게 가격이 바뀝니다.
          </p>
          {filteredPriceReports.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E5D9CB] px-4 py-10 text-center">
              <p className="text-[13px] text-[#6B5142]">
                {priceReports.length === 0
                  ? "아직 보낸 가격 제보가 없어요."
                  : priceFilter === "pending"
                    ? "확인 중인 제보가 없어요."
                    : priceFilter === "approved"
                      ? "승인 완료된 제보가 없어요."
                      : "거절된 제보가 없어요."}
              </p>
              {priceReports.length === 0 && (
                <Link to="/map" className="mt-3 inline-block rounded-full bg-amber-400 px-4 py-2 text-[12px] font-semibold text-[#46352C]">
                  지도에서 가게 찾기
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {pagedPriceReports.map((item) => {
                const price = Number((item.priceText || "").replace(/[^\d]/g, ""));
                const tone = item.status === "approved"
                  ? { chip: "bg-emerald-50 text-emerald-600", text: "승인 완료", border: "border-emerald-100" }
                  : item.status === "rejected"
                    ? { chip: "bg-rose-50 text-rose-500", text: "거절", border: "border-rose-100" }
                    : { chip: "bg-amber-50 text-amber-600", text: "확인 중", border: "border-[#E5D9CB]" };
                return (
                  <div key={item.id} className={`rounded-2xl border ${tone.border} bg-white p-3.5 shadow-sm`}>
                    <div className="flex items-start gap-3">
                      {item.image ? (
                        <img src={item.image} alt="" className="h-12 w-12 flex-shrink-0 rounded-xl object-cover bg-[#F5F0E7]" />
                      ) : (
                        <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-[#F5F0E7]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-[13px] font-semibold text-[#46352C]">{item.storeName}</p>
                          <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${tone.chip}`}>{tone.text}</span>
                        </div>
                        <p className="mt-0.5 text-[12px] text-[#6B5142]">
                          {item.itemName} · {price ? `${price.toLocaleString()}원` : "-"}
                        </p>
                        <p className="mt-0.5 text-[10px] text-[#8A776B]">
                          {formatDateTime(item.createdAt)}
                          {item.status === "approved" && ` · +${PRICE_REPORT_POINTS}P 적립`}
                        </p>
                      </div>
                    </div>
                    {item.status === "rejected" && (
                      <div className="mt-2.5 rounded-xl bg-rose-50 px-3 py-2">
                        <p className="text-[10px] font-semibold text-rose-500">거절 사유</p>
                        <p className="mt-0.5 text-[12px] leading-relaxed text-[#46352C]">{item.rejectReason || "사유가 입력되지 않았어요."}</p>
                      </div>
                    )}
                  </div>
                );
              })}
              {priceTotalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={currentPricePage === 0}
                    onClick={() => setPricePage(currentPricePage - 1)}
                    className="h-9 rounded-full bg-white border border-[#E5D9CB] px-4 text-[12px] font-medium text-[#6B5142] disabled:opacity-40"
                  >
                    ‹ 이전
                  </button>
                  <span className="text-[12px] text-[#6B5142]">{currentPricePage + 1} / {priceTotalPages}</span>
                  <button
                    type="button"
                    disabled={currentPricePage >= priceTotalPages - 1}
                    onClick={() => setPricePage(currentPricePage + 1)}
                    className="h-9 rounded-full bg-white border border-[#E5D9CB] px-4 text-[12px] font-medium text-[#6B5142] disabled:opacity-40"
                  >
                    다음 ›
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 쿠폰 탭 ── */}
      {activeTab === "coupons" && (
        <div className="px-4 py-4 space-y-3">
          <div className="bg-gradient-to-br from-[#FBF8F2] to-[#F0E8DD] border border-[#E5D9CB] rounded-2xl px-4 py-4 relative overflow-hidden shadow-sm">
            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Coins className="h-4 w-4 text-[#B5813D]" strokeWidth={2.2} />
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
              <span className="text-[11px] text-[#8A776B]">{coupons.filter((coupon) => !coupon.usedAt).length}장</span>
            </div>
            <div className="space-y-2">
              {notice && <p className="text-[12px] text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">{notice}</p>}
              {coupons.filter((coupon) => !coupon.usedAt).length === 0 && (
                <div className="rounded-2xl border border-dashed border-[#E5D9CB] px-4 py-8 text-center">
                  <p className="text-[13px] text-[#6B5142]">아직 쿠폰이 없어요.</p>
                  <p className="text-[12px] text-[#8A776B] mt-1">스탬프와 이벤트로 모은 포인트를 교환소에서 쿠폰으로 바꿀 수 있어요.</p>
                </div>
              )}
              {coupons.filter((coupon) => !coupon.usedAt).map((coupon) => (
                <div key={coupon.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#E5D9CB]">
                  <div className={`${coupon.color} px-4 py-3 flex items-center justify-between`}>
                    <div>
                      <span className="text-white/60 text-[11px]">{coupon.market}</span>
                      <p className="text-white text-[22px] font-bold leading-tight">{coupon.discount}</p>
                    </div>
                    <Ticket className="w-7 h-7 text-white/25" />
                  </div>
                  <div className="flex items-center px-4">
                    <div className="w-3 h-3 rounded-full bg-[#F7F5F1] -ml-5 flex-shrink-0" />
                    <div className="flex-1 border-t border-dashed border-[#D8C6B8] mx-1" />
                    <div className="w-3 h-3 rounded-full bg-[#F7F5F1] -mr-5 flex-shrink-0" />
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

          {coupons.some((coupon) => coupon.usedAt) && (
            <div>
              <div className="flex items-center justify-between px-1 mb-2">
                <h3 className="text-[13px] font-semibold text-[#46352C]">사용한 쿠폰</h3>
                <span className="text-[11px] text-[#8A776B]">{coupons.filter((coupon) => coupon.usedAt).length}장</span>
              </div>
              <div className="space-y-2">
                {coupons.filter((coupon) => coupon.usedAt).map((coupon) => (
                  <div key={coupon.id} className="flex items-center justify-between rounded-2xl bg-[#F7F5F1] px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[#6B5142]">{coupon.title}</p>
                      <p className="text-[11px] text-[#8A776B]">{coupon.usedStoreName} · {formatDateTime(coupon.usedAt ?? "")}</p>
                    </div>
                    <span className="flex-shrink-0 rounded-full bg-[#EFE4D8] px-2 py-0.5 text-[10px] text-[#6B5142]">사용 완료</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 포인트 적립 내역 바텀시트 ── */}
      {showPoints && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[145]" onClick={() => setShowPoints(false)} />
          <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-3xl z-[150] shadow-2xl">
            <div className="px-5 pt-5 pb-6">
              <div className="w-10 h-1 bg-[#EFE4D8] rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-3">
                <p className="text-[16px] font-bold text-[#46352C]">포인트 적립 내역</p>
                <button onClick={() => setShowPoints(false)} className="p-1 text-[#8A776B]" aria-label="닫기">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="bg-[#FAF4EC] border border-[#EDE5D8] rounded-2xl px-4 py-3 flex items-center justify-between">
                <span className="text-[12px] text-[#6B5142]">보유 포인트</span>
                <span className="text-[20px] font-bold text-[#46352C]">{mileage.toLocaleString()}<span className="text-[12px] text-[#8A776B] ml-0.5">P</span></span>
              </div>
              {pendingPoints > 0 && (
                <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                  승인 대기 중인 제보·사진이 있어요. 승인되면 최대 +{pendingPoints.toLocaleString()}P가 적립돼요.
                </p>
              )}
              <div className="mt-3 max-h-[46vh] overflow-y-auto">
                {pointEntries.length === 0 ? (
                  <p className="py-10 text-center text-[13px] text-[#8A776B]">아직 적립 내역이 없어요.</p>
                ) : (
                  pointEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between gap-3 border-b border-[#E5D9CB] py-3 last:border-b-0">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] text-[#46352C]">{entry.label}</p>
                        {entry.at && <p className="mt-0.5 text-[10px] text-[#8A776B]">{formatDateTime(entry.at)}</p>}
                      </div>
                      <span className={`flex-shrink-0 text-[14px] font-bold ${entry.points >= 0 ? "text-emerald-600" : "text-[#6B5142]"}`}>
                        {entry.points >= 0 ? "+" : ""}{entry.points.toLocaleString()}P
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── 선물 교환소 바텀시트 ── */}
      {showGiftShop && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[145]" onClick={() => setShowGiftShop(false)} />
          <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-3xl z-[150] shadow-2xl">
            <div className="px-5 pt-5 pb-8">
              <div className="w-10 h-1 bg-[#EFE4D8] rounded-full mx-auto mb-4" />

              {exchangeResult ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="w-20 h-20 bg-[#F5F0E7] rounded-3xl flex items-center justify-center text-[40px] mb-4 shadow-sm">
                    {exchangeResult.emoji}
                  </div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <p className="text-[17px] font-bold text-[#46352C]">교환 완료!</p>
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-[14px] text-[#76645A] mb-1">{exchangeResult.name}</p>
                  <p className="text-[12px] text-[#9A897F] mb-6">쿠폰함에 추가되었어요 🎉</p>
                  <div className="w-full bg-[#F7F5F1] border border-[#E5D9CB] rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
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

                  <div className="bg-[#F7F5F1] border border-[#E5D9CB] rounded-xl px-4 py-2.5 flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1.5">
                      <Coins className="h-4 w-4 text-[#B5813D]" strokeWidth={2.2} />
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
                                  ? "bg-[#5B4335] text-white active:bg-[#6B5142]"
                                  : "bg-[#EFE4D8] text-[#9A897F] cursor-not-allowed"
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
              <div className="w-10 h-1 bg-[#EFE4D8] rounded-full mx-auto mb-5" />

              {sheetDetail ? (
                <>
                  <button onClick={() => setSheetDetail(null)} className="flex items-center gap-1 text-[12px] text-[#9A897F] mb-5">
                    <ChevronLeft className="w-4 h-4" /> 전체 칭호
                  </button>
                  <div className="flex flex-col items-center text-center mb-6">
                    <div className={`w-24 h-24 rounded-3xl flex items-center justify-center text-[44px] mb-3 ${sheetDetail.unlocked ? "bg-[#F5F0E7] border border-[#E5D9CB]" : "bg-[#F5F0E7]"}`}>
                      {sheetDetail.unlocked ? sheetDetail.emoji : <Lock className="w-10 h-10 text-[#9A897F]" />}
                    </div>
                    {sheetDetail.rare && sheetDetail.unlocked && (
                      <span className="text-[11px] text-[#6B5142] font-semibold bg-[#F5F0E7] border border-[#E5D9CB] px-3 py-1 rounded-full mb-2">
                        ✨ 10% 이하의 사용자가 획득했어요!
                      </span>
                    )}
                    <p className="text-[19px] font-bold text-[#46352C] mb-1">{sheetDetail.name}</p>
                    <p className="text-[13px] text-[#8A776B] mb-4">{sheetDetail.description}</p>
                    <div className="w-full bg-[#F7F5F1] border border-[#E5D9CB] rounded-2xl px-4 py-3 text-left">
                      <p className="text-[10px] text-[#9A897F] mb-1 uppercase tracking-wider">획득 조건</p>
                      <p className="text-[13px] text-[#5A453B] font-medium">{sheetDetail.condition}</p>
                    </div>
                  </div>
                  {sheetDetail.unlocked ? (
                    currentTitle.id === sheetDetail.id ? (
                      <div className="w-full py-3.5 rounded-2xl bg-[#F5F0E7] border border-[#E5D9CB] text-[#8A776B] text-[14px] font-semibold text-center flex items-center justify-center gap-2">
                        <Check className="w-4 h-4" />현재 적용 중
                      </div>
                    ) : (
                      <button onClick={() => handleApplyTitle(sheetDetail.id)} className="w-full py-3.5 rounded-2xl bg-[#5B4335] text-white text-[15px] font-semibold active:bg-[#46352C] transition-colors">
                        이 칭호 사용하기
                      </button>
                    )
                  ) : (
                    <button disabled className="w-full py-3.5 rounded-2xl bg-[#F5F0E7] text-[#9A897F] text-[15px] font-semibold cursor-not-allowed">
                      아직 잠겨있어요 🔒
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[16px] font-bold text-[#46352C]">나의 칭호</p>
                    <span className="text-[12px] text-[#9A897F] bg-[#F5F0E7] px-2.5 py-1 rounded-full">{unlockedCount} / {titles.length} 획득</span>
                  </div>
                  <p className="text-[12px] text-[#9A897F] mb-4">스탬프를 모아 새로운 칭호를 해금하세요</p>

                  <div className="grid grid-cols-3 gap-2.5 mb-4">
                    {titles.map((title) => {
                      const isActive = currentTitle.id === title.id;
                      const acquiredDate = title.unlockAt === 0 ? "가입 시 획득" : undefined;
                      return (
                        <button
                          key={title.id}
                          onClick={() => setSheetDetail(title)}
                          className={`flex flex-col items-center py-3.5 px-2 rounded-2xl border-2 transition-all relative ${
                            isActive ? "border-[#8A6A52] bg-[#F5F0E7]"
                            : title.unlocked ? "border-[#E5D9CB] bg-white active:bg-[#F7F5F1]"
                            : "border-[#E5D9CB] bg-[#F7F5F1] opacity-50"
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
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-[24px] mb-2 ${title.unlocked ? "bg-[#F5F0E7]" : "bg-[#F5F0E7]"}`}>
                            {title.unlocked ? title.emoji : <Lock className="w-5 h-5 text-[#9A897F]" />}
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

      {selectedCoupon && (
        <CheckinSheet
          title={`${selectedCoupon.title} 사용하기`}
          description="사장님 화면의 QR을 찍거나 숫자 4자리를 입력하세요. 확인되면 쿠폰이 바로 사용 처리돼요."
          submitLabel="쿠폰 사용하기"
          onClose={() => setSelectedCoupon(null)}
          onVerify={verifyCouponStore}
          onDone={(message) => {
            setNotice(message);
            setCoupons(loadCoupons());
          }}
        />
      )}

      {photoEventId && (
        <div className="fixed inset-0 z-[160] bg-black/40 flex items-end justify-center" onClick={() => setPhotoEventId(null)}>
          <div className="w-full max-w-md bg-white rounded-t-3xl p-5" onClick={(event) => event.stopPropagation()}>
            <div className="w-10 h-1 bg-[#EFE4D8] rounded-full mx-auto mb-4" />
            <h3 className="text-[16px] font-bold text-[#46352C]">{EVENT_DEFS.find((item) => item.id === photoEventId)?.name}</h3>
            <p className="text-[12px] text-[#8A776B] mt-1">
              {EVENT_DEFS.find((item) => item.id === photoEventId)?.group === "sns"
                ? "SNS에 올린 게시 화면을 캡처해서 보내 주세요. 확인 후 포인트가 들어와요."
                : "사진이 맞으면 관리자 확인 후 포인트가 들어와요."}
            </p>
            <input value={photoNote} onChange={(event) => setPhotoNote(event.target.value)} placeholder="한 줄 설명 (선택)" className="mt-4 w-full h-11 rounded-xl bg-[#F7F5F1] px-3 text-[13px] outline-none" />
            <label className="mt-3 h-11 rounded-xl bg-[#5B4335] text-white text-[13px] font-medium flex items-center justify-center">
              사진 보내기
              <input
                type="file"
                accept="image/*"
                {...(EVENT_DEFS.find((item) => item.id === photoEventId)?.group === "sns" ? {} : { capture: "environment" as const })}
                className="hidden"
                onChange={(event) => void uploadPhotoEvent(event.target.files?.[0])}
              />
            </label>
          </div>
        </div>
      )}
      {rejectInfoId && (() => {
        const event = EVENT_DEFS.find((item) => item.id === rejectInfoId);
        const photo = latestPhoto(mySubmissions, rejectInfoId);
        return (
          <div className="fixed inset-0 z-[160] bg-black/40 flex items-end justify-center" onClick={() => setRejectInfoId(null)}>
            <div className="w-full max-w-md bg-white rounded-t-3xl p-5" onClick={(e) => e.stopPropagation()}>
              <div className="w-10 h-1 bg-[#EFE4D8] rounded-full mx-auto mb-4" />
              <h3 className="text-[16px] font-bold text-[#46352C]">{event?.name}</h3>
              <div className="mt-3 rounded-xl bg-rose-50 px-4 py-3">
                <p className="text-[11px] font-semibold text-rose-500">거절 사유</p>
                <p className="mt-1 text-[13px] leading-relaxed text-[#46352C]">{photo?.rejectReason?.trim() || "사유가 입력되지 않았어요."}</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setRejectInfoId(null)} className="h-11 rounded-xl bg-[#F5F0E7] text-[13px] font-medium text-[#6B5142]">닫기</button>
                <button
                  type="button"
                  onClick={() => { setRejectInfoId(null); setPhotoEventId(rejectInfoId); }}
                  className="h-11 rounded-xl bg-[#5B4335] text-[13px] font-medium text-white"
                >
                  다시 보내기
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {showCheckin && (
        <CheckinSheet
          onClose={() => setShowCheckin(false)}
          onDone={(message) => {
            setNotice(message);
            setMileage(readMileage());
            setProgressTick((value) => value + 1);
          }}
        />
      )}
      <BottomNav />
    </div>
  );
}
