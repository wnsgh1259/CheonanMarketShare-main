import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  OWNER_SIGNUP_APPLICATIONS_KEY,
  type OwnerSignupApplication,
  type OwnerSignupMarketId,
} from "./ownerSignupApplications";
import { loadSharedOwnerDraftById, saveSharedOwnerDraftById } from "./ownerSharedStore";

const OWNER_SIGNUP_APPLICATIONS_TABLE = "owner_signup_applications";
/** lat/lng 컬럼이 없을 때도 좌표를 기기 간에 맞추기 위한 sidecar */
const SIGNUP_COORDS_REMOTE_ID = "signup_application_coords";

type SignupCoordsMap = Record<string, { lat: number; lng: number; updatedAt: string }>;

let cachedClient: SupabaseClient | null = null;

function getSupabaseClient() {
  if (cachedClient) return cachedClient;
  const env = (import.meta as any).env ?? {};
  const url = env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anonKey) return null;
  cachedClient = createClient(url, anonKey);
  return cachedClient;
}

function normalizeMarketId(value: unknown): OwnerSignupMarketId {
  if (value === "byeongcheon" || value === "seonghwan") return value;
  return "jungang";
}

function parseOptionalCoord(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function rowToApplication(row: Record<string, unknown>): OwnerSignupApplication {
  const lat = parseOptionalCoord(row.lat);
  const lng = parseOptionalCoord(row.lng);
  return {
    id: Number(row.id),
    storeName: String(row.store_name ?? ""),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? "").replace(/\D/g, ""),
    pin: String(row.pin ?? ""),
    address: String(row.address ?? ""),
    storeImage: String(row.store_image ?? ""),
    marketId: normalizeMarketId(row.market_id),
    lat,
    lng,
    status:
      row.status === "approved" || row.status === "rejected" ? row.status : "pending",
    createdAt: String(row.created_at ?? new Date().toISOString()),
    rejectReason: row.reject_reason ? String(row.reject_reason) : undefined,
    approvedStoreId:
      row.approved_store_id != null && row.approved_store_id !== ""
        ? Number(row.approved_store_id)
        : undefined,
  };
}

function applicationToRow(app: OwnerSignupApplication, includeCoords = true) {
  const base = {
    id: app.id,
    store_name: app.storeName,
    email: app.email,
    phone: app.phone.replace(/\D/g, ""),
    pin: app.pin,
    address: app.address,
    store_image: app.storeImage,
    market_id: app.marketId,
    status: app.status,
    created_at: app.createdAt,
    reject_reason: app.rejectReason ?? null,
    approved_store_id: app.approvedStoreId ?? null,
    updated_at: new Date().toISOString(),
  };
  if (!includeCoords) return base;
  return {
    ...base,
    lat: typeof app.lat === "number" ? app.lat : null,
    lng: typeof app.lng === "number" ? app.lng : null,
  };
}

export async function loadOwnerSignupApplicationsFromRemote(): Promise<OwnerSignupApplication[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from(OWNER_SIGNUP_APPLICATIONS_TABLE)
      .select("*")
      .order("created_at", { ascending: false });
    if (error || !data) return null;
    return data.map((row) => rowToApplication(row as Record<string, unknown>));
  } catch {
    return null;
  }
}

async function upsertSignupRow(
  client: SupabaseClient,
  row: Record<string, unknown>,
): Promise<boolean> {
  const phone = String(row.phone ?? "");
  // phone UNIQUE: 같은 번호면 기존 행을 UPDATE (재신청 시 새 id INSERT 실패 방지)
  const { data: existing, error: lookupError } = await client
    .from(OWNER_SIGNUP_APPLICATIONS_TABLE)
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (!lookupError && existing?.id != null) {
    const { error: updateError } = await client
      .from(OWNER_SIGNUP_APPLICATIONS_TABLE)
      .update({
        ...row,
        id: Number(existing.id),
      })
      .eq("id", existing.id);
    if (!updateError) return true;
  }

  const { error: upsertError } = await client
    .from(OWNER_SIGNUP_APPLICATIONS_TABLE)
    .upsert(row, { onConflict: "id" });
  if (!upsertError) return true;

  // phone unique 충돌 시 phone 기준 upsert 재시도
  const { error: phoneUpsertError } = await client
    .from(OWNER_SIGNUP_APPLICATIONS_TABLE)
    .upsert(row, { onConflict: "phone" });
  return !phoneUpsertError;
}

async function loadSignupCoordsSidecar(): Promise<SignupCoordsMap> {
  const payload = await loadSharedOwnerDraftById(SIGNUP_COORDS_REMOTE_ID);
  if (!payload || typeof payload !== "object") return {};
  const out: SignupCoordsMap = {};
  for (const [phone, value] of Object.entries(payload as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const v = value as { lat?: unknown; lng?: unknown; updatedAt?: unknown };
    const lat = typeof v.lat === "number" ? v.lat : Number(v.lat);
    const lng = typeof v.lng === "number" ? v.lng : Number(v.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    out[phone.replace(/\D/g, "")] = {
      lat,
      lng,
      updatedAt: typeof v.updatedAt === "string" ? v.updatedAt : new Date().toISOString(),
    };
  }
  return out;
}

async function pushSignupCoordsSidecar(phone: string, lat: number, lng: number) {
  const key = phone.replace(/\D/g, "");
  if (!key) return;
  const current = await loadSignupCoordsSidecar();
  current[key] = { lat, lng, updatedAt: new Date().toISOString() };
  await saveSharedOwnerDraftById(SIGNUP_COORDS_REMOTE_ID, current);
}

function applySignupCoordsSidecar(
  apps: OwnerSignupApplication[],
  coords: SignupCoordsMap,
): OwnerSignupApplication[] {
  if (!apps.length || !Object.keys(coords).length) return apps;
  return apps.map((app) => {
    if (typeof app.lat === "number" && typeof app.lng === "number") return app;
    const hit = coords[app.phone.replace(/\D/g, "")];
    if (!hit) return app;
    return { ...app, lat: hit.lat, lng: hit.lng };
  });
}

export async function upsertOwnerSignupApplicationRemote(app: OwnerSignupApplication): Promise<boolean> {
  const client = getSupabaseClient();
  const hasCoords = typeof app.lat === "number" && typeof app.lng === "number";
  // 컬럼이 없어도 좌표는 sidecar에 남겨 폰/PC 관리자가 볼 수 있게 한다
  if (hasCoords) {
    void pushSignupCoordsSidecar(app.phone, app.lat!, app.lng!);
  }
  if (!client) return hasCoords; // 로컬+sidecar만 있는 경우에도 좌표는 남김
  try {
    // lat/lng 컬럼이 있으면 함께 저장, 없으면(스키마 미반영) 좌표 없이 재시도
    if (await upsertSignupRow(client, applicationToRow(app, true))) return true;
    const fallback = await upsertSignupRow(client, applicationToRow(app, false));
    return fallback || hasCoords;
  } catch {
    try {
      const fallback = await upsertSignupRow(client, applicationToRow(app, false));
      return fallback || hasCoords;
    } catch {
      return hasCoords;
    }
  }
}

export async function syncOwnerSignupApplicationsToRemote(applications: OwnerSignupApplication[]) {
  if (!applications.length) return;
  for (const app of applications) {
    await upsertOwnerSignupApplicationRemote(app);
  }
}

export function loadOwnerSignupApplicationsLocally(): OwnerSignupApplication[] {
  try {
    const raw = localStorage.getItem(OWNER_SIGNUP_APPLICATIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OwnerSignupApplication[];
  } catch {
    return [];
  }
}

export function saveOwnerSignupApplicationsLocally(applications: OwnerSignupApplication[]) {
  localStorage.setItem(OWNER_SIGNUP_APPLICATIONS_KEY, JSON.stringify(applications));
}

const SIGNUP_STATUS_PRIORITY: Record<OwnerSignupApplication["status"], number> = {
  approved: 3,
  pending: 2,
  rejected: 1,
};

function shouldPreferSignupApplication(
  existing: OwnerSignupApplication,
  incoming: OwnerSignupApplication,
): boolean {
  const existingTime = Date.parse(existing.createdAt) || 0;
  const incomingTime = Date.parse(incoming.createdAt) || 0;

  // 재신청: 더 최신 pending이 이전 approved/rejected보다 우선 (관리자 대기 목록에 뜨게)
  if (incoming.status === "pending" && existing.status !== "pending" && incomingTime >= existingTime) {
    return true;
  }
  if (existing.status === "pending" && incoming.status !== "pending" && existingTime >= incomingTime) {
    return false;
  }

  const existingPriority = SIGNUP_STATUS_PRIORITY[existing.status];
  const incomingPriority = SIGNUP_STATUS_PRIORITY[incoming.status];
  if (incomingPriority !== existingPriority) {
    return incomingPriority > existingPriority;
  }
  if (existing.status === "approved" && incoming.status === "approved") {
    const existingApprovedAt = existing.approvedStoreId ?? 0;
    const incomingApprovedAt = incoming.approvedStoreId ?? 0;
    if (incomingApprovedAt !== existingApprovedAt) {
      return incomingApprovedAt > existingApprovedAt;
    }
  }
  return incomingTime >= existingTime;
}

function mergeSignupCoords(
  preferred: OwnerSignupApplication,
  other?: OwnerSignupApplication,
): OwnerSignupApplication {
  const lat = preferred.lat ?? other?.lat;
  const lng = preferred.lng ?? other?.lng;
  return {
    ...preferred,
    ...(typeof lat === "number" ? { lat } : {}),
    ...(typeof lng === "number" ? { lng } : {}),
  };
}

export function mergeOwnerSignupApplications(
  local: OwnerSignupApplication[],
  remote: OwnerSignupApplication[],
): OwnerSignupApplication[] {
  const byPhone = new Map<string, OwnerSignupApplication>();
  for (const item of remote) {
    byPhone.set(item.phone.replace(/\D/g, ""), item);
  }
  for (const item of local) {
    const phone = item.phone.replace(/\D/g, "");
    const existing = byPhone.get(phone);
    if (!existing || shouldPreferSignupApplication(existing, item)) {
      byPhone.set(phone, mergeSignupCoords(item, existing));
    } else {
      byPhone.set(phone, mergeSignupCoords(existing, item));
    }
  }
  return Array.from(byPhone.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function refreshOwnerSignupApplicationsFromRemote(): Promise<OwnerSignupApplication[]> {
  const [remote, coordsSidecar] = await Promise.all([
    loadOwnerSignupApplicationsFromRemote(),
    loadSignupCoordsSidecar(),
  ]);
  const local = loadOwnerSignupApplicationsLocally();
  if (!remote) {
    const withCoords = applySignupCoordsSidecar(local, coordsSidecar);
    if (withCoords !== local) saveOwnerSignupApplicationsLocally(withCoords);
    return withCoords;
  }
  const merged = applySignupCoordsSidecar(
    mergeOwnerSignupApplications(local, remote),
    coordsSidecar,
  );
  saveOwnerSignupApplicationsLocally(merged);
  void syncOwnerSignupApplicationsToRemote(merged);
  // 로컬에만 있던 좌표도 sidecar에 올려 다른 기기로 맞춤
  for (const app of merged) {
    if (typeof app.lat === "number" && typeof app.lng === "number") {
      void pushSignupCoordsSidecar(app.phone, app.lat, app.lng);
    }
  }
  return merged;
}
