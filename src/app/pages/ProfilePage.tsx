import { ChevronLeft, MapPin, Award, Gift, Settings, User, Camera, TrendingUp, Clock, Upload, CheckCircle2, Ticket, Tag } from "lucide-react";
import { Link } from "react-router";
import { useState } from "react";
import { BottomNav } from "../components/BottomNav";

type TabType = "stamps" | "events" | "coupons";

export function ProfilePage() {
  const [activeTab, setActiveTab] = useState<TabType>("stamps");
  const [photoUploaded, setPhotoUploaded] = useState(false);

  const user = { name: "홍길동", mileage: 3250, visitedStores: 12, totalDistance: 8500 };

  const uncollectedStamps = [
    { id: 4, name: "한복 체험", icon: "👘", description: "한복 체험관 방문 후 인증", progress: 30, maxProgress: 100, score: 30, unit: "점", reward: "200P" },
    { id: 5, name: "드론 뷰 컬렉터", icon: "🚁", description: "드론 촬영 포인트 방문", progress: 0, maxProgress: 3, score: 0, unit: "곳", reward: "300P" },
    { id: 6, name: "축제 참가자", icon: "🎉", description: "천안 시장 축제 이벤트 참가", progress: 1, maxProgress: 3, score: 1, unit: "회", reward: "150P" },
    { id: 7, name: "숨은 맛집 발견", icon: "🔍", description: "숨은 맛집 5곳 발견하기", progress: 2, maxProgress: 5, score: 2, unit: "곳", reward: "500P" },
  ];

  const collectedStamps = [
    { id: 1, name: "전통시장 탐험가", icon: "🏪", date: "2026.03.15", description: "천안 시장 5곳 이상 방문", reward: "100P" },
    { id: 2, name: "먹거리 골목 마스터", icon: "🍜", date: "2026.03.20", description: "먹거리 골목 탐방 완료", reward: "150P" },
    { id: 3, name: "칼국수 골목", icon: "🍲", date: "2026.03.22", description: "칼국수 골목 전체 방문", reward: "120P" },
    { id: 8, name: "만보기 챌린지", icon: "👟", date: "2026.03.25", description: "10,000보 달성", reward: "100P" },
  ];

  const totalStamps = uncollectedStamps.length + collectedStamps.length;
  const collectedCount = collectedStamps.length;

  const coupons = [
    { id: 1, title: "천안중앙시장 5,000원 할인", description: "2만원 이상 구매 시", discount: "5,000원", market: "천안중앙시장", expiry: "2026.04.30", color: "bg-gray-900" },
    { id: 2, title: "성환전통시장 10% 할인", description: "1만원 이상 구매 시", discount: "10%", market: "성환전통시장", expiry: "2026.05.15", color: "bg-emerald-700" },
    { id: 3, title: "천안역전시장 무료 시음권", description: "방문 시 1회 무료", discount: "무료", market: "천안역전시장", expiry: "2026.04.20", color: "bg-orange-600" },
    { id: 4, title: "만보기 달성 특별 쿠폰", description: "5천원 이상 구매 시 3,000원", discount: "3,000원", market: "전 시장 공통", expiry: "2026.05.01", color: "bg-purple-700" },
    { id: 5, title: "1시간 체류 달성 쿠폰", description: "시장 1시간 이상 체류", discount: "2,000원", market: "전 시장 공통", expiry: "2026.04.25", color: "bg-rose-700" },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/home" className="p-1"><ChevronLeft className="w-5 h-5 text-gray-700" /></Link>
          <h1 className="text-[15px] text-gray-900">마이페이지</h1>
          <Link to="/settings" className="p-1"><Settings className="w-5 h-5 text-gray-600" /></Link>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white px-4 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
            <User className="w-7 h-7 text-gray-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-[17px] text-gray-900">{user.name}</h2>
            <p className="text-[13px] text-gray-400">마일리지 {user.mileage.toLocaleString()}P</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-[18px] text-gray-900">{user.visitedStores}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">방문 가게</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-[18px] text-gray-900">{collectedCount}/{totalStamps}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">스탬프</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-[18px] text-gray-900">{(user.totalDistance / 1000).toFixed(1)}km</div>
            <div className="text-[11px] text-gray-400 mt-0.5">이동거리</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-100 sticky top-[53px] z-10">
        {([
          { key: "stamps" as TabType, label: "스탬프 투어" },
          { key: "events" as TabType, label: "이벤트" },
          { key: "coupons" as TabType, label: "쿠폰함" },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-3 text-center text-[13px] transition-colors border-b-2 ${
              activeTab === key ? "text-gray-900 border-gray-900" : "text-gray-400 border-transparent"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Stamps Tab */}
      {activeTab === "stamps" && (
        <div className="px-4 py-4 space-y-3">
          {/* Pedometer */}
          <div className="bg-white rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center text-[18px]">👟</div>
                <div>
                  <h3 className="text-[14px] text-gray-900">만보기 챌린지</h3>
                  <p className="text-[11px] text-emerald-600">달성 시 100P 지급</p>
                </div>
              </div>
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="flex items-center justify-between text-[12px] text-gray-400 mb-2">
              <span>오늘 걸음 수</span>
              <span className="text-emerald-600">8,500 / 10,000보</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div className="h-2 bg-emerald-500 rounded-full transition-all" style={{ width: "85%" }} />
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">1,500보 남았어요</p>
          </div>

          {/* Uncollected */}
          <div>
            <h3 className="text-[12px] text-gray-400 mb-2 px-1">미수집 ({uncollectedStamps.length})</h3>
            <div className="space-y-2">
              {uncollectedStamps.map((stamp) => {
                const pct = Math.round((stamp.progress / stamp.maxProgress) * 100);
                return (
                  <div key={stamp.id} className="bg-white rounded-xl p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-[20px] grayscale opacity-50 flex-shrink-0">{stamp.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[14px] text-gray-700">{stamp.name}</h4>
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{stamp.reward}</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">{stamp.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1.5">
                      <span>진행</span>
                      <span>{stamp.score} / {stamp.maxProgress} {stamp.unit}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div className="h-1.5 bg-gray-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Collected */}
          <div>
            <h3 className="text-[12px] text-gray-400 mb-2 px-1">수집 완료 ({collectedStamps.length})</h3>
            <div className="bg-white rounded-xl overflow-hidden">
              {collectedStamps.map((stamp, idx) => (
                <div key={stamp.id} className={`flex items-center gap-3 px-4 py-3 ${idx < collectedStamps.length - 1 ? "border-b border-gray-50" : ""}`}>
                  <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-[20px] flex-shrink-0">{stamp.icon}</div>
                  <div className="flex-1">
                    <h4 className="text-[14px] text-gray-800">{stamp.name}</h4>
                    <p className="text-[11px] text-gray-400">{stamp.description}</p>
                    <p className="text-[10px] text-gray-300 mt-0.5">{stamp.date}</p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <Award className="w-5 h-5 text-gray-400" />
                    <span className="text-[10px] text-gray-400">{stamp.reward}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Events Tab */}
      {activeTab === "events" && (
        <div className="px-4 py-4 space-y-3">
          {/* Photo Upload Event */}
          <div className="bg-white rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Camera className="w-5 h-5 text-gray-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-[14px] text-gray-900">가격표 촬영 인증</h3>
                  <span className="text-[10px] bg-gray-900 text-white px-1.5 py-0.5 rounded">진행중</span>
                </div>
                <p className="text-[12px] text-gray-400 mt-0.5">사진 1장당 50P 지급</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <p className="text-[12px] text-gray-500 leading-relaxed">
                시장 내 가게의 가격표나 메뉴판을 사진으로 찍어 업로드하면 마일리지를 드립니다. 하루 최대 5장 (250P)까지 인정됩니다.
              </p>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-1.5 bg-gray-400 rounded-full" style={{ width: "40%" }} />
              </div>
              <span className="text-[11px] text-gray-400">2/5장</span>
            </div>
            {photoUploaded ? (
              <div className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-50 rounded-lg text-emerald-600 text-[13px]">
                <CheckCircle2 className="w-4 h-4" />업로드 완료! +50P
              </div>
            ) : (
              <button onClick={() => setPhotoUploaded(true)} className="flex items-center justify-center gap-2 w-full py-3 bg-gray-900 text-white rounded-lg text-[13px] active:bg-gray-800 transition-colors">
                <Upload className="w-4 h-4" />사진 업로드
              </button>
            )}
          </div>

          {/* Stay Event */}
          <div className="bg-white rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-gray-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-[14px] text-gray-900">1시간 체류 이벤트</h3>
                  <span className="text-[10px] bg-gray-900 text-white px-1.5 py-0.5 rounded">진행중</span>
                </div>
                <p className="text-[12px] text-gray-400 mt-0.5">1시간 체류 시 쿠폰 지급</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <p className="text-[12px] text-gray-500 leading-relaxed">
                시장 반경 내에서 1시간 이상 GPS 체류가 확인되면 자동으로 2,000원 할인 쿠폰을 지급합니다.
              </p>
            </div>
            <div className="mb-3">
              <div className="flex items-center justify-between text-[12px] text-gray-400 mb-1.5">
                <span>오늘 체류 시간</span>
                <span>32분 / 60분</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div className="h-1.5 bg-amber-500 rounded-full" style={{ width: "53%" }} />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">28분 더 체류하면 쿠폰이 발급돼요</p>
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-[11px] text-gray-400">GPS로 자동 체류시간이 측정됩니다</span>
            </div>
          </div>

          {/* Crowdsource Event */}
          <div className="bg-white rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-[18px]">🤝</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-[14px] text-gray-900">가격 정보 제보</h3>
                  <span className="text-[10px] bg-gray-600 text-white px-1.5 py-0.5 rounded">상시</span>
                </div>
                <p className="text-[12px] text-gray-400 mt-0.5">1건당 30P, 채택 시 추가 50P</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <p className="text-[12px] text-gray-500 leading-relaxed">
                시장 상품의 가격 정보를 직접 등록하고 마일리지를 받으세요. 채택된 정보는 추가 포인트가 지급됩니다.
              </p>
            </div>
            <button className="flex items-center justify-center gap-2 w-full py-3 bg-gray-900 text-white rounded-lg text-[13px] active:bg-gray-800 transition-colors">
              <Tag className="w-4 h-4" />가격 정보 등록
            </button>
          </div>
        </div>
      )}

      {/* Coupons Tab */}
      {activeTab === "coupons" && (
        <div className="px-4 py-4 space-y-3">
          {/* Mileage */}
          <div className="bg-gray-900 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4" />
                <span className="text-[13px]">보유 마일리지</span>
              </div>
            </div>
            <div className="text-[28px] mt-1">{user.mileage.toLocaleString()} <span className="text-[14px] text-gray-400">P</span></div>
          </div>

          {/* Coupon List */}
          <div>
            <h3 className="text-[12px] text-gray-400 mb-2 px-1">보유 쿠폰 ({coupons.length}장)</h3>
            <div className="space-y-2.5">
              {coupons.map((coupon) => (
                <div key={coupon.id} className="bg-white rounded-xl overflow-hidden">
                  <div className={`${coupon.color} px-4 py-3 flex items-center justify-between`}>
                    <div>
                      <span className="text-white/70 text-[11px]">{coupon.market}</span>
                      <div className="text-white text-[20px] mt-0.5">{coupon.discount}</div>
                    </div>
                    <Ticket className="w-6 h-6 text-white/40" />
                  </div>
                  <div className="px-4 py-3">
                    <h4 className="text-[14px] text-gray-800 mb-0.5">{coupon.title}</h4>
                    <p className="text-[12px] text-gray-400 mb-2">{coupon.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-400">{coupon.expiry}까지</span>
                      <button className="text-[12px] text-gray-900 bg-gray-100 px-3 py-1.5 rounded-lg active:bg-gray-200 transition-colors">
                        사용하기
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Special Notice */}
          <div className="bg-gray-900 rounded-xl p-4 text-white">
            <h3 className="text-[14px] mb-1">스탬프 5개 달성 시 특별 혜택</h3>
            <p className="text-[12px] text-gray-400 mb-3">
              스탬프를 5개 이상 수집하면 마감 할인 알림을 가장 먼저 받을 수 있어요
            </p>
            <button onClick={() => setActiveTab("stamps")} className="w-full py-2.5 bg-white text-gray-900 rounded-lg text-[13px] active:bg-gray-100 transition-colors">
              스탬프 투어 보기
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
