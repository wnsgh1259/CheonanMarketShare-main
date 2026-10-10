import { supabase } from "./rewards";

export type SnsPromoStatus = "pending" | "posted" | "rejected";

export type SnsPromoRequest = {
  id: string;
  storeId: number | null;
  storeName: string;
  title: string;
  content: string;
  images: string[];
  status: SnsPromoStatus;
  link?: string;
  rejectReason?: string;
  createdAt: string;
  reviewedAt?: string;
};

const LOCAL_KEY = "sns_promo_requests_v1";
const REMOTE_ID = "sns_promo_requests";
const TABLE = "owner_dashboard_state";

function loadLocal(): SnsPromoRequest[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as SnsPromoRequest[]) : [];
  } catch {
    return [];
  }
}

function saveLocal(items: SnsPromoRequest[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
}

function merge(local: SnsPromoRequest[], remote: SnsPromoRequest[]) {
  const byId = new Map<string, SnsPromoRequest>();
  for (const item of remote) byId.set(item.id, item);
  for (const item of local) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      continue;
    }
    const localDone = item.status !== "pending";
    const remoteDone = existing.status !== "pending";
    if (localDone && !remoteDone) byId.set(item.id, item);
    else if (localDone && remoteDone && (item.reviewedAt ?? "") > (existing.reviewedAt ?? "")) byId.set(item.id, item);
  }
  return Array.from(byId.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function push(items: SnsPromoRequest[]) {
  const client = supabase();
  if (!client) return;
  await client.from(TABLE).upsert(
    { id: REMOTE_ID, payload: { items }, updated_at: new Date().toISOString() },
    { onConflict: "id" },
  );
}

export async function refreshSnsPromos(): Promise<SnsPromoRequest[]> {
  const local = loadLocal();
  const client = supabase();
  if (!client) return local;
  try {
    const { data, error } = await client.from(TABLE).select("payload").eq("id", REMOTE_ID).maybeSingle();
    if (error) return local;
    const remote = ((data?.payload as { items?: SnsPromoRequest[] } | null)?.items ?? []);
    const merged = merge(local, remote);
    saveLocal(merged);
    if (JSON.stringify(merged) !== JSON.stringify(remote)) void push(merged);
    return merged;
  } catch {
    return local;
  }
}

export function snsPromosForStore(items: SnsPromoRequest[], storeId: number | null, storeName: string) {
  return items.filter((item) => (storeId != null && item.storeId != null ? item.storeId === storeId : item.storeName === storeName));
}

export async function submitSnsPromo(input: Pick<SnsPromoRequest, "storeId" | "storeName" | "title" | "content" | "images">) {
  const item: SnsPromoRequest = {
    ...input,
    id: `sns-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  const next = [item, ...loadLocal()];
  saveLocal(next);
  await refreshSnsPromos();
  return item;
}

export async function reviewSnsPromo(id: string, result: { status: "posted"; link: string } | { status: "rejected"; reason: string }) {
  const items = await refreshSnsPromos();
  const next = items.map((item) => {
    if (item.id !== id || item.status !== "pending") return item;
    const reviewedAt = new Date().toISOString();
    return result.status === "posted"
      ? { ...item, status: "posted" as const, link: result.link.trim(), rejectReason: undefined, reviewedAt }
      : { ...item, status: "rejected" as const, rejectReason: result.reason.trim(), link: undefined, reviewedAt };
  });
  saveLocal(next);
  await push(next);
  return next;
}
