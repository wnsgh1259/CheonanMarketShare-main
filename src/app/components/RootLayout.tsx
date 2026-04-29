import { Outlet } from "react-router";
import { CartProvider } from "./CartContext";

export function RootLayout() {
  return (
    <CartProvider>
      <div className="min-h-screen bg-[#F7F8FA] max-w-md mx-auto relative" style={{ fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
        <Outlet />
      </div>
    </CartProvider>
  );
}