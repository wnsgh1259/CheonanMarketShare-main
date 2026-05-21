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
    if (error || !data) return null;
    return data.map((row) => ({
      storeId: Number(row.store_id),
      storeName: String(row.store_name),
      phone: String(row.phone).replace(/\D/g, ""),
      pin: String(row.pin),
    }));
  } catch {
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
    await client.from(STORE_ACCOUNTS_TABLE).upsert(payload, { onConflict: "store_id" });
  } catch {
    /* ignore network/schema issues */
  }
}

export function saveStoreAccountsLocally(accounts: StoreAccountRecord[]) {
  localStorage.setItem(ADMIN_STORE_ACCOUNTS_KEY, JSON.stringify(accounts));
}
