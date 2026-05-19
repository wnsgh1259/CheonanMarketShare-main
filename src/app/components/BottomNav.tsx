import { Link, useLocation } from "react-router";
import { Home, MapPin, Newspaper, Heart } from "lucide-react";

const NAV_ITEMS = [
  { to: "/home", icon: Home, label: "홈" },
  { to: "/map", icon: MapPin, label: "지도" },
  { to: "/community", icon: Newspaper, label: "대조소식" },
  { to: "/favorites", icon: Heart, label: "즐겨찾기" },
] as const;

export function BottomNav() {
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[140] bg-white border-t border-gray-100 max-w-md mx-auto">
      <div className="flex items-center h-14">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const isActive =
            location.pathname === to ||
            (to === "/home" && location.pathname === "/");
          return (
            <Link
              key={to}
              to={to}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 ${
                isActive ? "text-[#FF6B2B]" : "text-gray-400"
              }`}
            >
              <Icon
                className="w-[22px] h-[22px]"
                strokeWidth={isActive ? 2.2 : 1.8}
                fill={isActive && to === "/favorites" ? "#FF6B2B" : "none"}
              />
              <span className="text-[10px]">{label}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
