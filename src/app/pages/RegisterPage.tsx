import { useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ChevronLeft, User, Phone, CheckCircle2, Store, ShoppingCart, ImagePlus, Clock, MapPin, Lock, Mail } from "lucide-react";
import { setOwnerMode } from "../components/BottomNav";
import { findRegisteredUserByPhoneDigits, upsertRegisteredUser } from "../data/userAccounts";
import { findPendingSignupByPhone, submitOwnerSignupApplication } from "../data/ownerSignupApplications";

type Field = "nickname" | "email" | "phone" | "pin" | "pinConfirm" | "storeImage" | "address";

function FieldError({ msg }: { msg: string }) {
  return msg ? <p className="text-[11px] text-red-400 mt-1">{msg}</p> : null;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role") === "owner" ? "owner" : "customer";
  const isOwner = role === "owner";

  const [form, setForm] = useState({ nickname: "", email: "", phone: "", address: "", pin: "", pinConfirm: "" });
  const [storeImage, setStoreImage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [done, setDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (field: "nickname" | "email" | "phone" | "address" | "pin" | "pinConfirm") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === "pin" || field === "pinConfirm"
      ? e.target.value.replace(/\D/g, "").slice(0, 6)
      : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setStoreImage(ev.target?.result as string);
      setErrors((prev) => ({ ...prev, storeImage: "" }));
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const e: Partial<Record<Field, string>> = {};
    if (!form.nickname.trim()) e.nickname = isOwner ? "상점명을 입력해주세요." : "닉네임을 입력해주세요.";
    else if (form.nickname.trim().length < 2) e.nickname = isOwner ? "상점명은 2자 이상이어야 해요." : "닉네임은 2자 이상이어야 해요.";
    if (!form.email.trim()) e.email = "이메일을 입력해주세요.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "올바른 이메일 형식으로 입력해주세요.";
    if (!form.phone.trim()) e.phone = "전화번호를 입력해주세요.";
    else if (!/^[0-9]{10,11}$/.test(form.phone.replace(/-/g, ""))) e.phone = "올바른 전화번호 형식으로 입력해주세요.";
    if (!form.pin) e.pin = "PIN 번호를 입력해주세요.";
    else if (!/^[0-9]{4,6}$/.test(form.pin)) e.pin = "PIN 번호는 4~6자리 숫자로 입력해주세요.";
    if (!form.pinConfirm) e.pinConfirm = "PIN 번호 확인을 입력해주세요.";
    else if (form.pin !== form.pinConfirm) e.pinConfirm = "PIN 번호가 일치하지 않습니다.";
    if (isOwner && !storeImage) e.storeImage = "상점 이미지를 등록해주세요.";
    if (isOwner && !form.address.trim()) e.address = "상점 주소를 입력해주세요.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const phoneDigits = form.phone.replace(/-/g, "");

    const existingUser = findRegisteredUserByPhoneDigits(phoneDigits);
    if (existingUser?.status === "active") {
      setErrors((prev) => ({ ...prev, phone: "이미 가입된 전화번호입니다." }));
      return;
    }
    if (existingUser?.status === "pending" || findPendingSignupByPhone(phoneDigits)) {
      setErrors((prev) => ({ ...prev, phone: "이미 승인 대기 중인 신청이 있습니다." }));
      return;
    }

    if (isOwner) {
      if (!storeImage) return;
      submitOwnerSignupApplication({
        storeName: form.nickname.trim(),
        email: form.email.trim(),
        phone: phoneDigits,
        pin: form.pin,
        address: form.address.trim(),
        storeImage,
      });
      upsertRegisteredUser({
        phone: phoneDigits,
        pin: form.pin,
        email: form.email.trim(),
        name: form.nickname.trim(),
        role: "owner",
        status: "pending",
      });
    } else {
      localStorage.setItem("user_name", form.nickname.trim());
      localStorage.setItem("user_email", form.email.trim());
      localStorage.setItem("user_phone", phoneDigits);
      localStorage.setItem("user_pin", form.pin);
      localStorage.setItem("user_role", "customer");
      localStorage.setItem("user_status", "active");
      upsertRegisteredUser({
        phone: phoneDigits,
        pin: form.pin,
        email: form.email.trim(),
        name: form.nickname.trim(),
        role: "customer",
        status: "active",
      });
    }

    setOwnerMode(false);
    localStorage.removeItem("owner_current_store_name");
    setDone(true);
  };

  if (done) {
    return (
      <div className="flex flex-col min-h-screen bg-white px-6 py-12 items-center justify-center gap-5">
        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center ${isOwner ? "bg-amber-100" : "bg-sky-100"}`}>
          {isOwner
            ? <Store className="w-10 h-10 text-amber-500" />
            : <ShoppingCart className="w-10 h-10 text-sky-500" />}
        </div>
        <div className="text-center">
          <p className="text-[22px] font-bold text-gray-900 mb-1">
            {isOwner ? "가입 신청 완료!" : "가입 완료!"}
          </p>
          <p className="text-[14px] text-gray-400">
            <span className="text-gray-700 font-semibold">{form.nickname}</span>님,{" "}
            {isOwner ? "신청이 접수됐어요 🏪" : "천안 시장에 오신 걸 환영해요 🎉"}
          </p>
        </div>
        {isOwner && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 w-full">
            <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p className="text-[12px] text-amber-700">신청 승인은 영업일 기준 1일 이내로 소요됩니다.</p>
          </div>
        )}
        <button
          onClick={() => navigate(isOwner ? "/" : "/home")}
          className="w-full max-w-sm h-[52px] bg-gray-900 text-white rounded-2xl text-[15px] font-semibold active:bg-gray-800 transition-colors"
        >
          {isOwner ? "로그인 화면으로" : "시작하기"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* 헤더 */}
      <div className="flex items-center px-4 py-3 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="p-1 mr-2">
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-[16px] font-semibold text-gray-900">회원가입</h1>
        <span className={`ml-2 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
          isOwner ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"
        }`}>
          {isOwner ? "🏪 사장님" : "🛍 손님"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

        {/* 상점명 / 닉네임 */}
        <div>
          <label className="flex items-center gap-1.5 text-[13px] font-medium text-gray-700 mb-1.5">
            <User className="w-3.5 h-3.5 text-gray-400" />
            {isOwner ? "상점명" : "닉네임"} <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.nickname}
            onChange={set("nickname")}
            maxLength={12}
            placeholder={isOwner ? "상점 이름을 입력해주세요" : "2~12자"}
            className={`w-full px-4 py-3 rounded-xl border text-[14px] text-gray-800 focus:outline-none transition-colors ${
              errors.nickname ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50 focus:border-gray-400"
            }`}
          />
          <FieldError msg={errors.nickname || ""} />
        </div>

        {/* 상점 이미지 (사장님 전용, 필수) */}
        {isOwner && (
          <div>
            <label className="flex items-center gap-1.5 text-[13px] font-medium text-gray-700 mb-1.5">
              <ImagePlus className="w-3.5 h-3.5 text-gray-400" />
              상점 이미지 <span className="text-red-400">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            {storeImage ? (
              <div className="relative w-full h-44 rounded-xl overflow-hidden border border-gray-200">
                <img src={storeImage} alt="상점 이미지" className="w-full h-full object-cover" />
                <button
                  onClick={() => { setStoreImage(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center text-white text-[12px]"
                >
                  ✕
                </button>
                <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-emerald-500 text-white text-[10px] px-2 py-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />등록됨
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`w-full h-36 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors ${
                  errors.storeImage ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50 active:bg-gray-100"
                }`}
              >
                <ImagePlus className={`w-8 h-8 ${errors.storeImage ? "text-red-300" : "text-gray-300"}`} />
                <p className="text-[13px] text-gray-400">이미지 첨부하기</p>
                <p className="text-[11px] text-gray-300">탭하여 사진을 선택하세요</p>
              </button>
            )}
            <FieldError msg={errors.storeImage || ""} />
          </div>
        )}

        {/* 주소 (사장님 전용, 필수) */}
        {isOwner && (
          <div>
            <label className="flex items-center gap-1.5 text-[13px] font-medium text-gray-700 mb-1.5">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />상점 주소 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.address}
              onChange={set("address")}
              maxLength={60}
              placeholder="예) 충남 천안시 동남구 중앙동 123"
              className={`w-full px-4 py-3 rounded-xl border text-[14px] text-gray-800 focus:outline-none transition-colors ${
                errors.address ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50 focus:border-gray-400"
              }`}
            />
            <FieldError msg={errors.address || ""} />
          </div>
        )}

        {/* 전화번호 (필수) */}
        <div>
          <label className="flex items-center gap-1.5 text-[13px] font-medium text-gray-700 mb-1.5">
            <Phone className="w-3.5 h-3.5 text-gray-400" />전화번호 <span className="text-red-400">*</span>
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={set("phone")}
            maxLength={13}
            placeholder="010-0000-0000"
            className={`w-full px-4 py-3 rounded-xl border text-[14px] text-gray-800 focus:outline-none transition-colors ${
              errors.phone ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50 focus:border-gray-400"
            }`}
          />
          <FieldError msg={errors.phone || ""} />
        </div>

        {/* 이메일 (필수) */}
        <div>
          <label className="flex items-center gap-1.5 text-[13px] font-medium text-gray-700 mb-1.5">
            <Mail className="w-3.5 h-3.5 text-gray-400" />이메일 <span className="text-red-400">*</span>
          </label>
          <p className="text-[11px] text-gray-400 mb-1.5">핀번호를 되찾을 때 해당 이메일로 전송됩니다.</p>
          <input
            type="email"
            value={form.email}
            onChange={set("email")}
            placeholder="example@email.com"
            className={`w-full px-4 py-3 rounded-xl border text-[14px] text-gray-800 focus:outline-none transition-colors ${
              errors.email ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50 focus:border-gray-400"
            }`}
          />
          <FieldError msg={errors.email || ""} />
        </div>

        {/* PIN 번호 (필수) */}
        <div>
          <label className="flex items-center gap-1.5 text-[13px] font-medium text-gray-700 mb-1.5">
            <Lock className="w-3.5 h-3.5 text-gray-400" />PIN 번호 <span className="text-red-400">*</span>
          </label>
          <input
            type="password"
            inputMode="numeric"
            value={form.pin}
            onChange={set("pin")}
            maxLength={6}
            placeholder="4~6자리 숫자"
            className={`w-full px-4 py-3 rounded-xl border text-[14px] text-gray-800 focus:outline-none transition-colors tracking-widest ${
              errors.pin ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50 focus:border-gray-400"
            }`}
          />
          <FieldError msg={errors.pin || ""} />
        </div>

        {/* PIN 번호 확인 (필수) */}
        <div>
          <label className="flex items-center gap-1.5 text-[13px] font-medium text-gray-700 mb-1.5">
            <Lock className="w-3.5 h-3.5 text-gray-400" />PIN 번호 확인 <span className="text-red-400">*</span>
          </label>
          <input
            type="password"
            inputMode="numeric"
            value={form.pinConfirm}
            onChange={set("pinConfirm")}
            maxLength={6}
            placeholder="PIN 번호 다시 입력"
            className={`w-full px-4 py-3 rounded-xl border text-[14px] text-gray-800 focus:outline-none transition-colors tracking-widest ${
              errors.pinConfirm ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50 focus:border-gray-400"
            }`}
          />
          <FieldError msg={errors.pinConfirm || ""} />
        </div>

        <p className="text-[11px] text-gray-400 leading-relaxed">
          가입 시 <span className="text-gray-600 underline">서비스 이용약관</span> 및{" "}
          <span className="text-gray-600 underline">개인정보 처리방침</span>에 동의하게 됩니다.
        </p>
      </div>

      {/* 가입 버튼 */}
      <div className="px-6 pb-10 pt-3 border-t border-gray-100 space-y-2">
        <button
          onClick={handleSubmit}
          className="w-full h-[52px] bg-gray-900 text-white rounded-2xl text-[15px] font-semibold active:bg-gray-800 transition-colors"
        >
          {isOwner ? "가입 신청하기" : "가입하기"}
        </button>
        {isOwner && (
          <div className="flex items-center justify-center gap-1.5">
            <Clock className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <p className="text-[11px] text-gray-400">신청 승인은 영업일 기준 1일 이내로 소요됩니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
