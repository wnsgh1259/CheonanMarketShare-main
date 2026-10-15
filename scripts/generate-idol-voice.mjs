/**
 * idol-eleven.json 의 apiKey + voiceId 로 대사를 mp3로 만듭니다.
 * 배포 후에도 들리게 하려면 이 스크립트로 public/idol/*.mp3 를 만들고 깃에 올리면 됩니다.
 *
 *   npm run idol:voice
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFiles } from "./loadEnv.mjs";
import { readIdolElevenConfig } from "./idolElevenConfig.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
loadEnvFiles(root);

const { apiKey, voiceId } = readIdolElevenConfig(root);

if (!apiKey || !voiceId) {
  console.warn("idol-eleven.json 에 apiKey / voiceId 가 없어 음성 생성을 건너뜁니다.");
  process.exit(0);
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
    console.error("음성 생성을 중단합니다. (배포 빌드는 이 스크립트와 무관합니다)");
    process.exit(1);
  }
  await writeFile(join(outDir, `${key}.mp3`), Buffer.from(await response.arrayBuffer()));
  console.log(`✓ ${key}.mp3`);
}

console.log("완료. public/idol/*.mp3 를 깃에 올리면 배포된 곳에서도 재생됩니다.");
