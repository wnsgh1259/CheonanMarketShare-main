import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ADMIN_STORE_ACCOUNTS_KEY, type StoreAccountRecord } from "./adminAccount";

const STORE_ACCOUNTS_TABLE = "store_accounts";

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

export async function loadStoreAccountsFromRemote(): Promise<StoreAccountRecord[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from(STORE_ACCOUNTS_TABLE)
      .select("store_id, store_name, phone, pin")
      .order("store_id");
    if (error) {
      console.warn("[store_accounts] load failed:", error.message);
      return null;
    }
    if (!data) return null;
    return data.map((row) => ({
      storeId: Number(row.store_id),
      storeName: String(row.store_name),
      phone: String(row.phone).replace(/\D/g, ""),
      pin: String(row.pin),
    }));
  } catch (err) {
    console.warn("[store_accounts] load error:", err);
    return null;
  }
}

export async function syncStoreAccountsToRemote(accounts: StoreAccountRecord[]) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const payload = accounts.map((item) => ({
      store_id: item.storeId,
      store_name: item.storeName,
      phone: item.phone.replace(/\D/g, ""),
      pin: item.pin,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await client.from(STORE_ACCOUNTS_TABLE).upsert(payload, { onConflict: "store_id" });
    if (error) {
      console.warn("[store_accounts] sync failed:", error.message);
    }
  } catch (err) {
    console.warn("[store_accounts] sync error:", err);
  }
}

export function saveStoreAccountsLocally(accounts: StoreAccountRecord[]) {
  localStorage.setItem(ADMIN_STORE_ACCOUNTS_KEY, JSON.stringify(accounts));
}

function mergeStoreAccounts(
  local: StoreAccountRecord[],
  remote: StoreAccountRecord[],
): StoreAccountRecord[] {
  const byId = new Map<number, StoreAccountRecord>();
  for (const item of remote) {
    if (Number.isFinite(item.storeId)) byId.set(item.storeId, item);
  }
  for (const item of local) {
    if (!Number.isFinite(item.storeId)) continue;
    const existing = byId.get(item.storeId);
    if (!existing) {
      byId.set(item.storeId, item);
      continue;
    }
    byId.set(item.storeId, {
      ...existing,
      ...item,
      phone: (item.phone || existing.phone).replace(/\D/g, ""),
      pin: item.pin || existing.pin,
      storeName: item.storeName || existing.storeName,
    });
  }
  return Array.from(byId.values());
}

export async function refreshStoreAccountsFromRemote(): Promise<StoreAccountRecord[]> {
  const local = (() => {
    try {
      const raw = localStorage.getItem(ADMIN_STORE_ACCOUNTS_KEY);
      if (!raw) return [] as StoreAccountRecord[];
      return JSON.parse(raw) as StoreAccountRecord[];
    } catch {
      return [] as StoreAccountRecord[];
    }
  })();
  const remote = await loadStoreAccountsFromRemote();
  if (!remote) return local;
  const merged = mergeStoreAccounts(local, remote);
  saveStoreAccountsLocally(merged);
  void syncStoreAccountsToRemote(merged);
  return merged;
}
