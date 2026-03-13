import { assertEquals } from "std/testing/asserts.ts";
import {
  CONFIG_KEYS,
  getAllConfigValues,
  getConfigValue,
  setConfigValue,
} from "./datastore.ts";

/**
 * Datastoreクライアントのモックを作成します
 *
 * @param store - 初期データ
 * @returns モッククライアント
 */
function createMockClient(store: Record<string, Record<string, string>> = {}) {
  return {
    apps: {
      datastore: {
        get: async (params: { datastore: string; id: string }) => {
          const item = store[params.id];
          if (item) {
            return { ok: true, item };
          }
          return { ok: false };
        },
        put: async (
          params: { datastore: string; item: Record<string, unknown> },
        ) => {
          const key = params.item.config_key as string;
          store[key] = params.item as unknown as Record<string, string>;
          return { ok: true };
        },
        query: async (_params: { datastore: string }) => {
          const items = Object.values(store);
          return { ok: true, items };
        },
      },
    },
  };
}

/**
 * エラーを返すDatastoreクライアントのモック
 */
function createErrorClient() {
  return {
    apps: {
      datastore: {
        get: async (_params: { datastore: string; id: string }) => {
          throw new Error("Connection failed");
        },
        put: async (
          _params: { datastore: string; item: Record<string, unknown> },
        ) => {
          return { ok: false, error: "write_error" };
        },
        query: async (_params: { datastore: string }) => {
          return { ok: false };
        },
      },
    },
  };
}

Deno.test({
  name: "Datastoreから設定値を正常に取得できる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const client = createMockClient({
      alert_channel_id: {
        config_key: "alert_channel_id",
        config_value: "C1234567890",
      },
    });

    const value = await getConfigValue(client, "alert_channel_id");
    assertEquals(value, "C1234567890");
  },
});

Deno.test({
  name: "Datastoreに値がない場合はフォールバックを返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const client = createMockClient();
    const value = await getConfigValue(client, "alert_channel_id", "CFALLBACK");
    assertEquals(value, "CFALLBACK");
  },
});

Deno.test({
  name: "Datastoreエラー時はフォールバックを返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const client = createErrorClient();
    const value = await getConfigValue(client, "alert_channel_id", "CFALLBACK");
    assertEquals(value, "CFALLBACK");
  },
});

Deno.test({
  name: "設定値を正常に保存できる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const store: Record<string, Record<string, string>> = {};
    const client = createMockClient(store);

    await setConfigValue(
      client,
      "alert_channel_id",
      "C1234567890",
      "U12345",
    );
    assertEquals(store["alert_channel_id"].config_value, "C1234567890");
  },
});

Deno.test({
  name: "全設定を正常に取得できる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const client = createMockClient({
      alert_channel_id: {
        config_key: "alert_channel_id",
        config_value: "C1111111111",
      },
      report_channel_id: {
        config_key: "report_channel_id",
        config_value: "C2222222222",
      },
    });

    const config = await getAllConfigValues(client);
    assertEquals(config["alert_channel_id"], "C1111111111");
    assertEquals(config["report_channel_id"], "C2222222222");
  },
});

Deno.test({
  name: "CONFIG_KEYSに正しいキーが定義されている",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    assertEquals(CONFIG_KEYS.ALERT_CHANNEL_ID, "alert_channel_id");
    assertEquals(CONFIG_KEYS.REPORT_CHANNEL_ID, "report_channel_id");
    assertEquals(CONFIG_KEYS.SORACAM_CHANNEL_ID, "soracam_channel_id");
  },
});
