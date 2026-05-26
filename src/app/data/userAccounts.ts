export const REGISTERED_USERS_KEY = "registered_users";

export type RegisteredUser = {
  phone: string;
  pin: string;
  email: string;
  name: string;
  role: "customer" | "owner";
  status: "active" | "pending" | "rejected";
};

export function loadRegisteredUsers(): RegisteredUser[] {
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RegisteredUser[];
  } catch {
    return [];
  }
}

export function upsertRegisteredUser(user: RegisteredUser) {
  const users = loadRegisteredUsers().filter((item) => item.phone !== user.phone);
  users.push(user);
  persistRegisteredUsers(users);
}

export function persistRegisteredUsers(users: RegisteredUser[]) {
  localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
}

export function deleteRegisteredUser(phone: string) {
  const phoneDigits = phone.replace(/\D/g, "");
  persistRegisteredUsers(loadRegisteredUsers().filter((item) => item.phone !== phoneDigits));
}

export function updateRegisteredUserStatus(phone: string, status: RegisteredUser["status"]) {
  const phoneDigits = phone.replace(/\D/g, "");
  const users = loadRegisteredUsers();
  const target = users.find((item) => item.phone === phoneDigits);
  if (!target) return;
  upsertRegisteredUser({ ...target, status });
}

export function findRegisteredUserByPhoneDigits(phone: string): RegisteredUser | null {
  return loadRegisteredUsers().find((item) => item.phone === phone.replace(/\D/g, "")) ?? null;
}

export function updateRegisteredUserPhone(oldPhone: string, newPhone: string) {
  const oldDigits = oldPhone.replace(/\D/g, "");
  const newDigits = newPhone.replace(/\D/g, "");
  const users = loadRegisteredUsers().filter((item) => item.phone !== oldDigits);
  const existing = loadRegisteredUsers().find((item) => item.phone === oldDigits);
  if (existing) {
    users.push({ ...existing, phone: newDigits });
  }
  persistRegisteredUsers(users);
}

export function saveUserEmail(email: string, phoneDigits: string) {
  localStorage.setItem("user_email", email);
  const user = loadRegisteredUsers().find((item) => item.phone === phoneDigits);
  if (user) {
    upsertRegisteredUser({ ...user, email });
  }
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function findRegisteredUserByPhone(phone: string): RegisteredUser | null {
  const phoneDigits = phone.replace(/\D/g, "");
  const fromList = loadRegisteredUsers().find((item) => item.phone === phoneDigits);
  if (fromList) return fromList;

  const savedPhone = localStorage.getItem("user_phone");
  const savedEmail = localStorage.getItem("user_email");
  if (savedPhone === phoneDigits && savedEmail) {
    return {
      phone: savedPhone,
      pin: localStorage.getItem("user_pin") || "",
      email: savedEmail,
      name: localStorage.getItem("user_name") || "",
      role: (localStorage.getItem("user_role") as RegisteredUser["role"]) || "customer",
      status: (localStorage.getItem("user_status") as RegisteredUser["status"]) || "active",
    };
  }

  return null;
}
