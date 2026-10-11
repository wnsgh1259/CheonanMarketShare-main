import { loadSharedOwnerDraftById, saveSharedOwnerDraftById } from "./ownerSharedStore";

/** 관리자에서 삭제한 상점 id — 로컬 + Supabase(owner_dashboard_state) 동기화 */
export const DELETED_STORE_IDS_KEY = "admin-deleted-store-ids";
const REMOTE_ID = "deleted_store_ids";

export type DeletedStoreIdsState = {
  ids: number[];
  updatedAt: string;
};

function normalizeIds(ids: unknown): number[] {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.filter((n): n is number => typeof n === "number" && Number.isFinite(n)))].sort(
    (a, b) => a - b,
  );
}

export function loadDeletedStoreIdsState(): DeletedStoreIdsState {
  try {
    const raw = localStorage.getItem(DELETED_STORE_IDS_KEY);
    if (!raw) return { ids: [], updatedAt: "" };
    const parsed = JSON.parse(raw) as unknown;
    // 예전 포맷: number[]
    if (Array.isArray(parsed)) {
      return { ids: normalizeIds(parsed), updatedAt: "" };
    }
    if (parsed && typeof parsed === "object") {
      const obj = parsed as { ids?: unknown; updatedAt?: unknown };
      return {
        ids: normalizeIds(obj.ids),
        updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : "",
      };
    }
  } catch {
    // ignore
  }
  return { ids: [], updatedAt: "" };
}

export function loadAdminDeletedStoreIds(): Set<number> {
  return new Set(loadDeletedStoreIdsState().ids);
}

export function saveDeletedStoreIdsState(state: DeletedStoreIdsState): DeletedStoreIdsState {
  const next: DeletedStoreIdsState = {
    ids: normalizeIds(state.ids),
    updatedAt: state.updatedAt || new Date().toISOString(),
  };
  localStorage.setItem(DELETED_STORE_IDS_KEY, JSON.stringify(next));
  void saveSharedOwnerDraftById(REMOTE_ID, next);
  return next;
}

export function setDeletedStoreIds(ids: Iterable<number>): DeletedStoreIdsState {
  return saveDeletedStoreIdsState({
    ids: [...ids],
    updatedAt: new Date().toISOString(),
  });
}

export function markStoreDeleted(id: number): DeletedStoreIdsState {
  const cur = loadDeletedStoreIdsState();
  if (cur.ids.includes(id)) {
    return saveDeletedStoreIdsState({ ...cur, updatedAt: new Date().toISOString() });
  }
  return setDeletedStoreIds([...cur.ids, id]);
}

export function unmarkStoreDeleted(id: number): DeletedStoreIdsState {
  const cur = loadDeletedStoreIdsState();
  if (!cur.ids.includes(id)) return cur;
  return setDeletedStoreIds(cur.ids.filter((x) => x !== id));
}

function parseRemoteState(payload: unknown): DeletedStoreIdsState | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as { ids?: unknown; updatedAt?: unknown };
  if (!Array.isArray(obj.ids)) return null;
  return {
    ids: normalizeIds(obj.ids),
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : "",
  };
}

function mergeDeletedStates(
  local: DeletedStoreIdsState,
  remote: DeletedStoreIdsState,
): DeletedStoreIdsState {
  const lt = Date.parse(local.updatedAt) || 0;
  const rt = Date.parse(remote.updatedAt) || 0;
  if (rt > lt) return remote;
  if (lt > rt) return local;
  // 시각이 같거나 비어 있으면 합집합(삭제가 빠지지 않게)
  return {
    ids: normalizeIds([...local.ids, ...remote.ids]),
    updatedAt: local.updatedAt || remote.updatedAt || new Date().toISOString(),
  };
}

/** 원격·로컬 삭제 목록을 맞춘다. 폰/PC 교차 테스트용. */
export async function refreshDeletedStoreIdsFromRemote(): Promise<Set<number>> {
  const local = loadDeletedStoreIdsState();
  const remotePayload = await loadSharedOwnerDraftById(REMOTE_ID);
  const remote = parseRemoteState(remotePayload);

  if (!remote) {
    if (local.ids.length > 0) {
      const saved = saveDeletedStoreIdsState({
        ...local,
        updatedAt: local.updatedAt || new Date().toISOString(),
      });
      return new Set(saved.ids);
    }
    return new Set(local.ids);
  }

  const merged = mergeDeletedStates(local, remote);
  localStorage.setItem(DELETED_STORE_IDS_KEY, JSON.stringify(merged));

  const lt = Date.parse(local.updatedAt) || 0;
  const rt = Date.parse(remote.updatedAt) || 0;
  if (lt > rt || (lt === rt && merged.ids.length !== remote.ids.length) || (!remote.updatedAt && merged.ids.length)) {
    void saveSharedOwnerDraftById(REMOTE_ID, merged);
  }

  return new Set(merged.ids);
}
