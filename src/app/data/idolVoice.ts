import { IDOL_VOICE } from "./idolEvent";

let current: HTMLAudioElement | null = null;
let seq = 0;

const AUDIO_EXTS = ["mp3", "m4a"] as const;

export function stopIdolVoice() {
  seq += 1;
  if (current) {
    current.pause();
    current = null;
  }
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

function tryPlay(url: string, mine: number, onStateChange?: (speaking: boolean) => void) {
  return new Promise<boolean>((resolve) => {
    const audio = new Audio(url);
    audio.preload = "auto";
    current = audio;
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      if (!ok && mine === seq) onStateChange?.(false);
      resolve(ok);
    };
    audio.onended = () => {
      if (mine === seq) onStateChange?.(false);
    };
    audio.onerror = () => finish(false);
    void audio
      .play()
      .then(() => finish(true))
      .catch(() => finish(false));
  });
}

/** public/idol/{voiceKey}.mp3 또는 .m4a 재생. 실시간 ElevenLabs는 쓰지 않는다. */
async function speakViaFile(
  voiceKey: string | undefined,
  mine: number,
  onStateChange?: (speaking: boolean) => void,
) {
  if (!voiceKey || !(voiceKey in IDOL_VOICE)) return false;
  for (const ext of AUDIO_EXTS) {
    if (mine !== seq) return false;
    const ok = await tryPlay(`/idol/${voiceKey}.${ext}`, mine, onStateChange);
    if (ok) return true;
  }
  return false;
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
 * 1) public/idol/{voiceKey}.mp3 또는 .m4a
 * 2) 브라우저 TTS (파일이 없을 때만)
 */
export async function speakIdol(
  text: string,
  voiceKey?: string,
  onStateChange?: (speaking: boolean) => void,
) {
  stopIdolVoice();
  const mine = seq;
  onStateChange?.(true);

  if (await speakViaFile(voiceKey, mine, onStateChange)) return;
  if (mine !== seq) return;
  speakViaBrowser(text, mine, onStateChange);
}
