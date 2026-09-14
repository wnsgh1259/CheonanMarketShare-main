export const OWNER_SIGNUP_APPLICATIONS_KEY = "owner_signup_applications";

export type OwnerSignupMarketId = "jungang" | "byeongcheon" | "seonghwan";

export type OwnerSignupApplication = {
  id: number;
  storeName: string;
  email: string;
  phone: string;
  pin: string;
  address: string;
  storeImage: string;
  marketId: OwnerSignupMarketId;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  rejectReason?: string;
  approvedStoreId?: number;
};

export function loadOwnerSignupApplications(): OwnerSignupApplication[] {
  try {
    const raw = localStorage.getItem(OWNER_SIGNUP_APPLICATIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OwnerSignupApplication[];
  } catch {
    return [];
  }
}

export function persistOwnerSignupApplications(applications: OwnerSignupApplication[]) {
  localStorage.setItem(OWNER_SIGNUP_APPLICATIONS_KEY, JSON.stringify(applications));
  void import("./ownerSignupApplicationsSync").then(({ syncOwnerSignupApplicationsToRemote }) =>
    syncOwnerSignupApplicationsToRemote(applications),
  );
}

function nextSignupApplicationId() {
  return Date.now();
}

export function findPendingSignupByPhone(phone: string): OwnerSignupApplication | null {
  const phoneDigits = phone.replace(/\D/g, "");
  return (
    loadOwnerSignupApplications().find(
      (item) => item.phone.replace(/\D/g, "") === phoneDigits && item.status === "pending",
    ) ?? null
  );
}

export function findRejectedSignupByPhone(phone: string): OwnerSignupApplication | null {
  const phoneDigits = phone.replace(/\D/g, "");
  return (
    loadOwnerSignupApplications()
      .filter((item) => item.phone.replace(/\D/g, "") === phoneDigits && item.status === "rejected")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null
  );
}

export function getSignupRejectReason(phone: string): string {
  const rejected = findRejectedSignupByPhone(phone);
  return rejected?.rejectReason?.trim() || "관리자에 의해 거절되었습니다.";
}

export const OWNER_SIGNUP_EDIT_DRAFT_KEY = "owner_signup_edit_draft_v1";

export type OwnerSignupEditDraft = {
  storeName: string;
  email: string;
  phone: string;
  pin: string;
  address: string;
  storeImage: string;
  marketId: OwnerSignupMarketId;
};

export function saveOwnerSignupEditDraft(app: OwnerSignupApplication) {
  const draft: OwnerSignupEditDraft = {
    storeName: app.storeName,
    email: app.email,
    phone: app.phone,
    pin: app.pin,
    address: app.address,
    storeImage: app.storeImage,
    marketId: app.marketId,
  };
  sessionStorage.setItem(OWNER_SIGNUP_EDIT_DRAFT_KEY, JSON.stringify(draft));
}

export function consumeOwnerSignupEditDraft(): OwnerSignupEditDraft | null {
  try {
    const raw = sessionStorage.getItem(OWNER_SIGNUP_EDIT_DRAFT_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(OWNER_SIGNUP_EDIT_DRAFT_KEY);
    return JSON.parse(raw) as OwnerSignupEditDraft;
  } catch {
    sessionStorage.removeItem(OWNER_SIGNUP_EDIT_DRAFT_KEY);
    return null;
  }
}

export function findApprovedSignupByPhone(phone: string): OwnerSignupApplication | null {
  const phoneDigits = phone.replace(/\D/g, "");
  return (
    loadOwnerSignupApplications()
      .filter(
        (item) =>
          item.phone.replace(/\D/g, "") === phoneDigits &&
          item.status === "approved" &&
          item.approvedStoreId != null,
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null
  );
}

export function submitOwnerSignupApplication(input: {
  storeName: string;
  email: string;
  phone: string;
  pin: string;
  address: string;
  storeImage: string;
  marketId?: OwnerSignupMarketId;
}): OwnerSignupApplication {
  const applications = loadOwnerSignupApplications();
  const phoneDigits = input.phone.replace(/\D/g, "");
  // 동일 전화번호는 기존 행 id를 재사용 (phone UNIQUE + 새 id INSERT 실패 방지)
  const existingSamePhone = applications.find(
    (item) => item.phone.replace(/\D/g, "") === phoneDigits,
  );
  const application: OwnerSignupApplication = {
    id: existingSamePhone?.id ?? nextSignupApplicationId(),
    storeName: input.storeName.trim(),
    email: input.email.trim(),
    phone: phoneDigits,
    pin: input.pin,
    address: input.address.trim(),
    storeImage: input.storeImage,
    marketId: input.marketId ?? "jungang",
    status: "pending",
    createdAt: new Date().toISOString(),
    rejectReason: undefined,
    approvedStoreId: undefined,
  };
  // 같은 번호의 이전 승인/거절/대기 행은 교체 (approved를 남겨 pending이 merge에서 사라지지 않게)
  const next = applications.filter(
    (item) => item.phone.replace(/\D/g, "") !== phoneDigits,
  );
  next.push(application);
  persistOwnerSignupApplications(next);
  void import("./ownerSignupApplicationsSync").then(({ upsertOwnerSignupApplicationRemote }) =>
    upsertOwnerSignupApplicationRemote(application),
  );
  return application;
}

/** 원격 upsert까지 기다림 — 모바일 신청 직후 관리자 연동용 */
export async function submitOwnerSignupApplicationAndSync(input: {
  storeName: string;
  email: string;
  phone: string;
  pin: string;
  address: string;
  storeImage: string;
  marketId?: OwnerSignupMarketId;
}): Promise<{ application: OwnerSignupApplication; synced: boolean }> {
  const application = submitOwnerSignupApplication(input);
  const { upsertOwnerSignupApplicationRemote } = await import("./ownerSignupApplicationsSync");
  const synced = await upsertOwnerSignupApplicationRemote(application);
  return { application, synced };
}

export function updateOwnerSignupApplication(
  id: number,
  patch: Partial<Pick<OwnerSignupApplication, "status" | "rejectReason" | "approvedStoreId">>,
) {
  const next = loadOwnerSignupApplications().map((item) =>
    item.id === id ? { ...item, ...patch } : item,
  );
  persistOwnerSignupApplications(next);
  const updated = next.find((item) => item.id === id);
  if (updated) {
    void import("./ownerSignupApplicationsSync").then(({ upsertOwnerSignupApplicationRemote }) =>
      upsertOwnerSignupApplicationRemote(updated),
    );
  }
  return next;
}

export function findSignupApplicationById(id: number): OwnerSignupApplication | null {
  return loadOwnerSignupApplications().find((item) => item.id === id) ?? null;
}

export function approveOwnerSignupApplication(
  application: OwnerSignupApplication,
  approvedStoreId: number,
): OwnerSignupApplication[] {
  const phoneDigits = application.phone.replace(/\D/g, "");
  const next = loadOwnerSignupApplications().map((item) => {
    if (item.id === application.id) {
      return { ...item, status: "approved" as const, approvedStoreId, rejectReason: undefined };
    }
    if (item.phone.replace(/\D/g, "") === phoneDigits && item.status === "pending") {
      return { ...item, status: "approved" as const, approvedStoreId, rejectReason: undefined };
    }
    return item;
  });
  persistOwnerSignupApplications(next);
  const updated =
    next.find((item) => item.id === application.id)
    ?? next.find((item) => item.phone.replace(/\D/g, "") === phoneDigits && item.status === "approved");
  if (updated) {
    void import("./ownerSignupApplicationsSync").then(({ upsertOwnerSignupApplicationRemote }) =>
      upsertOwnerSignupApplicationRemote(updated),
    );
  }
  return next;
}

export function deleteOwnerSignupApplicationsByPhone(phone: string) {
  const phoneDigits = phone.replace(/\D/g, "");
  persistOwnerSignupApplications(
    loadOwnerSignupApplications().filter(
      (item) => item.phone.replace(/\D/g, "") !== phoneDigits,
    ),
  );
}

export const OWNER_SIGNUP_MARKET_LABELS: Record<OwnerSignupMarketId, string> = {
  jungang: "천안중앙시장",
  byeongcheon: "천안역전시장",
  seonghwan: "성환시장",
};
