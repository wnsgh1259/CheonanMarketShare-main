import { Link, useLocation } from "react-router";
import { Home, MapPin, ShoppingCart, MessageCircle, User } from "lucide-react";
import { useCart } from "./CartContext";

const NAV_ITEMS = [
  { to: "/home", icon: Home, label: "홈" },
  { to: "/map", icon: MapPin, label: "지도" },
  { to: "/cart", icon: ShoppingCart, label: "장바구니" },
  { to: "/chat", icon: MessageCircle, label: "커뮤니티" },
  { to: "/profile", icon: User, label: "마이" },
] as const;

export function BottomNav() {
  const location = useLocation();
  const { totalCount } = useCart();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[140] bg-white border-t border-gray-100 max-w-md mx-auto">
      <div className="flex items-center h-14">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to || (to === "/home" && location.pathname === "/");
          const isCart = to === "/cart";
          return (
            <Link
              key={to}
              to={to}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative ${
                isActive ? "text-[#ff6600]" : "text-gray-400"
              }`}
            >
              <div className="relative">
                <Icon
                  className="w-[22px] h-[22px]"
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                {isCart && totalCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-[#ff6600] text-white text-[10px] min-w-[16px] h-4 rounded-full flex items-center justify-center px-1">
                    {totalCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] ${isActive ? "font-semibold" : ""}`}>{label}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
