// src/app/pages/ChatPage.tsx
import { useState, useRef, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router";
import { ChevronLeft, Send, MessageCircle, Search, RefreshCw, Bell, Settings, Eye, ThumbsUp, MessageSquare, MoreHorizontal, Plus, Phone, X, Trash2, EyeOff } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { INITIAL_POSTS, postStore, savePostStore } from "../data/postStore";
import type { PostItem } from "../data/postStore";
import { UserAvatar } from "../components/UserAvatar";

interface ChatRoom { id: string; storeName: string; lastMessage: string; time: string; unread: number; image: string; read: boolean; }
interface Message { id: string; text: string; sender: "user" | "store"; time: string; }

const STORE_IMAGES: Record<string, string> = {
  "천안순대국밥": "https://images.unsplash.com/photo-1769558688746-7ac36d8ce999?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200",
  "호두과자 본점": "https://images.unsplash.com/photo-1760020890915-ca605575b93b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200",
  "중앙칼국수":   "https://images.unsplash.com/photo-1747228469031-c5fc60b9d9f9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200",
  "신선정육점":   "https://images.unsplash.com/photo-1758788701706-327f3a0d6820?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200",
  "싱싱채소마트": "https://images.unsplash.com/photo-1759663783570-520674af30d6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200",
};

const INITIAL_ROOMS: ChatRoom[] = [
  { id: "chat-천안순대국밥", storeName: "천안순대국밥", lastMessage: "안녕하세요! 무엇을 도와드릴까요?", time: "9:41", unread: 1, image: STORE_IMAGES["천안순대국밥"], read: false },
  { id: "chat-호두과자 본점", storeName: "호두과자 본점", lastMessage: "감사합니다! 오늘 마감 할인 진행 중이에요 😊", time: "어제", unread: 0, image: STORE_IMAGES["호두과자 본점"], read: true },
  { id: "chat-싱싱채소마트", storeName: "싱싱채소마트", lastMessage: "배추 2포기 남았어요!", time: "2일 전", unread: 2, image: STORE_IMAGES["싱싱채소마트"], read: false },
];

const INITIAL_MESSAGES: Record<string, Message[]> = {
  "chat-천안순대국밥": [
    { id: "m1", text: "사장님 오늘 가게에 땅콩 판매하고 있나요", sender: "user", time: "오전 9:41" },
    { id: "m2", text: "안녕하세요\n천안중앙시장 A시장 가게 사장입니다\n네 땅콩 지금 판매중입니다\n오늘 방문하시나요?", sender: "store", time: "오전 9:43" },
  ],
  "chat-호두과자 본점": [
    { id: "m1", text: "안녕하세요! 무엇을 도와드릴까요?", sender: "store", time: "어제" },
    { id: "m2", text: "오늘 마감 할인 진행 중이에요 😊", sender: "store", time: "어제" },
  ],
  "chat-싱싱채소마트": [
    { id: "m1", text: "배추 재고 있나요?", sender: "user", time: "2일 전" },
    { id: "m2", text: "배추 2포기 남았어요!", sender: "store", time: "2일 전" },
  ],
};

const MARKET_LABELS = { jungang: "천안중앙시장", byeongcheon: "천안역전시장", seonghwan: "성환전통시장" } as const;
type MarketKey = keyof typeof MARKET_LABELS;

const CATEGORY_STYLE: Record<PostItem["category"], string> = {
  사장님: "bg-gray-900 text-white",
  질문:   "bg-amber-100 text-amber-700",
  정보:   "bg-emerald-100 text-emerald-700",
  후기:   "bg-purple-100 text-purple-700",
};

// localStorage 키
const HIDDEN_KEY  = "cheonan_hidden_posts";
const DELETED_KEY = "cheonan_deleted_posts";

function loadIds(key: string): Set<number> {
  try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); } catch { return new Set(); }
}
function saveIds(key: string, set: Set<number>) {
  try { localStorage.setItem(key, JSON.stringify([...set])); } catch {}
}

export function ChatPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialStoreName = searchParams.get("store") || "";

  const [mainTab, setMainTab] = useState<"community" | "chat">(initialStoreName ? "chat" : "community");
  const [communityMarket, setCommunityMarket] = useState<MarketKey>("jungang");
  const [communityFilter, setCommunityFilter] = useState<"전체" | "인기글" | "사장님" | "질문">("전체");
  const [chatFilter, setChatFilter] = useState<"전체" | "읽음" | "안읽음">("전체");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // 숨기기/삭제 - localStorage에서 불러오기
  const [hiddenPostIds, setHiddenPostIds]   = useState<Set<number>>(() => loadIds(HIDDEN_KEY));
  const [deletedPostIds, setDeletedPostIds] = useState<Set<number>>(() => loadIds(DELETED_KEY));

  const [, setTick] = useState(0);
  useEffect(() => {
    const h = () => setTick((t) => t + 1);
    window.addEventListener("user_title_changed", h);
    return () => window.removeEventListener("user_title_changed", h);
  }, []);

  const [chatRooms, setChatRooms] = useState<ChatRoom[]>(() => {
    const rooms = [...INITIAL_ROOMS];
    if (initialStoreName && !rooms.find((r) => r.storeName === initialStoreName)) {
      rooms.unshift({ id: `chat-${initialStoreName}`, storeName: initialStoreName, lastMessage: "안녕하세요! 무엇을 도와드릴까요?", time: "방금", unread: 1, image: STORE_IMAGES[initialStoreName] || "https://images.unsplash.com/photo-1594021113115-f1b48e63ef06?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", read: false });
    }
    return rooms;
  });
  const [activeChatId, setActiveChatId] = useState<string | null>(initialStoreName ? `chat-${initialStoreName}` : null);
  const [messages, setMessages] = useState<Record<string, Message[]>>(() => {
    const init = { ...INITIAL_MESSAGES };
    if (initialStoreName && !init[`chat-${initialStoreName}`]) {
      init[`chat-${initialStoreName}`] = [{ id: "m1", text: "안녕하세요! 무엇을 도와드릴까요?", sender: "store", time: "방금" }];
    }
    return init;
  });
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, activeChatId]);
  useEffect(() => { if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 100); }, [searchOpen]);
  useEffect(() => {
    if (openMenuId === null) return;
    const close = () => setOpenMenuId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenuId]);

  const activeRoom = chatRooms.find((r) => r.id === activeChatId);
  const activeMessages = activeChatId ? (messages[activeChatId] || []) : [];

  const handleSend = () => {
    if (!inputText.trim() || !activeChatId) return;
    const newMsg: Message = { id: `msg-${Date.now()}`, text: inputText.trim(), sender: "user", time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) };
    setMessages((prev) => ({ ...prev, [activeChatId]: [...(prev[activeChatId] || []), newMsg] }));
    setChatRooms((prev) => prev.map((r) => r.id === activeChatId ? { ...r, lastMessage: inputText.trim(), time: "방금", unread: 0, read: true } : r));
    setInputText("");
    setTimeout(() => {
      const reply: Message = { id: `msg-${Date.now() + 1}`, text: "감사합니다! 확인 후 답변 드리겠습니다 😊", sender: "store", time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) };
      setMessages((prev) => ({ ...prev, [activeChatId]: [...(prev[activeChatId] || []), reply] }));
    }, 1500);
  };

  // postStore에 있으면 내 글
  const isMyPost = (post: PostItem) => postStore.some((p) => p.id === post.id);

  const handleDeletePost = (postId: number) => {
    const idx = postStore.findIndex((p) => p.id === postId);
    if (idx !== -1) { postStore.splice(idx, 1); savePostStore(); }
    const next = new Set([...deletedPostIds, postId]);
    setDeletedPostIds(next);
    saveIds(DELETED_KEY, next);
    setOpenMenuId(null);
  };

  const handleHidePost = (postId: number) => {
    const next = new Set([...hiddenPostIds, postId]);
    setHiddenPostIds(next);
    saveIds(HIDDEN_KEY, next);
    setOpenMenuId(null);
  };

  const allPosts = [...postStore, ...INITIAL_POSTS];
  const filteredPosts = allPosts.filter((p) => {
    if (hiddenPostIds.has(p.id) || deletedPostIds.has(p.id)) return false;
    if (searchQuery.trim()) {
      if (p.market !== communityMarket) return false;
      const q = searchQuery.trim().toLowerCase();
      return p.title.toLowerCase().includes(q) || p.preview.toLowerCase().includes(q) || p.body?.toLowerCase().includes(q) || p.tags?.some((t) => t.toLowerCase().includes(q));
    }
    if (p.market !== communityMarket) return false;
    if (communityFilter === "전체") return true;
    if (communityFilter === "인기글") return p.views > 300;
    return p.category === communityFilter;
  });

  const filteredRooms = chatRooms.filter((r) => {
    if (chatFilter === "읽음") return r.read;
    if (chatFilter === "안읽음") return !r.read;
    return true;
  });

  /* ── 채팅 상세 뷰 ── */
  if (activeChatId) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex flex-col max-w-md mx-auto">
        <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => setActiveChatId(null)} className="p-1"><ChevronLeft className="w-5 h-5 text-gray-700" /></button>
            <div className="flex items-center gap-2 flex-1">
              {activeRoom && <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"><img src={activeRoom.image} alt="" className="w-full h-full object-cover" /></div>}
              <div>
                <h1 className="text-[14px] text-gray-900">{activeRoom?.storeName}</h1>
                <p className="text-[10px] text-gray-400">사장님</p>
              </div>
            </div>
            <button className="p-1 text-gray-400"><Phone className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto pb-24">
          {activeMessages.map((msg) => (
            <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              {msg.sender === "store" && <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0"><img src={activeRoom?.image} alt="" className="w-full h-full object-cover" /></div>}
              <div className={`max-w-[72%] flex flex-col gap-0.5 ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                <div className={`px-3.5 py-2.5 rounded-2xl text-[14px] whitespace-pre-line ${msg.sender === "user" ? "bg-gray-900 text-white rounded-br-sm" : "bg-white text-gray-800 rounded-bl-sm"}`}>{msg.text}</div>
                <p className="text-[10px] text-gray-400 px-1">{msg.time}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="메시지..." className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-[14px] focus:outline-none placeholder:text-gray-400" />
            <button onClick={handleSend} disabled={!inputText.trim()} className="w-9 h-9 bg-gray-900 text-white rounded-full flex items-center justify-center disabled:opacity-30 active:bg-gray-800 transition-colors"><Send className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    );
  }

  /* ── 리스트 뷰 ── */
  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-20">
      <div className="sticky top-0 bg-white z-20 border-b border-gray-100">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div className="flex gap-4">
            <button onClick={() => setMainTab("community")} className={`text-[16px] pb-1 transition-colors ${mainTab === "community" ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-400"}`}>커뮤니티</button>
            <button onClick={() => setMainTab("chat")} className={`text-[16px] pb-1 transition-colors relative ${mainTab === "chat" ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-400"}`}>
              채팅
              {chatRooms.some((r) => r.unread > 0) && <span className="absolute -top-0.5 -right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />}
            </button>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            {mainTab === "community" ? (
              <>
                <button onClick={() => { setSearchOpen((v) => !v); setSearchQuery(""); }}><Search className="w-5 h-5" /></button>
                <button onClick={() => setSearchQuery("")}><RefreshCw className="w-4 h-4" /></button>
              </>
            ) : (
              <>
                <button><Bell className="w-5 h-5" /></button>
                <button><Settings className="w-5 h-5" /></button>
              </>
            )}
          </div>
        </div>

        {mainTab === "community" && searchOpen && (
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input ref={searchInputRef} type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="제목, 내용, 태그 검색..." className="flex-1 bg-transparent text-[13px] text-gray-700 placeholder:text-gray-400 focus:outline-none" />
              {searchQuery && <button onClick={() => setSearchQuery("")}><X className="w-4 h-4 text-gray-400" /></button>}
            </div>
          </div>
        )}

        {mainTab === "community" && (
          <div className="flex px-4 border-b border-gray-50">
            {(Object.entries(MARKET_LABELS) as [MarketKey, string][]).map(([key, label]) => (
              <button key={key} onClick={() => setCommunityMarket(key)} className={`mr-4 py-2 text-[13px] transition-colors border-b-2 ${communityMarket === key ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400"}`}>{label}</button>
            ))}
          </div>
        )}
        {mainTab === "chat" && (
          <div className="flex gap-1.5 px-4 py-2">
            {(["전체", "읽음", "안읽음"] as const).map((f) => (
              <button key={f} onClick={() => setChatFilter(f)} className={`px-3 py-1.5 rounded-lg text-[12px] transition-all ${chatFilter === f ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"}`}>{f}</button>
            ))}
          </div>
        )}
      </div>

      {/* ── 커뮤니티 ── */}
      {mainTab === "community" && (
        <div>
          {!searchOpen && (
            <div className="flex gap-1.5 px-4 py-3 overflow-x-auto scrollbar-hide">
              {(["전체", "인기글", "사장님", "질문"] as const).map((f) => (
                <button key={f} onClick={() => setCommunityFilter(f)} className={`px-3 py-1.5 rounded-lg text-[12px] whitespace-nowrap transition-all flex-shrink-0 ${communityFilter === f ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>{f}</button>
              ))}
            </div>
          )}
          {searchOpen && searchQuery && (
            <div className="px-4 py-2">
              <p className="text-[12px] text-gray-400"><span className="text-gray-700 font-medium">"{searchQuery}"</span> 검색 결과 {filteredPosts.length}개</p>
            </div>
          )}
          <div className="px-4">
            {filteredPosts.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-gray-400">
                <MessageSquare className="w-10 h-10 mb-3 text-gray-300" />
                <p className="text-[14px]">{searchQuery ? `"${searchQuery}" 검색 결과가 없어요` : "게시글이 없어요"}</p>
              </div>
            ) : (
              filteredPosts.map((post) => {
                const mine = isMyPost(post);
                return (
                  <div key={post.id} className="relative bg-white rounded-lg mb-2">
                    <button
                      className="w-full py-3.5 px-3 text-left active:bg-gray-50 transition-colors rounded-lg"
                      onClick={() => navigate(`/post/${post.id}`)}
                    >
                      <div className="flex gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${CATEGORY_STYLE[post.category]}`}>{post.category}</span>
                            {/* ... 버튼 */}
                            <button
                              className="text-gray-300 p-1 -mr-1"
                              onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === post.id ? null : post.id); }}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </div>
                          <h3 className="text-[14px] text-gray-900 mb-1 line-clamp-2">{post.title}</h3>
                          <p className="text-[12px] text-gray-400 line-clamp-2 mb-2">{post.preview}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-1.5">
                            {mine
                              ? <UserAvatar size="sm" />
                              : <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[9px] text-gray-500 flex-shrink-0">{post.author[0]}</div>
                            }
                            <span className={mine ? "text-gray-600 font-medium" : ""}>{post.author}</span>
                            <span>·</span>
                            <span>{post.time}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-gray-400">
                            <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" /> {post.views.toLocaleString()}</span>
                            {post.likes > 0 && <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" /> {post.likes}</span>}
                            <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" /> {post.comments}</span>
                          </div>
                        </div>
                        {post.image && <div className="w-[72px] h-[72px] rounded-lg overflow-hidden flex-shrink-0"><img src={post.image} alt="" className="w-full h-full object-cover" /></div>}
                      </div>
                    </button>

                    {/* 드롭다운 메뉴 */}
                    {openMenuId === post.id && (
                      <div
                        className="absolute top-9 right-3 z-30 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden min-w-[110px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {mine ? (
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="w-full flex items-center gap-2 px-4 py-3 text-[13px] text-red-500 active:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />삭제
                          </button>
                        ) : (
                          <button
                            onClick={() => handleHidePost(post.id)}
                            className="w-full flex items-center gap-2 px-4 py-3 text-[13px] text-gray-600 active:bg-gray-50"
                          >
                            <EyeOff className="w-4 h-4" />숨기기
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <Link to="/write" className="fixed bottom-24 right-4 flex items-center gap-1.5 bg-gray-900 text-white px-4 py-3 rounded-full shadow-lg active:bg-gray-800 transition-colors z-10">
            <Plus className="w-4 h-4" /><span className="text-[13px]">글쓰기</span>
          </Link>
        </div>
      )}

      {/* ── 채팅 ── */}
      {mainTab === "chat" && (
        <div>
          <div className="flex border-b border-gray-100 bg-white">
            {(Object.entries(MARKET_LABELS) as [MarketKey, string][]).map(([key, label]) => (
              <button key={key} className="flex-1 py-2.5 text-[12px] text-gray-400 border-b-2 border-transparent first:border-gray-900 first:text-gray-900">{label}</button>
            ))}
          </div>
          {filteredRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <MessageCircle className="w-12 h-12 mb-4 text-gray-300" />
              <p className="text-[14px] mb-1">{chatFilter === "읽음" ? "읽은 채팅이 없어요" : chatFilter === "안읽음" ? "안읽은 채팅이 없어요" : "채팅방이 없어요"}</p>
              <p className="text-[12px] text-gray-300 mb-4">지도에서 상점의 채팅 버튼을 눌러보세요</p>
              <Link to="/map" className="px-4 py-2 bg-gray-900 text-white rounded-lg text-[13px]">지도로 이동</Link>
            </div>
          ) : (
            <div className="bg-white">
              {filteredRooms.map((room) => (
                <button key={room.id} onClick={() => { setActiveChatId(room.id); setChatRooms((prev) => prev.map((r) => r.id === room.id ? { ...r, unread: 0, read: true } : r)); }} className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 active:bg-gray-50 transition-colors text-left">
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-full overflow-hidden"><img src={room.image} alt="" className="w-full h-full object-cover" /></div>
                    {room.unread > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">{room.unread}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[14px] text-gray-900">{room.storeName}</span>
                      <span className="text-[10px] text-gray-400">{room.time}</span>
                    </div>
                    <p className={`text-[13px] truncate ${room.unread > 0 ? "text-gray-700" : "text-gray-400"}`}>{room.lastMessage}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
