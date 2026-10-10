import { useEffect, useRef, useState } from "react";
import { findStoreByCheckinCode, recordCheckin } from "../data/rewards";
import { loadOwnerCatalog, refreshOwnerCatalogFromRemote } from "../data/ownerStoreData";

type VerifiedStore = { id: number; name: string };

export function CheckinSheet({
  onClose,
  onDone,
  title = "가게 인증",
  description = "사장님 화면의 QR을 찍거나 숫자 4자리를 입력하세요.",
  submitLabel = "인증하기",
  onVerify,
}: {
  onClose: () => void;
  onDone: (message: string) => void;
  title?: string;
  description?: string;
  submitLabel?: string;
  /** 있으면 가게 인증(스탬프) 대신 이 함수를 실행한다. 오류 문구를 돌려주면 시트가 열린 채 문구를 보여준다. */
  onVerify?: (store: VerifiedStore) => Promise<{ error?: string; message?: string }>;
}) {
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    void refreshOwnerCatalogFromRemote();
  }, []);

  useEffect(() => {
    if (!scanning) return;
    let stream: MediaStream | null = null;
    let timer = 0;
    const Detector = (window as Window & { BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
    if (!Detector || !navigator.mediaDevices) {
      setError("이 브라우저는 카메라 QR을 지원하지 않아요. 숫자 4자리를 입력해 주세요.");
      setScanning(false);
      return;
    }
    const detector = new Detector({ formats: ["qr_code"] });
    void navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then((next) => {
      stream = next;
      if (videoRef.current) {
        videoRef.current.srcObject = next;
        void videoRef.current.play();
      }
      timer = window.setInterval(async () => {
        if (!videoRef.current) return;
        const found = await detector.detect(videoRef.current).catch(() => []);
        const raw = found[0]?.rawValue || "";
        const digits = raw.replace(/\D/g, "").slice(-4);
        if (digits.length === 4) submit(digits);
      }, 700);
    }).catch(() => {
      setError("카메라를 열 수 없어요. 숫자 4자리를 입력해 주세요.");
      setScanning(false);
    });
    return () => {
      window.clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [scanning]);

  const submit = (value: string) => {
    if (busy) return;
    const stores = loadOwnerCatalog().stores ?? [];
    const store = findStoreByCheckinCode(value, stores);
    if (!store) {
      setError("일치하는 가게 코드가 없어요.");
      return;
    }
    if (onVerify) {
      setBusy(true);
      setScanning(false);
      void onVerify(store).then((outcome) => {
        setBusy(false);
        if (outcome.error) {
          setError(outcome.error);
          return;
        }
        onDone(outcome.message ?? "");
        onClose();
      });
      return;
    }
    const result = recordCheckin(store);
    const extra = result.awarded.length ? ` ${result.awarded.join(", ")}` : " 이미 오늘 인증을 완료했어요.";
    onDone(result.already && result.awarded.length === 0
      ? `${store.name}은 이미 인증한 가게예요.${extra}`
      : `${store.name} 인증 완료.${extra}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[160] bg-black/40 flex items-end justify-center" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-t-3xl p-5" onClick={(event) => event.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h3 className="text-[16px] font-bold text-gray-800">{title}</h3>
        <p className="text-[12px] text-gray-400 mt-1">{description}</p>
        <input
          inputMode="numeric"
          maxLength={4}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="0000"
          className="mt-4 w-full h-14 rounded-2xl bg-gray-50 text-center text-[28px] tracking-[0.3em] font-bold outline-none"
        />
        {error && <p className="text-[12px] text-rose-500 mt-2">{error}</p>}
        {scanning && <video ref={videoRef} className="mt-3 w-full h-48 rounded-2xl bg-black object-cover" muted playsInline />}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button type="button" onClick={() => setScanning((value) => !value)} className="h-11 rounded-xl bg-gray-100 text-[13px] font-medium">
            {scanning ? "카메라 닫기" : "QR 찍기"}
          </button>
          <button type="button" disabled={busy} onClick={() => submit(code)} className="h-11 rounded-xl bg-gray-900 text-white text-[13px] font-medium disabled:opacity-50">
            {busy ? "처리 중..." : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
