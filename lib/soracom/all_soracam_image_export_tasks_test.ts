import { assertEquals } from "std/testing/asserts.ts";
import {
  buildAllSoraCamImageExportTaskKey,
  getAllSoraCamImageExportTask,
  listAllSoraCamImageExportTasks,
  upsertAllSoraCamImageExportTask,
} from "./all_soracam_image_export_tasks.ts";

function createMockClient(store: Record<string, Record<string, unknown>> = {}) {
  return {
    apps: {
      datastore: {
        get: (params: { datastore: string; id: string }) => {
          return Promise.resolve({
            ok: true,
            item: store[params.id],
          });
        },
        put: (
          params: { datastore: string; item: Record<string, unknown> },
        ) => {
          store[params.item.task_key as string] = params.item;
          return Promise.resolve({ ok: true });
        },
        query: (_params: { datastore: string }) => {
          return Promise.resolve({
            ok: true,
            items: Object.values(store),
          });
        },
        delete: (params: { datastore: string; id: string }) => {
          delete store[params.id];
          return Promise.resolve({ ok: true });
        },
      },
    },
  };
}

Deno.test("全台画像スナップショットタスクキーを生成できる", () => {
  assertEquals(
    buildAllSoraCamImageExportTaskKey("C123", "cam-1"),
    "C123:cam-1",
  );
});

Deno.test("全台画像スナップショットタスクを保存して一覧取得できる", async () => {
  const store: Record<string, Record<string, unknown>> = {};
  const client = createMockClient(store);

  await upsertAllSoraCamImageExportTask(client, {
    taskKey: "C123:cam-2",
    jobKey: "C123",
    channelId: "C123",
    deviceId: "cam-2",
    deviceName: "Office",
    sortIndex: 1,
    exportId: "exp-2",
    status: "processing",
    imageUrl: "",
    snapshotTime: 1700000000000,
    createdAt: "2026-03-19T01:00:00.000Z",
    updatedAt: "2026-03-19T01:00:00.000Z",
  });
  await upsertAllSoraCamImageExportTask(client, {
    taskKey: "C123:cam-1",
    jobKey: "C123",
    channelId: "C123",
    deviceId: "cam-1",
    deviceName: "Entrance",
    sortIndex: 0,
    exportId: "",
    status: "queued",
    imageUrl: "",
    createdAt: "2026-03-19T01:00:00.000Z",
    updatedAt: "2026-03-19T01:00:00.000Z",
  });

  const task = await getAllSoraCamImageExportTask(client, "C123:cam-2");
  const tasks = await listAllSoraCamImageExportTasks(client, "C123");

  assertEquals(task?.deviceId, "cam-2");
  assertEquals(tasks.map((entry) => entry.deviceId), ["cam-1", "cam-2"]);
  assertEquals(tasks[1].status, "processing");
});
