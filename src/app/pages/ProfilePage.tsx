// src/app/pages/ProfilePage.tsx
import {
  ChevronLeft, Settings, Ticket, Gift, Camera,
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
  { id: 1, emoji: "🎫", name: "500원 할인권", desc: "전 시장 공통", cost: 500,  color: "from-rose-50 to-pink-50",    border: "border-rose-100",   badge: "bg-rose-100 text-rose-600" },
  { id: 2, emoji: "🎟", name: "1,000원 할인권", desc: "전 시장 공통", cost: 900,  color: "from-amber-50 to-yellow-50", border: "border-amber-100",  badge: "bg-amber-100 text-amber-600" },
  { id: 3, emoji: "🏷", name: "2,000원 할인권", desc: "전 시장 공통", cost: 1700, color: "from-emerald-50 to-teal-50",  border: "border-emerald-100", badge: "bg-emerald-100 text-emerald-600" },
  { id: 4, emoji: "💝", name: "5,000원 할인권", desc: "전 시장 공통", cost: 4000, color: "from-sky-50 to-blue-50",      border: "border-sky-100",    badge: "bg-sky-100 text-sky-600" },
  { id: 5, emoji: "👑", name: "10,000원 할인권", desc: "전 시장 공통", cost: 7500, color: "from-violet-50 to-purple-50", border: "border-violet-100", badge: "bg-violet-100 text-violet-600", rare: true },
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
  const [showCheckin, setShowCheckin] = useState(false);
  const [notice, setNotice] = useState("");
  const [submissions, setSubmissions] = useState<RewardSubmission[]>([]);
  const [photoNote, setPhotoNote] = useState("");
  const [photoEventId, setPhotoEventId] = useState<string | null>(null);
  const [rejectInfoId, setRejectInfoId] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<EarnedCoupon[]>(() => loadCoupons());

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
      color: "bg-gray-800",
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
    <div className="min-h-screen bg-white pb-20">

      {/* ── 헤더 ── */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/home" className="p-1"><ChevronLeft className="w-5 h-5 text-gray-500" /></Link>
          <h1 className="text-[15px] text-gray-800 font-semibold">마이페이지</h1>
          <Link to="/settings" className="p-1"><Settings className="w-5 h-5 text-gray-500" /></Link>
        </div>
      </div>

      {/* ── 프로필 히어로 카드 ── */}
      <div className="bg-[#FAF4EC] px-5 pt-6 pb-5 relative overflow-hidden border-b border-[#EDE5D8]">
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: "radial-gradient(circle, #8B5E3C 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        <div className="absolute top-3 right-4 text-[40px] opacity-10 select-none">🌾</div>

        <div className="relative flex items-center gap-4 mb-5">
          <button
            onClick={() => { setSheetDetail(null); setShowTitleSheet(true); }}
            className="relative flex-shrink-0"
          >
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-[32px] border border-gray-200 shadow-sm active:scale-95 transition-transform">
              {currentTitle.emoji}
            </div>
            {currentTitle.rare && (
              <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-orange-400 text-white px-1.5 py-0.5 rounded-full font-bold leading-tight shadow-sm">
                희귀
              </span>
            )}
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] bg-black/10 text-gray-500 px-2 py-0.5 rounded-full whitespace-nowrap">
              탭해서 변경
            </span>
          </button>

          <div className="flex-1">
            <p className="text-gray-400 text-[11px] mb-0.5">탐험가</p>
            <h2 className="text-gray-800 text-[20px] font-bold leading-tight">{user.name}</h2>
            <button
              onClick={() => { setSheetDetail(null); setShowTitleSheet(true); }}
              className="mt-1 inline-flex items-center gap-1 bg-white/70 border border-gray-200 rounded-full px-2.5 py-1 active:bg-gray-50 transition-colors"
            >
              <span className="text-gray-600 text-[11px] font-semibold">{currentTitle.name}</span>
            </button>
          </div>

          <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
            <button
              onClick={() => { setExchangeResult(null); setShowGiftShop(true); }}
              className="flex items-center gap-1 bg-[#C9813A] rounded-xl px-2.5 py-1.5 active:bg-[#B57030] transition-colors shadow-sm"
            >
              <Gift className="w-3.5 h-3.5 text-white" />
              <span className="text-white text-[11px] font-semibold">교환소</span>
            </button>
          </div>
        </div>

        {/* 스탯 바 */}
        <div className="relative grid grid-cols-3 gap-2">
          {[
            { label: "방문 가게", value: visited, unit: "곳", emoji: "🏪", bg: "bg-white/60", border: "border-gray-200" },
            { label: "스탬프", value: `${collectedCount}/${totalStamps}`, unit: "", emoji: "⭐", bg: "bg-white/60", border: "border-gray-200" },
            { label: "포인트", value: mileage.toLocaleString(), unit: "P", emoji: "🪙", bg: "bg-white/60", border: "border-gray-200" },
          ].map(stat => {
            const body = (
              <>
                <span className="text-[16px]">{stat.emoji}</span>
                <p className="text-gray-800 text-[16px] font-bold mt-0.5 leading-none">
                  {stat.value}<span className="text-[10px] text-gray-400 ml-0.5">{stat.unit}</span>
                </p>
                <p className="text-gray-400 text-[10px] mt-0.5">{stat.label}</p>
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
      <div className="flex bg-white border-b border-gray-100 sticky top-[53px] z-10">
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
                ? "text-gray-800 border-[#C9813A] font-semibold"
                : "text-gray-400 border-transparent"
            }`}
          >
            {label}
            {key === "price" && pendingPriceCount > 0 && (
              <span className="absolute right-1 top-1.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-400 text-[10px] font-bold text-gray-900 leading-4">
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
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[13px] font-semibold text-gray-800">진행 중인 퀘스트</h3>
            <span className="text-[11px] text-gray-400">카드를 누르면 인증</span>
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
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-[20px]">{stamp.icon}</div>
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">{done ? "완료" : `${stamp.points}P`}</span>
                  </div>
                  <p className="text-[13px] font-semibold text-gray-800 leading-tight">{stamp.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-snug min-h-[28px]">{stamp.description}</p>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div className={`h-1.5 ${done ? "bg-emerald-400" : PROGRESS_COLORS[index % PROGRESS_COLORS.length]} rounded-full`} style={{ width: `${done ? 100 : pct}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">{done ? "완료" : `${current}/${stamp.target}${stamp.unit}`}</p>
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
                <button key={stamp.id} type="button" onClick={() => setShowCheckin(true)} className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm text-left active:bg-gray-50">
                  {card}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => { setSheetDetail(null); setShowTitleSheet(true); }}
            className="w-full bg-gradient-to-r from-[#C9813A] to-[#E8A855] rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-sm"
          >
            <div className="w-10 h-10 bg-white/25 rounded-xl flex items-center justify-center text-[20px]">{currentTitle.emoji}</div>
            <div className="flex-1 text-left">
              <p className="text-white/70 text-[11px]">현재 칭호</p>
              <p className="text-white text-[14px] font-bold">{currentTitle.name}</p>
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
            <h3 className="text-[13px] font-semibold text-gray-800">{section.title}</h3>
            <span className="text-[11px] text-gray-400">{section.hint}</span>
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
                  className={`bg-white rounded-2xl p-3.5 border shadow-sm text-left ${done ? "border-emerald-100" : "border-gray-100 active:bg-gray-50"} disabled:active:bg-white`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-[20px]">{event.icon}</div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${done ? "bg-emerald-50 text-emerald-600" : pending ? "bg-amber-50 text-amber-600" : rejected ? "bg-rose-50 text-rose-500" : "bg-gray-100 text-gray-500"}`}>{label}</span>
                      {event.kind === "photo" && (
                        <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                          <Camera className="w-3.5 h-3.5 text-gray-700" />
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[13px] font-semibold text-gray-800 leading-tight">{event.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-snug min-h-[28px] line-clamp-2">{detail}</p>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
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
                  priceFilter === entry.status ? entry.ring : "border-gray-100 bg-white"
                }`}
              >
                <p className={`text-[16px] font-bold leading-none ${entry.tone}`}>
                  {priceReports.filter((item) => item.status === entry.status).length}
                </p>
                <p className={`mt-1 text-[10px] ${priceFilter === entry.status ? "font-semibold text-gray-700" : "text-gray-400"}`}>{entry.label}</p>
              </button>
            ))}
          </div>
          <p className="px-1 text-[11px] leading-relaxed text-gray-400">
            가게 상세에서 가격이 다르면 사진과 함께 제보해 주세요. 승인되면 {PRICE_REPORT_POINTS}P가 적립되고 가게 가격이 바뀝니다.
          </p>
          {filteredPriceReports.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-10 text-center">
              <p className="text-[13px] text-gray-500">
                {priceReports.length === 0
                  ? "아직 보낸 가격 제보가 없어요."
                  : priceFilter === "pending"
                    ? "확인 중인 제보가 없어요."
                    : priceFilter === "approved"
                      ? "승인 완료된 제보가 없어요."
                      : "거절된 제보가 없어요."}
              </p>
              {priceReports.length === 0 && (
                <Link to="/map" className="mt-3 inline-block rounded-full bg-amber-400 px-4 py-2 text-[12px] font-semibold text-gray-900">
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
                    : { chip: "bg-amber-50 text-amber-600", text: "확인 중", border: "border-gray-100" };
                return (
                  <div key={item.id} className={`rounded-2xl border ${tone.border} bg-white p-3.5 shadow-sm`}>
                    <div className="flex items-start gap-3">
                      {item.image ? (
                        <img src={item.image} alt="" className="h-12 w-12 flex-shrink-0 rounded-xl object-cover bg-gray-100" />
                      ) : (
                        <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-gray-100" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-[13px] font-semibold text-gray-800">{item.storeName}</p>
                          <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${tone.chip}`}>{tone.text}</span>
                        </div>
                        <p className="mt-0.5 text-[12px] text-gray-600">
                          {item.itemName} · {price ? `${price.toLocaleString()}원` : "-"}
                        </p>
                        <p className="mt-0.5 text-[10px] text-gray-400">
                          {formatDateTime(item.createdAt)}
                          {item.status === "approved" && ` · +${PRICE_REPORT_POINTS}P 적립`}
                        </p>
                      </div>
                    </div>
                    {item.status === "rejected" && (
                      <div className="mt-2.5 rounded-xl bg-rose-50 px-3 py-2">
                        <p className="text-[10px] font-semibold text-rose-500">거절 사유</p>
                        <p className="mt-0.5 text-[12px] leading-relaxed text-gray-700">{item.rejectReason || "사유가 입력되지 않았어요."}</p>
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
                    className="h-9 rounded-full bg-white border border-gray-200 px-4 text-[12px] font-medium text-gray-600 disabled:opacity-40"
                  >
                    ‹ 이전
                  </button>
                  <span className="text-[12px] text-gray-500">{currentPricePage + 1} / {priceTotalPages}</span>
                  <button
                    type="button"
                    disabled={currentPricePage >= priceTotalPages - 1}
                    onClick={() => setPricePage(currentPricePage + 1)}
                    className="h-9 rounded-full bg-white border border-gray-200 px-4 text-[12px] font-medium text-gray-600 disabled:opacity-40"
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
          <div className="bg-[#FAF4EC] border border-[#EDE5D8] rounded-2xl px-4 py-4 relative overflow-hidden shadow-sm">
            <div className="absolute inset-0 opacity-[0.05]"
              style={{ backgroundImage: "radial-gradient(circle, #8B5E3C 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[14px]">🪙</span>
                  <span className="text-[12px] text-gray-400">보유 마일리지</span>
                </div>
                <p className="text-[32px] font-bold text-gray-800 leading-none">
                  {mileage.toLocaleString()}<span className="text-[16px] text-gray-400 ml-1">P</span>
                </p>
              </div>
              <button
                onClick={() => { setExchangeResult(null); setShowGiftShop(true); }}
                className="flex flex-col items-center gap-1 bg-[#C9813A] rounded-2xl px-4 py-3 active:bg-[#B57030] transition-colors shadow-sm"
              >
                <Gift className="w-5 h-5 text-white" />
                <span className="text-white text-[11px] font-bold">교환소</span>
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <h3 className="text-[13px] font-semibold text-gray-800">보유 쿠폰</h3>
              <span className="text-[11px] text-gray-400">{coupons.filter((coupon) => !coupon.usedAt).length}장</span>
            </div>
            <div className="space-y-2">
              {notice && <p className="text-[12px] text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">{notice}</p>}
              {coupons.filter((coupon) => !coupon.usedAt).length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center">
                  <p className="text-[13px] text-gray-500">아직 쿠폰이 없어요.</p>
                  <p className="text-[12px] text-gray-400 mt-1">스탬프와 이벤트로 모은 포인트를 교환소에서 쿠폰으로 바꿀 수 있어요.</p>
                </div>
              )}
              {coupons.filter((coupon) => !coupon.usedAt).map((coupon) => (
                <div key={coupon.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                  <div className={`${coupon.color} px-4 py-3 flex items-center justify-between`}>
                    <div>
                      <span className="text-white/60 text-[11px]">{coupon.market}</span>
                      <p className="text-white text-[22px] font-bold leading-tight">{coupon.discount}</p>
                    </div>
                    <Ticket className="w-7 h-7 text-white/25" />
                  </div>
                  <div className="flex items-center px-4">
                    <div className="w-3 h-3 rounded-full bg-gray-50 -ml-5 flex-shrink-0" />
                    <div className="flex-1 border-t border-dashed border-gray-200 mx-1" />
                    <div className="w-3 h-3 rounded-full bg-gray-50 -mr-5 flex-shrink-0" />
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-[13px] font-medium text-gray-800 mb-0.5">{coupon.title}</p>
                    <p className="text-[11px] text-gray-400 mb-2">{coupon.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-400">~ {coupon.expiry}</span>
                      <button
                        onClick={() => handleUseCoupon(coupon)}
                        className="text-[12px] font-medium text-gray-800 bg-gray-100 px-3 py-1.5 rounded-xl active:bg-gray-200 transition-colors"
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
                <h3 className="text-[13px] font-semibold text-gray-800">사용한 쿠폰</h3>
                <span className="text-[11px] text-gray-400">{coupons.filter((coupon) => coupon.usedAt).length}장</span>
              </div>
              <div className="space-y-2">
                {coupons.filter((coupon) => coupon.usedAt).map((coupon) => (
                  <div key={coupon.id} className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-gray-500">{coupon.title}</p>
                      <p className="text-[11px] text-gray-400">{coupon.usedStoreName} · {formatDateTime(coupon.usedAt ?? "")}</p>
                    </div>
                    <span className="flex-shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] text-gray-500">사용 완료</span>
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
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-3">
                <p className="text-[16px] font-bold text-gray-800">포인트 적립 내역</p>
                <button onClick={() => setShowPoints(false)} className="p-1 text-gray-400" aria-label="닫기">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="bg-[#FAF4EC] border border-[#EDE5D8] rounded-2xl px-4 py-3 flex items-center justify-between">
                <span className="text-[12px] text-gray-500">보유 포인트</span>
                <span className="text-[20px] font-bold text-gray-800">{mileage.toLocaleString()}<span className="text-[12px] text-gray-400 ml-0.5">P</span></span>
              </div>
              {pendingPoints > 0 && (
                <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                  승인 대기 중인 제보·사진이 있어요. 승인되면 최대 +{pendingPoints.toLocaleString()}P가 적립돼요.
                </p>
              )}
              <div className="mt-3 max-h-[46vh] overflow-y-auto">
                {pointEntries.length === 0 ? (
                  <p className="py-10 text-center text-[13px] text-gray-400">아직 적립 내역이 없어요.</p>
                ) : (
                  pointEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between gap-3 border-b border-gray-100 py-3 last:border-b-0">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] text-gray-800">{entry.label}</p>
                        {entry.at && <p className="mt-0.5 text-[10px] text-gray-400">{formatDateTime(entry.at)}</p>}
                      </div>
                      <span className={`flex-shrink-0 text-[14px] font-bold ${entry.points >= 0 ? "text-emerald-600" : "text-gray-500"}`}>
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
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

              {exchangeResult ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center text-[40px] mb-4 shadow-sm">
                    {exchangeResult.emoji}
                  </div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <p className="text-[17px] font-bold text-gray-800">교환 완료!</p>
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-[14px] text-gray-600 mb-1">{exchangeResult.name}</p>
                  <p className="text-[12px] text-gray-400 mb-6">쿠폰함에 추가되었어요 🎉</p>
                  <div className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
                    <span className="text-[12px] text-gray-400">남은 마일리지</span>
                    <span className="text-[16px] font-bold text-gray-800">{mileage.toLocaleString()} P</span>
                  </div>
                  <button
                    onClick={() => setExchangeResult(null)}
                    className="w-full py-3 bg-[#C9813A] text-white rounded-2xl text-[14px] font-semibold active:bg-[#B57030] transition-colors"
                  >
                    계속 교환하기
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Gift className="w-5 h-5 text-[#C9813A]" />
                      <p className="text-[16px] font-bold text-gray-800">선물 교환소</p>
                    </div>
                    <button onClick={() => setShowGiftShop(false)} className="p-1 text-gray-400">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-[12px] text-gray-400 mb-1">마일리지로 할인권을 교환해요</p>

                  <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[16px]">🪙</span>
                      <span className="text-[12px] text-gray-500">보유 마일리지</span>
                    </div>
                    <span className="text-[16px] font-bold text-gray-800">{mileage.toLocaleString()} P</span>
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
                              <p className="text-[14px] font-bold text-gray-800">{item.name}</p>
                              {item.rare && (
                                <span className="text-[9px] bg-orange-400 text-white px-1.5 py-0.5 rounded-full font-bold">인기</span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500">{item.desc}</p>
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
                                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
                              }`}
                            >
                              {canAfford ? "교환" : "부족"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-gray-400 text-center mt-4">
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
                  <button onClick={() => setSheetDetail(null)} className="flex items-center gap-1 text-[12px] text-gray-400 mb-5">
                    <ChevronLeft className="w-4 h-4" /> 전체 칭호
                  </button>
                  <div className="flex flex-col items-center text-center mb-6">
                    <div className={`w-24 h-24 rounded-3xl flex items-center justify-center text-[44px] mb-3 ${sheetDetail.unlocked ? "bg-gray-100 border border-gray-200" : "bg-gray-100"}`}>
                      {sheetDetail.unlocked ? sheetDetail.emoji : <Lock className="w-10 h-10 text-gray-300" />}
                    </div>
                    {sheetDetail.rare && sheetDetail.unlocked && (
                      <span className="text-[11px] text-orange-500 font-semibold bg-orange-50 border border-orange-100 px-3 py-1 rounded-full mb-2">
                        ✨ 10% 이하의 사용자가 획득했어요!
                      </span>
                    )}
                    <p className="text-[19px] font-bold text-gray-800 mb-1">{sheetDetail.name}</p>
                    <p className="text-[13px] text-gray-500 mb-4">{sheetDetail.description}</p>
                    <div className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-left">
                      <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wider">획득 조건</p>
                      <p className="text-[13px] text-gray-700 font-medium">{sheetDetail.condition}</p>
                    </div>
                  </div>
                  {sheetDetail.unlocked ? (
                    currentTitle.id === sheetDetail.id ? (
                      <div className="w-full py-3.5 rounded-2xl bg-gray-100 border border-gray-200 text-gray-500 text-[14px] font-semibold text-center flex items-center justify-center gap-2">
                        <Check className="w-4 h-4" />현재 적용 중
                      </div>
                    ) : (
                      <button onClick={() => handleApplyTitle(sheetDetail.id)} className="w-full py-3.5 rounded-2xl bg-[#C9813A] text-white text-[15px] font-semibold active:bg-[#B57030] transition-colors">
                        이 칭호 사용하기
                      </button>
                    )
                  ) : (
                    <button disabled className="w-full py-3.5 rounded-2xl bg-gray-100 text-gray-400 text-[15px] font-semibold cursor-not-allowed">
                      아직 잠겨있어요 🔒
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[16px] font-bold text-gray-800">나의 칭호</p>
                    <span className="text-[12px] text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{unlockedCount} / {titles.length} 획득</span>
                  </div>
                  <p className="text-[12px] text-gray-400 mb-4">스탬프를 모아 새로운 칭호를 해금하세요</p>

                  <div className="grid grid-cols-3 gap-2.5 mb-4">
                    {titles.map((title) => {
                      const isActive = currentTitle.id === title.id;
                      const acquiredDate = title.unlockAt === 0 ? "가입 시 획득" : undefined;
                      return (
                        <button
                          key={title.id}
                          onClick={() => setSheetDetail(title)}
                          className={`flex flex-col items-center py-3.5 px-2 rounded-2xl border-2 transition-all relative ${
                            isActive ? "border-[#C9813A] bg-orange-50"
                            : title.unlocked ? "border-gray-100 bg-white active:bg-gray-50"
                            : "border-gray-100 bg-gray-50 opacity-50"
                          }`}
                        >
                          {isActive && (
                            <span className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-[#C9813A] rounded-full flex items-center justify-center shadow-sm">
                              <Check className="w-3 h-3 text-white" />
                            </span>
                          )}
                          {title.rare && title.unlocked && (
                            <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-orange-400 text-white px-1.5 py-0.5 rounded-full font-bold">희귀</span>
                          )}
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-[24px] mb-2 ${title.unlocked ? "bg-gray-100" : "bg-gray-100"}`}>
                            {title.unlocked ? title.emoji : <Lock className="w-5 h-5 text-gray-300" />}
                          </div>
                          <p className={`text-[10px] font-semibold text-center leading-tight mb-0.5 ${isActive ? "text-[#C9813A]" : title.unlocked ? "text-gray-700" : "text-gray-400"}`}>
                            {title.name}
                          </p>
                          <p className="text-[9px] text-gray-400 text-center leading-tight">
                            {title.unlocked ? acquiredDate ?? "획득 완료" : `스탬프 ${title.unlockAt}개`}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  <button onClick={() => setShowTitleSheet(false)} className="w-full py-3 text-[14px] text-gray-400 active:text-gray-600">
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
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="text-[16px] font-bold text-gray-800">{EVENT_DEFS.find((item) => item.id === photoEventId)?.name}</h3>
            <p className="text-[12px] text-gray-400 mt-1">
              {EVENT_DEFS.find((item) => item.id === photoEventId)?.group === "sns"
                ? "SNS에 올린 게시 화면을 캡처해서 보내 주세요. 확인 후 포인트가 들어와요."
                : "사진이 맞으면 관리자 확인 후 포인트가 들어와요."}
            </p>
            <input value={photoNote} onChange={(event) => setPhotoNote(event.target.value)} placeholder="한 줄 설명 (선택)" className="mt-4 w-full h-11 rounded-xl bg-gray-50 px-3 text-[13px] outline-none" />
            <label className="mt-3 h-11 rounded-xl bg-gray-900 text-white text-[13px] font-medium flex items-center justify-center">
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
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              <h3 className="text-[16px] font-bold text-gray-800">{event?.name}</h3>
              <div className="mt-3 rounded-xl bg-rose-50 px-4 py-3">
                <p className="text-[11px] font-semibold text-rose-500">거절 사유</p>
                <p className="mt-1 text-[13px] leading-relaxed text-gray-700">{photo?.rejectReason?.trim() || "사유가 입력되지 않았어요."}</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setRejectInfoId(null)} className="h-11 rounded-xl bg-gray-100 text-[13px] font-medium text-gray-600">닫기</button>
                <button
                  type="button"
                  onClick={() => { setRejectInfoId(null); setPhotoEventId(rejectInfoId); }}
                  className="h-11 rounded-xl bg-gray-900 text-[13px] font-medium text-white"
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
