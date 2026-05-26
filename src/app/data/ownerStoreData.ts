import {
  OWNER_DASHBOARD_STORAGE_KEY,
  loadSharedOwnerDraftById,
  saveSharedOwnerDraftById,
  type SharedDraftStore,
  type SharedFacility,
  type SharedOwnerMenu,
} from "./ownerSharedStore";

export const OWNER_DRAFT_MIGRATED_KEY = "owner-draft-migrated-v1";

export type OwnerStoreWorkspace = {
  menus: SharedOwnerMenu[];
  todayDeal?: string;
  news?: string;
  couponEvent?: string;
  reviewReply?: string;
  inquiryReply?: string;
};

export type OwnerDashboardCatalog = {
  stores: SharedDraftStore[];
  facilities?: SharedFacility[];
};

const CATALOG_REMOTE_ID = "catalog";
const LEGACY_CATALOG_REMOTE_ID = "global";

function emptyWorkspace(): OwnerStoreWorkspace {
  return {
    menus: [],
    todayDeal: "",
    news: "",
    couponEvent: "",
    reviewReply: "",
    inquiryReply: "",
  };
}

export function ownerStoreWorkspaceLocalKey(storeId: number) {
  return `owner-store-workspace-v1-${storeId}`;
}

export function ownerStoreWorkspaceRemoteId(storeId: number) {
  return `store_${storeId}`;
}

export function loadOwnerCatalog(): OwnerDashboardCatalog {
  try {
    const raw = localStorage.getItem(OWNER_DASHBOARD_STORAGE_KEY);
    if (!raw) return { stores: [], facilities: [] };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      stores: Array.isArray(parsed.stores) ? (parsed.stores as SharedDraftStore[]) : [],
      facilities: Array.isArray(parsed.facilities) ? (parsed.facilities as SharedFacility[]) : [],
    };
  } catch {
    return { stores: [], facilities: [] };
  }
}

export function saveOwnerCatalog(catalog: OwnerDashboardCatalog) {
  localStorage.setItem(
    OWNER_DASHBOARD_STORAGE_KEY,
    JSON.stringify({
      stores: catalog.stores ?? [],
      facilities: catalog.facilities ?? [],
    }),
  );
  void saveSharedOwnerDraftById(CATALOG_REMOTE_ID, catalog);
}

export async function loadOwnerCatalogRemote(): Promise<OwnerDashboardCatalog | null> {
  const catalog = await loadSharedOwnerDraftById(CATALOG_REMOTE_ID);
  if (catalog) {
    return {
      stores: catalog.stores ?? [],
      facilities: catalog.facilities ?? [],
    };
  }

  const legacy = await loadSharedOwnerDraftById(LEGACY_CATALOG_REMOTE_ID);
  if (!legacy) return null;

  return {
    stores: legacy.stores ?? [],
    facilities: legacy.facilities ?? [],
  };
}

export function loadOwnerStoreWorkspace(storeId: number): OwnerStoreWorkspace {
  try {
    const raw = localStorage.getItem(ownerStoreWorkspaceLocalKey(storeId));
    if (!raw) return emptyWorkspace();
    return { ...emptyWorkspace(), ...(JSON.parse(raw) as OwnerStoreWorkspace) };
  } catch {
    return emptyWorkspace();
  }
}

export function saveOwnerStoreWorkspace(storeId: number, workspace: OwnerStoreWorkspace) {
  localStorage.setItem(ownerStoreWorkspaceLocalKey(storeId), JSON.stringify(workspace));
  void saveSharedOwnerDraftById(ownerStoreWorkspaceRemoteId(storeId), workspace);
}

export async function loadOwnerStoreWorkspaceRemote(storeId: number): Promise<OwnerStoreWorkspace | null> {
  const remote = await loadSharedOwnerDraftById(ownerStoreWorkspaceRemoteId(storeId));
  if (!remote) return null;
  return { ...emptyWorkspace(), ...(remote as OwnerStoreWorkspace) };
}

export function migrateLegacyOwnerDraftIfNeeded() {
  if (localStorage.getItem(OWNER_DRAFT_MIGRATED_KEY) === "1") return;

  try {
    const raw = localStorage.getItem(OWNER_DASHBOARD_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(OWNER_DRAFT_MIGRATED_KEY, "1");
      return;
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const stores = Array.isArray(parsed.stores) ? (parsed.stores as SharedDraftStore[]) : [];
    const facilities = Array.isArray(parsed.facilities) ? (parsed.facilities as SharedFacility[]) : [];
    const legacyWorkspace: OwnerStoreWorkspace = {
      menus: Array.isArray(parsed.menus) ? (parsed.menus as SharedOwnerMenu[]) : [],
      todayDeal: typeof parsed.todayDeal === "string" ? parsed.todayDeal : "",
      news: typeof parsed.news === "string" ? parsed.news : "",
      couponEvent: typeof parsed.couponEvent === "string" ? parsed.couponEvent : "",
      reviewReply: typeof parsed.reviewReply === "string" ? parsed.reviewReply : "",
      inquiryReply: typeof parsed.inquiryReply === "string" ? parsed.inquiryReply : "",
    };

    saveOwnerCatalog({ stores, facilities });

    const hasLegacyWorkspace = Boolean(
      legacyWorkspace.menus.length ||
        legacyWorkspace.todayDeal ||
        legacyWorkspace.news ||
        legacyWorkspace.couponEvent ||
        legacyWorkspace.reviewReply ||
        legacyWorkspace.inquiryReply,
    );

    if (hasLegacyWorkspace) {
      for (const store of stores) {
        if (typeof store.id !== "number") continue;
        if (localStorage.getItem(ownerStoreWorkspaceLocalKey(store.id))) continue;
        saveOwnerStoreWorkspace(store.id, {
          ...legacyWorkspace,
          menus: legacyWorkspace.menus.length ? legacyWorkspace.menus : store.menus ?? [],
        });
      }
    }

    localStorage.setItem(OWNER_DRAFT_MIGRATED_KEY, "1");
  } catch {
    localStorage.setItem(OWNER_DRAFT_MIGRATED_KEY, "1");
  }
}

export function mergeOwnerCatalog(
  local: OwnerDashboardCatalog,
  remote: OwnerDashboardCatalog,
): OwnerDashboardCatalog {
  const storeById = new Map<number, SharedDraftStore>();
  for (const store of remote.stores ?? []) {
    storeById.set(store.id, store);
  }
  for (const store of local.stores ?? []) {
    const existing = storeById.get(store.id);
    storeById.set(store.id, existing ? { ...existing, ...store } : store);
  }

  const facilityById = new Map<number, SharedFacility>();
  for (const facility of remote.facilities ?? []) {
    facilityById.set(facility.id, facility);
  }
  for (const facility of local.facilities ?? []) {
    const existing = facilityById.get(facility.id);
    facilityById.set(facility.id, existing ? { ...existing, ...facility } : facility);
  }

  return {
    stores: Array.from(storeById.values()),
    facilities: Array.from(facilityById.values()),
  };
}

export async function refreshOwnerCatalogFromRemote(): Promise<OwnerDashboardCatalog> {
  const local = loadOwnerCatalog();
  const remote = await loadOwnerCatalogRemote();
  if (!remote) return local;
  const merged = mergeOwnerCatalog(local, remote);
  saveOwnerCatalog(merged);
  return merged;
}

export function upsertCatalogStore(store: SharedDraftStore) {
  const catalog = loadOwnerCatalog();
  const stores = catalog.stores.some((item) => item.id === store.id)
    ? catalog.stores.map((item) => (item.id === store.id ? { ...item, ...store } : item))
    : [...catalog.stores, store];
  saveOwnerCatalog({ ...catalog, stores });
}
