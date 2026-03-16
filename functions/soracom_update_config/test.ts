import { assertEquals, assertThrows } from "std/testing/asserts.ts";
import { formatConfigListMessage, validateConfigValue } from "./mod.ts";

Deno.test({
  name: "有効な設定キーとチャンネルIDでバリデーションが成功する",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    // チャンネルID形式の設定キーは正常にパスする
    validateConfigValue("alert_channel_id", "C1234567890");
    validateConfigValue("report_channel_id", "C0987654321");
    validateConfigValue("soracam_channel_id", "C1111111111");
  },
});

Deno.test({
  name: "無効な設定キーでバリデーションが失敗する",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    assertThrows(
      () => validateConfigValue("invalid_key", "C1234567890"),
      Error,
    );
  },
});

Deno.test({
  name: "チャンネルID形式が不正な場合にバリデーションが失敗する",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    assertThrows(
      () => validateConfigValue("alert_channel_id", "invalid"),
      Error,
    );
  },
});

Deno.test({
  name: "設定一覧メッセージが正しくフォーマットされる",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const config = {
      alert_channel_id: "C1234567890",
      report_channel_id: "C0987654321",
    };

    const message = formatConfigListMessage(config);
    assertEquals(message.includes("C1234567890"), true);
    assertEquals(message.includes("C0987654321"), true);
    assertEquals(message.includes("alert_channel_id"), true);
    assertEquals(message.includes("report_channel_id"), true);
  },
});

Deno.test({
  name: "設定が空の場合は空メッセージを返す",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const message = formatConfigListMessage({});
    assertEquals(message.length > 0, true);
  },
});
