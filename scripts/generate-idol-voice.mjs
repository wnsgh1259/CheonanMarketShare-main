// 사용법 (PowerShell):
//   $env:ELEVEN_API_KEY="발급받은_키"; $env:ELEVEN_VOICE_ID="보이스_ID"; npm run idol:voice
// 키는 앱 코드에 넣지 않고, 이 스크립트를 실행하는 동안만 환경변수로 사용합니다.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiKey = process.env.ELEVEN_API_KEY;
const voiceId = process.env.ELEVEN_VOICE_ID;

if (!apiKey || !voiceId) {
  console.error("ELEVEN_API_KEY 와 ELEVEN_VOICE_ID 환경변수를 먼저 설정해 주세요.");
  process.exit(1);
}

const defaults = JSON.parse(await readFile(join(root, "src/app/data/idolEventDefaults.json"), "utf8"));
const outDir = join(root, "public", "idol");
await mkdir(outDir, { recursive: true });

for (const [key, text] of Object.entries(defaults.voice)) {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true },
    }),
  });
  if (!response.ok) {
    console.error(`${key} 실패: ${response.status} ${await response.text()}`);
    process.exit(1);
  }
  await writeFile(join(outDir, `${key}.mp3`), Buffer.from(await response.arrayBuffer()));
  console.log(`${key}.mp3 저장`);
}
