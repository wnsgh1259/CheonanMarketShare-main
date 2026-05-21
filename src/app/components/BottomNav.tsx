import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Home, MapPin, ShoppingCart, MessageCircle, User, Ticket, Receipt } from "lucide-react";
import { useCart } from "./CartContext";

export const OWNER_MODE_KEY = "owner_mode";
export const OWNER_STORE_MGMT_RETURN_KEY = "owner_store_mgmt_return";

export function setOwnerMode(active: boolean) {
  if (active) localStorage.setItem(OWNER_MODE_KEY, "true");
  else localStorage.removeItem(OWNER_MODE_KEY);
  window.dispatchEvent(new Event("owner_mode_changed"));
}

export function OwnerBackToStoreButton({ className = "" }: { className?: string }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => {
        setOwnerMode(false);
        const returnPath =
          sessionStorage.getItem(OWNER_STORE_MGMT_RETURN_KEY) || "/owner/store-registration";
        navigate(returnPath, { replace: true });
      }}
      className={`w-10 h-10 flex items-center justify-center ${className}`}
      aria-label="상점 관리로 돌아가기"
    >
      <Home className="w-[20px] h-[20px] text-gray-600" />
    </button>
  );
}

const REGULAR_NAV = [
  { to: "/home", icon: Home, label: "홈" },
  { to: "/map", icon: MapPin, label: "지도" },
  { to: "/cart", icon: ShoppingCart, label: "장바구니" },
  { to: "/chat", icon: MessageCircle, label: "커뮤니티" },
  { to: "/profile", icon: User, label: "마이" },
];

const OWNER_NAV = [
  { to: "/home", icon: Home, label: "홈", exitOwnerMode: false },
  { to: "/map", icon: MapPin, label: "지도", exitOwnerMode: false },
  { to: "/chat", icon: MessageCircle, label: "커뮤니티", exitOwnerMode: false },
  { to: "/coupon-use", icon: Ticket, label: "쿠폰사용", exitOwnerMode: false },
  { to: "/settlement", icon: Receipt, label: "정산", exitOwnerMode: false },
];

export function BottomNav() {
  const location = useLocation();
  const { totalCount } = useCart();
  const [ownerMode, setOwnerModeState] = useState(() => localStorage.getItem(OWNER_MODE_KEY) === "true");

  useEffect(() => {
    const handler = () => setOwnerModeState(localStorage.getItem(OWNER_MODE_KEY) === "true");
    window.addEventListener("owner_mode_changed", handler);
    return () => window.removeEventListener("owner_mode_changed", handler);
  }, []);

  const navItems = ownerMode
    ? OWNER_NAV
    : REGULAR_NAV.map((item) => ({ ...item, exitOwnerMode: false }));

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[140] bg-white border-t border-gray-200/60 max-w-md mx-auto">
      <div className="flex items-center h-14">
        {navItems.map(({ to, icon: Icon, label, exitOwnerMode }) => {
          const isActive = location.pathname === to || (to === "/home" && location.pathname === "/");
          const isCart = to === "/cart";
          return (
            <Link
              key={to}
              to={to}
              onClick={exitOwnerMode ? () => setOwnerMode(false) : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative ${
                isActive ? "text-gray-900" : "text-gray-400"
              }`}
            >
              <div className="relative">
                <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.2 : 1.8} />
                {isCart && totalCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-[#0EA5E9] text-white text-[10px] min-w-[16px] h-4 rounded-full flex items-center justify-center px-1">
                    {totalCount}
                  </span>
                )}
              </div>
              <span className="text-[10px]">{label}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
