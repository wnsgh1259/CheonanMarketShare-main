import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ParkingSquare, Armchair, Toilet, Info, Package, Music, Trash2, Settings } from "lucide-react";
import { loadRegisteredUsers, REGISTERED_USERS_KEY, updateRegisteredUserStatus } from "../data/userAccounts";
import { assignRandomStoreAccounts, loadStoreAccountsMap, needsStoreAccountBootstrap, saveAllStoreAccounts, upsertStoreAccount, type StoreAccountRecord } from "../data/adminAccount";
import { loadStoreAccountsFromRemote, saveStoreAccountsLocally } from "../data/storeAccountsSync";
import {
  loadOwnerSignupApplications,
  OWNER_SIGNUP_MARKET_LABELS,
  updateOwnerSignupApplication,
  type OwnerSignupApplication,
} from "../data/ownerSignupApplications";
import { refreshOwnerSignupApplicationsFromRemote } from "../data/ownerSignupApplicationsSync";

const FACILITY_COLOR_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  "#448AFF": ParkingSquare,
  "#4CAF50": Armchair,
  "#FFC107": Toilet,
  "#FF5252": Info,
  "#9C27B0": Package,
  "#FF9800": Music,
};
import { Link, useNavigate, useSearchParams } from "react-router";
import { AdminPreviewMap, type AdminPreviewStorePin } from "../components/AdminPreviewMap";
import { STORES_BY_MARKET, type StoreData } from "../data/storeData";
import { SEED_MARKET_ORDER, syntheticSeedStoreId } from "../data/seedStoreIds";
import { MARKET_VIEW_CONFIG, pickStoreDisplayLatLng } from "../map/storeMapPlacement";
import {
  OWNER_EDIT_STORE_KEY,
  OWNER_EDIT_FACILITY_KEY,
} from "../data/ownerSharedStore";
import {
  loadOwnerCatalog,
  loadOwnerCatalogRemote,
  saveOwnerCatalog,
  upsertCatalogStore,
  migrateLegacyOwnerDraftIfNeeded,
  saveOwnerStoreWorkspace,
} from "../data/ownerStoreData";

type DraftStore = {
  id: number;
  name: string;
  category: string;
  location: string;
  hours?: string;
  phone: string;
  description: string;
  lat: number;
  lng: number;
  marketId?: MarketId;
  image?: string;
  menus?: OwnerMenu[];
  mx?: number;
  my?: number;
};

type MarketId = "jungang" | "byeongcheon" | "seonghwan";

type OwnerMenu = {
  id: number;
  name: string;
  price: string;
  photoName: string;
};

type OwnerDashboardDraft = {
  stores: DraftStore[];
  facilities?: DraftFacility[];
  menus?: OwnerMenu[];
  todayDeal?: string;
  news?: string;
  couponEvent?: string;
  reviewReply?: string;
  inquiryReply?: string;
};

type DraftFacility = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  color: string;
  size?: number;
  hours?: string;
  image?: string;
  marketId?: MarketId;
};

const MARKET_BUTTONS: Array<{ id: MarketId; label: string }> = [
  { id: "jungang", label: "천안중앙시장" },
  { id: "byeongcheon", label: "천안역전시장" },
  { id: "seonghwan", label: "성환시장" },
];

const MAP_CATEGORY_OPTIONS = [
  "전체",
  "먹거리·분식",
  "정육·계란",
  "채소",
  "과일",
  "채소·과일",
  "수산물",
  "반찬·건어물",
  "기타·생활",
];

const OWNER_CHANGE_REQUESTS_KEY = "owner_change_requests";
const OWNER_APPROVED_STORE_NAME_KEY = "owner_approved_store_name";
const ADMIN_STORE_ACCOUNTS_KEY = "admin_store_accounts";

type StoreAccount = StoreAccountRecord;

type ChangeRequest = {
  id: number;
  type: "storeName" | "phone";
  storeName: string;
  currentValue: string;
  newValue: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  rejectReason?: string;
  source?: "store" | "customer";
};

const DEMO_STORE_CHANGE_REQUESTS: ChangeRequest[] = [
  {
    id: -1,
    type: "storeName",
    storeName: "천안순대국밥",
    currentValue: "천안순대국밥",
    newValue: "병천순대본점",
    status: "pending",
    createdAt: "2026-05-21T09:30:00.000Z",
    source: "store",
  },
  {
    id: -2,
    type: "phone",
    storeName: "어묵·튀김코너",
    currentValue: "01012345678",
    newValue: "01098765432",
    status: "pending",
    createdAt: "2026-05-20T15:20:00.000Z",
    source: "store",
  },
  {
    id: -3,
    type: "storeName",
    storeName: "호두과자 본점",
    currentValue: "호두과자 본점",
    newValue: "천안호두과자",
    status: "pending",
    createdAt: "2026-05-19T11:00:00.000Z",
    source: "store",
  },
];

const DEMO_CUSTOMER_CHANGE_REQUESTS: ChangeRequest[] = [
  {
    id: -101,
    type: "phone",
    storeName: "홍길동",
    currentValue: "01011112222",
    newValue: "01033334444",
    status: "pending",
    createdAt: "2026-05-21T10:15:00.000Z",
    source: "customer",
  },
  {
    id: -102,
    type: "phone",
    storeName: "김영희",
    currentValue: "01055556666",
    newValue: "01077778888",
    status: "pending",
    createdAt: "2026-05-20T14:40:00.000Z",
    source: "customer",
  },
  {
    id: -103,
    type: "phone",
    storeName: "이철수",
    currentValue: "01099990000",
    newValue: "01012123434",
    status: "pending",
    createdAt: "2026-05-19T16:05:00.000Z",
    source: "customer",
  },
];

function formatPhoneDisplay(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return phone;
}

function formatPhoneInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function loadChangeRequests(): ChangeRequest[] {
  try {
    const raw = localStorage.getItem(OWNER_CHANGE_REQUESTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChangeRequest[];
    return parsed.map((item) => ({
      ...item,
      status: item.status === "approved" || item.status === "rejected" ? item.status : "pending",
    }));
  } catch {
    return [];
  }
}

function loadStoreAccounts(): Record<number, StoreAccount> {
  return loadStoreAccountsMap();
}

function formatChangeRequestDate(iso: string) {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  } catch {
    return iso;
  }
}

function resolveSignupPin(app: OwnerSignupApplication) {
  if (app.pin) return app.pin;
  const phoneDigits = app.phone.replace(/\D/g, "");
  const user = loadRegisteredUsers().find((item) => item.phone === phoneDigits);
  return user?.pin || "";
}

function signupStatusLabel(status: OwnerSignupApplication["status"]) {
  if (status === "approved") return "승인";
  if (status === "rejected") return "거절";
  return "대기";
}

declare global {
  interface Window {
    naver?: any;
  }
}

export function AdminPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const marketParam = searchParams.get("market");
  const initialMarket: MarketId =
    marketParam === "jungang" || marketParam === "byeongcheon" || marketParam === "seonghwan"
      ? marketParam
      : "jungang";
  const [selectedMarket, setSelectedMarket] = useState<MarketId>(initialMarket);
  const [showApplications, setShowApplications] = useState(false);
  const [applicationTab, setApplicationTab] = useState<"signup" | "storeSettings" | "customerSettings">("signup");
  const [signupApplications, setSignupApplications] = useState<OwnerSignupApplication[]>(() => loadOwnerSignupApplications());
  const [rejectingSignupId, setRejectingSignupId] = useState<number | null>(null);
  const [signupRejectReasons, setSignupRejectReasons] = useState<Record<number, string>>({});
  const [imageViewApp, setImageViewApp] = useState<OwnerSignupApplication | null>(null);
  const [signupApprovedModal, setSignupApprovedModal] = useState<string | null>(null);
  const [changeRejectingId, setChangeRejectingId] = useState<number | null>(null);
  const [changeRejectReasons, setChangeRejectReasons] = useState<Record<number, string>>({});
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>(() => loadChangeRequests());
  const [demoChangeStatuses, setDemoChangeStatuses] = useState<Record<number, ChangeRequest["status"]>>({});
  const [demoChangeRejectReasons, setDemoChangeRejectReasons] = useState<Record<number, string>>({});

  const [deleteModeActive, setDeleteModeActive] = useState(false);
  const [settingsModeActive, setSettingsModeActive] = useState(false);
  const [settingsTarget, setSettingsTarget] = useState<{ id: number; name: string } | null>(null);
  const [settingsForm, setSettingsForm] = useState({ storeName: "", phone: "", pin: "" });
  const [settingsError, setSettingsError] = useState("");
  const [storeAccounts, setStoreAccounts] = useState<Record<number, StoreAccount>>(() => loadStoreAccounts());
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [deletedIds, setDeletedIds] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem("admin-deleted-store-ids");
      return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
    } catch { return new Set(); }
  });
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [isEditing, setIsEditing] = useState(false);
  const [managementTab, setManagementTab] = useState<"store" | "facility">("store");
  const [facilitySearchQuery, setFacilitySearchQuery] = useState("");
  const adminReturnHandledKey = useRef<string | null>(null);
  const mapClientId = import.meta.env.VITE_NAVER_MAP_CLIENT_ID as string | undefined;
  const isPlaceholderClientId = !mapClientId || mapClientId === "your_naver_map_client_id";

  const [draft, setDraft] = useState<OwnerDashboardDraft>(() => {
    migrateLegacyOwnerDraftIfNeeded();
    const catalog = loadOwnerCatalog();
    return {
      stores: catalog.stores ?? [],
      facilities: catalog.facilities ?? [],
    };
  });

  const [editForm, setEditForm] = useState({
    name: "",
    category: "",
    location: "",
    phone: "",
    description: "",
    lat: "",
    lng: "",
  });

  useEffect(() => {
    if (marketParam === "jungang" || marketParam === "byeongcheon" || marketParam === "seonghwan") {
      setSelectedMarket(marketParam);
    }
  }, [marketParam]);

  const saveDraft = (next: OwnerDashboardDraft) => {
    setDraft(next);
    saveOwnerCatalog({
      stores: next.stores,
      facilities: next.facilities ?? [],
    });
  };

  useEffect(() => {
    if (!showApplications) return;
    setChangeRequests(loadChangeRequests());
    void refreshOwnerSignupApplicationsFromRemote().then(setSignupApplications);
  }, [showApplications]);

  const persistChangeRequests = (next: ChangeRequest[]) => {
    setChangeRequests(next);
    localStorage.setItem(OWNER_CHANGE_REQUESTS_KEY, JSON.stringify(next));
  };

  const handleApproveChangeRequest = (request: ChangeRequest) => {
    const existsInStorage = changeRequests.some((item) => item.id === request.id);
    if (!existsInStorage) {
      setDemoChangeStatuses((prev) => ({ ...prev, [request.id]: "approved" }));
      return;
    }

    const next = changeRequests.map((item) =>
      item.id === request.id ? { ...item, status: "approved" as const } : item,
    );
    persistChangeRequests(next);

    if (request.type === "storeName") {
      localStorage.setItem(OWNER_APPROVED_STORE_NAME_KEY, request.newValue);
      localStorage.setItem("owner_current_store_name", request.newValue);
      const updatedStores = draft.stores.map((store) =>
        store.name === request.storeName || store.name === request.currentValue
          ? { ...store, name: request.newValue }
          : store,
      );
      saveDraft({ ...draft, stores: updatedStores });
    }

    if (request.type === "phone") {
      const newPhone = request.newValue.replace(/\D/g, "");
      const currentPhone = request.currentValue.replace(/\D/g, "");
      const savedPhone = (localStorage.getItem("user_phone") || "").replace(/\D/g, "");
      if (!savedPhone || savedPhone === currentPhone) {
        localStorage.setItem("user_phone", newPhone);
      }
      const users = loadRegisteredUsers();
      const userIdx = users.findIndex((item) => item.phone === currentPhone);
      if (userIdx >= 0) {
        users[userIdx] = { ...users[userIdx], phone: newPhone };
        localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
      }
      const accounts = Object.values(loadStoreAccounts());
      const accountIdx = accounts.findIndex((item) => item.phone.replace(/\D/g, "") === currentPhone);
      if (accountIdx >= 0) {
        accounts[accountIdx] = { ...accounts[accountIdx], phone: newPhone };
        localStorage.setItem(ADMIN_STORE_ACCOUNTS_KEY, JSON.stringify(accounts));
      }
    }
  };

  const handleRejectChangeRequest = (requestId: number) => {
    const existsInStorage = changeRequests.some((item) => item.id === requestId);
    if (!existsInStorage) {
      setDemoChangeStatuses((prev) => ({ ...prev, [requestId]: "rejected" }));
      setDemoChangeRejectReasons((prev) => ({
        ...prev,
        [requestId]: changeRejectReasons[requestId] || "",
      }));
      setChangeRejectingId(null);
      return;
    }

    const next = changeRequests.map((item) =>
      item.id === requestId
        ? { ...item, status: "rejected" as const, rejectReason: changeRejectReasons[requestId] || "" }
        : item,
    );
    persistChangeRequests(next);
    setChangeRejectingId(null);
  };

  const storeChangeRequests = useMemo(
    () => changeRequests.filter((item) => item.source !== "customer"),
    [changeRequests],
  );
  const customerChangeRequests = useMemo(
    () => changeRequests.filter((item) => item.source === "customer"),
    [changeRequests],
  );

  const isUsingDemoStoreRequests = storeChangeRequests.length === 0;
  const isUsingDemoCustomerRequests = customerChangeRequests.length === 0;

  const displayedStoreChangeRequests = useMemo(() => {
    const base = isUsingDemoStoreRequests ? DEMO_STORE_CHANGE_REQUESTS : storeChangeRequests;
    if (!isUsingDemoStoreRequests) return base;
    return base.map((item) => ({
      ...item,
      status: demoChangeStatuses[item.id] ?? item.status,
      rejectReason: demoChangeRejectReasons[item.id] ?? item.rejectReason,
    }));
  }, [storeChangeRequests, demoChangeStatuses, demoChangeRejectReasons, isUsingDemoStoreRequests]);

  const displayedCustomerChangeRequests = useMemo(() => {
    const base = isUsingDemoCustomerRequests ? DEMO_CUSTOMER_CHANGE_REQUESTS : customerChangeRequests;
    if (!isUsingDemoCustomerRequests) return base;
    return base.map((item) => ({
      ...item,
      status: demoChangeStatuses[item.id] ?? item.status,
      rejectReason: demoChangeRejectReasons[item.id] ?? item.rejectReason,
    }));
  }, [customerChangeRequests, demoChangeStatuses, demoChangeRejectReasons, isUsingDemoCustomerRequests]);

  const sortedSignupApplications = useMemo(() => {
    return [...signupApplications].sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [signupApplications]);

  const pendingSignupApplications = useMemo(
    () => sortedSignupApplications.filter((item) => item.status === "pending"),
    [sortedSignupApplications],
  );

  const signupPendingCount = pendingSignupApplications.length;
  const storeSettingsPendingCount = displayedStoreChangeRequests.filter((item) => item.status === "pending").length;
  const customerSettingsPendingCount = displayedCustomerChangeRequests.filter((item) => item.status === "pending").length;
  const settingsPendingCount = storeSettingsPendingCount + customerSettingsPendingCount;
  const totalPendingCount = signupPendingCount + settingsPendingCount;
  const hasAdminModalOpen = deleteTarget !== null || settingsTarget !== null || imageViewApp !== null || signupApprovedModal !== null;

  useEffect(() => {
    if (hasAdminModalOpen) {
      document.body.classList.add("app-modal-open");
    } else {
      document.body.classList.remove("app-modal-open");
    }
    return () => document.body.classList.remove("app-modal-open");
  }, [hasAdminModalOpen]);

  useEffect(() => {
    migrateLegacyOwnerDraftIfNeeded();
    let cancelled = false;
    const load = async () => {
      const remote = await loadOwnerCatalogRemote();
      if (!remote || cancelled) return;
      try {
        const local = loadOwnerCatalog();
        const hasLocalData = local.stores.length > 0 || (local.facilities?.length ?? 0) > 0;
        if (hasLocalData) return;
      } catch {
        // If local is unreadable, fall through and bootstrap from remote.
      }
      const normalized: OwnerDashboardDraft = {
        stores: (remote.stores ?? []).map((store) => ({
          ...store,
          marketId:
            store.marketId === "jungang" || store.marketId === "byeongcheon" || store.marketId === "seonghwan"
              ? store.marketId
              : undefined,
        })),
        facilities: (remote.facilities ?? []).map((facility) => ({
          ...facility,
          marketId:
            facility.marketId === "jungang" || facility.marketId === "byeongcheon" || facility.marketId === "seonghwan"
              ? facility.marketId
              : undefined,
        })),
      };
      setDraft(normalized);
      saveOwnerCatalog(normalized);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const dummyStores = useMemo<DraftStore[]>(() => {
    return SEED_MARKET_ORDER.flatMap((marketId, marketIndex) =>
      STORES_BY_MARKET[marketId].map((store) => ({
        id: marketIndex * 10000 + store.id,
        name: store.name,
        category: store.category,
        location: store.location,
        hours: store.hours,
        phone: store.phone,
        description: store.description,
        lat: typeof store.lat === "number" ? store.lat : 0,
        lng: typeof store.lng === "number" ? store.lng : 0,
        mx: store.mx,
        my: store.my,
        marketId,
        image: store.image,
        menus: store.menus.map((menu) => ({
          id: Number(menu.id) || Date.now(),
          name: menu.name,
          price: String(menu.price),
          photoName: "",
        })),
      })),
    );
  }, []);

  const mergedStores = useMemo(() => {
    const byId = new Map<number, DraftStore>();
    dummyStores.forEach((store) => {
      byId.set(store.id, store);
    });
    draft.stores.forEach((store) => {
      const base = byId.get(store.id);
      if (base) {
        byId.set(store.id, {
          ...base,
          ...store,
          // draft에 marketId가 없으면 시드 데이터의 marketId 유지
          marketId: store.marketId ?? base.marketId,
          image: store.image || base.image,
          menus: store.menus?.length ? store.menus : base.menus,
        });
      } else {
        byId.set(store.id, store);
      }
    });
    return Array.from(byId.values());
  }, [dummyStores, draft.stores]);

  const handleApproveSignup = (application: OwnerSignupApplication) => {
    const phoneDigits = application.phone.replace(/\D/g, "");
    const newStoreId = Math.max(0, ...mergedStores.map((store) => store.id)) + 1;
    const newStore: DraftStore = {
      id: newStoreId,
      name: application.storeName,
      category: "기타·생활",
      location: application.address,
      hours: "",
      phone: formatPhoneDisplay(phoneDigits),
      description: "",
      lat: 0,
      lng: 0,
      marketId: application.marketId,
      image: application.storeImage,
    };

    const nextAccount: StoreAccount = {
      storeId: newStoreId,
      storeName: application.storeName,
      phone: phoneDigits,
      pin: application.pin,
    };
    upsertStoreAccount(nextAccount);
    setStoreAccounts((prev) => ({ ...prev, [newStoreId]: nextAccount }));
    upsertCatalogStore(newStore);
    saveOwnerStoreWorkspace(newStoreId, {
      menus: [],
      todayDeal: "",
      news: "",
      couponEvent: "",
      reviewReply: "",
      inquiryReply: "",
    });
    setDraft((prev) => ({ ...prev, stores: [...prev.stores, newStore] }));
    updateRegisteredUserStatus(phoneDigits, "active");
    setSignupApplications(
      updateOwnerSignupApplication(application.id, {
        status: "approved",
        approvedStoreId: newStoreId,
      }).filter((item) => item.status === "pending"),
    );
    setRejectingSignupId(null);
    setSignupApprovedModal(application.storeName);
  };

  const handleRejectSignup = (application: OwnerSignupApplication) => {
    const reason = (signupRejectReasons[application.id] || "").trim() || "관리자에 의해 거절되었습니다.";
    updateRegisteredUserStatus(application.phone, "rejected");
    setSignupApplications(
      updateOwnerSignupApplication(application.id, {
        status: "rejected",
        rejectReason: reason,
      }).filter((item) => item.status === "pending"),
    );
    setRejectingSignupId(null);
  };

  useEffect(() => {
    let cancelled = false;
    const syncAccounts = async () => {
      const remote = await loadStoreAccountsFromRemote();
      if (cancelled) return;
      if (remote && remote.length > 0) {
        saveStoreAccountsLocally(remote);
        setStoreAccounts(Object.fromEntries(remote.map((item) => [item.storeId, item])));
      }
    };
    void syncAccounts();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (mergedStores.length === 0) return;
    const current = loadStoreAccountsMap();
    if (!needsStoreAccountBootstrap(mergedStores, current)) return;

    const accounts = assignRandomStoreAccounts(
      mergedStores.map((store) => ({ id: store.id, name: store.name })),
    );
    saveAllStoreAccounts(accounts);
    setStoreAccounts(Object.fromEntries(accounts.map((item) => [item.storeId, item])));
  }, [mergedStores]);

  const storesBySelectedMarket = mergedStores.filter(
    (store) => store.marketId === selectedMarket && !deletedIds.has(store.id),
  );
  const facilitiesBySelectedMarket = (draft.facilities ?? []).filter(
    (facility) => facility.marketId === selectedMarket,
  );
  const filteredFacilities = facilitiesBySelectedMarket.filter((facility) => {
    const q = facilitySearchQuery.trim();
    return !q || facility.name.includes(q);
  });

  const handleDeleteStore = (id: number) => {
    const next = new Set(deletedIds);
    next.add(id);
    setDeletedIds(next);
    localStorage.setItem("admin-deleted-store-ids", JSON.stringify(Array.from(next)));
    const newDraft = { ...draft, stores: draft.stores.filter((s) => s.id !== id) };
    saveDraft(newDraft);
    if (selectedStoreId === id) {
      setSelectedStoreId(null);
      setIsEditing(false);
    }
    setDeleteTarget(null);
    setDeleteInput("");
    setDeleteModeActive(false);
  };

  const filteredStores = storesBySelectedMarket.filter((store) => {
    if (deletedIds.has(store.id)) return false;
    const matchCategory =
      selectedCategory === "전체" ||
      store.category.split(",").map((item) => item.trim()).includes(selectedCategory);
    const q = searchQuery.trim();
    const matchSearch =
      !q ||
      store.name.includes(q) ||
      store.location.includes(q) ||
      store.category.includes(q);
    return matchCategory && matchSearch;
  });

  const storesForMapPreview = useMemo(() => {
    const rows = STORES_BY_MARKET[selectedMarket];
    const marketDrafts = draft.stores.filter((s) => (s.marketId ?? selectedMarket) === selectedMarket);
    return filteredStores.map((adminStore) => {
      const seedRow =
        rows.find((s) => syntheticSeedStoreId(selectedMarket, s.id) === adminStore.id) ??
        rows.find((s) => s.name === adminStore.name);
      const pin: Pick<StoreData, "id" | "mx" | "my"> & { lat?: number; lng?: number } = seedRow
        ? { id: seedRow.id, mx: seedRow.mx, my: seedRow.my, lat: adminStore.lat, lng: adminStore.lng }
        : {
            id: adminStore.id >= 10000 ? adminStore.id % 10000 : adminStore.id,
            mx: adminStore.mx ?? 50,
            my: adminStore.my ?? 50,
            lat: adminStore.lat,
            lng: adminStore.lng,
          };
      const override =
        marketDrafts.find((d) => d.id === adminStore.id) ??
        (seedRow ? marketDrafts.find((d) => d.name === seedRow.name) : undefined);
      const pos = pickStoreDisplayLatLng(selectedMarket, pin, override ?? undefined);
      return {
        id: adminStore.id,
        name: adminStore.name,
        category: adminStore.category,
        lat: pos.lat,
        lng: pos.lng,
      };
    });
  }, [filteredStores, selectedMarket, draft.stores]);

  const selectedMarketLabel =
    MARKET_BUTTONS.find((market) => market.id === selectedMarket)?.label ?? "선택 시장";

  const selectedStore = storesBySelectedMarket.find((store) => store.id === selectedStoreId) ?? null;

  const handleEditStart = () => {
    if (!selectedStore) return;
    setEditForm({
      name: selectedStore.name,
      category: selectedStore.category,
      location: selectedStore.location,
      phone: selectedStore.phone,
      description: selectedStore.description,
      lat: String(selectedStore.lat),
      lng: String(selectedStore.lng),
    });
    setIsEditing(true);
  };

  const handleEditSave = () => {
    if (!selectedStore) return;
    const nextLat = Number(editForm.lat);
    const nextLng = Number(editForm.lng);
    if (Number.isNaN(nextLat) || Number.isNaN(nextLng)) {
      window.alert("좌표는 숫자로 입력해주세요.");
      return;
    }
    const nextStores = draft.stores.map((store) =>
      store.id === selectedStore.id
        ? {
            ...store,
            name: editForm.name.trim(),
            category: editForm.category.trim(),
            location: editForm.location.trim(),
            phone: editForm.phone.trim(),
            description: editForm.description.trim(),
            lat: nextLat,
            lng: nextLng,
          }
        : store,
    );
    const existsInSaved = draft.stores.some((store) => store.id === selectedStore.id);
    const normalizedStore: DraftStore = {
      ...selectedStore,
      name: editForm.name.trim(),
      category: editForm.category.trim(),
      location: editForm.location.trim(),
      phone: editForm.phone.trim(),
      description: editForm.description.trim(),
      lat: nextLat,
      lng: nextLng,
      marketId: selectedStore.marketId ?? selectedMarket,
    };
    saveDraft({
      ...draft,
      stores: existsInSaved ? nextStores : [normalizedStore, ...draft.stores],
    });
    setIsEditing(false);
  };

  const openDeleteConfirm = (store: { id: number; name: string }) => {
    setDeleteTarget(store);
    setDeleteInput("");
  };

  const openStoreSettings = (store: DraftStore) => {
    const saved = storeAccounts[store.id];
    setSettingsTarget({ id: store.id, name: store.name });
    setSettingsForm({
      storeName: saved?.storeName || store.name,
      phone: saved?.phone ? formatPhoneDisplay(saved.phone) : "",
      pin: saved?.pin || "1234",
    });
    setSettingsError("");
  };

  const handleSaveStoreSettings = () => {
    if (!settingsTarget) return;
    const storeName = settingsForm.storeName.trim();
    const phoneDigits = settingsForm.phone.replace(/\D/g, "");
    const pin = settingsForm.pin.trim();

    if (!storeName) {
      setSettingsError("상점명을 입력해주세요.");
      return;
    }
    if (phoneDigits && !/^[0-9]{10,11}$/.test(phoneDigits)) {
      setSettingsError("휴대폰 번호는 10~11자리 숫자로 입력해주세요.");
      return;
    }
    if (!/^[0-9]{4,6}$/.test(pin)) {
      setSettingsError("PIN 번호는 4~6자리 숫자로 입력해주세요.");
      return;
    }

    const nextAccount: StoreAccount = {
      storeId: settingsTarget.id,
      storeName,
      phone: phoneDigits,
      pin,
    };
    const nextAccounts = { ...storeAccounts, [settingsTarget.id]: nextAccount };
    setStoreAccounts(nextAccounts);
    localStorage.setItem(ADMIN_STORE_ACCOUNTS_KEY, JSON.stringify(Object.values(nextAccounts)));

    const storeInDraft = draft.stores.find((s) => s.id === settingsTarget.id);
    const updatedStores = storeInDraft
      ? draft.stores.map((s) => (s.id === settingsTarget.id ? { ...s, name: storeName } : s))
      : draft.stores;

    const mergedStore = mergedStores.find((s) => s.id === settingsTarget.id);
    if (!storeInDraft && mergedStore) {
      updatedStores.push({ ...mergedStore, name: storeName });
    }
    saveDraft({ ...draft, stores: updatedStores });

    if (localStorage.getItem(OWNER_APPROVED_STORE_NAME_KEY) === settingsTarget.name) {
      localStorage.setItem(OWNER_APPROVED_STORE_NAME_KEY, storeName);
      localStorage.setItem("owner_current_store_name", storeName);
    }

    setSettingsTarget(null);
    setSettingsForm({ storeName: "", phone: "", pin: "" });
    setSettingsError("");
    setSettingsModeActive(false);
  };

  const openOwnerStoreEditor = (pin: AdminPreviewStorePin | DraftStore, source: "map" | "list") => {
    const full = mergedStores.find((s) => s.id === pin.id);
    if (!full) {
      window.alert("상점 정보를 찾을 수 없어요. 목록을 새로고침한 뒤 다시 눌러주세요.");
      return;
    }
    const ensuredStore: DraftStore = {
      ...full,
      marketId: full.marketId ?? selectedMarket,
      lat: typeof pin.lat === "number" ? pin.lat : full.lat,
      lng: typeof pin.lng === "number" ? pin.lng : full.lng,
    };
    const exists = draft.stores.some((item) => item.id === ensuredStore.id);
    const nextStores = exists
      ? draft.stores.map((item) => (item.id === ensuredStore.id ? ensuredStore : item))
      : [ensuredStore, ...draft.stores];
    saveDraft({ ...draft, stores: nextStores });
    window.localStorage.setItem(OWNER_EDIT_STORE_KEY, JSON.stringify(ensuredStore));
    const returnHint =
      source === "map"
        ? "&adminReturn=map"
        : `&adminReturn=list&focusStore=${encodeURIComponent(String(ensuredStore.id))}`;
    navigate(
      `/owner/store-registration?market=${ensuredStore.marketId}&editStoreId=${ensuredStore.id}&returnTo=admin${returnHint}`,
    );
  };

  const openOwnerNewStoreEditor = () => {
    window.localStorage.removeItem(OWNER_EDIT_STORE_KEY);
    navigate(`/owner/store-registration?market=${selectedMarket}&returnTo=admin&adminNew=1`);
  };

  const openFacilityRegistration = () => {
    navigate(`/owner/facility-registration?market=${selectedMarket}&returnTo=admin`);
  };

  const openFacilityEditor = (facility: DraftFacility) => {
    const ensured: DraftFacility = {
      ...facility,
      marketId: facility.marketId ?? selectedMarket,
    };
    window.localStorage.setItem(OWNER_EDIT_FACILITY_KEY, JSON.stringify(ensured));
    navigate(
      `/owner/facility-registration?market=${ensured.marketId}&editFacilityId=${ensured.id}&returnTo=admin`,
    );
  };

  const handleDeleteFacility = (facilityId: number) => {
    const ok = window.confirm("해당 편의시설을 삭제할까요?");
    if (!ok) return;
    saveDraft({
      ...draft,
      facilities: (draft.facilities ?? []).filter((facility) => facility.id !== facilityId),
    });
  };

  const tabParam = searchParams.get("tab");
  useEffect(() => {
    if (tabParam === "facility") setManagementTab("facility");
  }, [tabParam]);

  useEffect(() => {
    const adminReturn = searchParams.get("adminReturn");
    if (adminReturn !== "map" && adminReturn !== "list") {
      adminReturnHandledKey.current = null;
      return;
    }

    const focusStoreRaw = searchParams.get("focusStore");
    const dedupeKey = `${adminReturn}:${focusStoreRaw ?? ""}`;
    if (adminReturnHandledKey.current === dedupeKey) return;
    adminReturnHandledKey.current = dedupeKey;

    setManagementTab("store");
    setSelectedStoreId(null);
    setIsEditing(false);

    const clearReturnParams = () => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("adminReturn");
          next.delete("focusStore");
          return next;
        },
        { replace: true },
      );
    };

    window.requestAnimationFrame(() => {
      if (adminReturn === "map") {
        document.getElementById("admin-store-map-section")?.scrollIntoView({ block: "start", behavior: "smooth" });
        window.setTimeout(clearReturnParams, 350);
        return;
      }
      if (adminReturn === "list" && focusStoreRaw) {
        const id = Number(focusStoreRaw);
        if (Number.isFinite(id)) {
          document.getElementById(`admin-store-card-${id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
        }
        window.setTimeout(clearReturnParams, 350);
      }
    });
  }, [searchParams, setSearchParams]);

  const renderChangeRequestList = (
    requests: ChangeRequest[],
    options: {
      title: string;
      pendingCount: number;
      isDemo: boolean;
      demoMessage: string;
      nameLabel: string;
    },
  ) => (
    <>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[14px] font-bold text-gray-800">{options.title}</p>
        <span className="text-[11px] text-gray-400">총 {options.pendingCount}건 대기중</span>
      </div>
      {options.isDemo && (
        <p className="text-[11px] text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          {options.demoMessage}
        </p>
      )}
      {requests.map((request) => {
        const statusLabel = request.status === "approved" ? "승인" : request.status === "rejected" ? "거절" : "대기";
        const isRejecting = changeRejectingId === request.id;
        const typeLabel = request.type === "storeName" ? "상점명" : "휴대폰 번호";
        const displayCurrent = request.type === "phone" ? formatPhoneDisplay(request.currentValue) : request.currentValue;
        const displayNew = request.type === "phone" ? formatPhoneDisplay(request.newValue) : request.newValue;

        return (
          <div key={request.id} className="border border-gray-100 rounded-xl p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-800">{request.storeName}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{options.nameLabel} · 변경 항목: {typeLabel}</p>
                <p className="text-[10px] text-gray-400 mt-1">신청일: {formatChangeRequestDate(request.createdAt)}</p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-1 rounded-full flex-shrink-0 ${
                request.status === "approved" ? "bg-emerald-100 text-emerald-700"
                : request.status === "rejected" ? "bg-red-100 text-red-600"
                : "bg-amber-100 text-amber-700"
              }`}>{statusLabel}</span>
            </div>

            <div className="rounded-lg bg-gray-50 p-3 space-y-2">
              <div>
                <p className="text-[10px] text-gray-400 mb-0.5">변경 전</p>
                <p className="text-[13px] text-gray-700">{displayCurrent}</p>
              </div>
              <div className="border-t border-gray-200 pt-2">
                <p className="text-[10px] text-gray-400 mb-0.5">변경 후</p>
                <p className="text-[13px] font-semibold text-blue-600">{displayNew}</p>
              </div>
            </div>

            {request.status === "pending" && !isRejecting && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleApproveChangeRequest(request)}
                  className="flex-1 py-1.5 rounded-lg bg-gray-900 text-white text-[12px] font-semibold active:bg-gray-700 transition-colors"
                >승인</button>
                <button
                  onClick={() => {
                    setChangeRejectingId(request.id);
                    setChangeRejectReasons((prev) => ({ ...prev, [request.id]: "" }));
                  }}
                  className="flex-1 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-[12px] font-semibold active:bg-gray-200 transition-colors"
                >거절</button>
              </div>
            )}

            {isRejecting && (
              <div className="space-y-2">
                <textarea
                  value={changeRejectReasons[request.id] ?? ""}
                  onChange={(e) => setChangeRejectReasons((prev) => ({ ...prev, [request.id]: e.target.value }))}
                  rows={3}
                  placeholder="거절 사유를 입력해주세요..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-[12px] text-gray-700 resize-none focus:outline-none focus:border-gray-400"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRejectChangeRequest(request.id)}
                    className="flex-1 py-1.5 rounded-lg bg-red-500 text-white text-[12px] font-semibold active:bg-red-600 transition-colors"
                  >거절 사유 전송</button>
                  <button
                    onClick={() => setChangeRejectingId(null)}
                    className="py-1.5 px-3 rounded-lg bg-gray-100 text-gray-500 text-[12px] active:bg-gray-200 transition-colors"
                  >취소</button>
                </div>
              </div>
            )}

            {request.status === "approved" && (
              <p className="text-[11px] text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">✅ 변경 승인 완료됐습니다.</p>
            )}
            {request.status === "rejected" && request.rejectReason && (
              <p className="text-[11px] text-red-500 bg-red-50 rounded-lg px-3 py-2">❌ 거절 사유: {request.rejectReason}</p>
            )}
          </div>
        );
      })}
    </>
  );

  return (
    <>
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="p-1" aria-label="로그인 페이지로 이동">
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="text-[15px] text-gray-900">
            {showApplications ? "신청 · 설정" : selectedMarketLabel}
          </h1>
          <div className="w-7" />
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        <div className="bg-white rounded-xl p-2 flex gap-2 overflow-x-auto">
          {MARKET_BUTTONS.map((market) => {
            const isActive = selectedMarket === market.id && !showApplications;
            return (
              <button
                key={market.id}
                onClick={() => {
                  setShowApplications(false);
                  setSelectedMarket(market.id);
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.set("market", market.id);
                    return next;
                  });
                  setSelectedStoreId(null);
                  setIsEditing(false);
                  setSearchQuery("");
                  setSelectedCategory("전체");
                  setFacilitySearchQuery("");
                }}
                className={`h-9 px-3 rounded-lg text-[12px] whitespace-nowrap transition-colors ${
                  isActive ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                {market.label}
              </button>
            );
          })}
          <div className="w-px bg-gray-200 mx-1 self-stretch" />
          <button
            onClick={() => setShowApplications((v) => !v)}
            className={`h-9 px-3 rounded-lg text-[12px] whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              showApplications
                ? "bg-amber-500 text-white"
                : "bg-amber-50 text-amber-600 border border-amber-200"
            }`}
          >
            신청 · 설정
            {totalPendingCount > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                showApplications ? "bg-white text-amber-600" : "bg-amber-500 text-white"
              }`}>{totalPendingCount}</span>
            )}
          </button>
        </div>

        {/* 신청 · 설정 패널 */}
        {showApplications && (
          <div className="bg-white rounded-xl p-4 space-y-3">
            <div className="flex gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => setApplicationTab("signup")}
                className={`flex-shrink-0 h-9 px-3 rounded-lg text-[11px] font-medium transition-colors ${
                  applicationTab === "signup" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                가입 신청
                {signupPendingCount > 0 && (
                  <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                    applicationTab === "signup" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700"
                  }`}>{signupPendingCount}</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setApplicationTab("storeSettings")}
                className={`flex-shrink-0 h-9 px-3 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap ${
                  applicationTab === "storeSettings" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                상점 설정
                {storeSettingsPendingCount > 0 && (
                  <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                    applicationTab === "storeSettings" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700"
                  }`}>{storeSettingsPendingCount}</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setApplicationTab("customerSettings")}
                className={`flex-shrink-0 h-9 px-3 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap ${
                  applicationTab === "customerSettings" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                손님 설정
                {customerSettingsPendingCount > 0 && (
                  <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                    applicationTab === "customerSettings" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700"
                  }`}>{customerSettingsPendingCount}</span>
                )}
              </button>
            </div>

            {applicationTab === "signup" ? (
              <>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[14px] font-bold text-gray-800">사장님 가입 신청 현황</p>
                  <span className="text-[11px] text-gray-400">총 {signupPendingCount}건 대기중</span>
                </div>
                {pendingSignupApplications.length === 0 ? (
                  <div className="border border-dashed border-gray-200 rounded-xl px-4 py-8 text-center">
                    <p className="text-[13px] text-gray-500">가입 신청이 없습니다.</p>
                    <p className="text-[11px] text-gray-400 mt-1">사장님 회원가입 신청이 들어오면 여기에 표시됩니다.</p>
                  </div>
                ) : (
                  pendingSignupApplications.map((app) => {
                    const status = signupStatusLabel(app.status);
                    const isRejecting = rejectingSignupId === app.id;
                    return (
                      <div key={app.id} className="border border-gray-100 rounded-xl p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-gray-800">{app.storeName}</p>
                            <p className="text-[11px] text-gray-400">
                              <span className="text-blue-500 font-medium">{formatPhoneDisplay(app.phone)}</span>
                              <span className="text-gray-400"> · </span>
                              <span className="text-blue-500 font-medium">PIN {resolveSignupPin(app) || "—"}</span>
                              <span className="text-gray-400"> · {OWNER_SIGNUP_MARKET_LABELS[app.marketId]}</span>
                            </p>
                            <p className="text-[10px] text-gray-400">{app.email}</p>
                            <p className="text-[10px] text-gray-400">{app.address || "주소 없음"}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">신청일: {formatChangeRequestDate(app.createdAt)}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                              status === "승인" ? "bg-emerald-100 text-emerald-700"
                              : status === "거절" ? "bg-red-100 text-red-600"
                              : "bg-amber-100 text-amber-700"
                            }`}>{status}</span>
                            <button
                              onClick={() => setImageViewApp(app)}
                              className="text-[10px] text-blue-500 border border-blue-200 bg-blue-50 px-2 py-0.5 rounded-full active:bg-blue-100 transition-colors"
                            >
                              🖼 이미지 보기
                            </button>
                          </div>
                        </div>

                        {app.status === "pending" && !isRejecting && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveSignup(app)}
                              className="flex-1 py-1.5 rounded-lg bg-gray-900 text-white text-[12px] font-semibold active:bg-gray-700 transition-colors"
                            >승인</button>
                            <button
                              onClick={() => { setRejectingSignupId(app.id); setSignupRejectReasons((prev) => ({ ...prev, [app.id]: "" })); }}
                              className="flex-1 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-[12px] font-semibold active:bg-gray-200 transition-colors"
                            >거절</button>
                          </div>
                        )}

                        {isRejecting && (
                          <div className="space-y-2">
                            <textarea
                              value={signupRejectReasons[app.id] ?? ""}
                              onChange={(e) => setSignupRejectReasons((prev) => ({ ...prev, [app.id]: e.target.value }))}
                              rows={3}
                              placeholder="거절 사유를 입력해주세요..."
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-[12px] text-gray-700 resize-none focus:outline-none focus:border-gray-400"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleRejectSignup(app)}
                                className="flex-1 py-1.5 rounded-lg bg-red-500 text-white text-[12px] font-semibold active:bg-red-600 transition-colors"
                              >거절 사유 전송</button>
                              <button
                                onClick={() => setRejectingSignupId(null)}
                                className="py-1.5 px-3 rounded-lg bg-gray-100 text-gray-500 text-[12px] active:bg-gray-200 transition-colors"
                              >취소</button>
                            </div>
                          </div>
                        )}

                      </div>
                    );
                  })
                )}
              </>
            ) : applicationTab === "storeSettings" ? (
              renderChangeRequestList(displayedStoreChangeRequests, {
                title: "상점 설정 변경 신청 현황",
                pendingCount: storeSettingsPendingCount,
                isDemo: isUsingDemoStoreRequests,
                demoMessage: "아래는 데모 예시입니다. 상점 설정에서 실제 신청하면 이 목록이 대체됩니다.",
                nameLabel: "상점",
              })
            ) : (
              renderChangeRequestList(displayedCustomerChangeRequests, {
                title: "손님 설정 변경 신청 현황",
                pendingCount: customerSettingsPendingCount,
                isDemo: isUsingDemoCustomerRequests,
                demoMessage: "아래는 데모 예시입니다. 손님 설정에서 실제 신청하면 이 목록이 대체됩니다.",
                nameLabel: "닉네임",
              })
            )}
          </div>
        )}

        {/* 이미지 보기 모달 */}
        {imageViewApp && (
          <>
            <div className="app-modal-overlay fixed inset-0 bg-black/60" onClick={() => setImageViewApp(null)} />
            <div className="app-modal-content fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] bg-white rounded-2xl overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <p className="text-[13px] font-semibold text-gray-800">{imageViewApp.storeName} 상점 이미지</p>
                <button onClick={() => setImageViewApp(null)} className="text-gray-400 text-[16px]">✕</button>
              </div>
              <img src={imageViewApp.storeImage} alt="상점 이미지" className="w-full h-52 object-cover" />
            </div>
          </>
        )}

        {signupApprovedModal && (
          <div className="app-modal-overlay fixed inset-0 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSignupApprovedModal(null)} />
            <div className="app-modal-content relative bg-white rounded-2xl shadow-xl p-6 mx-6 w-full max-w-sm text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-[24px]">✅</span>
              </div>
              <p className="text-[16px] font-bold text-gray-900 mb-2">
                {signupApprovedModal} 상점 승인이 완료됐습니다
              </p>
              <p className="text-[13px] text-gray-500 mb-5">사장님이 로그인하여 상점 관리를 시작할 수 있습니다.</p>
              <button
                type="button"
                onClick={() => setSignupApprovedModal(null)}
                className="w-full h-11 rounded-xl bg-gray-900 text-white text-[14px] font-semibold active:bg-gray-800 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        )}

        {!showApplications && <div className="bg-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => {
                  setManagementTab("store");
                }}
                className={`h-8 px-3 rounded-md text-[12px] ${
                  managementTab === "store" ? "bg-gray-900 text-white" : "text-gray-700"
                }`}
              >
                상점
              </button>
              <button
                onClick={() => {
                  setManagementTab("facility");
                  setSelectedStoreId(null);
                  setIsEditing(false);
                }}
                className={`h-8 px-3 rounded-md text-[12px] ${
                  managementTab === "facility" ? "bg-gray-900 text-white" : "text-gray-700"
                }`}
              >
                편의시설
              </button>
            </div>
          </div>

          <div id="admin-store-map-section" className="mb-3 overflow-hidden rounded-lg border border-gray-200">
            <div className="naver-map-wrap h-[220px] w-full">
              <AdminPreviewMap
                view={MARKET_VIEW_CONFIG[selectedMarket]}
                tab={managementTab}
                stores={storesForMapPreview}
                facilities={filteredFacilities}
                clientId={mapClientId}
                isPlaceholder={isPlaceholderClientId}
                onStoreClick={(store) => openOwnerStoreEditor(store, "map")}
                onFacilityClick={openFacilityEditor}
              />
            </div>
          </div>

          {managementTab === "store" ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[14px] text-gray-900">{selectedMarketLabel} 등록 상점</h2>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-gray-500">{filteredStores.length}개</span>
                  <button
                    onClick={openOwnerNewStoreEditor}
                    className="h-7 px-2.5 rounded-lg bg-gray-900 text-[12px] text-white"
                  >
                    추가
                  </button>
                  <button
                    onClick={() => {
                      setSettingsModeActive((v) => !v);
                      setDeleteModeActive(false);
                      setSettingsTarget(null);
                    }}
                    className={`h-7 px-2.5 rounded-lg text-[12px] transition-colors ${
                      settingsModeActive ? "bg-blue-500 text-white" : "bg-blue-50 text-blue-600 border border-blue-200"
                    }`}
                  >
                    {settingsModeActive ? "완료" : "설정"}
                  </button>
                  <button
                    onClick={() => {
                      setDeleteModeActive((v) => !v);
                      setSettingsModeActive(false);
                      setSettingsTarget(null);
                    }}
                    className={`h-7 px-2.5 rounded-lg text-[12px] transition-colors ${
                      deleteModeActive ? "bg-red-500 text-white" : "bg-red-50 text-red-500 border border-red-200"
                    }`}
                  >
                    {deleteModeActive ? "완료" : "삭제"}
                  </button>
                </div>
              </div>

              {!selectedStore && (
            <div className="mb-2 space-y-2">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="상점명"
                className="w-full h-9 rounded-lg bg-gray-100 px-3 text-[12px] focus:outline-none focus:ring-1 focus:ring-gray-300"
              />
              <div className="flex gap-1.5 overflow-x-auto">
                {MAP_CATEGORY_OPTIONS.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`h-8 px-2.5 rounded-lg whitespace-nowrap text-[12px] ${
                      selectedCategory === category ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
              )}
              {storesBySelectedMarket.length === 0 ? (
                <p className="text-[12px] text-gray-400">선택한 시장에 저장된 상점 정보가 없습니다.</p>
              ) : selectedStore ? (
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedStoreId(null)}
                    className="h-8 px-2 rounded-lg bg-gray-100 text-[12px] text-gray-700"
                  >
                    목록으로
                  </button>
                  {isEditing ? (
                    <div className="rounded-lg bg-gray-50 p-3 space-y-2">
                      <input
                        value={editForm.name}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                        className="w-full h-9 rounded-md bg-white px-3 text-[12px]"
                        placeholder="상점명"
                      />
                      <input
                        value={editForm.category}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                        className="w-full h-9 rounded-md bg-white px-3 text-[12px]"
                        placeholder="카테고리"
                      />
                      <input
                        value={editForm.location}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
                        className="w-full h-9 rounded-md bg-white px-3 text-[12px]"
                        placeholder="위치"
                      />
                      <input
                        value={editForm.phone}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                        className="w-full h-9 rounded-md bg-white px-3 text-[12px]"
                        placeholder="연락처"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={editForm.lat}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, lat: e.target.value }))}
                          className="w-full h-9 rounded-md bg-white px-3 text-[12px]"
                          placeholder="위도(lat)"
                        />
                        <input
                          value={editForm.lng}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, lng: e.target.value }))}
                          className="w-full h-9 rounded-md bg-white px-3 text-[12px]"
                          placeholder="경도(lng)"
                        />
                      </div>
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        className="w-full rounded-md bg-white px-3 py-2 text-[12px] resize-none"
                        placeholder="소개"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setIsEditing(false)}
                          className="h-9 rounded-lg bg-gray-100 text-[12px] text-gray-700"
                        >
                          취소
                        </button>
                        <button
                          onClick={handleEditSave}
                          className="h-9 rounded-lg bg-gray-900 text-[12px] text-white"
                        >
                          저장
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-[14px] text-gray-900">{selectedStore.name}</p>
                      <p className="text-[12px] text-gray-500 mt-1">{selectedStore.category}</p>
                      <p className="text-[12px] text-gray-500 mt-1">위치: {selectedStore.location}</p>
                      <p className="text-[12px] text-gray-500 mt-1">연락처: {selectedStore.phone || "-"}</p>
                      <p className="text-[12px] text-gray-500 mt-1">좌표: {selectedStore.lat}, {selectedStore.lng}</p>
                      <p className="text-[12px] text-gray-700 mt-2 whitespace-pre-wrap">{selectedStore.description || "-"}</p>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <button
                          onClick={handleEditStart}
                          className="h-9 rounded-lg bg-gray-100 text-[12px] text-gray-700"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => openDeleteConfirm({ id: selectedStore.id, name: selectedStore.name })}
                          className="h-9 rounded-lg bg-red-500 text-[12px] text-white"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredStores.map((store) => (
                    <div
                      key={store.id}
                      id={`admin-store-card-${store.id}`}
                      className="flex items-center gap-2 rounded-lg bg-gray-50 p-3"
                    >
                      <button
                        type="button"
                        onClick={() => !deleteModeActive && !settingsModeActive && openOwnerStoreEditor(store, "list")}
                        className="flex-1 text-left"
                      >
                        <p className="text-[13px] text-gray-900">{store.name}</p>
                        <p className="text-[12px] text-gray-500 mt-0.5">{store.category} · {store.location}</p>
                        <p className="text-[11px] text-gray-400 mt-1">연락처 {store.phone || "-"}</p>
                        {storeAccounts[store.id]?.phone && (
                          <p className="text-[10px] text-blue-500 mt-0.5">
                            로그인 {formatPhoneDisplay(storeAccounts[store.id].phone)}
                            {storeAccounts[store.id].pin && (
                              <span> · PIN {storeAccounts[store.id].pin}</span>
                            )}
                          </p>
                        )}
                      </button>
                      {settingsModeActive && (
                        <button
                          onClick={() => openStoreSettings(store)}
                          className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 active:bg-blue-200 transition-colors"
                          aria-label="상점 계정 설정"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      )}
                      {deleteModeActive && (
                        <button
                          onClick={() => openDeleteConfirm({ id: store.id, name: store.name })}
                          className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-500 active:bg-red-200 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {storesBySelectedMarket.length > 0 && filteredStores.length === 0 && (
                    <p className="text-[12px] text-gray-400">검색/카테고리 조건에 맞는 상점이 없습니다.</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] text-gray-900">{selectedMarketLabel} 편의시설</h2>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-gray-500">{filteredFacilities.length}개</span>
                  <button
                    onClick={openFacilityRegistration}
                    className="h-7 px-2.5 rounded-lg bg-gray-900 text-[12px] text-white"
                  >
                    추가
                  </button>
                </div>
              </div>

                  <input
                    value={facilitySearchQuery}
                    onChange={(e) => setFacilitySearchQuery(e.target.value)}
                    placeholder="편의시설명 검색"
                    className="w-full h-9 rounded-lg bg-gray-100 px-3 text-[12px] focus:outline-none focus:ring-1 focus:ring-gray-300"
                  />
                  {facilitiesBySelectedMarket.length === 0 ? (
                    <p className="text-[12px] text-gray-400">등록된 편의시설이 없습니다.</p>
                  ) : filteredFacilities.length === 0 ? (
                    <p className="text-[12px] text-gray-400">검색 결과가 없습니다.</p>
                  ) : (
                    <div className="space-y-2">
                      {filteredFacilities.map((facility) => (
                    <button
                      key={facility.id}
                      onClick={() => openFacilityEditor(facility)}
                      className="w-full rounded-lg bg-gray-50 p-3 flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {facility.image ? (
                          <img src={facility.image} alt={facility.name} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-md flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: facility.color ? facility.color + "22" : "#f3f4f6" }}>
                            {facility.color && FACILITY_COLOR_ICON[facility.color]
                              ? (() => { const Icon = FACILITY_COLOR_ICON[facility.color]; return <Icon className="w-5 h-5" style={{ color: facility.color }} />; })()
                              : null}
                          </div>
                        )}
                        <div className="min-w-0">
                        <p className="text-[13px] text-gray-900">{facility.name}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{facility.hours || "운영시간 미입력"}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {facility.lat}, {facility.lng}
                        </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-4 h-4 rounded-full border border-white shadow"
                          style={{ backgroundColor: facility.color }}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFacility(facility.id);
                          }}
                          className="h-8 px-2 rounded-lg bg-red-500 text-[12px] text-white"
                        >
                          삭제
                        </button>
                      </div>
                    </button>
                      ))}
                    </div>
                  )}
            </div>
          )}
        </div>}
      </div>
    </div>

    {/* 상점 계정 설정 팝업 */}
    {settingsTarget && (
      <div className="app-modal-overlay fixed inset-0 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => { setSettingsTarget(null); setSettingsError(""); }}
        />
        <div className="app-modal-content relative bg-white rounded-2xl shadow-xl p-6 mx-6 w-full max-w-sm">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-blue-500" />
            <p className="text-[15px] font-semibold text-gray-900">상점 계정 설정</p>
          </div>

          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-[12px] text-gray-500 mb-1">상점명</label>
              <input
                value={settingsForm.storeName}
                onChange={(e) => setSettingsForm((prev) => ({ ...prev, storeName: e.target.value }))}
                className="w-full h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-[12px] text-gray-500 mb-1">휴대폰 번호 (로그인 ID)</label>
              <input
                type="tel"
                value={settingsForm.phone}
                onChange={(e) => setSettingsForm((prev) => ({ ...prev, phone: formatPhoneInput(e.target.value) }))}
                maxLength={13}
                placeholder="010-0000-0000"
                className="w-full h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-[12px] text-gray-500 mb-1">PIN 번호</label>
              <input
                type="text"
                inputMode="numeric"
                value={settingsForm.pin}
                onChange={(e) => setSettingsForm((prev) => ({ ...prev, pin: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                maxLength={6}
                placeholder="4~6자리"
                className="w-full h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-[13px] tracking-widest focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            </div>
          </div>

          {settingsError && (
            <p className="text-[11px] text-red-400 mb-3">{settingsError}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => { setSettingsTarget(null); setSettingsError(""); }}
              className="flex-1 h-10 rounded-xl bg-gray-100 text-[13px] text-gray-700 font-medium"
            >
              취소
            </button>
            <button
              onClick={handleSaveStoreSettings}
              className="flex-1 h-10 rounded-xl bg-blue-500 text-[13px] text-white font-medium"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    )}

    {/* 상점 삭제 확인 팝업 */}
    {deleteTarget && (
      <div className="app-modal-overlay fixed inset-0 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => { setDeleteTarget(null); setDeleteInput(""); }}
        />
        <div className="app-modal-content relative bg-white rounded-2xl shadow-xl p-6 mx-6 w-full max-w-sm">
          <p className="text-[15px] font-semibold text-gray-900 mb-1">이 상점을 삭제하시겠습니까?</p>
          <div className="text-[13px] text-gray-500 mb-4 space-y-2">
            <p>
              <span className="font-medium text-gray-800">{deleteTarget.name}</span> 상점을 삭제합니다.
            </p>
            <p>
              삭제를 원하신다면 아래에 <span className="font-bold text-red-500">삭제</span>를 입력해주세요.
            </p>
          </div>
          <input
            value={deleteInput}
            onChange={(e) => setDeleteInput(e.target.value)}
            placeholder="삭제"
            className="w-full h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-red-300 mb-4"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setDeleteTarget(null); setDeleteInput(""); }}
              className="flex-1 h-10 rounded-xl bg-gray-100 text-[13px] text-gray-700 font-medium"
            >
              취소
            </button>
            <button
              onClick={() => deleteInput === "삭제" && handleDeleteStore(deleteTarget.id)}
              className={`flex-1 h-10 rounded-xl text-[13px] font-medium transition-colors ${
                deleteInput === "삭제"
                  ? "bg-red-500 text-white"
                  : "bg-red-100 text-red-300 cursor-not-allowed"
              }`}
            >
              삭제
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
