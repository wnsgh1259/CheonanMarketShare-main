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
  resetIdolProgress,
  type IdolStage,
} from "../data/idolEvent";
import { speakIdol, stopIdolVoice } from "../data/idolVoice";
import { loadIdolProgress, refreshRewards, rewardUserId } from "../data/rewards";

type Message = { id: number; role: "idol" | "user"; text: string };

let messageSeq = 0;

/** 연보라 테마 */
const T = {
  cardBg: "bg-[#F3EEF9]",
  cardBorder: "border-[#D4C4E8]",
  accent: "bg-[#8B6BB8]",
  accentText: "text-[#8B6BB8]",
  accentBorder: "border-[#D4C4E8]",
  muted: "text-[#6B5B82]",
  softFill: "bg-[#E4D8F0]",
  userBubble: "bg-[#EDE4F5] text-[#5A4A72]",
  focus: "focus:border-[#8B6BB8]",
} as const;

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
      setHinted(false);
      setTicketCount(myIdolTicketCount());
      setIsWinner(loadIdolWinner()?.userId === rewardUserId());
      // 입장 시에는 환영 멘트. "N단계 통과"는 정답을 맞춘 뒤에만 붙인다.
      const start: Message[] = [{ id: ++messageSeq, role: "idol", text: IDOL_VOICE.greeting }];
      let voiceKey: "greeting" | "done" | "final" = "greeting";
      if (latest.claimed) {
        start.push({ id: ++messageSeq, role: "idol", text: IDOL_VOICE.done });
        voiceKey = "done";
      } else if (latest.stage >= IDOL_STAGE_COUNT) {
        start.push({ id: ++messageSeq, role: "idol", text: IDOL_VOICE.final });
        voiceKey = "final";
      } else if (latest.stage > 0) {
        // 이전에 푼 단계가 있으면 이어하기임을 글로만 알려준다 (음성은 환영 멘트)
        start.push({
          id: ++messageSeq,
          role: "idol",
          text: `지난번에 ${latest.stage}단계까지 통과하셨어요. 이어서 ${latest.stage + 1}단계를 진행할게요!`,
        });
      }
      setMessages(start);
      if (voiceOnRef.current) void speakIdol(IDOL_VOICE[voiceKey], voiceKey, setSpeaking);
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
    // 문제는 시장 QR로 확인 — 앱에는 힌트 음성만 재생하고 문제는 표시하지 않음
    const voiceKey = `hint${stageIndex + 1}`;
    const hintLine = IDOL_VOICE[voiceKey] || "시장에 붙은 QR에서 문제를 확인한 뒤, 코드와 정답을 입력해 주세요!";
    say(hintLine, voiceKey);
  };

  const handleSubmit = () => {
    if (!stage) return;
    const codeOk = checkIdolCode(stage, code);
    const answerOk = checkIdolAnswer(stage, answer);
    userSays(`코드 ${code || "-"} · 정답 ${answer || "-"}`);
    if (!codeOk || !answerOk) {
      setError(
        !codeOk && !answerOk
          ? "코드와 정답이 모두 달라요."
          : !codeOk
            ? "코드가 달라요. 시장에 붙은 코드를 다시 확인해 주세요."
            : "정답이 달라요. 다시 생각해 볼까요?",
      );
      say(IDOL_VOICE.wrong, "wrong");
      return;
    }
    const clearedStage = stageIndex + 1;
    const next = advanceIdolStage(stageIndex);
    setProgress(next);
    setHinted(false);
    setCode("");
    setAnswer("");
    setError("");
    if (next.stage >= IDOL_STAGE_COUNT) {
      say(IDOL_VOICE.final, "final");
    } else {
      const key = clearedStage === 1 ? "clear1" : "clear2";
      const text =
        IDOL_VOICE[key] ||
        `${clearedStage}단계 통과하셨어요! 이어서 ${clearedStage + 1}단계를 진행해볼까요?`;
      say(text, key);
    }
  };

  const handleClaim = () => {
    const result = claimIdolReward();
    if (!result) return;
    setProgress(loadIdolProgress());
    setTicketCount(myIdolTicketCount());
    say(`${IDOL_REWARD_POINTS}P와 굿즈 추첨권 1장이 들어왔어요! ${IDOL_VOICE.done}`);
  };

  const handleRestart = () => {
    if (!window.confirm("1단계부터 다시 시작할까요?")) return;
    stopIdolVoice();
    setProgress(resetIdolProgress());
    setHinted(false);
    setCode("");
    setAnswer("");
    setError("");
    setMessages([]);
    say(IDOL_VOICE.greeting, "greeting");
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
          <Link to="/home" className="p-1">
            <ChevronLeft className="h-5 w-5 text-gray-500" />
          </Link>
          <h1 className="text-[15px] font-semibold text-gray-800">시장 아이돌 이벤트</h1>
          <span className="w-7" />
        </div>
      </div>

      <div className="mx-auto max-w-md space-y-3 px-4 pt-4">
        <div className={`flex items-center gap-3 rounded-2xl border ${T.cardBorder} ${T.cardBg} p-4 shadow-sm`}>
          <button
            type="button"
            onClick={replayLast}
            aria-label="마지막 말 다시 듣기"
            className={`flex h-14 w-14 items-center justify-center rounded-full bg-white/70 text-[26px] ${speaking ? "animate-bounce" : ""}`}
          >
            {IDOL.emoji}
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-extrabold text-[#302C40]">
              {IDOL.name} ({IDOL.nameEn})
            </p>
            <p className={`text-[12px] ${T.muted}`}>{IDOL.group} · 프로필을 누르면 다시 들려줘요</p>
          </div>
          <button
            type="button"
            onClick={toggleVoice}
            className={`flex h-9 items-center gap-1.5 rounded-xl border ${T.accentBorder} bg-white/80 px-3 text-[12px] ${T.muted}`}
          >
            {voiceOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {voiceOn ? "ON" : "OFF"}
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm">
          {Array.from({ length: IDOL_STAGE_COUNT }, (_, index) => (
            <div
              key={index}
              className={`h-2 flex-1 rounded-full ${index < progress.stage ? T.accent : T.softFill}`}
            />
          ))}
          <span className={`ml-1 text-[12px] font-semibold ${T.accentText}`}>
            {Math.min(progress.stage, IDOL_STAGE_COUNT)}/{IDOL_STAGE_COUNT}
          </span>
        </div>

        <div
          ref={chatRef}
          className="flex h-[340px] flex-col gap-3 overflow-y-auto rounded-2xl border border-white/60 p-4 shadow-sm"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.12), rgba(255,255,255,0.12)), url('/winter-mission-chat-bg.jpg')",
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
                    ? `rounded-br-sm ${T.userBubble}`
                    : "rounded-bl-sm border border-gray-100 bg-white text-gray-800"
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}
        </div>

        <div className={`space-y-2.5 rounded-2xl border ${T.cardBorder} ${T.cardBg} p-4 shadow-sm`}>
          {progress.claimed ? (
            <div className="text-center">
              <p className="text-[14px] font-semibold text-gray-800">미션 완료!</p>
              <p className="mt-1 text-[12px] text-gray-500">
                굿즈 추첨권 {ticketCount}장을 가지고 있어요. 추첨 결과는 이곳에 표시돼요.
              </p>
              {isWinner && (
                <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[13px] font-semibold text-amber-700">
                  🎉 굿즈 추첨에 당첨되셨어요! 관리자 안내를 확인해 주세요.
                </p>
              )}
            </div>
          ) : allCleared ? (
            <button
              type="button"
              onClick={handleClaim}
              className={`h-12 w-full rounded-xl ${T.accent} text-[14px] font-bold text-white active:opacity-80`}
            >
              포인트 {IDOL_REWARD_POINTS}P와 추첨권 받기
            </button>
          ) : !hinted ? (
            <button
              type="button"
              onClick={handleHint}
              className={`h-12 w-full rounded-xl ${T.accent} text-[14px] font-bold text-white active:opacity-80`}
            >
              {stageIndex + 1}단계 힌트 듣기
            </button>
          ) : (
            <>
              <p className="text-[12px] text-gray-500">
                시장 QR에서 문제를 확인한 뒤, 4자리 코드와 정답을 입력해 주세요.
              </p>
              <input
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 4));
                  setError("");
                }}
                inputMode="numeric"
                maxLength={4}
                placeholder="코드 4자리"
                className={`h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-[14px] tracking-widest outline-none ${T.focus}`}
              />
              <div className="flex gap-2">
                <input
                  value={answer}
                  onChange={(event) => {
                    setAnswer(event.target.value);
                    setError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleSubmit();
                  }}
                  placeholder="정답"
                  className={`h-11 min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 text-[14px] outline-none ${T.focus}`}
                />
                <button
                  type="button"
                  onClick={handleSubmit}
                  className={`flex h-11 w-12 items-center justify-center rounded-xl ${T.accent} text-white active:opacity-80`}
                  aria-label="정답 확인"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              {error && <p className="text-[12px] text-red-400">{error}</p>}
            </>
          )}
          {(progress.stage > 0 || progress.claimed) && (
            <button
              type="button"
              onClick={handleRestart}
              className={`w-full pt-1 text-center text-[12px] underline underline-offset-2 ${T.muted}`}
            >
              처음부터 다시하기
            </button>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
