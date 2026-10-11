import { IDOL_VOICE } from "./idolEvent";

let current: HTMLAudioElement | null = null;
let seq = 0;
let elevenAvailable: boolean | null = null;

export function stopIdolVoice() {
  seq += 1;
  if (current) {
    current.pause();
    current = null;
  }
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

async function playBlob(blob: Blob, mine: number, onStateChange?: (speaking: boolean) => void) {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.preload = "auto";
  current = audio;
  const cleanup = () => {
    URL.revokeObjectURL(url);
    if (mine === seq) onStateChange?.(false);
  };
  audio.onended = cleanup;
  audio.onerror = cleanup;
  await audio.play();
}

/** 개발 서버(/api/idol-tts) — ElevenLabs 보이스 ID로 아무 대사나 바로 읽기 */
async function speakViaElevenLabs(text: string, mine: number, onStateChange?: (speaking: boolean) => void) {
  if (elevenAvailable === false) return false;
  try {
    const res = await fetch("/api/idol-tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (res.status === 503 || res.status === 404) {
      elevenAvailable = false;
      return false;
    }
    if (!res.ok) return false;
    elevenAvailable = true;
    if (mine !== seq) return true;
    await playBlob(await res.blob(), mine, onStateChange);
    return true;
  } catch {
    return false;
  }
}

async function speakViaMp3(
  text: string,
  voiceKey: string | undefined,
  mine: number,
  onStateChange?: (speaking: boolean) => void,
) {
  const canUseFile = Boolean(voiceKey) && IDOL_VOICE[voiceKey as string] === text;
  if (!canUseFile || !voiceKey) return false;
  try {
    const audio = new Audio(`/idol/${voiceKey}.mp3`);
    audio.preload = "auto";
    current = audio;
    audio.onended = () => {
      if (mine === seq) onStateChange?.(false);
    };
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

function speakViaBrowser(text: string, mine: number, onStateChange?: (speaking: boolean) => void) {
  if (!("speechSynthesis" in window)) {
    if (mine === seq) onStateChange?.(false);
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ko-KR";
  utterance.onend = () => {
    if (mine === seq) onStateChange?.(false);
  };
  utterance.onerror = () => {
    if (mine === seq) onStateChange?.(false);
  };
  window.speechSynthesis.speak(utterance);
}

/**
 * 재생 우선순위
 * 1) ElevenLabs (npm run dev + .env 의 ELEVEN_* ) — 대사 바꿔도 재생성 불필요
 * 2) public/idol/{voiceKey}.mp3 (npm run idol:voice 로 만든 파일)
 * 3) 브라우저 TTS
 */
export async function speakIdol(
  text: string,
  voiceKey?: string,
  onStateChange?: (speaking: boolean) => void,
) {
  stopIdolVoice();
  const mine = seq;
  onStateChange?.(true);

  if (await speakViaElevenLabs(text, mine, onStateChange)) return;
  if (mine !== seq) return;
  if (await speakViaMp3(text, voiceKey, mine, onStateChange)) return;
  if (mine !== seq) return;
  speakViaBrowser(text, mine, onStateChange);
}
