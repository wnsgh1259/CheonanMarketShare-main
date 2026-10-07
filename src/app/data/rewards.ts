import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadOwnerCatalog, saveOwnerCatalog } from "./ownerStoreData";

const PROGRESS_KEY = "user_reward_progress_v1";
const SUBMISSIONS_KEY = "reward_submissions_v1";
const COUPONS_KEY = "user_earned_coupons_v1";
const MILEAGE_KEY = "user_mileage";
const LEDGER_KEY = "user_point_ledger_v1";
const META_KEY = "user_point_meta_v1";
const LEGACY_OWNER_KEY = "user_mileage_legacy_owner";
const LEDGER_LIMIT = 500;
const TABLE = "owner_dashboard_state";
const USER_REMOTE_PREFIX = "user_rewards_";
/** 이 시각 이전에 보낸 가격 제보는 제출 즉시 50P가 이미 지급됐으므로 승인 때 다시 주지 않는다. */
const PRICE_PAYOUT_ON_APPROVAL_FROM = Date.parse("2026-10-07T05:56:00Z");
const REMOTE_ID = "reward_submissions";

export type StampKind = "stores" | "food" | "grocery" | "today" | "same-market" | "markets";

export type StampDef = {
  id: string;
  name: string;
  icon: string;
  description: string;
  kind: StampKind;
  target: number;
  points: number;
  unit: string;
};

export const STAMP_DEFS: StampDef[] = [
  { id: "first-store", name: "첫 가게 인증", icon: "🏪", description: "아무 가게나 1곳", kind: "stores", target: 1, points: 50, unit: "곳" },
  { id: "food-stop", name: "먹거리 한 곳", icon: "🍜", description: "분식·식당 가게 1곳", kind: "food", target: 1, points: 60, unit: "곳" },
  { id: "grocery", name: "장보기 인증", icon: "🥬", description: "채소·과일·정육·수산·반찬 1곳", kind: "grocery", target: 1, points: 60, unit: "곳" },
  { id: "today-two", name: "오늘 두 곳", icon: "☀️", description: "오늘 서로 다른 가게 2곳", kind: "today", target: 2, points: 80, unit: "곳" },
  { id: "three-stores", name: "시장 한 바퀴", icon: "🚶", description: "서로 다른 가게 3곳", kind: "stores", target: 3, points: 100, unit: "곳" },
  { id: "one-market", name: "한 시장 정복", icon: "📍", description: "같은 시장에서 가게 3곳", kind: "same-market", target: 3, points: 120, unit: "곳" },
  { id: "two-markets", name: "두 시장 탐방", icon: "🗺️", description: "서로 다른 시장 2곳", kind: "markets", target: 2, points: 120, unit: "곳" },
  { id: "five-stores", name: "단골 손님", icon: "⭐", description: "서로 다른 가게 5곳", kind: "stores", target: 5, points: 150, unit: "곳" },
];

export type EventRule = "today" | "two-days" | "weekend";

export type EventDef = {
  id: string;
  name: string;
  icon: string;
  description: string;
  kind: "checkin" | "photo";
  points: number;
  rule: EventRule;
  group?: "sns";
};

export const EVENT_DEFS: EventDef[] = [
  { id: "today-visit", name: "오늘 가게 인증", icon: "📍", description: "오늘 가게 QR 1곳", kind: "checkin", points: 40, rule: "today" },
  { id: "two-days", name: "이틀 연속", icon: "📆", description: "서로 다른 날 2번 인증", kind: "checkin", points: 80, rule: "two-days" },
  { id: "weekend", name: "주말 시장", icon: "🎉", description: "토·일요일에 가게 인증", kind: "checkin", points: 70, rule: "weekend" },
  { id: "sign-photo", name: "가게 간판", icon: "🪧", description: "간판 사진, 확인 후 지급", kind: "photo", points: 120, rule: "today" },
  { id: "food-photo", name: "먹거리 사진", icon: "🍜", description: "음식 사진, 확인 후 지급", kind: "photo", points: 150, rule: "today" },
  { id: "deal-photo", name: "할인 매대", icon: "🏷️", description: "할인 상품 사진, 확인 후 지급", kind: "photo", points: 180, rule: "today" },
  { id: "market-photo", name: "시장 한 컷", icon: "📸", description: "시장 풍경 사진, 확인 후 지급", kind: "photo", points: 200, rule: "today" },
  { id: "sns-feed", name: "인스타 피드 올리기", icon: "📷", description: "#천안시장 해시태그 게시글 화면", kind: "photo", points: 300, rule: "today", group: "sns" },
  { id: "sns-reels", name: "릴스·쇼츠 올리기", icon: "🎬", description: "시장 영상 게시 화면", kind: "photo", points: 400, rule: "today", group: "sns" },
  { id: "sns-blog", name: "블로그 후기 쓰기", icon: "📝", description: "시장 방문 후기 글 화면", kind: "photo", points: 350, rule: "today", group: "sns" },
  { id: "sns-story", name: "스토리로 공유하기", icon: "💬", description: "스토리·카톡 공유 화면", kind: "photo", points: 100, rule: "today", group: "sns" },
];

export const PHOTO_EVENT = EVENT_DEFS.find((item) => item.id === "market-photo")!;
export const PRICE_REPORT_POINTS = 50;
export const TODAY_CHECKIN_POINTS = 40;

export type Checkin = {
  storeId: number;
  storeName: string;
  at: string;
  marketId?: string;
  category?: string;
};

export type RewardProgress = {
  checkins: Checkin[];
  claimedStamps: string[];
  claimedEvents?: string[];
  todayEventDate?: string;
};

export type SubmissionStatus = "pending" | "approved" | "rejected";
export type SubmissionKind = "photo-event" | "price";

export type RewardSubmission = {
  id: string;
  kind: SubmissionKind;
  phone: string;
  userName: string;
  storeName: string;
  itemName?: string;
  priceText?: string;
  note?: string;
  eventId?: string;
  image: string;
  status: SubmissionStatus;
  rejectReason?: string;
  createdAt: string;
};

export type EarnedCoupon = {
  id: string;
  title: string;
  description: string;
  discount: string;
  market: string;
  expiry: string;
  color: string;
  usedAt?: string;
  usedStoreId?: number;
  usedStoreName?: string;
};

/** 쿠폰이 깎아 주는 금액(원). 가게가 정산으로 돌려받는 포인트와 같다. */
export function couponValue(coupon: Pick<EarnedCoupon, "discount">) {
  return Number(coupon.discount.replace(/[^\d]/g, "")) || 0;
}

type StoreLike = {
  id: number;
  name: string;
  checkinCode?: string;
  marketId?: string;
  category?: string;
  menus?: Array<{ id: number; name: string; price: string }>;
};

function isFoodCategory(category?: string) {
  return (category ?? "").includes("먹거리");
}

export function stampProgress(progress: RewardProgress, stamp: StampDef) {
  const items = progress.checkins;
  if (stamp.kind === "stores") return new Set(items.map((item) => item.storeId)).size;
  if (stamp.kind === "food") return new Set(items.filter((item) => isFoodCategory(item.category)).map((item) => item.storeId)).size;
  if (stamp.kind === "grocery") {
    return new Set(items.filter((item) => item.category && !isFoodCategory(item.category)).map((item) => item.storeId)).size;
  }
  if (stamp.kind === "markets") return new Set(items.map((item) => item.marketId).filter(Boolean)).size;
  if (stamp.kind === "today") {
    const today = todayKey();
    return new Set(items.filter((item) => todayKey(new Date(item.at)) === today).map((item) => item.storeId)).size;
  }
  const byMarket = new Map<string, Set<number>>();
  for (const item of items) {
    if (!item.marketId) continue;
    const bucket = byMarket.get(item.marketId) ?? new Set<number>();
    bucket.add(item.storeId);
    byMarket.set(item.marketId, bucket);
  }
  const counts = Array.from(byMarket.values()).map((bucket) => bucket.size);
  return counts.length ? Math.max(...counts) : 0;
}

let cachedClient: SupabaseClient | null = null;

export function supabase() {
  if (cachedClient) return cachedClient;
  const env = (import.meta as any).env ?? {};
  const url = env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anonKey) return null;
  cachedClient = createClient(url, anonKey);
  return cachedClient;
}

export function rewardUserId() {
  const phone = (localStorage.getItem("user_phone") || "").trim();
  if (phone.startsWith("guest-")) return phone;
  const digits = phone.replace(/\D/g, "");
  if (digits) return digits;
  let guest = localStorage.getItem("guest_reward_id");
  if (!guest) {
    guest = `guest-${Date.now()}`;
    localStorage.setItem("guest_reward_id", guest);
  }
  return guest;
}

export type PointEntry = {
  id: string;
  at: string;
  label: string;
  points: number;
};

/** base: 내역 기능이 생기기 전에 쌓인 포인트. paid: 승인 보상을 이미 지급한 제출 id. */
type PointMeta = { base: number; paid: string[] };

/** 아이돌 시장 미션 진행. stage: 통과한 단계 수(0~3). */
export type IdolProgress = { stage: number; claimed: boolean };

type UserRewardState = {
  progress: RewardProgress;
  meta: PointMeta;
  ledger: PointEntry[];
  coupons: EarnedCoupon[];
  idol: IdolProgress;
};

const IDOL_KEY = "user_idol_progress_v1";

export function loadIdolProgress(userId = rewardUserId()): IdolProgress {
  const saved = readMap<IdolProgress>(IDOL_KEY)[userId];
  return { stage: saved?.stage ?? 0, claimed: Boolean(saved?.claimed) };
}

export function saveIdolProgress(progress: IdolProgress, userId = rewardUserId()) {
  writeMapEntry(IDOL_KEY, userId, progress);
  scheduleRewardSync();
}

function readMap<T>(key: string): Record<string, T> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, T>) : {};
  } catch {
    return {};
  }
}

function writeMapEntry<T>(key: string, userId: string, value: T) {
  const all = readMap<T>(key);
  all[userId] = value;
  localStorage.setItem(key, JSON.stringify(all));
}

export function loadPointLedger(userId = rewardUserId()): PointEntry[] {
  return readMap<PointEntry[]>(LEDGER_KEY)[userId] ?? [];
}

function loadMeta(userId: string): PointMeta {
  const existing = readMap<PointMeta>(META_KEY)[userId];
  if (existing) return { base: existing.base ?? 0, paid: existing.paid ?? [] };
  const meta: PointMeta = { base: 0, paid: [] };
  if (!localStorage.getItem(LEGACY_OWNER_KEY)) {
    localStorage.setItem(LEGACY_OWNER_KEY, userId);
    const stored = Number(localStorage.getItem(MILEAGE_KEY)) || 0;
    const progress = loadProgress(userId);
    const untouchedDefault = stored === 3250 && progress.checkins.length === 0 && progress.claimedStamps.length === 0;
    const tracked = loadPointLedger(userId).reduce((sum, entry) => sum + entry.points, 0);
    meta.base = untouchedDefault ? 0 : Math.max(0, stored - tracked);
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index) ?? "";
      if (key.startsWith("photo_event_paid_") || key.startsWith("price_report_paid_")) {
        meta.paid.push(key.replace(/^(photo_event_paid_|price_report_paid_)/, ""));
      }
    }
  }
  writeMapEntry(META_KEY, userId, meta);
  return meta;
}

function saveMeta(userId: string, meta: PointMeta) {
  writeMapEntry(META_KEY, userId, meta);
}

export function readMileage(userId = rewardUserId()) {
  const tracked = loadPointLedger(userId).reduce((sum, entry) => sum + entry.points, 0);
  const balance = Math.max(0, loadMeta(userId).base + tracked);
  localStorage.setItem(MILEAGE_KEY, String(balance));
  return balance;
}

export function addMileage(amount: number, label = amount >= 0 ? "적립" : "사용", entryId?: string) {
  const userId = rewardUserId();
  loadMeta(userId);
  const ledger = loadPointLedger(userId);
  if (amount !== 0 && !(entryId && ledger.some((entry) => entry.id === entryId))) {
    const entry: PointEntry = {
      id: entryId ?? `point-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      at: new Date().toISOString(),
      label,
      points: amount,
    };
    writeMapEntry(LEDGER_KEY, userId, [entry, ...ledger].slice(0, LEDGER_LIMIT));
    scheduleRewardSync();
  }
  return readMileage(userId);
}

function emptyProgress(): RewardProgress {
  return { checkins: [], claimedStamps: [], claimedEvents: [] };
}

export function eventMeter(progress: RewardProgress, event: EventDef) {
  if (event.kind === "photo") return { current: 0, target: 1, done: false };
  const claimed = progress.claimedEvents ?? [];
  if (event.rule === "today" && event.kind === "checkin") {
    const done = progress.todayEventDate === todayKey();
    return { current: done ? 1 : 0, target: 1, done };
  }
  if (event.rule === "two-days") {
    const days = new Set(progress.checkins.map((item) => todayKey(new Date(item.at)))).size;
    return { current: Math.min(days, 2), target: 2, done: claimed.includes(event.id) };
  }
  const weekend = progress.checkins.some((item) => {
    const day = new Date(item.at).getDay();
    return day === 0 || day === 6;
  });
  return { current: weekend ? 1 : 0, target: 1, done: claimed.includes(event.id) };
}

export function loadProgress(userId = rewardUserId()): RewardProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, RewardProgress>) : {};
    return { ...emptyProgress(), ...(all[userId] ?? {}) };
  } catch {
    return emptyProgress();
  }
}

function saveProgress(progress: RewardProgress, userId = rewardUserId()) {
  writeMapEntry(PROGRESS_KEY, userId, progress);
}

export function loadCoupons(userId = rewardUserId()): EarnedCoupon[] {
  return readMap<EarnedCoupon[]>(COUPONS_KEY)[userId] ?? [];
}

export function addEarnedCoupon(coupon: EarnedCoupon) {
  const id = rewardUserId();
  const next = [coupon, ...loadCoupons(id)];
  writeMapEntry(COUPONS_KEY, id, next);
  scheduleRewardSync();
  return next;
}

/** 쿠폰을 사용 처리한다. 없거나 이미 쓴 쿠폰이면 null. */
export function markCouponUsed(couponId: string, store: { id: number; name: string }) {
  const userId = rewardUserId();
  const coupons = loadCoupons(userId);
  const target = coupons.find((item) => item.id === couponId);
  if (!target || target.usedAt) return null;
  const used: EarnedCoupon = { ...target, usedAt: new Date().toISOString(), usedStoreId: store.id, usedStoreName: store.name };
  writeMapEntry(COUPONS_KEY, userId, coupons.map((item) => (item.id === couponId ? used : item)));
  scheduleRewardSync();
  return used;
}

function readUserState(userId: string): UserRewardState {
  return {
    progress: loadProgress(userId),
    meta: loadMeta(userId),
    ledger: loadPointLedger(userId),
    coupons: loadCoupons(userId),
    idol: loadIdolProgress(userId),
  };
}

function writeUserState(userId: string, state: UserRewardState) {
  writeMapEntry(IDOL_KEY, userId, state.idol);
  saveProgress(state.progress, userId);
  saveMeta(userId, state.meta);
  writeMapEntry(LEDGER_KEY, userId, state.ledger);
  writeMapEntry(COUPONS_KEY, userId, state.coupons);
}

function union<T>(a: T[] = [], b: T[] = []) {
  return Array.from(new Set([...a, ...b]));
}

function mergeUserState(local: UserRewardState, remote: Partial<UserRewardState> | undefined): UserRewardState {
  if (!remote) return local;
  const remoteProgress: Partial<RewardProgress> = remote.progress ?? {};
  const byStore = new Map<number, Checkin>();
  for (const item of [...local.progress.checkins, ...(remoteProgress.checkins ?? [])]) {
    const current = byStore.get(item.storeId);
    if (!current || item.at < current.at) byStore.set(item.storeId, item);
  }
  const days = [local.progress.todayEventDate, remoteProgress.todayEventDate].filter(Boolean) as string[];
  const progress: RewardProgress = {
    checkins: Array.from(byStore.values()).sort((a, b) => a.at.localeCompare(b.at)),
    claimedStamps: union(local.progress.claimedStamps, remoteProgress.claimedStamps),
    claimedEvents: union(local.progress.claimedEvents, remoteProgress.claimedEvents),
    todayEventDate: days.length ? days.sort().at(-1) : undefined,
  };

  const entries = new Map<string, PointEntry>();
  for (const entry of [...(remote.ledger ?? []), ...local.ledger]) entries.set(entry.id, entry);
  const ledger = Array.from(entries.values())
    .sort((a, b) => b.at.localeCompare(a.at) || a.id.localeCompare(b.id))
    .slice(0, LEDGER_LIMIT);

  const coupons = [...local.coupons];
  for (const coupon of remote.coupons ?? []) {
    const index = coupons.findIndex((item) => item.id === coupon.id);
    if (index < 0) coupons.push(coupon);
    else if (!coupons[index].usedAt && coupon.usedAt) coupons[index] = coupon;
  }

  return {
    progress,
    ledger,
    coupons,
    idol: {
      stage: Math.max(local.idol.stage, remote.idol?.stage ?? 0),
      claimed: local.idol.claimed || Boolean(remote.idol?.claimed),
    },
    meta: {
      base: Math.max(local.meta.base, remote.meta?.base ?? 0),
      paid: union(local.meta.paid, remote.meta?.paid),
    },
  };
}

let syncChain: Promise<void> = Promise.resolve();
let syncTimer: ReturnType<typeof setTimeout> | undefined;

async function syncUserOnce(userId: string) {
  const client = supabase();
  if (!client) return;
  const id = `${USER_REMOTE_PREFIX}${userId}`;
  const { data, error } = await client.from(TABLE).select("payload").eq("id", id).maybeSingle();
  if (error) return;
  const local = readUserState(userId);
  const remote = (data?.payload ?? undefined) as Partial<UserRewardState> | undefined;
  const merged = mergeUserState(local, remote);
  writeUserState(userId, merged);
  const remoteNormalized = remote ? mergeUserState({ progress: emptyProgress(), meta: { base: 0, paid: [] }, ledger: [], coupons: [], idol: { stage: 0, claimed: false } }, remote) : undefined;
  if (remoteNormalized && JSON.stringify(remoteNormalized) === JSON.stringify(merged)) return;
  await client.from(TABLE).upsert({ id, payload: merged, updated_at: new Date().toISOString() }, { onConflict: "id" });
}

/** 이 계정(또는 비회원 임의 ID)의 스탬프·포인트·쿠폰을 서버와 합친다. 실패해도 기기 안 데이터는 그대로 쓴다. */
export function syncRewardState(userId = rewardUserId()): Promise<void> {
  syncChain = syncChain.then(() => syncUserOnce(userId)).catch(() => undefined);
  return syncChain;
}

function scheduleRewardSync() {
  const userId = rewardUserId();
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    void syncRewardState(userId);
  }, 300);
}

/** 서버 내용을 먼저 받고, 승인된 제출의 포인트를 지급한 뒤 최신 목록을 돌려준다. */
export async function refreshRewards() {
  await syncRewardState();
  const items = await refreshSubmissions();
  const gained = grantApprovedPoints(items);
  return { items, gained };
}

export function todayKey(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function uniqueCheckinCount(progress: RewardProgress) {
  return new Set(progress.checkins.map((item) => item.storeId)).size;
}

function randomCode(used: Set<string>) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    if (!used.has(code)) return code;
  }
  return String(Date.now() % 10000).padStart(4, "0");
}

export function ensureStoreCheckinCode(storeId: number) {
  const catalog = loadOwnerCatalog();
  const used = new Set((catalog.stores ?? []).map((store) => store.checkinCode).filter(Boolean) as string[]);
  const current = (catalog.stores ?? []).find((store) => store.id === storeId);
  if (current?.checkinCode) return current.checkinCode;
  const code = randomCode(used);
  const stores = (catalog.stores ?? []).map((store) => (store.id === storeId ? { ...store, checkinCode: code } : store));
  if (!stores.some((store) => store.id === storeId) && current) {
    stores.push({ ...current, checkinCode: code });
  }
  saveOwnerCatalog({ ...catalog, stores });
  return code;
}

export function findStoreByCheckinCode(code: string, stores: StoreLike[]) {
  const digits = code.replace(/\D/g, "");
  if (digits.length !== 4) return null;
  return stores.find((store) => store.checkinCode === digits) ?? null;
}

export function recordCheckin(store: { id: number; name: string; marketId?: string; category?: string }) {
  const progress = loadProgress();
  const already = progress.checkins.some((item) => item.storeId === store.id);
  if (!already) {
    progress.checkins.push({
      storeId: store.id,
      storeName: store.name,
      at: new Date().toISOString(),
      marketId: store.marketId,
      category: store.category,
    });
  }
  const awarded: string[] = [];
  for (const stamp of STAMP_DEFS) {
    if (stampProgress(progress, stamp) >= stamp.target && !progress.claimedStamps.includes(stamp.id)) {
      progress.claimedStamps.push(stamp.id);
      addMileage(stamp.points, `스탬프 · ${stamp.name}`, `stamp-${stamp.id}`);
      awarded.push(`${stamp.name} +${stamp.points}P`);
    }
  }
  const today = todayKey();
  if (progress.todayEventDate !== today) {
    progress.todayEventDate = today;
    addMileage(TODAY_CHECKIN_POINTS, "이벤트 · 오늘 가게 인증", `today-${today}`);
    awarded.push(`오늘 가게 인증 +${TODAY_CHECKIN_POINTS}P`);
  }
  progress.claimedEvents = progress.claimedEvents ?? [];
  for (const event of EVENT_DEFS) {
    if (event.kind !== "checkin" || event.rule === "today") continue;
    const meter = eventMeter(progress, event);
    if (meter.current >= meter.target && !progress.claimedEvents.includes(event.id)) {
      progress.claimedEvents.push(event.id);
      addMileage(event.points, `이벤트 · ${event.name}`, `event-${event.id}`);
      awarded.push(`${event.name} +${event.points}P`);
    }
  }
  saveProgress(progress);
  scheduleRewardSync();
  return { already, awarded, progress };
}

function loadSubmissionsLocal(): RewardSubmission[] {
  try {
    const raw = localStorage.getItem(SUBMISSIONS_KEY);
    return raw ? (JSON.parse(raw) as RewardSubmission[]) : [];
  } catch {
    return [];
  }
}

function saveSubmissionsLocal(items: RewardSubmission[]) {
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(items));
}

const STATUS_RANK: Record<SubmissionStatus, number> = { pending: 1, rejected: 2, approved: 3 };

function mergeSubmissions(local: RewardSubmission[], remote: RewardSubmission[]) {
  const byId = new Map<string, RewardSubmission>();
  for (const item of remote) byId.set(item.id, item);
  for (const item of local) {
    const existing = byId.get(item.id);
    if (!existing || STATUS_RANK[item.status] >= STATUS_RANK[existing.status]) byId.set(item.id, item);
  }
  return Array.from(byId.values()).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

async function pushSubmissions(items: RewardSubmission[]) {
  const client = supabase();
  if (!client) return;
  await client.from("owner_dashboard_state").upsert(
    { id: REMOTE_ID, payload: { items }, updated_at: new Date().toISOString() },
    { onConflict: "id" },
  );
}

export async function refreshSubmissions(): Promise<RewardSubmission[]> {
  const local = loadSubmissionsLocal();
  const client = supabase();
  if (!client) return local;
  try {
    const { data, error } = await client.from("owner_dashboard_state").select("payload").eq("id", REMOTE_ID).maybeSingle();
    if (error || !data?.payload) return local;
    const remote = ((data.payload as { items?: RewardSubmission[] }).items ?? []);
    const merged = mergeSubmissions(local, remote);
    saveSubmissionsLocal(merged);
    void pushSubmissions(merged);
    return merged;
  } catch {
    return local;
  }
}

export function submissionsForUser(items: RewardSubmission[], userId = rewardUserId()) {
  return items.filter((item) => item.phone === userId);
}

export async function submitReward(input: Omit<RewardSubmission, "id" | "status" | "createdAt" | "phone" | "userName"> & { phone?: string; userName?: string }) {
  const item: RewardSubmission = {
    ...input,
    id: `reward-${Date.now()}`,
    phone: input.phone || rewardUserId(),
    userName: input.userName || localStorage.getItem("user_name") || "손님",
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  const next = [item, ...loadSubmissionsLocal()];
  saveSubmissionsLocal(next);
  void pushSubmissions(next);
  return item;
}

export async function reviewSubmission(id: string, status: "approved" | "rejected", rejectReason = "") {
  const items = await refreshSubmissions();
  const target = items.find((item) => item.id === id);
  if (!target || target.status !== "pending") return items;
  const next = items.map((item) => (
    item.id === id ? { ...item, status, rejectReason: status === "rejected" ? rejectReason : undefined } : item
  ));
  saveSubmissionsLocal(next);
  await pushSubmissions(next);
  if (status === "approved" && target.kind === "price") applyApprovedPrice(target);
  return next;
}

function applyApprovedPrice(submission: RewardSubmission) {
  const price = Number((submission.priceText || "").replace(/[^\d]/g, ""));
  if (!price || !submission.itemName) return;
  const catalog = loadOwnerCatalog();
  let changed = false;
  const stores = (catalog.stores ?? []).map((store) => {
    if (store.name !== submission.storeName || !store.menus?.length) return store;
    const menus = store.menus.map((menu) => {
      if (menu.name.trim() !== submission.itemName?.trim()) return menu;
      changed = true;
      return { ...menu, price: String(price) };
    });
    return { ...store, menus };
  });
  if (changed) saveOwnerCatalog({ ...catalog, stores });
}

export function paysOnApproval(item: RewardSubmission) {
  return item.kind !== "price" || Date.parse(item.createdAt) >= PRICE_PAYOUT_ON_APPROVAL_FROM;
}

export function grantApprovedPoints(items: RewardSubmission[]) {
  const userId = rewardUserId();
  const meta = loadMeta(userId);
  let gained = 0;
  let metaChanged = false;
  for (const item of submissionsForUser(items, userId)) {
    if (item.status !== "approved" || meta.paid.includes(item.id)) continue;
    metaChanged = true;
    meta.paid.push(item.id);
    saveMeta(userId, meta);
    if (item.kind === "photo-event") {
      const event = EVENT_DEFS.find((entry) => entry.id === item.eventId);
      const points = event?.points ?? PHOTO_EVENT.points;
      addMileage(points, `사진 이벤트 승인 · ${event?.name ?? PHOTO_EVENT.name}`, `grant-${item.id}`);
      gained += points;
    } else if (item.kind === "price" && paysOnApproval(item)) {
      addMileage(PRICE_REPORT_POINTS, `가격 제보 승인 · ${item.storeName} ${item.itemName ?? ""}`.trim(), `grant-${item.id}`);
      gained += PRICE_REPORT_POINTS;
    }
  }
  if (metaChanged && gained === 0) scheduleRewardSync();
  return gained;
}
