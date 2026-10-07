import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, LogOut, User, Bell, Store, Phone, Lock, Mail } from "lucide-react";
import { Navigate, useNavigate } from "react-router";
import { OWNER_MODE_KEY, STORE_SETTINGS_PATH } from "../components/BottomNav";
import { useAuth } from "../context/AuthContext";
import { loadRegisteredUsers, upsertRegisteredUser, saveUserEmail, isValidEmail, findRegisteredUserByPhone } from "../data/userAccounts";
import { resolveStoreLoginPhone } from "../data/adminAccount";
import {
  matchesOwnerChangeRequest,
  submitOwnerChangeRequest,
  applyApprovedChangeRequestsLocally,
  type OwnerChangeRequest,
} from "../data/ownerChangeRequests";
import { refreshOwnerChangeRequestsFromRemote } from "../data/ownerChangeRequestsSync";
import { refreshRegisteredUsersFromRemote } from "../data/registeredUsersSync";
import { formatPhoneDisplay, formatPhoneInput } from "../utils/phoneFormat";

type SettingsModal = "phone" | "pin" | "email" | null;

export function SettingsPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const ownerMode = localStorage.getItem(OWNER_MODE_KEY) === "true";
  const isOwnerAccount = localStorage.getItem("user_role") === "owner";
  const ownerStoreName = localStorage.getItem("owner_current_store_name") || "";

  const [nickname, setNickname] = useState(
    () => localStorage.getItem("user_name") || "홍길동"
  );
  const [userPhone, setUserPhone] = useState(() => {
    const storeIdRaw = localStorage.getItem("owner_store_id");
    const storeId = storeIdRaw ? Number(storeIdRaw) : null;
    const ownerModeActive = localStorage.getItem(OWNER_MODE_KEY) === "true";
    if (ownerModeActive || localStorage.getItem("user_role") === "owner") {
      return resolveStoreLoginPhone(Number.isFinite(storeId) ? storeId : null);
    }
    return localStorage.getItem("user_phone") || "";
  });
  const [userEmail, setUserEmail] = useState(
    () => localStorage.getItem("user_email") || ""
  );
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(nickname);

  const [settingsModal, setSettingsModal] = useState<SettingsModal>(null);
  const [settingsInput, setSettingsInput] = useState("");
  const [settingsPinConfirm, setSettingsPinConfirm] = useState("");
  const [changeRequests, setChangeRequests] = useState<OwnerChangeRequest[]>([]);
  const [settingsNotice, setSettingsNotice] = useState("");

  const [eventAlarm, setEventAlarm] = useState(false);
  const [newAlarm, setNewAlarm] = useState(false);

  const changeRequestSource = ownerMode ? "store" : "customer";
  const changeRequestName = ownerMode ? ownerStoreName || nickname : nickname;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await refreshRegisteredUsersFromRemote();
      const requests = await refreshOwnerChangeRequestsFromRemote();
      if (cancelled) return;
      applyApprovedChangeRequestsLocally(requests);
      setChangeRequests(requests);
      const nextPhone = localStorage.getItem("user_phone") || "";
      if (nextPhone) setUserPhone(nextPhone);
      const registered = findRegisteredUserByPhone(nextPhone);
      if (registered?.email) setUserEmail(registered.email);
      if (registered?.name) {
        setNickname(registered.name);
        setNicknameInput(registered.name);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ownerMode && localStorage.getItem("user_role") !== "owner") return;
    const storeIdRaw = localStorage.getItem("owner_store_id");
    const storeId = storeIdRaw ? Number(storeIdRaw) : null;
    const loginPhone = resolveStoreLoginPhone(Number.isFinite(storeId) ? storeId : null);
    if (!loginPhone) return;
    setUserPhone(loginPhone);

    const role = localStorage.getItem("user_role");
    if (role === "owner") {
      const currentPhone = (localStorage.getItem("user_phone") || "").replace(/\D/g, "");
      if (currentPhone !== loginPhone) {
        localStorage.setItem("user_phone", loginPhone);
      }
    }

    const registered = findRegisteredUserByPhone(loginPhone);
    if (registered?.email) {
      setUserEmail(registered.email);
    }
  }, [ownerMode]);

  const pendingPhoneRequest =
    changeRequests.find(
      (item) =>
        item.status === "pending" &&
        item.type === "phone" &&
        matchesOwnerChangeRequest(item, {
          storeName: changeRequestName,
          phone: userPhone,
          source: changeRequestSource,
        }),
    ) ?? null;
  const isPhonePending = Boolean(pendingPhoneRequest);

  const handleSaveNickname = () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed) return;
    setNickname(trimmed);
    localStorage.setItem("user_name", trimmed);
    setIsEditingNickname(false);
  };

  const submitPhoneChangeRequest = () => {
    const trimmed = settingsInput.trim().replace(/\D/g, "");
    if (!/^[0-9]{10,11}$/.test(trimmed)) {
      setSettingsNotice("올바른 휴대폰 번호 형식으로 입력해주세요.");
      return;
    }
    if (trimmed === userPhone.replace(/\D/g, "")) {
      setSettingsNotice("현재 번호와 동일합니다.");
      return;
    }
    if (isPhonePending) return;

    const request = submitOwnerChangeRequest({
      type: "phone",
      storeName: changeRequestName,
      currentValue: userPhone.replace(/\D/g, ""),
      newValue: trimmed,
      source: changeRequestSource,
    });
    setChangeRequests((prev) => {
      const withoutDuplicate = prev.filter(
        (item) =>
          !(
            item.status === "pending" &&
            item.type === "phone" &&
            matchesOwnerChangeRequest(item, {
              storeName: changeRequestName,
              phone: userPhone,
              source: changeRequestSource,
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
    if (trimmed === userEmail) {
      setSettingsNotice("현재 이메일과 동일합니다.");
      return;
    }
    const phoneDigits = userPhone.replace(/\D/g, "");
    saveUserEmail(trimmed, phoneDigits);
    setUserEmail(trimmed);
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
    const phoneDigits = userPhone.replace(/\D/g, "");
    const existing = loadRegisteredUsers().find((item) => item.phone === phoneDigits);
    if (existing) {
      upsertRegisteredUser({ ...existing, pin: settingsInput });
    }
    setSettingsModal(null);
    setSettingsInput("");
    setSettingsPinConfirm("");
    setSettingsNotice("PIN 번호가 변경되었습니다.");
    window.setTimeout(() => setSettingsNotice(""), 2200);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const closeSettingsModal = () => {
    setSettingsModal(null);
    setSettingsInput("");
    setSettingsPinConfirm("");
    setSettingsNotice("");
  };

  if (ownerMode || isOwnerAccount) {
    return <Navigate to={STORE_SETTINGS_PATH} replace />;
  }

  return (
    <div className="min-h-screen bg-[#F8F7F3]">
      {/* 헤더 */}
      <div className="sticky top-0 bg-white/95 z-10 border-b border-[#EEEAE4]">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ChevronLeft className="w-5 h-5 text-[#6B5142]" />
          </button>
          <h1 className="text-[15px] font-semibold text-[#46352C]">설정</h1>
          <div className="w-7" />
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">

        {/* 로그아웃 */}
        <button
          onClick={handleLogout}
          className="w-full bg-white rounded-xl border border-[#EDE5D8] px-4 py-3.5 flex items-center justify-center gap-2 text-red-500 shadow-sm active:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-[14px]">로그아웃</span>
        </button>

        {/* 계정 */}
        <div className="bg-white rounded-xl overflow-hidden border border-[#EDE5D8] shadow-sm">
          <p className="text-[12px] font-semibold text-[#8A6A52] px-4 pt-4 pb-2">계정</p>
          {settingsNotice && !settingsModal && (
            <div className="mx-4 mb-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100 text-[13px] px-3 py-2">
              {settingsNotice}
            </div>
          )}
          <div className="px-4 pb-4 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {ownerMode
                  ? <Store className="w-4 h-4 text-[#8A6A52] flex-shrink-0" />
                  : <User className="w-4 h-4 text-[#8A6A52] flex-shrink-0" />
                }
                <span className="text-[12px] text-[#9A897F]">{ownerMode ? "상점명" : "닉네임"}</span>
              </div>
              {ownerMode ? (
                <div className="bg-[#F8F5F0] rounded-lg px-3 py-2.5">
                  <span className="text-[15px] text-[#46352C]">{ownerStoreName || "상점명 없음"}</span>
                </div>
              ) : isEditingNickname ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveNickname()}
                    maxLength={12}
                    autoFocus
                    className="flex-1 px-3 py-2 border border-[#E5D9CB] rounded-lg text-[14px] text-[#46352C] focus:outline-none focus:border-[#B89A7D]"
                  />
                  <button
                    onClick={handleSaveNickname}
                    className="px-3 py-2 bg-[#5B4335] text-white text-[13px] rounded-lg active:bg-[#46352C] transition-colors"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => { setIsEditingNickname(false); setNicknameInput(nickname); }}
                    className="px-3 py-2 bg-[#F5F0E7] text-[#6B5142] text-[13px] rounded-lg active:bg-[#EFE4D8] transition-colors"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-[#F8F5F0] rounded-lg px-3 py-2.5">
                  <span className="text-[15px] text-[#46352C]">{nickname}</span>
                  <button
                    onClick={() => { setIsEditingNickname(true); setNicknameInput(nickname); }}
                    className="flex items-center gap-1 text-[13px] text-[#8A6A52] active:text-[#46352C] transition-colors"
                  >
                    <span>✏️</span>
                    <span>변경</span>
                  </button>
                </div>
              )}
            </div>

            {/* 휴대폰 번호 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-4 h-4 text-[#8A6A52] flex-shrink-0" />
                <span className="text-[12px] text-[#9A897F]">휴대폰 번호</span>
              </div>
              <div className="flex items-center justify-between bg-[#F8F5F0] rounded-lg px-3 py-2.5">
                <span className="text-[15px] text-[#46352C]">
                  {userPhone ? formatPhoneDisplay(userPhone) : "등록된 번호 없음"}
                </span>
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
                    className={`flex items-center gap-1 text-[13px] transition-colors ${
                      isPhonePending
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-[#8A6A52] active:text-[#46352C]"
                    }`}
                  >
                    {!isPhonePending && <span>✏️</span>}
                    <span>{isPhonePending ? "수정 신청중" : "수정 신청"}</span>
                  </button>
                )}
              </div>
              {settingsModal === "phone" && (
                <div className="mt-2 space-y-2 pt-2 border-t border-[#EEE5D9]">
                  <p className="text-[12px] text-[#8A776B]">변경하실 휴대폰 번호로 입력해주세요.</p>
                  <input
                    type="tel"
                    value={settingsInput}
                    onChange={(e) => {
                      setSettingsInput(formatPhoneInput(e.target.value));
                      setSettingsNotice("");
                    }}
                    maxLength={13}
                    placeholder="010-0000-0000"
                    autoFocus
                    className="w-full px-3 py-2 border border-[#E5D9CB] rounded-lg text-[14px] text-[#46352C] focus:outline-none focus:border-[#B89A7D]"
                  />
                  {settingsNotice && (
                    <p className="text-[11px] text-red-400">{settingsNotice}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={closeSettingsModal}
                      className="flex-1 px-3 py-2 bg-[#F5F0E7] text-[#6B5142] text-[13px] rounded-lg active:bg-[#EFE4D8] transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={submitPhoneChangeRequest}
                      className="flex-1 px-3 py-2 bg-[#5B4335] text-white text-[13px] rounded-lg active:bg-[#46352C] transition-colors"
                    >
                      신청하기
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 이메일 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-[#8A6A52] flex-shrink-0" />
                <span className="text-[12px] text-[#9A897F]">이메일</span>
              </div>
              {settingsModal !== "email" ? (
                <div className="flex items-center justify-between bg-[#F8F5F0] rounded-lg px-3 py-2.5 gap-2">
                  <span className="text-[14px] text-[#46352C] truncate">{userEmail || "등록된 이메일 없음"}</span>
                  <button
                    onClick={() => { setSettingsModal("email"); setSettingsInput(userEmail); setSettingsNotice(""); }}
                    className="flex items-center gap-1 text-[13px] text-[#8A6A52] active:text-[#46352C] transition-colors flex-shrink-0"
                  >
                    <span>✏️</span>
                    <span>변경</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <input
                    type="email"
                    value={settingsInput}
                    onChange={(e) => setSettingsInput(e.target.value)}
                    placeholder="example@email.com"
                    autoFocus
                    className="w-full px-3 py-2 border border-[#E5D9CB] rounded-lg text-[14px] text-[#46352C] focus:outline-none focus:border-[#B89A7D]"
                  />
                  {settingsNotice && (
                    <p className="text-[11px] text-red-400">{settingsNotice}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={closeSettingsModal}
                      className="flex-1 px-3 py-2 bg-[#F5F0E7] text-[#6B5142] text-[13px] rounded-lg active:bg-[#EFE4D8] transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleEmailChange}
                      className="flex-1 px-3 py-2 bg-[#5B4335] text-white text-[13px] rounded-lg active:bg-[#46352C] transition-colors"
                    >
                      변경하기
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* PIN 번호 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-[#8A6A52] flex-shrink-0" />
                <span className="text-[12px] text-[#9A897F]">PIN 번호</span>
              </div>
              {settingsModal !== "pin" ? (
                <div className="flex items-center justify-between bg-[#F8F5F0] rounded-lg px-3 py-2.5">
                  <span className="text-[15px] text-[#46352C] tracking-widest">••••</span>
                  <button
                    onClick={() => { setSettingsModal("pin"); setSettingsInput(""); setSettingsPinConfirm(""); setSettingsNotice(""); }}
                    className="flex items-center gap-1 text-[13px] text-[#8A6A52] active:text-[#46352C] transition-colors"
                  >
                    <span>✏️</span>
                    <span>변경</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <input
                    type="password"
                    inputMode="numeric"
                    value={settingsInput}
                    onChange={(e) => setSettingsInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    placeholder="새 PIN (4~6자리)"
                    autoFocus
                    className="w-full px-3 py-2 border border-[#E5D9CB] rounded-lg text-[14px] text-[#46352C] tracking-widest focus:outline-none focus:border-[#B89A7D]"
                  />
                  <input
                    type="password"
                    inputMode="numeric"
                    value={settingsPinConfirm}
                    onChange={(e) => setSettingsPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    placeholder="새 PIN 확인"
                    className="w-full px-3 py-2 border border-[#E5D9CB] rounded-lg text-[14px] text-[#46352C] tracking-widest focus:outline-none focus:border-[#B89A7D]"
                  />
                  {settingsNotice && (
                    <p className="text-[11px] text-red-400">{settingsNotice}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={closeSettingsModal}
                      className="flex-1 px-3 py-2 bg-[#F5F0E7] text-[#6B5142] text-[13px] rounded-lg active:bg-[#EFE4D8] transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={handlePinChange}
                      className="flex-1 px-3 py-2 bg-[#5B4335] text-white text-[13px] rounded-lg active:bg-[#46352C] transition-colors"
                    >
                      변경하기
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 푸시 알림 */}
        <div className="bg-white rounded-xl overflow-hidden border border-[#EDE5D8] shadow-sm">
          <p className="text-[12px] font-semibold text-[#8A6A52] px-4 pt-4 pb-2">푸시 알림</p>
          <div className="divide-y divide-gray-50">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-[#8A6A52]" />
                <div>
                  <p className="text-[14px] text-[#46352C]">이벤트 알림</p>
                  <p className="text-[11px] text-[#9A897F] mt-0.5">시장 이벤트·혜택 소식을 받아요</p>
                </div>
              </div>
              <button
                onClick={() => setEventAlarm((v) => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${eventAlarm ? "bg-[#5B4335]" : "bg-gray-200"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${eventAlarm ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-[#8A6A52]" />
                <div>
                  <p className="text-[14px] text-[#46352C]">새로운 알림</p>
                  <p className="text-[11px] text-[#9A897F] mt-0.5">댓글·좋아요 등 새 알림을 받아요</p>
                </div>
              </div>
              <button
                onClick={() => setNewAlarm((v) => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${newAlarm ? "bg-[#5B4335]" : "bg-gray-200"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${newAlarm ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          </div>
        </div>

        {/* 고객센터 */}
        <div className="bg-white rounded-xl overflow-hidden border border-[#EDE5D8] shadow-sm">
          <p className="text-[12px] font-semibold text-[#8A6A52] px-4 pt-4 pb-2">고객센터</p>
          <div className="divide-y divide-gray-50">
            {[
              "1:1 문의하기",
              "자주 묻는 질문",
              "서비스 이용약관",
              "개인정보 처리방침",
            ].map((item) => (
              <button
                key={item}
                className="w-full flex items-center justify-between px-4 py-3.5 active:bg-[#F8F5F0] transition-colors"
              >
                <span className="text-[14px] text-[#46352C]">{item}</span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </button>
            ))}
          </div>
        </div>

        {/* 앱 버전 */}
        <div className="bg-white rounded-xl border border-[#EDE5D8] shadow-sm px-4 py-3.5 flex items-center justify-between">
          <span className="text-[14px] text-[#8A776B]">앱 버전</span>
          <span className="text-[14px] text-[#8A776B]">1.0.0</span>
        </div>

      </div>
    </div>
  );
}
