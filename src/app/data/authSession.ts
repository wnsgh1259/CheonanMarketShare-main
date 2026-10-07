import { ADMIN_PHONE, ADMIN_PIN, matchesAdminCredentials, loadStoreAccountsMap, type StoreAccountRecord } from "./adminAccount";
import {
  findPendingSignupByPhone,
  findRejectedSignupByPhone,
  getSignupRejectReason,
} from "./ownerSignupApplications";
import { findRegisteredUserByPhone, type RegisteredUser } from "./userAccounts";

export type UserRole = "guest" | "customer" | "owner" | "admin";

export type AuthSession = {
  role: UserRole;
  phone: string;
  name: string;
  email: string;
  status: RegisteredUser["status"] | "active";
  storeId: number | null;
  storeName: string;
};

const EMPTY_SESSION: AuthSession = {
  role: "guest",
  phone: "",
  name: "",
  email: "",
  status: "active",
  storeId: null,
  storeName: "",
};

export function readAuthSession(): AuthSession {
  const role = (localStorage.getItem("user_role") as UserRole) || "guest";
  const storeIdRaw = localStorage.getItem("owner_store_id");
  const storeId = storeIdRaw ? Number(storeIdRaw) : null;
  return {
    role: role === "admin" || role === "owner" || role === "customer" ? role : "guest",
    phone: localStorage.getItem("user_phone") || "",
    name: localStorage.getItem("user_name") || "",
    email: localStorage.getItem("user_email") || "",
    status: (localStorage.getItem("user_status") as AuthSession["status"]) || "active",
    storeId: Number.isFinite(storeId) ? storeId : null,
    storeName:
      localStorage.getItem("owner_current_store_name")
      || localStorage.getItem("owner_approved_store_name")
      || "",
  };
}

export function writeAuthSession(session: AuthSession, pin?: string) {
  localStorage.setItem("user_role", session.role);
  localStorage.setItem("user_phone", session.phone);
  localStorage.setItem("user_name", session.name);
  localStorage.setItem("user_email", session.email);
  localStorage.setItem("user_status", session.status);
  if (pin) localStorage.setItem("user_pin", pin);

  if (session.storeId != null) {
    localStorage.setItem("owner_store_id", String(session.storeId));
  } else {
    localStorage.removeItem("owner_store_id");
  }

  if (session.storeName) {
    localStorage.setItem("owner_current_store_name", session.storeName);
    localStorage.setItem("owner_approved_store_name", session.storeName);
  } else {
    localStorage.removeItem("owner_current_store_name");
    localStorage.removeItem("owner_approved_store_name");
  }
}

export function clearAuthSession() {
  [
    "user_role",
    "user_phone",
    "user_pin",
    "user_name",
    "user_email",
    "user_status",
    "owner_store_id",
    "owner_current_store_name",
    "owner_approved_store_name",
  ].forEach((key) => localStorage.removeItem(key));
}

export type LoginResult =
  | { ok: true; redirect: string }
  | {
      ok: false;
      error: string;
      status?: "pending" | "rejected";
      rejectReason?: string;
    };

function buildPendingResult(): LoginResult {
  return {
    ok: false,
    error: "가입 승인 대기중입니다. 영업일 기준 1일 이내 처리됩니다.",
    status: "pending",
  };
}

function buildRejectionResult(phoneDigits: string): LoginResult {
  return {
    ok: false,
    error: "가입 신청이 거절되었습니다.",
    status: "rejected",
    rejectReason: getSignupRejectReason(phoneDigits),
  };
}

function findStoreAccount(phoneDigits: string, pin: string): StoreAccountRecord | null {
  const accounts = Object.values(loadStoreAccountsMap());
  return accounts.find((item) => item.phone.replace(/\D/g, "") === phoneDigits && item.pin === pin) ?? null;
}

export function loginWithCredentials(phoneDigits: string, pin: string): LoginResult {
  if (matchesAdminCredentials(phoneDigits, pin)) {
    writeAuthSession({
      role: "admin",
      phone: ADMIN_PHONE,
      name: "관리자",
      email: "",
      status: "active",
      storeId: null,
      storeName: "",
    }, pin);
    return { ok: true, redirect: "/admin" };
  }

  const storeAccount = findStoreAccount(phoneDigits, pin);
  if (storeAccount) {
    writeAuthSession({
      role: "owner",
      phone: phoneDigits,
      name: storeAccount.storeName,
      email: "",
      status: "active",
      storeId: storeAccount.storeId,
      storeName: storeAccount.storeName,
    }, pin);
    return { ok: true, redirect: "/owner/store-registration" };
  }

  const registeredUser = findRegisteredUserByPhone(phoneDigits);
  if (registeredUser && registeredUser.pin === pin) {
    if (registeredUser.role === "owner") {
      const pendingApp = findPendingSignupByPhone(phoneDigits);
      const rejectedApp = findRejectedSignupByPhone(phoneDigits);
      if (pendingApp || registeredUser.status === "pending") {
        return buildPendingResult();
      }
      if (rejectedApp || registeredUser.status === "rejected") {
        return buildRejectionResult(phoneDigits);
      }
      writeAuthSession({
        role: "owner",
        phone: phoneDigits,
        name: registeredUser.name,
        email: registeredUser.email,
        status: registeredUser.status,
        storeId: null,
        storeName: registeredUser.name,
      }, pin);
      return { ok: true, redirect: "/owner/store-registration" };
    }

    writeAuthSession({
      role: "customer",
      phone: phoneDigits,
      name: registeredUser.name,
      email: registeredUser.email,
      status: registeredUser.status,
      storeId: null,
      storeName: "",
    }, pin);
    return { ok: true, redirect: "/home" };
  }

  return { ok: false, error: "휴대폰 번호 또는 PIN이 올바르지 않습니다." };
}

export function loginAsRegisteredUser(user: RegisteredUser): LoginResult {
  const phoneDigits = user.phone.replace(/\D/g, "");
  if (!user.pin) {
    return { ok: false, error: "PIN이 설정되지 않은 계정입니다." };
  }

  if (user.role === "owner") {
    const pendingApp = findPendingSignupByPhone(phoneDigits);
    const rejectedApp = findRejectedSignupByPhone(phoneDigits);
    if (pendingApp || user.status === "pending") {
      return buildPendingResult();
    }
    if (rejectedApp || user.status === "rejected") {
      return buildRejectionResult(phoneDigits);
    }
    writeAuthSession(
      {
        role: "owner",
        phone: phoneDigits,
        name: user.name,
        email: user.email,
        status: user.status,
        storeId: null,
        storeName: user.name,
      },
      user.pin,
    );
    return { ok: true, redirect: "/owner/store-registration" };
  }

  if (user.role === "customer") {
    writeAuthSession(
      {
        role: "customer",
        phone: phoneDigits,
        name: user.name,
        email: user.email,
        status: user.status === "pending" || user.status === "rejected" ? user.status : "active",
        storeId: null,
        storeName: "",
      },
      user.pin,
    );
    return { ok: true, redirect: "/home" };
  }

  return { ok: false, error: "지원하지 않는 계정 유형입니다." };
}

export function loginAsAdminShortcut(): LoginResult {
  return loginWithCredentials(ADMIN_PHONE, "0000");
}

const GUEST_ACCOUNT_KEY = "guest_customer_account";

/** 비회원 손님 실험 계정. 한 번 만들면 이 기기에 저장하고, 버튼을 다시 눌러도 같은 아이디로 들어온다. */
export function ensureGuestCustomer(): { id: string; name: string } {
  try {
    const raw = localStorage.getItem(GUEST_ACCOUNT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { id?: string; name?: string };
      if (parsed.id) return { id: parsed.id, name: parsed.name || "손님" };
    }
  } catch {
    // 저장된 값이 깨졌으면 새로 만든다.
  }
  const existing = localStorage.getItem("guest_reward_id");
  const id = existing?.startsWith("guest-")
    ? existing
    : `guest-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const account = { id, name: "손님" };
  localStorage.setItem(GUEST_ACCOUNT_KEY, JSON.stringify(account));
  return account;
}

export function loginAsGuest(): LoginResult {
  const account = ensureGuestCustomer();
  writeAuthSession({
    role: "customer",
    phone: account.id,
    name: account.name,
    email: "",
    status: "active",
    storeId: null,
    storeName: "",
  });
  localStorage.setItem("guest_reward_id", account.id);
  return { ok: true, redirect: "/home" };
}

export function isAdminSession(session: AuthSession = readAuthSession()) {
  return session.role === "admin" && session.phone.replace(/\D/g, "") === ADMIN_PHONE;
}

export function isOwnerSession(session: AuthSession = readAuthSession()) {
  return session.role === "owner" && session.status === "active";
}

const ADMIN_SESSION_BACKUP_KEY = "admin_session_backup";

export function backupAdminSessionForImpersonation() {
  const session = readAuthSession();
  if (session.role !== "admin") return;
  sessionStorage.setItem(ADMIN_SESSION_BACKUP_KEY, JSON.stringify(session));
}

export function restoreAdminSessionFromBackup(): boolean {
  const raw = sessionStorage.getItem(ADMIN_SESSION_BACKUP_KEY);
  if (!raw) return false;
  try {
    const session = JSON.parse(raw) as AuthSession;
    writeAuthSession(session, ADMIN_PIN);
    sessionStorage.removeItem(ADMIN_SESSION_BACKUP_KEY);
    return true;
  } catch {
    sessionStorage.removeItem(ADMIN_SESSION_BACKUP_KEY);
    return false;
  }
}

export function setAdminStorePreviewContext(storeId: number, storeName: string) {
  localStorage.setItem("owner_store_id", String(storeId));
  localStorage.setItem("owner_current_store_name", storeName);
  localStorage.setItem("owner_approved_store_name", storeName);
}
