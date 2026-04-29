import { ChevronLeft, LogOut } from "lucide-react";
import { Link } from "react-router";

export function SettingsPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FA]">
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
        <div className="bg-white rounded-xl p-4">
          <p className="text-[12px] text-gray-400 mb-3">계정</p>
          <Link
            to="/"
            className="w-full h-11 rounded-lg bg-red-50 text-red-600 text-[14px] flex items-center justify-center gap-2 active:bg-red-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </Link>
        </div>
      </div>
    </div>
  );
}
