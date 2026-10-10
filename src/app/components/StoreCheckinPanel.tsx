import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { ensureStoreCheckinCode } from "../data/rewards";
import { loadOwnerCatalog, saveOwnerCatalog } from "../data/ownerStoreData";

export function StoreCheckinPanel({ storeId }: { storeId: number | null }) {
  const [code, setCode] = useState("");
  const [image, setImage] = useState("");

  useEffect(() => {
    if (!storeId) return;
    const next = ensureStoreCheckinCode(storeId);
    setCode(next);
  }, [storeId]);

  useEffect(() => {
    if (!code) return;
    void QRCode.toDataURL(`cheonan:${code}`, { margin: 1, width: 240 }).then(setImage);
  }, [code]);

  if (!storeId) {
    return (
      <div className="bg-white rounded-2xl p-5 text-[13px] text-gray-500">
        가게를 먼저 저장하면 인증 코드가 만들어져요.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 text-center shadow-sm">
      <p className="text-[13px] font-semibold text-gray-800">손님 인증 코드</p>
      <p className="text-[12px] text-gray-400 mt-1 leading-relaxed">
        손님이 이 QR을 찍거나 숫자 4자리를 입력하면 스탬프와 오늘 인증이 완료돼요.
      </p>
      <p className="text-[40px] font-bold tracking-[0.25em] text-gray-900 mt-4">{code}</p>
      {image && <img src={image} alt="가게 인증 QR" className="w-48 h-48 mx-auto mt-3 rounded-xl border border-gray-100" />}
      <button
        type="button"
        onClick={() => {
          const next = String(Math.floor(1000 + Math.random() * 9000));
          const catalog = loadOwnerCatalog();
          const stores = (catalog.stores ?? []).map((store) => (
            store.id === storeId ? { ...store, checkinCode: next } : store
          ));
          saveOwnerCatalog({ ...catalog, stores });
          setCode(next);
        }}
        className="mt-4 h-10 px-4 rounded-xl bg-gray-100 text-[13px] text-gray-700"
      >
        코드 다시 만들기
      </button>
    </div>
  );
}
