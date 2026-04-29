import { useState, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import {
  ChevronLeft, Send, MapPin, MessageCircle,
  Search, RefreshCw, Bell, Settings, Eye, ThumbsUp,
  MessageSquare, MoreHorizontal, Plus, Phone,
} from "lucide-react";
import { BottomNav } from "../components/BottomNav";

interface ChatRoom {
  id: string; storeName: string; lastMessage: string; time: string; unread: number; image: string; read: boolean;
}
interface Message { id: string; text: string; sender: "user" | "store"; time: string; }
interface Post {
  id: number; category: "사장님" | "질문" | "정보" | "후기"; title: string; preview: string;
  author: string; time: string; views: number; likes: number; comments: number; image?: string;
  market: "jungang" | "byeongcheon" | "seonghwan";
}

const STORE_IMAGES: Record<string, string> = {
  "천안순대국밥": "https://images.unsplash.com/photo-1769558688746-7ac36d8ce999?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200",
  "호두과자 본점": "https://images.unsplash.com/photo-1760020890915-ca605575b93b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200",
  "중앙칼국수": "https://images.unsplash.com/photo-1747228469031-c5fc60b9d9f9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200",
  "신선정육점": "https://images.unsplash.com/photo-1758788701706-327f3a0d6820?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200",
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

const POSTS: Post[] = [
  { id: 1, category: "사장님", market: "jungang", title: "오늘의 신상 귤 들어왔어요~ 사러오세요 한박스에 @@원..", preview: "어서오세요 이번에 새로 천안에 좋은 귤이 들어왔어요 맛있는 귤을 저렴하게 드릴게요...", author: "A 시장", time: "5달 전", views: 128, likes: 0, comments: 12, image: "https://images.unsplash.com/photo-1577234286642-fc512a5f8f11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200" },
  { id: 2, category: "질문", market: "jungang", title: "다들 시장 오시면 어떤거 사세요?", preview: "이 그림도 여기 장을담주거나 상판물로도 충분하요~ 어떤거 사요?...", author: "철수", time: "9시간 전", views: 3106, likes: 9, comments: 9 },
  { id: 3, category: "사장님", market: "jungang", title: "오늘의 신상 귤 들어왔어요~ 사러오세요 한박스에 @@원..", preview: "어서오세요 이번에 새로 천안에 좋은 귤이 들어왔어요 맛있는 귤을 저렴하게 드릴게요...", author: "A 시장", time: "8시간 전", views: 128, likes: 0, comments: 12, image: "https://images.unsplash.com/photo-1577234286642-fc512a5f8f11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200" },
  { id: 4, category: "정보", market: "jungang", title: "천안중앙시장 주차장 정보 공유해요", preview: "시장 북쪽 공영주차장 2시간 무료예요. 주말엔 일찍 오시는 게 좋아요!", author: "시장지기", time: "3일 전", views: 892, likes: 24, comments: 7 },
  { id: 5, category: "후기", market: "byeongcheon", title: "병천순대 드디어 먹었어요! 강추합니다", preview: "소문으로만 듣던 병천순대 드디어 먹어봤는데 진짜 맛있어요. 국물이 끝내줘요!", author: "먹방러", time: "1일 전", views: 445, likes: 31, comments: 15, image: "https://images.unsplash.com/photo-1769558688746-7ac36d8ce999?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200" },
  { id: 6, category: "사장님", market: "byeongcheon", title: "오늘 어묵 신선하게 들어왔어요! 따끈따끈 😋", preview: "오늘 아침 갓 만든 어묵입니다. 날씨가 쌀쌀한데 따뜻한 어묵 드세요!", author: "어묵튀김코너", time: "5시간 전", views: 200, likes: 8, comments: 3 },
  { id: 7, category: "정보", market: "seonghwan", title: "성환 배 선물세트 예약 받아요 🍐", preview: "추석 선물세트 사전 예약하시면 10% 할인! 성환 명물 배 놓치지 마세요.", author: "성환배농원직판", time: "2일 전", views: 670, likes: 42, comments: 20, image: "https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200" },
];

const MARKET_LABELS = { jungang: "천안중앙시장", byeongcheon: "천안역전시장", seonghwan: "성환전통시장" } as const;
type MarketKey = keyof typeof MARKET_LABELS;

const CATEGORY_STYLE: Record<Post["category"], string> = {
  사장님: "bg-gray-900 text-white",
  질문: "bg-amber-100 text-amber-700",
  정보: "bg-emerald-100 text-emerald-700",
  후기: "bg-purple-100 text-purple-700",
};

export function ChatPage() {
  const [searchParams] = useSearchParams();
  const initialStoreName = searchParams.get("store") || "";

  const [mainTab, setMainTab] = useState<"community" | "chat">(initialStoreName ? "chat" : "community");
  const [communityMarket, setCommunityMarket] = useState<MarketKey>("jungang");
  const [communityFilter, setCommunityFilter] = useState<"전체" | "인기글" | "사장님" | "질문">("전체");
  const [chatFilter, setChatFilter] = useState<"전체" | "읽음" | "안읽음">("전체");
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>(() => {
    const rooms = [...INITIAL_ROOMS];
    if (initialStoreName && !rooms.find(r => r.storeName === initialStoreName)) {
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

  const activeRoom = chatRooms.find(r => r.id === activeChatId);
  const activeMessages = activeChatId ? (messages[activeChatId] || []) : [];

  const handleSend = () => {
    if (!inputText.trim() || !activeChatId) return;
    const newMsg: Message = { id: `msg-${Date.now()}`, text: inputText.trim(), sender: "user", time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) };
    setMessages(prev => ({ ...prev, [activeChatId]: [...(prev[activeChatId] || []), newMsg] }));
    setChatRooms(prev => prev.map(r => r.id === activeChatId ? { ...r, lastMessage: inputText.trim(), time: "방금", unread: 0, read: true } : r));
    setInputText("");
    setTimeout(() => {
      const reply: Message = { id: `msg-${Date.now() + 1}`, text: "감사합니다! 확인 후 답변 드리겠습니다 😊", sender: "store", time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) };
      setMessages(prev => ({ ...prev, [activeChatId]: [...(prev[activeChatId] || []), reply] }));
    }, 1500);
  };

  const filteredPosts = POSTS.filter(p => {
    if (p.market !== communityMarket) return false;
    if (communityFilter === "전체") return true;
    if (communityFilter === "인기글") return p.views > 300;
    return p.category === communityFilter;
  });

  const filteredRooms = chatRooms.filter(r => {
    if (chatFilter === "읽음") return r.read;
    if (chatFilter === "안읽음") return !r.read;
    return true;
  });

  /* Chat view */
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
          {activeMessages.map(msg => (
            <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              {msg.sender === "store" && <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0"><img src={activeRoom?.image} alt="" className="w-full h-full object-cover" /></div>}
              <div className={`max-w-[72%] flex flex-col gap-0.5 ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                <div className={`px-3.5 py-2.5 rounded-2xl text-[14px] whitespace-pre-line ${msg.sender === "user" ? "bg-gray-900 text-white rounded-br-sm" : "bg-white text-gray-800 rounded-bl-sm"}`}>
                  {msg.text}
                </div>
                <p className="text-[10px] text-gray-400 px-1">{msg.time}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="메시지..." className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-[14px] focus:outline-none focus:ring-1 focus:ring-gray-300 placeholder:text-gray-400" />
            <button onClick={handleSend} disabled={!inputText.trim()} className="w-9 h-9 bg-gray-900 text-white rounded-full flex items-center justify-center disabled:opacity-30 active:bg-gray-800 transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* List view */
  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-20">
      <div className="sticky top-0 bg-white z-20 border-b border-gray-100">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div className="flex gap-4">
            <button onClick={() => setMainTab("community")} className={`text-[16px] pb-1 transition-colors ${mainTab === "community" ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-400"}`}>
              커뮤니티
            </button>
            <button onClick={() => setMainTab("chat")} className={`text-[16px] pb-1 transition-colors relative ${mainTab === "chat" ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-400"}`}>
              채팅
              {chatRooms.some(r => r.unread > 0) && <span className="absolute -top-0.5 -right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />}
            </button>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            {mainTab === "community" ? (
              <>
                <button><Search className="w-5 h-5" /></button>
                <button><RefreshCw className="w-4 h-4" /></button>
              </>
            ) : (
              <>
                <button><Bell className="w-5 h-5" /></button>
                <button><Settings className="w-5 h-5" /></button>
              </>
            )}
          </div>
        </div>

        {mainTab === "community" && (
          <div className="flex px-4 border-b border-gray-50">
            {(Object.entries(MARKET_LABELS) as [MarketKey, string][]).map(([key, label]) => (
              <button key={key} onClick={() => setCommunityMarket(key)} className={`mr-4 py-2 text-[13px] transition-colors border-b-2 ${communityMarket === key ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400"}`}>
                {label}
              </button>
            ))}
          </div>
        )}

        {mainTab === "chat" && (
          <div className="flex gap-1.5 px-4 py-2">
            {(["전체", "읽음", "안읽음"] as const).map(f => (
              <button key={f} onClick={() => setChatFilter(f)} className={`px-3 py-1.5 rounded-lg text-[12px] transition-all ${chatFilter === f ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"}`}>
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Community */}
      {mainTab === "community" && (
        <div>
          <div className="flex gap-1.5 px-4 py-3 overflow-x-auto scrollbar-hide">
            {(["전체", "인기글", "사장님", "질문"] as const).map(f => (
              <button key={f} onClick={() => setCommunityFilter(f)} className={`px-3 py-1.5 rounded-lg text-[12px] whitespace-nowrap transition-all flex-shrink-0 ${communityFilter === f ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>
                {f}
              </button>
            ))}
          </div>

          <div className="px-4">
            {filteredPosts.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-gray-400">
                <MessageSquare className="w-10 h-10 mb-3 text-gray-300" />
                <p className="text-[14px]">게시글이 없어요</p>
              </div>
            ) : (
              filteredPosts.map((post, idx) => (
                <div key={post.id} className={`bg-white py-3.5 px-3 rounded-lg mb-2`}>
                  <div className="flex gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${CATEGORY_STYLE[post.category]}`}>{post.category}</span>
                        <button className="text-gray-300"><MoreHorizontal className="w-4 h-4" /></button>
                      </div>
                      <h3 className="text-[14px] text-gray-900 mb-1 line-clamp-2">{post.title}</h3>
                      <p className="text-[12px] text-gray-400 line-clamp-2 mb-2">{post.preview}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-1.5">
                        <span>{post.author}</span>
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
                </div>
              ))
            )}
          </div>

          <button className="fixed bottom-24 right-4 flex items-center gap-1.5 bg-gray-900 text-white px-4 py-3 rounded-full shadow-lg active:bg-gray-800 transition-colors z-10">
            <Plus className="w-4 h-4" />
            <span className="text-[13px]">글쓰기</span>
          </button>
        </div>
      )}

      {/* Chat */}
      {mainTab === "chat" && (
        <div>
          <div className="flex border-b border-gray-100 bg-white">
            {(Object.entries(MARKET_LABELS) as [MarketKey, string][]).map(([key, label]) => (
              <button key={key} className="flex-1 py-2.5 text-[12px] text-gray-400 border-b-2 border-transparent first:border-gray-900 first:text-gray-900">
                {label}
              </button>
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
              {filteredRooms.map(room => (
                <button key={room.id} onClick={() => { setActiveChatId(room.id); setChatRooms(prev => prev.map(r => r.id === room.id ? { ...r, unread: 0, read: true } : r)); }} className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 active:bg-gray-50 transition-colors text-left">
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
