// src/app/pages/PostDetailPage.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { ChevronLeft, Eye, ThumbsUp, MessageSquare, MoreHorizontal, Send, BarChart2, Trash2, EyeOff, MapPin } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { postStore, INITIAL_POSTS, addComment, savePostStore, type PostItem, type Comment } from "../data/postStore";
import { UserAvatar } from "../components/UserAvatar";

const CATEGORY_STYLE: Record<PostItem["category"], string> = {
  사장님: "bg-gray-900 text-white",
  질문:   "bg-amber-100 text-amber-700",
  정보:   "bg-emerald-100 text-emerald-700",
  후기:   "bg-purple-100 text-purple-700",
};

const MARKET_LABELS: Record<PostItem["market"], string> = {
  jungang:     "천안중앙시장",
  byeongcheon: "천안역전시장",
  seonghwan:   "성환전통시장",
};

const INITIAL_COMMENTS_KEY = "cheonan_initial_comments";
const LIKES_KEY            = "cheonan_liked_posts";
const HIDDEN_KEY           = "cheonan_hidden_posts";
const DELETED_KEY          = "cheonan_deleted_posts";
const POLL_VOTES_KEY       = "cheonan_poll_votes";
const POLL_MY_VOTE_KEY     = "cheonan_poll_my_votes";

function loadPollVotes(postId: number, optionCount: number): number[] {
  try {
    const all = JSON.parse(localStorage.getItem(POLL_VOTES_KEY) || "{}");
    const saved: number[] | undefined = all[postId];
    if (Array.isArray(saved) && saved.length === optionCount) return saved;
    return Array(optionCount).fill(0);
  } catch { return Array(optionCount).fill(0); }
}
function savePollVotes(postId: number, votes: number[]) {
  try {
    const all = JSON.parse(localStorage.getItem(POLL_VOTES_KEY) || "{}");
    all[postId] = votes;
    localStorage.setItem(POLL_VOTES_KEY, JSON.stringify(all));
  } catch {}
}
function loadMyVote(postId: number): number | null {
  try {
    const all = JSON.parse(localStorage.getItem(POLL_MY_VOTE_KEY) || "{}");
    const v = all[postId];
    return typeof v === "number" ? v : null;
  } catch { return null; }
}
function saveMyVote(postId: number, optionIndex: number) {
  try {
    const all = JSON.parse(localStorage.getItem(POLL_MY_VOTE_KEY) || "{}");
    all[postId] = optionIndex;
    localStorage.setItem(POLL_MY_VOTE_KEY, JSON.stringify(all));
  } catch {}
}

function loadInitialComments(postId: number): Comment[] {
  try { const all = JSON.parse(localStorage.getItem(INITIAL_COMMENTS_KEY) || "{}"); return all[postId] ?? []; } catch { return []; }
}
function saveInitialComment(postId: number, comment: Comment) {
  try {
    const all = JSON.parse(localStorage.getItem(INITIAL_COMMENTS_KEY) || "{}");
    if (!all[postId]) all[postId] = [];
    all[postId].push(comment);
    localStorage.setItem(INITIAL_COMMENTS_KEY, JSON.stringify(all));
  } catch {}
}
function deleteInitialComment(postId: number, commentId: number) {
  try {
    const all = JSON.parse(localStorage.getItem(INITIAL_COMMENTS_KEY) || "{}");
    if (all[postId]) {
      all[postId] = all[postId].filter((c: Comment) => c.id !== commentId);
      localStorage.setItem(INITIAL_COMMENTS_KEY, JSON.stringify(all));
    }
  } catch {}
}
function loadLikedPosts(): Set<number> {
  try { return new Set(JSON.parse(localStorage.getItem(LIKES_KEY) || "[]")); } catch { return new Set(); }
}
function saveHideId(key: string, id: number) {
  try {
    const arr = JSON.parse(localStorage.getItem(key) || "[]");
    if (!arr.includes(id)) { arr.push(id); localStorage.setItem(key, JSON.stringify(arr)); }
  } catch {}
}

export function PostDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const postId = Number(id);
  const userName = localStorage.getItem("user_name") || "익명";

  const [, setTick] = useState(0);
  useEffect(() => {
    const h = () => setTick((t) => t + 1);
    window.addEventListener("user_title_changed", h);
    return () => window.removeEventListener("user_title_changed", h);
  }, []);

  const allPosts = [...postStore, ...INITIAL_POSTS];
  const post = allPosts.find((p) => p.id === postId);
  const storePost     = postStore.find((p) => p.id === postId);
  const isInitialPost = INITIAL_POSTS.some((p) => p.id === postId);
  const isMyPost      = !!storePost;

  useEffect(() => {
    if (!post) return;
    try {
      const viewedKey = "cheonan_viewed_posts";
      const viewed: number[] = JSON.parse(localStorage.getItem(viewedKey) || "[]");
      if (!viewed.includes(postId)) {
        viewed.push(postId);
        localStorage.setItem(viewedKey, JSON.stringify(viewed));
        if (storePost) { storePost.views += 1; savePostStore(); }
        else if (post) post.views += 1;
      }
    } catch {}
  }, [postId]);

  const [liked, setLiked]         = useState(() => loadLikedPosts().has(postId));
  const [likeCount, setLikeCount] = useState(post?.likes ?? 0);

  const [localComments, setLocalComments] = useState<Comment[]>(() => {
    if (storePost) return [...storePost.commentList];
    if (isInitialPost) return loadInitialComments(postId);
    return [];
  });
  const [commentText, setCommentText] = useState("");

  const [deleteCommentId, setDeleteCommentId] = useState<number | null>(null);

  const pollCount = post.pollOptions?.length ?? 0;
  const [pollVotes, setPollVotes] = useState<number[]>(() =>
    pollCount > 0 ? loadPollVotes(postId, pollCount) : [],
  );
  const [myVote, setMyVote] = useState<number | null>(() =>
    pollCount > 0 ? loadMyVote(postId) : null,
  );

  const handleVote = (optionIndex: number) => {
    if (myVote !== null) return;
    const next = pollVotes.map((v, i) => (i === optionIndex ? v + 1 : v));
    setPollVotes(next);
    setMyVote(optionIndex);
    savePollVotes(postId, next);
    saveMyVote(postId, optionIndex);
  };

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  if (!post) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p className="text-[15px] mb-3">게시글을 찾을 수 없어요</p>
          <button onClick={() => navigate(-1)} className="text-[13px] text-gray-900 underline">돌아가기</button>
        </div>
      </div>
    );
  }

  const handleLike = () => {
    try {
      const arr: number[] = JSON.parse(localStorage.getItem(LIKES_KEY) || "[]");
      if (liked) {
        localStorage.setItem(LIKES_KEY, JSON.stringify(arr.filter((x) => x !== postId)));
        setLikeCount((v) => v - 1);
        if (storePost) { storePost.likes -= 1; savePostStore(); }
      } else {
        arr.push(postId);
        localStorage.setItem(LIKES_KEY, JSON.stringify(arr));
        setLikeCount((v) => v + 1);
        if (storePost) { storePost.likes += 1; savePostStore(); }
      }
      setLiked((v) => !v);
    } catch {}
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    const newComment: Comment = { id: Date.now(), author: userName, text: commentText.trim(), time: "방금" };
    if (storePost) {
      addComment(postId, newComment);
      setLocalComments([...storePost.commentList]);
    } else if (isInitialPost) {
      saveInitialComment(postId, newComment);
      setLocalComments((prev) => [...prev, newComment]);
    }
    setCommentText("");
  };

  const handleDeleteComment = (commentId: number) => {
    if (storePost) {
      storePost.commentList = storePost.commentList.filter((c) => c.id !== commentId);
      storePost.comments = storePost.commentList.length;
      savePostStore();
      setLocalComments([...storePost.commentList]);
    } else if (isInitialPost) {
      deleteInitialComment(postId, commentId);
      setLocalComments((prev) => prev.filter((c) => c.id !== commentId));
    }
    setDeleteCommentId(null);
  };

  const handleDelete = () => {
    const idx = postStore.findIndex((p) => p.id === postId);
    if (idx !== -1) { postStore.splice(idx, 1); savePostStore(); }
    saveHideId(DELETED_KEY, postId);
    navigate(-1);
  };

  const handleHide = () => {
    saveHideId(HIDDEN_KEY, postId);
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col max-w-md mx-auto pb-40">
      {/* 헤더 */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1"><ChevronLeft className="w-5 h-5 text-gray-700" /></button>
          <span className="text-[13px] text-gray-400">{MARKET_LABELS[post.market]}</span>
          <div className="relative" ref={menuRef}>
            <button className="p-1" onClick={() => setMenuOpen((v) => !v)}>
              <MoreHorizontal className="w-5 h-5 text-gray-400" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden min-w-[110px] z-20">
                {isMyPost ? (
                  <button onClick={handleDelete} className="w-full flex items-center gap-2 px-4 py-3 text-[13px] text-red-500 active:bg-red-50">
                    <Trash2 className="w-4 h-4" />삭제
                  </button>
                ) : (
                  <button onClick={handleHide} className="w-full flex items-center gap-2 px-4 py-3 text-[13px] text-gray-600 active:bg-gray-50">
                    <EyeOff className="w-4 h-4" />숨기기
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="bg-white px-4 pt-5 pb-5">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${CATEGORY_STYLE[post.category]}`}>{post.category}</span>
        </div>
        <h1 className="text-[18px] font-semibold text-gray-900 mb-1 leading-snug">{post.title}</h1>

        <div className="flex items-center gap-1.5 text-[12px] text-gray-400 mb-4 mt-2 flex-wrap">
          {isMyPost
            ? <UserAvatar size="sm" />
            : <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-500 flex-shrink-0">{post.author[0]}</div>
          }
          <span className={isMyPost ? "text-gray-800 font-medium" : ""}>{post.author}</span>
          <span>·</span>
          <span>{post.time}</span>
          {post.tags && post.tags.length > 0 && (
            <>
              <span>·</span>
              {post.tags.map((t) => (
                <span key={t} className="text-blue-400">#{t}</span>
              ))}
            </>
          )}
        </div>

        <div className="h-px bg-gray-100 mb-4" />

        {post.image && (
          <div className="w-full rounded-xl overflow-hidden mb-4 max-h-64">
            <img src={post.image} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <p className="text-[15px] text-gray-700 leading-relaxed whitespace-pre-line mb-4">{post.body || post.preview}</p>

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {post.tags.map((t) => <span key={t} className="text-[12px] text-blue-500">#{t}</span>)}
          </div>
        )}

        {/* 장소 카드 */}
        {post.locationPin && (
          <div className="mb-4 border border-gray-200 rounded-2xl overflow-hidden bg-white">
            {post.locationPin.type === "store" ? (
              <button
                className="w-full text-left active:bg-gray-50 transition-colors"
                onClick={() =>
                  navigate(
                    `/map?market=${post.locationPin!.type === "store" ? post.locationPin!.market : "jungang"}&store=${encodeURIComponent(post.locationPin!.name)}`,
                  )
                }
              >
                <div className="flex gap-3 p-3 items-center">
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={post.locationPin.image} alt={post.locationPin.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-blue-500 flex-shrink-0" />
                      <span className="text-[13px] font-semibold text-gray-900 truncate">{post.locationPin.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-gray-400">{post.locationPin.category}</span>
                      <span className="text-gray-200">·</span>
                      <span className="text-[11px] text-gray-400 truncate">{post.locationPin.location}</span>
                    </div>
                    <div className="flex items-center gap-0.5 mt-0.5">
                      <svg className="w-3 h-3 fill-amber-400 text-amber-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      <span className="text-[11px] text-gray-600">{post.locationPin.rating}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="text-[11px] text-blue-500 font-medium">상점 보기 →</span>
                  </div>
                </div>
              </button>
            ) : (
              (() => {
                const pin = post.locationPin as Extract<typeof post.locationPin, { type: "custom" }>;
                const canNavigate = typeof pin.lat === "number" && typeof pin.lng === "number";
                const inner = (
                  <div className="flex gap-3 p-3 items-center">
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-900">{pin.name}</p>
                      {pin.description && (
                        <p className="text-[11px] text-gray-400 mt-0.5">{pin.description}</p>
                      )}
                    </div>
                    {canNavigate && (
                      <div className="flex-shrink-0">
                        <span className="text-[11px] text-red-400 font-medium">지도 보기 →</span>
                      </div>
                    )}
                  </div>
                );
                return canNavigate ? (
                  <button
                    className="w-full text-left active:bg-gray-50 transition-colors"
                    onClick={() =>
                      navigate(
                        `/map?customPin=${encodeURIComponent(pin.name)}&lat=${pin.lat}&lng=${pin.lng}&desc=${encodeURIComponent(pin.description || "")}&postId=${postId}`,
                      )
                    }
                  >
                    {inner}
                  </button>
                ) : inner;
              })()
            )}
          </div>
        )}

        {post.pollOptions && post.pollOptions.length > 0 && (() => {
          const totalVotes = pollVotes.reduce((s, v) => s + v, 0);
          const voted = myVote !== null;
          return (
            <div className="bg-gray-50 rounded-xl px-4 py-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-gray-500" />
                  <span className="text-[13px] font-semibold text-gray-700">투표</span>
                </div>
                {voted && (
                  <span className="text-[11px] text-gray-400">총 {totalVotes}명 참여</span>
                )}
              </div>
              <div className="space-y-2">
                {post.pollOptions.map((opt, i) => {
                  const pct = totalVotes > 0 ? Math.round((pollVotes[i] / totalVotes) * 100) : 0;
                  const isMyPick = myVote === i;
                  if (voted) {
                    return (
                      <div key={i} className="relative rounded-xl overflow-hidden border border-gray-200 bg-white px-3 py-2.5">
                        {/* 진행 바 */}
                        <div
                          className={`absolute inset-y-0 left-0 rounded-xl transition-all duration-500 ${isMyPick ? "bg-gray-900/10" : "bg-gray-100"}`}
                          style={{ width: `${pct}%` }}
                        />
                        <div className="relative flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isMyPick && (
                              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-gray-900 flex items-center justify-center">
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </span>
                            )}
                            <span className={`text-[13px] truncate ${isMyPick ? "font-semibold text-gray-900" : "text-gray-700"}`}>{opt}</span>
                          </div>
                          <div className="flex-shrink-0 flex items-center gap-1.5">
                            <span className={`text-[12px] font-semibold ${isMyPick ? "text-gray-900" : "text-gray-500"}`}>{pct}%</span>
                            <span className="text-[11px] text-gray-400">({pollVotes[i]}표)</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => handleVote(i)}
                      className="w-full text-left px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-[13px] text-gray-700 active:bg-gray-50 active:border-gray-400 transition-colors"
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {!voted && (
                <p className="text-[11px] text-gray-400 mt-2 text-center">항목을 클릭해 투표하세요</p>
              )}
            </div>
          );
        })()}

        <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
          <button onClick={handleLike} className={`flex items-center gap-1.5 text-[13px] transition-colors ${liked ? "text-gray-900" : "text-gray-400"}`}>
            <ThumbsUp className={`w-4 h-4 ${liked ? "fill-gray-900" : ""}`} />
            <span>{likeCount}</span>
          </button>
          <span className="flex items-center gap-1.5 text-[13px] text-gray-400">
            <MessageSquare className="w-4 h-4" />
            <span>{localComments.length}</span>
          </span>
          <span className="flex items-center gap-1.5 text-[13px] text-gray-400 ml-auto">
            <Eye className="w-4 h-4" />
            <span>{post.views.toLocaleString()}</span>
          </span>
        </div>
      </div>

      {/* 댓글 목록 */}
      <div className="mt-2 bg-white px-4 py-4">
        <p className="text-[13px] font-semibold text-gray-700 mb-4">댓글 {localComments.length}개</p>
        {localComments.length === 0 ? (
          <p className="text-[13px] text-gray-300 text-center py-6">첫 댓글을 달아보세요!</p>
        ) : (
          <div className="space-y-4">
            {localComments.map((c) => {
              const isMyComment = c.author === userName;
              return (
                <div key={c.id} className="flex gap-2.5">
                  {isMyComment
                    ? <UserAvatar size="md" />
                    : <div className="w-7 h-7 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-[11px] text-gray-500">{c.author[0]}</div>
                  }
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[12px] font-medium ${isMyComment ? "text-gray-900" : "text-gray-800"}`}>{c.author}</span>
                      <span className="text-[10px] text-gray-400">{c.time}</span>
                    </div>
                    <p className="text-[13px] text-gray-700 leading-relaxed">{c.text}</p>
                  </div>
                  {isMyComment && (
                    <button
                      onClick={() => setDeleteCommentId(c.id)}
                      className="flex-shrink-0 p-1 text-gray-300 active:text-red-400 transition-colors self-start mt-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 댓글 입력 */}
      <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            type="text" value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleComment()}
            placeholder="댓글을 입력하세요..."
            className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-[13px] focus:outline-none placeholder:text-gray-400"
          />
          <button onClick={handleComment} disabled={!commentText.trim()} className="w-9 h-9 bg-gray-900 text-white rounded-full flex items-center justify-center disabled:opacity-30 active:bg-gray-800 transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 댓글 삭제 확인 다이얼로그 */}
      {deleteCommentId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-8">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDeleteCommentId(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-[280px] overflow-hidden shadow-xl">
            <div className="px-5 pt-5 pb-4 text-center">
              <p className="text-[15px] font-semibold text-gray-900 mb-1">댓글을 삭제할까요?</p>
              <p className="text-[13px] text-gray-400">삭제된 댓글은 복구할 수 없어요</p>
            </div>
            <div className="flex border-t border-gray-100">
              <button
                onClick={() => setDeleteCommentId(null)}
                className="flex-1 py-3.5 text-[14px] text-gray-500 active:bg-gray-50 transition-colors border-r border-gray-100"
              >
                취소
              </button>
              <button
                onClick={() => handleDeleteComment(deleteCommentId)}
                className="flex-1 py-3.5 text-[14px] text-red-500 font-medium active:bg-red-50 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
