import { ADMIN_PHONE, matchesAdminCredentials, loadStoreAccountsMap, type StoreAccountRecord } from "./adminAccount";
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
  | { ok: false; error: string };

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
      if (registeredUser.status === "pending") {
        return { ok: false, error: "가입 승인 대기중입니다. 영업일 기준 1일 이내 처리됩니다." };
      }
      if (registeredUser.status === "rejected") {
        return { ok: false, error: "가입 신청이 거절되었습니다. 고객센터에 문의해주세요." };
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

export function loginAsAdminShortcut(): LoginResult {
  return loginWithCredentials(ADMIN_PHONE, "0000");
}

export function loginAsGuest(): LoginResult {
  clearAuthSession();
  localStorage.setItem("user_role", "guest");
  return { ok: true, redirect: "/home" };
}

export function isAdminSession(session: AuthSession = readAuthSession()) {
  return session.role === "admin" && session.phone.replace(/\D/g, "") === ADMIN_PHONE;
}

export function isOwnerSession(session: AuthSession = readAuthSession()) {
  return session.role === "owner" && session.status === "active";
}
