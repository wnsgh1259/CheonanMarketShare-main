// 임시 전역 게시글 저장소..
// WritePage, ChatPage, PostDetailPage 모두 여기서 import
 
export type Category = "사장님" | "질문" | "정보" | "후기";
export type MarketKey = "jungang" | "byeongcheon" | "seonghwan";
 
export interface Comment {
  id: number;
  author: string;
  text: string;
  time: string;
}
 
export interface PostItem {
  id: number;
  category: Category;
  market: MarketKey;
  title: string;
  preview: string;
  body: string;
  author: string;
  time: string;
  views: number;
  likes: number;
  comments: number;
  image?: string;
  tags: string[];
  pollOptions?: string[];
  commentList: Comment[];
  isMyPost?: boolean; // 내가 작성한 글 여부
}
 
export const INITIAL_POSTS: PostItem[] = [
  { id: 1, category: "사장님", market: "jungang", title: "오늘의 신상 귤 들어왔어요~ 사러오세요 한박스에 @@원..", preview: "어서오세요 이번에 새로 천안에 좋은 귤이 들어왔어요 맛있는 귤을 저렴하게 드릴게요...", body: "어서오세요 이번에 새로 천안에 좋은 귤이 들어왔어요 맛있는 귤을 저렴하게 드릴게요.", author: "A 시장", time: "5달 전", views: 128, likes: 0, comments: 12, image: "https://images.unsplash.com/photo-1577234286642-fc512a5f8f11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", tags: [], commentList: [] },
  { id: 2, category: "질문", market: "jungang", title: "다들 시장 오시면 어떤거 사세요?", preview: "이 그림도 여기 장을담주거나 상판물로도 충분하요~ 어떤거 사요?...", body: "다들 시장 오시면 뭐 사세요? 저는 주로 채소랑 반찬 사는데 다른 분들은 어떤지 궁금해요!", author: "철수", time: "9시간 전", views: 3106, likes: 9, comments: 9, tags: [], commentList: [] },
  { id: 3, category: "사장님", market: "jungang", title: "오늘의 신상 귤 들어왔어요~ 사러오세요 한박스에 @@원..", preview: "어서오세요 이번에 새로 천안에 좋은 귤이 들어왔어요 맛있는 귤을 저렴하게 드릴게요...", body: "어서오세요 이번에 새로 천안에 좋은 귤이 들어왔어요 맛있는 귤을 저렴하게 드릴게요.", author: "A 시장", time: "8시간 전", views: 128, likes: 0, comments: 12, image: "https://images.unsplash.com/photo-1577234286642-fc512a5f8f11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", tags: [], commentList: [] },
  { id: 4, category: "정보", market: "jungang", title: "천안중앙시장 주차장 정보 공유해요", preview: "시장 북쪽 공영주차장 2시간 무료예요. 주말엔 일찍 오시는 게 좋아요!", body: "시장 북쪽 공영주차장 2시간 무료예요. 주말엔 일찍 오시는 게 좋아요! 시장 입구에서 도보 3분 거리입니다.", author: "시장지기", time: "3일 전", views: 892, likes: 24, comments: 7, tags: [], commentList: [] },
  { id: 5, category: "후기", market: "byeongcheon", title: "병천순대 드디어 먹었어요! 강추합니다", preview: "소문으로만 듣던 병천순대 드디어 먹어봤는데 진짜 맛있어요. 국물이 끝내줘요!", body: "소문으로만 듣던 병천순대 드디어 먹어봤는데 진짜 맛있어요. 국물이 끝내줘요! 다들 한번씩 꼭 드셔보세요.", author: "먹방러", time: "1일 전", views: 445, likes: 31, comments: 15, image: "https://images.unsplash.com/photo-1769558688746-7ac36d8ce999?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", tags: [], commentList: [] },
  { id: 6, category: "사장님", market: "byeongcheon", title: "오늘 어묵 신선하게 들어왔어요! 따끈따끈 😋", preview: "오늘 아침 갓 만든 어묵입니다. 날씨가 쌀쌀한데 따뜻한 어묵 드세요!", body: "오늘 아침 갓 만든 어묵입니다. 날씨가 쌀쌀한데 따뜻한 어묵 드세요!", author: "어묵튀김코너", time: "5시간 전", views: 200, likes: 8, comments: 3, tags: [], commentList: [] },
  { id: 7, category: "정보", market: "seonghwan", title: "성환 배 선물세트 예약 받아요 🍐", preview: "추석 선물세트 사전 예약하시면 10% 할인! 성환 명물 배 놓치지 마세요.", body: "추석 선물세트 사전 예약하시면 10% 할인! 성환 명물 배 놓치지 마세요. 수량 한정이니 서두르세요!", author: "성환배농원직판", time: "2일 전", views: 670, likes: 42, comments: 20, image: "https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", tags: [], commentList: [] },
];
 
const STORAGE_KEY = "cheonan_post_store";
 
function loadPostStore(): PostItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
 
export function savePostStore() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(postStore));
  } catch {}
}
 
export const postStore: PostItem[] = loadPostStore();
 
export function addPost(post: PostItem) {
  postStore.unshift({ ...post, isMyPost: true });
  savePostStore();
}
 
export function addComment(postId: number, comment: Comment) {
  const p = postStore.find((p) => p.id === postId);
  if (p) {
    p.commentList.push(comment);
    p.comments = p.commentList.length;
    savePostStore();
  }
}