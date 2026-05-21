import { useEffect } from "react";
import { Outlet, ScrollRestoration, useLocation } from "react-router";
import { CartProvider } from "./CartContext";
import { AuthProvider } from "../context/AuthContext";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}

export function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <ScrollRestoration />
        <ScrollToTop />
        <div className="min-h-screen bg-[#F7F8FA] max-w-md mx-auto relative" style={{ fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
          <Outlet />
        </div>
      </CartProvider>
    </AuthProvider>
  );
}