import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  REGISTERED_USERS_KEY,
  type RegisteredUser,
} from "./userAccounts";

const REGISTERED_USERS_REMOTE_ID = "registered_users";
const OWNER_SHARED_TABLE = "owner_dashboard_state";

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

function normalizeUser(user: RegisteredUser): RegisteredUser {
  return {
    ...user,
    phone: String(user.phone ?? "").replace(/\D/g, ""),
    pin: String(user.pin ?? ""),
    email: String(user.email ?? ""),
    name: String(user.name ?? ""),
    role: user.role === "owner" ? "owner" : "customer",
    status:
      user.status === "pending" || user.status === "rejected" ? user.status : "active",
  };
}

export function loadRegisteredUsersLocally(): RegisteredUser[] {
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as RegisteredUser[]).map(normalizeUser);
  } catch {
    return [];
  }
}

export function saveRegisteredUsersLocally(users: RegisteredUser[]) {
  localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users.map(normalizeUser)));
}

export async function loadRegisteredUsersFromRemote(): Promise<RegisteredUser[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from(OWNER_SHARED_TABLE)
      .select("payload")
      .eq("id", REGISTERED_USERS_REMOTE_ID)
      .maybeSingle();
    if (error) {
      console.warn("[registered_users] load failed:", error.message);
      return null;
    }
    const users = (data?.payload as { users?: RegisteredUser[] } | null)?.users;
    if (!Array.isArray(users)) return null;
    return users.map(normalizeUser);
  } catch (err) {
    console.warn("[registered_users] load error:", err);
    return null;
  }
}

export async function syncRegisteredUsersToRemote(users: RegisteredUser[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from(OWNER_SHARED_TABLE).upsert(
      {
        id: REGISTERED_USERS_REMOTE_ID,
        payload: { users: users.map(normalizeUser) },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (error) {
      console.warn("[registered_users] sync failed:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[registered_users] sync error:", err);
    return false;
  }
}

function mergeRegisteredUsers(local: RegisteredUser[], remote: RegisteredUser[]): RegisteredUser[] {
  const byPhone = new Map<string, RegisteredUser>();
  for (const user of remote.map(normalizeUser)) {
    if (user.phone) byPhone.set(user.phone, user);
  }
  for (const user of local.map(normalizeUser)) {
    if (!user.phone) continue;
    const existing = byPhone.get(user.phone);
    if (!existing) {
      byPhone.set(user.phone, user);
      continue;
    }
    // 동일 번호면 로컬 최신 필드 우선(PIN/이메일/이름), status는 pending < rejected < active 중 원격 승인 반영
    const statusRank = { pending: 0, rejected: 1, active: 2 } as const;
    byPhone.set(user.phone, {
      ...existing,
      ...user,
      status:
        statusRank[user.status] >= statusRank[existing.status] ? user.status : existing.status,
      pin: user.pin || existing.pin,
      email: user.email || existing.email,
      name: user.name || existing.name,
    });
  }
  return Array.from(byPhone.values());
}

export async function refreshRegisteredUsersFromRemote(): Promise<RegisteredUser[]> {
  const local = loadRegisteredUsersLocally();
  const remote = await loadRegisteredUsersFromRemote();
  if (!remote) return local;
  const merged = mergeRegisteredUsers(local, remote);
  saveRegisteredUsersLocally(merged);
  void syncRegisteredUsersToRemote(merged);
  return merged;
}
