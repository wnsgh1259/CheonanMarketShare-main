import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  OWNER_SIGNUP_APPLICATIONS_KEY,
  type OwnerSignupApplication,
  type OwnerSignupMarketId,
} from "./ownerSignupApplications";

const OWNER_SIGNUP_APPLICATIONS_TABLE = "owner_signup_applications";

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

function rowToApplication(row: Record<string, unknown>): OwnerSignupApplication {
  return {
    id: Number(row.id),
    storeName: String(row.store_name ?? ""),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? "").replace(/\D/g, ""),
    pin: String(row.pin ?? ""),
    address: String(row.address ?? ""),
    storeImage: String(row.store_image ?? ""),
    marketId: normalizeMarketId(row.market_id),
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

function applicationToRow(app: OwnerSignupApplication) {
  return {
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

export async function upsertOwnerSignupApplicationRemote(app: OwnerSignupApplication) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client
      .from(OWNER_SIGNUP_APPLICATIONS_TABLE)
      .upsert(applicationToRow(app), { onConflict: "id" });
  } catch {
    /* ignore network/schema issues */
  }
}

export async function syncOwnerSignupApplicationsToRemote(applications: OwnerSignupApplication[]) {
  const client = getSupabaseClient();
  if (!client || applications.length === 0) return;
  try {
    await client
      .from(OWNER_SIGNUP_APPLICATIONS_TABLE)
      .upsert(applications.map(applicationToRow), { onConflict: "id" });
  } catch {
    /* ignore network/schema issues */
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
    if (!existing) {
      byPhone.set(phone, item);
      continue;
    }
    const existingTime = new Date(existing.createdAt).getTime();
    const itemTime = new Date(item.createdAt).getTime();
    if (itemTime >= existingTime) {
      byPhone.set(phone, item);
    }
  }
  return Array.from(byPhone.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function refreshOwnerSignupApplicationsFromRemote(): Promise<OwnerSignupApplication[]> {
  const local = loadOwnerSignupApplicationsLocally();
  const remote = await loadOwnerSignupApplicationsFromRemote();
  if (!remote) return local;
  const merged = mergeOwnerSignupApplications(local, remote);
  saveOwnerSignupApplicationsLocally(merged);
  void syncOwnerSignupApplicationsToRemote(merged);
  return merged;
}
