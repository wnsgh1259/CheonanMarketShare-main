// src/app/data/userStore.ts
export type TitleId =
  | "newcomer"
  | "explorer"
  | "foodie"
  | "walker"
  | "fish_cat"
  | "market_regular"
  | "review_king"
  | "post_master";

export interface TitleItem {
  id: TitleId;
  emoji: string;
  name: string;
  description: string;
  condition: string;
  unlockAt: number;
  rare?: boolean;
}

export const TITLE_LIST: TitleItem[] = [
  { id: "newcomer",       emoji: "🌱", name: "새내기 탐방객",        description: "시장에 첫 발을 내딛었어요",    condition: "앱 가입 시 자동 획득",        unlockAt: 0 },
  { id: "explorer",       emoji: "🏪", name: "전통시장 탐험가",       description: "시장 곳곳을 누볐어요",         condition: "스탬프 1개 이상 수집",        unlockAt: 1 },
  { id: "foodie",         emoji: "🍜", name: "먹거리 골목 마스터",    description: "먹거리라면 나를 찾아요",       condition: "스탬프 2개 이상 수집",        unlockAt: 2 },
  { id: "walker",         emoji: "👟", name: "만보기 챌린저",         description: "걷는 것도 즐거워요",           condition: "스탬프 3개 이상 수집",        unlockAt: 3 },
  { id: "fish_cat",       emoji: "🐱", name: "생선가게 단골 고양이",  description: "생선가게 단골이 됐어요",        condition: "스탬프 4개 이상 수집",        unlockAt: 4, rare: true },
  { id: "market_regular", emoji: "🛒", name: "시장 단골손님",         description: "시장을 사랑하는 단골",         condition: "스탬프 6개 이상 수집",        unlockAt: 6 },
  { id: "review_king",    emoji: "⭐", name: "리뷰 왕",               description: "리뷰로 이웃을 도왔어요",       condition: "스탬프 8개 이상 수집",        unlockAt: 8 },
  { id: "post_master",    emoji: "📝", name: "게시판 마스터",         description: "커뮤니티의 핵심 멤버",         condition: "스탬프 10개 이상 수집",       unlockAt: 10 },
];

const ACTIVE_TITLE_KEY = "user_active_title";

export function isUnlocked(title: TitleItem, stampCount: number): boolean {
  return stampCount >= title.unlockAt;
}

export function getTitlesWithStatus(stampCount: number): (TitleItem & { unlocked: boolean })[] {
  return TITLE_LIST.map((t) => ({ ...t, unlocked: isUnlocked(t, stampCount) }));
}

export function getActiveTitle(stampCount: number): TitleItem {
  const saved = localStorage.getItem(ACTIVE_TITLE_KEY) as TitleId | null;
  if (saved) {
    const found = TITLE_LIST.find((t) => t.id === saved);
    if (found && isUnlocked(found, stampCount)) return found;
  }
  const unlocked = TITLE_LIST.filter((t) => isUnlocked(t, stampCount));
  return unlocked[unlocked.length - 1] ?? TITLE_LIST[0];
}

export function setActiveTitle(id: TitleId): void {
  localStorage.setItem(ACTIVE_TITLE_KEY, id);
  window.dispatchEvent(new Event("user_title_changed"));
}

export function getActiveTitleEmoji(stampCount: number): string {
  return getActiveTitle(stampCount).emoji;
}
