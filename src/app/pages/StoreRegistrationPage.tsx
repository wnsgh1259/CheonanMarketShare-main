import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, MapPin, Plus, ImagePlus, Settings, Lock, Phone, Mail, LogOut } from "lucide-react";
import {
  generateUniqueStoreCredentials,
  upsertStoreAccount,
  formatPhoneDisplay as formatAdminPhoneDisplay,
  resolveStoreLoginPhone,
} from "../data/adminAccount";
import { useNavigate, useSearchParams } from "react-router";
import { setOwnerMode, OWNER_STORE_MGMT_RETURN_KEY } from "../components/BottomNav";
import { useAuth } from "../context/AuthContext";
import { restoreAdminSessionFromBackup } from "../data/authSession";
import { peekAdminReturnState, buildAdminReturnUrl } from "../data/adminNavigation";
import { saveUserEmail, isValidEmail, findRegisteredUserByPhone } from "../data/userAccounts";
import { STORES_BY_MARKET } from "../data/storeData";
import {
  OWNER_EDIT_STORE_KEY,
} from "../data/ownerSharedStore";
import {
  loadOwnerCatalog,
  loadOwnerCatalogRemote,
  loadOwnerStoreWorkspace,
  loadOwnerStoreWorkspaceRemote,
  migrateLegacyOwnerDraftIfNeeded,
  saveOwnerCatalog,
  saveOwnerStoreWorkspace,
  upsertCatalogStore,
} from "../data/ownerStoreData";
import {
  matchesOwnerChangeRequest,
  submitOwnerChangeRequest,
  type OwnerChangeRequest,
} from "../data/ownerChangeRequests";
import { refreshOwnerChangeRequestsFromRemote } from "../data/ownerChangeRequestsSync";
import { formatPhoneDisplay, formatPhoneInput } from "../utils/phoneFormat";

type NaverMapRef = {
  setCenter: (latLng: unknown) => void;
  setZoom: (zoom: number) => void;
};

type NaverMarkerRef = {
  setMap: (map: unknown) => void;
  setPosition: (position: unknown) => void;
  setIcon: (icon: unknown) => void;
};

type NaverPolygonRef = {
  setMap: (map: unknown) => void;
};

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
};

type OwnerSection = "store" | "product" | "communication" | "customerMode" | "community" | "promotion" | "settings";

function parseOwnerSection(value: string | null): OwnerSection | null {
  if (
    value === "store" ||
    value === "product" ||
    value === "communication" ||
    value === "customerMode" ||
    value === "community" ||
    value === "promotion" ||
    value === "settings"
  ) {
    return value;
  }
  return null;
}

type OwnerMenu = {
  id: number;
  name: string;
  price: string;
  photoName: string;
};

type OwnerDashboardDraft = {
  stores: DraftStore[];
  menus: OwnerMenu[];
  todayDeal: string;
  news: string;
  couponEvent: string;
  reviewReply: string;
  inquiryReply: string;
};

const OWNER_APPROVED_STORE_NAME_KEY = "owner_approved_store_name";

function readEditStoreDraftSync(storeId: number): DraftStore | null {
  try {
    const rawEdit = window.localStorage.getItem(OWNER_EDIT_STORE_KEY);
    if (rawEdit) {
      const parsed = JSON.parse(rawEdit) as DraftStore;
      if (parsed.id === storeId) return parsed;
    }
  } catch {
    // ignore corrupted draft
  }
  migrateLegacyOwnerDraftIfNeeded();
  const catalog = loadOwnerCatalog();
  return (catalog.stores ?? []).find((store) => store.id === storeId) ?? null;
}

function resolveInitialStoreLabel(storeId: number | null, isAdminNewStore: boolean) {
  if (isAdminNewStore) return "새 상점 등록";
  if (storeId !== null) {
    const target = readEditStoreDraftSync(storeId);
    if (target?.name) return target.name;
  }
  return "~~사장님";
}

const MARKET_VIEW_CONFIG: Record<MarketId, {
  label: string;
  center: { lat: number; lng: number };
  zoom: number;
  fillColor: string;
  areaPaths: Array<Array<{ lat: number; lng: number }>>;
}> = {
  jungang: {
    label: "천안중앙시장",
    center: { lat: 36.80222, lng: 127.149411 },
    zoom: 15.4,
    fillColor: "#2563EB",
    areaPaths: [
      [
        { lat: 36.804099, lng: 127.148671 },
        { lat: 36.804099, lng: 127.149905 },
        { lat: 36.800137, lng: 127.149905 },
        { lat: 36.800137, lng: 127.148671 },
      ],
      [
        { lat: 36.803683, lng: 127.149905 },
        { lat: 36.803683, lng: 127.150225 },
        { lat: 36.803487, lng: 127.150225 },
        { lat: 36.803487, lng: 127.149905 },
      ],
      [
        { lat: 36.803035, lng: 127.149905 },
        { lat: 36.803035, lng: 127.150314 },
        { lat: 36.802786, lng: 127.150314 },
        { lat: 36.802786, lng: 127.149905 },
      ],
    ],
  },
  byeongcheon: {
    label: "천안역전시장",
    center: { lat: 36.810152, lng: 127.149018 },
    zoom: 17,
    fillColor: "#16A34A",
    areaPaths: [[
      { lat: 36.809302, lng: 127.148552 },
      { lat: 36.810976, lng: 127.149064 },
      { lat: 36.810871, lng: 127.149528 },
      { lat: 36.809180, lng: 127.148898 },
    ]],
  },
  seonghwan: {
    label: "성환시장",
    center: { lat: 36.918910, lng: 127.130431 },
    zoom: 17,
    fillColor: "#EA580C",
    areaPaths: [[
      { lat: 36.918485, lng: 127.130249 },
      { lat: 36.918721, lng: 127.129787 },
      { lat: 36.919403, lng: 127.130168 },
      { lat: 36.918936, lng: 127.131198 },
    ]],
  },
};
const CATEGORY_OPTIONS = ["먹거리·분식", "정육·계란", "채소", "과일", "채소·과일", "수산물", "반찬·건어물", "기타·생활"];
const PAYMENT_OPTIONS = ["카드", "현금", "지역화폐", "온누리상품권"];
declare global {
  interface Window {
    naver?: any;
  }
}

export function StoreRegistrationPage() {
  const navigate = useNavigate();
  const { logout, refresh } = useAuth();
  const [searchParams] = useSearchParams();
  const queryMarket = searchParams.get("market");
  const editStoreIdParam = searchParams.get("editStoreId");
  const queryEditStoreId =
    editStoreIdParam != null && editStoreIdParam !== "" ? Number(editStoreIdParam) : Number.NaN;
  const sessionStoreIdRaw = localStorage.getItem("owner_store_id");
  const sessionStoreId = sessionStoreIdRaw ? Number(sessionStoreIdRaw) : Number.NaN;
  const isAdminNewStore =
    searchParams.get("returnTo") === "admin" &&
    searchParams.get("adminNew") === "1" &&
    !Number.isFinite(queryEditStoreId);
  const editStoreId = Number.isFinite(queryEditStoreId)
    ? queryEditStoreId
    : !isAdminNewStore && Number.isFinite(sessionStoreId)
      ? sessionStoreId
      : null;
  const initialMarket: MarketId =
    queryMarket === "jungang" || queryMarket === "byeongcheon" || queryMarket === "seonghwan"
      ? queryMarket
      : "byeongcheon";
  const returnToAdmin = searchParams.get("returnTo") === "admin";
  const storeLoadGenerationRef = useRef(0);

  const goBackToAdmin = () => {
    restoreAdminSessionFromBackup();
    refresh();
    setOwnerMode(false);
    const saved = peekAdminReturnState();
    const market = saved?.market ?? initialMarket;
    navigate(buildAdminReturnUrl(market), { replace: true });
  };

  const saveStoreMgmtReturnPath = () => {
    sessionStorage.setItem(OWNER_STORE_MGMT_RETURN_KEY, window.location.pathname + window.location.search);
  };

  const enterOwnerPreview = (path: string) => {
    const storeName = pageTitle !== "~~사장님" ? pageTitle : (form.name.trim() || "");
    if (storeName) localStorage.setItem("owner_current_store_name", storeName);
    saveStoreMgmtReturnPath();
    setOwnerMode(true);
    navigate(path);
  };

  useEffect(() => {
    if (searchParams.get("returnTo") === "admin") {
      saveStoreMgmtReturnPath();
    }
  }, [searchParams]);

  const resolvedStoreId = editStoreId ?? (Number.isFinite(sessionStoreId) ? sessionStoreId : null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<NaverMapRef | null>(null);
  const pinMarkerRef = useRef<NaverMarkerRef | null>(null);
  const marketPolygonsRef = useRef<NaverPolygonRef[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mapZoomLevel, setMapZoomLevel] = useState(MARKET_VIEW_CONFIG[initialMarket].zoom);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<MarketId>(initialMarket);
  const [stores, setStores] = useState<DraftStore[]>([]);
  const [editingStoreId, setEditingStoreId] = useState<number | null>(editStoreId);
  const [isStoreHydrating, setIsStoreHydrating] = useState(() => editStoreId !== null && !isAdminNewStore);
  const [form, setForm] = useState({
    name: "",
    location: "",
    hours: "",
    phone: "",
    description: "",
    representativePhotoName: "",
    representativePhotoUrl: "",
  });
  const [activeSection, setActiveSection] = useState<OwnerSection | null>(() =>
    parseOwnerSection(searchParams.get("section")),
  );
  const [activeCommunicationSubSection, setActiveCommunicationSubSection] = useState<"review" | "inquiry">("review");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [menus, setMenus] = useState<OwnerMenu[]>([{ id: Date.now(), name: "", price: "", photoName: "" }]);
  const [todayDeal, setTodayDeal] = useState("");
  const [news, setNews] = useState("");
  const [couponEvent, setCouponEvent] = useState("");
  const [reviewReply, setReviewReply] = useState("");
  const [inquiryReply, setInquiryReply] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [pageTitle, setPageTitle] = useState(() => resolveInitialStoreLabel(editStoreId, isAdminNewStore));
  const [approvedStoreName, setApprovedStoreName] = useState(() => {
    if (isAdminNewStore) return "";
    if (editStoreId !== null) {
      const target = readEditStoreDraftSync(editStoreId);
      if (target?.name) return target.name;
    }
    return "";
  });
  const [adminNewCredentials, setAdminNewCredentials] = useState<{ phone: string; pin: string } | null>(() =>
    isAdminNewStore ? generateUniqueStoreCredentials() : null,
  );
  const [ownerPhone, setOwnerPhone] = useState(() => resolveStoreLoginPhone(editStoreId));
  const [ownerEmail, setOwnerEmail] = useState(() => localStorage.getItem("user_email") || "");
  const [settingsModal, setSettingsModal] = useState<"storeName" | "phone" | "pin" | "email" | null>(null);
  const [settingsInput, setSettingsInput] = useState("");
  const [settingsPinConfirm, setSettingsPinConfirm] = useState("");
  const [changeRequests, setChangeRequests] = useState<OwnerChangeRequest[]>([]);
  const [settingsNotice, setSettingsNotice] = useState("");
  const saveNoticeRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!saveNotice) return;
    saveNoticeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [saveNotice]);

  const clientId = import.meta.env.VITE_NAVER_MAP_CLIENT_ID as string | undefined;
  const isPlaceholderClientId = !clientId || clientId === "your_naver_map_client_id";
  const selectedMarketView = MARKET_VIEW_CONFIG[selectedMarket];

  const getScaledPinSize = (baseSize: number) => {
    const baseZoom = selectedMarketView.zoom;
    const zoomGap = mapZoomLevel - baseZoom;
    const scaled = baseSize + zoomGap * 2.4;
    return Math.max(8, Math.min(30, Math.round(scaled)));
  };

  const persistOwnerCatalog = (storesList: DraftStore[]) => {
    const catalog = loadOwnerCatalog();
    saveOwnerCatalog({ ...catalog, stores: storesList });
  };

  const persistOwnerWorkspace = (storeId: number) => {
    saveOwnerStoreWorkspace(storeId, {
      menus,
      todayDeal,
      news,
      couponEvent,
      reviewReply,
      inquiryReply,
    });
  };

  useEffect(() => {
    if (isAdminNewStore || activeSection !== "settings") return;
    let cancelled = false;
    void refreshOwnerChangeRequestsFromRemote().then((requests) => {
      if (!cancelled) setChangeRequests(requests);
    });
    return () => {
      cancelled = true;
    };
  }, [activeSection, isAdminNewStore]);

  const pendingStoreNameRequest =
    changeRequests.find(
      (item) =>
        item.status === "pending" &&
        item.type === "storeName" &&
        matchesOwnerChangeRequest(item, {
          storeId: resolvedStoreId,
          storeName: approvedStoreName,
          phone: ownerPhone,
          source: "store",
        }),
    ) ?? null;
  const pendingPhoneRequest =
    changeRequests.find(
      (item) =>
        item.status === "pending" &&
        item.type === "phone" &&
        matchesOwnerChangeRequest(item, {
          storeId: resolvedStoreId,
          storeName: approvedStoreName,
          phone: ownerPhone,
          source: "store",
        }),
    ) ?? null;
  const isStoreNamePending = Boolean(pendingStoreNameRequest);
  const isPhonePending = Boolean(pendingPhoneRequest);

  const applyDraftStoreToState = (target: DraftStore) => {
    const fixedName = target.name || localStorage.getItem(OWNER_APPROVED_STORE_NAME_KEY) || "";
    if (fixedName) {
      setApprovedStoreName(fixedName);
      localStorage.setItem(OWNER_APPROVED_STORE_NAME_KEY, fixedName);
      localStorage.setItem("owner_current_store_name", fixedName);
      localStorage.setItem("owner_store_id", String(target.id));
    }
    setPageTitle(fixedName || "~~사장님");
    if (target.marketId) setSelectedMarket(target.marketId);
    const dummyMatch = target.marketId
      ? STORES_BY_MARKET[target.marketId].find((store) => store.name === target.name)
      : undefined;
    setActiveSection("store");
    setForm({
      name: target.name,
      location: target.location,
      hours: target.hours ?? dummyMatch?.hours ?? "",
      phone: target.phone,
      description: target.description,
      representativePhotoName: target.image || dummyMatch?.image ? "기존 대표사진" : "",
      representativePhotoUrl: target.image ?? dummyMatch?.image ?? "",
    });
    setSelectedCategories(
      target.category
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    );
    setPin({ lat: target.lat, lng: target.lng });
    if (target.menus?.length) {
      setMenus(target.menus);
    } else if (dummyMatch?.menus?.length) {
      setMenus(
        dummyMatch.menus.map((menu, index) => ({
          id: Number(menu.id) || Date.now() + index,
          name: menu.name,
          price: String(menu.price),
          photoName: "",
        })),
      );
    }
    setEditingStoreId(target.id);
    setIsStoreHydrating(false);
  };

  const resetStoreEditorState = () => {
    setPageTitle("~~사장님");
    setApprovedStoreName("");
    setForm({
      name: "",
      location: "",
      hours: "",
      phone: "",
      description: "",
      representativePhotoName: "",
      representativePhotoUrl: "",
    });
    setSelectedCategories([]);
    setSelectedPayments([]);
    setPin(null);
    pinMarkerRef.current?.setMap(null);
    setMenus([{ id: Date.now(), name: "", price: "", photoName: "" }]);
    setTodayDeal("");
    setNews("");
    setCouponEvent("");
    setReviewReply("");
    setInquiryReply("");
    setEditingStoreId(null);
  };

  useLayoutEffect(() => {
    if (isAdminNewStore || editStoreId === null) return;

    storeLoadGenerationRef.current += 1;
    setIsStoreHydrating(true);

    const target = readEditStoreDraftSync(editStoreId);
    if (target) {
      applyDraftStoreToState(target);
      return;
    }

    resetStoreEditorState();
    setPageTitle("불러오는 중...");
    setEditingStoreId(editStoreId);
  }, [editStoreId, isAdminNewStore]);

  useEffect(() => {
    if (isAdminNewStore) return;

    const loadGeneration = storeLoadGenerationRef.current;
    let cancelled = false;

    const load = async () => {
      try {
        migrateLegacyOwnerDraftIfNeeded();

        const localCatalog = loadOwnerCatalog();
        if (editStoreId !== null && !cancelled && loadGeneration === storeLoadGenerationRef.current) {
          const localTarget =
            (localCatalog.stores ?? []).find((store) => store.id === editStoreId) ??
            readEditStoreDraftSync(editStoreId);
          if (localTarget) {
            applyDraftStoreToState(localTarget);
          }
        }

        const remoteCatalog = await loadOwnerCatalogRemote();
        if (cancelled || loadGeneration !== storeLoadGenerationRef.current) return;

        const catalog =
          remoteCatalog && localCatalog.stores.length === 0 && (localCatalog.facilities?.length ?? 0) === 0
            ? remoteCatalog
            : localCatalog.stores.length > 0
              ? localCatalog
              : remoteCatalog ?? localCatalog;
        if (remoteCatalog && catalog === remoteCatalog) {
          saveOwnerCatalog(remoteCatalog);
        }

        setStores(catalog.stores ?? []);

        const workspaceStoreId = editStoreId ?? resolvedStoreId;
        let workspace = workspaceStoreId ? loadOwnerStoreWorkspace(workspaceStoreId) : null;
        if (workspaceStoreId) {
          const remoteWorkspace = await loadOwnerStoreWorkspaceRemote(workspaceStoreId);
          if (cancelled || loadGeneration !== storeLoadGenerationRef.current) return;
          if (remoteWorkspace) {
            const localRaw = localStorage.getItem(`owner-store-workspace-v1-${workspaceStoreId}`);
            if (!localRaw) {
              workspace = remoteWorkspace;
              saveOwnerStoreWorkspace(workspaceStoreId, remoteWorkspace);
            }
          }
        }

        if (workspace && !cancelled && loadGeneration === storeLoadGenerationRef.current) {
          setMenus(workspace.menus?.length ? workspace.menus : [{ id: Date.now(), name: "", price: "", photoName: "" }]);
          setTodayDeal(workspace.todayDeal ?? "");
          setNews(workspace.news ?? "");
          setCouponEvent(workspace.couponEvent ?? "");
          setReviewReply(workspace.reviewReply ?? "");
          setInquiryReply(workspace.inquiryReply ?? "");
        }

        if (editStoreId !== null && !cancelled && loadGeneration === storeLoadGenerationRef.current) {
          const directTarget = (catalog.stores ?? []).find((store) => store.id === editStoreId);
          const editTarget = readEditStoreDraftSync(editStoreId);
          const target =
            directTarget ??
            (editTarget && editTarget.id === editStoreId ? editTarget : null);
          if (target) {
            applyDraftStoreToState(target);
          } else {
            setIsStoreHydrating(false);
          }
        }
      } catch {
        if (!cancelled && loadGeneration === storeLoadGenerationRef.current) {
          setIsStoreHydrating(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [editStoreId, resolvedStoreId, isAdminNewStore]);

  useEffect(() => {
    if (!isAdminNewStore) return;
    window.localStorage.removeItem(OWNER_EDIT_STORE_KEY);
    setEditingStoreId(null);
    setActiveSection("store");
    setPageTitle("새 상점 등록");
    setApprovedStoreName("");
    setForm({
      name: "",
      location: "",
      hours: "",
      phone: "",
      description: "",
      representativePhotoName: "",
      representativePhotoUrl: "",
    });
    setSelectedCategories([]);
    setSelectedPayments([]);
    setPin(null);
    pinMarkerRef.current?.setMap(null);
    setAdminNewCredentials(generateUniqueStoreCredentials());
  }, [isAdminNewStore]);

  useEffect(() => {
    if (isAdminNewStore) return;
    const loginPhone = resolveStoreLoginPhone(resolvedStoreId);
    if (!loginPhone) return;
    setOwnerPhone(loginPhone);

    const role = localStorage.getItem("user_role");
    if (role === "owner") {
      const currentPhone = (localStorage.getItem("user_phone") || "").replace(/\D/g, "");
      if (currentPhone !== loginPhone) {
        localStorage.setItem("user_phone", loginPhone);
      }
    }

    const registered = findRegisteredUserByPhone(loginPhone);
    if (registered?.email) {
      setOwnerEmail(registered.email);
      localStorage.setItem("user_email", registered.email);
    }
  }, [resolvedStoreId, isAdminNewStore]);

  const submitChangeRequest = (type: "storeName" | "phone", newValue: string) => {
    const trimmed = newValue.trim();
    if (!trimmed) return;
    if (type === "phone" && !/^[0-9]{10,11}$/.test(trimmed.replace(/-/g, ""))) {
      setSettingsNotice("올바른 휴대폰 번호 형식으로 입력해주세요.");
      return;
    }
    if (type === "storeName" && isStoreNamePending) return;
    if (type === "phone" && isPhonePending) return;

    const request = submitOwnerChangeRequest({
      type,
      storeName: approvedStoreName,
      storeId: resolvedStoreId ?? undefined,
      currentValue: type === "storeName" ? approvedStoreName : ownerPhone,
      newValue: type === "phone" ? trimmed.replace(/-/g, "") : trimmed,
      source: "store",
    });
    setChangeRequests((prev) => {
      const withoutDuplicate = prev.filter(
        (item) =>
          !(
            item.status === "pending" &&
            item.type === type &&
            matchesOwnerChangeRequest(item, {
              storeId: resolvedStoreId,
              storeName: approvedStoreName,
              phone: ownerPhone,
              source: "store",
            })
          ),
      );
      return [request, ...withoutDuplicate];
    });
    setSettingsModal(null);
    setSettingsInput("");
    setSettingsNotice("");
  };

  const handleEmailChange = () => {
    const trimmed = settingsInput.trim();
    if (!trimmed) {
      setSettingsNotice("이메일을 입력해주세요.");
      return;
    }
    if (!isValidEmail(trimmed)) {
      setSettingsNotice("올바른 이메일 형식으로 입력해주세요.");
      return;
    }
    if (trimmed === ownerEmail) {
      setSettingsNotice("현재 이메일과 동일합니다.");
      return;
    }
    saveUserEmail(trimmed, ownerPhone.replace(/\D/g, ""));
    setOwnerEmail(trimmed);
    setSettingsModal(null);
    setSettingsInput("");
    setSettingsNotice("이메일이 변경되었습니다.");
    window.setTimeout(() => setSettingsNotice(""), 2200);
  };

  const handlePinChange = () => {
    if (!/^[0-9]{4,6}$/.test(settingsInput)) {
      setSettingsNotice("PIN 번호는 4~6자리 숫자로 입력해주세요.");
      return;
    }
    if (settingsInput !== settingsPinConfirm) {
      setSettingsNotice("PIN 번호가 일치하지 않습니다.");
      return;
    }
    localStorage.setItem("user_pin", settingsInput);
    setSettingsModal(null);
    setSettingsInput("");
    setSettingsPinConfirm("");
    setSettingsNotice("PIN 번호가 변경되었습니다.");
    window.setTimeout(() => setSettingsNotice(""), 2200);
  };

  const handleLogout = () => {
    setOwnerMode(false);
    logout();
    navigate("/");
  };

  useEffect(() => {
    if (activeSection !== "store") return;
    if (!clientId || !mapContainerRef.current) return;
    let cancelled = false;

    const initMap = () => {
      if (cancelled || !window.naver?.maps || !mapContainerRef.current) return;
      setMapReady(false);
      const naver = window.naver;
      const view = MARKET_VIEW_CONFIG[selectedMarket];
      const map = new naver.maps.Map(mapContainerRef.current, {
        center: new naver.maps.LatLng(view.center.lat, view.center.lng),
        zoom: view.zoom,
        mapTypeId: naver.maps.MapTypeId.NORMAL,
        scaleControl: false,
        logoControl: false,
        mapDataControl: false,
      });
      mapRef.current = map;
      setMapZoomLevel(view.zoom);
      naver.maps.Event.addListener(map, "zoom_changed", (zoom: number) => {
        setMapZoomLevel(Number(zoom));
      });
      marketPolygonsRef.current.forEach((polygon) => polygon.setMap(null));
      marketPolygonsRef.current = view.areaPaths.map(
        (path) =>
          new naver.maps.Polygon({
            map,
            paths: path.map((point) => new naver.maps.LatLng(point.lat, point.lng)),
            fillColor: view.fillColor,
            fillOpacity: 0.28,
            strokeColor: view.fillColor,
            strokeOpacity: 0,
            strokeWeight: 0,
            zIndex: 10,
            clickable: false,
          }),
      );
      setMapReady(true);
      setMapError(false);

      naver.maps.Event.addListener(map, "click", (e: any) => {
        const lat = typeof e?.coord?.lat === "function" ? e.coord.lat() : e?.coord?.y;
        const lng = typeof e?.coord?.lng === "function" ? e.coord.lng() : e?.coord?.x;
        if (typeof lat !== "number" || typeof lng !== "number") return;
        const next = { lat, lng };
        setPin(next);

        if (!pinMarkerRef.current) {
          const markerSize = getScaledPinSize(12);
          pinMarkerRef.current = new naver.maps.Marker({
            map,
            position: new naver.maps.LatLng(lat, lng),
            title: "등록 핀",
            icon: {
              content:
                `<div style="width:${markerSize}px;height:${markerSize}px;border-radius:999px;background:#2563EB;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.18);"></div>`,
              size: new naver.maps.Size(markerSize, markerSize),
              anchor: new naver.maps.Point(markerSize / 2, markerSize / 2),
            },
          });
        } else {
          pinMarkerRef.current.setPosition(new naver.maps.LatLng(lat, lng));
          pinMarkerRef.current.setMap(map);
          const markerSize = getScaledPinSize(12);
          pinMarkerRef.current.setIcon({
            content: `<div style="width:${markerSize}px;height:${markerSize}px;border-radius:999px;background:#2563EB;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.18);"></div>`,
            size: new naver.maps.Size(markerSize, markerSize),
            anchor: new naver.maps.Point(markerSize / 2, markerSize / 2),
          });
        }
      });
    };

    if (window.naver?.maps) {
      initMap();
      return () => {
        cancelled = true;
        setMapReady(false);
        pinMarkerRef.current?.setMap(null);
        pinMarkerRef.current = null;
        mapRef.current = null;
      };
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-naver-map-sdk="true"]');
    if (existingScript) {
      if (window.naver?.maps) initMap();
      else existingScript.addEventListener("load", initMap, { once: true });
      return () => {
        cancelled = true;
        setMapReady(false);
        pinMarkerRef.current?.setMap(null);
        pinMarkerRef.current = null;
        mapRef.current = null;
        existingScript.removeEventListener("load", initMap);
      };
    }

    const script = document.createElement("script");
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`;
    script.async = true;
    script.dataset.naverMapSdk = "true";
    script.onload = initMap;
    script.onerror = () => setMapError(true);
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      setMapReady(false);
      pinMarkerRef.current?.setMap(null);
      pinMarkerRef.current = null;
      mapRef.current = null;
      script.onload = null;
      script.onerror = null;
    };
  }, [activeSection, clientId, selectedMarket]);

  useEffect(() => {
    if (!window.naver?.maps || !mapRef.current || activeSection !== "store") return;
    const naver = window.naver;
    const map = mapRef.current;
    const view = selectedMarketView;

    map.setCenter(new naver.maps.LatLng(view.center.lat, view.center.lng));
    map.setZoom(view.zoom);
    setMapZoomLevel(view.zoom);
    marketPolygonsRef.current.forEach((polygon) => polygon.setMap(null));
    marketPolygonsRef.current = view.areaPaths.map(
      (path) =>
        new naver.maps.Polygon({
          map,
          paths: path.map((point) => new naver.maps.LatLng(point.lat, point.lng)),
          fillColor: view.fillColor,
          fillOpacity: 0.28,
          strokeColor: view.fillColor,
          strokeOpacity: 0,
          strokeWeight: 0,
          zIndex: 10,
          clickable: false,
        }),
    );
  }, [activeSection, selectedMarket, selectedMarketView]);

  useEffect(() => {
    if (!mapReady || !window.naver?.maps || !mapRef.current || activeSection !== "store" || !pin) return;
    const naver = window.naver;
    const map = mapRef.current;
    const position = new naver.maps.LatLng(pin.lat, pin.lng);
    const markerSize = getScaledPinSize(12);
    if (!pinMarkerRef.current) {
      pinMarkerRef.current = new naver.maps.Marker({
        map,
        position,
        title: "등록 핀",
        zIndex: 50,
        icon: {
          content:
            `<div style="width:${markerSize}px;height:${markerSize}px;border-radius:999px;background:#2563EB;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.18);"></div>`,
          size: new naver.maps.Size(markerSize, markerSize),
          anchor: new naver.maps.Point(markerSize / 2, markerSize / 2),
        },
      });
    } else {
      pinMarkerRef.current.setPosition(position);
      pinMarkerRef.current.setMap(map);
      pinMarkerRef.current.setIcon({
        content: `<div style="width:${markerSize}px;height:${markerSize}px;border-radius:999px;background:#2563EB;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.18);"></div>`,
        size: new naver.maps.Size(markerSize, markerSize),
        anchor: new naver.maps.Point(markerSize / 2, markerSize / 2),
      });
    }
  }, [activeSection, pin, mapReady, mapZoomLevel, selectedMarketView]);

  const handleAddStore = () => {
    const existingForEdit = editingStoreId !== null ? stores.find((s) => s.id === editingStoreId) : undefined;
    let existingFromKey: DraftStore | undefined;
    if (editingStoreId !== null) {
      try {
        const raw = window.localStorage.getItem(OWNER_EDIT_STORE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as DraftStore;
          if (parsed.id === editingStoreId) existingFromKey = parsed;
        }
      } catch {
        /* ignore */
      }
    }
    const existing = existingForEdit ?? existingFromKey;
    const isEditing = editingStoreId !== null;

    const coords =
      pin ??
      (existing &&
      typeof existing.lat === "number" &&
      typeof existing.lng === "number" &&
      !(existing.lat === 0 && existing.lng === 0)
        ? { lat: existing.lat, lng: existing.lng }
        : null);

    const nameStr = isAdminNewStore
      ? form.name.trim()
      : (approvedStoreName.trim() || form.name.trim() || (isEditing ? (existing?.name ?? "").trim() : "")).trim();
    const locationStr = (form.location.trim() || (isEditing ? (existing?.location ?? "").trim() : "")).trim();
    const categoryStr =
      selectedCategories.length > 0
        ? selectedCategories.join(", ")
        : isEditing
          ? (existing?.category ?? "").trim()
          : "";

    if (!coords || !nameStr || !categoryStr || !locationStr) {
      const msg = !coords
        ? "지도에서 위치를 찍어 주세요. (편집 중이면 기존 좌표가 있어야 합니다. 시장 탭을 바꾸면 핀이 초기화될 수 있어요.)"
        : !nameStr
          ? "상점명을 입력해 주세요."
          : !categoryStr
            ? "카테고리를 하나 이상 선택해 주세요."
            : "위치(호수)를 입력해 주세요.";
      setSaveNotice(msg);
      window.setTimeout(() => setSaveNotice(""), 4200);
      return;
    }

    const next: DraftStore = {
      id: editingStoreId ?? Date.now(),
      name: nameStr,
      category: categoryStr,
      location: locationStr,
      hours: form.hours.trim(),
      phone: form.phone.trim(),
      description: form.description.trim(),
      lat: Number(coords.lat.toFixed(6)),
      lng: Number(coords.lng.toFixed(6)),
      marketId: selectedMarket,
      image: form.representativePhotoUrl || undefined,
      menus: menus.filter((menu) => menu.name.trim()).map((menu) => ({
        ...menu,
        price: menu.price.trim(),
      })),
    };
    const updatedStores = editingStoreId
      ? stores.some((store) => store.id === editingStoreId)
        ? stores.map((store) => (store.id === editingStoreId ? next : store))
        : [next, ...stores]
      : [next, ...stores];
    setStores(updatedStores);
    persistOwnerCatalog(updatedStores);
    if (resolvedStoreId) {
      persistOwnerWorkspace(resolvedStoreId);
    }
    if (isAdminNewStore && adminNewCredentials) {
      upsertStoreAccount({
        storeId: next.id,
        storeName: nameStr,
        phone: adminNewCredentials.phone,
        pin: adminNewCredentials.pin,
      });
    }
    if (returnToAdmin) {
      goBackToAdmin();
      return;
    }
    setForm({ name: "", location: "", hours: "", phone: "", description: "", representativePhotoName: "", representativePhotoUrl: "" });
    setSelectedCategories([]);
    setSelectedPayments([]);
    setPin(null);
    setEditingStoreId(null);
    pinMarkerRef.current?.setMap(null);
    setSaveNotice("저장되었습니다.");
    window.setTimeout(() => setSaveNotice(""), 1800);
  };

  const toggleOption = (value: string, selected: string[], setSelected: (value: string[]) => void) => {
    if (selected.includes(value)) setSelected(selected.filter((v) => v !== value));
    else setSelected([...selected, value]);
  };

  const resetStoreForm = () => {
    setForm({ name: "", location: "", hours: "", phone: "", description: "", representativePhotoName: "", representativePhotoUrl: "" });
    setSelectedCategories([]);
    setSelectedPayments([]);
    setPin(null);
    pinMarkerRef.current?.setMap(null);
  };

  const addMenuRow = () => {
    setMenus((prev) => [...prev, { id: Date.now(), name: "", price: "", photoName: "" }]);
  };

  const saveOwnerDraft = (notice?: string) => {
    const targetStoreId = editingStoreId ?? resolvedStoreId;
    const patchedStores =
      targetStoreId !== null
        ? stores.map((store) =>
            store.id === targetStoreId
              ? {
                  ...store,
                  menus: menus.filter((menu) => menu.name.trim()).map((menu) => ({
                    ...menu,
                    price: menu.price.trim(),
                  })),
                }
              : store,
          )
        : stores;
    if (targetStoreId !== null) {
      saveOwnerStoreWorkspace(targetStoreId, {
        menus,
        todayDeal,
        news,
        couponEvent,
        reviewReply,
        inquiryReply,
      });
      const targetStore = patchedStores.find((store) => store.id === targetStoreId);
      if (targetStore) {
        upsertCatalogStore({
          ...targetStore,
          menus: targetStore.menus,
        });
      }
    }
    setStores(patchedStores);
    persistOwnerCatalog(patchedStores);
    if (notice) {
      setSaveNotice(notice);
      window.setTimeout(() => setSaveNotice(""), 1800);
    }
  };

  const hasUnsavedStoreChanges = Boolean(
    form.location.trim() ||
    form.hours.trim() ||
    form.phone.trim() ||
    form.description.trim() ||
    form.representativePhotoName ||
    selectedCategories.length > 0 ||
    selectedPayments.length > 0 ||
    pin,
  );

  const hasUnsavedProductChanges = menus.some(
    (menu) => menu.name.trim() || menu.price.trim() || menu.photoName.trim(),
  );

  const hasUnsavedCommunicationChanges = Boolean(
    reviewReply.trim() || inquiryReply.trim(),
  );

  const hasUnsavedPromotionChanges = Boolean(
    todayDeal.trim() || news.trim() || couponEvent.trim(),
  );

  const hasUnsavedChanges = (section: OwnerSection | null) => {
    if (section === "store") return hasUnsavedStoreChanges;
    if (section === "product") return hasUnsavedProductChanges;
    if (section === "communication") return hasUnsavedCommunicationChanges;
    if (section === "promotion") return hasUnsavedPromotionChanges;
    return false;
  };

  const closeOrMoveSection = (nextSection: OwnerSection | null, onConfirm?: () => void) => {
    if (hasUnsavedChanges(activeSection)) {
      const shouldSave = window.confirm("설정내용을 저장하시겠습니까?");
      if (shouldSave) {
        saveOwnerDraft();
      }
    }
    onConfirm?.();
    setActiveSection(nextSection);
  };

  const handleCancel = (onConfirm?: () => void) => {
    // If this page was opened for editing from admin list, cancel should return back.
    if (returnToAdmin) {
      goBackToAdmin();
      return;
    }
    closeOrMoveSection(null, onConfirm);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => {
              if (returnToAdmin) {
                goBackToAdmin();
                return;
              }
              navigate(-1);
            }}
            className="p-1"
            aria-label="뒤로가기"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-[15px] text-gray-900">{pageTitle}</h1>
          <button
            type="button"
            onClick={() => {
              if (activeSection === "settings") return;
              closeOrMoveSection("settings");
            }}
            className={`p-1 rounded-lg transition-colors ${
              activeSection === "settings" ? "bg-gray-900 text-white" : "text-gray-700"
            }`}
            aria-label="설정"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        <div className="bg-white rounded-xl p-2 flex gap-2 overflow-x-auto">
          {[
            { key: "store" as OwnerSection, label: "상점 관리" },
            { key: "product" as OwnerSection, label: "상품 관리" },
            { key: "communication" as OwnerSection, label: "고객 소통" },
            { key: "customerMode" as OwnerSection, label: "상점 모드" },
            { key: "community" as OwnerSection, label: "커뮤니티" },
            { key: "promotion" as OwnerSection, label: "SNS 홍보" },
          ].map((section) => (
            <button
              key={section.key}
              onClick={() => {
                if (activeSection === section.key) return;
                closeOrMoveSection(section.key);
              }}
              className={`h-10 px-4 whitespace-nowrap rounded-lg text-[13px] transition-colors flex-shrink-0 ${
                activeSection === section.key
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
        {saveNotice && (
          <div
            ref={saveNoticeRef}
            id="owner-save-feedback"
            className={`rounded-lg text-[13px] px-3 py-2 border ${
              /저장(되었|됐)/.test(saveNotice)
                ? "bg-emerald-50 text-emerald-800 border-emerald-100"
                : "bg-amber-50 text-amber-900 border-amber-200"
            }`}
          >
            {saveNotice}
          </div>
        )}

        {activeSection === "store" && isStoreHydrating && (
          <div className="bg-white rounded-xl p-8 text-center text-[13px] text-gray-500">
            상점 정보를 불러오는 중...
          </div>
        )}

        {activeSection === "store" && !isStoreHydrating && (
          <>
            <div className="bg-white rounded-xl p-4">
              <h2 className="text-[14px] text-gray-900 mb-1">지도에서 핀 지정</h2>
              <p className="text-[12px] text-gray-400 mb-3">지도 클릭으로 가게 위치 핀을 먼저 찍어주세요.</p>
              <div className="mb-3 flex gap-2 overflow-x-auto">
                {(Object.entries(MARKET_VIEW_CONFIG) as Array<[MarketId, (typeof MARKET_VIEW_CONFIG)[MarketId]]>).map(([id, market]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setSelectedMarket(id);
                      setPin(null);
                      pinMarkerRef.current?.setMap(null);
                    }}
                    className={`h-8 px-3 rounded-lg text-[12px] whitespace-nowrap transition-colors ${
                      selectedMarket === id
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {market.label}
                  </button>
                ))}
              </div>
              <div className="relative w-full h-52 rounded-lg overflow-hidden bg-gray-100">
                {isPlaceholderClientId ? (
                  <div className="w-full h-full flex items-center justify-center text-[12px] text-gray-500">
                    `.env`에 네이버 지도 키를 설정해주세요.
                  </div>
                ) : mapError ? (
                  <div className="w-full h-full flex items-center justify-center text-[12px] text-gray-500">
                    지도 로딩에 실패했어요. 도메인/키를 확인해주세요.
                  </div>
                ) : (
                  <div ref={mapContainerRef} className="w-full h-full" />
                )}
              </div>
              <div className="mt-2 text-[12px] text-gray-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {pin
                  ? `선택 좌표: ${pin.lat.toFixed(6)}, ${pin.lng.toFixed(6)}`
                  : mapReady
                    ? "아직 핀이 없습니다. 지도를 클릭하세요."
                    : "지도를 불러오는 중..."}
              </div>
            </div>

            <form
              className="bg-white rounded-xl p-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                handleAddStore();
              }}
            >
              <div>
                <label className="block text-[12px] text-gray-500 mb-1">상점명</label>
                {isAdminNewStore ? (
                  <input
                    value={form.name}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, name: e.target.value }));
                      setPageTitle(e.target.value.trim() || "새 상점 등록");
                    }}
                    type="text"
                    placeholder="새 상점명 입력"
                    className="w-full h-10 rounded-lg bg-gray-100 px-3 text-[14px] focus:outline-none focus:ring-1 focus:ring-gray-300"
                  />
                ) : (
                  <>
                    <div className="w-full h-10 rounded-lg bg-gray-100 px-3 text-[14px] flex items-center text-gray-800 font-medium">
                      {approvedStoreName || form.name || "승인된 상점명"}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">상점명 변경은 설정에서 수정신청해주세요.</p>
                  </>
                )}
              </div>

              {isAdminNewStore && adminNewCredentials && (
                <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5">
                  <p className="text-[12px] text-blue-800 font-medium">로그인 계정 (자동 생성)</p>
                  <p className="text-[13px] text-blue-700 mt-1">
                    {formatAdminPhoneDisplay(adminNewCredentials.phone)} · PIN {adminNewCredentials.pin}
                  </p>
                  <p className="text-[11px] text-blue-600 mt-0.5">저장 시 상점 로그인 계정으로 등록됩니다.</p>
                </div>
              )}

              <div>
                <label className="block text-[12px] text-gray-500 mb-1">위치</label>
                <input
                  value={form.location}
                  onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                  type="text"
                  placeholder="예: 천안역전시장 A동 12호"
                  className="w-full h-10 rounded-lg bg-gray-100 px-3 text-[14px] focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
              </div>

              <div>
                <label className="block text-[12px] text-gray-500 mb-1">운영시간</label>
                <input
                  value={form.hours}
                  onChange={(e) => setForm((prev) => ({ ...prev, hours: e.target.value }))}
                  type="text"
                  placeholder="예: 09:00 - 21:00"
                  className="w-full h-10 rounded-lg bg-gray-100 px-3 text-[14px] focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
              </div>

              <div>
                <label className="block text-[12px] text-gray-500 mb-1">연락처</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: formatPhoneInput(e.target.value) }))}
                  type="tel"
                  placeholder="예: 041-555-1234"
                  className="w-full h-10 rounded-lg bg-gray-100 px-3 text-[14px] focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
              </div>

              <div>
                <label className="block text-[12px] text-gray-500 mb-1">카테고리 (중복 선택)</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleOption(category, selectedCategories, setSelectedCategories)}
                      className={`px-2.5 py-1.5 rounded-lg text-[12px] ${
                        selectedCategories.includes(category) ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[12px] text-gray-500 mb-1">결제 수단 관리 (중복 선택)</label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_OPTIONS.map((payment) => (
                    <button
                      key={payment}
                      type="button"
                      onClick={() => toggleOption(payment, selectedPayments, setSelectedPayments)}
                      className={`px-2.5 py-1.5 rounded-lg text-[12px] ${
                        selectedPayments.includes(payment) ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {payment}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[12px] text-gray-500 mb-1">소개</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  placeholder="상점 소개를 입력해주세요."
                  className="w-full rounded-lg bg-gray-100 px-3 py-2 text-[14px] resize-none focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
              </div>

              <div>
                <label className="block text-[12px] text-gray-500 mb-1">대표사진 지정</label>
                <label className="w-full h-10 rounded-lg bg-gray-100 px-3 text-[13px] text-gray-500 flex items-center gap-2 cursor-pointer">
                  <ImagePlus className="w-4 h-4" />
                  {form.representativePhotoName || "이미지 선택"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        setForm((prev) => ({
                          ...prev,
                          representativePhotoName: file.name,
                          representativePhotoUrl: typeof reader.result === "string" ? reader.result : "",
                        }));
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                {form.representativePhotoUrl && (
                  <div className="mt-2 w-full h-36 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                    <img
                      src={form.representativePhotoUrl}
                      alt="대표사진 미리보기"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {saveNotice ? (
                  <p
                    className={`col-span-2 rounded-lg border px-3 py-2 text-[12px] ${
                      /저장(되었|됐)/.test(saveNotice)
                        ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                        : "border-amber-200 bg-amber-50 text-amber-900"
                    }`}
                  >
                    {saveNotice}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleCancel(resetStoreForm)}
                  className="h-10 rounded-lg bg-gray-100 text-gray-600 text-[13px]"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-lg bg-gray-900 text-white text-[13px]"
                >
                  저장
                </button>
              </div>
            </form>
          </>
        )}

        {activeSection === "product" && (
          <div className="bg-white rounded-xl p-4 space-y-3">
            <h2 className="text-[14px] text-gray-900">메뉴 관리</h2>
            {menus.map((menu, idx) => (
              <div key={menu.id} className="rounded-lg bg-gray-50 p-3 space-y-2">
                <p className="text-[12px] text-gray-400">메뉴 {idx + 1}</p>
                <input
                  value={menu.name}
                  onChange={(e) =>
                    setMenus((prev) => prev.map((m) => (m.id === menu.id ? { ...m, name: e.target.value } : m)))
                  }
                  placeholder="메뉴 이름"
                  className="w-full h-9 rounded-md bg-white px-3 text-[13px] border border-gray-200"
                />
                <input
                  value={menu.price}
                  onChange={(e) =>
                    setMenus((prev) => prev.map((m) => (m.id === menu.id ? { ...m, price: e.target.value } : m)))
                  }
                  placeholder="가격"
                  className="w-full h-9 rounded-md bg-white px-3 text-[13px] border border-gray-200"
                />
                <label className="w-full h-9 rounded-md bg-white px-3 text-[12px] text-gray-500 border border-gray-200 flex items-center cursor-pointer">
                  {menu.photoName || "사진 추가"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      setMenus((prev) =>
                        prev.map((m) => (m.id === menu.id ? { ...m, photoName: e.target.files?.[0]?.name ?? "" } : m)),
                      )
                    }
                  />
                </label>
              </div>
            ))}
            <button
              type="button"
              onClick={addMenuRow}
              className="w-full h-9 rounded-lg bg-gray-100 text-gray-600 text-[13px] flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" />
              메뉴 추가
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleCancel()}
                className="h-10 rounded-lg bg-gray-100 text-gray-600 text-[13px]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => saveOwnerDraft("상품 관리 내용이 저장됐어요.")}
                className="h-10 rounded-lg bg-gray-900 text-white text-[13px]"
              >
                저장
              </button>
            </div>
          </div>
        )}

        {activeSection === "communication" && (
          <div className="bg-white rounded-xl p-4 space-y-4">
            <div className="rounded-lg bg-gray-50 p-3">
              <h2 className="text-[14px] text-gray-900 mb-1">단골 현황</h2>
              <p className="text-[12px] text-gray-500">내 가게를 찜/즐겨찾기한 사용자: <span className="text-gray-900">128명</span></p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveCommunicationSubSection("review")}
                className={`flex-1 h-10 px-3 rounded-lg text-[13px] transition-colors ${
                  activeCommunicationSubSection === "review" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                리뷰 관리 <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">0</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCommunicationSubSection("inquiry")}
                className={`flex-1 h-10 px-3 rounded-lg text-[13px] transition-colors ${
                  activeCommunicationSubSection === "inquiry" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                문의 <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700">3</span>
              </button>
            </div>

            {activeCommunicationSubSection === "review" && (
              <div className="space-y-3">
                <div className="rounded-lg bg-gray-50 p-3">
                  <h2 className="text-[14px] text-gray-900 mb-1">리뷰 관리</h2>
                  <p className="text-[11px] text-gray-500 mb-2">후기 확인 및 답글</p>
                  <div className="rounded-md bg-white px-2 py-1.5 border border-gray-200 text-[11px] text-gray-600 mb-2">
                    "사장님이 친절해요!" - 고객 A
                  </div>
                  <textarea
                    rows={3}
                    placeholder="답글 작성"
                    value={reviewReply}
                    onChange={(e) => setReviewReply(e.target.value)}
                    className="w-full rounded-md bg-white px-2 py-1.5 border border-gray-200 text-[12px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCancel()}
                    className="h-10 rounded-lg bg-gray-100 text-gray-600 text-[13px]"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={() => saveOwnerDraft("리뷰 답글이 저장됐어요.")}
                    className="h-10 rounded-lg bg-gray-900 text-white text-[13px]"
                  >
                    저장
                  </button>
                </div>
              </div>
            )}

            {activeCommunicationSubSection === "inquiry" && (
              <div className="space-y-3">
                <div className="rounded-lg bg-gray-50 p-3">
                  <h2 className="text-[14px] text-gray-900 mb-1">문의 응대</h2>
                  <p className="text-[11px] text-gray-500 mb-2">1:1 질문 확인 및 답변</p>
                  <div className="rounded-md bg-white px-2 py-1.5 border border-gray-200 text-[11px] text-gray-600 mb-2">
                    "오늘 갈치 재고 있나요?" - 고객 B
                  </div>
                  <textarea
                    rows={3}
                    placeholder="답변 작성"
                    value={inquiryReply}
                    onChange={(e) => setInquiryReply(e.target.value)}
                    className="w-full rounded-md bg-white px-2 py-1.5 border border-gray-200 text-[12px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCancel()}
                    className="h-10 rounded-lg bg-gray-100 text-gray-600 text-[13px]"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={() => saveOwnerDraft("문의 답변이 저장됐어요.")}
                    className="h-10 rounded-lg bg-gray-900 text-white text-[13px]"
                  >
                    저장
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === "customerMode" && (
          <div className="bg-white rounded-xl p-4 space-y-3">
            <div className="rounded-lg bg-blue-50 p-3">
              <h2 className="text-[14px] text-gray-900 mb-1">상점 모드</h2>
              <p className="text-[12px] text-gray-500">상점모드로 앱을 둘러보세요.</p>
            </div>
            <button
              onClick={() => enterOwnerPreview("/home")}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-900 rounded-xl active:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-[22px]">🏪</span>
                <div className="text-left">
                  <p className="text-[14px] font-medium text-white">상점모드로 앱 보기</p>
                </div>
              </div>
              <span className="text-white text-[13px]">→</span>
            </button>
          </div>
        )}

        {activeSection === "community" && (
          <div className="bg-white rounded-xl p-4 space-y-3">
            <div className="rounded-lg bg-gray-50 p-3">
              <h2 className="text-[14px] text-gray-900 mb-1">커뮤니티</h2>
              <p className="text-[12px] text-gray-500">시장 이웃과 소통하고 가게 소식을 게시판에 알려보세요.</p>
            </div>
            <button
              onClick={() => enterOwnerPreview("/chat?sajangnim=true")}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-50 rounded-xl border border-gray-100 active:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-[22px]">💬</span>
                <div className="text-left">
                  <p className="text-[14px] font-medium text-gray-800">커뮤니티 보기</p>
                  <p className="text-[11px] text-gray-400">시장 게시판 둘러보기</p>
                </div>
              </div>
              <span className="text-gray-400 text-[13px]">→</span>
            </button>
            <button
              onClick={() => enterOwnerPreview("/write?sajangnim=true")}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-900 rounded-xl active:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-[22px]">✏️</span>
                <div className="text-left">
                  <p className="text-[14px] font-medium text-white">글쓰기</p>
                  <p className="text-[11px] text-gray-400">사장님 공지·홍보 글 작성</p>
                </div>
              </div>
              <span className="text-white text-[13px]">→</span>
            </button>
          </div>
        )}

        {activeSection === "promotion" && (
          <div className="bg-white rounded-xl p-4 space-y-3">
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-2">홍보 내용</label>
              <textarea
                value={news}
                onChange={(e) => setNews(e.target.value)}
                rows={10}
                placeholder="신상품 입고, 특가, 쿠폰/이벤트 등 다양한 홍보내용을 입력해주세요."
                className="w-full rounded-lg bg-gray-100 px-3 py-2.5 text-[13px] resize-none leading-relaxed"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleCancel()}
                className="h-10 rounded-lg bg-gray-100 text-gray-600 text-[13px]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => saveOwnerDraft("SNS 홍보 내용이 저장됐어요.")}
                className="h-10 rounded-lg bg-gray-900 text-white text-[13px]"
              >
                저장
              </button>
            </div>
          </div>
        )}

        {activeSection === "settings" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full bg-white rounded-xl px-4 py-3.5 flex items-center justify-center gap-2 text-red-500 active:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-[14px]">로그아웃</span>
            </button>

            {settingsNotice && (
              <div className="rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100 text-[13px] px-3 py-2">
                {settingsNotice}
              </div>
            )}

            {/* 상점명 */}
            <div className="bg-white rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-400" />
                <h2 className="text-[14px] font-medium text-gray-900">상점명</h2>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[15px] font-semibold text-gray-900">{approvedStoreName || "승인된 상점명 없음"}</p>
                {settingsModal !== "storeName" && (
                  <button
                    type="button"
                    disabled={isStoreNamePending}
                    onClick={() => {
                      if (isStoreNamePending) return;
                      setSettingsModal("storeName");
                      setSettingsInput("");
                      setSettingsNotice("");
                    }}
                    className={`h-8 px-3 rounded-lg text-[12px] whitespace-nowrap ${
                      isStoreNamePending
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {isStoreNamePending ? "수정 신청중" : "수정 신청"}
                  </button>
                )}
              </div>
              {settingsModal === "storeName" && (
                <div className="space-y-2 pt-1 border-t border-gray-100">
                  <p className="text-[12px] text-gray-500">변경하실 상점명으로 입력해주세요.</p>
                  <input
                    value={settingsInput}
                    onChange={(e) => setSettingsInput(e.target.value)}
                    maxLength={20}
                    placeholder="새 상점명"
                    className="w-full h-10 rounded-lg bg-gray-100 px-3 text-[14px] focus:outline-none focus:ring-1 focus:ring-gray-300"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setSettingsModal(null); setSettingsInput(""); }}
                      className="h-9 rounded-lg bg-gray-100 text-[12px] text-gray-600"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={() => submitChangeRequest("storeName", settingsInput)}
                      className="h-9 rounded-lg bg-gray-900 text-[12px] text-white"
                    >
                      신청하기
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 휴대폰 번호 */}
            <div className="bg-white rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <h2 className="text-[14px] font-medium text-gray-900">휴대폰 번호</h2>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[15px] font-semibold text-gray-900">
                  {ownerPhone ? formatPhoneDisplay(ownerPhone) : "등록된 번호 없음"}
                </p>
                {settingsModal !== "phone" && (
                  <button
                    type="button"
                    disabled={isPhonePending}
                    onClick={() => {
                      if (isPhonePending) return;
                      setSettingsModal("phone");
                      setSettingsInput("");
                      setSettingsNotice("");
                    }}
                    className={`h-8 px-3 rounded-lg text-[12px] whitespace-nowrap ${
                      isPhonePending
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {isPhonePending ? "수정 신청중" : "수정 신청"}
                  </button>
                )}
              </div>
              {settingsModal === "phone" && (
                <div className="space-y-2 pt-1 border-t border-gray-100">
                  <p className="text-[12px] text-gray-500">변경하실 휴대폰 번호로 입력해주세요.</p>
                  <input
                    type="tel"
                    value={settingsInput}
                    onChange={(e) => setSettingsInput(formatPhoneInput(e.target.value))}
                    maxLength={13}
                    placeholder="010-0000-0000"
                    className="w-full h-10 rounded-lg bg-gray-100 px-3 text-[14px] focus:outline-none focus:ring-1 focus:ring-gray-300"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setSettingsModal(null); setSettingsInput(""); }}
                      className="h-9 rounded-lg bg-gray-100 text-[12px] text-gray-600"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={() => submitChangeRequest("phone", settingsInput)}
                      className="h-9 rounded-lg bg-gray-900 text-[12px] text-white"
                    >
                      신청하기
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 이메일 */}
            <div className="bg-white rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <h2 className="text-[14px] font-medium text-gray-900">이메일</h2>
              </div>
              <p className="text-[13px] text-gray-500">PIN 찾기 등에 사용하는 이메일입니다.</p>
              {settingsModal !== "email" ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[14px] text-gray-800 truncate">{ownerEmail || "등록된 이메일 없음"}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsModal("email");
                      setSettingsInput(ownerEmail);
                      setSettingsNotice("");
                    }}
                    className="h-8 px-3 rounded-lg bg-gray-100 text-[12px] text-gray-700 whitespace-nowrap flex-shrink-0"
                  >
                    변경
                  </button>
                </div>
              ) : (
                <div className="space-y-2 pt-1 border-t border-gray-100">
                  <input
                    type="email"
                    value={settingsInput}
                    onChange={(e) => setSettingsInput(e.target.value)}
                    placeholder="example@email.com"
                    className="w-full h-10 rounded-lg bg-gray-100 px-3 text-[14px] focus:outline-none focus:ring-1 focus:ring-gray-300"
                  />
                  {settingsNotice && settingsModal === "email" && (
                    <p className="text-[11px] text-red-400">{settingsNotice}</p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setSettingsModal(null); setSettingsInput(""); setSettingsNotice(""); }}
                      className="h-9 rounded-lg bg-gray-100 text-[12px] text-gray-600"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={handleEmailChange}
                      className="h-9 rounded-lg bg-gray-900 text-[12px] text-white"
                    >
                      변경하기
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* PIN 번호 */}
            <div className="bg-white rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-gray-400" />
                <h2 className="text-[14px] font-medium text-gray-900">PIN 번호</h2>
              </div>
              <p className="text-[13px] text-gray-500">로그인에 사용하는 PIN 번호입니다.</p>
              {settingsModal !== "pin" ? (
                <button
                  type="button"
                  onClick={() => {
                    setSettingsModal("pin");
                    setSettingsInput("");
                    setSettingsPinConfirm("");
                    setSettingsNotice("");
                  }}
                  className="h-10 w-full rounded-lg bg-gray-900 text-[13px] text-white"
                >
                  핀번호 변경
                </button>
              ) : (
                <div className="space-y-2 pt-1 border-t border-gray-100">
                  <input
                    type="password"
                    inputMode="numeric"
                    value={settingsInput}
                    onChange={(e) => setSettingsInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    placeholder="새 PIN (4~6자리)"
                    className="w-full h-10 rounded-lg bg-gray-100 px-3 text-[14px] tracking-widest focus:outline-none focus:ring-1 focus:ring-gray-300"
                  />
                  <input
                    type="password"
                    inputMode="numeric"
                    value={settingsPinConfirm}
                    onChange={(e) => setSettingsPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    placeholder="새 PIN 확인"
                    className="w-full h-10 rounded-lg bg-gray-100 px-3 text-[14px] tracking-widest focus:outline-none focus:ring-1 focus:ring-gray-300"
                  />
                  {settingsNotice && settingsModal === "pin" && (
                    <p className="text-[11px] text-red-400">{settingsNotice}</p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSettingsModal(null);
                        setSettingsInput("");
                        setSettingsPinConfirm("");
                        setSettingsNotice("");
                      }}
                      className="h-9 rounded-lg bg-gray-100 text-[12px] text-gray-600"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={handlePinChange}
                      className="h-9 rounded-lg bg-gray-900 text-[12px] text-white"
                    >
                      변경하기
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        
      </div>
    </div>
  );
}
