import { useEffect, useState } from "react";
import { ExternalLink, ImagePlus, X } from "lucide-react";
import {
  refreshSnsPromos,
  snsPromosForStore,
  submitSnsPromo,
  type SnsPromoRequest,
  type SnsPromoStatus,
} from "../data/snsPromo";
import { compressImageFile } from "../utils/imageCompress";

const PAGE_SIZE = 5;
const MAX_IMAGES = 3;

const FILTERS: { status: SnsPromoStatus; label: string; tone: string; ring: string }[] = [
  { status: "pending", label: "확인 중", tone: "text-amber-600", ring: "border-amber-300 bg-amber-50/60" },
  { status: "posted", label: "게시 완료", tone: "text-emerald-600", ring: "border-emerald-300 bg-emerald-50/60" },
  { status: "rejected", label: "거절", tone: "text-rose-500", ring: "border-rose-300 bg-rose-50/60" },
];

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function safeLink(link: string) {
  return /^https?:\/\//i.test(link) ? link : `https://${link}`;
}

export function OwnerSnsPromoPanel({ storeId, storeName }: { storeId: number | null; storeName: string }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);
  const [all, setAll] = useState<SnsPromoRequest[]>([]);
  const [filter, setFilter] = useState<SnsPromoStatus>("pending");
  const [page, setPage] = useState(0);

  useEffect(() => {
    let alive = true;
    void refreshSnsPromos().then((items) => {
      if (alive) setAll(items);
    });
    return () => {
      alive = false;
    };
  }, []);

  const mine = snsPromosForStore(all, storeId, storeName);
  const filtered = mine.filter((item) => item.status === filter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const addImages = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_IMAGES - images.length;
    const picked = Array.from(files).slice(0, room);
    const compressed = await Promise.all(
      picked.map((file) => compressImageFile(file, { maxWidth: 720, maxHeight: 720, quality: 0.62 })),
    );
    setImages((prev) => [...prev, ...compressed].slice(0, MAX_IMAGES));
    setNotice("");
  };

  const handleSubmit = async () => {
    if (!storeName) {
      setNotice("가게 정보를 먼저 저장해 주세요.");
      return;
    }
    if (!title.trim() || !content.trim()) {
      setNotice("홍보 문구와 홍보 내용을 입력해 주세요.");
      return;
    }
    setSending(true);
    await submitSnsPromo({ storeId, storeName, title: title.trim(), content: content.trim(), images });
    setAll(await refreshSnsPromos());
    setSending(false);
    setTitle("");
    setContent("");
    setImages([]);
    setFilter("pending");
    setPage(0);
    setNotice("홍보 신청을 보냈어요. 관리자가 천안시장 SNS에 올려드려요.");
  };

  return (
    <div className="space-y-3">
      <div className="space-y-3 rounded-xl bg-white p-4">
        <div>
          <h2 className="text-[14px] text-gray-900">SNS 홍보 신청</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-gray-400">
            올리고 싶은 내용을 적어 주시면 관리자가 대신 천안시장 SNS에 게시해 드려요.
          </p>
        </div>
        <label className="block text-[11px] text-gray-400">
          홍보 문구
          <input
            value={title}
            onChange={(event) => { setTitle(event.target.value); setNotice(""); }}
            placeholder="예: 오늘만 호떡 2개 구매 시 1개 더!"
            maxLength={60}
            className="mt-1 h-11 w-full rounded-xl bg-gray-50 px-3 text-[13px] text-gray-800 outline-none"
          />
        </label>
        <label className="block text-[11px] text-gray-400">
          홍보하고 싶은 내용
          <textarea
            value={content}
            onChange={(event) => { setContent(event.target.value); setNotice(""); }}
            placeholder="가게 소개, 신메뉴, 행사 일정 등 자유롭게 적어 주세요."
            maxLength={600}
            className="mt-1 h-28 w-full rounded-xl bg-gray-50 p-3 text-[13px] text-gray-800 outline-none"
          />
        </label>
        <div>
          <p className="text-[11px] text-gray-400">사진 (최대 {MAX_IMAGES}장)</p>
          <div className="mt-1 flex gap-2">
            {images.map((image, index) => (
              <div key={index} className="relative h-20 w-20 overflow-hidden rounded-xl bg-gray-100">
                <img src={image} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                  aria-label="사진 삭제"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {images.length < MAX_IMAGES && (
              <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 text-gray-400">
                <ImagePlus className="h-5 w-5" />
                <span className="mt-1 text-[10px]">추가</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => { void addImages(event.target.files); event.target.value = ""; }} />
              </label>
            )}
          </div>
        </div>
        {notice && <p className="text-[12px] text-gray-500">{notice}</p>}
        <button
          type="button"
          disabled={sending}
          onClick={() => void handleSubmit()}
          className="h-11 w-full rounded-xl bg-gray-900 text-[13px] font-semibold text-white disabled:opacity-50"
        >
          {sending ? "보내는 중..." : "홍보 신청하기"}
        </button>
      </div>

      <div className="space-y-3 rounded-xl bg-white p-4">
        <div className="grid grid-cols-3 gap-2">
          {FILTERS.map((entry) => (
            <button
              key={entry.status}
              type="button"
              onClick={() => { setFilter(entry.status); setPage(0); }}
              className={`rounded-xl border py-2.5 text-center transition-colors ${filter === entry.status ? entry.ring : "border-gray-100 bg-white"}`}
            >
              <p className={`text-[16px] font-bold leading-none ${entry.tone}`}>{mine.filter((item) => item.status === entry.status).length}</p>
              <p className={`mt-1 text-[10px] ${filter === entry.status ? "font-semibold text-gray-700" : "text-gray-400"}`}>{entry.label}</p>
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-gray-400">
            {filter === "pending" ? "확인 중인 신청이 없어요." : filter === "posted" ? "게시된 홍보가 없어요." : "거절된 신청이 없어요."}
          </p>
        ) : (
          <div className="space-y-2">
            {visible.map((item) => (
              <div key={item.id} className="rounded-2xl border border-gray-100 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-gray-800">{item.title}</p>
                  <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    item.status === "posted" ? "bg-emerald-50 text-emerald-600" : item.status === "rejected" ? "bg-rose-50 text-rose-500" : "bg-amber-50 text-amber-600"
                  }`}>
                    {item.status === "posted" ? "게시 완료" : item.status === "rejected" ? "거절" : "확인 중"}
                  </span>
                </div>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[12px] leading-relaxed text-gray-500">{item.content}</p>
                {item.images.length > 0 && (
                  <div className="mt-2 flex gap-1.5">
                    {item.images.map((image, index) => (
                      <img key={index} src={image} alt="" className="h-14 w-14 rounded-lg object-cover" />
                    ))}
                  </div>
                )}
                <p className="mt-2 text-[10px] text-gray-400">신청 {formatDate(item.createdAt)}</p>
                {item.status === "posted" && item.link && (
                  <a
                    href={safeLink(item.link)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-[12px] font-medium text-emerald-700"
                  >
                    <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{item.link}</span>
                  </a>
                )}
                {item.status === "rejected" && (
                  <div className="mt-2 rounded-xl bg-rose-50 px-3 py-2">
                    <p className="text-[10px] font-semibold text-rose-500">거절 사유</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-gray-700">{item.rejectReason || "사유가 입력되지 않았어요."}</p>
                  </div>
                )}
              </div>
            ))}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={currentPage === 0}
                  onClick={() => setPage(currentPage - 1)}
                  className="h-9 rounded-full border border-gray-200 bg-white px-4 text-[12px] font-medium text-gray-600 disabled:opacity-40"
                >
                  ‹ 이전
                </button>
                <span className="text-[12px] text-gray-500">{currentPage + 1} / {totalPages}</span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setPage(currentPage + 1)}
                  className="h-9 rounded-full border border-gray-200 bg-white px-4 text-[12px] font-medium text-gray-600 disabled:opacity-40"
                >
                  다음 ›
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
