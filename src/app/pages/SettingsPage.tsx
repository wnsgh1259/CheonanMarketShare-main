import { useState } from "react";
import { ChevronLeft, ChevronRight, LogOut, User, Bell, Store, Phone, Lock, Mail } from "lucide-react";
import { useNavigate } from "react-router";
import { OWNER_MODE_KEY } from "../components/BottomNav";
import { useAuth } from "../context/AuthContext";
import { loadRegisteredUsers, upsertRegisteredUser, saveUserEmail, isValidEmail } from "../data/userAccounts";

const OWNER_CHANGE_REQUESTS_KEY = "owner_change_requests";

function formatPhoneDisplay(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return phone;
}

type SettingsModal = "phone" | "pin" | "email" | null;

export function SettingsPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const ownerMode = localStorage.getItem(OWNER_MODE_KEY) === "true";
  const ownerStoreName = localStorage.getItem("owner_current_store_name") || "";

  const [nickname, setNickname] = useState(
    () => localStorage.getItem("user_name") || "홍길동"
  );
  const [userPhone, setUserPhone] = useState(
    () => localStorage.getItem("user_phone") || ""
  );
  const [userEmail, setUserEmail] = useState(
    () => localStorage.getItem("user_email") || ""
  );
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(nickname);

  const [settingsModal, setSettingsModal] = useState<SettingsModal>(null);
  const [settingsInput, setSettingsInput] = useState("");
  const [settingsPinConfirm, setSettingsPinConfirm] = useState("");
  const [phoneSubmitted, setPhoneSubmitted] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState("");

  const [eventAlarm, setEventAlarm] = useState(false);
  const [newAlarm, setNewAlarm] = useState(false);

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
    try {
      const raw = localStorage.getItem(OWNER_CHANGE_REQUESTS_KEY);
      const requests = raw ? JSON.parse(raw) as unknown[] : [];
      requests.push({
        id: Date.now(),
        type: "phone",
        storeName: ownerMode ? ownerStoreName || nickname : nickname,
        currentValue: userPhone.replace(/\D/g, ""),
        newValue: trimmed,
        status: "pending",
        createdAt: new Date().toISOString(),
        source: ownerMode ? "store" : "customer",
      });
      localStorage.setItem(OWNER_CHANGE_REQUESTS_KEY, JSON.stringify(requests));
    } catch {
      /* ignore */
    }
    setPhoneSubmitted(true);
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

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* 헤더 */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-[15px] text-gray-900">설정</h1>
          <div className="w-7" />
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">

        {/* 로그아웃 */}
        <button
          onClick={handleLogout}
          className="w-full bg-white rounded-xl px-4 py-3.5 flex items-center justify-center gap-2 text-red-500 active:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-[14px]">로그아웃</span>
        </button>

        {/* 계정 */}
        <div className="bg-white rounded-xl overflow-hidden">
          <p className="text-[12px] text-gray-400 px-4 pt-4 pb-2">계정</p>
          {settingsNotice && !settingsModal && (
            <div className="mx-4 mb-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100 text-[13px] px-3 py-2">
              {settingsNotice}
            </div>
          )}
          <div className="px-4 pb-4 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {ownerMode
                  ? <Store className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  : <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                }
                <span className="text-[12px] text-gray-400">{ownerMode ? "상점명" : "닉네임"}</span>
              </div>
              {ownerMode ? (
                <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                  <span className="text-[15px] text-gray-800">{ownerStoreName || "상점명 없음"}</span>
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
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-[14px] text-gray-800 focus:outline-none focus:border-gray-500"
                  />
                  <button
                    onClick={handleSaveNickname}
                    className="px-3 py-2 bg-gray-900 text-white text-[13px] rounded-lg active:bg-gray-700 transition-colors"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => { setIsEditingNickname(false); setNicknameInput(nickname); }}
                    className="px-3 py-2 bg-gray-100 text-gray-500 text-[13px] rounded-lg active:bg-gray-200 transition-colors"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                  <span className="text-[15px] text-gray-800">{nickname}</span>
                  <button
                    onClick={() => { setIsEditingNickname(true); setNicknameInput(nickname); }}
                    className="flex items-center gap-1 text-[13px] text-gray-500 active:text-gray-800 transition-colors"
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
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-[12px] text-gray-400">휴대폰 번호</span>
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                <span className="text-[15px] text-gray-800">
                  {userPhone ? formatPhoneDisplay(userPhone) : "등록된 번호 없음"}
                </span>
                {!phoneSubmitted && settingsModal !== "phone" && (
                  <button
                    onClick={() => { setSettingsModal("phone"); setSettingsInput(""); setSettingsNotice(""); }}
                    className="flex items-center gap-1 text-[13px] text-gray-500 active:text-gray-800 transition-colors"
                  >
                    <span>✏️</span>
                    <span>변경</span>
                  </button>
                )}
              </div>
              {phoneSubmitted && (
                <div className="mt-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5">
                  <p className="text-[13px] text-amber-800 font-medium">변경 신청이 접수되었습니다.</p>
                  <p className="text-[12px] text-amber-700 mt-0.5">영업일 1일 이내 처리됩니다.</p>
                </div>
              )}
              {settingsModal === "phone" && (
                <div className="mt-2 space-y-2 pt-2 border-t border-gray-100">
                  <p className="text-[12px] text-gray-500">변경하실 휴대폰 번호로 입력해주세요.</p>
                  <input
                    type="tel"
                    value={settingsInput}
                    onChange={(e) => setSettingsInput(e.target.value.replace(/[^\d-]/g, ""))}
                    maxLength={13}
                    placeholder="010-0000-0000"
                    autoFocus
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] text-gray-800 focus:outline-none focus:border-gray-500"
                  />
                  {settingsNotice && (
                    <p className="text-[11px] text-red-400">{settingsNotice}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={closeSettingsModal}
                      className="flex-1 px-3 py-2 bg-gray-100 text-gray-500 text-[13px] rounded-lg active:bg-gray-200 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={submitPhoneChangeRequest}
                      className="flex-1 px-3 py-2 bg-gray-900 text-white text-[13px] rounded-lg active:bg-gray-700 transition-colors"
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
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-[12px] text-gray-400">이메일</span>
              </div>
              {settingsModal !== "email" ? (
                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5 gap-2">
                  <span className="text-[14px] text-gray-800 truncate">{userEmail || "등록된 이메일 없음"}</span>
                  <button
                    onClick={() => { setSettingsModal("email"); setSettingsInput(userEmail); setSettingsNotice(""); }}
                    className="flex items-center gap-1 text-[13px] text-gray-500 active:text-gray-800 transition-colors flex-shrink-0"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] text-gray-800 focus:outline-none focus:border-gray-500"
                  />
                  {settingsNotice && (
                    <p className="text-[11px] text-red-400">{settingsNotice}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={closeSettingsModal}
                      className="flex-1 px-3 py-2 bg-gray-100 text-gray-500 text-[13px] rounded-lg active:bg-gray-200 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleEmailChange}
                      className="flex-1 px-3 py-2 bg-gray-900 text-white text-[13px] rounded-lg active:bg-gray-700 transition-colors"
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
                <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-[12px] text-gray-400">PIN 번호</span>
              </div>
              {settingsModal !== "pin" ? (
                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                  <span className="text-[15px] text-gray-800 tracking-widest">••••</span>
                  <button
                    onClick={() => { setSettingsModal("pin"); setSettingsInput(""); setSettingsPinConfirm(""); setSettingsNotice(""); }}
                    className="flex items-center gap-1 text-[13px] text-gray-500 active:text-gray-800 transition-colors"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] text-gray-800 tracking-widest focus:outline-none focus:border-gray-500"
                  />
                  <input
                    type="password"
                    inputMode="numeric"
                    value={settingsPinConfirm}
                    onChange={(e) => setSettingsPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    placeholder="새 PIN 확인"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] text-gray-800 tracking-widest focus:outline-none focus:border-gray-500"
                  />
                  {settingsNotice && (
                    <p className="text-[11px] text-red-400">{settingsNotice}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={closeSettingsModal}
                      className="flex-1 px-3 py-2 bg-gray-100 text-gray-500 text-[13px] rounded-lg active:bg-gray-200 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={handlePinChange}
                      className="flex-1 px-3 py-2 bg-gray-900 text-white text-[13px] rounded-lg active:bg-gray-700 transition-colors"
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
        <div className="bg-white rounded-xl overflow-hidden">
          <p className="text-[12px] text-gray-400 px-4 pt-4 pb-2">푸시 알림</p>
          <div className="divide-y divide-gray-50">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-[14px] text-gray-800">이벤트 알림</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">시장 이벤트·혜택 소식을 받아요</p>
                </div>
              </div>
              <button
                onClick={() => setEventAlarm((v) => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${eventAlarm ? "bg-gray-900" : "bg-gray-200"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${eventAlarm ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-[14px] text-gray-800">새로운 알림</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">댓글·좋아요 등 새 알림을 받아요</p>
                </div>
              </div>
              <button
                onClick={() => setNewAlarm((v) => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${newAlarm ? "bg-gray-900" : "bg-gray-200"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${newAlarm ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          </div>
        </div>

        {/* 고객센터 */}
        <div className="bg-white rounded-xl overflow-hidden">
          <p className="text-[12px] text-gray-400 px-4 pt-4 pb-2">고객센터</p>
          <div className="divide-y divide-gray-50">
            {[
              "1:1 문의하기",
              "자주 묻는 질문",
              "서비스 이용약관",
              "개인정보 처리방침",
            ].map((item) => (
              <button
                key={item}
                className="w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50 transition-colors"
              >
                <span className="text-[14px] text-gray-800">{item}</span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </button>
            ))}
          </div>
        </div>

        {/* 앱 버전 */}
        <div className="bg-white rounded-xl px-4 py-3.5 flex items-center justify-between">
          <span className="text-[14px] text-gray-400">앱 버전</span>
          <span className="text-[14px] text-gray-400">1.0.0</span>
        </div>

      </div>
    </div>
  );
}
