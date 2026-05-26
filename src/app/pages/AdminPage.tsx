import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ParkingSquare, Armchair, Toilet, Info, Package, Music, Trash2, Settings } from "lucide-react";
import { loadRegisteredUsers, persistRegisteredUsers, deleteRegisteredUser, updateRegisteredUserPhone, updateRegisteredUserStatus, upsertRegisteredUser, isValidEmail, type RegisteredUser } from "../data/userAccounts";
import { ensureStoreAccounts, findDuplicateStoreAccountPhone, loadStoreAccountsMap, saveAllStoreAccounts, upsertStoreAccount, deleteStoreAccount, type StoreAccountRecord } from "../data/adminAccount";
import { loadStoreAccountsFromRemote, saveStoreAccountsLocally } from "../data/storeAccountsSync";
import {
  loadOwnerSignupApplications,
  OWNER_SIGNUP_MARKET_LABELS,
  updateOwnerSignupApplication,
  deleteOwnerSignupApplicationsByPhone,
  approveOwnerSignupApplication,
  findApprovedSignupByPhone,
  type OwnerSignupApplication,
} from "../data/ownerSignupApplications";
import {
  loadOwnerChangeRequests,
  updateOwnerChangeRequest,
  type OwnerChangeRequest,
} from "../data/ownerChangeRequests";
import { refreshOwnerChangeRequestsFromRemote } from "../data/ownerChangeRequestsSync";
import { refreshOwnerSignupApplicationsFromRemote } from "../data/ownerSignupApplicationsSync";
import { formatPhoneDisplay, formatPhoneInput } from "../utils/phoneFormat";
import {
  backupAdminSessionForImpersonation,
  setAdminStorePreviewContext,
} from "../data/authSession";
import {
  saveAdminReturnState,
  consumeAdminReturnState,
  type AdminReturnState,
} from "../data/adminNavigation";

const FACILITY_COLOR_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  "#448AFF": ParkingSquare,
  "#4CAF50": Armchair,
  "#FFC107": Toilet,
  "#FF5252": Info,
  "#9C27B0": Package,
  "#FF9800": Music,
};
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../context/AuthContext";
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
  refreshOwnerCatalogFromRemote,
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

function inferMarketIdFromStoreId(storeId: number): MarketId | undefined {
  const idx = Math.floor(storeId / 10000);
  if (idx >= 0 && idx < SEED_MARKET_ORDER.length) {
    return SEED_MARKET_ORDER[idx];
  }
  return undefined;
}

function resolveStoreMarketId(store: DraftStore | undefined, storeId: number): MarketId | undefined {
  if (store?.marketId === "jungang" || store?.marketId === "byeongcheon" || store?.marketId === "seonghwan") {
    return store.marketId;
  }
  return inferMarketIdFromStoreId(storeId);
}

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

const OWNER_APPROVED_STORE_NAME_KEY = "owner_approved_store_name";
const ADMIN_STORE_ACCOUNTS_KEY = "admin_store_accounts";
const UNREGISTERED_AUTO_PURGE_KEY = "admin_unregistered_accounts_purged_v1";

type StoreAccount = StoreAccountRecord;

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

type AdminPanelView = "market" | "applications" | "members";
type MembersListTab = "customers" | "stores";

type LoginableStoreItem = {
  key: string;
  storeId: number | null;
  name: string;
  phone: string;
  pin: string;
  subtitle: string;
  marketId?: MarketId;
};

type CustomerForm = {
  name: string;
  phone: string;
  email: string;
  pin: string;
};

const EMPTY_CUSTOMER_FORM: CustomerForm = {
  name: "",
  phone: "",
  email: "",
  pin: "",
};

function signupApplicationToDraftStore(app: OwnerSignupApplication, storeId: number): DraftStore {
  const phoneDigits = app.phone.replace(/\D/g, "");
  return {
    id: storeId,
    name: app.storeName,
    category: "기타·생활",
    location: app.address,
    hours: "",
    phone: formatPhoneDisplay(phoneDigits),
    description: "",
    lat: 0,
    lng: 0,
    marketId: app.marketId,
    image: app.storeImage,
  };
}

export function AdminPage() {
  const navigate = useNavigate();
  const { loginAsUser, login } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const marketParam = searchParams.get("market");
  const initialMarket: MarketId =
    marketParam === "jungang" || marketParam === "byeongcheon" || marketParam === "seonghwan"
      ? marketParam
      : "jungang";
  const [selectedMarket, setSelectedMarket] = useState<MarketId>(initialMarket);
  const [adminPanelView, setAdminPanelView] = useState<AdminPanelView>("market");
  const [membersListTab, setMembersListTab] = useState<MembersListTab>("customers");
  const [storeListSearchQuery, setStoreListSearchQuery] = useState("");
  const [storeListMarket, setStoreListMarket] = useState<MarketId>("jungang");
  const [storeListSettingsModeActive, setStoreListSettingsModeActive] = useState(false);
  const [storeListDeleteModeActive, setStoreListDeleteModeActive] = useState(false);
  const [applicationTab, setApplicationTab] = useState<"signup" | "storeSettings" | "customerSettings">("signup");
  const [signupApplications, setSignupApplications] = useState<OwnerSignupApplication[]>(() => loadOwnerSignupApplications());
  const [rejectingSignupId, setRejectingSignupId] = useState<number | null>(null);
  const [approvingSignupId, setApprovingSignupId] = useState<number | null>(null);
  const [signupRejectReasons, setSignupRejectReasons] = useState<Record<number, string>>({});
  const [imageViewApp, setImageViewApp] = useState<OwnerSignupApplication | null>(null);
  const [signupApprovedModal, setSignupApprovedModal] = useState<string | null>(null);
  const [storeSettingsSavedModal, setStoreSettingsSavedModal] = useState(false);
  const [customerSettingsSavedModal, setCustomerSettingsSavedModal] = useState(false);
  const [deleteSuccessModal, setDeleteSuccessModal] = useState(false);
  const [changeRejectingId, setChangeRejectingId] = useState<number | null>(null);
  const [changeRejectReasons, setChangeRejectReasons] = useState<Record<number, string>>({});
  const [changeRequests, setChangeRequests] = useState<OwnerChangeRequest[]>(() => loadOwnerChangeRequests());
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>(() => loadRegisteredUsers());
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerAddOpen, setCustomerAddOpen] = useState(false);
  const [customerSettingsTarget, setCustomerSettingsTarget] = useState<RegisteredUser | null>(null);
  const [customerDeleteTarget, setCustomerDeleteTarget] = useState<RegisteredUser | null>(null);
  const [customerDeleteInput, setCustomerDeleteInput] = useState("");
  const [customerForm, setCustomerForm] = useState<CustomerForm>(EMPTY_CUSTOMER_FORM);
  const [customerFormError, setCustomerFormError] = useState("");

  const [storeDeleteModeActive, setStoreDeleteModeActive] = useState(false);
  const [storeSettingsModeActive, setStoreSettingsModeActive] = useState(false);
  const [customerDeleteModeActive, setCustomerDeleteModeActive] = useState(false);
  const [customerSettingsModeActive, setCustomerSettingsModeActive] = useState(false);
  const [settingsTarget, setSettingsTarget] = useState<{ id: number; name: string } | null>(null);
  const [settingsForm, setSettingsForm] = useState({ storeName: "", phone: "", pin: "" });
  const [settingsError, setSettingsError] = useState("");
  const [storeAccounts, setStoreAccounts] = useState<Record<number, StoreAccount>>(() => loadStoreAccounts());
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [unregisteredDeleteTarget, setUnregisteredDeleteTarget] = useState<LoginableStoreItem | null>(null);
  const [unregisteredDeleteInput, setUnregisteredDeleteInput] = useState("");
  const [unregisteredDeleteAllOpen, setUnregisteredDeleteAllOpen] = useState(false);
  const [unregisteredDeleteAllInput, setUnregisteredDeleteAllInput] = useState("");
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
    if (adminPanelView !== "applications") return;
    void refreshOwnerChangeRequestsFromRemote().then(setChangeRequests);
    void refreshOwnerSignupApplicationsFromRemote().then(setSignupApplications);
  }, [adminPanelView]);

  useEffect(() => {
    if (adminPanelView !== "members") return;
    setRegisteredUsers(loadRegisteredUsers());
    setStoreAccounts(Object.fromEntries(Object.values(loadStoreAccountsMap()).map((item) => [item.storeId, item])));
  }, [adminPanelView, membersListTab]);

  const resetListEditModes = () => {
    setStoreSettingsModeActive(false);
    setStoreDeleteModeActive(false);
    setStoreListSettingsModeActive(false);
    setStoreListDeleteModeActive(false);
    setCustomerSettingsModeActive(false);
    setCustomerDeleteModeActive(false);
    setSettingsTarget(null);
    setCustomerSettingsTarget(null);
    setCustomerDeleteTarget(null);
    setCustomerDeleteInput("");
    setCustomerAddOpen(false);
    setCustomerForm(EMPTY_CUSTOMER_FORM);
    setCustomerFormError("");
  };

  const captureAdminReturnState = (scrollTargetId?: string) => {
    saveAdminReturnState({
      market: selectedMarket,
      adminPanelView,
      membersListTab,
      managementTab,
      scrollTargetId,
    });
  };

  useEffect(() => {
    const restore = consumeAdminReturnState();
    if (!restore) return;

    setSelectedMarket(restore.market);
    setAdminPanelView(restore.adminPanelView);
    setMembersListTab(restore.membersListTab);
    setManagementTab(restore.managementTab);
    setSelectedStoreId(null);
    setIsEditing(false);
    resetListEditModes();

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("market", restore.market);
        next.delete("adminReturn");
        next.delete("focusStore");
        return next;
      },
      { replace: true },
    );

    if (restore.scrollTargetId) {
      window.requestAnimationFrame(() => {
        document.getElementById(restore.scrollTargetId)?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    }
  }, [setSearchParams]);

  const openAdminPanel = (view: AdminPanelView) => {
    setAdminPanelView((current) => {
      if (current === view) return "market";
      return view;
    });
    resetListEditModes();
  };

  const handleApproveChangeRequest = (request: OwnerChangeRequest) => {
    updateOwnerChangeRequest(request.id, { status: "approved" });
    setChangeRequests((prev) => prev.filter((item) => item.id !== request.id));

    if (request.type === "storeName" && request.source !== "customer") {
      localStorage.setItem(OWNER_APPROVED_STORE_NAME_KEY, request.newValue);
      localStorage.setItem("owner_current_store_name", request.newValue);
      const updatedStores = draft.stores.map((store) =>
        request.storeId != null
          ? store.id === request.storeId
            ? { ...store, name: request.newValue }
            : store
          : store.name === request.storeName || store.name === request.currentValue
            ? { ...store, name: request.newValue }
            : store,
      );
      saveDraft({ ...draft, stores: updatedStores });

      const accounts = Object.values(loadStoreAccounts());
      const account =
        request.storeId != null
          ? accounts.find((item) => item.storeId === request.storeId)
          : accounts.find((item) => item.storeName === request.storeName || item.storeName === request.currentValue);
      if (account) {
        upsertStoreAccount({ ...account, storeName: request.newValue });
        setStoreAccounts((prev) => ({
          ...prev,
          [account.storeId]: { ...account, storeName: request.newValue },
        }));
      }
    }

    if (request.type === "phone") {
      const newPhone = request.newValue.replace(/\D/g, "");
      const currentPhone = request.currentValue.replace(/\D/g, "");
      const savedPhone = (localStorage.getItem("user_phone") || "").replace(/\D/g, "");
      if (!savedPhone || savedPhone === currentPhone) {
        localStorage.setItem("user_phone", newPhone);
      }
      updateRegisteredUserPhone(currentPhone, newPhone);

      if (request.source !== "customer") {
        const accounts = Object.values(loadStoreAccounts());
        const accountIdx = accounts.findIndex((item) =>
          request.storeId != null
            ? item.storeId === request.storeId
            : item.phone.replace(/\D/g, "") === currentPhone,
        );
        if (accountIdx >= 0) {
          const updated = { ...accounts[accountIdx], phone: newPhone };
          accounts[accountIdx] = updated;
          upsertStoreAccount(updated);
          setStoreAccounts((prev) => ({ ...prev, [updated.storeId]: updated }));
        }
      }
    }
  };

  const handleRejectChangeRequest = (requestId: number) => {
    updateOwnerChangeRequest(requestId, {
      status: "rejected",
      rejectReason: changeRejectReasons[requestId] || "",
    });
    setChangeRequests((prev) => prev.filter((item) => item.id !== requestId));
    setChangeRejectingId(null);
  };

  const storeChangeRequests = useMemo(
    () => changeRequests.filter((item) => item.source !== "customer" && item.status === "pending"),
    [changeRequests],
  );
  const customerChangeRequests = useMemo(
    () => changeRequests.filter((item) => item.source === "customer" && item.status === "pending"),
    [changeRequests],
  );

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
  const storeSettingsPendingCount = storeChangeRequests.length;
  const customerSettingsPendingCount = customerChangeRequests.length;
  const settingsPendingCount = storeSettingsPendingCount + customerSettingsPendingCount;
  const totalPendingCount = signupPendingCount + settingsPendingCount;
  const hasAdminModalOpen =
    deleteTarget !== null ||
    settingsTarget !== null ||
    customerSettingsTarget !== null ||
    customerDeleteTarget !== null ||
    unregisteredDeleteTarget !== null ||
    unregisteredDeleteAllOpen ||
    customerAddOpen ||
    imageViewApp !== null ||
    signupApprovedModal !== null ||
    storeSettingsSavedModal ||
    customerSettingsSavedModal ||
    deleteSuccessModal;

  useEffect(() => {
    if (hasAdminModalOpen) {
      document.body.classList.add("app-modal-open");
    } else {
      document.body.classList.remove("app-modal-open");
    }
    return () => document.body.classList.remove("app-modal-open");
  }, [hasAdminModalOpen]);

  const normalizeCatalogDraft = (catalog: { stores?: DraftStore[]; facilities?: OwnerDashboardDraft["facilities"] }): OwnerDashboardDraft => ({
    stores: (catalog.stores ?? []).map((store) => ({
      ...store,
      marketId:
        store.marketId === "jungang" || store.marketId === "byeongcheon" || store.marketId === "seonghwan"
          ? store.marketId
          : undefined,
    })),
    facilities: (catalog.facilities ?? []).map((facility) => ({
      ...facility,
      marketId:
        facility.marketId === "jungang" || facility.marketId === "byeongcheon" || facility.marketId === "seonghwan"
          ? facility.marketId
          : undefined,
    })),
  });

  useEffect(() => {
    migrateLegacyOwnerDraftIfNeeded();
    let cancelled = false;
    const load = async () => {
      const merged = await refreshOwnerCatalogFromRemote();
      if (cancelled) return;
      setDraft(normalizeCatalogDraft(merged));
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (adminPanelView !== "market") return;
    let cancelled = false;
    const refreshMarketData = async () => {
      const [catalog, applications] = await Promise.all([
        refreshOwnerCatalogFromRemote(),
        refreshOwnerSignupApplicationsFromRemote(),
      ]);
      if (cancelled) return;
      setDraft(normalizeCatalogDraft(catalog));
      setSignupApplications(applications);
      setStoreAccounts(Object.fromEntries(Object.values(loadStoreAccountsMap()).map((item) => [item.storeId, item])));
    };
    void refreshMarketData();
    return () => {
      cancelled = true;
    };
  }, [adminPanelView]);

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

    loadOwnerSignupApplications()
      .filter((app) => app.status === "approved" && app.approvedStoreId != null)
      .forEach((app) => {
        const storeId = app.approvedStoreId!;
        if (byId.has(storeId)) return;
        byId.set(storeId, signupApplicationToDraftStore(app, storeId));
      });

    Object.values(storeAccounts).forEach((account) => {
      if (byId.has(account.storeId)) return;
      const app =
        loadOwnerSignupApplications().find(
          (item) =>
            item.approvedStoreId === account.storeId ||
            (item.phone.replace(/\D/g, "") === account.phone.replace(/\D/g, "") &&
              item.status === "approved"),
        ) ?? null;
      if (app) {
        byId.set(account.storeId, signupApplicationToDraftStore(app, account.storeId));
        return;
      }
      byId.set(account.storeId, {
        id: account.storeId,
        name: account.storeName,
        category: "기타·생활",
        location: "",
        hours: "",
        phone: formatPhoneDisplay(account.phone),
        description: "",
        lat: 0,
        lng: 0,
        marketId: "jungang",
      });
    });

    return Array.from(byId.values());
  }, [dummyStores, draft.stores, signupApplications, storeAccounts]);

  const handleApproveSignup = (application: OwnerSignupApplication) => {
    if (approvingSignupId === application.id) return;
    if (application.status !== "pending") {
      setSignupApplications(loadOwnerSignupApplications());
      return;
    }

    setApprovingSignupId(application.id);

    const phoneDigits = application.phone.replace(/\D/g, "");
    const existingApproved = findApprovedSignupByPhone(phoneDigits);
    if (existingApproved?.approvedStoreId != null) {
      setSignupApplications(approveOwnerSignupApplication(application, existingApproved.approvedStoreId));
      setRejectingSignupId(null);
      setSignupApprovedModal(application.storeName);
      setApprovingSignupId(null);
      return;
    }

    const existingAccount = Object.values(storeAccounts).find(
      (item) => item.phone.replace(/\D/g, "") === phoneDigits,
    );
    if (existingAccount) {
      setSignupApplications(approveOwnerSignupApplication(application, existingAccount.storeId));
      setRejectingSignupId(null);
      setSignupApprovedModal(application.storeName);
      setApprovingSignupId(null);
      return;
    }

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
    setStoreAccounts((prev) => {
      const phoneDigits = application.phone.replace(/\D/g, "");
      const next = Object.fromEntries(
        Object.entries(prev).filter(
          ([, item]) => item.phone.replace(/\D/g, "") !== phoneDigits || item.storeId === newStoreId,
        ),
      );
      next[newStoreId] = nextAccount;
      return next;
    });
    upsertCatalogStore(newStore);
    saveOwnerStoreWorkspace(newStoreId, {
      menus: [],
      todayDeal: "",
      news: "",
      couponEvent: "",
      reviewReply: "",
      inquiryReply: "",
    });
    const cleanedStores = draft.stores.filter((store) => store.id !== newStoreId);
    saveDraft({ ...draft, stores: [...cleanedStores, newStore] });
    updateRegisteredUserStatus(phoneDigits, "active");
    upsertRegisteredUser({
      phone: phoneDigits,
      pin: application.pin,
      email: application.email,
      name: application.storeName,
      role: "owner",
      status: "active",
    });
    if (deletedIds.has(newStoreId)) {
      const nextDeletedIds = new Set(deletedIds);
      nextDeletedIds.delete(newStoreId);
      setDeletedIds(nextDeletedIds);
      localStorage.setItem("admin-deleted-store-ids", JSON.stringify(Array.from(nextDeletedIds)));
    }
    setSignupApplications(approveOwnerSignupApplication(application, newStoreId));
    setRejectingSignupId(null);
    setSignupApprovedModal(application.storeName);
    setApprovingSignupId(null);
  };

  const handleRejectSignup = (application: OwnerSignupApplication) => {
    const reason = (signupRejectReasons[application.id] || "").trim() || "관리자에 의해 거절되었습니다.";
    updateRegisteredUserStatus(application.phone, "rejected");
    setSignupApplications(
      updateOwnerSignupApplication(application.id, {
        status: "rejected",
        rejectReason: reason,
      }),
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
    const accounts = ensureStoreAccounts(
      mergedStores.map((store) => ({ id: store.id, name: store.name })),
      current,
    );
    const changed =
      accounts.length !== Object.keys(current).length ||
      accounts.some((item) => {
        const prev = current[item.storeId];
        return !prev || prev.phone !== item.phone || prev.pin !== item.pin || prev.storeName !== item.storeName;
      });
    if (!changed) return;
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

    const account = storeAccounts[id];
    if (account?.phone) {
      deleteRegisteredUser(account.phone);
    }
    deleteStoreAccount(id);
    setStoreAccounts((prev) => {
      const nextAccounts = { ...prev };
      delete nextAccounts[id];
      return nextAccounts;
    });

    const newDraft = { ...draft, stores: draft.stores.filter((s) => s.id !== id) };
    saveDraft(newDraft);
    if (selectedStoreId === id) {
      setSelectedStoreId(null);
      setIsEditing(false);
    }
    setDeleteTarget(null);
    setDeleteInput("");
    setDeleteSuccessModal(true);
  };

  const customerUsers = useMemo(
    () => registeredUsers.filter((user) => user.role === "customer"),
    [registeredUsers],
  );

  const filteredCustomers = useMemo(() => {
    const q = customerSearchQuery.trim().toLowerCase();
    return customerUsers.filter((user) => {
      if (!q) return true;
      return (
        user.name.toLowerCase().includes(q) ||
        user.phone.includes(q) ||
        user.email.toLowerCase().includes(q)
      );
    });
  }, [customerUsers, customerSearchQuery]);

  const registeredCatalogStoreIds = useMemo(() => {
    return new Set(
      mergedStores.filter((store) => !deletedIds.has(store.id)).map((store) => store.id),
    );
  }, [mergedStores, deletedIds]);

  const loginableStores = useMemo<LoginableStoreItem[]>(() => {
    const items: LoginableStoreItem[] = [];

    mergedStores.forEach((store) => {
      if (deletedIds.has(store.id)) return;
      const marketId = resolveStoreMarketId(store, store.id);
      if (!marketId) return;

      const account = storeAccounts[store.id];
      const phoneDigits = (account?.phone ?? store.phone).replace(/\D/g, "");
      const pin = account?.pin ?? "";
      if (!phoneDigits || !pin) return;

      const marketLabel = OWNER_SIGNUP_MARKET_LABELS[marketId];
      items.push({
        key: `store-${store.id}`,
        storeId: store.id,
        name: account?.storeName ?? store.name,
        phone: phoneDigits,
        pin,
        subtitle: [marketLabel, store.location].filter(Boolean).join(" · "),
        marketId,
      });
    });

    return items.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [storeAccounts, mergedStores, deletedIds]);

  const unregisteredLoginAccounts = useMemo<LoginableStoreItem[]>(() => {
    const items: LoginableStoreItem[] = [];
    const seenPhones = new Set<string>();

    Object.values(storeAccounts).forEach((account) => {
      if (registeredCatalogStoreIds.has(account.storeId) || deletedIds.has(account.storeId)) return;
      const phoneDigits = account.phone.replace(/\D/g, "");
      if (!phoneDigits || !account.pin) return;
      seenPhones.add(phoneDigits);
      items.push({
        key: `orphan-${account.storeId}`,
        storeId: account.storeId,
        name: account.storeName,
        phone: phoneDigits,
        pin: account.pin,
        subtitle: "시장 카탈로그 미등록 · 로그인 계정만 존재",
      });
    });

    registeredUsers
      .filter((user) => user.role === "owner" && user.status === "active" && user.pin)
      .forEach((user) => {
        const phoneDigits = user.phone.replace(/\D/g, "");
        if (seenPhones.has(phoneDigits)) return;
        seenPhones.add(phoneDigits);
        items.push({
          key: `owner-${phoneDigits}`,
          storeId: null,
          name: user.name,
          phone: phoneDigits,
          pin: user.pin,
          subtitle: user.email ? `${user.email} · 시장 미등록` : "시장 미등록 · 상점 정보 없음",
        });
      });

    return items.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [storeAccounts, registeredCatalogStoreIds, deletedIds, registeredUsers]);

  const filteredLoginableStores = useMemo(() => {
    const q = storeListSearchQuery.trim().toLowerCase();
    return loginableStores.filter((store) => {
      if (store.marketId !== storeListMarket) return false;
      if (!q) return true;
      return (
        store.name.toLowerCase().includes(q) ||
        store.phone.includes(q) ||
        store.subtitle.toLowerCase().includes(q)
      );
    });
  }, [loginableStores, storeListSearchQuery, storeListMarket]);

  const filteredUnregisteredLoginAccounts = useMemo(() => {
    const q = storeListSearchQuery.trim().toLowerCase();
    return unregisteredLoginAccounts.filter((store) => {
      if (!q) return true;
      return (
        store.name.toLowerCase().includes(q) ||
        store.phone.includes(q) ||
        store.subtitle.toLowerCase().includes(q)
      );
    });
  }, [unregisteredLoginAccounts, storeListSearchQuery]);

  const purgeUnregisteredLoginAccounts = (items: LoginableStoreItem[]) => {
    if (items.length === 0) return;
    items.forEach((item) => {
      deleteRegisteredUser(item.phone);
      deleteOwnerSignupApplicationsByPhone(item.phone);
      if (item.storeId != null) {
        deleteStoreAccount(item.storeId);
      }
    });
    setStoreAccounts((prev) => {
      const next = { ...prev };
      items.forEach((item) => {
        if (item.storeId != null) delete next[item.storeId];
      });
      return next;
    });
    setRegisteredUsers(loadRegisteredUsers());
    setSignupApplications(loadOwnerSignupApplications());
  };

  useEffect(() => {
    if (localStorage.getItem(UNREGISTERED_AUTO_PURGE_KEY)) return;
    if (unregisteredLoginAccounts.length === 0) {
      localStorage.setItem(UNREGISTERED_AUTO_PURGE_KEY, "1");
      return;
    }
    purgeUnregisteredLoginAccounts(unregisteredLoginAccounts);
    localStorage.setItem(UNREGISTERED_AUTO_PURGE_KEY, "1");
  }, [unregisteredLoginAccounts]);

  const handleDeleteUnregisteredAccount = () => {
    if (!unregisteredDeleteTarget) return;
    purgeUnregisteredLoginAccounts([unregisteredDeleteTarget]);
    setUnregisteredDeleteTarget(null);
    setUnregisteredDeleteInput("");
    setDeleteSuccessModal(true);
  };

  const handleDeleteAllUnregisteredAccounts = () => {
    purgeUnregisteredLoginAccounts(unregisteredLoginAccounts);
    setUnregisteredDeleteAllOpen(false);
    setUnregisteredDeleteAllInput("");
    setStoreListDeleteModeActive(false);
    setDeleteSuccessModal(true);
  };

  const openUnregisteredDeleteConfirm = (item: LoginableStoreItem) => {
    setUnregisteredDeleteTarget(item);
    setUnregisteredDeleteInput("");
  };

  const getStoreDraftForListItem = (item: LoginableStoreItem): DraftStore | null => {
    if (item.storeId == null) return null;
    const existing = mergedStores.find((store) => store.id === item.storeId);
    if (existing) return existing;
    return {
      id: item.storeId,
      name: item.name,
      category: "기타·생활",
      location: item.subtitle.split(" · ").slice(1).join(" · ") || "",
      hours: "",
      phone: formatPhoneDisplay(item.phone),
      description: "",
      lat: 0,
      lng: 0,
      marketId: item.marketId ?? storeListMarket,
    };
  };

  const openStoreListAdd = () => {
    window.localStorage.removeItem(OWNER_EDIT_STORE_KEY);
    captureAdminReturnState();
    navigate(`/owner/store-registration?market=${storeListMarket}&returnTo=admin&adminNew=1`);
  };

  const openStoreListSettings = (item: LoginableStoreItem) => {
    const store = getStoreDraftForListItem(item);
    if (!store) return;
    openStoreSettings(store);
  };

  const openStoreListDeleteConfirm = (item: LoginableStoreItem) => {
    if (item.storeId == null) {
      openUnregisteredDeleteConfirm(item);
      return;
    }
    openDeleteConfirm({ id: item.storeId, name: item.name });
  };

  const validateCustomerForm = (form: CustomerForm, editingPhone?: string) => {
    const name = form.name.trim();
    const phoneDigits = form.phone.replace(/\D/g, "");
    const email = form.email.trim();
    const pin = form.pin.trim();
    if (!name) return "닉네임을 입력해주세요.";
    if (!/^[0-9]{10,11}$/.test(phoneDigits)) return "휴대폰 번호는 10~11자리 숫자로 입력해주세요.";
    if (email && !isValidEmail(email)) return "올바른 이메일 형식으로 입력해주세요.";
    if (!/^[0-9]{4,6}$/.test(pin)) return "PIN 번호는 4~6자리 숫자로 입력해주세요.";
    const duplicate = registeredUsers.some(
      (user) => user.phone === phoneDigits && user.phone !== editingPhone,
    );
    if (duplicate) return "이미 가입된 휴대폰 번호입니다.";
    return "";
  };

  const refreshRegisteredUsers = () => {
    setRegisteredUsers(loadRegisteredUsers());
  };

  const openCustomerAddModal = () => {
    setCustomerForm(EMPTY_CUSTOMER_FORM);
    setCustomerFormError("");
    setCustomerAddOpen(true);
  };

  const openCustomerSettings = (user: RegisteredUser) => {
    setCustomerSettingsTarget(user);
    setCustomerForm({
      name: user.name,
      phone: formatPhoneDisplay(user.phone),
      email: user.email,
      pin: user.pin,
    });
    setCustomerFormError("");
  };

  const handleSaveCustomerSettings = () => {
    if (!customerSettingsTarget) return;
    const error = validateCustomerForm(customerForm, customerSettingsTarget.phone);
    if (error) {
      setCustomerFormError(error);
      return;
    }
    const oldPhone = customerSettingsTarget.phone;
    const phoneDigits = customerForm.phone.replace(/\D/g, "");
    const updated: RegisteredUser = {
      ...customerSettingsTarget,
      name: customerForm.name.trim(),
      phone: phoneDigits,
      email: customerForm.email.trim(),
      pin: customerForm.pin.trim(),
    };
    if (oldPhone !== phoneDigits) {
      updateRegisteredUserPhone(oldPhone, phoneDigits);
    }
    upsertRegisteredUser(updated);
    refreshRegisteredUsers();
    setCustomerSettingsTarget(null);
    setCustomerForm(EMPTY_CUSTOMER_FORM);
    setCustomerFormError("");
    setCustomerSettingsSavedModal(true);
  };

  const handleAddCustomer = () => {
    const error = validateCustomerForm(customerForm);
    if (error) {
      setCustomerFormError(error);
      return;
    }
    const user: RegisteredUser = {
      name: customerForm.name.trim(),
      phone: customerForm.phone.replace(/\D/g, ""),
      email: customerForm.email.trim(),
      pin: customerForm.pin.trim(),
      role: "customer",
      status: "active",
    };
    persistRegisteredUsers([...loadRegisteredUsers(), user]);
    refreshRegisteredUsers();
    setCustomerAddOpen(false);
    setCustomerForm(EMPTY_CUSTOMER_FORM);
    setCustomerFormError("");
  };

  const handleDeleteCustomer = () => {
    if (!customerDeleteTarget) return;
    deleteRegisteredUser(customerDeleteTarget.phone);
    refreshRegisteredUsers();
    setCustomerDeleteTarget(null);
    setCustomerDeleteInput("");
    setDeleteSuccessModal(true);
  };

  const openCustomerDeleteConfirm = (user: RegisteredUser) => {
    setCustomerDeleteTarget(user);
    setCustomerDeleteInput("");
  };

  const handleLoginAsStore = (item: LoginableStoreItem) => {
    const isAdminSession = localStorage.getItem("user_role") === "admin";
    if (isAdminSession && item.storeId != null) {
      const store = mergedStores.find((entry) => entry.id === item.storeId);
      const marketId = store?.marketId ?? item.marketId ?? storeListMarket;
      setAdminStorePreviewContext(item.storeId, item.name);
      captureAdminReturnState();
      navigate(
        `/owner/store-registration?market=${marketId}&editStoreId=${item.storeId}&returnTo=admin`,
        { replace: true },
      );
      return;
    }

    if (isAdminSession) {
      backupAdminSessionForImpersonation();
      captureAdminReturnState();
    }

    const result = login(item.phone, item.pin);
    if (result.ok) {
      const returnQuery = isAdminSession ? "?returnTo=admin" : "";
      navigate(`${result.redirect}${returnQuery}`, { replace: true });
      return;
    }
    window.alert(result.error);
  };

  const handleLoginAsCustomer = (user: RegisteredUser) => {
    if (customerSettingsModeActive || customerDeleteModeActive) return;
    if (!user.pin) {
      window.alert("PIN이 설정되지 않은 계정입니다.");
      return;
    }
    const result = loginAsUser(user);
    if (result.ok) {
      navigate(result.redirect, { replace: true });
      return;
    }
    window.alert(result.error);
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
  const storeListMarketLabel =
    MARKET_BUTTONS.find((market) => market.id === storeListMarket)?.label ?? "선택 시장";

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
    const previousAccount = storeAccounts[settingsTarget.id];

    if (!storeName) {
      setSettingsError("상점명을 입력해주세요.");
      return;
    }
    if (!phoneDigits) {
      setSettingsError("휴대폰 번호를 입력해주세요.");
      return;
    }
    if (!/^[0-9]{10,11}$/.test(phoneDigits)) {
      setSettingsError("휴대폰 번호는 10~11자리 숫자로 입력해주세요.");
      return;
    }
    if (!/^[0-9]{4,6}$/.test(pin)) {
      setSettingsError("PIN 번호는 4~6자리 숫자로 입력해주세요.");
      return;
    }
    const duplicate = findDuplicateStoreAccountPhone(phoneDigits, settingsTarget.id, storeAccounts);
    if (duplicate) {
      setSettingsError("다른 상점에서 사용 중인 휴대폰 번호입니다.");
      return;
    }

    const nextAccount: StoreAccount = {
      storeId: settingsTarget.id,
      storeName,
      phone: phoneDigits,
      pin,
    };

    upsertStoreAccount(nextAccount);
    setStoreAccounts((prev) => ({ ...prev, [settingsTarget.id]: nextAccount }));

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

    const oldPhone = previousAccount?.phone.replace(/\D/g, "") ?? "";
    const ownerUser =
      (oldPhone ? loadRegisteredUsers().find((user) => user.role === "owner" && user.phone === oldPhone) : null)
      ?? loadRegisteredUsers().find(
        (user) => user.role === "owner" && user.name === settingsTarget.name,
      );
    if (ownerUser) {
      if (oldPhone && oldPhone !== phoneDigits) {
        updateRegisteredUserPhone(oldPhone, phoneDigits);
      }
      const syncedUser = loadRegisteredUsers().find((user) => user.phone === phoneDigits) ?? ownerUser;
      upsertRegisteredUser({
        ...syncedUser,
        phone: phoneDigits,
        pin,
        name: storeName,
        role: "owner",
        status: syncedUser.status === "pending" || syncedUser.status === "rejected" ? syncedUser.status : "active",
      });
    }

    setSettingsTarget(null);
    setSettingsForm({ storeName: "", phone: "", pin: "" });
    setSettingsError("");
    setStoreSettingsSavedModal(true);
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
    setAdminStorePreviewContext(ensuredStore.id, ensuredStore.name);
    captureAdminReturnState(
      source === "map" ? "admin-store-map-section" : `admin-store-card-${ensuredStore.id}`,
    );
    navigate(
      `/owner/store-registration?market=${ensuredStore.marketId}&editStoreId=${ensuredStore.id}&returnTo=admin`,
    );
  };

  const openOwnerNewStoreEditor = () => {
    window.localStorage.removeItem(OWNER_EDIT_STORE_KEY);
    captureAdminReturnState();
    navigate(`/owner/store-registration?market=${selectedMarket}&returnTo=admin&adminNew=1`);
  };

  const openFacilityRegistration = () => {
    captureAdminReturnState();
    navigate(`/owner/facility-registration?market=${selectedMarket}&returnTo=admin`);
  };

  const openFacilityEditor = (facility: DraftFacility) => {
    const ensured: DraftFacility = {
      ...facility,
      marketId: facility.marketId ?? selectedMarket,
    };
    window.localStorage.setItem(OWNER_EDIT_FACILITY_KEY, JSON.stringify(ensured));
    captureAdminReturnState();
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
        setAdminPanelView("market");
        setManagementTab("store");
        setSelectedStoreId(null);
        setIsEditing(false);
        document.getElementById("admin-store-map-section")?.scrollIntoView({ block: "start", behavior: "smooth" });
        window.setTimeout(clearReturnParams, 350);
        return;
      }
      if (adminReturn === "list") {
        setAdminPanelView("market");
        setManagementTab("store");
        setSelectedStoreId(null);
        setIsEditing(false);
        if (focusStoreRaw) {
          const id = Number(focusStoreRaw);
          if (Number.isFinite(id)) {
            document.getElementById(`admin-store-card-${id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
          }
        }
        window.setTimeout(clearReturnParams, 350);
      }
    });
  }, [searchParams, setSearchParams]);

  const renderChangeRequestList = (
    requests: OwnerChangeRequest[],
    options: {
      title: string;
      pendingCount: number;
      isDemo: boolean;
      demoMessage: string;
      nameLabel: string;
      emptyMessage: string;
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
      {requests.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-xl px-4 py-8 text-center">
          <p className="text-[13px] text-gray-500">{options.emptyMessage}</p>
        </div>
      ) : (
        requests.map((request) => {
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
          </div>
        );
      })
      )}
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
            {adminPanelView === "applications"
              ? "신청 · 설정"
              : adminPanelView === "members"
                ? membersListTab === "stores"
                  ? "상점 목록"
                  : "손님 목록"
                : selectedMarketLabel}
          </h1>
          <div className="w-7" />
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        <div className="bg-white rounded-xl p-2 flex gap-2 overflow-x-auto">
          {MARKET_BUTTONS.map((market) => {
            const isActive = selectedMarket === market.id && adminPanelView === "market";
            return (
              <button
                key={market.id}
                onClick={() => {
                  setAdminPanelView("market");
                  resetListEditModes();
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
            onClick={() => openAdminPanel("applications")}
            className={`h-9 px-3 rounded-lg text-[12px] whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              adminPanelView === "applications"
                ? "bg-amber-500 text-white"
                : "bg-amber-50 text-amber-600 border border-amber-200"
            }`}
          >
            신청 · 설정
            {totalPendingCount > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                adminPanelView === "applications" ? "bg-white text-amber-600" : "bg-amber-500 text-white"
              }`}>{totalPendingCount}</span>
            )}
          </button>
          <button
            onClick={() => openAdminPanel("members")}
            className={`h-9 px-3 rounded-lg text-[12px] whitespace-nowrap transition-colors ${
              adminPanelView === "members"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            목록
          </button>
        </div>

        {adminPanelView === "members" && (
          <div className="bg-white rounded-xl p-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMembersListTab("customers");
                resetListEditModes();
              }}
              className={`flex-1 h-9 rounded-lg text-[12px] font-medium transition-colors ${
                membersListTab === "customers" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              손님 목록
            </button>
            <button
              type="button"
              onClick={() => {
                setMembersListTab("stores");
                resetListEditModes();
              }}
              className={`flex-1 h-9 rounded-lg text-[12px] font-medium transition-colors ${
                membersListTab === "stores" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              상점 목록
            </button>
          </div>
        )}

        {/* 신청 · 설정 패널 */}
        {adminPanelView === "applications" && (
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
                              disabled={approvingSignupId === app.id}
                              className={`flex-1 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                                approvingSignupId === app.id
                                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                  : "bg-gray-900 text-white active:bg-gray-700"
                              }`}
                            >{approvingSignupId === app.id ? "승인 중..." : "승인"}</button>
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
              renderChangeRequestList(storeChangeRequests, {
                title: "상점 설정 변경 신청 현황",
                pendingCount: storeSettingsPendingCount,
                isDemo: false,
                demoMessage: "",
                nameLabel: "상점",
                emptyMessage: "상점 설정 변경 신청이 없습니다.",
              })
            ) : (
              renderChangeRequestList(customerChangeRequests, {
                title: "손님 설정 변경 신청 현황",
                pendingCount: customerSettingsPendingCount,
                isDemo: false,
                demoMessage: "",
                nameLabel: "닉네임",
                emptyMessage: "손님 설정 변경 신청이 없습니다.",
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

        {storeSettingsSavedModal && (
          <div className="app-modal-overlay fixed inset-0 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setStoreSettingsSavedModal(false)} />
            <div className="app-modal-content relative bg-white rounded-2xl shadow-xl p-6 mx-6 w-full max-w-sm text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-[24px]">✅</span>
              </div>
              <p className="text-[16px] font-bold text-gray-900 mb-2">저장되었습니다</p>
              <p className="text-[13px] text-gray-500 mb-5">상점 계정 정보가 반영되었습니다.</p>
              <button
                type="button"
                onClick={() => setStoreSettingsSavedModal(false)}
                className="w-full h-11 rounded-xl bg-gray-900 text-white text-[14px] font-semibold active:bg-gray-800 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        )}

        {customerSettingsSavedModal && (
          <div className="app-modal-overlay fixed inset-0 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setCustomerSettingsSavedModal(false)} />
            <div className="app-modal-content relative bg-white rounded-2xl shadow-xl p-6 mx-6 w-full max-w-sm text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-[24px]">✅</span>
              </div>
              <p className="text-[16px] font-bold text-gray-900 mb-2">저장되었습니다</p>
              <p className="text-[13px] text-gray-500 mb-5">손님 계정 정보가 반영되었습니다.</p>
              <button
                type="button"
                onClick={() => setCustomerSettingsSavedModal(false)}
                className="w-full h-11 rounded-xl bg-gray-900 text-white text-[14px] font-semibold active:bg-gray-800 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        )}

        {deleteSuccessModal && (
          <div className="app-modal-overlay fixed inset-0 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteSuccessModal(false)} />
            <div className="app-modal-content relative bg-white rounded-2xl shadow-xl p-6 mx-6 w-full max-w-sm text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-[24px]">✅</span>
              </div>
              <p className="text-[16px] font-bold text-gray-900 mb-2">삭제되었습니다</p>
              <p className="text-[13px] text-gray-500 mb-5">목록에서 제거되었습니다.</p>
              <button
                type="button"
                onClick={() => setDeleteSuccessModal(false)}
                className="w-full h-11 rounded-xl bg-gray-900 text-white text-[14px] font-semibold active:bg-gray-800 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        )}

        {adminPanelView === "members" && membersListTab === "customers" && (
          <div className="bg-white rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[14px] text-gray-900">가입 손님 목록</h2>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-gray-500">{filteredCustomers.length}명</span>
                <button
                  type="button"
                  onClick={openCustomerAddModal}
                  className="h-7 px-2.5 rounded-lg bg-gray-900 text-[12px] text-white"
                >
                  추가
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomerSettingsModeActive((active) => {
                      if (active) setCustomerSettingsTarget(null);
                      return !active;
                    });
                    setCustomerDeleteModeActive(false);
                  }}
                  className={`h-7 px-2.5 rounded-lg text-[12px] transition-colors ${
                    customerSettingsModeActive ? "bg-blue-500 text-white" : "bg-blue-50 text-blue-600 border border-blue-200"
                  }`}
                >
                  {customerSettingsModeActive ? "완료" : "설정"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomerDeleteModeActive((active) => {
                      if (active) setCustomerDeleteTarget(null);
                      return !active;
                    });
                    setCustomerSettingsModeActive(false);
                    setCustomerSettingsTarget(null);
                  }}
                  className={`h-7 px-2.5 rounded-lg text-[12px] transition-colors ${
                    customerDeleteModeActive ? "bg-red-500 text-white" : "bg-red-50 text-red-500 border border-red-200"
                  }`}
                >
                  {customerDeleteModeActive ? "완료" : "삭제"}
                </button>
              </div>
            </div>

            <input
              value={customerSearchQuery}
              onChange={(e) => setCustomerSearchQuery(e.target.value)}
              placeholder="닉네임 · 휴대폰 · 이메일"
              className="w-full h-9 rounded-lg bg-gray-100 px-3 text-[12px] focus:outline-none focus:ring-1 focus:ring-gray-300"
            />

            {filteredCustomers.length === 0 ? (
              <div className="border border-dashed border-gray-200 rounded-xl px-4 py-8 text-center">
                <p className="text-[13px] text-gray-500">가입한 손님이 없습니다.</p>
                <p className="text-[11px] text-gray-400 mt-1">추가 버튼으로 손님 계정을 등록할 수 있습니다.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCustomers.map((user) => {
                  const canLoginAsCustomer = !customerSettingsModeActive && !customerDeleteModeActive;
                  const customerInfo = (
                    <>
                      <p className="text-[13px] text-gray-900 font-medium">{user.name || "닉네임 없음"}</p>
                      <p className="text-[12px] text-gray-500 mt-0.5">
                        {formatPhoneDisplay(user.phone)} · {user.email || "이메일 없음"}
                      </p>
                      <p className="text-[10px] text-blue-500 mt-0.5">
                        로그인 {formatPhoneDisplay(user.phone)}
                        {user.pin && <span> · PIN {user.pin}</span>}
                      </p>
                    </>
                  );

                  return (
                  <div key={user.phone} className="flex items-center gap-2 rounded-lg bg-gray-50 p-3">
                    {canLoginAsCustomer ? (
                      <button
                        type="button"
                        onClick={() => handleLoginAsCustomer(user)}
                        className="flex-1 min-w-0 text-left rounded-lg active:bg-gray-100 transition-colors"
                      >
                        {customerInfo}
                      </button>
                    ) : (
                      <div className="flex-1 min-w-0">{customerInfo}</div>
                    )}
                    {customerSettingsModeActive && (
                      <button
                        type="button"
                        onClick={() => openCustomerSettings(user)}
                        className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 active:bg-blue-200 transition-colors"
                        aria-label="손님 계정 설정"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    )}
                    {customerDeleteModeActive && (
                      <button
                        type="button"
                        onClick={() => openCustomerDeleteConfirm(user)}
                        className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-500 active:bg-red-200 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {adminPanelView === "members" && membersListTab === "stores" && (
          <div className="bg-white rounded-xl p-4 space-y-3">
            <div className="flex gap-1.5 overflow-x-auto">
              {MARKET_BUTTONS.map((market) => (
                <button
                  key={market.id}
                  type="button"
                  onClick={() => setStoreListMarket(market.id)}
                  className={`h-8 px-3 rounded-lg whitespace-nowrap text-[12px] transition-colors ${
                    storeListMarket === market.id ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {market.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[14px] text-gray-900">{storeListMarketLabel} 등록 상점</h2>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-gray-500">{filteredLoginableStores.length}개</span>
                <button
                  type="button"
                  onClick={openStoreListAdd}
                  className="h-7 px-2.5 rounded-lg bg-gray-900 text-[12px] text-white"
                >
                  추가
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStoreListSettingsModeActive((active) => {
                      if (active) setSettingsTarget(null);
                      return !active;
                    });
                    setStoreListDeleteModeActive(false);
                  }}
                  className={`h-7 px-2.5 rounded-lg text-[12px] transition-colors ${
                    storeListSettingsModeActive
                      ? "bg-blue-500 text-white"
                      : "bg-blue-50 text-blue-600 border border-blue-200"
                  }`}
                >
                  {storeListSettingsModeActive ? "완료" : "설정"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStoreListDeleteModeActive((active) => {
                      if (active) setDeleteTarget(null);
                      return !active;
                    });
                    setStoreListSettingsModeActive(false);
                    setSettingsTarget(null);
                  }}
                  className={`h-7 px-2.5 rounded-lg text-[12px] transition-colors ${
                    storeListDeleteModeActive
                      ? "bg-red-500 text-white"
                      : "bg-red-50 text-red-500 border border-red-200"
                  }`}
                >
                  {storeListDeleteModeActive ? "완료" : "삭제"}
                </button>
              </div>
            </div>

            <input
              value={storeListSearchQuery}
              onChange={(e) => setStoreListSearchQuery(e.target.value)}
              placeholder="상점명 · 휴대폰 · 위치"
              className="w-full h-9 rounded-lg bg-gray-100 px-3 text-[12px] focus:outline-none focus:ring-1 focus:ring-gray-300"
            />

            {filteredLoginableStores.length === 0 ? (
              <div className="border border-dashed border-gray-200 rounded-xl px-4 py-8 text-center">
                <p className="text-[13px] text-gray-500">선택한 시장에 등록된 상점이 없습니다.</p>
                <p className="text-[11px] text-gray-400 mt-1">추가 버튼으로 상점을 등록할 수 있습니다.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLoginableStores.map((store) => {
                  const canLoginAsStore = !storeListSettingsModeActive && !storeListDeleteModeActive;
                  const storeInfo = (
                    <>
                      <p className="text-[13px] text-gray-900 font-medium">{store.name}</p>
                      <p className="text-[12px] text-gray-500 mt-0.5">
                        {formatPhoneDisplay(store.phone)} · {store.subtitle}
                      </p>
                      <p className="text-[10px] text-blue-500 mt-0.5">
                        로그인 {formatPhoneDisplay(store.phone)}
                        {store.pin && <span> · PIN {store.pin}</span>}
                      </p>
                    </>
                  );

                  return (
                    <div key={store.key} className="flex items-center gap-2 rounded-lg bg-gray-50 p-3">
                      {canLoginAsStore ? (
                        <button
                          type="button"
                          onClick={() => handleLoginAsStore(store)}
                          className="flex-1 min-w-0 text-left rounded-lg active:bg-gray-100 transition-colors"
                        >
                          {storeInfo}
                        </button>
                      ) : (
                        <div className="flex-1 min-w-0">{storeInfo}</div>
                      )}
                      {storeListSettingsModeActive && store.storeId != null && (
                        <button
                          type="button"
                          onClick={() => openStoreListSettings(store)}
                          className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 active:bg-blue-200 transition-colors"
                          aria-label="상점 계정 설정"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      )}
                      {storeListDeleteModeActive && store.storeId != null && (
                        <button
                          type="button"
                          onClick={() => openStoreListDeleteConfirm(store)}
                          className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-500 active:bg-red-200 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {filteredUnregisteredLoginAccounts.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[13px] text-gray-700">시장 미등록 계정</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-gray-500">{filteredUnregisteredLoginAccounts.length}개</span>
                    <button
                      type="button"
                      onClick={() => {
                        setUnregisteredDeleteAllOpen(true);
                        setUnregisteredDeleteAllInput("");
                      }}
                      className="h-7 px-2.5 rounded-lg bg-red-50 text-red-500 border border-red-200 text-[12px]"
                    >
                      전체 삭제
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400">
                  로그인은 가능하지만 시장 지도·등록 목록에는 없는 계정입니다.
                </p>
                <div className="space-y-2">
                  {filteredUnregisteredLoginAccounts.map((store) => {
                    const canLoginAsStore = !storeListSettingsModeActive && !storeListDeleteModeActive;
                    const storeInfo = (
                      <>
                        <p className="text-[13px] text-gray-900 font-medium">{store.name}</p>
                        <p className="text-[12px] text-amber-600 mt-0.5">{store.subtitle}</p>
                        <p className="text-[10px] text-blue-500 mt-0.5">
                          로그인 {formatPhoneDisplay(store.phone)}
                          {store.pin && <span> · PIN {store.pin}</span>}
                        </p>
                      </>
                    );

                    return (
                      <div key={store.key} className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 border border-amber-100">
                        {canLoginAsStore ? (
                          <button
                            type="button"
                            onClick={() => handleLoginAsStore(store)}
                            className="flex-1 min-w-0 text-left rounded-lg active:bg-amber-100 transition-colors"
                          >
                            {storeInfo}
                          </button>
                        ) : (
                          <div className="flex-1 min-w-0">{storeInfo}</div>
                        )}
                        {storeListSettingsModeActive && store.storeId != null && (
                          <button
                            type="button"
                            onClick={() => openStoreListSettings(store)}
                            className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 active:bg-blue-200 transition-colors"
                            aria-label="상점 계정 설정"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                        )}
                        {storeListDeleteModeActive && (
                          <button
                            type="button"
                            onClick={() => openStoreListDeleteConfirm(store)}
                            className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-500 active:bg-red-200 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {adminPanelView === "market" && <div className="bg-white rounded-xl p-4">
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
                      setStoreSettingsModeActive((active) => {
                        if (active) setSettingsTarget(null);
                        return !active;
                      });
                      setStoreDeleteModeActive(false);
                    }}
                    className={`h-7 px-2.5 rounded-lg text-[12px] transition-colors ${
                      storeSettingsModeActive ? "bg-blue-500 text-white" : "bg-blue-50 text-blue-600 border border-blue-200"
                    }`}
                  >
                    {storeSettingsModeActive ? "완료" : "설정"}
                  </button>
                  <button
                    onClick={() => {
                      setStoreDeleteModeActive((active) => {
                        if (active) setDeleteTarget(null);
                        return !active;
                      });
                      setStoreSettingsModeActive(false);
                      setSettingsTarget(null);
                    }}
                    className={`h-7 px-2.5 rounded-lg text-[12px] transition-colors ${
                      storeDeleteModeActive ? "bg-red-500 text-white" : "bg-red-50 text-red-500 border border-red-200"
                    }`}
                  >
                    {storeDeleteModeActive ? "완료" : "삭제"}
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
                        onChange={(e) => setEditForm((prev) => ({ ...prev, phone: formatPhoneInput(e.target.value) }))}
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
                        onClick={() => !storeDeleteModeActive && !storeSettingsModeActive && openOwnerStoreEditor(store, "list")}
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
                      {storeSettingsModeActive && (
                        <button
                          onClick={() => openStoreSettings(store)}
                          className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 active:bg-blue-200 transition-colors"
                          aria-label="상점 계정 설정"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      )}
                      {storeDeleteModeActive && (
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

    {(customerAddOpen || customerSettingsTarget) && (
      <div className="app-modal-overlay fixed inset-0 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => {
            setCustomerAddOpen(false);
            setCustomerSettingsTarget(null);
            setCustomerForm(EMPTY_CUSTOMER_FORM);
            setCustomerFormError("");
          }}
        />
        <div className="app-modal-content relative bg-white rounded-2xl shadow-xl p-6 mx-6 w-full max-w-sm">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-blue-500" />
            <p className="text-[15px] font-semibold text-gray-900">
              {customerAddOpen ? "손님 계정 추가" : "손님 계정 설정"}
            </p>
          </div>

          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-[12px] text-gray-500 mb-1">닉네임</label>
              <input
                value={customerForm.name}
                onChange={(e) => setCustomerForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-[12px] text-gray-500 mb-1">휴대폰 번호 (로그인 ID)</label>
              <input
                type="tel"
                value={customerForm.phone}
                onChange={(e) => setCustomerForm((prev) => ({ ...prev, phone: formatPhoneInput(e.target.value) }))}
                maxLength={13}
                placeholder="010-0000-0000"
                className="w-full h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-[12px] text-gray-500 mb-1">이메일</label>
              <input
                type="email"
                value={customerForm.email}
                onChange={(e) => setCustomerForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="example@email.com"
                className="w-full h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-[12px] text-gray-500 mb-1">PIN 번호</label>
              <input
                type="text"
                inputMode="numeric"
                value={customerForm.pin}
                onChange={(e) => setCustomerForm((prev) => ({ ...prev, pin: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                maxLength={6}
                placeholder="4~6자리"
                className="w-full h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-[13px] tracking-widest focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            </div>
          </div>

          {customerFormError && (
            <p className="text-[11px] text-red-400 mb-3">{customerFormError}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => {
                setCustomerAddOpen(false);
                setCustomerSettingsTarget(null);
                setCustomerForm(EMPTY_CUSTOMER_FORM);
                setCustomerFormError("");
              }}
              className="flex-1 h-10 rounded-xl bg-gray-100 text-[13px] text-gray-700 font-medium"
            >
              취소
            </button>
            <button
              onClick={customerAddOpen ? handleAddCustomer : handleSaveCustomerSettings}
              className="flex-1 h-10 rounded-xl bg-blue-500 text-[13px] text-white font-medium"
            >
              {customerAddOpen ? "추가" : "저장"}
            </button>
          </div>
        </div>
      </div>
    )}

    {customerDeleteTarget && (
      <div className="app-modal-overlay fixed inset-0 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => { setCustomerDeleteTarget(null); setCustomerDeleteInput(""); }}
        />
        <div className="app-modal-content relative bg-white rounded-2xl shadow-xl p-6 mx-6 w-full max-w-sm">
          <p className="text-[15px] font-semibold text-gray-900 mb-1">이 손님을 삭제하시겠습니까?</p>
          <div className="text-[13px] text-gray-500 mb-4 space-y-2">
            <p>
              <span className="font-medium text-gray-800">{customerDeleteTarget.name}</span> 손님 계정을 삭제합니다.
            </p>
            <p>
              삭제를 원하신다면 아래에 <span className="font-bold text-red-500">삭제</span>를 입력해주세요.
            </p>
          </div>
          <input
            value={customerDeleteInput}
            onChange={(e) => setCustomerDeleteInput(e.target.value)}
            placeholder="삭제"
            className="w-full h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-red-300 mb-4"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setCustomerDeleteTarget(null); setCustomerDeleteInput(""); }}
              className="flex-1 h-10 rounded-xl bg-gray-100 text-[13px] text-gray-700 font-medium"
            >
              취소
            </button>
            <button
              onClick={() => customerDeleteInput === "삭제" && handleDeleteCustomer()}
              className={`flex-1 h-10 rounded-xl text-[13px] font-medium transition-colors ${
                customerDeleteInput === "삭제"
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

    {unregisteredDeleteTarget && (
      <div className="app-modal-overlay fixed inset-0 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => { setUnregisteredDeleteTarget(null); setUnregisteredDeleteInput(""); }}
        />
        <div className="app-modal-content relative bg-white rounded-2xl shadow-xl p-6 mx-6 w-full max-w-sm">
          <p className="text-[15px] font-semibold text-gray-900 mb-1">미등록 계정을 삭제하시겠습니까?</p>
          <div className="text-[13px] text-gray-500 mb-4 space-y-2">
            <p>
              <span className="font-medium text-gray-800">{unregisteredDeleteTarget.name}</span> 계정을 삭제합니다.
            </p>
            <p>
              삭제를 원하신다면 아래에 <span className="font-bold text-red-500">삭제</span>를 입력해주세요.
            </p>
          </div>
          <input
            value={unregisteredDeleteInput}
            onChange={(e) => setUnregisteredDeleteInput(e.target.value)}
            placeholder="삭제"
            className="w-full h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-red-300 mb-4"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setUnregisteredDeleteTarget(null); setUnregisteredDeleteInput(""); }}
              className="flex-1 h-10 rounded-xl bg-gray-100 text-[13px] text-gray-700 font-medium"
            >
              취소
            </button>
            <button
              onClick={() => unregisteredDeleteInput === "삭제" && handleDeleteUnregisteredAccount()}
              className={`flex-1 h-10 rounded-xl text-[13px] font-medium transition-colors ${
                unregisteredDeleteInput === "삭제"
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

    {unregisteredDeleteAllOpen && (
      <div className="app-modal-overlay fixed inset-0 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => { setUnregisteredDeleteAllOpen(false); setUnregisteredDeleteAllInput(""); }}
        />
        <div className="app-modal-content relative bg-white rounded-2xl shadow-xl p-6 mx-6 w-full max-w-sm">
          <p className="text-[15px] font-semibold text-gray-900 mb-1">시장 미등록 계정 전체 삭제</p>
          <div className="text-[13px] text-gray-500 mb-4 space-y-2">
            <p>
              미등록 계정 <span className="font-medium text-gray-800">{unregisteredLoginAccounts.length}개</span>를 모두 삭제합니다.
            </p>
            <p>
              삭제를 원하신다면 아래에 <span className="font-bold text-red-500">삭제</span>를 입력해주세요.
            </p>
          </div>
          <input
            value={unregisteredDeleteAllInput}
            onChange={(e) => setUnregisteredDeleteAllInput(e.target.value)}
            placeholder="삭제"
            className="w-full h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-red-300 mb-4"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setUnregisteredDeleteAllOpen(false); setUnregisteredDeleteAllInput(""); }}
              className="flex-1 h-10 rounded-xl bg-gray-100 text-[13px] text-gray-700 font-medium"
            >
              취소
            </button>
            <button
              onClick={() => unregisteredDeleteAllInput === "삭제" && handleDeleteAllUnregisteredAccounts()}
              className={`flex-1 h-10 rounded-xl text-[13px] font-medium transition-colors ${
                unregisteredDeleteAllInput === "삭제"
                  ? "bg-red-500 text-white"
                  : "bg-red-100 text-red-300 cursor-not-allowed"
              }`}
            >
              전체 삭제
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
