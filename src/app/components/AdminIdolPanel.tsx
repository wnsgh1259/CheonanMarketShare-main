import { useEffect, useState } from "react";
import {
  IDOL,
  drawIdolWinner,
  loadIdolConfig,
  loadIdolTickets,
  loadIdolWinner,
  refreshIdolEvent,
  saveIdolConfig,
  type IdolStage,
} from "../data/idolEvent";

function maskUser(userId: string) {
  return userId.startsWith("guest-") ? "비회원" : `***${userId.slice(-4)}`;
}

export function AdminIdolPanel() {
  const [stages, setStages] = useState<IdolStage[]>(() => loadIdolConfig().stages);
  const [ticketCount, setTicketCount] = useState(() => loadIdolTickets().length);
  const [winner, setWinner] = useState(() => loadIdolWinner());
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    await refreshIdolEvent();
    setStages(loadIdolConfig().stages);
    setTicketCount(loadIdolTickets().length);
    setWinner(loadIdolWinner());
  };

  useEffect(() => {
    void reload();
  }, []);

  const update = (index: number, patch: Partial<IdolStage>) => {
    setStages((prev) => prev.map((stage, i) => (i === index ? { ...stage, ...patch } : stage)));
    setNotice("");
  };

  const handleSave = async () => {
    if (stages.some((stage) => !/^\d{4}$/.test(stage.code))) {
      setNotice("코드는 숫자 4자리로 입력해 주세요.");
      return;
    }
    if (stages.some((stage) => !stage.answer.trim() || !stage.question.trim() || !stage.hint.trim())) {
      setNotice("힌트, 문제, 정답을 모두 입력해 주세요.");
      return;
    }
    setBusy(true);
    await saveIdolConfig(stages);
    setBusy(false);
    setNotice("저장했어요.");
  };

  const handleDraw = async () => {
    setBusy(true);
    const picked = await drawIdolWinner();
    setBusy(false);
    if (!picked) {
      setNotice("아직 추첨권이 없어요.");
      return;
    }
    setWinner(picked);
    setNotice("");
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-white p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-gray-800">{IDOL.name} 굿즈 추첨</p>
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-600">추첨권 {ticketCount}장</span>
        </div>
        {winner && (
          <div className="rounded-xl bg-amber-50 px-3 py-2.5">
            <p className="text-[11px] text-amber-600">당첨자</p>
            <p className="text-[14px] font-semibold text-gray-800">{winner.name} · {maskUser(winner.userId)}</p>
          </div>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleDraw()}
          className="h-10 w-full rounded-xl bg-gray-900 text-[13px] text-white disabled:opacity-50"
        >
          {winner ? "다시 추첨하기" : "추첨하기"}
        </button>
      </div>

      {stages.map((stage, index) => (
        <div key={index} className="rounded-xl bg-white p-4 space-y-2">
          <p className="text-[13px] font-semibold text-gray-800">{index + 1}단계</p>
          <label className="block text-[11px] text-gray-400">
            힌트 (아이돌이 말해요)
            <textarea
              value={stage.hint}
              onChange={(event) => update(index, { hint: event.target.value })}
              className="mt-1 h-16 w-full rounded-xl bg-gray-50 p-3 text-[13px] text-gray-800 outline-none"
            />
          </label>
          <label className="block text-[11px] text-gray-400">
            문제
            <input
              value={stage.question}
              onChange={(event) => update(index, { question: event.target.value })}
              className="mt-1 h-10 w-full rounded-xl bg-gray-50 px-3 text-[13px] text-gray-800 outline-none"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] text-gray-400">
              시장에 붙일 코드 (4자리)
              <input
                value={stage.code}
                inputMode="numeric"
                maxLength={4}
                onChange={(event) => update(index, { code: event.target.value.replace(/\D/g, "").slice(0, 4) })}
                className="mt-1 h-10 w-full rounded-xl bg-gray-50 px-3 text-[13px] tracking-widest text-gray-800 outline-none"
              />
            </label>
            <label className="block text-[11px] text-gray-400">
              정답 (여러 개는 쉼표)
              <input
                value={stage.answer}
                onChange={(event) => update(index, { answer: event.target.value })}
                className="mt-1 h-10 w-full rounded-xl bg-gray-50 px-3 text-[13px] text-gray-800 outline-none"
              />
            </label>
          </div>
        </div>
      ))}

      {notice && <p className="px-1 text-[12px] text-gray-500">{notice}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleSave()}
        className="h-11 w-full rounded-xl bg-violet-600 text-[13px] font-semibold text-white disabled:opacity-50"
      >
        단계 내용 저장
      </button>
    </div>
  );
}
