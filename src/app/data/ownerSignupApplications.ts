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
}

function nextSignupApplicationId(applications: OwnerSignupApplication[]) {
  const maxId = applications.reduce((max, item) => Math.max(max, item.id), 0);
  return maxId + 1;
}

export function findPendingSignupByPhone(phone: string): OwnerSignupApplication | null {
  const phoneDigits = phone.replace(/\D/g, "");
  return (
    loadOwnerSignupApplications().find(
      (item) => item.phone.replace(/\D/g, "") === phoneDigits && item.status === "pending",
    ) ?? null
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
  const application: OwnerSignupApplication = {
    id: nextSignupApplicationId(applications),
    storeName: input.storeName.trim(),
    email: input.email.trim(),
    phone: phoneDigits,
    pin: input.pin,
    address: input.address.trim(),
    storeImage: input.storeImage,
    marketId: input.marketId ?? "jungang",
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  const next = applications.filter((item) => item.phone.replace(/\D/g, "") !== phoneDigits);
  next.push(application);
  persistOwnerSignupApplications(next);
  return application;
}

export function updateOwnerSignupApplication(
  id: number,
  patch: Partial<Pick<OwnerSignupApplication, "status" | "rejectReason" | "approvedStoreId">>,
) {
  const next = loadOwnerSignupApplications().map((item) =>
    item.id === id ? { ...item, ...patch } : item,
  );
  persistOwnerSignupApplications(next);
  return next;
}

export const OWNER_SIGNUP_MARKET_LABELS: Record<OwnerSignupMarketId, string> = {
  jungang: "천안중앙시장",
  byeongcheon: "천안역전시장",
  seonghwan: "성환시장",
};
