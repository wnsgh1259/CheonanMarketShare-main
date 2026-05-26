export type AdminPanelView = "market" | "applications" | "members";
export type MembersListTab = "customers" | "stores";
export type AdminManagementTab = "store" | "facility";
export type AdminMarketId = "jungang" | "byeongcheon" | "seonghwan";

export type AdminReturnState = {
  market: AdminMarketId;
  adminPanelView: AdminPanelView;
  membersListTab: MembersListTab;
  managementTab: AdminManagementTab;
  scrollTargetId?: string;
};

export const ADMIN_RETURN_STATE_KEY = "admin_return_state";

export function saveAdminReturnState(state: AdminReturnState) {
  sessionStorage.setItem(ADMIN_RETURN_STATE_KEY, JSON.stringify(state));
}

export function peekAdminReturnState(): AdminReturnState | null {
  const raw = sessionStorage.getItem(ADMIN_RETURN_STATE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminReturnState;
  } catch {
    return null;
  }
}

export function consumeAdminReturnState(): AdminReturnState | null {
  const state = peekAdminReturnState();
  if (!state) return null;
  sessionStorage.removeItem(ADMIN_RETURN_STATE_KEY);
  return state;
}

export function buildAdminReturnUrl(market: AdminMarketId) {
  return `/admin?market=${market}`;
}
