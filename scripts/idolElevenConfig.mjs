import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/** 프로젝트 루트 idol-eleven.json (+ 있으면 .env 로 덮어씀) */
export function readIdolElevenConfig(rootDir) {
  let apiKey = "";
  let voiceId = "";
  const file = join(rootDir, "idol-eleven.json");
  if (existsSync(file)) {
    try {
      const parsed = JSON.parse(readFileSync(file, "utf8"));
      if (typeof parsed.apiKey === "string") apiKey = parsed.apiKey.trim();
      if (typeof parsed.voiceId === "string") voiceId = parsed.voiceId.trim();
    } catch {
      // ignore
    }
  }
  if (process.env.ELEVEN_API_KEY) apiKey = process.env.ELEVEN_API_KEY;
  if (process.env.ELEVEN_VOICE_ID) voiceId = process.env.ELEVEN_VOICE_ID;
  return { apiKey, voiceId };
}
