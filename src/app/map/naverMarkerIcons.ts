import type { CategoryKey } from "../data/storeData";

const CATEGORY_COLOR: Record<CategoryKey, { pin: string }> = {
  "전체": { pin: "#607D8B" },
  "먹거리·분식": { pin: "#FF9800" },
  "정육·계란": { pin: "#E53935" },
  "채소": { pin: "#43A047" },
  "과일": { pin: "#FB8C00" },
  "채소·과일": { pin: "#7CB342" },
  "수산물": { pin: "#1E88E5" },
  "반찬·건어물": { pin: "#8E24AA" },
  "기타·생활": { pin: "#757575" },
};

const CATEGORY_EMOJI: Record<CategoryKey, string> = {
  "전체": "🏪",
  "먹거리·분식": "🍢",
  "정육·계란": "🥩",
  "채소": "🥦",
  "과일": "🍎",
  "채소·과일": "🥬",
  "수산물": "🐟",
  "반찬·건어물": "🍱",
  "기타·생활": "🛍️",
};

function asCategoryKey(c: string): CategoryKey {
  if (c in CATEGORY_EMOJI) return c as CategoryKey;
  return "기타·생활";
}

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

export function buildStoreMarkerIcon(
  naver: any,
  store: { name: string; category: string },
  opts: { highlighted: boolean; circleSize: number },
): { content: string; size: unknown; anchor: unknown } {
  const cat = asCategoryKey(store.category.split(",")[0]?.trim() || store.category);
  const emoji = CATEGORY_EMOJI[cat] ?? "🏪";
  const pinColor = CATEGORY_COLOR[cat]?.pin ?? "#2563EB";
  const { highlighted, circleSize } = opts;
  const name = escapeHtml(store.name);
  const fontPx = Math.max(10, Math.round(circleSize * 0.5));
  const circleHtml = `<div style="width:${circleSize}px;height:${circleSize}px;border-radius:999px;background:#fff;border:2.5px solid ${highlighted ? "#111827" : pinColor};box-shadow:0 2px 10px rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center;font-size:${fontPx}px;line-height:1;">${emoji}</div>`;

  if (highlighted) {
    const W = Math.max(40, circleSize + 8);
    const gap = 4;
    /* 컨테이너는 원 크기만 — overflow:visible 로 라벨이 아래로 삐져나옴
       라벨에 pointer-events:none 을 주어 주변 핀 클릭을 절대 막지 않음 */
    const content = `<div style="position:relative;width:${W}px;height:${circleSize}px;box-sizing:border-box;overflow:visible;">
      <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);">${circleHtml}</div>
      <div style="position:absolute;top:${circleSize + gap}px;left:50%;transform:translateX(-50%);white-space:nowrap;padding:2px 7px;font-size:11px;font-weight:700;color:#111827;background:rgba(255,255,255,0.95);border-radius:999px;box-shadow:0 1px 5px rgba(0,0,0,.18);pointer-events:none;line-height:1.4;">${name}</div>
    </div>`;
    return {
      content,
      size: new naver.maps.Size(W, circleSize),
      anchor: new naver.maps.Point(Math.round(W / 2), circleSize),
    };
  }

  const W = Math.max(40, circleSize + 8);
  const H = circleSize;
  const content = `<div style="position:relative;width:${W}px;height:${H}px;box-sizing:border-box;">
    <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);">${circleHtml}</div>
  </div>`;
  return {
    content,
    size: new naver.maps.Size(W, H),
    anchor: new naver.maps.Point(Math.round(W / 2), H),
  };
}

const FACILITY_COLOR_EMOJI: Record<string, string> = {
  "#448AFF": "🅿️",
  "#4CAF50": "🪑",
  "#FFC107": "🚻",
  "#FF5252": "ℹ️",
  "#9C27B0": "📦",
  "#FF9800": "🎵",
};

export function buildFacilityMarkerIcon(
  naver: any,
  color: string,
  size: number,
): { content: string; size: unknown; anchor: unknown } {
  const emoji = FACILITY_COLOR_EMOJI[color] ?? "📍";
  const pinSize = Math.max(size, 26); // 이모지 표시를 위해 최소 26px
  const fontPx = Math.round(pinSize * 0.52);
  const W = Math.max(40, pinSize + 8);
  const H = pinSize;
  const content = `<div style="position:relative;width:${W}px;height:${H}px;box-sizing:border-box;">
    <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:${pinSize}px;height:${pinSize}px;border-radius:999px;background:${color};border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.22);display:flex;align-items:center;justify-content:center;font-size:${fontPx}px;line-height:1;">${emoji}</div>
  </div>`;
  return {
    content,
    size: new naver.maps.Size(W, H),
    anchor: new naver.maps.Point(Math.round(W / 2), H),
  };
}
