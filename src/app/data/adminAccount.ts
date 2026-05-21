export const ADMIN_PHONE = "01000000000";
export const ADMIN_PIN = "0000";
export const ADMIN_STORE_ACCOUNTS_KEY = "admin_store_accounts";

export type StoreAccountRecord = {
  storeId: number;
  storeName: string;
  phone: string;
  pin: string;
};

export function matchesAdminCredentials(phoneDigits: string, pin: string) {
  return phoneDigits.replace(/\D/g, "") === ADMIN_PHONE && pin === ADMIN_PIN;
}

export function isAdminSession() {
  return (
    localStorage.getItem("user_role") === "admin" &&
    (localStorage.getItem("user_phone") || "").replace(/\D/g, "") === ADMIN_PHONE
  );
}

export function setAdminSession() {
  localStorage.setItem("user_phone", ADMIN_PHONE);
  localStorage.setItem("user_pin", ADMIN_PIN);
  localStorage.setItem("user_name", "관리자");
  localStorage.setItem("user_role", "admin");
  localStorage.setItem("user_status", "active");
  localStorage.removeItem("owner_store_id");
  localStorage.removeItem("owner_current_store_name");
  localStorage.removeItem("owner_approved_store_name");
}

export function loadStoreAccountsMap(): Record<number, StoreAccountRecord> {
  try {
    const raw = localStorage.getItem(ADMIN_STORE_ACCOUNTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoreAccountRecord[];
    return Object.fromEntries(parsed.map((item) => [item.storeId, item]));
  } catch {
    return {};
  }
}

export function saveAllStoreAccounts(accounts: StoreAccountRecord[]) {
  localStorage.setItem(ADMIN_STORE_ACCOUNTS_KEY, JSON.stringify(accounts));
  void import("./storeAccountsSync").then(({ syncStoreAccountsToRemote }) => syncStoreAccountsToRemote(accounts));
}

function collectReservedPhones(extraPhones: string[] = []): Set<string> {
  const used = new Set<string>([ADMIN_PHONE, ...extraPhones.map((phone) => phone.replace(/\D/g, ""))]);
  try {
    const raw = localStorage.getItem(ADMIN_STORE_ACCOUNTS_KEY);
    if (raw) {
      (JSON.parse(raw) as StoreAccountRecord[]).forEach((item) => {
        used.add(item.phone.replace(/\D/g, ""));
      });
    }
  } catch {
    /* ignore */
  }
  return used;
}

function generateFromUsed(used: Set<string>): { phone: string; pin: string } {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const mid = String(Math.floor(1000 + Math.random() * 9000));
    const last = String(Math.floor(1000 + Math.random() * 9000));
    const phone = `010${mid}${last}`;
    if (!used.has(phone)) {
      used.add(phone);
      return { phone, pin: String(Math.floor(1000 + Math.random() * 9000)) };
    }
  }
  const fallback = `010${Date.now().toString().slice(-8)}`;
  used.add(fallback);
  return { phone: fallback, pin: String(Math.floor(1000 + Math.random() * 9000)) };
}

export function generateUniqueStoreCredentials(): { phone: string; pin: string } {
  return generateFromUsed(collectReservedPhones());
}

export function assignRandomStoreAccounts(stores: { id: number; name: string }[]): StoreAccountRecord[] {
  const used = collectReservedPhones();
  return stores.map((store) => {
    const creds = generateFromUsed(used);
    return {
      storeId: store.id,
      storeName: store.name,
      phone: creds.phone,
      pin: creds.pin,
    };
  });
}

export function needsStoreAccountBootstrap(
  stores: { id: number; name: string }[],
  accounts: Record<number, StoreAccountRecord>,
): boolean {
  const phones = new Set<string>();
  for (const store of stores) {
    const account = accounts[store.id];
    if (!account?.phone || !account?.pin) return true;
    const phone = account.phone.replace(/\D/g, "");
    if (!phone || phone === ADMIN_PHONE || phones.has(phone)) return true;
    phones.add(phone);
  }
  return false;
}

export function upsertStoreAccount(account: StoreAccountRecord) {
  try {
    const accounts = Object.values(loadStoreAccountsMap());
    const next = accounts.filter((item) => item.storeId !== account.storeId);
    next.push(account);
    saveAllStoreAccounts(next);
  } catch {
    /* ignore */
  }
}

export function formatPhoneDisplay(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return phone;
}
