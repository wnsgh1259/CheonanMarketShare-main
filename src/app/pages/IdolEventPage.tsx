import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ChevronLeft, Send, Volume2, VolumeX } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import {
  IDOL,
  IDOL_REWARD_POINTS,
  IDOL_STAGE_COUNT,
  IDOL_VOICE,
  advanceIdolStage,
  checkIdolAnswer,
  checkIdolCode,
  claimIdolReward,
  loadIdolConfig,
  loadIdolWinner,
  myIdolTicketCount,
  refreshIdolEvent,
  type IdolStage,
} from "../data/idolEvent";
import { speakIdol, stopIdolVoice } from "../data/idolVoice";
import { loadIdolProgress, refreshRewards, rewardUserId } from "../data/rewards";

type Message = { id: number; role: "idol" | "user"; text: string };

let messageSeq = 0;

export function IdolEventPage() {
  const [stages, setStages] = useState<IdolStage[]>(() => loadIdolConfig().stages);
  const [progress, setProgress] = useState(() => loadIdolProgress());
  const [hinted, setHinted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [voiceOn, setVoiceOn] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [code, setCode] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [ticketCount, setTicketCount] = useState(() => myIdolTicketCount());
  const [isWinner, setIsWinner] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const voiceOnRef = useRef(true);
  voiceOnRef.current = voiceOn;

  const say = (text: string, voiceKey?: string) => {
    setMessages((prev) => [...prev, { id: ++messageSeq, role: "idol", text }]);
    if (voiceOnRef.current) void speakIdol(text, voiceKey, setSpeaking);
  };

  const userSays = (text: string) => {
    setMessages((prev) => [...prev, { id: ++messageSeq, role: "user", text }]);
  };

  useEffect(() => {
    let alive = true;
    void (async () => {
      await refreshRewards();
      await refreshIdolEvent();
      if (!alive) return;
      const latest = loadIdolProgress();
      setStages(loadIdolConfig().stages);
      setProgress(latest);
      setTicketCount(myIdolTicketCount());
      setIsWinner(loadIdolWinner()?.userId === rewardUserId());
      const start: Message[] = [{ id: ++messageSeq, role: "idol", text: IDOL_VOICE.greeting }];
      if (latest.claimed) start.push({ id: ++messageSeq, role: "idol", text: IDOL_VOICE.done });
      else if (latest.stage >= IDOL_STAGE_COUNT) start.push({ id: ++messageSeq, role: "idol", text: IDOL_VOICE.final });
      else if (latest.stage > 0) start.push({ id: ++messageSeq, role: "idol", text: `${latest.stage}단계까지 통과하셨어요! 이어서 ${latest.stage + 1}단계를 진행해볼까요?` });
      setMessages(start);
      const last = start[start.length - 1].text;
      const voiceKey = [["greeting", IDOL_VOICE.greeting], ["done", IDOL_VOICE.done], ["final", IDOL_VOICE.final]]
        .find(([, text]) => text === last)?.[0];
      if (voiceOnRef.current) void speakIdol(last, voiceKey, setSpeaking);
    })();
    return () => {
      alive = false;
      stopIdolVoice();
    };
  }, []);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, hinted]);

  const stageIndex = progress.stage;
  const stage = stages[stageIndex];
  const allCleared = progress.stage >= IDOL_STAGE_COUNT;

  const handleHint = () => {
    if (!stage) return;
    userSays("힌트 버튼");
    setHinted(true);
    setError("");
    say(stage.hint, `hint${stageIndex + 1}`);
    window.setTimeout(() => {
      setMessages((prev) => [...prev, { id: ++messageSeq, role: "idol", text: `문제: ${stage.question}` }]);
    }, 300);
  };

  const handleSubmit = () => {
    if (!stage) return;
    const codeOk = checkIdolCode(stage, code);
    const answerOk = checkIdolAnswer(stage, answer);
    userSays(`코드 ${code || "-"} · 정답 ${answer || "-"}`);
    if (!codeOk || !answerOk) {
      setError(!codeOk && !answerOk ? "코드와 정답이 모두 달라요." : !codeOk ? "코드가 달라요. 시장에 붙은 코드를 다시 확인해 주세요." : "정답이 달라요. 다시 생각해 볼까요?");
      say(IDOL_VOICE.wrong, "wrong");
      return;
    }
    const next = advanceIdolStage(stageIndex);
    setProgress(next);
    setHinted(false);
    setCode("");
    setAnswer("");
    setError("");
    if (next.stage >= IDOL_STAGE_COUNT) say(IDOL_VOICE.final, "final");
    else {
      const key = stageIndex === 0 ? "clear1" : "clear2";
      say(IDOL_VOICE[key], key);
    }
  };

  const handleClaim = () => {
    const result = claimIdolReward();
    if (!result) return;
    setProgress(loadIdolProgress());
    setTicketCount(myIdolTicketCount());
    say(`${IDOL_REWARD_POINTS}P와 굿즈 추첨권 1장이 들어왔어요! ${IDOL_VOICE.done}`);
  };

  const replayLast = () => {
    const last = [...messages].reverse().find((message) => message.role === "idol");
    if (!last) return;
    const voiceKey = Object.entries(IDOL_VOICE).find(([, text]) => text === last.text)?.[0];
    setVoiceOn(true);
    voiceOnRef.current = true;
    void speakIdol(last.text, voiceKey, setSpeaking);
  };

  const toggleVoice = () => {
    if (voiceOn) stopIdolVoice();
    setSpeaking(false);
    setVoiceOn((value) => !value);
  };

  return (
    <div className="min-h-screen bg-[#f5f4f0] pb-20">
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/home" className="p-1"><ChevronLeft className="h-5 w-5 text-gray-500" /></Link>
          <h1 className="text-[15px] font-semibold text-gray-800">시장 아이돌 이벤트</h1>
          <span className="w-7" />
        </div>
      </div>

      <div className="mx-auto max-w-md space-y-3 px-4 pt-4">
        <div className="flex items-center gap-3 rounded-2xl border border-[#D7D3E8] bg-[#E4E2EF] p-4 shadow-sm">
          <button
            type="button"
            onClick={replayLast}
            aria-label="마지막 말 다시 듣기"
            className={`flex h-14 w-14 items-center justify-center rounded-full bg-white/70 text-[26px] ${speaking ? "animate-bounce" : ""}`}
          >
            {IDOL.emoji}
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-extrabold text-[#302C40]">{IDOL.name} ({IDOL.group})</p>
            <p className="text-[12px] text-[#625D76]">WINTER · 프로필을 누르면 다시 들려줘요</p>
          </div>
          <button
            type="button"
            onClick={toggleVoice}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-[#D7D3E8] bg-white/80 px-3 text-[12px] text-[#51446F]"
          >
            {voiceOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {voiceOn ? "ON" : "OFF"}
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm">
          {Array.from({ length: IDOL_STAGE_COUNT }, (_, index) => (
            <div key={index} className={`h-2 flex-1 rounded-full ${index < progress.stage ? "bg-[#6250A4]" : "bg-[#D2CEE3]"}`} />
          ))}
          <span className="ml-1 text-[12px] font-semibold text-[#6250A4]">{Math.min(progress.stage, IDOL_STAGE_COUNT)}/{IDOL_STAGE_COUNT}</span>
        </div>

        <div
          ref={chatRef}
          className="flex h-[340px] flex-col gap-3 overflow-y-auto rounded-2xl border border-white/60 p-4 shadow-sm"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.12), rgba(255,255,255,0.12)), url('/winter-mission-chat-bg.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed ${
                  message.role === "user"
                    ? "rounded-br-sm bg-[#E4E2EF] text-[#493B70]"
                    : "rounded-bl-sm border border-gray-100 bg-white text-gray-800"
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2.5 rounded-2xl border border-[#D7D3E8] bg-[#E4E2EF] p-4 shadow-sm">
          {progress.claimed ? (
            <div className="text-center">
              <p className="text-[14px] font-semibold text-gray-800">미션 완료!</p>
              <p className="mt-1 text-[12px] text-gray-500">굿즈 추첨권 {ticketCount}장을 가지고 있어요. 추첨 결과는 이곳에 표시돼요.</p>
              {isWinner && (
                <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[13px] font-semibold text-amber-700">🎉 굿즈 추첨에 당첨되셨어요! 관리자 안내를 확인해 주세요.</p>
              )}
            </div>
          ) : allCleared ? (
            <button
              type="button"
              onClick={handleClaim}
              className="h-12 w-full rounded-xl bg-[#6250A4] text-[14px] font-bold text-white active:opacity-80"
            >
              포인트 {IDOL_REWARD_POINTS}P와 추첨권 받기
            </button>
          ) : !hinted ? (
            <button
              type="button"
              onClick={handleHint}
              className="h-12 w-full rounded-xl bg-[#6250A4] text-[14px] font-bold text-white active:opacity-80"
            >
              {stageIndex + 1}단계 힌트 듣기
            </button>
          ) : (
            <>
              <p className="text-[12px] text-gray-500">시장에서 찾은 4자리 코드와 문제의 정답을 함께 입력해 주세요.</p>
              <input
                value={code}
                onChange={(event) => { setCode(event.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }}
                inputMode="numeric"
                maxLength={4}
                placeholder="코드 4자리"
                className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-[14px] tracking-widest outline-none focus:border-[#6250A4]"
              />
              <div className="flex gap-2">
                <input
                  value={answer}
                  onChange={(event) => { setAnswer(event.target.value); setError(""); }}
                  onKeyDown={(event) => { if (event.key === "Enter") handleSubmit(); }}
                  placeholder="정답"
                  className="h-11 min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 text-[14px] outline-none focus:border-[#6250A4]"
                />
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex h-11 w-12 items-center justify-center rounded-xl bg-[#6250A4] text-white active:opacity-80"
                  aria-label="정답 확인"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              {error && <p className="text-[12px] text-red-400">{error}</p>}
            </>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
