import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("projeto mantém configuração para pacote estático de validação", async () => {
  const [nextConfig, packageJson] = await Promise.all([
    readFile(new URL("../next.config.mjs", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(nextConfig, /output:\s*["']export["']/);
  assert.equal(JSON.parse(packageJson).scripts.share, "npm run build");
});
