/**
 * ElevenLabs 보이스 ID 한 번만 설정하면, 대사 JSON을 전부 그 목소리 mp3로 만듭니다.
 *
 * 1) 프로젝트 루트 .env 에 추가:
 *      ELEVEN_API_KEY=...
 *      ELEVEN_VOICE_ID=...   ← ElevenLabs 보이스 라이브러리의 Voice ID
 * 2) 대사 수정: src/app/data/idolEventDefaults.json 의 voice
 * 3) 실행: npm run idol:voice
 *
 * 개발 중(npm run dev)에는 이 스크립트 없이도 /api/idol-tts 로 바로 읽습니다.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFiles } from "./loadEnv.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
loadEnvFiles(root);

const apiKey = process.env.ELEVEN_API_KEY;
const voiceId = process.env.ELEVEN_VOICE_ID;

if (!apiKey || !voiceId) {
  console.error(`ELEVEN_API_KEY / ELEVEN_VOICE_ID 가 없습니다.

프로젝트 루트 .env 에 아래를 넣고 다시 실행하세요.
  ELEVEN_API_KEY=xi-...
  ELEVEN_VOICE_ID=보이스ID
`);
  process.exit(1);
}

const defaults = JSON.parse(
  await readFile(join(root, "src/app/data/idolEventDefaults.json"), "utf8"),
);
const outDir = join(root, "public", "idol");
await mkdir(outDir, { recursive: true });

console.log(`보이스 ${voiceId} 로 ${Object.keys(defaults.voice).length}개 생성 중…`);

for (const [key, text] of Object.entries(defaults.voice)) {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.8,
        style: 0.35,
        use_speaker_boost: true,
      },
    }),
  });
  if (!response.ok) {
    console.error(`${key} 실패: ${response.status} ${await response.text()}`);
    process.exit(1);
  }
  await writeFile(join(outDir, `${key}.mp3`), Buffer.from(await response.arrayBuffer()));
  console.log(`✓ ${key}.mp3`);
}

console.log("완료. 앱을 새로고침하면 리센느(설정 보이스) 음성이 재생됩니다.");
