import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight, Clock, MapPin, Tag } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { loadOwnerCatalog, refreshOwnerCatalogFromRemote } from "../data/ownerStoreData";
import { formatDealClock, listLiveDeals, type LiveDealView } from "../data/storePromotion";

type MarketId = "jungang" | "byeongcheon" | "seonghwan";

const MARKETS: Array<{ id: MarketId; name: string }> = [
  { id: "jungang", name: "중앙시장" },
  { id: "byeongcheon", name: "역전시장" },
  { id: "seonghwan", name: "성환이화시장" },
];

function isMarketId(value: string | null): value is MarketId {
  return value === "jungang" || value === "byeongcheon" || value === "seonghwan";
}

export function DealsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const marketParam = searchParams.get("market");
  const selectedMarket: MarketId = isMarketId(marketParam) ? marketParam : "jungang";
  const [now, setNow] = useState(() => Date.now());
  const [deals, setDeals] = useState<LiveDealView[]>([]);

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const remote = await refreshOwnerCatalogFromRemote();
      if (cancelled) return;
      const stores = remote?.stores ?? loadOwnerCatalog().stores ?? [];
      setDeals(listLiveDeals(stores, Date.now()));
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [now]);

  const visible = deals.filter((deal) => deal.marketId === selectedMarket);
  const marketName = MARKETS.find((market) => market.id === selectedMarket)?.name ?? "시장";

  return (
    <div className="min-h-screen bg-[#F8F7F3] pb-24">
      <div className="sticky top-0 z-10 border-b border-[#EEEAE4] bg-white">
        <div className="flex items-center gap-2 px-4 py-3">
          <button type="button" onClick={() => navigate("/home")} className="p-1" aria-label="홈으로">
            <ChevronLeft className="h-5 w-5 text-[#5A453B]" />
          </button>
          <h1 className="text-[15px] font-semibold text-[#46352C]">할인·이벤트</h1>
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 pb-3">
          {MARKETS.map((market) => {
            const count = deals.filter((deal) => deal.marketId === market.id).length;
            const active = market.id === selectedMarket;
            return (
              <button
                key={market.id}
                type="button"
                onClick={() => setSearchParams({ market: market.id })}
                className={`h-9 shrink-0 rounded-full px-3 text-[13px] ${
                  active ? "bg-[#5B4335] text-white" : "bg-[#F5F0E7] text-[#6B5142]"
                }`}
              >
                {market.name}
                <span className={`ml-1 ${active ? "text-[#E8C7A5]" : "text-[#A9652D]"}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        <div className="rounded-xl bg-[#5B4335] px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-[#E8B875]" />
            <p className="text-[14px]">지금 {marketName}에서 진행 중</p>
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-white/75">
            {visible.length > 0
              ? `${visible.length}곳이 할인·이벤트를 켰습니다. 지도에서는 주황색 핀으로 보입니다.`
              : "진행 중인 할인·이벤트가 없습니다. 사장님이 시간을 켜면 이곳에 모입니다."}
          </p>
        </div>

        {visible.length === 0 ? (
          <div className="rounded-xl border border-[#EDE5D8] bg-white px-4 py-10 text-center">
            <p className="text-[14px] font-medium text-[#46352C]">지금은 열린 할인·이벤트가 없어요</p>
            <p className="mt-1 text-[12px] text-[#9A897F]">다른 시장을 선택하거나 잠시 후 다시 확인해 주세요.</p>
          </div>
        ) : (
          visible.map((deal) => (
            <Link
              key={deal.storeId}
              to={`/map?market=${deal.marketId ?? selectedMarket}&store=${encodeURIComponent(deal.storeName)}`}
              className="block rounded-xl border border-[#EDE5D8] bg-white p-4 shadow-sm active:bg-[#FBFAF7]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-[#A9652D] px-1.5 py-0.5 text-[10px] font-semibold text-white">할인</span>
                    <h2 className="truncate text-[15px] font-semibold text-[#46352C]">{deal.storeName}</h2>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-[12px] text-[#8A776B]">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{deal.location || deal.category || marketName}</span>
                  </p>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#B9AA9C]" />
              </div>
              <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-[#6B5142]">{deal.note}</p>
              <p className="mt-2 flex items-center gap-1 text-[12px] text-[#A9652D]">
                <Clock className="h-3.5 w-3.5" />
                {formatDealClock(deal.startAt)} – {formatDealClock(deal.endAt)}
              </p>
              {deal.items.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {deal.items.map((item) => (
                    <div key={`${deal.storeId}-${item.name}`} className="flex items-center justify-between rounded-lg bg-[#F9F5E9] px-3 py-2">
                      <span className="text-[13px] text-[#46352C]">{item.name}</span>
                      <span className="text-[12px]">
                        <span className="mr-1 text-[#9A897F] line-through">{item.originalPrice.toLocaleString()}원</span>
                        <span className="font-semibold text-[#A9652D]">{item.price.toLocaleString()}원</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Link>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  );
}
