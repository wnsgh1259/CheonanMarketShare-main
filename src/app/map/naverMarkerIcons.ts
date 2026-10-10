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
  opts: { highlighted: boolean; circleSize: number; onSale?: boolean },
): { content: string; size: unknown; anchor: unknown } {
  const cat = asCategoryKey(store.category.split(",")[0]?.trim() || store.category);
  const emoji = CATEGORY_EMOJI[cat] ?? "🏪";
  const pinColor = CATEGORY_COLOR[cat]?.pin ?? "#2563EB";
  const { highlighted, onSale } = opts;
  const circleSize = onSale ? opts.circleSize + 4 : opts.circleSize;
  const name = escapeHtml(store.name);
  const fontPx = Math.max(11, Math.round(circleSize * (onSale ? 0.62 : 0.5)));
  const badge = onSale
    ? `<div style="position:absolute;top:-8px;left:50%;transform:translateX(-50%);background:#111827;color:#fff;font-size:9px;font-weight:800;line-height:1;padding:2px 5px;border-radius:999px;white-space:nowrap;pointer-events:none;letter-spacing:-0.02em;">할인</div>`
    : "";
  const circleHtml = `<div style="position:relative;width:${circleSize}px;height:${circleSize}px;">${badge}<div style="width:${circleSize}px;height:${circleSize}px;border-radius:999px;background:${onSale ? "#FF6B00" : "#fff"};border:2.5px solid ${onSale ? "#fff" : highlighted ? "#111827" : pinColor};box-shadow:${onSale ? "0 2px 10px rgba(255,107,0,.45)" : "0 2px 10px rgba(0,0,0,.2)"};display:flex;align-items:center;justify-content:center;font-size:${fontPx}px;font-weight:${onSale ? 800 : 400};color:${onSale ? "#fff" : "inherit"};line-height:1;">${onSale ? "%" : emoji}</div></div>`;

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
      anchor: new naver.maps.Point(Math.round(W / 2), Math.round(circleSize / 2)),
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
    anchor: new naver.maps.Point(Math.round(W / 2), Math.round(H / 2)),
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
  // 등록 화면 임시 핀은 원 중심이 좌표와 맞춰져 있음. 아래쪽 anchor(W/2,H)면 타일 좌표가 원의 하단에 붙어
  // 실제로는 핀이 북쪽(위)으로 떠 보이므로, 원의 중심과 동일하게 맞춤.
  return {
    content,
    size: new naver.maps.Size(W, H),
    anchor: new naver.maps.Point(Math.round(W / 2), Math.round(H / 2)),
  };
}
