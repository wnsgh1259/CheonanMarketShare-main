import { useState } from "react";
import { useNavigate } from "react-router";
import { X, Bell, ChevronDown, ChevronRight } from "lucide-react";

interface SideMenuProps {
  open: boolean;
  onClose: () => void;
}

export function SideMenu({ open, onClose }: SideMenuProps) {
  const navigate = useNavigate();
  const [marketOpen, setMarketOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [festivalOpen, setFestivalOpen] = useState(false);

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[200] bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 bottom-0 z-[201] w-[300px] max-w-[85vw] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-12 pb-5 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[18px] font-bold text-gray-900">유승연 님</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex gap-4 text-center mt-2">
              <div>
                <p className="text-[20px] font-bold text-gray-900">0</p>
                <p className="text-[11px] text-gray-400">쿠폰</p>
              </div>
              <div className="w-px bg-gray-100" />
              <div>
                <p className="text-[20px] font-bold text-[#FF6B2B]">4</p>
                <p className="text-[11px] text-gray-400">즐겨찾는 가게</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button className="relative p-1">
              <Bell className="w-5 h-5 text-gray-500" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-[#FF6B2B] rounded-full" />
            </button>
            <button onClick={onClose} className="p-1">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto">
          <NavItem label="홈" onClick={() => go("/home")} />
          <NavItem label="지도/길찾기" onClick={() => go("/map")} />

          {/* 시장소개 accordion */}
          <div>
            <button
              className="w-full flex items-center justify-between px-5 py-4 text-[16px] text-gray-800 active:bg-gray-50"
              onClick={() => setMarketOpen((v) => !v)}
            >
              시장소개
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${marketOpen ? "rotate-180" : ""}`} />
            </button>
            {marketOpen && (
              <div className="bg-gray-50">
                <SubItem label="연혁" onClick={() => go("/community")} />
                <SubItem label="상인회" onClick={() => go("/community")} />
                <SubItem label="오시는 길" onClick={() => go("/map")} />
              </div>
            )}
          </div>

          {/* 관광정보 accordion */}
          <div>
            <button
              className="w-full flex items-center justify-between px-5 py-4 text-[16px] text-gray-800 active:bg-gray-50"
              onClick={() => setTourOpen((v) => !v)}
            >
              관광정보
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${tourOpen ? "rotate-180" : ""}`} />
            </button>
            {tourOpen && (
              <div className="bg-gray-50">
                <SubItem label="주변 명소" onClick={() => go("/community")} />
                <SubItem label="추천 코스" onClick={() => go("/community")} />
              </div>
            )}
          </div>

          {/* 축제 아카이브 accordion */}
          <div>
            <button
              className="w-full flex items-center justify-between px-5 py-4 text-[16px] text-gray-800 active:bg-gray-50"
              onClick={() => setFestivalOpen((v) => !v)}
            >
              축제 아카이브
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${festivalOpen ? "rotate-180" : ""}`} />
            </button>
            {festivalOpen && (
              <div className="bg-gray-50">
                <SubItem label="2024 떡볶이 페스타" onClick={() => go("/community")} />
                <SubItem label="2023 전통시장 축제" onClick={() => go("/community")} />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-4 flex gap-6">
          <button
            onClick={() => go("/chat")}
            className="text-[13px] text-gray-400"
          >
            고객센터
          </button>
          <button
            onClick={() => go("/settings")}
            className="text-[13px] text-gray-400"
          >
            설정
          </button>
        </div>
      </div>
    </>
  );
}

function NavItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      className="w-full text-left px-5 py-4 text-[16px] text-gray-800 border-b border-gray-50 active:bg-gray-50"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function SubItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      className="w-full text-left px-8 py-3 text-[14px] text-gray-500 active:bg-gray-100"
      onClick={onClick}
    >
      {label}
    </button>
  );
}
