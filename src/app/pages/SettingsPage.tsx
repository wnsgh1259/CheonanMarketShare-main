// src/app/pages/SettingsPage.tsx
import { useState } from "react";
import { ChevronLeft, LogOut, ChevronRight, Bell, User, MessageCircle, Pencil, Check } from "lucide-react";
import { Link, useNavigate } from "react-router";

export function SettingsPage() {
  const navigate = useNavigate();

  const [nickname, setNickname] = useState(localStorage.getItem("user_name") || "홍길동");
  const [editingNick, setEditingNick] = useState(false);
  const [nickInput, setNickInput] = useState(nickname);

  const handleSaveNickname = () => {
    const trimmed = nickInput.trim();
    if (!trimmed) return;
    setNickname(trimmed);
    localStorage.setItem("user_name", trimmed);
    setEditingNick(false);
  };

  const [notiEvent, setNotiEvent] = useState(() => localStorage.getItem("noti_event") !== "off");
  const [notiNew,   setNotiNew]   = useState(() => localStorage.getItem("noti_new")   !== "off");

  const toggleNotiEvent = () => {
    const next = !notiEvent;
    setNotiEvent(next);
    localStorage.setItem("noti_event", next ? "on" : "off");
  };
  const toggleNotiNew = () => {
    const next = !notiNew;
    setNotiNew(next);
    localStorage.setItem("noti_new", next ? "on" : "off");
  };

  const handleLogout = () => {
    localStorage.removeItem("user_name");
    navigate("/");
  };

  const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className={`relative w-12 h-7 rounded-full transition-colors duration-200 flex-shrink-0 ${on ? "bg-gray-900" : "bg-gray-200"}`}
    >
      <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${on ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/profile" className="p-1"><ChevronLeft className="w-5 h-5 text-gray-700" /></Link>
          <h1 className="text-[15px] text-gray-900">설정</h1>
          <div className="w-7" />
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">

        {/* 계정 - 닉네임 */}
        <div className="bg-white rounded-xl overflow-hidden">
          <p className="text-[12px] text-gray-400 px-4 pt-4 pb-2">계정</p>
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-[13px] text-gray-500">닉네임</span>
            </div>
            {editingNick ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={nickInput}
                  onChange={(e) => setNickInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveNickname()}
                  maxLength={12}
                  className="flex-1 px-3 py-2 bg-gray-100 rounded-xl text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  placeholder="닉네임 입력"
                />
                <button
                  onClick={handleSaveNickname}
                  disabled={!nickInput.trim()}
                  className="w-9 h-9 bg-gray-900 text-white rounded-xl flex items-center justify-center disabled:opacity-30 active:bg-gray-700 transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => { setEditingNick(false); setNickInput(nickname); }} className="text-[12px] text-gray-400 px-2">
                  취소
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                <span className="text-[15px] text-gray-900 font-medium">{nickname}</span>
                <button onClick={() => { setEditingNick(true); setNickInput(nickname); }} className="flex items-center gap-1 text-[12px] text-gray-400 active:text-gray-600">
                  <Pencil className="w-3.5 h-3.5" />변경
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 푸시 알림 */}
        <div className="bg-white rounded-xl overflow-hidden">
          <p className="text-[12px] text-gray-400 px-4 pt-4 pb-2">푸시 알림</p>
          <div className="px-4 pb-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-[14px] text-gray-800">이벤트 알림</p>
                  <p className="text-[11px] text-gray-400">시장 이벤트·혜택 소식을 받아요</p>
                </div>
              </div>
              <Toggle on={notiEvent} onToggle={toggleNotiEvent} />
            </div>
            <div className="h-px bg-gray-50" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-[14px] text-gray-800">새로운 알림</p>
                  <p className="text-[11px] text-gray-400">댓글·좋아요 등 새 알림을 받아요</p>
                </div>
              </div>
              <Toggle on={notiNew} onToggle={toggleNotiNew} />
            </div>
          </div>
        </div>

        {/* 고객센터 */}
        <div className="bg-white rounded-xl overflow-hidden">
          <p className="text-[12px] text-gray-400 px-4 pt-4 pb-2">고객센터</p>
          <div className="divide-y divide-gray-50">
            {[
              { label: "1:1 문의하기" },
              { label: "자주 묻는 질문" },
              { label: "서비스 이용약관" },
              { label: "개인정보 처리방침" },
            ].map(({ label }) => (
              <button key={label} className="w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <MessageCircle className="w-4 h-4 text-gray-400" />
                  <span className="text-[14px] text-gray-800">{label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </button>
            ))}
          </div>
        </div>

        {/* 앱 버전 */}
        <div className="bg-white rounded-xl px-4 py-3.5 flex items-center justify-between">
          <span className="text-[14px] text-gray-500">앱 버전</span>
          <span className="text-[13px] text-gray-400">1.0.0</span>
        </div>

        {/* 로그아웃 */}
        <div className="bg-white rounded-xl p-4">
          <button
            onClick={handleLogout}
            className="w-full h-11 rounded-xl bg-red-50 text-red-500 text-[14px] flex items-center justify-center gap-2 active:bg-red-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>

      </div>
    </div>
  );
}
