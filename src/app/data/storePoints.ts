import { supabase, type PointEntry } from "./rewards";

const LOCAL_KEY = "store_points_ledger_v1";
const REMOTE_PREFIX = "store_points_";
const TABLE = "owner_dashboard_state";
const LEDGER_LIMIT = 500;

function readAll(): Record<string, PointEntry[]> {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as Record<string, PointEntry[]>) : {};
  } catch {
    return {};
  }
}

function writeLedger(storeId: number, ledger: PointEntry[]) {
  const all = readAll();
  all[String(storeId)] = ledger;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
}

export function loadStoreLedger(storeId: number): PointEntry[] {
  return readAll()[String(storeId)] ?? [];
}

export function readStoreBalance(storeId: number) {
  return loadStoreLedger(storeId).reduce((sum, entry) => sum + entry.points, 0);
}

function mergeLedgers(a: PointEntry[], b: PointEntry[]) {
  const byId = new Map<string, PointEntry>();
  for (const entry of [...b, ...a]) byId.set(entry.id, entry);
  return Array.from(byId.values())
    .sort((x, y) => y.at.localeCompare(x.at) || x.id.localeCompare(y.id))
    .slice(0, LEDGER_LIMIT);
}

let chain: Promise<void> = Promise.resolve();

async function syncOnce(storeId: number) {
  const client = supabase();
  if (!client) return;
  const id = `${REMOTE_PREFIX}${storeId}`;
  const { data, error } = await client.from(TABLE).select("payload").eq("id", id).maybeSingle();
  if (error) return;
  const remote = ((data?.payload as { ledger?: PointEntry[] } | null)?.ledger ?? []);
  const merged = mergeLedgers(loadStoreLedger(storeId), remote);
  writeLedger(storeId, merged);
  if (JSON.stringify(mergeLedgers([], remote)) === JSON.stringify(merged)) return;
  await client.from(TABLE).upsert({ id, payload: { ledger: merged }, updated_at: new Date().toISOString() }, { onConflict: "id" });
}

/** 가게 포인트 내역을 서버와 합친다. 실패해도 기기 안 내역은 그대로 쓴다. */
export function syncStorePoints(storeId: number) {
  chain = chain.then(() => syncOnce(storeId)).catch(() => undefined);
  return chain;
}

/** 가게에 포인트를 넣는다. entryId가 같으면 한 번만 들어간다. */
export async function creditStore(storeId: number, amount: number, label: string, entryId: string) {
  const ledger = loadStoreLedger(storeId);
  if (amount !== 0 && !ledger.some((entry) => entry.id === entryId)) {
    const entry: PointEntry = { id: entryId, at: new Date().toISOString(), label, points: amount };
    writeLedger(storeId, mergeLedgers([entry], ledger));
  }
  await syncStorePoints(storeId);
}
