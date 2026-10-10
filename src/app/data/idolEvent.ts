import defaults from "./idolEventDefaults.json";
import {
  addMileage,
  loadIdolProgress,
  rewardUserId,
  saveIdolProgress,
  supabase,
} from "./rewards";

export type IdolStage = {
  hint: string;
  question: string;
  code: string;
  answer: string;
};

export type IdolTicket = { id: string; userId: string; name: string; at: string };
export type IdolWinner = IdolTicket & { drawnAt: string };

type IdolRemote = {
  config?: { stages: IdolStage[]; updatedAt: string };
  tickets?: IdolTicket[];
  winner?: IdolWinner | null;
};

export const IDOL = defaults.character;
export const IDOL_REWARD_POINTS = defaults.rewardPoints;
export const IDOL_STAGE_COUNT = defaults.stages.length;
export const IDOL_VOICE = defaults.voice as Record<string, string>;
export const IDOL_DEFAULT_STAGES = defaults.stages as IdolStage[];

const EVENT_ID = "idol-market-1";
const CONFIG_KEY = "idol_event_config_v1";
const TICKETS_KEY = "idol_event_tickets_v1";
const WINNER_KEY = "idol_event_winner_v1";
const REMOTE_ID = "idol_event";
const TABLE = "owner_dashboard_state";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadIdolConfig(): { stages: IdolStage[]; updatedAt: string } {
  const saved = readJson<{ stages?: IdolStage[]; updatedAt?: string }>(CONFIG_KEY, {});
  const stages = IDOL_DEFAULT_STAGES.map((base, index) => ({ ...base, ...(saved.stages?.[index] ?? {}) }));
  return { stages, updatedAt: saved.updatedAt ?? "" };
}

export function loadIdolTickets(): IdolTicket[] {
  return readJson<IdolTicket[]>(TICKETS_KEY, []);
}

export function loadIdolWinner(): IdolWinner | null {
  return readJson<IdolWinner | null>(WINNER_KEY, null);
}

export function myIdolTicketCount() {
  const userId = rewardUserId();
  return loadIdolTickets().filter((ticket) => ticket.userId === userId).length;
}

function normalizeAnswer(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

export function checkIdolCode(stage: IdolStage, input: string) {
  return input.replace(/\D/g, "") === stage.code.replace(/\D/g, "");
}

/** 정답은 쉼표로 여러 개를 허용한다. */
export function checkIdolAnswer(stage: IdolStage, input: string) {
  const typed = normalizeAnswer(input);
  if (!typed) return false;
  return stage.answer.split(",").some((item) => normalizeAnswer(item) === typed);
}

export function advanceIdolStage(current: number) {
  const progress = loadIdolProgress();
  if (progress.stage !== current || current >= IDOL_STAGE_COUNT) return progress;
  const next = { ...progress, stage: current + 1 };
  saveIdolProgress(next);
  return next;
}

/** 전 단계를 통과했을 때 포인트와 추첨권을 한 번만 지급한다. */
export function claimIdolReward() {
  const progress = loadIdolProgress();
  if (progress.stage < IDOL_STAGE_COUNT || progress.claimed) return null;
  saveIdolProgress({ ...progress, claimed: true });
  const userId = rewardUserId();
  addMileage(IDOL_REWARD_POINTS, `아이돌 시장 미션 완료 · ${IDOL.name}`, `${EVENT_ID}-${userId}`);
  const ticket: IdolTicket = {
    id: `${EVENT_ID}-ticket-${userId}`,
    userId,
    name: localStorage.getItem("user_name") || "손님",
    at: new Date().toISOString(),
  };
  const tickets = loadIdolTickets();
  if (!tickets.some((item) => item.id === ticket.id)) {
    localStorage.setItem(TICKETS_KEY, JSON.stringify([ticket, ...tickets]));
  }
  void refreshIdolEvent();
  return { points: IDOL_REWARD_POINTS, ticket };
}

function mergeTickets(a: IdolTicket[], b: IdolTicket[]) {
  const byId = new Map<string, IdolTicket>();
  for (const item of [...b, ...a]) byId.set(item.id, item);
  return Array.from(byId.values()).sort((x, y) => y.at.localeCompare(x.at));
}

function writeLocal(config: { stages: IdolStage[]; updatedAt: string }, tickets: IdolTicket[], winner: IdolWinner | null) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
  localStorage.setItem(WINNER_KEY, JSON.stringify(winner));
}

let chain: Promise<void> = Promise.resolve();

async function syncOnce(override?: { config?: { stages: IdolStage[]; updatedAt: string }; winner?: IdolWinner | null }) {
  const client = supabase();
  const localConfig = override?.config ?? loadIdolConfig();
  const localTickets = loadIdolTickets();
  const localWinner = override && "winner" in override ? override.winner ?? null : loadIdolWinner();
  if (!client) {
    writeLocal(localConfig, localTickets, localWinner);
    return;
  }
  const { data, error } = await client.from(TABLE).select("payload").eq("id", REMOTE_ID).maybeSingle();
  if (error) {
    writeLocal(localConfig, localTickets, localWinner);
    return;
  }
  const remote = (data?.payload ?? {}) as IdolRemote;
  const remoteConfig = remote.config;
  const config = remoteConfig && remoteConfig.updatedAt > localConfig.updatedAt
    ? { stages: IDOL_DEFAULT_STAGES.map((base, index) => ({ ...base, ...(remoteConfig.stages?.[index] ?? {}) })), updatedAt: remoteConfig.updatedAt }
    : localConfig;
  const tickets = mergeTickets(localTickets, remote.tickets ?? []);
  const remoteWinner = remote.winner ?? null;
  const winner = (localWinner?.drawnAt ?? "") >= (remoteWinner?.drawnAt ?? "") ? localWinner : remoteWinner;
  writeLocal(config, tickets, winner);

  const next: IdolRemote = { config, tickets, winner };
  if (JSON.stringify(next) !== JSON.stringify({ config: remote.config, tickets: remote.tickets ?? [], winner: remote.winner ?? null })) {
    await client.from(TABLE).upsert({ id: REMOTE_ID, payload: next, updated_at: new Date().toISOString() }, { onConflict: "id" });
  }
}

export function refreshIdolEvent(override?: Parameters<typeof syncOnce>[0]): Promise<void> {
  chain = chain.then(() => syncOnce(override)).catch(() => undefined);
  return chain;
}

export async function saveIdolConfig(stages: IdolStage[]) {
  await refreshIdolEvent({ config: { stages, updatedAt: new Date().toISOString() } });
}

export async function drawIdolWinner() {
  await refreshIdolEvent();
  const tickets = loadIdolTickets();
  if (tickets.length === 0) return null;
  const picked = tickets[Math.floor(Math.random() * tickets.length)];
  const winner: IdolWinner = { ...picked, drawnAt: new Date().toISOString() };
  await refreshIdolEvent({ winner });
  return winner;
}
