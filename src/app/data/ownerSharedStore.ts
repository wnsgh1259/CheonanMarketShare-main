import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const OWNER_DASHBOARD_STORAGE_KEY = "owner-dashboard-draft-v1";
export const OWNER_EDIT_STORE_KEY = "owner-edit-store-v1";
const OWNER_SHARED_ROW_ID = "global";
const OWNER_SHARED_TABLE = "owner_dashboard_state";

export type SharedOwnerMenu = {
  id: number;
  name: string;
  price: string;
  photoName: string;
};

export type SharedFacility = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  color: string;
  size?: number;
  hours?: string;
  image?: string;
  marketId?: string;
};

export type SharedDraftStore = {
  id: number;
  name: string;
  category: string;
  location: string;
  hours?: string;
  phone: string;
  description: string;
  lat: number;
  lng: number;
  marketId?: string;
  image?: string;
  menus?: SharedOwnerMenu[];
};

export type SharedOwnerDashboardDraft = {
  stores: SharedDraftStore[];
  facilities?: SharedFacility[];
  menus?: SharedOwnerMenu[];
  todayDeal?: string;
  news?: string;
  couponEvent?: string;
  reviewReply?: string;
  inquiryReply?: string;
};

let cachedClient: SupabaseClient | null = null;

function getSupabaseClient() {
  if (cachedClient) return cachedClient;
  const env = (import.meta as any).env ?? {};
  const url = env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anonKey) return null;
  cachedClient = createClient(url, anonKey);
  return cachedClient;
}

export async function loadSharedOwnerDraft(): Promise<SharedOwnerDashboardDraft | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from(OWNER_SHARED_TABLE)
      .select("payload")
      .eq("id", OWNER_SHARED_ROW_ID)
      .maybeSingle();
    if (error || !data?.payload) return null;
    return data.payload as SharedOwnerDashboardDraft;
  } catch {
    return null;
  }
}

export async function saveSharedOwnerDraft(payload: SharedOwnerDashboardDraft) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from(OWNER_SHARED_TABLE).upsert(
      {
        id: OWNER_SHARED_ROW_ID,
        payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  } catch {
    // Ignore network/schema issues to keep local flow working.
  }
}

