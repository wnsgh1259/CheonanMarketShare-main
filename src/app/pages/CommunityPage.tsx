import { useState } from "react";
import { Link } from "react-router";
import { Menu, Bell, ChevronRight, MapPin } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { SideMenu } from "../components/SideMenu";

// ── data ─────────────────────────────────────────────────────────
const COMMUNITY_STORIES = [
  { id: 1, author: "김민준", title: "통큰족발 오늘도 대박", time: "3시간 전", image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&q=80" },
  { id: 2, author: "이수진", title: "보령수산 신선도 최고!", time: "5시간 전", image: "https://images.unsplash.com/photo-1565680018093-ebb6b9ab5460?w=300&q=80" },
  { id: 3, author: "박지영", title: "봄 채소 다 들어왔어요", time: "어제", image: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=300&q=80" },
];

const NEARBY_SPOTS = [
  { id: 1, name: "진관사", location: "서울 은평구", image: "https://images.unsplash.com/photo-1590677197221-43af4beba05e?w=400&q=80" },
  { id: 2, name: "불광천", location: "서울 은평구", image: "https://images.unsplash.com/photo-1617369120004-4fc70312c5e6?w=400&q=80" },
  { id: 3, name: "북한산 둘레길", location: "서울 은평구", image: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=80" },
];

const COURSES = [
  {
    id: 1,
    title: "먹고 걷고, 데이트까지",
    subtitle: "족발 → 불광천 산책",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&q=80",
  },
  {
    id: 2,
    title: "전통 먹거리 한 번에 즐기고",
    subtitle: "청과 → 수산 → 한식",
    image: "https://images.unsplash.com/photo-1565680018093-ebb6b9ab5460?w=500&q=80",
  },
  {
    id: 3,
    title: "풍성한 주말 가족 코스",
    subtitle: "오전 장보기 → 점심 한식",
    image: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=500&q=80",
  },
];

const LOCAL_FOODS = [
  { id: 1, name: "고소한 녹두빈대떡", location: "서울지짐이", image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=300&q=80" },
  { id: 2, name: "알알이 풍부한 성게비빔밥", location: "보령수산", image: "https://images.unsplash.com/photo-1565680018093-ebb6b9ab5460?w=300&q=80" },
  { id: 3, name: "딱찍어 먹는 신선 과일", location: "봉화청과상회", image: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=300&q=80" },
];

export function CommunityPage() {
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-20">
      <SideMenu open={sideMenuOpen} onClose={() => setSideMenuOpen(false)} />

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setSideMenuOpen(true)} className="p-1">
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
          <span className="text-[20px] font-black text-[#FF6B2B] tracking-tight">은평교시장</span>
          <button className="p-1 relative">
            <Bell className="w-6 h-6 text-gray-700" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#FF6B2B] rounded-full" />
          </button>
        </div>
      </div>

      {/* ── Hero banner ── */}
      <div className="bg-white mx-4 mt-4 rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-[#FF6B2B] to-[#FF8C5A] px-5 pt-5 pb-4 relative">
          <div className="pr-24">
            <p className="text-white/80 text-[12px]">대조시장의 즐거움을 한눈에!</p>
            <p className="text-white text-[16px] font-bold leading-snug mt-1">
              시장 이야기부터<br />주변 관광 정보까지<br />한눈에 즐겨보세요
            </p>
          </div>
          {/* Decorative illustration */}
          <div className="absolute right-4 top-3 w-20 h-20 bg-white/10 rounded-full flex items-center justify-center text-[40px]">
            🏪
          </div>
        </div>
      </div>

      {/* ── 사람들 이야기 ── */}
      <div className="mt-5 px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-gray-900">대조시장 사람들 이야기</h2>
          <Link to="/chat" className="flex items-center text-[12px] text-gray-400">
            모두보기 <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {COMMUNITY_STORIES.map((story) => (
            <Link
              key={story.id}
              to={`/post/${story.id}`}
              className="flex-none w-[140px]"
            >
              <div className="relative h-[100px] rounded-xl overflow-hidden mb-1.5">
                <img src={story.image} alt={story.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-white text-[11px] font-medium leading-tight line-clamp-2">{story.title}</p>
                </div>
              </div>
              <p className="text-[10px] text-gray-400">{story.author} · {story.time}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* ── 장소 공유 CTA ── */}
      <div className="mx-4 mt-4 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          <MapPin className="w-5 h-5 text-blue-500" />
        </div>
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-gray-800">함께 나누고 싶은 장소가 있나요?</p>
          <p className="text-[11px] text-gray-500 mt-0.5">당신만의 숨은 명소를 여기에 알려주세요</p>
        </div>
        <Link to="/write" className="bg-blue-500 text-white text-[11px] px-3 py-1.5 rounded-lg whitespace-nowrap">
          올리기
        </Link>
      </div>

      {/* ── 근처 명소 ── */}
      <div className="mt-5 px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-gray-900">대조시장 근처 명소에요</h2>
          <button className="flex items-center text-[12px] text-gray-400">
            모두보기 <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {NEARBY_SPOTS.map((spot) => (
            <div key={spot.id} className="relative rounded-xl overflow-hidden">
              <img src={spot.image} alt={spot.name} className="w-full h-[80px] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-1.5 left-2 right-2">
                <p className="text-white text-[11px] font-semibold">{spot.name}</p>
                <p className="text-white/70 text-[9px]">{spot.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 추천 코스 ── */}
      <div className="mt-5 px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-gray-900">이런 코스는 어때요?</h2>
          <button className="flex items-center text-[12px] text-gray-400">
            모두보기 <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-2.5">
          {COURSES.map((course) => (
            <div key={course.id} className="relative rounded-2xl overflow-hidden h-[90px]">
              <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
              <div className="absolute inset-0 px-4 flex flex-col justify-center">
                <p className="text-white text-[14px] font-bold">{course.title}</p>
                <p className="text-white/70 text-[11px] mt-0.5">{course.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
        <button className="w-full mt-3 py-3 border border-gray-300 rounded-xl text-[13px] text-gray-600 font-medium active:bg-gray-50">
          전체 코스 보기
        </button>
      </div>

      {/* ── 대조의 맛 ── */}
      <div className="mt-5 px-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-gray-900">대조의 맛을 만나다</h2>
          <Link to="/map" className="flex items-center text-[12px] text-gray-400">
            모두보기 <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {LOCAL_FOODS.map((food) => (
            <Link
              key={food.id}
              to={`/store/${food.id}`}
              className="flex-none w-[140px] bg-white rounded-2xl overflow-hidden shadow-sm"
            >
              <div className="h-[100px] overflow-hidden">
                <img src={food.image} alt={food.name} className="w-full h-full object-cover" />
              </div>
              <div className="px-2.5 py-2">
                <p className="text-[12px] font-semibold text-gray-900 leading-tight">{food.name}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{food.location}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
