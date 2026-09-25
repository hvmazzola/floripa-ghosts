import assert from "node:assert/strict";
import { test } from "node:test";

import {
  readStoredText,
  readStoredValue,
  writeStoredValue,
} from "../src/lib/demo-store.ts";

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

test("recupera somente a chave corrompida sem afetar os outros dados", () => {
  const storage = memoryStorage({
    trainings: "{json inválido",
    view: JSON.stringify("communication"),
  });

  const trainings = readStoredValue(storage, "trainings", Array.isArray, []);
  const view = readStoredValue(
    storage,
    "view",
    (value): value is "dashboard" | "communication" =>
      value === "dashboard" || value === "communication",
    "dashboard",
  );

  assert.deepEqual(trainings.value, []);
  assert.equal(trainings.recovered, true);
  assert.equal(view.value, "communication");
  assert.equal(view.recovered, false);
});

test("persiste apenas valores serializáveis", () => {
  const storage = memoryStorage();

  assert.equal(writeStoredValue(storage, "view", "dashboard"), true);
  assert.equal(storage.getItem("view"), JSON.stringify("dashboard"));
});

test("lê preferências legadas gravadas como texto simples", () => {
  const storage = memoryStorage({ view: "communication" });
  const view = readStoredText(
    storage,
    "view",
    (value): value is "dashboard" | "communication" =>
      value === "dashboard" || value === "communication",
    "dashboard",
  );

  assert.equal(view.value, "communication");
  assert.equal(view.recovered, false);
});
