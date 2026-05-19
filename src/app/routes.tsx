import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/RootLayout";
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
import { CommunityPage } from "./pages/CommunityPage";
import { FavoritesPage } from "./pages/FavoritesPage";

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
      { path: "community", Component: CommunityPage },
      { path: "favorites", Component: FavoritesPage },
      { path: "owner/store-registration", Component: StoreRegistrationPage },
      { path: "owner/facility-registration", Component: FacilityRegistrationPage },
      { path: "admin", Component: AdminPage },
      { path: "write", Component: WritePage },
      { path: "post/:id", Component: PostDetailPage },
    ],
  },
]);