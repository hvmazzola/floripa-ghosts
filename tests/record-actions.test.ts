import assert from "node:assert/strict";
import { test } from "node:test";

import { visibleRecordActions } from "../src/lib/record-actions.ts";

test("menu de registro mostra somente ações autorizadas", () => {
  assert.deepEqual(
    visibleRecordActions([
      { id: "edit", label: "Editar", allowed: true },
      { id: "delete", label: "Excluir", allowed: false, destructive: true },
    ]),
    [{ id: "edit", label: "Editar", allowed: true }],
  );
});
