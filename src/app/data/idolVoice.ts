import { IDOL_VOICE } from "./idolEvent";

let current: HTMLAudioElement | null = null;
let seq = 0;

export function stopIdolVoice() {
  seq += 1;
  if (current) {
    current.pause();
    current = null;
  }
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

/**
 * public/idol/{voiceKey}.mp3 가 있으면 그 파일을, 없거나 재생이 막히면 브라우저 음성을 쓴다.
 * 관리자가 문구를 바꿨다면 미리 만든 mp3와 내용이 달라지므로 브라우저 음성으로 읽는다.
 */
export async function speakIdol(text: string, voiceKey?: string, onStateChange?: (speaking: boolean) => void) {
  stopIdolVoice();
  const mine = seq;
  const canUseFile = Boolean(voiceKey) && IDOL_VOICE[voiceKey as string] === text;
  onStateChange?.(true);
  const finish = () => {
    if (mine === seq) onStateChange?.(false);
  };

  if (canUseFile) {
    try {
      const audio = new Audio(`/idol/${voiceKey}.mp3`);
      audio.preload = "auto";
      current = audio;
      audio.onended = finish;
      await audio.play();
      return;
    } catch {
      if (mine !== seq) return;
    }
  }

  if (!("speechSynthesis" in window)) {
    finish();
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ko-KR";
  utterance.onend = finish;
  utterance.onerror = finish;
  window.speechSynthesis.speak(utterance);
}
