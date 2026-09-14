import { updateRegisteredUserPhone } from "./userAccounts";

export const OWNER_CHANGE_REQUESTS_KEY = "owner_change_requests";
export const OWNER_CHANGE_REQUESTS_APPLIED_KEY = "owner_change_requests_applied_v1";

export type OwnerChangeRequestType = "storeName" | "phone";
export type OwnerChangeRequestSource = "store" | "customer";
export type OwnerChangeRequestStatus = "pending" | "approved" | "rejected";

export type OwnerChangeRequest = {
  id: number;
  type: OwnerChangeRequestType;
  storeName: string;
  storeId?: number;
  currentValue: string;
  newValue: string;
  status: OwnerChangeRequestStatus;
  createdAt: string;
  updatedAt?: string;
  rejectReason?: string;
  source?: OwnerChangeRequestSource;
};

function normalizeStatus(value: unknown): OwnerChangeRequestStatus {
  if (value === "approved" || value === "rejected") return value;
  return "pending";
}

export function normalizeSource(value: unknown): OwnerChangeRequestSource {
  return value === "customer" ? "customer" : "store";
}

function normalizeRequest(item: OwnerChangeRequest): OwnerChangeRequest {
  return {
    ...item,
    status: normalizeStatus(item.status),
    source: normalizeSource(item.source),
    storeId: item.storeId != null ? Number(item.storeId) : undefined,
    currentValue:
      item.type === "phone" ? item.currentValue.replace(/\D/g, "") : item.currentValue,
    newValue: item.type === "phone" ? item.newValue.replace(/\D/g, "") : item.newValue,
    updatedAt: item.updatedAt || item.createdAt,
  };
}

export function loadOwnerChangeRequests(): OwnerChangeRequest[] {
  try {
    const raw = localStorage.getItem(OWNER_CHANGE_REQUESTS_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as OwnerChangeRequest[]).map(normalizeRequest);
  } catch {
    return [];
  }
}

export function persistOwnerChangeRequests(requests: OwnerChangeRequest[]) {
  localStorage.setItem(OWNER_CHANGE_REQUESTS_KEY, JSON.stringify(requests.map(normalizeRequest)));
  void import("./ownerChangeRequestsSync").then(({ syncOwnerChangeRequestsToRemote }) =>
    syncOwnerChangeRequestsToRemote(requests),
  );
}

function nextChangeRequestId() {
  return Date.now();
}

export function matchesOwnerChangeRequest(
  request: OwnerChangeRequest,
  opts: { storeId?: number | null; storeName?: string; phone?: string; source?: OwnerChangeRequestSource },
) {
  if (opts.source && normalizeSource(request.source) !== opts.source) return false;
  if (opts.storeId != null && request.storeId === opts.storeId) return true;
  if (opts.storeName && request.storeName === opts.storeName) return true;
  const phoneDigits = (opts.phone || "").replace(/\D/g, "");
  if (phoneDigits && request.currentValue.replace(/\D/g, "") === phoneDigits) return true;
  if (phoneDigits && request.newValue.replace(/\D/g, "") === phoneDigits) return true;
  return false;
}

export function findPendingOwnerChangeRequest(
  type: OwnerChangeRequestType,
  opts: { storeId?: number | null; storeName?: string; phone?: string; source?: OwnerChangeRequestSource },
): OwnerChangeRequest | null {
  return (
    loadOwnerChangeRequests().find(
      (item) =>
        item.type === type &&
        item.status === "pending" &&
        matchesOwnerChangeRequest(item, opts),
    ) ?? null
  );
}

export function submitOwnerChangeRequest(input: {
  type: OwnerChangeRequestType;
  storeName: string;
  storeId?: number;
  currentValue: string;
  newValue: string;
  source?: OwnerChangeRequestSource;
}): OwnerChangeRequest {
  const requests = loadOwnerChangeRequests();
  const source = input.source ?? "store";
  const currentValue =
    input.type === "phone" ? input.currentValue.replace(/\D/g, "") : input.currentValue.trim();
  const newValue = input.type === "phone" ? input.newValue.replace(/\D/g, "") : input.newValue.trim();
  const now = new Date().toISOString();

  const withoutDuplicate = requests.filter(
    (item) =>
      !(
        item.status === "pending" &&
        item.type === input.type &&
        normalizeSource(item.source) === source &&
        matchesOwnerChangeRequest(item, {
          storeId: input.storeId,
          storeName: input.storeName,
          phone: currentValue,
          source,
        })
      ),
  );

  const request: OwnerChangeRequest = {
    id: nextChangeRequestId(),
    type: input.type,
    storeName: input.storeName.trim(),
    storeId: input.storeId,
    currentValue,
    newValue,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    source,
  };

  const next = [...withoutDuplicate, request];
  persistOwnerChangeRequests(next);
  void import("./ownerChangeRequestsSync").then(({ upsertOwnerChangeRequestRemote }) =>
    upsertOwnerChangeRequestRemote(request),
  );
  return request;
}

export function updateOwnerChangeRequest(
  id: number,
  patch: Partial<Pick<OwnerChangeRequest, "status" | "rejectReason">>,
) {
  const now = new Date().toISOString();
  const next = loadOwnerChangeRequests().map((item) =>
    item.id === id ? { ...item, ...patch, updatedAt: now } : item,
  );
  persistOwnerChangeRequests(next);
  const updated = next.find((item) => item.id === id);
  if (updated) {
    void import("./ownerChangeRequestsSync").then(({ upsertOwnerChangeRequestRemote }) =>
      upsertOwnerChangeRequestRemote(updated),
    );
  }
  return next;
}

function loadAppliedRequestIds(): Set<number> {
  try {
    const raw = localStorage.getItem(OWNER_CHANGE_REQUESTS_APPLIED_KEY);
    if (!raw) return new Set();
    return new Set((JSON.parse(raw) as number[]).filter((id) => Number.isFinite(id)));
  } catch {
    return new Set();
  }
}

function saveAppliedRequestIds(ids: Set<number>) {
  localStorage.setItem(OWNER_CHANGE_REQUESTS_APPLIED_KEY, JSON.stringify(Array.from(ids)));
}

/** 승인된 변경을 현재 기기 세션/계정에 반영 (손님·사장님) */
export function applyApprovedChangeRequestsLocally(requests: OwnerChangeRequest[]) {
  const applied = loadAppliedRequestIds();
  let changed = false;
  const role = localStorage.getItem("user_role");
  let sessionPhone = (localStorage.getItem("user_phone") || "").replace(/\D/g, "");
  const storeIdRaw = localStorage.getItem("owner_store_id");
  const storeId = storeIdRaw ? Number(storeIdRaw) : null;

  for (const raw of requests) {
    const request = normalizeRequest(raw);
    if (request.status !== "approved") continue;
    if (applied.has(request.id)) continue;

    if (request.type === "phone" && normalizeSource(request.source) === "customer") {
      const oldPhone = request.currentValue.replace(/\D/g, "");
      const newPhone = request.newValue.replace(/\D/g, "");
      if (sessionPhone === oldPhone || sessionPhone === newPhone || !sessionPhone) {
        updateRegisteredUserPhone(oldPhone, newPhone);
        localStorage.setItem("user_phone", newPhone);
        sessionPhone = newPhone;
        changed = true;
        applied.add(request.id);
      }
    }

    if (request.type === "storeName" && normalizeSource(request.source) === "store") {
      const matchesStore =
        (storeId != null && request.storeId === storeId) ||
        localStorage.getItem("owner_current_store_name") === request.currentValue ||
        localStorage.getItem("owner_approved_store_name") === request.currentValue ||
        localStorage.getItem("owner_current_store_name") === request.newValue;
      if (role === "owner" && matchesStore) {
        localStorage.setItem("owner_current_store_name", request.newValue);
        localStorage.setItem("owner_approved_store_name", request.newValue);
        localStorage.setItem("user_name", request.newValue);
        changed = true;
        applied.add(request.id);
      }
    }

    if (request.type === "phone" && normalizeSource(request.source) === "store") {
      const oldPhone = request.currentValue.replace(/\D/g, "");
      const newPhone = request.newValue.replace(/\D/g, "");
      const matches =
        (storeId != null && request.storeId === storeId) ||
        sessionPhone === oldPhone ||
        sessionPhone === newPhone;
      if (role === "owner" && matches) {
        localStorage.setItem("user_phone", newPhone);
        sessionPhone = newPhone;
        changed = true;
        applied.add(request.id);
      }
    }
  }

  if (changed) saveAppliedRequestIds(applied);
  return changed;
}
