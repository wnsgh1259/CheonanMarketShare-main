export const OWNER_CHANGE_REQUESTS_KEY = "owner_change_requests";

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
  rejectReason?: string;
  source?: OwnerChangeRequestSource;
};

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
    status: normalizeStatus(item.status),
    source: normalizeSource(item.source),
    storeId: item.storeId != null ? Number(item.storeId) : undefined,
    currentValue:
      item.type === "phone" ? item.currentValue.replace(/\D/g, "") : item.currentValue,
    newValue: item.type === "phone" ? item.newValue.replace(/\D/g, "") : item.newValue,
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
  localStorage.setItem(OWNER_CHANGE_REQUESTS_KEY, JSON.stringify(requests));
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

  const withoutDuplicate = requests.filter(
    (item) =>
      !(
        item.status === "pending" &&
        item.type === input.type &&
        item.source === source &&
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
    createdAt: new Date().toISOString(),
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
  const next = loadOwnerChangeRequests().map((item) =>
    item.id === id ? { ...item, ...patch } : item,
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
