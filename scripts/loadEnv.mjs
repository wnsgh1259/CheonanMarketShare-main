import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/** .env / .env.local 에서 KEY=VALUE 를 process.env 에 채운다 (이미 있으면 유지) */
export function loadEnvFiles(rootDir) {
  for (const name of [".env", ".env.local"]) {
    const path = join(rootDir, name);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] == null || process.env[key] === "") {
        process.env[key] = value;
      }
    }
  }
}
