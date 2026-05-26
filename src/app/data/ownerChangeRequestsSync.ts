import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  OWNER_CHANGE_REQUESTS_KEY,
  type OwnerChangeRequest,
  type OwnerChangeRequestSource,
  type OwnerChangeRequestStatus,
  type OwnerChangeRequestType,
} from "./ownerChangeRequests";

const OWNER_CHANGE_REQUESTS_TABLE = "owner_change_requests";

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

function normalizeType(value: unknown): OwnerChangeRequestType {
  return value === "storeName" ? "storeName" : "phone";
}

function normalizeStatus(value: unknown): OwnerChangeRequestStatus {
  if (value === "approved" || value === "rejected") return value;
  return "pending";
}

function normalizeSource(value: unknown): OwnerChangeRequestSource {
  return value === "customer" ? "customer" : "store";
}

function rowToRequest(row: Record<string, unknown>): OwnerChangeRequest {
  const type = normalizeType(row.type);
  return {
    id: Number(row.id),
    type,
    storeName: String(row.store_name ?? ""),
    storeId:
      row.store_id != null && row.store_id !== "" ? Number(row.store_id) : undefined,
    currentValue: String(row.current_value ?? ""),
    newValue: String(row.new_value ?? ""),
    status: normalizeStatus(row.status),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    rejectReason: row.reject_reason ? String(row.reject_reason) : undefined,
    source: normalizeSource(row.source),
  };
}

function requestToRow(request: OwnerChangeRequest) {
  return {
    id: request.id,
    store_id: request.storeId ?? null,
    type: request.type,
    store_name: request.storeName,
    current_value: request.currentValue,
    new_value: request.newValue,
    status: request.status,
    created_at: request.createdAt,
    reject_reason: request.rejectReason ?? null,
    source: request.source ?? "store",
    updated_at: new Date().toISOString(),
  };
}

export async function loadOwnerChangeRequestsFromRemote(): Promise<OwnerChangeRequest[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from(OWNER_CHANGE_REQUESTS_TABLE)
      .select("*")
      .order("created_at", { ascending: false });
    if (error || !data) return null;
    return data.map((row) => rowToRequest(row as Record<string, unknown>));
  } catch {
    return null;
  }
}

export async function upsertOwnerChangeRequestRemote(request: OwnerChangeRequest) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client
      .from(OWNER_CHANGE_REQUESTS_TABLE)
      .upsert(requestToRow(request), { onConflict: "id" });
  } catch {
    /* ignore network/schema issues */
  }
}

export async function syncOwnerChangeRequestsToRemote(requests: OwnerChangeRequest[]) {
  const client = getSupabaseClient();
  if (!client || requests.length === 0) return;
  try {
    await client
      .from(OWNER_CHANGE_REQUESTS_TABLE)
      .upsert(requests.map(requestToRow), { onConflict: "id" });
  } catch {
    /* ignore network/schema issues */
  }
}

export function loadOwnerChangeRequestsLocally(): OwnerChangeRequest[] {
  try {
    const raw = localStorage.getItem(OWNER_CHANGE_REQUESTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OwnerChangeRequest[];
  } catch {
    return [];
  }
}

export function saveOwnerChangeRequestsLocally(requests: OwnerChangeRequest[]) {
  localStorage.setItem(OWNER_CHANGE_REQUESTS_KEY, JSON.stringify(requests));
}

export function mergeOwnerChangeRequests(
  local: OwnerChangeRequest[],
  remote: OwnerChangeRequest[],
): OwnerChangeRequest[] {
  const byId = new Map<number, OwnerChangeRequest>();
  for (const item of remote) {
    byId.set(item.id, item);
  }
  for (const item of local) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      continue;
    }
    const existingTime = new Date(existing.createdAt).getTime();
    const itemTime = new Date(item.createdAt).getTime();
    if (itemTime >= existingTime) {
      byId.set(item.id, item);
    }
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function refreshOwnerChangeRequestsFromRemote(): Promise<OwnerChangeRequest[]> {
  const local = loadOwnerChangeRequestsLocally();
  const remote = await loadOwnerChangeRequestsFromRemote();
  if (!remote) return local;
  const merged = mergeOwnerChangeRequests(local, remote);
  saveOwnerChangeRequestsLocally(merged);
  void syncOwnerChangeRequestsToRemote(merged);
  return merged;
}
