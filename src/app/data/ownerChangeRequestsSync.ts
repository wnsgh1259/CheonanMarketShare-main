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

function normalizeRequest(item: OwnerChangeRequest): OwnerChangeRequest {
  return {
    ...item,
    type: normalizeType(item.type),
    status: normalizeStatus(item.status),
    source: normalizeSource(item.source),
    storeId: item.storeId != null ? Number(item.storeId) : undefined,
    currentValue:
      item.type === "phone" || normalizeType(item.type) === "phone"
        ? String(item.currentValue ?? "").replace(/\D/g, "")
        : String(item.currentValue ?? ""),
    newValue:
      item.type === "phone" || normalizeType(item.type) === "phone"
        ? String(item.newValue ?? "").replace(/\D/g, "")
        : String(item.newValue ?? ""),
    createdAt: String(item.createdAt ?? new Date().toISOString()),
    updatedAt: String(item.updatedAt ?? item.createdAt ?? new Date().toISOString()),
  };
}

function rowToRequest(row: Record<string, unknown>): OwnerChangeRequest {
  const type = normalizeType(row.type);
  const createdAt = String(row.created_at ?? new Date().toISOString());
  return normalizeRequest({
    id: Number(row.id),
    type,
    storeName: String(row.store_name ?? ""),
    storeId: row.store_id != null && row.store_id !== "" ? Number(row.store_id) : undefined,
    currentValue: String(row.current_value ?? ""),
    newValue: String(row.new_value ?? ""),
    status: normalizeStatus(row.status),
    createdAt,
    updatedAt: String(row.updated_at ?? createdAt),
    rejectReason: row.reject_reason ? String(row.reject_reason) : undefined,
    source: normalizeSource(row.source),
  });
}

function requestToRow(request: OwnerChangeRequest) {
  const normalized = normalizeRequest(request);
  return {
    id: normalized.id,
    store_id: normalized.storeId ?? null,
    type: normalized.type,
    store_name: normalized.storeName,
    current_value: normalized.currentValue,
    new_value: normalized.newValue,
    status: normalized.status,
    created_at: normalized.createdAt,
    reject_reason: normalized.rejectReason ?? null,
    source: normalized.source ?? "store",
    updated_at: normalized.updatedAt ?? new Date().toISOString(),
  };
}

const STATUS_PRIORITY: Record<OwnerChangeRequestStatus, number> = {
  approved: 3,
  rejected: 2,
  pending: 1,
};

function requestRankTime(item: OwnerChangeRequest) {
  const updated = Date.parse(item.updatedAt || "") || 0;
  const created = Date.parse(item.createdAt || "") || 0;
  return Math.max(updated, created);
}

function shouldPreferRequest(existing: OwnerChangeRequest, incoming: OwnerChangeRequest) {
  const existingStatus = STATUS_PRIORITY[normalizeStatus(existing.status)];
  const incomingStatus = STATUS_PRIORITY[normalizeStatus(incoming.status)];
  if (incomingStatus !== existingStatus) {
    // 동일 id에서 pending이 approved/rejected를 덮어쓰지 못하게
    return incomingStatus > existingStatus;
  }
  return requestRankTime(incoming) >= requestRankTime(existing);
}

export async function loadOwnerChangeRequestsFromRemote(): Promise<OwnerChangeRequest[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from(OWNER_CHANGE_REQUESTS_TABLE)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.warn("[owner_change_requests] load failed:", error.message);
      return null;
    }
    if (!data) return null;
    return data.map((row) => rowToRequest(row as Record<string, unknown>));
  } catch (err) {
    console.warn("[owner_change_requests] load error:", err);
    return null;
  }
}

export async function upsertOwnerChangeRequestRemote(request: OwnerChangeRequest): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client
      .from(OWNER_CHANGE_REQUESTS_TABLE)
      .upsert(requestToRow(request), { onConflict: "id" });
    if (error) {
      console.warn("[owner_change_requests] upsert failed:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[owner_change_requests] upsert error:", err);
    return false;
  }
}

export async function syncOwnerChangeRequestsToRemote(requests: OwnerChangeRequest[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || requests.length === 0) return false;
  try {
    const { error } = await client
      .from(OWNER_CHANGE_REQUESTS_TABLE)
      .upsert(requests.map(requestToRow), { onConflict: "id" });
    if (error) {
      console.warn("[owner_change_requests] sync failed:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[owner_change_requests] sync error:", err);
    return false;
  }
}

export function loadOwnerChangeRequestsLocally(): OwnerChangeRequest[] {
  try {
    const raw = localStorage.getItem(OWNER_CHANGE_REQUESTS_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as OwnerChangeRequest[]).map(normalizeRequest);
  } catch {
    return [];
  }
}

export function saveOwnerChangeRequestsLocally(requests: OwnerChangeRequest[]) {
  localStorage.setItem(
    OWNER_CHANGE_REQUESTS_KEY,
    JSON.stringify(requests.map(normalizeRequest)),
  );
}

export function mergeOwnerChangeRequests(
  local: OwnerChangeRequest[],
  remote: OwnerChangeRequest[],
): OwnerChangeRequest[] {
  const byId = new Map<number, OwnerChangeRequest>();
  for (const item of remote.map(normalizeRequest)) {
    byId.set(item.id, item);
  }
  for (const item of local.map(normalizeRequest)) {
    const existing = byId.get(item.id);
    if (!existing || shouldPreferRequest(existing, item)) {
      byId.set(item.id, item);
    }
  }
  return Array.from(byId.values()).sort((a, b) => requestRankTime(b) - requestRankTime(a));
}

export async function refreshOwnerChangeRequestsFromRemote(): Promise<OwnerChangeRequest[]> {
  const local = loadOwnerChangeRequestsLocally();
  const remote = await loadOwnerChangeRequestsFromRemote();
  if (!remote) return local.map(normalizeRequest);
  const merged = mergeOwnerChangeRequests(local, remote);
  saveOwnerChangeRequestsLocally(merged);
  void syncOwnerChangeRequestsToRemote(merged);
  return merged;
}
