import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/RootLayout";
import { RequireRole } from "./components/RequireRole";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { MapPage } from "./pages/MapPage";
import { StoreDetailPage } from "./pages/StoreDetailPage";
import { CartPage } from "./pages/CartPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ChatPage } from "./pages/ChatPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StoreRegistrationPage } from "./pages/StoreRegistrationPage";
import { FacilityRegistrationPage } from "./pages/FacilityRegistrationPage";
import { AdminPage } from "./pages/AdminPage";
import { WritePage } from "./pages/WritePage";
import { PostDetailPage } from "./pages/PostDetailPage";
import { CouponUsePage } from "./pages/CouponUsePage";
import { SettlementPage } from "./pages/SettlementPage";
import { RegisterPage } from "./pages/RegisterPage";

function AdminRoute() {
  return (
    <RequireRole roles={["admin"]}>
      <AdminPage />
    </RequireRole>
  );
}

function OwnerStoreRoute() {
  return (
    <RequireRole roles={["owner", "admin"]}>
      <StoreRegistrationPage />
    </RequireRole>
  );
}

function OwnerFacilityRoute() {
  return (
    <RequireRole roles={["owner", "admin"]}>
      <FacilityRegistrationPage />
    </RequireRole>
  );
}

function OwnerSettlementRoute() {
  return (
    <RequireRole roles={["owner", "admin"]} ownerModeFallback="/home">
      <SettlementPage />
    </RequireRole>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: LoginPage },
      { path: "home", Component: HomePage },
      { path: "map", Component: MapPage },
      { path: "store/:id", Component: StoreDetailPage },
      { path: "cart", Component: CartPage },
      { path: "chat", Component: ChatPage },
      { path: "profile", Component: ProfilePage },
      { path: "settings", Component: SettingsPage },
      { path: "owner/store-registration", Component: OwnerStoreRoute },
      { path: "owner/facility-registration", Component: OwnerFacilityRoute },
      { path: "admin", Component: AdminRoute },
      { path: "write", Component: WritePage },
      { path: "post/:id", Component: PostDetailPage },
      { path: "coupon-use", Component: CouponUsePage },
      { path: "settlement", Component: OwnerSettlementRoute },
      { path: "register", Component: RegisterPage },
    ],
  },
]);
