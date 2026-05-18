import { useState } from "react";
import { ChevronLeft, ChevronRight, LogOut, User, Bell } from "lucide-react";
import { Link, useNavigate } from "react-router";

export function SettingsPage() {
  const navigate = useNavigate();

  const [nickname, setNickname] = useState(
    () => localStorage.getItem("user_name") || "홍길동"
  );
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(nickname);

  const [eventAlarm, setEventAlarm] = useState(false);
  const [newAlarm, setNewAlarm] = useState(false);

  const handleSaveNickname = () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed) return;
    setNickname(trimmed);
    localStorage.setItem("user_name", trimmed);
    setIsEditingNickname(false);
  };

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* 헤더 */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/profile" className="p-1">
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="text-[15px] text-gray-900">설정</h1>
          <div className="w-7" />
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">

        {/* 계정 */}
        <div className="bg-white rounded-xl overflow-hidden">
          <p className="text-[12px] text-gray-400 px-4 pt-4 pb-2">계정</p>
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-[12px] text-gray-400">닉네임</span>
            </div>
            {isEditingNickname ? (
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

        {/* 로그아웃 */}
        <button
          onClick={handleLogout}
          className="w-full bg-white rounded-xl px-4 py-3.5 flex items-center justify-center gap-2 text-red-500 active:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-[14px]">로그아웃</span>
        </button>
      </div>
    </div>
  );
}
