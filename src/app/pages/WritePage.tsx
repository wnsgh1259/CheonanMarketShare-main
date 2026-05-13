import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import {
  X, ChevronDown, Image, MapPin, BarChart2, Hash, Check, Plus, Trash2,
} from "lucide-react";
import { addPost } from "../data/postStore";
import type { Category, MarketKey } from "../data/postStore";

// ─────────────────────────────────────────
// 임시로 사장님 어카운트.. 나중에 합치면서 교체!
const IS_SAJANGNIM = false;
// ─────────────────────────────────────────

const CATEGORIES: Category[] = ["사장님", "질문", "정보", "후기"];

const MARKET_LABELS: Record<MarketKey, string> = {
  jungang:     "천안중앙시장",
  byeongcheon: "천안역전시장",
  seonghwan:   "성환전통시장",
};

const CATEGORY_STYLE: Record<Category, string> = {
  사장님: "bg-gray-900 text-white",
  질문:   "bg-amber-100 text-amber-700",
  정보:   "bg-emerald-100 text-emerald-700",
  후기:   "bg-purple-100 text-purple-700",
};

export function WritePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSajangnim] = useState(IS_SAJANGNIM);

  const [category, setCategory]                   = useState<Category | null>(null);
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [market, setMarket]                       = useState<MarketKey>("jungang");
  const [showMarketSheet, setShowMarketSheet]     = useState(false);
  const [title, setTitle]                         = useState("");
  const [body, setBody]                           = useState("");
  const [images, setImages]                       = useState<string[]>([]);
  const [tag, setTag]                             = useState("");
  const [tags, setTags]                           = useState<string[]>([]);
  const [showTagInput, setShowTagInput]           = useState(false);
  const [showPoll, setShowPoll]                   = useState(false);
  const [pollOptions, setPollOptions]             = useState<string[]>(["", ""]);

  const canSubmit = title.trim().length > 0 && category !== null;

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) =>
        setImages((prev) => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === " ") && tag.trim()) {
      e.preventDefault();
      const cleaned = tag.trim().replace(/^#/, "");
      if (cleaned && !tags.includes(cleaned))
        setTags((prev) => [...prev, cleaned]);
      setTag("");
    }
    if (e.key === "Backspace" && tag === "" && tags.length > 0)
      setTags((prev) => prev.slice(0, -1));
  };

  const updatePollOption = (i: number, val: string) =>
    setPollOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)));
  const addPollOption = () => {
    if (pollOptions.length < 5) setPollOptions((prev) => [...prev, ""]);
  };
  const removePollOption = (i: number) => {
    if (pollOptions.length > 2)
      setPollOptions((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    const userName = localStorage.getItem("user_name") || "익명";
    addPost({
      id: Date.now(),
      category: category!,
      market,
      title: title.trim(),
      preview: body.trim().slice(0, 60) + (body.length > 60 ? "..." : ""),
      body: body.trim(),
      author: isSajangnim ? "사장님" : userName,
      time: "방금",
      views: 0,
      likes: 0,
      comments: 0,
      image: images[0],
      tags,
      pollOptions: showPoll ? pollOptions.filter((o) => o.trim()) : undefined,
      commentList: [],
    });
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto relative">

      {/* ── 헤더 ── */}
      <div className="sticky top-0 bg-white z-20 border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1">
            <X className="w-5 h-5 text-gray-700" />
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`text-[15px] font-medium transition-colors ${
              canSubmit ? "text-gray-900" : "text-gray-300"
            }`}
          >
            완료
          </button>
        </div>

        {/* 주제 / 시장 */}
        <div className="flex items-center px-4 pb-3 gap-2">
          {/* 주제 선택 */}
          <button
            onClick={() => setShowCategorySheet(true)}
            className="flex items-center gap-1"
          >
            {category ? (
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${CATEGORY_STYLE[category]}`}>
                {category}
              </span>
            ) : (
              <span className="text-[14px] text-gray-500">주제를 선택해주세요.</span>
            )}
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {/* 시장 선택 */}
          <button
            onClick={() => setShowMarketSheet(true)}
            className="flex items-center gap-1 ml-auto"
          >
            <span className="text-[12px] text-gray-500">{MARKET_LABELS[market]}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="h-px bg-gray-100 mx-4" />

      {/* ── 작성 영역 ── */}
      <div className="flex-1 px-4 pt-5 pb-36">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요."
          maxLength={60}
          className="w-full text-[18px] font-semibold text-gray-900 placeholder:text-gray-300 focus:outline-none mb-3"
        />

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`시장 이웃과 이야기를 나눠보세요.\n#맛집 #세일 #이벤트...`}
          rows={8}
          className="w-full text-[15px] text-gray-700 placeholder:text-gray-300 focus:outline-none resize-none leading-relaxed"
        />

        {/* 이미지 미리보기 */}
        {images.length > 0 && (
          <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-hide">
            {images.map((src, i) => (
              <div key={i} className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-gray-100">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute top-0.5 right-0.5 w-4 h-4 bg-gray-900 bg-opacity-60 rounded-full flex items-center justify-center"
                >
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
              </div>
            ))}
            {images.length < 10 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-shrink-0 w-20 h-20 rounded-xl border border-dashed border-gray-200 flex items-center justify-center"
              >
                <Image className="w-5 h-5 text-gray-300" />
              </button>
            )}
          </div>
        )}

        {/* 투표 UI */}
        {showPoll && (
          <div className="mt-4 border border-gray-100 rounded-2xl px-4 py-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-semibold text-gray-700">투표 항목</span>
              <button onClick={() => setShowPoll(false)}>
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="space-y-2">
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[12px] text-gray-400 w-4">{i + 1}</span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updatePollOption(i, e.target.value)}
                    placeholder={`항목 ${i + 1}`}
                    maxLength={30}
                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-[13px] text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-gray-400"
                  />
                  {pollOptions.length > 2 && (
                    <button onClick={() => removePollOption(i)}>
                      <Trash2 className="w-4 h-4 text-gray-300" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {pollOptions.length < 5 && (
              <button
                onClick={addPollOption}
                className="mt-2 flex items-center gap-1.5 text-[12px] text-gray-400 active:text-gray-600"
              >
                <Plus className="w-3.5 h-3.5" />
                항목 추가 (최대 5개)
              </button>
            )}
          </div>
        )}

        {/* 태그 입력 */}
        {showTagInput && (
          <div className="mt-4 flex flex-wrap gap-1.5 items-center border border-gray-200 rounded-xl px-3 py-2 min-h-[42px]">
            {tags.map((t) => (
              <span
                key={t}
                onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                className="text-[13px] text-blue-500 cursor-pointer"
              >
                #{t}
              </span>
            ))}
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="태그 입력 후 Space"
              className="flex-1 min-w-[100px] text-[13px] text-gray-700 placeholder:text-gray-300 focus:outline-none"
            />
          </div>
        )}

        {/* TIP 박스 */}
        {body.length === 0 && images.length === 0 && !showPoll && (
          <div className="mt-10">
            <p className="text-[13px] text-blue-400 mb-2">
              <span className="font-semibold text-blue-500">TIP</span>{" "}
              시장 커뮤니티에서 이런 이야기를 나눠보세요!
            </p>
            <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5">
              {[
                "우리 시장의 질문과 정보를 공유해요.",
                "이웃 상인과 교류하고 싶은 소식을 공유해요.",
                "운영정책에 어긋나는 글은 올릴 수 없어요.",
              ].map((tip) => (
                <div key={tip} className="flex items-start gap-1.5">
                  <span className="text-gray-400 mt-0.5">•</span>
                  <span className="text-[13px] text-gray-500">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 하단 툴바 ── */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 px-4 py-3">
        <div className="flex items-center gap-5 text-gray-400">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 active:text-gray-700 transition-colors"
          >
            <Image className="w-5 h-5" />
            <span className="text-[13px]">사진</span>
          </button>
          <button className="flex items-center gap-1.5 active:text-gray-700 transition-colors">
            <MapPin className="w-5 h-5" />
            <span className="text-[13px]">장소</span>
          </button>
          <button
            onClick={() => setShowPoll((v) => !v)}
            className={`flex items-center gap-1.5 transition-colors ${
              showPoll ? "text-gray-900" : "active:text-gray-700"
            }`}
          >
            <BarChart2 className="w-5 h-5" />
            <span className="text-[13px]">투표</span>
          </button>
          <button
            onClick={() => setShowTagInput((v) => !v)}
            className={`flex items-center gap-1.5 transition-colors ${
              showTagInput ? "text-gray-900" : "active:text-gray-700"
            }`}
          >
            <Hash className="w-5 h-5" />
            <span className="text-[13px]">태그</span>
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImageAdd}
      />

      {/* ── 주제 선택 바텀시트 ── */}
      {showCategorySheet && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50">
          <div className="bg-white rounded-t-2xl px-4 pt-5 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <p className="text-[16px] font-semibold text-gray-900 mb-4">주제 선택</p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => {
                const disabled = cat === "사장님" && !isSajangnim;
                return (
                  <button
                    key={cat}
                    disabled={disabled}
                    onClick={() => { setCategory(cat); setShowCategorySheet(false); }}
                    className={`py-3 rounded-xl text-[14px] font-medium border transition-all relative
                      ${disabled
                        ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                        : category === cat
                          ? "border-gray-900 bg-gray-50 text-gray-900"
                          : "border-gray-100 bg-gray-50 text-gray-700 active:bg-gray-100"
                      }`}
                  >
                    {cat}
                    {disabled && (
                      <span className="block text-[10px] text-gray-300 mt-0.5">사장님 전용</span>
                    )}
                    {!disabled && category === cat && (
                      <Check className="w-3.5 h-3.5 absolute top-2 right-2 text-gray-900" />
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowCategorySheet(false)}
              className="mt-4 w-full py-3 text-[14px] text-gray-400 active:text-gray-600"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* ── 시장 선택 바텀시트 ── */}
      {showMarketSheet && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50">
          <div className="bg-white rounded-t-2xl px-4 pt-5 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <p className="text-[16px] font-semibold text-gray-900 mb-4">시장 선택</p>
            <div className="space-y-2">
              {(Object.entries(MARKET_LABELS) as [MarketKey, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { setMarket(key); setShowMarketSheet(false); }}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-[14px] transition-all ${
                    market === key
                      ? "border-gray-900 bg-gray-50 text-gray-900 font-medium"
                      : "border-gray-100 bg-gray-50 text-gray-600 active:bg-gray-100"
                  }`}
                >
                  {label}
                  {market === key && <Check className="w-4 h-4 text-gray-900" />}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowMarketSheet(false)}
              className="mt-4 w-full py-3 text-[14px] text-gray-400 active:text-gray-600"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
